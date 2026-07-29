const prisma = require('../../lib/prisma');
const crypto = require('crypto');
const GPUDetector = require('../../hybrid-pool/gpu-detector');

const gpuDetector = new GPUDetector();

/**
 * Enrich hardware info from whatever data the client provided.
 * Uses GPUDetector to infer GPU model from hashrate or user agent.
 */
function enrichHardwareInfo(raw) {
  const info = typeof raw === 'object' && raw !== null ? raw : {};

  // If client already sent rich GPU info, use it
  if (info.gpu && info.gpu.model) {
    return {
      ...info,
      gpuCount: info.gpu.count || info.gpuCount || 1,
      gpuModel: info.gpu.model || info.gpuModel || 'Unknown',
      cpuCores: info.cpu?.cores || info.cpuCores || 0,
      ramGb: info.ram?.gb || info.ramGb || 0,
      capabilities: info.capabilities || []
    };
  }

  // Try to infer from user agent
  const ua = info.userAgent || info.miner || '';
  const uaInfo = gpuDetector.detectFromUserAgent(ua);

  // Try to infer from hashrate
  const hashrate = info.hashrate || info.estimatedHashrate || 0;
  const algorithm = info.algorithm || 'ethash';
  const estimate = hashrate ? gpuDetector.estimateGPUFromHashrate(hashrate, algorithm) : null;

  // Build profile
  const profile = gpuDetector.buildWorkerProfile({
    model: estimate?.model,
    hashrate,
    userAgent: ua,
    firstShare: null
  });

  return {
    ...info,
    gpuCount: info.gpuCount || (uaInfo?.platform === 'nvidia' || uaInfo?.platform === 'amd' ? 1 : 0),
    gpuModel: profile.gpu || info.gpuModel || 'Unknown',
    cpuCores: info.cpuCores || (typeof info.cores === 'number' ? info.cores : 0),
    ramGb: info.ramGb || 0,
    capabilities: Array.isArray(info.capabilities) ? info.capabilities : profile.capabilities || []
  };
}

/**
 * Register a new worker/miner
 * POST /api/worker/register
 */
async function registerWorker(req, res) {
  try {
    const {
      workerId,
      walletAddress,
      hardwareInfo
    } = req.body;

    if (!workerId || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Worker ID and wallet address are required'
      });
    }

    // Check if worker already exists
    const existingWorker = await prisma.worker.findUnique({
      where: { workerId }
    });

    if (existingWorker) {
      return res.status(409).json({
        success: false,
        error: 'Worker ID already registered'
      });
    }

    // Enrich hardware info with GPU detection
    const enrichedInfo = enrichHardwareInfo(hardwareInfo);

    // Create new worker with structured hardware fields
    const worker = await prisma.worker.create({
      data: {
        workerId,
        walletAddress,
        hardwareInfo: enrichedInfo,
        gpuCount: enrichedInfo.gpuCount || null,
        gpuModel: enrichedInfo.gpuModel || null,
        cpuCores: enrichedInfo.cpuCores || null,
        ramGb: enrichedInfo.ramGb || null,
        status: 'active',
        lastSeen: new Date()
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: worker.id,
        workerId: worker.workerId,
        walletAddress: worker.walletAddress,
        status: worker.status,
        hardwareInfo: worker.hardwareInfo,
        createdAt: worker.createdAt
      },
      message: 'Worker registered successfully'
    });

  } catch (error) {
    console.error('Worker registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register worker',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Update worker status and heartbeat
 * POST /api/worker/:workerId/heartbeat
 */
/**
 * Update worker status and heartbeat
 * POST /api/worker/:workerId/heartbeat
 */
async function workerHeartbeat(req, res) {
  try {
    const { workerId } = req.params;
    const { hardwareInfo, status } = req.body;

    const updateData = {
      lastSeen: new Date(),
      status: status || 'active'
    };

    // If client sent updated hardware info, enrich and store it
    if (hardwareInfo) {
      const enriched = enrichHardwareInfo(hardwareInfo);
      updateData.hardwareInfo = enriched;
      updateData.gpuCount = enriched.gpuCount || null;
      updateData.gpuModel = enriched.gpuModel || null;
      updateData.cpuCores = enriched.cpuCores || null;
      updateData.ramGb = enriched.ramGb || null;
    }

    const worker = await prisma.worker.update({
      where: { workerId },
      data: updateData
    });

    res.json({
      success: true,
      data: {
        workerId: worker.workerId,
        status: worker.status,
        hardwareInfo: worker.hardwareInfo,
        lastSeen: worker.lastSeen
      }
    });

  } catch (error) {
    console.error('Worker heartbeat error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update worker status'
    });
  }
}

/**
 * Get worker stats and earnings
 * GET /api/worker/:workerId/stats
 */
async function getWorkerStats(req, res) {
  try {
    const { workerId } = req.params;

    const worker = await prisma.worker.findUnique({
      where: { workerId },
      include: {
        shares: {
          where: {
            submittedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        },
        earnings: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    // Calculate 24h stats
    const shares24h = worker.shares.length;
    const validShares24h = worker.shares.filter(s => s.isValid).length;
    const invalidShares24h = worker.shares.filter(s => !s.isValid).length;

    res.json({
      success: true,
      data: {
        worker: {
          id: worker.id,
          workerId: worker.workerId,
          walletAddress: worker.walletAddress,
          status: worker.status,
          lastSeen: worker.lastSeen,
          hardwareInfo: worker.hardwareInfo
        },
        stats: {
          totalShares: worker.totalShares.toString(),
          validShares: worker.validShares.toString(),
          invalidShares: worker.invalidShares.toString(),
          totalEarnings: worker.totalEarnings.toString(),
          shares24h,
          validShares24h,
          invalidShares24h,
          acceptanceRate: shares24h > 0 ? (validShares24h / shares24h * 100).toFixed(2) + '%' : '0%'
        },
        recentEarnings: worker.earnings,
        recentPayments: worker.payments
      }
    });

  } catch (error) {
    console.error('Get worker stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve worker stats'
    });
  }
}

/**
 * Get available jobs for worker
 * GET /api/worker/:workerId/jobs
 */
async function getAvailableJobs(req, res) {
  try {
    const { workerId } = req.params;
    const { jobType } = req.query;

    // Verify worker exists
    const worker = await prisma.worker.findUnique({
      where: { workerId }
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    const where = {
      status: 'pending',
      assignedWorker: null
    };

    if (jobType) {
      where.jobType = jobType;
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { reward: 'desc' },
      take: 10
    });

    res.json({
      success: true,
      data: jobs
    });

  } catch (error) {
    console.error('Get available jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve available jobs'
    });
  }
}

/**
 * Claim a job for worker
 * POST /api/worker/:workerId/jobs/:jobId/claim
 */
async function claimJob(req, res) {
  try {
    const { workerId, jobId } = req.params;

    // Get worker
    const worker = await prisma.worker.findUnique({
      where: { workerId }
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    // Try to claim job (atomic operation)
    const job = await prisma.job.update({
      where: {
        id: jobId,
        status: 'pending',
        assignedWorker: null
      },
      data: {
        assignedWorker: worker.id,
        status: 'in_progress'
      }
    });

    res.json({
      success: true,
      data: job,
      message: 'Job claimed successfully'
    });

  } catch (error) {
    console.error('Claim job error:', error);

    if (error.code === 'P2025') {
      return res.status(409).json({
        success: false,
        error: 'Job no longer available or already claimed'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to claim job'
    });
  }
}

/**
 * Submit share for job
 * POST /api/worker/:workerId/shares
 */
async function submitShare(req, res) {
  try {
    const { workerId } = req.params;
    const {
      jobId,
      difficulty,
      nonce,
      hash,
      jobType
    } = req.body;

    if (!jobId || !difficulty || !nonce || !hash || !jobType) {
      return res.status(400).json({
        success: false,
        error: 'Job ID, difficulty, nonce, hash, and job type are required'
      });
    }

    // Get worker
    const worker = await prisma.worker.findUnique({
      where: { workerId }
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    // Validate hash (basic validation - implement proper validation based on algorithm)
    const isValid = validateShare(hash, difficulty, nonce);

    // Create share record
    const share = await prisma.share.create({
      data: {
        workerId: worker.id,
        jobId,
        difficulty: BigInt(difficulty),
        isValid,
        jobType,
        nonce,
        hash
      }
    });

    // Update worker stats
    await prisma.worker.update({
      where: { id: worker.id },
      data: {
        totalShares: { increment: 1 },
        ...(isValid ? { validShares: { increment: 1 } } : { invalidShares: { increment: 1 } }),
        lastSeen: new Date()
      }
    });

    // If share is valid, create earning record
    if (isValid) {
      const job = await prisma.job.findUnique({
        where: { id: jobId }
      });

      if (job && job.reward) {
        await prisma.earning.create({
          data: {
            workerId: worker.id,
            amount: job.reward,
            jobType,
            description: `Share submitted for job ${job.jobId}`
          }
        });

        await prisma.worker.update({
          where: { id: worker.id },
          data: {
            totalEarnings: { increment: job.reward }
          }
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        shareId: share.id,
        isValid: share.isValid,
        submittedAt: share.submittedAt
      },
      message: isValid ? 'Valid share accepted' : 'Invalid share rejected'
    });

  } catch (error) {
    console.error('Submit share error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit share',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * List all workers with stats
 * GET /api/workers
 */
async function listWorkers(req, res) {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (status) {
      where.status = status;
    }

    const [workers, total] = await Promise.all([
      prisma.worker.findMany({
        where,
        skip,
        take,
        orderBy: { lastSeen: 'desc' },
        select: {
          id: true,
          workerId: true,
          walletAddress: true,
          status: true,
          lastSeen: true,
          gpuCount: true,
          gpuModel: true,
          cpuCores: true,
          ramGb: true,
          hardwareInfo: true,
          totalShares: true,
          validShares: true,
          invalidShares: true,
          totalEarnings: true,
          createdAt: true
        }
      }),
      prisma.worker.count({ where })
    ]);

    res.json({
      success: true,
      data: workers.map(w => ({
        ...w,
        totalShares: w.totalShares.toString(),
        validShares: w.validShares.toString(),
        invalidShares: w.invalidShares.toString(),
        totalEarnings: w.totalEarnings.toString()
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('List workers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workers'
    });
  }
}

/**
 * Get available tasks for any node (without node_id requirement)
 * GET /api/tasks
 */
async function getAvailableTasks(req, res) {
  try {
    const { node_id } = req.query;

    // Get high-value jobs available for any worker
    const jobs = await prisma.job.findMany({
      where: {
        status: 'pending',
        assignedWorker: null
      },
      orderBy: { reward: 'desc' },
      take: 20
    });

    // Return tasks in expected format for mining controller
    const tasks = jobs.map(job => ({
      id: job.id,
      type: job.jobType === 'ai' ? 'hashcat' : 'mining',
      reward: parseFloat(job.reward),
      hash_type: job.metadata?.hash_type || 0,
      attack_mode: job.metadata?.attack_mode || 0,
      hash_file: job.metadata?.hash_file || '',
      wordlist: job.metadata?.wordlist || '',
      hash_count: job.metadata?.hash_count || 0,
      difficulty: job.metadata?.difficulty || 1,
      algorithm: job.metadata?.algorithm || 'sha256'
    }));

    res.json(tasks);

  } catch (error) {
    console.error('Get available tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve available tasks'
    });
  }
}

/**
 * Basic share validation
 * In production, implement proper algorithm-specific validation
 */
function validateShare(hash, difficulty, nonce) {
  // Placeholder validation - implement actual algorithm validation
  // For now, just check if hash meets minimum difficulty requirements

  // Example: For SHA256, check leading zeros based on difficulty
  const leadingZeros = Math.floor(difficulty / 4);
  const hashStart = hash.substring(0, leadingZeros);

  return hashStart === '0'.repeat(leadingZeros);
}

/**
 * Update worker capabilities (GPU, AI support, etc.)
 * PUT /api/worker/:workerId/capabilities
 */
async function updateWorkerCapabilities(req, res) {
  try {
    const { workerId } = req.params;
    const { hardwareInfo } = req.body;

    const enriched = enrichHardwareInfo(hardwareInfo);

    const worker = await prisma.worker.update({
      where: { workerId },
      data: {
        hardwareInfo: enriched,
        gpuCount: enriched.gpuCount || null,
        gpuModel: enriched.gpuModel || null,
        cpuCores: enriched.cpuCores || null,
        ramGb: enriched.ramGb || null,
        lastSeen: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        workerId: worker.workerId,
        hardwareInfo: worker.hardwareInfo,
        capabilities: enriched.capabilities
      },
      message: 'Worker capabilities updated'
    });

  } catch (error) {
    console.error('Update capabilities error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update worker capabilities'
    });
  }
}

module.exports = {
  registerWorker,
  workerHeartbeat,
  updateWorkerCapabilities,
  getWorkerStats,
  getAvailableJobs,
  getAvailableTasks,
  claimJob,
  submitShare,
  listWorkers
};
