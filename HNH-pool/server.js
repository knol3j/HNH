// mining-pool-server.js
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { Connection, Keypair, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { mintTo, getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.devnet.solana.com"]
        }
    }
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://hashnhedge.com', 'https://hashnhedge-pool.onrender.com']
        : true,
    credentials: true
}));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});

const minerLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // Limit miners to 60 requests per minute
    message: { error: 'Mining rate limit exceeded' }
});

app.use('/api', apiLimiter);
app.use('/api/miner', minerLimiter);
app.use(express.json({ limit: '10mb' }));

// Global variables
let deployment = null;
let connection = null;
let mint = null;
let payer = null;

// Load deployment info
try {
    if (fs.existsSync('hnh-deployment.json')) {
        deployment = JSON.parse(fs.readFileSync('hnh-deployment.json'));
        connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        mint = new PublicKey(deployment.mintAddress);
        payer = Keypair.fromSecretKey(new Uint8Array(deployment.keypair));
        console.log('✅ Loaded HNH token deployment:', deployment.mintAddress);
    } else {
        console.log('❌ No deployment found. Run: node hnh-token-deploy.js first');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Failed to load deployment:', error.message);
    process.exit(1);
}

// In-memory database (use real DB in production)
const miners = new Map();
const miningStats = {
    totalHashrate: 0,
    totalMiners: 0,
    totalShares: 0,
    totalHNHDistributed: 0,
    poolFee: 3 // 3% pool fee
};

// Serve static files for frontend
app.use(express.static('.'));

// Website root - serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// API Routes
app.get('/api', (req, res) => {
    res.json({
        message: 'HashNHedge Mining Pool API',
        version: '1.0.0',
        token: deployment.mintAddress,
        network: 'devnet',
        endpoints: {
            stats: '/api/stats',
            connect: 'POST /api/miner/connect',
            submit: 'POST /api/miner/submit-share'
        },
        website: 'https://hashnhedge-pool.onrender.com'
    });
});

// Security monitoring
const securityLogs = {
    connections: [],
    suspiciousActivity: [],
    rejectedConnections: 0,
    rateLimitHits: 0
};

// Input validation helper
function validateInput(input, type, maxLength = 100) {
    if (typeof input !== type) return false;
    if (type === 'string' && input.length > maxLength) return false;
    if (type === 'string' && !/^[\w\s\-\.@]+$/.test(input)) return false;
    return true;
}

// Security monitoring middleware
function logSecurityEvent(req, eventType, details) {
    const event = {
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        eventType,
        details
    };

    securityLogs.suspiciousActivity.push(event);
    if (securityLogs.suspiciousActivity.length > 1000) {
        securityLogs.suspiciousActivity = securityLogs.suspiciousActivity.slice(-500);
    }

    console.log(`🚨 Security Event: ${eventType} from ${event.ip} - ${details}`);
}

// Miner connection endpoint
app.post('/api/miner/connect', async (req, res) => {
    try {
        const { walletAddress, gpuInfo, hashrate, workerName } = req.body;

        // Input validation
        if (!walletAddress || !validateInput(walletAddress, 'string', 50)) {
            logSecurityEvent(req, 'INVALID_WALLET', 'Invalid wallet address format');
            return res.status(400).json({ error: 'Valid wallet address required' });
        }

        if (workerName && !validateInput(workerName, 'string', 30)) {
            logSecurityEvent(req, 'INVALID_WORKER_NAME', 'Invalid worker name format');
            return res.status(400).json({ error: 'Invalid worker name format' });
        }

        if (hashrate && (typeof hashrate !== 'number' || hashrate < 0 || hashrate > 1000000000)) {
            logSecurityEvent(req, 'INVALID_HASHRATE', `Suspicious hashrate: ${hashrate}`);
            return res.status(400).json({ error: 'Invalid hashrate value' });
        }

        // Validate wallet address format
        try {
            new PublicKey(walletAddress);
        } catch {
            logSecurityEvent(req, 'INVALID_SOLANA_WALLET', walletAddress);
            return res.status(400).json({ error: 'Invalid Solana wallet address' });
        }
        
        miners.set(walletAddress, {
            walletAddress,
            workerName: workerName || 'unknown',
            gpuInfo: gpuInfo || {},
            hashrate: hashrate || 0,
            shares: 0,
            totalEarnings: 0,
            lastSeen: Date.now(),
            connectedAt: Date.now(),
            isActive: true
        });
        
        console.log(`🔗 New miner connected: ${walletAddress} (${workerName})`);
        
        res.json({
            success: true,
            message: 'Miner connected successfully',
            poolInfo: {
                fee: miningStats.poolFee,
                algorithm: 'sha256',
                difficulty: '0x0000ffff00000000000000000000000000000000000000000000000000000000',
                token: deployment.mintAddress,
                rewardPerShare: 1
            }
        });
    } catch (error) {
        console.error('Connection error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Share submission endpoint
app.post('/api/miner/submit-share', async (req, res) => {
    try {
        const { walletAddress, nonce, hash, timestamp } = req.body;

        // Input validation
        if (!walletAddress || !validateInput(walletAddress, 'string', 50)) {
            logSecurityEvent(req, 'INVALID_SHARE_WALLET', 'Invalid wallet in share submission');
            return res.status(400).json({ error: 'Valid wallet address required' });
        }

        if (!hash || typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)) {
            logSecurityEvent(req, 'INVALID_HASH', `Invalid hash format: ${hash}`);
            return res.status(400).json({ error: 'Invalid hash format' });
        }

        if (!nonce || typeof nonce !== 'number' || nonce < 0 || nonce > 2147483647) {
            logSecurityEvent(req, 'INVALID_NONCE', `Invalid nonce: ${nonce}`);
            return res.status(400).json({ error: 'Invalid nonce value' });
        }

        if (!timestamp || typeof timestamp !== 'number' || Math.abs(Date.now() - timestamp) > 300000) {
            logSecurityEvent(req, 'INVALID_TIMESTAMP', `Invalid timestamp: ${timestamp}`);
            return res.status(400).json({ error: 'Invalid or stale timestamp' });
        }

        const miner = miners.get(walletAddress);
        if (!miner) {
            logSecurityEvent(req, 'UNREGISTERED_MINER', walletAddress);
            return res.status(400).json({ error: 'Miner not registered. Connect first.' });
        }

        // Anti-spam: Check submission rate
        const now = Date.now();
        if (miner.lastShareSubmission && (now - miner.lastShareSubmission) < 1000) {
            logSecurityEvent(req, 'SHARE_SPAM', `Too frequent submissions from ${walletAddress}`);
            return res.status(429).json({ error: 'Share submission rate limit exceeded' });
        }
        miner.lastShareSubmission = now;

        // Validate share (simplified - checks if hash starts with enough zeros)
        const isValidShare = hash && hash.startsWith('0000');
        
        if (isValidShare) {
            miner.shares++;
            miner.lastSeen = Date.now();
            miningStats.totalShares++;
            
            // Calculate HNH reward (1 HNH per valid share)
            const hnhReward = 1;
            const hnhRewardRaw = BigInt(hnhReward) * BigInt(10 ** 9); // Convert to smallest unit
            
            try {
                // Distribute HNH tokens
                await distributeHNHTokens(walletAddress, hnhRewardRaw);
                miner.totalEarnings += hnhReward;
                miningStats.totalHNHDistributed += hnhReward;
                
                console.log(`✅ Share accepted from ${walletAddress}, awarded ${hnhReward} HNH`);
                
                res.json({
                    success: true,
                    message: 'Share accepted',
                    hnhReward: hnhReward,
                    totalShares: miner.shares,
                    totalEarnings: miner.totalEarnings,
                    hash: hash
                });
            } catch (error) {
                console.error('Error distributing HNH tokens:', error);
                // Still accept the share but log the error
                res.json({
                    success: true,
                    message: 'Share accepted (reward pending)',
                    hnhReward: 0,
                    totalShares: miner.shares,
                    totalEarnings: miner.totalEarnings,
                    error: 'Reward distribution failed'
                });
            }
        } else {
            res.status(400).json({ 
                error: 'Invalid share - hash does not meet difficulty requirement',
                hash: hash
            });
        }
    } catch (error) {
        console.error('Share submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Pool statistics endpoint
app.get('/api/stats', (req, res) => {
    const now = Date.now();
    const activeMiners = Array.from(miners.values()).filter(
        miner => miner.isActive && (now - miner.lastSeen) < 300000 // 5 minutes
    );
    
    miningStats.totalMiners = activeMiners.length;
    miningStats.totalHashrate = activeMiners.reduce((sum, miner) => sum + (miner.hashrate || 0), 0);
    
    res.json({
        ...miningStats,
        activeMiners: activeMiners.length,
        allTimeMiners: miners.size,
        tokenAddress: deployment.mintAddress,
        network: 'devnet',
        uptime: process.uptime(),
        miners: activeMiners.map(m => ({
            wallet: m.walletAddress.slice(0, 8) + '...',
            hashrate: m.hashrate,
            shares: m.shares,
            earnings: m.totalEarnings
        }))
    });
});

// Individual miner stats
app.get('/api/miner/:walletAddress', (req, res) => {
    const { walletAddress } = req.params;

    if (!validateInput(walletAddress, 'string', 50)) {
        return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    const miner = miners.get(walletAddress);

    if (!miner) {
        return res.status(404).json({ error: 'Miner not found' });
    }

    res.json({
        ...miner,
        poolStats: {
            totalShares: miningStats.totalShares,
            totalMiners: miningStats.totalMiners,
            yourSharePercentage: miningStats.totalShares > 0 ?
                ((miner.shares / miningStats.totalShares) * 100).toFixed(2) : 0
        }
    });
});

// Security dashboard endpoint (admin only)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.randomBytes(32).toString('hex');
console.log(`🔐 Admin token: ${ADMIN_TOKEN}`);

function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== ADMIN_TOKEN) {
        logSecurityEvent(req, 'UNAUTHORIZED_ACCESS', 'Attempted admin access without token');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}

app.get('/api/admin/security', requireAuth, (req, res) => {
    res.json({
        securityLogs: {
            recentEvents: securityLogs.suspiciousActivity.slice(-50),
            totalEvents: securityLogs.suspiciousActivity.length,
            rejectedConnections: securityLogs.rejectedConnections,
            rateLimitHits: securityLogs.rateLimitHits
        },
        systemHealth: {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            activeConnections: miners.size,
            totalShares: miningStats.totalShares
        },
        networkStats: {
            totalMiners: miners.size,
            activeMiners: Array.from(miners.values()).filter(
                m => m.isActive && (Date.now() - m.lastSeen) < 300000
            ).length,
            totalHashrate: miningStats.totalHashrate
        }
    });
});

// Security mode endpoint
app.post('/api/admin/security-mode', requireAuth, (req, res) => {
    const { mode, targetWallet } = req.body;

    if (!['enable', 'disable'].includes(mode)) {
        return res.status(400).json({ error: 'Invalid mode. Use "enable" or "disable"' });
    }

    if (mode === 'enable') {
        console.log('🔒 Security mode enabled - Enhanced monitoring active');
        // Enable enhanced security monitoring
        securityLogs.securityModeEnabled = true;
        securityLogs.securityModeStarted = Date.now();
    } else {
        console.log('🔓 Security mode disabled');
        securityLogs.securityModeEnabled = false;
    }

    res.json({
        success: true,
        mode: mode,
        timestamp: new Date().toISOString()
    });
});

// HNH Token Distribution Function
async function distributeHNHTokens(minerWallet, amount) {
    try {
        const minerPublicKey = new PublicKey(minerWallet);
        
        // Get or create associated token account for miner
        const minerTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint,
            minerPublicKey
        );
        
        // Mint HNH tokens to miner
        const signature = await mintTo(
            connection,
            payer,
            mint,
            minerTokenAccount.address,
            payer.publicKey,
            amount
        );
        
        console.log(`💰 Distributed ${Number(amount) / (10**9)} HNH to ${minerWallet}`);
        console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
        
        return signature;
    } catch (error) {
        console.error('Failed to distribute HNH tokens:', error.message);
        throw error;
    }
}

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('\n🚀 HashNHedge Mining Pool Server Started!');
    console.log('===========================================');
    console.log(`🌐 Server: http://localhost:${PORT}`);
    console.log(`📊 Stats API: http://localhost:${PORT}/api/stats`);
    console.log(`🪙 HNH Token: ${deployment.mintAddress}`);
    console.log(`💳 Network: Solana Devnet`);
    console.log(`💰 Pool Fee: ${miningStats.poolFee}%`);
    console.log('===========================================\n');
    
    // Log stats every 30 seconds
    setInterval(() => {
        const activeCount = Array.from(miners.values()).filter(
            m => m.isActive && (Date.now() - m.lastSeen) < 300000
        ).length;
        
        if (activeCount > 0) {
            console.log(`📈 Active miners: ${activeCount}, Total shares: ${miningStats.totalShares}, HNH distributed: ${miningStats.totalHNHDistributed}`);
        }
    }, 30000);
});

// Cleanup function
process.on('SIGINT', () => {
    console.log('\n💾 Saving miner data...');
    const backup = {
        miners: Array.from(miners.entries()),
        stats: miningStats,
        timestamp: Date.now()
    };
    fs.writeFileSync('miners-backup.json', JSON.stringify(backup, null, 2));
    console.log('✅ Data saved to miners-backup.json');
    process.exit(0);
});

module.exports = app;