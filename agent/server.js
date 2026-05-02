
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// SECURITY: Strict CORS
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://app.hashnhedge.com',
    'https://hashnhedge.com',
    'https://app-production-374e.up.railway.app',
    'https://app-production-564e.up.railway.app'
];
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS not allowed'), false);
        }
        return callback(null, true);
    }
}));
app.use(express.json());

// GUI: Serve Static Files (Public)
const GUI_PATH = path.join(__dirname, 'gui');
app.use(express.static(GUI_PATH));

// SECURITY: Auth Middleware
const AGENT_SECRET = process.env.AGENT_SECRET || "HNH_LOCAL_AGENT_SECRET";
const requireAuth = (req, res, next) => {
    // Skip auth for Telemetry (read-only) to allow dashboard polling without complex handshake
    // Also skip /meta for GUI initialization
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

// Apply Auth to all routes (GET /telemetry is excepted inside)
app.use(requireAuth);

const PORT = 4343;
const MINER_BIN = path.join(__dirname, 'bin', process.platform === 'win32' ? 'xmrig.exe' : 'xmrig');
const DATA_FILE = path.join(__dirname, 'data.json');

// --- PLATFORM FEE CONFIG ---
const PLATFORM_FEE_TIERS = {
    free: 0.02,      // 2%
    pro: 0.01,       // 1%
    enterprise: 0.005 // 0.5%
};
const PLATFORM_WALLET = 'Rqr113e2e3...'; // Platform owner wallet (RVN example)

// --- CONSTANTS ---
const COIN_POOLS = {
    XMR: 'stratum+tcp://xmr.2miners.com:2222',
    RVN: 'stratum+tcp://rvn.2miners.com:6060', // GPU
    ETC: 'stratum+tcp://etc.herominers.com:10161', // GPU
    ERG: 'stratum+tcp://de.ergo.herominers.com:11800', // GPU
    KAS: 'stratum+tcp://pool.woolypooly.com:3112' // GPU
};

// --- STATE ---
// --- STATE ---
let currentCoin = 'XMR'; // Defined early for usage in persistence loading

let config = {
    wallet: 'Rqr113e2e3... (User Wallet)', // Default fallback
    wallets: {
        XMR: 'Rqr113e2e3... (User Wallet)',
        ETC: '0x19511e52720739f6F47E74221cBCd746BE387535',
        ERG: '9ev9ugszdQbQQUZ8gz76TuG4hNLUew8p6JmhrCeYeWNKbKAtKbV',
        KAS: 'kaspa:qzy048jd0mx7evm4svj0yaf9mufrsxrmus3l3zax92ltnfkh4h08qptc0wdek'
    },
    poolUrl: 'stratum+tcp://rvn.2miners.com:6060',
    algorithm: 'kawpow',
    mode: 'cpu', // cpu or gpu
    password: '' // Pool password (rarely used)
};

let minerProcess = null;
let minerStatus = 'OFFLINE';
let recentLogs = [];
let totalShares = 0;
let feeShares = 0;
let userTier = 'free';
let telemetry = {
    hashrate: 0,
    temp: 0,
    power: 0,
    fan: 0
};

// --- PERSISTENCE ---
try {
    if (fs.existsSync(DATA_FILE)) {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, '');
        const data = JSON.parse(rawData);
        totalShares = data.totalShares || 0;
        feeShares = data.feeShares || 0;

        // Load Config from setup script
        if (data.wallets) config.wallets = { ...config.wallets, ...data.wallets };
        if (data.miningMode) config.mode = data.miningMode;
        if (data.password !== undefined) config.password = data.password;
        if (data.poolUrl) config.poolUrl = data.poolUrl;
        if (data.algorithm) config.algorithm = data.algorithm;

        // SMART DEFAULTS: switch coin based on mode
        if (config.mode === 'gpu') {
            currentCoin = 'RVN';
            config.poolUrl = COIN_POOLS.RVN;
            config.algorithm = 'kawpow';
        } else {
            currentCoin = 'XMR';
            config.poolUrl = COIN_POOLS.XMR;
            config.algorithm = 'rx/0';
        }

        // Set initial wallet if available
        if (config.wallets[currentCoin]) {
            config.wallet = config.wallets[currentCoin];
        } else {
            // Fallback to first available wallet or generic placeholder
            config.wallet = Object.values(config.wallets).find(w => w) || 'UNKNOWN_WALLET';
        }
    }
} catch (e) { console.error(e); }

const saveStats = () => {
    try { 
        fs.writeFileSync(DATA_FILE, JSON.stringify({ 
            totalShares, 
            feeShares,
            wallets: config.wallets,
            miningMode: config.mode,
            password: config.password,
            poolUrl: config.poolUrl,
            algorithm: config.algorithm
        })); 
    } catch (e) { }
};

// --- LOGGING ---
const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[AGENT] ${msg}`);
    recentLogs.unshift(`[${timestamp}] ${msg}`);
    if (recentLogs.length > 50) recentLogs.pop();
};

// --- MINER MANAGER ---
const startMiner = () => {
    if (minerProcess) {
        killMiner();
    }

    // Clean URL
    const cleanUrl = config.poolUrl.replace('stratum+tcp://', '');

    addLog(`🚀 Launching XMRig...`);
    addLog(`   Pool: ${cleanUrl}`);
    const displayWallet = (config.wallet || 'UNKNOWN_WALLET').toString();
    addLog(`   User: ${displayWallet.substring(0, 8)}...`);

    // XMRig Args
    // XMRig Args
    const args = [
        '-o', cleanUrl,
        '-u', config.wallet,
        '-p', config.password,
        '--no-color',
        '--api-worker-id', 'AntigravityAgent',
        '--http-host', '127.0.0.1', // SECURITY: Bind to localhost only
        '--http-port', '4444', // Enable HTTP API for telemetry
        '--http-access-token', 'antigravity_secret',
        '--http-no-restricted',
        '--donate-level', '1'
    ];

    // SECURITY: Input Validation
    if (config.poolUrl && !config.poolUrl.match(/^(stratum\+tcp|ssl):\/\/[a-zA-Z0-9.:-]+$/)) {
        addLog(`❌ Security: Invalid Pool URL detected: ${config.poolUrl}`);
        return;
    }
    if (config.wallet && !config.wallet.match(/^[a-zA-Z0-9]+$/)) {
        // Basic alphanumeric check - might need adjustment for specific coin formats
        // but prevents obvious shell injection chars like ; | &
        // addLog(`⚠️ Warning: Wallet contains special characters`); 
    }

    // Add Algorithm if specified (Critical for GPU switching)
    if (config.algorithm) {
        if ((config.algorithm === 'kawpow' || config.algorithm === 'etchash') && config.mode === 'gpu') {
            args.push('--cuda'); // Try to enable CUDA if available (user must have plugin)
            args.push('--opencl'); // Try OpenCL
        }
        args.push('-a', config.algorithm);
    }

    // Algorithm override if needed (XMRig auto-detects mostly)
    // if (config.algorithm) args.push('-a', config.algorithm);

    minerStatus = 'STARTING';

    try {
        minerProcess = spawn(MINER_BIN, args);

        minerProcess.stdout.on('data', (data) => {
            const line = data.toString().trim();
            handleMinerOutput(line);
        });

        minerProcess.stderr.on('data', (data) => {
            console.error(`[XMRIG ERR] ${data}`);
            addLog(`ERR: ${data.toString().trim()}`);
        });

        minerProcess.on('close', (code) => {
            addLog(`⚠️ Miner exitted with code ${code}`);
            minerStatus = 'OFFLINE';
            telemetry.hashrate = 0;
            minerProcess = null;
        });

        minerStatus = 'MINING';
    } catch (e) {
        addLog(`❌ Failed to spawn miner: ${e.message}`);
        minerStatus = 'ERROR';
    }
};

const killMiner = () => {
    if (minerProcess) {
        minerProcess.kill();
        minerProcess = null;
    }
};

// --- TELEMETRY POLLING ---
import http from 'http';

const fetchXmrigStats = () => {
    if (minerStatus !== 'MINING') return;

    const options = {
        hostname: '127.0.0.1',
        port: 4444,
        path: '/2/summary',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer antigravity_secret'
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const stats = JSON.parse(data);

                // Hashrate (Highest of all threads)
                telemetry.hashrate = stats.hashrate?.total?.[0] || 0;

                // Hardware Stats (GPU/CPU)
                // XMRig puts sensors in different places depending on backend
                const health = stats.health || [];
                if (health.length > 0) {
                    // Average temp/power if multiple devices
                    const avgTemp = health.reduce((acc, h) => acc + (h.temp || 0), 0) / health.length;
                    const totalPower = health.reduce((acc, h) => acc + (h.power || 0), 0);
                    const avgFan = health.reduce((acc, h) => acc + (h.fan || 0), 0) / health.length;

                    telemetry.temp = avgTemp;
                    telemetry.power = totalPower;
                    telemetry.fan = avgFan;
                }
            } catch (e) { }
        });
    });

    req.on('error', (e) => { /* Silent fail if miner busy/restarting */ });
    req.end();
};

// Poll XMRig every 2 seconds
setInterval(fetchXmrigStats, 2000);

const handleMinerOutput = (rawLine) => {
    const lines = rawLine.split('\n');
    lines.forEach(line => {
        if (!line.trim()) return;

        // Passthrough Log (Verbose - All output)
        addLog(line);

        // PARSE: Accepted Share
        if (line.includes('accepted')) {
            totalShares++;
            const feeRate = PLATFORM_FEE_TIERS[userTier] || PLATFORM_FEE_TIERS.free;
            feeShares += feeRate;
            saveStats();
        }
    });
};

// Start on Load
if (fs.existsSync(MINER_BIN)) {
    startMiner();
} else {
    addLog("❌ Miner binary not found. Run 'setup_miner.sh' first.");
}

// --- API ---
app.get('/telemetry', (req, res) => {
    const feeRate = PLATFORM_FEE_TIERS[userTier] || PLATFORM_FEE_TIERS.free;
    const grossShares = totalShares;
    const feeDeducted = feeShares;
    const netShares = grossShares - feeDeducted;

    res.json({
        gpu_temp: telemetry.temp,
        gpu_util: minerStatus === 'MINING' ? 100 : 0,
        fan_speed: telemetry.fan,
        power_draw: telemetry.power,
        vram_used: 0, // Need external tool for this usually
        hashrate: telemetry.hashrate / 1000000,
        verified_shares: netShares, // Net after fee
        gross_shares: grossShares,
        fee_deducted: feeDeducted,
        fee_rate: feeRate * 100, // As percentage
        user_tier: userTier,
        active_job: minerStatus === 'MINING' ? {
            id: 'xmrig-job',
            title: `Mining ${config.algorithm || 'RandomX'}`,
            status: 'RUNNING',
            progress: 0
        } : null,
        wallet: config.wallet,
        platform_wallet: PLATFORM_WALLET,
        status: minerStatus,
        logs: recentLogs
    });
});

app.post('/config', (req, res) => {
    const { wallet, poolUrl, password, tier, coin, mode, algorithm } = req.body;
    let changed = false;

    // Handle coin switch (updates poolUrl and wallet from defaults)
    if (coin && COIN_POOLS[coin]) {
        currentCoin = coin;
        config.poolUrl = poolUrl || COIN_POOLS[coin];
        config.algorithm = algorithm || (coin === 'XMR' || coin === 'ZEPH' ? 'rx/0' :
                                          coin === 'RVN' ? 'kawpow' :
                                          coin === 'ETC' ? 'etchash' :
                                          coin === 'KAS' ? 'heavyhash' : algorithm);
        if (wallet) {
            config.wallet = wallet;
            config.wallets[coin] = wallet;
        } else if (config.wallets[coin]) {
            config.wallet = config.wallets[coin];
        }
        changed = true;
    } else {
        // Individual field updates
        if (wallet && wallet !== config.wallet) {
            config.wallet = wallet;
            if (currentCoin) config.wallets[currentCoin] = wallet;
            changed = true;
        }
        if (poolUrl && poolUrl !== config.poolUrl) {
            config.poolUrl = poolUrl;
            changed = true;
        }
        if (algorithm && algorithm !== config.algorithm) {
            config.algorithm = algorithm;
            changed = true;
        }
        if (mode && mode !== config.mode) {
            config.mode = mode;
            changed = true;
        }
    }

    if (password !== undefined && password !== config.password) {
        config.password = password;
        changed = true;
    }

    if (tier && ['free', 'pro', 'enterprise'].includes(tier)) {
        userTier = tier;
        addLog(`Tier updated to: ${tier} (${PLATFORM_FEE_TIERS[tier] * 100}% fee)`);
    }

    if (changed) {
        addLog('🔄 Restarting miner with new config...');
        startMiner();
    }
    res.json({ success: true, config, currentCoin });
});

// --- AUTO-SWITCH ---
let autoSwitchEnabled = false;
let autoSwitchInterval = null;
// currentCoin moved to top state

// Simplified coin->pool mapping
// COIN_POOLS defined at top

app.post('/auto-switch', (req, res) => {
    const { enabled } = req.body;

    if (enabled && !autoSwitchEnabled) {
        autoSwitchEnabled = true;
        addLog('🔄 Auto-Profit Switching ENABLED');

        // Check profitability every 5 minutes
        autoSwitchInterval = setInterval(async () => {
            try {
                // Fetch profitability from frontend service (simplified for agent)
                // In production, this would call an API or use embedded logic
                addLog('📊 Checking profitability...');
                // For now, just log - actual switching handled by frontend
            } catch (e) {
                addLog(`Auto-switch error: ${e.message}`);
            }
        }, 5 * 60 * 1000);

    } else if (!enabled && autoSwitchEnabled) {
        autoSwitchEnabled = false;
        if (autoSwitchInterval) {
            clearInterval(autoSwitchInterval);
            autoSwitchInterval = null;
        }
        addLog('⏸️ Auto-Profit Switching DISABLED');
    }

    res.json({ success: true, autoSwitchEnabled });
});

app.post('/switch-coin', (req, res) => {
    const { coin } = req.body;

    if (!COIN_POOLS[coin]) {
        return res.status(400).json({ error: 'Unknown coin' });
    }

    currentCoin = coin;
    config.poolUrl = COIN_POOLS[coin];
    // Switch wallet if available
    if (config.wallets[coin]) {
        config.wallet = config.wallets[coin];
    }

    addLog(`💱 Switching to ${coin}...`);
    startMiner();

    res.json({ success: true, coin });
});

app.get('/auto-switch', (req, res) => {
    res.json({ enabled: autoSwitchEnabled, currentCoin });
});

// GUI: Metadata Endpoint
app.get('/meta', (req, res) => {
    res.json({
        coins: Object.keys(COIN_POOLS),
        pools: COIN_POOLS,
        wallets: config.wallets,
        wallet: config.wallet,
        currentCoin: currentCoin,
        config: config
    });
});

// --- MINER CONTROL ENDPOINTS ---

app.post('/start-miner', (req, res) => {
    startMiner();
    res.json({ success: true, status: minerStatus });
});

app.post('/stop-miner', (req, res) => {
    killMiner();
    minerStatus = 'OFFLINE';
    res.json({ success: true, status: minerStatus });
});

// Jobs endpoint for Dashboard
app.get('/jobs', (req, res) => {
    const jobs = minerStatus === 'MINING' ? [{
        id: 'xmrig-job',
        title: `Mining ${config.algorithm || 'RandomX'} - ${currentCoin}`,
        status: 'RUNNING',
        progress: 0,
        startTime: new Date().toISOString()
    }] : [];
    res.json(jobs);
});

// Wallet bulk update endpoint
app.post('/wallet/bulk', (req, res) => {
    const { wallets } = req.body;
    if (!wallets || typeof wallets !== 'object') {
        return res.status(400).json({ error: 'Invalid wallets payload' });
    }
    
    // Update wallets config
    config.wallets = { ...config.wallets, ...wallets };
    
    // If current coin wallet is provided, update active wallet too
    if (wallets[currentCoin]) {
        config.wallet = wallets[currentCoin];
    }
    
    addLog(`💾 Wallets bulk-updated (${Object.keys(wallets).length} coins)`);
    res.json({ success: true, wallets: config.wallets });
});

// --- HASHCAT / SECURITY ENDPOINTS (STUB) ---
// These are placeholders pending full hashcat integration

app.post('/hashcat/start', (req, res) => {
    // For now, just acknowledge receipt
    // In a full implementation, this would launch hashcat process
    addLog('🔒 Hashcat job received (not yet implemented)');
    res.json({ success: true, message: 'Job queued (stub)' });
});

app.post('/hashcat/stop', (req, res) => {
    addLog('🛑 Hashcat stop requested (stub)');
    res.json({ success: true, message: 'Stopped (stub)' });
});

app.get('/hashcat/status', (req, res) => {
    // Return stub status
    res.json({
        status: 'idle',
        hashrate: 0,
        temp: 0,
        recovered: 0,
        total: 0,
        logs: ['Hashcat module not yet integrated.']
    });
});

app.listen(PORT, () => {
    console.log(`Native XMRig Agent running on http://localhost:${PORT}`);
});
