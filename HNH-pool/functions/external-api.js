// External API for Companies/Clients to Access Computing Power
const {
  globalStorage,
  validateInput,
  logSecurityEvent,
  checkRateLimit,
  createResponse
} = require('./utils');

exports.handler = async (event, context) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  const path = event.path.replace('/.netlify/functions/external-api', '');
  const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';

  // Rate limiting for external API
  if (!checkRateLimit(clientIP, 100, 60000)) { // 100 requests per minute
    return createResponse(429, { error: 'API rate limit exceeded' });
  }

  try {
    // API Key authentication for external clients
    const authResult = authenticateAPIKey(event);
    if (!authResult.success) {
      return createResponse(401, { error: authResult.error });
    }

    if (path === '/compute/submit' && event.httpMethod === 'POST') {
      return await handleComputeSubmission(event, authResult.client);
    } else if (path === '/compute/status' && event.httpMethod === 'GET') {
      return await handleComputeStatus(event, authResult.client);
    } else if (path === '/compute/results' && event.httpMethod === 'GET') {
      return await handleComputeResults(event, authResult.client);
    } else if (path === '/resources/availability' && event.httpMethod === 'GET') {
      return await handleResourceAvailability(event);
    } else if (path === '/pricing' && event.httpMethod === 'GET') {
      return await handlePricingInfo(event);
    } else if (path === '/compute/cancel' && event.httpMethod === 'POST') {
      return await handleComputeCancel(event, authResult.client);
    }

    return createResponse(404, { error: 'API endpoint not found' });
  } catch (error) {
    console.error('External API error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};

// Authenticate API key
function authenticateAPIKey(event) {
  const apiKey = event.headers['x-api-key'] || event.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    return { success: false, error: 'API key required' };
  }

  // Initialize API clients storage
  if (!globalStorage.apiClients) {
    globalStorage.apiClients = new Map([
      ['demo_key_12345', {
        id: 'demo_client',
        name: 'Demo Company',
        tier: 'standard',
        credits: 1000,
        rateLimits: { perHour: 1000, perDay: 10000 }
      }],
      ['enterprise_key_67890', {
        id: 'enterprise_client',
        name: 'Enterprise Corp',
        tier: 'enterprise',
        credits: 50000,
        rateLimits: { perHour: 10000, perDay: 100000 }
      }]
    ]);
  }

  const client = globalStorage.apiClients.get(apiKey);
  if (!client) {
    logSecurityEvent(event, 'INVALID_API_KEY', `Invalid API key: ${apiKey.substring(0, 8)}...`);
    return { success: false, error: 'Invalid API key' };
  }

  return { success: true, client };
}

// Submit compute job from external client
async function handleComputeSubmission(event, client) {
  const body = JSON.parse(event.body || '{}');
  const {
    jobType,
    description,
    requirements,
    data,
    priority = 'normal',
    maxDuration = 24,
    budget
  } = body;

  // Validate job type
  const validTypes = ['hashcat', 'ai-training', 'general-compute', 'data-processing'];
  if (!jobType || !validTypes.includes(jobType)) {
    return createResponse(400, {
      error: 'Invalid job type',
      validTypes
    });
  }

  // Validate requirements
  if (!requirements || typeof requirements !== 'object') {
    return createResponse(400, { error: 'Requirements object is required' });
  }

  // Check client credits
  const estimatedCost = calculateJobCost(jobType, requirements, maxDuration);
  if (client.credits < estimatedCost) {
    return createResponse(402, {
      error: 'Insufficient credits',
      required: estimatedCost,
      available: client.credits
    });
  }

  // Generate job ID
  const jobId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create external job
  const job = {
    id: jobId,
    clientId: client.id,
    type: jobType,
    description: description || `${jobType} job from ${client.name}`,
    requirements,
    data: data || {},
    priority,
    maxDuration,
    budget,
    estimatedCost,
    status: 'queued',
    createdAt: Date.now(),
    assignedWorkers: [],
    progress: 0,
    results: null,
    webhookUrl: body.webhookUrl || null
  };

  // Initialize external jobs storage
  if (!globalStorage.externalJobs) {
    globalStorage.externalJobs = new Map();
  }

  globalStorage.externalJobs.set(jobId, job);

  // Deduct credits
  client.credits -= estimatedCost;

  console.log(`🏢 External job submitted: ${jobId} from ${client.name} - Cost: $${estimatedCost}`);

  // Add to marketplace queue
  if (!globalStorage.marketplace) {
    const marketplace = require('./marketplace');
    marketplace.initializeMarketplace();
  }

  globalStorage.marketplace.jobs.set(jobId, {
    ...job,
    source: 'external_api'
  });

  return createResponse(201, {
    success: true,
    jobId,
    estimatedCost,
    status: 'queued',
    queuePosition: getQueuePosition(jobId),
    estimatedStartTime: getEstimatedStartTime(job)
  });
}

// Get compute job status
async function handleComputeStatus(event, client) {
  const jobId = new URLSearchParams(event.queryStringParameters || {}).get('jobId');

  if (!jobId) {
    return createResponse(400, { error: 'jobId parameter is required' });
  }

  const job = globalStorage.externalJobs?.get(jobId);
  if (!job || job.clientId !== client.id) {
    return createResponse(404, { error: 'Job not found' });
  }

  return createResponse(200, {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    assignedWorkers: job.assignedWorkers.length,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    estimatedCompletion: job.estimatedCompletion,
    cost: job.estimatedCost,
    description: job.description
  });
}

// Get compute job results
async function handleComputeResults(event, client) {
  const jobId = new URLSearchParams(event.queryStringParameters || {}).get('jobId');

  if (!jobId) {
    return createResponse(400, { error: 'jobId parameter is required' });
  }

  const job = globalStorage.externalJobs?.get(jobId);
  if (!job || job.clientId !== client.id) {
    return createResponse(404, { error: 'Job not found' });
  }

  if (job.status !== 'completed') {
    return createResponse(202, {
      message: 'Job not yet completed',
      status: job.status,
      progress: job.progress
    });
  }

  return createResponse(200, {
    jobId: job.id,
    status: job.status,
    results: job.results,
    completedAt: job.completedAt,
    totalCost: job.actualCost || job.estimatedCost,
    executionTime: job.executionTime
  });
}

// Get resource availability
async function handleResourceAvailability(event) {
  const miners = Array.from(globalStorage.miners?.values() || []);
  const now = Date.now();
  const activeMiners = miners.filter(m => m.isActive && (now - m.lastSeen) < 300000);

  const availability = {
    totalWorkers: activeMiners.length,
    resources: {
      gpus: {
        total: activeMiners.reduce((sum, m) => sum + (m.gpuInfo?.count || 0), 0),
        nvidia: activeMiners.filter(m => m.gpuInfo?.vendor === 'NVIDIA').length,
        amd: activeMiners.filter(m => m.gpuInfo?.vendor === 'AMD').length,
        available: activeMiners.filter(m => !m.currentJob).length
      },
      cpus: {
        totalCores: activeMiners.reduce((sum, m) => sum + (m.cpuInfo?.cores || 0), 0),
        availableCores: activeMiners.filter(m => !m.currentJob)
          .reduce((sum, m) => sum + (m.cpuInfo?.cores || 0), 0)
      }
    },
    capabilities: {
      hashcat: activeMiners.filter(m => m.capabilities?.hashcat).length,
      aiTraining: activeMiners.filter(m => m.capabilities?.aiTraining).length,
      generalCompute: activeMiners.filter(m => m.capabilities?.generalCompute).length
    },
    estimatedWaitTime: calculateEstimatedWaitTime(),
    currentLoad: calculateCurrentLoad()
  };

  return createResponse(200, availability);
}

// Get pricing information
async function handlePricingInfo(event) {
  const pricing = {
    base: {
      gpu_hour: 0.50,
      cpu_hour: 0.10,
      hashcat_job: 5.00,
      ai_training_hour: 2.00,
      data_processing_gb: 0.05
    },
    enterprise: {
      gpu_hour: 0.40,
      cpu_hour: 0.08,
      hashcat_job: 4.00,
      ai_training_hour: 1.60,
      data_processing_gb: 0.04,
      volume_discount: 0.20
    },
    bulk_discounts: [
      { min_hours: 100, discount: 0.10 },
      { min_hours: 500, discount: 0.20 },
      { min_hours: 1000, discount: 0.30 }
    ],
    priority_multipliers: {
      low: 0.80,
      normal: 1.00,
      high: 1.50,
      urgent: 2.00
    }
  };

  return createResponse(200, pricing);
}

// Cancel compute job
async function handleComputeCancel(event, client) {
  const body = JSON.parse(event.body || '{}');
  const { jobId } = body;

  if (!jobId) {
    return createResponse(400, { error: 'jobId is required' });
  }

  const job = globalStorage.externalJobs?.get(jobId);
  if (!job || job.clientId !== client.id) {
    return createResponse(404, { error: 'Job not found' });
  }

  if (['completed', 'cancelled'].includes(job.status)) {
    return createResponse(400, {
      error: `Cannot cancel job with status: ${job.status}`
    });
  }

  // Cancel the job
  job.status = 'cancelled';
  job.cancelledAt = Date.now();

  // Refund partial credits if job hasn't started
  let refund = 0;
  if (job.status === 'queued') {
    refund = job.estimatedCost * 0.95; // 95% refund for queued jobs
  } else if (job.status === 'running') {
    refund = job.estimatedCost * (1 - (job.progress / 100)) * 0.50; // 50% refund for unfinished work
  }

  client.credits += refund;

  console.log(`❌ External job cancelled: ${jobId} - Refund: $${refund}`);

  return createResponse(200, {
    success: true,
    jobId,
    status: 'cancelled',
    refund,
    message: 'Job cancelled successfully'
  });
}

// Helper functions
function calculateJobCost(jobType, requirements, maxDuration) {
  const pricing = {
    'hashcat': 5.00,
    'ai-training': 2.00,
    'general-compute': 1.00,
    'data-processing': 0.50
  };

  const baseCost = pricing[jobType] || 1.00;
  const gpuCost = (requirements.gpus || 0) * 0.50 * maxDuration;
  const cpuCost = (requirements.cpus || 0) * 0.10 * maxDuration;

  return baseCost + gpuCost + cpuCost;
}

function getQueuePosition(jobId) {
  // Simple queue position calculation
  const queuedJobs = Array.from(globalStorage.marketplace?.jobs?.values() || [])
    .filter(job => job.status === 'queued')
    .sort((a, b) => a.createdAt - b.createdAt);

  return queuedJobs.findIndex(job => job.id === jobId) + 1;
}

function getEstimatedStartTime(job) {
  const queuePosition = getQueuePosition(job.id);
  const avgJobTime = 30 * 60 * 1000; // 30 minutes average
  return Date.now() + (queuePosition * avgJobTime);
}

function calculateEstimatedWaitTime() {
  const queueLength = Array.from(globalStorage.marketplace?.jobs?.values() || [])
    .filter(job => job.status === 'queued').length;

  return Math.max(0, queueLength * 15); // 15 minutes per queued job
}

function calculateCurrentLoad() {
  const activeJobs = Array.from(globalStorage.marketplace?.jobs?.values() || [])
    .filter(job => job.status === 'running').length;

  const totalWorkers = globalStorage.miners?.size || 1;
  return Math.min(1.0, activeJobs / totalWorkers);
}