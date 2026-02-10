
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
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'https://app.hashnhedge.com'];
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
const DATA_FILE = path.join(__dirname, 'data.json');

// --- COIN-SPECIFIC MINER CONFIGURATION ---
const COIN_MINERS = {
    XMR: {
        binary: process.platform === 'win32' ? 'xmrig.exe' : 'xmrig',
        algorithm: 'rx/0',
        pool: 'stratum+tcp://pool.supportxmr.com:5555',
        apiPort: 4444
    },
    RVN: {
        binary: process.platform === 'win32' ? 't-rex.exe' : 't-rex',
        algorithm: 'kawpow',
        pool: 'stratum+tcp://rvn.2miners.com:6060',
        apiPort: 4067
    },
    ETC: {
        binary: process.platform === 'win32' ? 't-rex.exe' : 't-rex',
        algorithm: 'etchash',
        pool: 'stratum+tcp://etc.2miners.com:1010',
        apiPort: 4068
    },
    ERG: {
        binary: process.platform === 'win32' ? 'lolMiner.exe' : 'lolMiner',
        algorithm: 'AUTOLYKOS2',
        pool: 'stratum+tcp://de.ergo.herominers.com:11800',
        apiPort: 4069
    },
    KAS: {
        binary: process.platform === 'win32' ? 'lolMiner.exe' : 'lolMiner',
        algorithm: 'KASPA',
        pool: 'stratum+tcp://kas.2miners.com:2020',
        apiPort: 4070
    }
};

// Helper to get miner path for current coin
const getMinerPath = (coin) => {
    const coinConfig = COIN_MINERS[coin] || COIN_MINERS.XMR;
    return path.join(__dirname, 'bin', coinConfig.binary);
};

// --- PLATFORM FEE CONFIG ---
const PLATFORM_FEE_TIERS = {
    free: 0.02,      // 2%
    pro: 0.01,       // 1%
    enterprise: 0.005 // 0.5%
};
const PLATFORM_WALLET = 'Rqr113e2e3...'; // Platform owner wallet (RVN example)

// --- CONSTANTS ---
const COIN_POOLS = {
    XMR: 'stratum+tcp://pool.supportxmr.com:5555',
    RVN: 'stratum+tcp://rvn.2miners.com:6060', // GPU
    ETC: 'stratum+tcp://etc.2miners.com:1010', // GPU
    ERG: 'stratum+tcp://de.ergo.herominers.com:11800', // GPU
    KAS: 'stratum+tcp://kas.2miners.com:2020' // GPU
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
    mode: 'cpu' // cpu or gpu
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
        // Auto-backup before saving
        if (fs.existsSync(DATA_FILE)) {
            fs.copyFileSync(DATA_FILE, `${DATA_FILE}.bak`);
        }

        const dataToSave = {
            totalShares,
            feeShares,
            wallets: config.wallets,
            miningMode: config.mode,
            currentCoin,
            config: config
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));
    } catch (e) {
        addLog(`❌ Error saving stats: ${e.message}`);
    }
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

    // Get coin-specific miner configuration
    const coinConfig = COIN_MINERS[currentCoin] || COIN_MINERS.XMR;
    const minerBin = getMinerPath(currentCoin);
    const cleanUrl = config.poolUrl.replace('stratum+tcp://', '');
    const displayWallet = (config.wallet || 'UNKNOWN_WALLET').toString();

    addLog(`🚀 Launching ${coinConfig.binary} for ${currentCoin}...`);
    addLog(`   Pool: ${cleanUrl}`);
    addLog(`   User: ${displayWallet.substring(0, 8)}...`);
    addLog(`   Algorithm: ${coinConfig.algorithm}`);

    // SECURITY: Input Validation
    if (config.poolUrl && !config.poolUrl.match(/^(stratum\+tcp|ssl):\/\/[a-zA-Z0-9.:-]+$/)) {
        addLog(`❌ Security: Invalid Pool URL detected: ${config.poolUrl}`);
        return;
    }

    // Build miner-specific arguments
    let args = [];

    if (coinConfig.binary.includes('xmrig')) {
        // XMRig arguments
        args = [
            '-o', cleanUrl,
            '-u', config.wallet,
            '-p', 'x',
            '-a', coinConfig.algorithm,
            '--no-color',
            '--api-worker-id', 'HNH_Worker',
            '--http-host', '127.0.0.1',
            '--http-port', String(coinConfig.apiPort),
            '--http-access-token', 'antigravity_secret',
            '--http-no-restricted',
            '--donate-level', '1',
            '--rig-id', 'HNH_Worker'
        ];
    } else if (coinConfig.binary.includes('t-rex')) {
        // T-Rex arguments
        args = [
            '-a', coinConfig.algorithm,
            '-o', config.poolUrl,
            '-u', config.wallet,
            '-p', 'x',
            '--api-bind-http', `127.0.0.1:${coinConfig.apiPort}`,
            '--no-watchdog',
            '-w', 'HNH_Worker'
        ];
    } else if (coinConfig.binary.includes('lolMiner')) {
        // lolMiner arguments
        args = [
            '--algo', coinConfig.algorithm,
            '--pool', config.poolUrl,
            '--user', config.wallet,
            '--pass', 'x',
            '--apiport', String(coinConfig.apiPort),
            '--apihost', '127.0.0.1',
            '--worker', 'HNH_Worker'
        ];
    }

    minerStatus = 'STARTING';

    try {
        minerProcess = spawn(minerBin, args);

        minerProcess.stdout.on('data', (data) => {
            const line = data.toString().trim();
            handleMinerOutput(line);
        });

        minerProcess.stderr.on('data', (data) => {
            console.error(`[${coinConfig.binary} ERR] ${data}`);
            addLog(`ERR: ${data.toString().trim()}`);
        });

        minerProcess.on('close', (code) => {
            addLog(`⚠️ Miner exited with code ${code}`);
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
const minerBinPath = getMinerPath(currentCoin);
if (fs.existsSync(minerBinPath)) {
    startMiner();
} else {
    addLog(`❌ Miner binary not found at ${minerBinPath}. Run 'setup_miner.sh' first.`);
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
    const { wallet, poolUrl, password, tier } = req.body;
    let changed = false;

    if (wallet && wallet !== config.wallet) {
        config.wallet = wallet;
        // PERSISTENCE: Save to specific coin slot
        if (currentCoin) {
            config.wallets[currentCoin] = wallet;
        }
        changed = true;
    }
    if (poolUrl && poolUrl !== config.poolUrl) {
        config.poolUrl = poolUrl;
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
    res.json({ success: true });
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
        wallet: config.wallet,
        currentCoin: currentCoin,
        config: config
    });
});

// --- DIAGNOSTICS & ROBUSTNESS ---

app.get('/health', (req, res) => {
    let version = 'unknown';
    try {
        const versionData = JSON.parse(fs.readFileSync(path.join(__dirname, '../version.json'), 'utf8'));
        version = versionData.version;
    } catch (e) { }

    res.json({
        status: 'ok',
        service: 'HNH-Agent',
        platform_version: version,
        miner_status: minerStatus,
        uptime: process.uptime(),
        platform: process.platform,
        arch: process.arch
    });
});

app.get('/test-miners', async (req, res) => {
    const results = {};
    for (const [coin, cfg] of Object.entries(COIN_MINERS)) {
        const binPath = getMinerPath(coin);
        const exists = fs.existsSync(binPath);
        results[coin] = {
            binary: cfg.binary,
            path: binPath,
            exists: exists,
            status: exists ? 'READY' : 'MISSING'
        };
    }
    res.json({ success: true, miners: results });
});

app.post('/rollback', (req, res) => {
    const BAK_FILE = `${DATA_FILE}.bak`;
    if (!fs.existsSync(BAK_FILE)) {
        return res.status(404).json({ error: 'No backup found' });
    }

    try {
        addLog('🔄 Rolling back configuration from backup...');
        fs.copyFileSync(BAK_FILE, DATA_FILE);

        addLog('⚠️ Restarting agent process to apply rollback...');
        res.json({ success: true, message: 'Rollback initiated. Agent will restart.' });

        // Short delay to allow response to send, then exit (assuming PM2 or similar will restart it)
        setTimeout(() => process.exit(0), 1000);
    } catch (e) {
        res.status(500).json({ error: `Rollback failed: ${e.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Native XMRig Agent running on http://localhost:${PORT}`);
});
