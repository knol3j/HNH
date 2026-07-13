/**
 * HashNHedge Hybrid Compute Orchestrator
 * Routes GPUs between AI/ML jobs (priority) and mining (fallback)
 *
 * Architecture:
 * - AI jobs get priority (high margin: 30% fee)
 * - Mining when idle (low margin: 2-3% fee)
 * - Dynamic routing based on job availability and GPU capability
 */

const EventEmitter = require('events');

class JobOrchestrator extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            aiJobCheckInterval: config.aiJobCheckInterval || 5000, // Check every 5s
            miningFallbackDelay: config.miningFallbackDelay || 10000, // 10s before fallback
            maxJobSwitchPerHour: config.maxJobSwitchPerHour || 12, // Limit switching overhead
            ...config
        };

        // Job queues
        this.aiJobQueue = [];
        this.miningJobs = [];

        // Connected miners/workers
        this.workers = new Map(); // workerId -> worker object

        // Job assignments
        this.assignments = new Map(); // workerId -> { job, type, startTime }

        // Stats
        this.stats = {
            totalAIJobs: 0,
            totalMiningJobs: 0,
            aiRevenue: 0,
            miningRevenue: 0,
            totalSwitches: 0
        };

        this.startJobRouter();
    }

    /**
     * Register a new worker (miner/GPU)
     */
    registerWorker(workerId, workerInfo) {
        this.workers.set(workerId, {
            id: workerId,
            gpu: workerInfo.gpu || 'unknown',
            hashrate: workerInfo.hashrate || 0,
            capabilities: workerInfo.capabilities || [],
            vram: workerInfo.vram || 0,
            cpuCores: workerInfo.cpuCores || 0,
            rawCapabilities: workerInfo.rawCapabilities || {},
            status: 'idle',
            lastSwitch: Date.now(),
            switchCount: 0,
            connectedAt: Date.now()
        });

        console.log(`✅ Worker registered: ${workerId} (${workerInfo.gpu})`);
        this.emit('worker:registered', workerId);

        // Immediately assign job
        this.assignJobToWorker(workerId);
    }

    /**
     * Add AI/ML job to queue
     */
    addAIJob(job) {
        const aiJob = {
            id: job.id || `ai_${Date.now()}`,
            type: 'ai',
            task: job.task, // 'inference', 'training', 'rendering', etc
            requirements: job.requirements || {},
            reward: job.reward || 0,
            priority: job.priority || 5,
            createdAt: Date.now(),
            ...job
        };

        this.aiJobQueue.push(aiJob);
        this.aiJobQueue.sort((a, b) => b.priority - a.priority); // High priority first

        this.stats.totalAIJobs++;
        console.log(`📋 AI job added: ${aiJob.id} (priority: ${aiJob.priority})`);
        this.emit('job:ai:added', aiJob);

        // Try to reassign workers from mining to AI
        this.redistributeJobs();
    }

    /**
     * Add mining job (fallback)
     */
    addMiningJob(job) {
        const miningJob = {
            id: job.id || `mine_${Date.now()}`,
            type: 'mining',
            algorithm: job.algorithm || 'ethash',
            pool: job.pool || 'auto',
            difficulty: job.difficulty || 1,
            createdAt: Date.now(),
            ...job
        };

        this.miningJobs.push(miningJob);
        console.log(`⛏️  Mining job added: ${miningJob.id} (${miningJob.algorithm})`);
        this.emit('job:mining:added', miningJob);
    }

    /**
     * Core job routing logic - AI first, mining fallback
     */
    assignJobToWorker(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) return;

        // Check if worker switched too recently (prevent thrashing)
        const timeSinceSwitch = Date.now() - worker.lastSwitch;
        if (timeSinceSwitch < (3600000 / this.config.maxJobSwitchPerHour)) {
            console.log(`⏱️  Worker ${workerId} switched too recently, waiting...`);
            return;
        }

        // Priority 1: AI jobs
        const aiJob = this.findMatchingAIJob(worker);
        if (aiJob) {
            this.assignJob(workerId, aiJob, 'ai');
            return;
        }

        // Priority 2: Mining fallback
        const miningJob = this.findMatchingMiningJob(worker);
        if (miningJob) {
            this.assignJob(workerId, miningJob, 'mining');
            return;
        }

        // No jobs available
        worker.status = 'idle';
        console.log(`💤 Worker ${workerId} idle - no jobs available`);
        this.emit('worker:idle', workerId);
    }

    /**
     * Find AI job matching worker capabilities
     */
    findMatchingAIJob(worker) {
        for (let i = 0; i < this.aiJobQueue.length; i++) {
            const job = this.aiJobQueue[i];

            // Check if worker meets requirements
            if (this.workerMeetsRequirements(worker, job.requirements)) {
                this.aiJobQueue.splice(i, 1); // Remove from queue
                return job;
            }
        }
        return null;
    }

    /* ── Job routing ───────────────────────────────────────────────────── */

    /**
     * Find mining job matching worker capabilities
     */
    findMatchingMiningJob(worker) {
        // Return first compatible mining job
        for (const job of this.miningJobs) {
            if (this.workerMeetsRequirements(worker, job.requirements)) {
                return job;
            }
        }
        return this.miningJobs[0] || null;
    }

    /**
     * Check if worker meets job requirements
     */
    workerMeetsRequirements(worker, requirements) {
        if (!requirements) return true;

        // Check VRAM
        if (requirements.minVRAM && worker.vram < requirements.minVRAM) {
            return false;
        }

        // Check GPU type
        if (requirements.gpuType && worker.gpu && !worker.gpu.includes(requirements.gpuType)) {
            return false;
        }

        // Check capabilities (e.g., CUDA, Tensor cores)
        if (requirements.capabilities) {
            for (const cap of requirements.capabilities) {
                if (!worker.capabilities.includes(cap)) {
                    return false;
                }
            }
        }

        // Check CPU cores
        if (requirements.minCpuCores && worker.cpuCores < requirements.minCpuCores) {
            return false;
        }

        // Check job type capability (e.g., ai, mining, rendering)
        if (requirements.jobType && worker.capabilities) {
            const hasJobType = worker.capabilities.includes(requirements.jobType);
            if (!hasJobType) {
                return false;
            }
        }

        return true;
    }

    /**
     * Assign job to worker and notify
     */
    assignJob(workerId, job, jobType) {
        const worker = this.workers.get(workerId);
        const currentAssignment = this.assignments.get(workerId);

        // Track job switch
        if (currentAssignment && currentAssignment.type !== jobType) {
            worker.switchCount++;
            this.stats.totalSwitches++;
            console.log(`🔄 Worker ${workerId} switching: ${currentAssignment.type} → ${jobType}`);
        }

        // Update assignment
        this.assignments.set(workerId, {
            job,
            type: jobType,
            startTime: Date.now()
        });

        worker.status = jobType;
        worker.lastSwitch = Date.now();

        console.log(`✅ Assigned ${jobType} job ${job.id} to worker ${workerId}`);
        this.emit('job:assigned', { workerId, job, jobType });

        // Send job to worker (implement in protocol layer)
        this.sendJobToWorker(workerId, job, jobType);
    }

    /**
     * Send job to worker (to be implemented by protocol layer)
     */
    sendJobToWorker(workerId, job, jobType) {
        // This will be implemented by Stratum/HTTP protocol layer
        // For now, just emit event
        this.emit('worker:job', { workerId, job, jobType });
    }

    /**
     * Redistribute jobs when new high-priority AI job arrives
     */
    redistributeJobs() {
        console.log('🔄 Redistributing jobs...');

        // Find workers doing low-priority work
        for (const [workerId, assignment] of this.assignments) {
            if (assignment.type === 'mining') {
                // Try to give them AI job instead
                const worker = this.workers.get(workerId);
                const aiJob = this.findMatchingAIJob(worker);

                if (aiJob) {
                    console.log(`⬆️  Upgrading worker ${workerId} from mining to AI`);
                    this.assignJob(workerId, aiJob, 'ai');
                }
            }
        }
    }

    /**
     * Handle job completion
     */
    completeJob(workerId, result) {
        const assignment = this.assignments.get(workerId);
        if (!assignment) return;

        const { job, type, startTime } = assignment;
        const duration = Date.now() - startTime;

        console.log(`✅ Job completed: ${job.id} by ${workerId} (${duration}ms)`);

        // Track revenue
        if (type === 'ai' && result.revenue) {
            this.stats.aiRevenue += result.revenue;
        } else if (type === 'mining' && result.revenue) {
            this.stats.miningRevenue += result.revenue;
        }

        // Clear assignment
        this.assignments.delete(workerId);

        // Assign next job
        this.assignJobToWorker(workerId);

        this.emit('job:completed', { workerId, job, type, duration, result });
    }

    /**
     * Job router - periodically checks for optimization opportunities
     */
    startJobRouter() {
        setInterval(() => {
            // Check for idle workers
            for (const [workerId, worker] of this.workers) {
                if (worker.status === 'idle') {
                    this.assignJobToWorker(workerId);
                }
            }

            // Check if we should redistribute (AI jobs waiting, miners idle)
            if (this.aiJobQueue.length > 0) {
                this.redistributeJobs();
            }

        }, this.config.aiJobCheckInterval);
    }

    /**
     * Get orchestrator stats
     */
    getStats() {
        return {
            workers: {
                total: this.workers.size,
                ai: Array.from(this.assignments.values()).filter(a => a.type === 'ai').length,
                mining: Array.from(this.assignments.values()).filter(a => a.type === 'mining').length,
                idle: Array.from(this.workers.values()).filter(w => w.status === 'idle').length
            },
            jobs: {
                aiQueue: this.aiJobQueue.length,
                miningQueue: this.miningJobs.length,
                aiCompleted: this.stats.totalAIJobs - this.aiJobQueue.length,
                miningCompleted: this.stats.totalMiningJobs
            },
            revenue: {
                ai: this.stats.aiRevenue,
                mining: this.stats.miningRevenue,
                total: this.stats.aiRevenue + this.stats.miningRevenue
            },
            performance: {
                totalSwitches: this.stats.totalSwitches,
                avgSwitchesPerWorker: this.stats.totalSwitches / (this.workers.size || 1)
            }
        };
    }

    /**
     * Unregister worker (disconnect)
     */
    unregisterWorker(workerId) {
        const assignment = this.assignments.get(workerId);

        // Return job to queue if incomplete
        if (assignment) {
            if (assignment.type === 'ai') {
                this.aiJobQueue.unshift(assignment.job);
            }
            this.assignments.delete(workerId);
        }

        this.workers.delete(workerId);
        console.log(`❌ Worker unregistered: ${workerId}`);
        this.emit('worker:unregistered', workerId);
    }
}

module.exports = JobOrchestrator;
