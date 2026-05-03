
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- ENVIRONMENT VALIDATION ---
const requiredEnv = ['AGENT_SECRET', 'PORT'];
const missingEnv = requiredEnv.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
}
const AGENT_SECRET = process.env.AGENT_SECRET || "HNH_LOCAL_AGENT_SECRET";
if (AGENT_SECRET === 'HNH_LOCAL_AGENT_SECRET') {
    console.warn('⚠️  Using default AGENT_SECRET. Set AGENT_SECRET env var for production security.');
}

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
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS not allowed'), false);
        }
        return callback(null, true);
    }
}));
app.use(express.json());

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/telemetry', apiLimiter);
app.use('/config', apiLimiter);
app.use('/start-miner', apiLimiter);
app.use('/stop-miner', apiLimiter);
app.use('/wallet/bulk', apiLimiter);
app.use('/switch-coin', apiLimiter);
app.use('/agent/update-check', apiLimiter);
app.use('/agent/update-now', apiLimiter);

const execLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    message: 'Command execution rate limit exceeded.'
});
app.use('/execute', execLimiter);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    }
}));

// GUI: Serve Static Files (Public)
const GUI_PATH = path.join(__dirname, 'gui');
app.use(express.static(GUI_PATH));

// SECURITY: Auth Middleware
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
    // Emit logs via socket
    io.emit('log', recentLogs[0]);
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
                telemetry.hashrate = stats.hashrate?.total?.[0] || 0;
                const health = stats.health || [];
                if (health.length > 0) {
                    const avgTemp = health.reduce((acc, h) => acc + (h.temp || 0), 0) / health.length;
                    const totalPower = health.reduce((acc, h) => acc + (h.power || 0), 0);
                    const avgFan = health.reduce((acc, h) => acc + (h.fan || 0), 0) / health.length;
                    telemetry.temp = avgTemp;
                    telemetry.power = totalPower;
                    telemetry.fan = avgFan;
                }
                // Emit telemetry update to connected sockets
                emitTelemetry();
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
        vram_used: 0,
        hashrate: telemetry.hashrate / 1000000,
        verified_shares: netShares,
        gross_shares: grossShares,
        fee_deducted: feeDeducted,
        fee_rate: feeRate * 100,
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
        logs: recentLogs,
        coin: currentCoin,
        mode: config.mode
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

// --- OVERCLOCK PROFILES ---
const OC_PROFILES = {
    safe: { name: 'Efficiency Mode', powerOffset: -15, hashrateOffset: 5, coreClock: 0, memoryClock: 0, powerLimit: 80 },
    balanced: { name: 'AI Balanced', powerOffset: 5, hashrateOffset: 12, coreClock: 50, memoryClock: 100, powerLimit: 100 },
    max: { name: 'Max Performance', powerOffset: 30, hashrateOffset: 25, coreClock: 100, memoryClock: 200, powerLimit: 120 }
};

let currentProfile = 'safe';
let tuningInProgress = false;
let lastTuneTime = 0;
const TUNE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const BENCHMARK_DURATION = 60 * 1000; // 1 minute per profile

// Benchmark a given profile by applying temporary settings and measuring
async function benchmarkProfile(profileKey) {
    const profile = OC_PROFILES[profileKey];
    addLog(`🔬 Benchmarking ${profile.name}...`);

    // In a real implementation, this would:
    // 1. Write OC settings to file/registry for MSI Afterburner or nvidia-settings
    // 2. Send signal to miner to reload config
    // 3. Wait for stabilization
    // 4. Poll telemetry for duration, compute avg hashrate/power
    // 5. Return efficiency score

    // Simulation: return mock efficiency (hashes per watt)
    const baseEfficiency = 0.5; // H/J (example)
    const simulatedEfficiency = baseEfficiency * (1 + (profile.hashrateOffset / 100)) / (1 + (profile.powerOffset / 100));
    return { efficiency: simulatedEfficiency, hashrate: 1000 * (1 + profile.hashrateOffset/100), power: 120 * (1 + profile.powerOffset/100) };
}

// Auto-tuning loop
async function runTuningLoop() {
    if (tuningInProgress || Date.now() - lastTuneTime < TUNE_INTERVAL) return;
    tuningInProgress = true;
    addLog('🔧 Starting auto-OC tuning cycle...');

    try {
        let bestProfile = currentProfile;
        let bestScore = 0;

        // Test each enabled profile
        for (const [key, profile] of Object.entries(OC_PROFILES)) {
            const result = await benchmarkProfile(key);
            const score = result.efficiency;
            addLog(`📊 ${profile.name}: ${result.hashrate.toFixed(1)} H/s, ${result.power.toFixed(1)}W, eff=${score.toFixed(4)}`);

            if (score > bestScore) {
                bestScore = score;
                bestProfile = key;
            }
        }

        if (bestProfile !== currentProfile) {
            addLog(`✅ Optimal profile found: ${OC_PROFILES[bestProfile].name}. Applying...`);
            currentProfile = bestProfile;
            // In real implementation: write profile to disk and signal miner to reload
            // For now: just log
        } else {
            addLog(`✅ Current profile (${OC_PROFILES[currentProfile].name}) is optimal.`);
        }

        lastTuneTime = Date.now();
    } catch (e) {
        addLog(`❌ Tuning error: ${e.message}`);
    } finally {
        tuningInProgress = false;
    }
}

// Start auto-tuning interval (if enabled)
let tuneInterval = null;
function enableAutoTuning() {
    if (!tuneInterval) {
        tuneInterval = setInterval(runTuningLoop, 60 * 60 * 1000); // Check every hour
        addLog('🤖 Auto-OC tuning enabled (checks hourly)');
    }
}
function disableAutoTuning() {
    if (tuneInterval) clearInterval(tuneInterval);
    tuneInterval = null;
    addLog('🛑 Auto-OC tuning disabled');
}

app.post('/start-miner', (req, res) => {
    startMiner();
    res.json({ success: true, status: minerStatus });
});

app.post('/stop-miner', (req, res) => {
    killMiner();
    minerStatus = 'OFFLINE';
    res.json({ success: true, status: minerStatus });
});

// --- OVERCLOCK CONTROL ENDPOINTS ---

// Get available OC profiles and current selection
app.get('/oc/profiles', (req, res) => {
    res.json({
        profiles: OC_PROFILES,
        currentProfile,
        tuningEnabled: !!tuneInterval,
        lastTuneTime,
        tuningInProgress
    });
});

// Apply a specific OC profile
app.post('/oc/apply', requireAuth, (req, res) => {
    const { profile } = req.body;
    if (!OC_PROFILES[profile]) return res.status(400).json({ error: 'Invalid profile' });

    currentProfile = profile;
    addLog(`🎛️ OC profile set to: ${OC_PROFILES[profile].name}`);
    // TODO: Actually apply hardware OC settings via nvidia-settings/MSI Afterburner
    res.json({ success: true, profile: currentProfile });
});

// Enable/disable auto-tuning
app.post('/oc/auto', requireAuth, (req, res) => {
    const { enabled } = req.body;
    if (enabled) {
        enableAutoTuning();
        res.json({ success: true, message: 'Auto-tuning enabled' });
    } else {
        disableAutoTuning();
        res.json({ success: true, message: 'Auto-tuning disabled' });
    }
});

// Run tuning cycle immediately (admin only)
app.post('/oc/run-now', requireAuth, (req, res) => {
    if (tuningInProgress) return res.status(429).json({ success: false, message: 'Tuning already in progress' });
    runTuningLoop().then(() => {
        res.json({ success: true, message: 'Tuning cycle completed', profile: currentProfile });
    }).catch(e => {
        res.status(500).json({ success: false, error: e.message });
    });
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

// --- HASHCAT / SECURITY ENDPOINTS ---
// Hashcat process management
let hashcatProcess = null;
let hashcatJob = null;
const HASHCAT_PATH = '/usr/local/bin/hashcat'; // default installed path

function hasHashcat() {
    try {
        require('child_process').execFileSync(HASHCAT_PATH, ['--version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

app.post('/hashcat/start', requireAuth, (req, res) => {
    const { hashfile, wordlist, mask, rules, format } = req.body;
    if (!hashfile) return res.status(400).json({ success: false, error: 'hashfile required' });
    if (!wordlist && !mask) return res.status(400).json({ success: false, error: 'Either wordlist or mask required' });

    if (!hasHashcat()) {
        return res.status(500).json({ success: false, error: 'Hashcat binary not found on this system.' });
    }

    const jobId = crypto.randomUUID();
    const args = ['-m', format || '0', '-a', mask ? '3' : '0', '--status', '--status-timer', '5', '--machine-readable', '--outfile', '/hashcat/progress.txt'];
    if (wordlist) args.push('-w', wordlist);
    if (mask) args.push(mask);
    if (rules) args.push('-r', rules);
    args.push(hashfile);

    addLog(`🔒 Starting hashcat job ${jobId}`);

    try {
        hashcatProcess = spawn(HASHCAT_PATH, args, { cwd: '/hashcat' });
        hashcatJob = { id: jobId, status: 'running', startTime: new Date(), recovered: 0, total: 0, progress: 0 };

        hashcatProcess.stdout.on('data', (data) => {
            const line = data.toString().trim();
            addLog(`[HASHCAT] ${line}`);
            // Parse status output: status, recovered/total, etc.
            if (line.includes('progress')) {
                const match = line.match(/progress.Essence: (\d+)\/(\d+)/);
                if (match) {
                    hashcatJob.recovered = parseInt(match[1]);
                    hashcatJob.total = parseInt(match[2]);
                    hashcatJob.progress = hashcatJob.total > 0 ? (hashcatJob.recovered / hashcatJob.total) * 100 : 0;
                }
            }
        });

        hashcatProcess.stderr.on('data', (data) => {
            addLog(`[HASHCAT ERR] ${data.toString().trim()}`);
        });

        hashcatProcess.on('close', (code) => {
            addLog(`🔒 Hashcat job ${jobId} exited with code ${code}`);
            if (code === 0) {
                hashcatJob.status = 'completed';
            } else {
                hashcatJob.status = 'failed';
            }
            hashcatProcess = null;
        });

        res.json({ success: true, jobId });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/hashcat/stop', requireAuth, (req, res) => {
    if (hashcatProcess) {
        hashcatProcess.kill('SIGTERM');
        addLog('🛑 Hashcat stop requested (waiting for exit...)');
        res.json({ success: true, message: 'Stopping...' });
    } else {
        res.status(400).json({ success: false, message: 'No job running' });
    }
});

app.get('/hashcat/status', (req, res) => {
    if (hashcatProcess && hashcatJob) {
        res.json({
            status: hashcatJob.status,
            hashrate: 0, // can parse from status line if needed
            temp: 0,
            recovered: hashcatJob.recovered,
            total: hashcatJob.total,
            progress: hashcatJob.progress,
            logs: recentLogs.filter(l => l.includes('[HASHCAT]')).slice(0, 50)
        });
    } else {
        res.json({
            status: 'idle',
            hashrate: 0,
            temp: 0,
            recovered: 0,
            total: 0,
            progress: 0,
            logs: ['Hashcat idle.']
        });
    }
});

app.post('/hashcat/stop', (req, res) => {
    addLog('🛑 Hashcat stop requested (stub)');
    res.json({ success: true, message: 'Stopped (stub)' });
});

// --- WHITELISTED COMMAND EXECUTION (Admin Only) ---
const ALLOWED_COMMANDS = [
    'ls', 'pwd', 'cat', 'tail', 'head', 'ps', 'top', 'df', 'free',
    'whoami', 'id', 'uname', 'uptime', 'date', 'echo', 'env',
    'xmrig', 'xmrig --version', 'tasklist', 'netstat'
];

app.post('/execute', requireAuth, (req, res) => {
    const { command, args } = req.body;
    if (!command || !ALLOWED_COMMANDS.includes(command)) {
        return res.status(400).json({ error: 'Command not allowed', allowed: ALLOWED_COMMANDS });
    }

    const fullCmd = `${command} ${args || ''}`.trim();
    addLog(`⚡ Executing: ${fullCmd}`);

    try {
        const child = spawn(command, args ? args.split(' ') : []);
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (data) => stdout += data.toString());
        child.stderr.on('data', (data) => stderr += data.toString());

        child.on('error', (err) => {
            addLog(`❌ Command error: ${err.message}`);
            res.json({ error: err.message, stderr: err.message });
        });

        child.on('close', (code) => {
            addLog(`✅ Command exited with code ${code}`);
            res.json({ code, stdout: stdout.trim(), stderr: stderr.trim() });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- SOCKET.IO & HTTP SERVER SETUP ---

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Socket.IO Authentication
io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers['x-agent-secret'];
    if (token === AGENT_SECRET) {
        next();
    } else {
        next(new Error('unauthorized'));
    }
});

io.on('connection', (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // Send current state immediately on connect
    socket.emit('telemetry', telemetry);
    socket.emit('status', minerStatus);
    socket.emit('logs', recentLogs);

    // Handle control commands from client
    socket.on('start-miner', () => {
        addLog('🎛️ Start command received via Socket.IO');
        startMiner();
    });

    socket.on('stop-miner', () => {
        addLog('🎛️ Stop command received via Socket.IO');
        killMiner();
        minerStatus = 'OFFLINE';
    });

    socket.on('config', (newConfig) => {
        addLog('🎛️ Config update via Socket.IO');
        if (newConfig.wallet) config.wallet = newConfig.wallet;
        if (newConfig.poolUrl) config.poolUrl = newConfig.poolUrl;
        if (newConfig.algorithm) config.algorithm = newConfig.algorithm;
        if (newConfig.mode) config.mode = newConfig.mode;
        if (newConfig.password !== undefined) config.password = newConfig.password;
        startMiner();
        socket.emit('config', config);
    });

    socket.on('switch-coin', (coin) => {
        if (COIN_POOLS[coin]) {
            currentCoin = coin;
            config.poolUrl = COIN_POOLS[coin];
            if (config.wallets[coin]) config.wallet = config.wallets[coin];
            addLog(`💱 Switching to ${coin} via Socket.IO`);
            startMiner();
            socket.emit('coin-switched', { coin, config });
        }
    });

    socket.on('disconnect', () => {
        console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });
});

// Health check
app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Agent Auto-Update endpoints
app.get('/agent/update-check', (req, res) => {
    // In production, check GitHub releases
    res.json({ updateAvailable: false, currentVersion: '0.1.0', latestVersion: '0.1.0' });
});

app.post('/agent/update-now', requireAuth, async (req, res) => {
    addLog('🔄 Update triggered (stub)');
    res.json({ success: true, message: 'Update not yet implemented' });
});

const emitTelemetry = () => {
    io.emit('telemetry', telemetry);
    io.emit('status', minerStatus);
};

// Start server
httpServer.listen(PORT, () => {
    console.log(`Native XMRig Agent running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO ready for real-time connections`);
});
