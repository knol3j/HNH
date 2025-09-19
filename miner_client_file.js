// hashnhedge-miner.js
const crypto = require('crypto');
const axios = require('axios');
const os = require('os');

class HashNHedgeMiner {
    constructor(config) {
        this.poolUrl = config.poolUrl || 'http://localhost:3001';
        this.walletAddress = config.walletAddress;
        this.workerName = config.workerName || os.hostname();
        this.isRunning = false;
        this.shares = 0;
        this.acceptedShares = 0;
        this.rejectedShares = 0;
        this.hashrate = 0;
        this.totalEarnings = 0;
        this.difficulty = '0x0000ffff00000000000000000000000000000000000000000000000000000000';
        this.startTime = null;
        
        // Validate wallet address
        if (!this.walletAddress || this.walletAddress === 'YOUR_SOLANA_WALLET_ADDRESS_HERE') {
            console.error('❌ Please set your Solana wallet address in the config!');
            process.exit(1);
        }
    }

    async connect() {
        try {
            console.log(`🔗 Connecting to pool: ${this.poolUrl}`);
            
            const gpuInfo = this.detectSystemInfo();
            const estimatedHashrate = this.estimateHashrate();
            
            const response = await axios.post(`${this.poolUrl}/api/miner/connect`, {
                walletAddress: this.walletAddress,
                workerName: this.workerName,
                gpuInfo,
                hashrate: estimatedHashrate
            });

            if (response.data.success) {
                console.log('✅ Connected to HashNHedge pool successfully!');
                console.log(`📊 Pool fee: ${response.data.poolInfo.fee}%`);
                console.log(`🎯 Difficulty: ${response.data.poolInfo.difficulty}`);
                console.log(`🪙 Token: ${response.data.poolInfo.token}`);
                console.log(`💰 Reward per share: ${response.data.poolInfo.rewardPerShare} HNH`);
                
                this.difficulty = response.data.poolInfo.difficulty;
                return true;
            }
        } catch (error) {
            console.error('❌ Failed to connect to pool:', error.response?.data?.error || error.message);
            return false;
        }
    }

    detectSystemInfo() {
        const cpus = os.cpus();
        return {
            platform: os.platform(),
            arch: os.arch(),
            cpuModel: cpus[0]?.model || 'Unknown',
            cpuCores: cpus.length,
            totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
            hostname: os.hostname()
        };
    }

    estimateHashrate() {
        // Simple hashrate estimation based on CPU cores
        const cpuCount = os.cpus().length;
        const baseHashrate = 50000; // 50 KH/s per core baseline
        return cpuCount * baseHashrate;
    }

    async startMining() {
        if (this.isRunning) {
            console.log('⚠️  Mining already running!');
            return;
        }
        
        const connected = await this.connect();
        if (!connected) {
            console.log('❌ Cannot start mining - connection failed');
            return;
        }

        this.isRunning = true;
        this.startTime = Date.now();
        
        console.log('\n⛏️  Starting HashNHedge mining...');
        console.log('=====================================');
        console.log(`💳 Wallet: ${this.walletAddress}`);
        console.log(`🖥️  Worker: ${this.workerName}`);
        console.log(`🏊 Pool: ${this.poolUrl}`);
        console.log('=====================================\n');

        // Start mining loop
        this.miningLoop();
        
        // Start periodic stats reporting
        setInterval(() => this.reportStats(), 15000); // Every 15 seconds
    }

    async miningLoop() {
        while (this.isRunning) {
            try {
                await this.mineBlock();
            } catch (error) {
                console.error('Mining error:', error.message);
                await this.sleep(1000); // Wait 1 second before retrying
            }
        }
    }

    async mineBlock() {
        const startTime = Date.now();
        
        // Generate block template
        const blockData = {
            timestamp: Date.now(),
            previousHash: crypto.randomBytes(32).toString('hex'),
            transactions: crypto.randomBytes(64).toString('hex'),
            nonce: 0
        };

        let attempts = 0;
        const maxAttempts = 100000; // Limit to prevent blocking
        
        // Mine until we find a valid hash
        while (attempts < maxAttempts && this.isRunning) {
            blockData.nonce = attempts;
            const input = JSON.stringify(blockData);
            const hash = crypto.createHash('sha256').update(input).digest('hex');
            
            attempts++;
            
            // Check if hash meets difficulty
            if (this.meetsdifficulty(hash)) {
                await this.submitShare(blockData.nonce, hash, blockData.timestamp);
                break;
            }
            
            // Yield control occasionally to prevent blocking
            if (attempts % 10000 === 0) {
                await this.sleep(1);
            }
        }

        // Calculate current hashrate
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        if (duration > 0) {
            this.hashrate = Math.round(attempts / duration);
        }
    }

    meetsdifficulty(hash) {
        // Check if hash meets difficulty (starts with required number of zeros)
        return hash.startsWith('0000'); // Requires 4 leading zeros
    }

    async submitShare(nonce, hash, timestamp) {
        try {
            const response = await axios.post(`${this.poolUrl}/api/miner/submit-share`, {
                walletAddress: this.walletAddress,
                nonce,
                hash,
                timestamp
            });

            if (response.data.success) {
                this.acceptedShares++;
                this.totalEarnings = response.data.totalEarnings;
                
                console.log(`✅ Share accepted! Hash: ${hash.substring(0, 16)}...`);
                console.log(`💰 HNH reward: ${response.data.hnhReward} | Total earnings: ${response.data.totalEarnings} HNH`);
                console.log(`📊 Total shares: ${response.data.totalShares} | Session: ${this.acceptedShares}/${this.acceptedShares + this.rejectedShares}`);
            }
        } catch (error) {
            this.rejectedShares++;
            const errorMsg = error.response?.data?.error || error.message;
            console.log(`❌ Share rejected: ${errorMsg}`);
        }
    }

    reportStats() {
        if (!this.isRunning) return;
        
        const runtime = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
        const acceptanceRate = this.acceptedShares + this.rejectedShares > 0 ? 
            ((this.acceptedShares / (this.acceptedShares + this.rejectedShares)) * 100).toFixed(1) : 0;
        
        console.log('\n📈 Mining Stats:');
        console.log(`   Hashrate: ${this.formatHashrate(this.hashrate)}`);
        console.log(`   Shares: ${this.acceptedShares} accepted, ${this.rejectedShares} rejected (${acceptanceRate}% acceptance)`);
        console.log(`   Earnings: ${this.totalEarnings} HNH tokens`);
        console.log(`   Runtime: ${this.formatTime(runtime)}`);
        console.log('─'.repeat(50));
    }

    formatHashrate(hashrate) {
        if (hashrate >= 1000000) return `${(hashrate / 1000000).toFixed(2)} MH/s`;
        if (hashrate >= 1000) return `${(hashrate / 1000).toFixed(2)} KH/s`;
        return `${hashrate} H/s`;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}h ${minutes}m ${secs}s`;
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        console.log('\n🛑 Mining stopped');
        console.log('📊 Final stats:');
        console.log(`   Total shares accepted: ${this.acceptedShares}`);
        console.log(`   Total HNH earned: ${this.totalEarnings}`);
        console.log(`   Session runtime: ${this.formatTime(Math.round((Date.now() - this.startTime) / 1000))}`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Configuration - EDIT THIS!
const config = {
    poolUrl: 'https://hashnhedge-pool.onrender.com',
    walletAddress: 'GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc', // CHANGE THIS!
    workerName: `miner-${os.hostname()}`
};

// Validate configuration
if (!config.walletAddress || config.walletAddress === 'CB9tPfNgfxsTZpNkVWaohabFqWUCNd5RH6w8bvzZemVd') {
    console.error('\n❌ CONFIGURATION ERROR:');
    console.error('Please edit hashnhedge-miner.js and set your Solana wallet address!');
    console.error('Line ~190: walletAddress: "CB9tPfNgfxsTZpNkVWaohabFqWUCNd5RH6w8bvzZemVd"');
    console.error('\nExample: "GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc"');
    process.exit(1);
}

// Start mining
const miner = new HashNHedgeMiner(config);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down miner...');
    miner.stop();
    process.exit(0);
});

// Display startup info
console.log('🚀 HashNHedge Miner v1.0');
console.log('========================');
console.log('Press Ctrl+C to stop mining\n');

// Start mining process
miner.startMining().catch(error => {
    console.error('❌ Failed to start mining:', error.message);
    process.exit(1);
});

module.exports = HashNHedgeMiner;