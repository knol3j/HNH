// Enhanced Adaptive Miner Client - Supports Multiple Computing Tasks
const crypto = require('crypto');
const { execSync } = require('child_process');
const os = require('os');

class AdaptiveMinerClient {
    constructor(config) {
        this.config = {
            poolUrl: config.poolUrl || 'https://hashnhedge.netlify.app',
            walletAddress: config.walletAddress,
            workerName: config.workerName || `worker_${os.hostname()}`,
            capabilities: config.capabilities || {
                mining: true,
                hashcat: true,
                aiTraining: false,
                generalCompute: true
            },
            gpuInfo: this.detectGPUs(),
            cpuInfo: this.detectCPUs(),
            ...config
        };

        this.currentJob = null;
        this.isConnected = false;
        this.stats = {
            totalJobs: 0,
            totalEarnings: 0,
            uptime: Date.now()
        };
    }

    // Detect available GPUs
    detectGPUs() {
        try {
            // Try nvidia-smi for NVIDIA GPUs
            const nvidiaOutput = execSync('nvidia-smi -L', { encoding: 'utf8' });
            const gpuCount = (nvidiaOutput.match(/GPU \d+:/g) || []).length;

            if (gpuCount > 0) {
                return {
                    vendor: 'NVIDIA',
                    count: gpuCount,
                    detected: true,
                    capabilities: ['mining', 'hashcat', 'ai-training', 'general-compute']
                };
            }
        } catch (error) {
            console.log('NVIDIA GPUs not detected, checking for AMD...');
        }

        try {
            // Try rocm-smi for AMD GPUs
            const amdOutput = execSync('rocm-smi -l', { encoding: 'utf8' });
            const gpuCount = (amdOutput.match(/GPU\[\d+\]/g) || []).length;

            if (gpuCount > 0) {
                return {
                    vendor: 'AMD',
                    count: gpuCount,
                    detected: true,
                    capabilities: ['mining', 'hashcat', 'general-compute']
                };
            }
        } catch (error) {
            console.log('AMD GPUs not detected');
        }

        // Fallback to CPU-only mode
        return {
            vendor: 'CPU',
            count: 0,
            detected: false,
            capabilities: ['mining', 'general-compute']
        };
    }

    // Detect CPU information
    detectCPUs() {
        const cpus = os.cpus();
        return {
            model: cpus[0].model,
            cores: cpus.length,
            speed: cpus[0].speed,
            capabilities: ['mining', 'general-compute', 'hashcat']
        };
    }

    // Connect to the pool
    async connectToPool() {
        try {
            console.log(`🔗 Connecting to HashNHedge pool: ${this.config.poolUrl}`);

            const response = await fetch(`${this.config.poolUrl}/.netlify/functions/miner/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: this.config.walletAddress,
                    workerName: this.config.workerName,
                    gpuInfo: this.config.gpuInfo,
                    cpuInfo: this.config.cpuInfo,
                    capabilities: this.config.capabilities,
                    hashrate: this.getCurrentHashrate()
                })
            });

            const data = await response.json();

            if (data.success) {
                this.isConnected = true;
                console.log(`✅ Connected successfully! Pool: ${data.poolInfo.token}`);
                console.log(`🎯 Capabilities: ${Object.keys(this.config.capabilities).filter(k => this.config.capabilities[k]).join(', ')}`);
                return true;
            } else {
                console.error('❌ Connection failed:', data.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Connection error:', error.message);
            return false;
        }
    }

    // Check for available jobs
    async checkForJobs() {
        try {
            const response = await fetch(`${this.config.poolUrl}/.netlify/functions/marketplace/jobs`);
            const data = await response.json();

            const availableJobs = data.availableJobs.filter(job =>
                this.canHandleJob(job) && !this.currentJob
            );

            if (availableJobs.length > 0) {
                console.log(`🎯 Found ${availableJobs.length} compatible jobs`);
                return availableJobs[0]; // Take the first available job
            }

            return null;
        } catch (error) {
            console.error('❌ Error checking jobs:', error.message);
            return null;
        }
    }

    // Check if we can handle a specific job
    canHandleJob(job) {
        const jobType = job.type;
        const hasCapability = this.config.capabilities[jobType] || this.config.capabilities[jobType.replace('-', '')];

        const gpuRequirement = job.requirements?.gpus || 0;
        const cpuRequirement = job.requirements?.cpus || 0;

        const hasGPUs = this.config.gpuInfo.count >= gpuRequirement;
        const hasCPUs = this.config.cpuInfo.cores >= cpuRequirement;

        return hasCapability && hasGPUs && hasCPUs;
    }

    // Execute different types of jobs
    async executeJob(job) {
        console.log(`🚀 Starting job: ${job.id} (${job.type})`);
        this.currentJob = job;

        try {
            switch (job.type) {
                case 'mining':
                    await this.executeMiningJob(job);
                    break;
                case 'hashcat':
                    await this.executeHashcatJob(job);
                    break;
                case 'ai-training':
                    await this.executeAITrainingJob(job);
                    break;
                case 'general-compute':
                    await this.executeGeneralComputeJob(job);
                    break;
                default:
                    throw new Error(`Unsupported job type: ${job.type}`);
            }

            this.stats.totalJobs++;
            console.log(`✅ Job completed: ${job.id}`);
        } catch (error) {
            console.error(`❌ Job failed: ${job.id}`, error.message);
        } finally {
            this.currentJob = null;
        }
    }

    // Mining job execution
    async executeMiningJob(job) {
        console.log('⛏️ Starting mining operation...');

        const startTime = Date.now();
        let shares = 0;

        while (Date.now() - startTime < (job.estimatedHours || 1) * 60 * 60 * 1000) {
            // Simulate mining work
            const nonce = Math.floor(Math.random() * 2147483647);
            const hash = this.calculateHash(job.data?.target || 'default_target', nonce);

            // Check if we found a valid share
            if (hash.startsWith('0000')) {
                await this.submitShare(hash, nonce);
                shares++;
                console.log(`💎 Share found! Total: ${shares}`);
            }

            // Sleep briefly to avoid overwhelming the system
            await this.sleep(1000);
        }
    }

    // Hashcat job execution
    async executeHashcatJob(job) {
        console.log('🔐 Starting hashcat operation...');

        const { hashType, targetHash, wordlist, rules } = job.data;

        console.log(`Target: ${targetHash?.substring(0, 20)}...`);
        console.log(`Hash Type: ${hashType || 'MD5'}`);

        // Simulate hashcat cracking
        const simulationTime = (job.estimatedHours || 0.5) * 60 * 60 * 1000;
        await this.sleep(simulationTime);

        // Simulate finding result (for demo)
        const mockResult = {
            found: Math.random() > 0.5,
            plaintext: Math.random() > 0.5 ? 'password123' : null,
            attempts: Math.floor(Math.random() * 1000000)
        };

        console.log(`🔓 Hashcat result: ${mockResult.found ? 'FOUND' : 'NOT FOUND'}`);
        if (mockResult.found) {
            console.log(`🎉 Plaintext: ${mockResult.plaintext}`);
        }

        return mockResult;
    }

    // AI Training job execution
    async executeAITrainingJob(job) {
        console.log('🤖 Starting AI training operation...');

        const { modelType, dataset, epochs, batchSize } = job.data;

        console.log(`Model: ${modelType || 'Neural Network'}`);
        console.log(`Epochs: ${epochs || 10}`);

        // Simulate AI training
        for (let epoch = 1; epoch <= (epochs || 10); epoch++) {
            console.log(`📈 Training epoch ${epoch}/${epochs || 10}`);
            await this.sleep(5000); // Simulate training time

            const accuracy = 0.1 + (epoch / (epochs || 10)) * 0.8; // Simulate improving accuracy
            console.log(`📊 Epoch ${epoch} accuracy: ${(accuracy * 100).toFixed(2)}%`);
        }

        console.log('🎓 AI training completed!');
    }

    // General compute job execution
    async executeGeneralComputeJob(job) {
        console.log('⚡ Starting general compute operation...');

        const { operation, iterations, data } = job.data;

        console.log(`Operation: ${operation || 'compute'}`);
        console.log(`Iterations: ${iterations || 1000}`);

        // Simulate general computing work
        for (let i = 0; i < (iterations || 1000); i++) {
            // Simulate CPU-intensive work
            Math.sqrt(Math.random() * 1000000);

            if (i % 100 === 0) {
                console.log(`🔄 Progress: ${i}/${iterations || 1000}`);
            }
        }

        console.log('⚡ General compute completed!');
    }

    // Submit mining share
    async submitShare(hash, nonce) {
        try {
            const response = await fetch(`${this.config.poolUrl}/.netlify/functions/miner/submit-share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: this.config.walletAddress,
                    nonce: nonce,
                    hash: hash,
                    timestamp: Date.now()
                })
            });

            const data = await response.json();

            if (data.success) {
                this.stats.totalEarnings += data.hnhReward || 0;
                console.log(`💰 Share accepted! Earned: ${data.hnhReward} HNH`);
            }
        } catch (error) {
            console.error('❌ Share submission failed:', error.message);
        }
    }

    // Calculate hash
    calculateHash(target, nonce) {
        const data = `${target}${nonce}${Date.now()}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Get current hashrate
    getCurrentHashrate() {
        const baseHashrate = this.config.gpuInfo.count * 1000000; // 1 MH/s per GPU
        const cpuHashrate = this.config.cpuInfo.cores * 100000; // 100 KH/s per CPU core
        return baseHashrate + cpuHashrate;
    }

    // Sleep utility
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Main mining loop
    async start() {
        console.log('🚀 Starting HashNHedge Adaptive Miner...');
        console.log(`👤 Worker: ${this.config.workerName}`);
        console.log(`💼 Wallet: ${this.config.walletAddress}`);
        console.log(`🖥️ GPUs: ${this.config.gpuInfo.count} ${this.config.gpuInfo.vendor}`);
        console.log(`⚙️ CPUs: ${this.config.cpuInfo.cores} cores`);

        // Connect to pool
        const connected = await this.connectToPool();
        if (!connected) {
            console.error('❌ Failed to connect to pool. Exiting...');
            return;
        }

        // Main loop
        while (true) {
            try {
                // Check for jobs if not currently working
                if (!this.currentJob) {
                    const availableJob = await this.checkForJobs();
                    if (availableJob) {
                        await this.executeJob(availableJob);
                    } else {
                        // Default to mining if no other jobs available
                        await this.executeMiningJob({
                            id: 'mining_default',
                            type: 'mining',
                            estimatedHours: 0.01 // 36 seconds
                        });
                    }
                }

                // Update stats
                console.log(`📊 Stats - Jobs: ${this.stats.totalJobs}, Earnings: ${this.stats.totalEarnings} HNH, Uptime: ${Math.floor((Date.now() - this.stats.uptime) / 1000)}s`);

                // Wait before next iteration
                await this.sleep(5000);

            } catch (error) {
                console.error('❌ Error in main loop:', error.message);
                await this.sleep(10000); // Wait longer on error
            }
        }
    }
}

// Usage example
const config = {
    poolUrl: 'https://hashnhedge.netlify.app',
    walletAddress: 'CB9tPfNgfxsTZpNkVWaohabFqWUCNd5RH6w8bvzZemVd',
    workerName: 'adaptive_worker_001',
    capabilities: {
        mining: true,
        hashcat: true,
        aiTraining: false, // Set to true if you have ML frameworks installed
        generalCompute: true
    }
};

// Start the adaptive miner
const miner = new AdaptiveMinerClient(config);
miner.start().catch(console.error);

module.exports = AdaptiveMinerClient;