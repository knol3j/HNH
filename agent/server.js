/**
 * HashNHedge Mining Agent Server
 * Manages multiple cryptocurrency miners with coin-specific binaries
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MinerManager } from './miners/MinerManager.js';
import { COIN_CONFIG } from './miners/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = 4343;
const DATA_FILE = path.join(__dirname, 'data.json');
const BIN_DIR = path.join(__dirname, 'bin');

// CORS whitelist
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://app.hashnhedge.com',
    'https://hashnhedge.com'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS not allowed'), false);
        }
        return callback(null, true);
    }
}));

app.use(express.json());

// Serve GUI static files
const GUI_PATH = path.join(__dirname, 'gui');
app.use(express.static(GUI_PATH));

// ============================================================================
// AUTHENTICATION
// ============================================================================

const AGENT_SECRET = process.env.AGENT_SECRET || "HNH_LOCAL_AGENT_SECRET";

const requireAuth = (req, res, next) => {
    // Allow public read-only endpoints
    if (req.method === 'GET' && ['/telemetry', '/meta', '/coins', '/status'].includes(req.path)) {
        return next();
    }

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token === AGENT_SECRET || req.headers['x-agent-secret'] === AGENT_SECRET) {
        next();
    } else {
        console.warn(`[SECURITY] Unauthorized access attempt from ${req.ip}`);
        res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }
};

app.use(requireAuth);

// ============================================================================
// STATE & PERSISTENCE
// ============================================================================

let persistedData = {
    wallets: {},
    poolUrls: {},
    miningMode: 'cpu',
    totalShares: 0,
    feeShares: 0,
    userTier: 'free',
    lastCoin: 'XMR'
};

// Load persisted data
try {
    if (fs.existsSync(DATA_FILE)) {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, '');
        const data = JSON.parse(rawData);
        persistedData = { ...persistedData, ...data };
    }
} catch (e) {
    console.error('[AGENT] Failed to load persisted data:', e);
}

const saveData = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(persistedData, null, 2));
    } catch (e) {
        console.error('[AGENT] Failed to save data:', e);
    }
};

// ============================================================================
// MINER MANAGER INITIALIZATION
// ============================================================================

const minerManager = new MinerManager({
    binDir: BIN_DIR,
    wallets: persistedData.wallets,
    poolUrls: persistedData.poolUrls,
    userTier: persistedData.userTier,
    workerId: 'HNH_Worker'
});

console.log('\n=============== HashNHedge Agent ===============');
console.log(`Supported coins: ${Object.keys(COIN_CONFIG).join(', ')}`);
console.log('================================================\n');

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET /telemetry - Get current mining telemetry
 */
app.get('/telemetry', (req, res) => {
    const telemetry = minerManager.getTelemetry();

    res.json({
        ...telemetry,
        active_job: telemetry.status === 'MINING' ? {
            id: `${telemetry.coin}-mining`,
            title: `Mining ${telemetry.coin} (${telemetry.algorithm})`,
            status: 'RUNNING',
            miner: telemetry.minerName
        } : null
    });
});

/**
 * GET /stats - Alias for /status (Used by Frontend)
 */
app.get('/stats', (req, res) => {
    const telemetry = minerManager.getTelemetry();
    // Frontend expects NetworkStats structure roughly, or just simple stats
    // App.tsx expects: activeNodes, totalTflops, jobsRunning, etc.
    // BUT the agent is for a SINGLE node. 
    // App.tsx fetchStats() calls agentUrl/stats and expects NetworkStats? 
    // Wait, App.tsx line 43: const res = await fetch(`${agentUrl}/stats`);
    // Then setStats(data).
    // NetworkStats interface: activeNodes, totalTflops, jobsRunning...
    // The Agent returns its own local stats.
    // The previous implementation of App.tsx seems to treat the agent URL as a source for network-wide stats? 
    // Or maybe the agent provides its *contribution*?
    // Let's look at App.tsx again. It calls setStats(data).
    // If the Agent only returns local stats, App.tsx might display wrong info or 1 active node.
    // Let's implement /stats to return what App.tsx likely wants for a single node view or mapped.

    // Actually, looking at App.tsx, it seems it treats the 'agent' as the source for the Dashboard stats.
    // If connected to a local agent, it shows one node active.

    res.json({
        activeNodes: telemetry.status === 'MINING' ? 1 : 1, // Online
        totalTflops: telemetry.hashrate / 1000000, // Rough proxy
        jobsRunning: telemetry.status === 'MINING' ? 1 : 0,
        networkUtilization: telemetry.status === 'MINING' ? 100 : 0,
        avgPricePerFLOP: 0.0004
    });
});

/**
 * GET /status - Get agent status
 */
app.get('/status', (req, res) => {
    const telemetry = minerManager.getTelemetry();
    res.json({
        status: telemetry.status,
        coin: telemetry.coin,
        hashrate: telemetry.hashrate,
        uptime: process.uptime()
    });
});

/**
 * GET /coins - Get available coins and their configuration
 */
app.get('/coins', (req, res) => {
    const coins = minerManager.getAvailableCoins();
    const installed = minerManager.getInstalledMiners();

    res.json({
        coins: coins,
        installed: installed,
        activeCoin: minerManager.activeCoin
    });
});

/**
 * GET /meta - Get agent metadata for GUI
 */
app.get('/meta', (req, res) => {
    const coins = minerManager.getAvailableCoins();

    res.json({
        coins: Object.keys(COIN_CONFIG),
        coinConfig: COIN_CONFIG,
        wallets: persistedData.wallets,
        poolUrls: persistedData.poolUrls,
        currentCoin: minerManager.activeCoin,
        userTier: persistedData.userTier
    });
});

/**
 * POST /start - Start mining a specific coin
 */
app.post('/start', (req, res) => {
    const { coin, wallet, poolUrl, password } = req.body;

    if (!coin) {
        return res.status(400).json({ error: 'Coin is required' });
    }

    const upperCoin = coin.toUpperCase();
    if (!COIN_CONFIG[upperCoin]) {
        return res.status(400).json({ error: `Unknown coin: ${coin}` });
    }

    // Update config if provided
    let changed = false;
    if (wallet) {
        persistedData.wallets[upperCoin] = wallet;
        changed = true;
    }
    if (poolUrl) {
        persistedData.poolUrls[upperCoin] = poolUrl;
        changed = true;
    }

    if (changed) {
        saveData();
    }

    const result = minerManager.startMining(upperCoin, {
        wallet: wallet || persistedData.wallets[upperCoin],
        poolUrl: poolUrl || persistedData.poolUrls[upperCoin],
        password: password
    });

    if (result.success) {
        persistedData.lastCoin = upperCoin;
        saveData();
    }

    res.json(result);
});

/**
 * POST /stop - Stop mining
 */
app.post('/stop', (req, res) => {
    minerManager.stopMining();
    res.json({ success: true, status: 'STOPPED' });
});

/**
 * POST /switch-coin - Switch to a different coin
 */
app.post('/switch-coin', (req, res) => {
    const { coin, wallet, poolUrl } = req.body;

    if (!coin) {
        return res.status(400).json({ error: 'Coin is required' });
    }

    const upperCoin = coin.toUpperCase();
    if (!COIN_CONFIG[upperCoin]) {
        return res.status(400).json({ error: `Unknown coin: ${coin}` });
    }

    let changed = false;
    if (wallet) {
        persistedData.wallets[upperCoin] = wallet;
        changed = true;
    }
    if (poolUrl) {
        persistedData.poolUrls[upperCoin] = poolUrl;
        changed = true;
    }

    if (changed) {
        saveData();
    }

    const result = minerManager.switchCoin(upperCoin, {
        wallet: wallet || persistedData.wallets[upperCoin],
        poolUrl: poolUrl || persistedData.poolUrls[upperCoin]
    });

    if (result.success) {
        persistedData.lastCoin = upperCoin;
        saveData();
    }

    res.json(result);
});

/**
 * POST /config - Update configuration
 */
app.post('/config', (req, res) => {
    const { coin, wallet, poolUrl, tier } = req.body;

    let changed = false;

    if (coin && wallet) {
        const upperCoin = coin.toUpperCase();
        persistedData.wallets[upperCoin] = wallet;
        minerManager.setWallet(upperCoin, wallet);
        changed = true;
    }

    if (tier && ['free', 'pro', 'enterprise'].includes(tier)) {
        persistedData.userTier = tier;
        minerManager.setUserTier(tier);
        changed = true;
    }

    if (changed) {
        saveData();
    }

    // Restart miner if config changed for active coin
    if (changed && minerManager.activeCoin && coin?.toUpperCase() === minerManager.activeCoin) {
        minerManager.startMining(minerManager.activeCoin, {
            wallet: persistedData.wallets[minerManager.activeCoin],
            poolUrl: poolUrl
        });
    }

    res.json({ success: true });
});

/**
 * POST /wallet - Set wallet for a specific coin
 */
app.post('/wallet', (req, res) => {
    const { coin, address } = req.body;

    if (!coin || !address) {
        return res.status(400).json({ error: 'Coin and address are required' });
    }

    const upperCoin = coin.toUpperCase();
    if (!COIN_CONFIG[upperCoin]) {
        return res.status(400).json({ error: `Unknown coin: ${coin}` });
    }

    persistedData.wallets[upperCoin] = address;
    minerManager.setWallet(upperCoin, address);
    saveData();

    res.json({ success: true, coin: upperCoin, wallet: address });
});

/**
 * GET /wallets - Get all configured wallets
 */
app.get('/wallets', (req, res) => {
    res.json(persistedData.wallets);
});

// ============================================================================
// AUTO-START (if miner binary exists for last used coin)
// ============================================================================

const autoStart = () => {
    const lastCoin = persistedData.lastCoin || 'XMR';
    const miner = minerManager.getMiner(lastCoin);

    if (miner.isBinaryInstalled() && persistedData.wallets[lastCoin]) {
        console.log(`[AGENT] Auto-starting ${lastCoin} miner...`);
        minerManager.startMining(lastCoin, {
            wallet: persistedData.wallets[lastCoin]
        });
    } else {
        console.log(`[AGENT] No auto-start: ${lastCoin} miner not installed or no wallet configured`);
        console.log(`[AGENT] Run setup script to install miners`);
    }
};

// ============================================================================
// BACKEND SYNC (Push stats to platform)
// ============================================================================

const API_URL = process.env.API_URL || "https://hashnhedge.com"; // Default to production
const PLATFORM_WALLET = process.env.PLATFORM_WALLET || "";

let syncInterval = null;

const syncToBackend = async () => {
    const telemetry = minerManager.getTelemetry();

    // Only sync if mining or if we have historical sessions to push (future feature)
    if (telemetry.status !== 'MINING') return;

    const payload = {
        agentId: persistedData.wallets[minerManager.activeCoin] || 'unknown-agent', // Use wallet as ID for now
        currentSession: {
            startTime: new Date().toISOString(), // Mock for now, should track session start
            coin: telemetry.coin,
            poolUrl: telemetry.poolUrl || '',
            totalShares: telemetry.totalShares,
            acceptedShares: telemetry.acceptedShares,
            avgHashrate: telemetry.hashrate
        },
        telemetry: {
            hashrate: telemetry.hashrate,
            temp: telemetry.temp,
            power: telemetry.power
        }
    };

    try {
        const response = await fetch(`${API_URL}/api/agent/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.AGENT_TOKEN || ''}` // Needs a user token? Backend requires authenticateToken
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            // console.log('[AGENT] Synced with backend');
        } else {
            console.warn('[AGENT] Sync failed:', response.status);
        }
    } catch (e) {
        // Silent fail on connection error
    }
};

const startSync = () => {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(syncToBackend, 10000); // 10 seconds
    console.log(`[AGENT] Backend sync enabled -> ${API_URL}`);
};


// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
    console.log(`\n[AGENT] HashNHedge Mining Agent running on http://localhost:${PORT}`);
    console.log(`[AGENT] GUI available at http://localhost:${PORT}/\n`);

    // Delay auto-start to allow server to initialize
    setTimeout(() => {
        autoStart();
        startSync();
    }, 1000);
});

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('\n[AGENT] Shutting down...');
    minerManager.stopMining();
    process.exit(0);
});

process.on('SIGTERM', () => {
    minerManager.stopMining();
    process.exit(0);
});
