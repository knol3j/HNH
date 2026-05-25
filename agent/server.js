import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import http from 'http';
import StratumProxy from './stratum-proxy.js';
import { 
    getHardwareFingerprint, 
    generateHardwareCommitment,
    generateProof, 
    verifyProof,
    initializeHardwareId 
} from './hardware-zkp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// SECURITY: Strict CORS
const allowedOrigins = [
    'http://localhost:3000', 
    'http://localhost:5173', 
    'https://app.hashnhedge.com',
    'https://hashnhedge.com',
    'https://www.hashnhedge.com'
];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || origin === 'null' || origin.startsWith('file://')) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            console.error(`[CORS] Blocked origin: ${origin}`);
            return callback(new Error('CORS not allowed'), false);
        }
        return callback(null, true);
    }
}));
app.use(express.json());

// GUI: Serve Static Files
const GUI_PATH = path.join(__dirname, 'gui');
app.use(express.static(GUI_PATH));

// SECURITY: Auth Middleware
const AGENT_SECRET = process.env.AGENT_SECRET || "HNH_LOCAL_AGENT_SECRET";
const requireAuth = (req, res, next) => {
    // Skip auth for Telemetry and meta endpoints
    if (req.method === 'GET' && (req.path === '/telemetry' || req.path === '/meta')) return next();

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

// --- CONFIGURATION ---
const PORT = process.env.PORT || 4343;
const CLOUD_MODE = process.env.HNH_CLOUD_MODE === 'true';
const BIN_DIR = path.join(__dirname, 'bin');
const MINER_BIN = path.join(BIN_DIR, process.platform === 'win32' ? 'xmrig.exe' : 'xmrig');
const DATA_FILE = path.join(__dirname, 'data.json');

// Platform fee tiers
const PLATFORM_FEE = {
    free: 0.02,      // 2%
    pro: 0.01,       // 1%
    enterprise: 0.005 // 0.5%
};

// Default pool configuration (can be overridden per wallet/coin)
const DEFAULT_COIN_POOLS = {
    XMR: 'xmr.2miners.com:2222',
    RVN: 'rvn.2miners.com:6060',
    ETC: 'etc.herominers.com:10161',
    ERG: 'de.ergo.herominers.com:11800',
    KAS: 'pool.woolypooly.com:3112'
};

// --- STATE ---
let config = {
    wallet: '',
    wallets: { XMR: '', RVN: '', ETC: '', ERG: '', KAS: '' },
    pools: { ...DEFAULT_COIN_POOLS },
    mode: 'cpu',
    password: 'x'
};

let minerProcess = null;
let minerStatus = 'OFFLINE';
let recentLogs = [];
let totalShares = 0;
let feeShares = 0;
let userTier = 'free';
let currentCoin = 'XMR';
let isAutoProfitSwitch = false;

let telemetry = {
    hashrate: 0,
    temp: 0,
    power: 0,
    fan: 0
};

let proxy = null;

// --- PERSISTENCE ---
function loadConfig() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, '');
            const data = JSON.parse(raw);
            totalShares = data.totalShares || 0;
            feeShares = data.feeShares || 0;
            
            if (data.wallets) config.wallets = { ...config.wallets, ...data.wallets };
            if (data.pools) config.pools = { ...config.pools, ...data.pools };
            if (data.miningMode) config.mode = data.miningMode;
            if (data.password) config.password = data.password;
            
            // Set wallet for current coin
            if (config.mode === 'gpu') {
                currentCoin = 'RVN';
            } else {
                currentCoin = 'XMR';
            }
            config.wallet = config.wallets[currentCoin] || '';
        }
    } catch (e) {
        console.error('[CONFIG] Failed to load config:', e.message);
    }
}

function saveStats() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ 
            totalShares, 
            feeShares, 
            wallets: config.wallets,
            pools: config.pools,
            miningMode: config.mode,
            password: config.password
        }));
    } catch (e) {}
}

// --- LOGGING ---
function addLog(msg) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = `[${timestamp}] ${msg}`;
    console.log(`[AGENT] ${msg}`);
    recentLogs.unshift(entry);
    if (recentLogs.length > 50) recentLogs.pop();
}

// --- MINER MANAGEMENT (MinerGate-style: simple and reliable) ---
const STARTUP_TIMEOUT = 30000;

function buildXmrigConfig() {
    const poolUrl = config.pools[currentCoin] || DEFAULT_COIN_POOLS[currentCoin] || DEFAULT_COIN_POOLS.XMR;
    const poolHost = poolUrl.split(':')[0];
    const poolPort = parseInt(poolUrl.split(':')[1]) || 2222;
    
    return {
        autosave: true,
        cpu: {
            enabled: config.mode === 'cpu',
            hugePages: true
        },
        cuda: {
            enabled: config.mode === 'gpu' && fs.existsSync(path.join(BIN_DIR, 'xmrig-cuda.dll'))
        },
        opencl: {
            enabled: config.mode === 'gpu'
        },
        donateLevel: 1,
        pools: [{
            url: poolUrl,
            user: config.wallet || 'MINERGATE_STYLE_MINING',
            pass: config.password || 'x',
            keepalive: true
        }]
    };
}

function writeXmrigConfig() {
    const configPath = path.join(BIN_DIR, 'config.json');
    const xmrigConfig = buildXmrigConfig();
    fs.writeFileSync(configPath, JSON.stringify(xmrigConfig, null, 2));
}

function startMiner() {
    if (CLOUD_MODE) {
        minerStatus = 'CLOUD_API';
        return false;
    }
    // Kill existing miner
    if (minerProcess) {
        try {
            minerProcess.kill();
            minerProcess = null;
        } catch (e) {}
    }

    if (!fs.existsSync(MINER_BIN)) {
        addLog('Miner binary not found. Run setup script first.');
        minerStatus = 'ERROR';
        return false;
    }

    // Write config file for xmrig (MinerGate approach)
    writeXmrigConfig();

    addLog(`Starting ${config.mode === 'gpu' ? 'GPU' : 'CPU'} miner for ${currentCoin}...`);

    minerStatus = 'STARTING';
    
    try {
        const args = [
            '-c', path.join(BIN_DIR, 'config.json'),
            '--no-color',
            '--http-host', '127.0.0.1',
            '--http-port', '4444',
            '--http-access-token', AGENT_SECRET,
            '--http-no-restricted'
        ];

        minerProcess = spawn(MINER_BIN, args, {
            cwd: BIN_DIR,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let startupTimer = setTimeout(() => {
            if (minerStatus === 'STARTING') {
                addLog('Miner startup timeout - checking connection...');
            }
        }, STARTUP_TIMEOUT);

        minerProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (!line.trim()) return;
                addLog(line.trim());
                
                // Parse accepted shares
                if (line.toLowerCase().includes('accepted')) {
                    totalShares++;
                    const feeRate = PLATFORM_FEE[userTier] || PLATFORM_FEE.free;
                    feeShares += feeRate;
                    saveStats();
                }
            });
        });

        minerProcess.stderr.on('data', (data) => {
            addLog(`ERR: ${data.toString().trim()}`);
        });

        minerProcess.on('error', (err) => {
            clearTimeout(startupTimer);
            addLog(`Miner error: ${err.message}`);
            minerStatus = 'ERROR';
        });

        minerProcess.on('close', (code) => {
            clearTimeout(startupTimer);
            addLog(`Miner exited with code ${code}`);
            minerStatus = 'OFFLINE';
            telemetry.hashrate = 0;
            minerProcess = null;
            
            // Auto-restart on unexpected exit (MinerGate behavior)
            if (code !== 0 && code !== null) {
                setTimeout(() => {
                    if (minerStatus === 'OFFLINE') {
                        addLog('Attempting miner restart...');
                        startMiner();
                    }
                }, 5000);
            }
        });

        minerStatus = 'MINING';
        return true;
    } catch (e) {
        addLog(`Failed to start miner: ${e.message}`);
        minerStatus = 'ERROR';
        return false;
    }
}

function stopMiner() {
    if (minerProcess) {
        try {
            minerProcess.kill('SIGTERM');
            setTimeout(() => {
                if (minerProcess) {
                    minerProcess.kill('SIGKILL');
                }
            }, 3000);
        } catch (e) {}
        minerProcess = null;
    }
    minerStatus = 'OFFLINE';
}

// --- TELEMETRY POLLING ---
function fetchTelemetry() {
    if (minerStatus !== 'MINING') return;

    const req = http.request({
        hostname: '127.0.0.1',
        port: 4444,
        path: '/2/summary',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${AGENT_SECRET}` }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const stats = JSON.parse(data);
                telemetry.hashrate = stats.hashrate?.total?.[0] || 0;
                
                const health = stats.health || [];
                if (health.length > 0) {
                    telemetry.temp = health.reduce((a, h) => a + (h.temp || 0), 0) / health.length;
                    telemetry.power = health.reduce((a, h) => a + (h.power || 0), 0);
                    telemetry.fan = health.reduce((a, h) => a + (h.fan || 0), 0) / health.length;
                }
            } catch (e) {}
        });
    });

    req.on('error', () => {});
    req.setTimeout(2000, () => req.destroy());
    req.end();
}

setInterval(fetchTelemetry, 2000);

// --- STRATUM PROXY ---
function startProxy() {
    if (!proxy) {
        proxy = new StratumProxy({
            proxyPort: 3333,
            upstreamHost: DEFAULT_COIN_POOLS.XMR.split(':')[0],
            upstreamPort: parseInt(DEFAULT_COIN_POOLS.XMR.split(':')[1])
        });
        proxy.start();
    }
}

// Load config and start
loadConfig();

// Start miner if binary exists (disabled in cloud mode)
if (CLOUD_MODE) {
    addLog('Cloud mode: mining disabled. Running API/coordination services only.');
    minerStatus = 'CLOUD_API';
} else if (fs.existsSync(MINER_BIN)) {
    startMiner();
} else {
    addLog('Miner binary not found. Run setup_miner.sh or setup_miner_windows.ps1 first.');
}

// Start stratum proxy (optional: for remote miners)
startProxy();

// --- API ENDPOINTS ---
app.get('/telemetry', (req, res) => {
    const feeRate = PLATFORM_FEE[userTier] || PLATFORM_FEE.free;
    const hwId = initializeHardwareId();
    
    res.json({
        mode: CLOUD_MODE ? 'cloud_api' : 'mining',
        status: minerStatus,
        gpu_temp: CLOUD_MODE ? null : telemetry.temp,
        gpu_util: CLOUD_MODE ? 0 : (minerStatus === 'MINING' ? 100 : 0),
        fan_speed: CLOUD_MODE ? null : telemetry.fan,
        power_draw: CLOUD_MODE ? null : telemetry.power,
        hashrate: CLOUD_MODE ? 0 : telemetry.hashrate,
        verified_shares: CLOUD_MODE ? 0 : totalShares,
        gross_shares: CLOUD_MODE ? 0 : totalShares,
        fee_deducted: CLOUD_MODE ? 0 : feeShares,
        fee_rate: feeRate * 100,
        user_tier: userTier,
        active_job: CLOUD_MODE ? {
            id: 'cloud-agent',
            title: 'API Coordination Service',
            status: 'RUNNING',
            progress: 0
        } : (minerStatus === 'MINING' ? {
            id: 'mining-job',
            title: `Mining ${currentCoin}`,
            status: 'RUNNING',
            progress: 0
        } : null),
        wallet: config.wallet,
        hardware_id: hwId.commitment,
        logs: recentLogs
    });
});

app.post('/config', (req, res) => {
    const { wallet, mode, password, tier } = req.body;
    let changed = false;

    if (wallet && wallet !== config.wallet) {
        config.wallet = wallet;
        if (currentCoin) config.wallets[currentCoin] = wallet;
        changed = true;
    }
    
    if (mode && mode !== config.mode) {
        config.mode = mode;
        if (mode === 'gpu') {
            currentCoin = 'RVN';
        } else {
            currentCoin = 'XMR';
        }
        config.wallet = config.wallets[currentCoin] || '';
        changed = true;
    }
    
    if (password) config.password = password;
    
    if (tier && ['free', 'pro', 'enterprise'].includes(tier)) {
        userTier = tier;
        addLog(`Tier updated to: ${tier}`);
    }

    if (changed) {
        saveStats();
        if (!CLOUD_MODE) startMiner();
    }
    
    res.json({ success: true });
});

app.post('/wallet/bulk', (req, res) => {
    const { wallets, pools, workerName, activeCoin } = req.body || {};

    if (!wallets || typeof wallets !== 'object') {
        return res.status(400).json({ error: 'wallets object is required' });
    }

    const updatedWallets = {};
    const updatedPools = {};

    for (const [rawCoin, rawValue] of Object.entries(wallets)) {
        const coin = String(rawCoin || '').toUpperCase();
        if (!DEFAULT_COIN_POOLS[coin]) continue;

        // Server-side safeguard: block explicitly non-production XMR wallets
        // even if a client attempts to push them.
        if (coin === 'XMR' && rawValue && typeof rawValue === 'object') {
            const source = String(rawValue.source || '').toLowerCase();
            const isProductionUsable = rawValue.isProductionUsable;
            if (source === 'derived' || isProductionUsable === false) {
                return res.status(400).json({
                    error: 'Derived XMR wallets are not allowed for production mining. Import a manual XMR wallet first.',
                    coin: 'XMR',
                    code: 'XMR_MANUAL_IMPORT_REQUIRED'
                });
            }
        }

        // Supports both shapes:
        // { XMR: 'address' } or { XMR: { address, pool, worker, source, isProductionUsable } }
        if (typeof rawValue === 'string') {
            const address = rawValue.trim();
            if (address) {
                config.wallets[coin] = address;
                updatedWallets[coin] = address;
            }
        } else if (rawValue && typeof rawValue === 'object') {
            const address = String(rawValue.address || '').trim();
            const pool = String(rawValue.pool || '').trim();

            if (address) {
                config.wallets[coin] = address;
                updatedWallets[coin] = address;
            }
            if (pool) {
                config.pools[coin] = pool;
                updatedPools[coin] = pool;
            }
        }
    }

    if (pools && typeof pools === 'object') {
        for (const [rawCoin, rawPool] of Object.entries(pools)) {
            const coin = String(rawCoin || '').toUpperCase();
            if (!DEFAULT_COIN_POOLS[coin]) continue;
            const pool = String(rawPool || '').trim();
            if (pool) {
                config.pools[coin] = pool;
                updatedPools[coin] = pool;
            }
        }
    }

    let nextCoin = String(activeCoin || '').toUpperCase();
    if (!DEFAULT_COIN_POOLS[nextCoin] || !config.wallets[nextCoin]) {
        nextCoin = Object.keys(config.wallets).find(c => config.wallets[c]) || currentCoin;
    }

    currentCoin = nextCoin;
    config.wallet = config.wallets[currentCoin] || '';

    if (workerName && typeof workerName === 'string') {
        config.password = workerName.trim() || config.password;
    }

    saveStats();
    addLog(`Bulk wallet sync: ${Object.keys(updatedWallets).length} wallets, ${Object.keys(updatedPools).length} pools`);

    if (!CLOUD_MODE && config.wallet) {
        startMiner();
    }

    res.json({
        success: true,
        currentCoin,
        wallet: config.wallet,
        updatedWallets,
        updatedPools
    });
});

app.post('/switch-coin', (req, res) => {
    const coin = String(req.body?.coin || '').toUpperCase();
    
    if (!DEFAULT_COIN_POOLS[coin]) {
        return res.status(400).json({ error: 'Unknown coin' });
    }
    
    currentCoin = coin;
    if (config.wallets[coin]) {
        config.wallet = config.wallets[coin];
    }
    
    addLog(`Switching to ${coin}`);
    if (!CLOUD_MODE) startMiner();
    
    res.json({ success: true, coin });
});

app.get('/meta', (req, res) => {
    res.json({
        coins: Object.keys(DEFAULT_COIN_POOLS),
        pools: config.pools,
        wallet: config.wallet,
        currentCoin: currentCoin,
        config: config
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', miner: minerStatus });
});

// Hardware ID endpoints
app.get('/hardware', (req, res) => {
    const hwId = initializeHardwareId();
    res.json({
        fingerprint: hwId.fingerprint,
        commitment: hwId.commitment,
        timestamp: hwId.timestamp,
        components: hwId.components
    });
});

app.get('/hardware/proof', (req, res) => {
    const hwId = initializeHardwareId();
    const proof = generateProof({ commitment: hwId.commitment, timestamp: hwId.timestamp });
    res.json(proof);
});

app.post('/hardware/verify', (req, res) => {
    const { proof, expectedFingerprint, secretKey } = req.body;
    const isValid = verifyProof(proof, expectedFingerprint, secretKey);
    res.json({ valid: isValid });
});

app.listen(PORT, () => {
    console.log(`HNH Agent running on http://localhost:${PORT} [${CLOUD_MODE ? 'API/Cloud' : 'Mining'} mode]`);
});