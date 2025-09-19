// Computing Marketplace - Dynamic Resource Allocation
const {
  globalStorage,
  validateInput,
  logSecurityEvent,
  checkRateLimit,
  createResponse,
  distributeHNHTokens
} = require('./utils');

exports.handler = async (event, context) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  const path = event.path.replace('/.netlify/functions/marketplace', '');
  const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';

  // Rate limiting
  if (!checkRateLimit(clientIP, 30, 60000)) { // 30 requests per minute
    return createResponse(429, { error: 'Rate limit exceeded' });
  }

  try {
    if (path === '/jobs' && event.httpMethod === 'GET') {
      return await handleGetJobs(event);
    } else if (path === '/jobs' && event.httpMethod === 'POST') {
      return await handleCreateJob(event);
    } else if (path === '/resources' && event.httpMethod === 'GET') {
      return await handleGetResources(event);
    } else if (path === '/allocate' && event.httpMethod === 'POST') {
      return await handleAllocateResources(event);
    } else if (path.startsWith('/jobs/') && event.httpMethod === 'GET') {
      return await handleGetJobStatus(event, path);
    } else if (path.startsWith('/jobs/') && event.httpMethod === 'DELETE') {
      return await handleCancelJob(event, path);
    }

    return createResponse(404, { error: 'Marketplace endpoint not found' });
  } catch (error) {
    console.error('Marketplace endpoint error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};

// Initialize marketplace storage if not exists
function initializeMarketplace() {
  if (!globalStorage.marketplace) {
    globalStorage.marketplace = {
      jobs: new Map(),
      resourcePools: {
        mining: { allocated: 0, available: 0 },
        hashcat: { allocated: 0, available: 0 },
        aiTraining: { allocated: 0, available: 0 },
        general: { allocated: 0, available: 0 }
      },
      jobQueue: [],
      pricing: {
        gpu_hour: 0.50, // USD per GPU hour
        cpu_hour: 0.10, // USD per CPU hour
        hashcat_job: 5.00, // USD per hashcat job
        ai_training_hour: 2.00 // USD per hour for AI training
      }
    };
  }
}

// Get available jobs and marketplace status
async function handleGetJobs(event) {
  initializeMarketplace();

  const activeJobs = Array.from(globalStorage.marketplace.jobs.values())
    .filter(job => job.status === 'active')
    .map(job => ({
      id: job.id,
      type: job.type,
      description: job.description,
      reward: job.reward,
      estimatedTime: job.estimatedTime,
      requirements: job.requirements,
      createdAt: job.createdAt
    }));

  return createResponse(200, {
    availableJobs: activeJobs,
    totalJobs: globalStorage.marketplace.jobs.size,
    resourcePools: globalStorage.marketplace.resourcePools,
    pricing: globalStorage.marketplace.pricing,
    marketplaceStats: {
      totalGPUs: calculateTotalGPUs(),
      totalCPUs: calculateTotalCPUs(),
      activeWorkers: globalStorage.miners.size
    }
  });
}

// Create a new computing job
async function handleCreateJob(event) {
  initializeMarketplace();

  const body = JSON.parse(event.body || '{}');
  const { type, description, requirements, budget, estimatedHours, data } = body;

  // Validate job type
  const validTypes = ['mining', 'hashcat', 'ai-training', 'general-compute'];
  if (!type || !validTypes.includes(type)) {
    return createResponse(400, { error: 'Invalid job type. Valid types: ' + validTypes.join(', ') });
  }

  // Validate requirements
  if (!requirements || typeof requirements !== 'object') {
    return createResponse(400, { error: 'Job requirements object is required' });
  }

  // Generate job ID
  const jobId = generateJobId();

  // Calculate pricing
  const pricing = calculateJobPricing(type, requirements, estimatedHours);

  const job = {
    id: jobId,
    type,
    description: description || `${type} job`,
    requirements,
    budget: budget || pricing.estimated,
    estimatedHours: estimatedHours || 1,
    data: data || {},
    status: 'pending',
    createdAt: Date.now(),
    assignedWorkers: [],
    progress: 0,
    results: null,
    pricing
  };

  globalStorage.marketplace.jobs.set(jobId, job);
  globalStorage.marketplace.jobQueue.push(jobId);

  console.log(`🎯 New ${type} job created: ${jobId} - Budget: $${job.budget}`);

  return createResponse(201, {
    success: true,
    job: {
      id: jobId,
      type,
      description: job.description,
      estimatedCost: pricing.estimated,
      status: 'pending',
      queuePosition: globalStorage.marketplace.jobQueue.length
    }
  });
}

// Get available computing resources
async function handleGetResources(event) {
  initializeMarketplace();

  const miners = Array.from(globalStorage.miners.values());
  const now = Date.now();
  const activeMiners = miners.filter(m => m.isActive && (now - m.lastSeen) < 300000);

  const resources = {
    totalGPUs: calculateTotalGPUs(),
    totalCPUs: calculateTotalCPUs(),
    activeWorkers: activeMiners.length,
    capabilities: {
      hashcat: activeMiners.filter(m => m.capabilities?.hashcat).length,
      aiTraining: activeMiners.filter(m => m.capabilities?.aiTraining).length,
      mining: activeMiners.length,
      generalCompute: activeMiners.filter(m => m.capabilities?.generalCompute).length
    },
    resourcePools: globalStorage.marketplace.resourcePools,
    pricing: globalStorage.marketplace.pricing
  };

  return createResponse(200, resources);
}

// Allocate resources to a specific pool
async function handleAllocateResources(event) {
  initializeMarketplace();

  const body = JSON.parse(event.body || '{}');
  const { fromPool, toPool, amount, jobId } = body;

  if (!fromPool || !toPool || !amount) {
    return createResponse(400, { error: 'fromPool, toPool, and amount are required' });
  }

  const pools = globalStorage.marketplace.resourcePools;

  if (!pools[fromPool] || !pools[toPool]) {
    return createResponse(400, { error: 'Invalid pool names' });
  }

  if (pools[fromPool].available < amount) {
    return createResponse(400, { error: 'Insufficient resources in source pool' });
  }

  // Perform allocation
  pools[fromPool].available -= amount;
  pools[fromPool].allocated += amount;
  pools[toPool].available += amount;

  console.log(`🔄 Allocated ${amount} resources from ${fromPool} to ${toPool}`);

  return createResponse(200, {
    success: true,
    allocation: {
      from: fromPool,
      to: toPool,
      amount,
      jobId: jobId || null
    },
    updatedPools: pools
  });
}

// Get job status and results
async function handleGetJobStatus(event, path) {
  initializeMarketplace();

  const jobId = path.split('/').pop();
  const job = globalStorage.marketplace.jobs.get(jobId);

  if (!job) {
    return createResponse(404, { error: 'Job not found' });
  }

  return createResponse(200, {
    id: job.id,
    type: job.type,
    description: job.description,
    status: job.status,
    progress: job.progress,
    assignedWorkers: job.assignedWorkers.length,
    estimatedCompletion: job.estimatedCompletion,
    results: job.results,
    createdAt: job.createdAt,
    pricing: job.pricing
  });
}

// Cancel a job
async function handleCancelJob(event, path) {
  initializeMarketplace();

  const jobId = path.split('/').pop();
  const job = globalStorage.marketplace.jobs.get(jobId);

  if (!job) {
    return createResponse(404, { error: 'Job not found' });
  }

  if (job.status === 'completed') {
    return createResponse(400, { error: 'Cannot cancel completed job' });
  }

  job.status = 'cancelled';
  job.cancelledAt = Date.now();

  // Remove from queue if pending
  const queueIndex = globalStorage.marketplace.jobQueue.indexOf(jobId);
  if (queueIndex > -1) {
    globalStorage.marketplace.jobQueue.splice(queueIndex, 1);
  }

  // Free up allocated resources
  if (job.assignedWorkers.length > 0) {
    // Logic to free resources would go here
  }

  console.log(`❌ Job cancelled: ${jobId}`);

  return createResponse(200, {
    success: true,
    message: 'Job cancelled successfully',
    jobId
  });
}

// Helper functions
function generateJobId() {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function calculateTotalGPUs() {
  const miners = Array.from(globalStorage.miners.values());
  return miners.reduce((total, miner) => {
    return total + (miner.gpuInfo?.count || 1);
  }, 0);
}

function calculateTotalCPUs() {
  const miners = Array.from(globalStorage.miners.values());
  return miners.reduce((total, miner) => {
    return total + (miner.cpuInfo?.cores || 4);
  }, 0);
}

function calculateJobPricing(type, requirements, estimatedHours) {
  const pricing = globalStorage.marketplace.pricing;
  let baseCost = 0;

  switch (type) {
    case 'hashcat':
      baseCost = pricing.hashcat_job;
      break;
    case 'ai-training':
      baseCost = pricing.ai_training_hour * estimatedHours;
      break;
    case 'general-compute':
      baseCost = (pricing.gpu_hour * (requirements.gpus || 0) +
                 pricing.cpu_hour * (requirements.cpus || 0)) * estimatedHours;
      break;
    case 'mining':
      baseCost = 0; // Mining pays rewards in HNH tokens
      break;
    default:
      baseCost = pricing.gpu_hour * estimatedHours;
  }

  return {
    base: baseCost,
    estimated: baseCost * 1.1, // 10% markup
    currency: 'USD'
  };
}