
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import { exec } from 'child_process';
import StratumProxy from './stratum-proxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// SECURITY: Strict CORS
// SECURITY: Strict CORS (Modified to allow deployed frontends)
app.use(cors({
    origin: function (origin, callback) {
        // Allow all origins for the local agent to ensure connectivity from deployed apps
        // In a strict production environment, you would list specific domains:
        // const allowedOrigins = ['http://localhost:3000', 'https://hashnhedge.com', ...];
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

// GUI: Serve Static Files (Public)
const GUI_PATH = path.join(__dirname, 'gui');
app.use(express.static(GUI_PATH));

// SECURITY: Auth Middleware
if (!process.env.AGENT_SECRET) {
    console.warn('WARNING: AGENT_SECRET not set in environment, using default. Set AGENT_SECRET for production use.');
}
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
const POSTS_FILE = path.join(__dirname, 'posts.json');
const HARDWARE_FILE = path.join(__dirname, 'hardware_data.json');

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for local agent
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('[SOCKET] Client connected:', socket.id);

    // Send immediate initial data
    socket.emit('telemetry', {
        ...telemetry,
        minerStatus,
        recentLogs,
        config
    });

    socket.on('disconnect', () => {
        console.log('[SOCKET] Client disconnected:', socket.id);
    });
});

const broadcastTelemetry = () => {
    io.emit('telemetry', {
        hashrate: telemetry.hashrate / 1000000,
        temp: telemetry.temp,
        power: telemetry.power,
        fan: telemetry.fan,
        status: minerStatus,
        coin: currentCoin,
        wallet: config.wallet,
        logs: recentLogs,
        config: config
    });
};


// --- PLATFORM FEE CONFIG ---
const PLATFORM_FEE_TIERS = {
    free: 0.02,      // 2%
    pro: 0.01,       // 1%
    enterprise: 0.005 // 0.5%
};
const PLATFORM_WALLET = 'Rqr113e2e3...'; // Platform owner wallet (RVN example)

// --- CONSTANTS ---
// --- CONSTANTS ---
const COIN_ALGOS = {
    XMR: 'rx/0',
    ZEPH: 'rx/0',
    RVN: 'kawpow',
    ETC: 'etchash',
    ERG: 'autolykos2',
    KAS: 'heavyhash',
    SOL: 'rx/0' // Unmineable (CPU Mining for SOL)
};

const COIN_POOLS = {
    XMR: 'stratum+tcp://pool.supportxmr.com:5555', // switched from 2miners (blocked)
    ZEPH: 'stratum+tcp://de.zephyr.herominers.com:1123',
    RVN: 'stratum+tcp://rvn.2miners.com:6060',
    ETC: 'stratum+tcp://etc.2miners.com:1010',
    ERG: 'stratum+tcp://de.ergo.herominers.com:11800',
    KAS: 'stratum+tcp://pool.woolypooly.com:3112',
    SOL: 'stratum+tcp://rx.unmineable.com:3333' // Unmineable
};

// --- STATE ---
// --- STATE ---
// --- STATE ---
let currentCoin = 'XMR'; // Defined early for usage in persistence loading

let config = {
    wallet: '46Jq7oMJDRChGsrD6pWR9u1ggByoGkdYy67vajU7BmFZSkZdrHEQvyb19Fi3hjdcRq5mWV5u71uAk7ohe6koNYWR5SnagdU', // Default XMR
    password: 'x', // Default password (required for spawn)
    wallets: {
        XMR: '46Jq7oMJDRChGsrD6pWR9u1ggByoGkdYy67vajU7BmFZSkZdrHEQvyb19Fi3hjdcRq5mWV5u71uAk7ohe6koNYWR5SnagdU',
        ZEPH: 'ZEPHs8Fk9FkP59s59s59s59s59s59s59s59s59s59s59s59s59s59s59s59s59s59',
        ETC: '0x19511e52720739f6F47E74221cBCd746BE387535',
        ERG: '9ev9ugszdQbQQUZ8gz76TuG4hNLUew8p6JmhrCeYeWNKbKAtKbV',
        KAS: 'kaspa:qzy048jd0mx7evm4svj0yaf9mufrsxrmus3l3zax92ltnfkh4h08qptc0wdek',
        RVN: 'RQso1HHf2VLBr72Na6u7yWBCCWN8PWn1yA',
        SOL: '43qairUpjZWBPnkBbksSmokfsg9g8jaW5ZMUcDhnDEhM'
    },
    poolUrl: 'stratum+tcp://pool.supportxmr.com:5555',
    algorithm: 'rx/0',
    mode: 'cpu' // cpu or gpu
};

let walletHistory = {}; // Map<Coin, Array<Address>>

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

        // Load Config from setup script or previous save
        if (data.wallets) config.wallets = { ...config.wallets, ...data.wallets };
        if (data.miningMode) config.mode = data.miningMode;
        if (data.walletHistory) walletHistory = data.walletHistory;

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

const saveData = () => {
    try {
        const data = {
            totalShares,
            feeShares,
            wallets: config.wallets,
            miningMode: config.mode,
            walletHistory
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) { console.error("Failed to save data:", e); }
};

// --- LOGGING ---
const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[AGENT] ${msg}`);
    recentLogs.unshift(`[${timestamp}] ${msg}`);
    if (recentLogs.length > 50) recentLogs.pop();
};

// --- MINER MANAGER ---
// import StratumProxy ... (Moved to top)

// ... (Requires logic change, better to instantiate inside startMiner or globally)
let proxyInstance = null;

const startMiner = () => {
    if (minerProcess) {
        killMiner();
    }

    // Config Parsing
    let targetHost = 'pool.supportxmr.com';
    let targetPort = 5555;

    try {
        // Strip scheme
        const clean = config.poolUrl.replace('stratum+tcp://', '').replace('ssl://', '');
        const parts = clean.split(':');
        targetHost = parts[0];
        targetPort = parseInt(parts[1]) || 3333;
    } catch (e) { }

    // Start/Restart Proxy with new target
    if (proxyInstance) {
        proxyInstance.stop();
        proxyInstance = null;
    }

    // PROXY BYPASS STRATEGY
    addLog(`🛡️ Initializing Firewall Bypass Proxy...`);
    addLog(`   Target: ${targetHost}:${targetPort}`);

    // Create and start proxy
    try {
        proxyInstance = new StratumProxy(targetHost, targetPort, PLATFORM_WALLET);
        proxyInstance.start();
        addLog(`✅ Stratum Proxy started on port 3333`);
    } catch (err) {
        addLog(`⚠️ Proxy start warning: ${err.message}`);
    }

    const cleanUrl = '127.0.0.1:3333'; // Local Proxy

    addLog(`🚀 Launching XMRig (Tunnel Mode)...`);
    addLog(`   Pool: ${config.poolUrl} via ${cleanUrl}`);
    const displayWallet = (config.wallet || 'UNKNOWN_WALLET').toString();
    addLog(`   User: ${displayWallet.substring(0, 8)}...`);

    // Build XMRig arguments
    const args = [
        '-o', cleanUrl,
        '-u', config.wallet,
        '-p', config.password || 'x',
        '-a', config.algorithm || 'rx/0',
        '--http-port', '4444',
        '--http-host', '127.0.0.1',
        '--http-no-restricted',
        '--no-color',
        '--print-time', '10'
    ];

    // Add GPU-specific args if in GPU mode
    if (config.mode === 'gpu') {
        args.push('--cuda');
        args.push('--no-cpu');
        addLog(`   Mode: GPU (CUDA enabled)`);
    } else {
        addLog(`   Mode: CPU`);
    }

    // Spawn XMRig process
    try {
        minerProcess = spawn(MINER_BIN, args, {
            cwd: path.dirname(MINER_BIN),
            windowsHide: true
        });

        minerStatus = 'STARTING';
        addLog(`✅ XMRig process started (PID: ${minerProcess.pid})`);

        minerProcess.stdout.on('data', (data) => {
            const line = data.toString().trim();
            if (line) {
                addLog(line);
                // Check for successful connection
                if (line.includes('use pool') || line.includes('new job')) {
                    minerStatus = 'MINING';
                }
            }
        });

        minerProcess.stderr.on('data', (data) => {
            const line = data.toString().trim();
            if (line) {
                addLog(`[ERR] ${line}`);
            }
        });

        minerProcess.on('close', (code) => {
            addLog(`⚠️ XMRig exited with code ${code}`);
            minerStatus = 'OFFLINE';
            minerProcess = null;
        });

        minerProcess.on('error', (err) => {
            addLog(`❌ Failed to start XMRig: ${err.message}`);
            minerStatus = 'OFFLINE';
            minerProcess = null;
        });

        // Start telemetry polling
        setTimeout(() => {
            if (minerStatus === 'STARTING') {
                minerStatus = 'MINING';
            }
        }, 5000);

    } catch (err) {
        addLog(`❌ Failed to spawn XMRig: ${err.message}`);
        minerStatus = 'OFFLINE';
    }
};

const killMiner = () => {
    if (minerProcess) {
        minerProcess.kill();
        minerProcess = null;
    }
};

// --- TELEMETRY POLLING ---
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
            } catch (e) {
                console.error('[TELEMETRY] Failed to parse XMRig stats:', e.message);
            }
        });
    });

    req.on('error', (e) => {
        console.error('[TELEMETRY] Failed to fetch XMRig stats:', e.message);
    });
    req.end();
};

// Poll XMRig every 2 seconds
setInterval(() => {
    fetchXmrigStats();
    broadcastTelemetry(); // Push update via socket
}, 2000);

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
            saveData();
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
        coin: currentCoin,
        platform_wallet: PLATFORM_WALLET,
        status: minerStatus,
        logs: recentLogs
    });
});

app.post('/config', (req, res) => {
    const { wallet, poolUrl, password, tier, mode, coin, algorithm } = req.body;
    let changed = false;

    // 1. Mode Update (CPU/GPU)
    if (mode && ['cpu', 'gpu'].includes(mode) && mode !== config.mode) {
        config.mode = mode;
        // Smart Defaults when switching mode
        if (mode === 'gpu' && currentCoin === 'XMR') {
            currentCoin = 'RVN'; // Default to GPU coin
            config.poolUrl = COIN_POOLS.RVN;
            config.algorithm = 'kawpow';
        } else if (mode === 'cpu' && currentCoin !== 'XMR' && currentCoin !== 'ZEPH') {
            currentCoin = 'XMR'; // Default to CPU coin
            config.poolUrl = COIN_POOLS.XMR;
            config.algorithm = 'rx/0';
        }
        changed = true;
    }

    // 2. Coin Update
    if (coin && coin !== currentCoin) {
        if (COIN_POOLS[coin] || config.mode === 'custom') { // Allow custom if we support that later
            currentCoin = coin;
            // If user didn't provide specific pool, use default
            if (!poolUrl) config.poolUrl = COIN_POOLS[coin];
            config.algorithm = COIN_ALGOS[coin] || config.algorithm;
            changed = true;
        }
    }

    // 3. Wallet Update
    if (wallet && wallet !== config.wallet) {
        config.wallet = wallet;
        // PERSISTENCE: Save to specific coin slot
        if (currentCoin) {
            config.wallets[currentCoin] = wallet;

            // Add to History
            if (!walletHistory[currentCoin]) walletHistory[currentCoin] = [];
            if (!walletHistory[currentCoin].includes(wallet)) {
                walletHistory[currentCoin].unshift(wallet); // Add to top
                // Limit history to 5
                if (walletHistory[currentCoin].length > 5) walletHistory[currentCoin].pop();
            }
        }
        changed = true;
    }

    // 4. Pool/Algo Manual Overrides
    if (poolUrl && poolUrl !== config.poolUrl) {
        config.poolUrl = poolUrl;
        changed = true;
    }
    if (algorithm && algorithm !== config.algorithm) {
        config.algorithm = algorithm;
        changed = true;
    }

    // 5. Password
    if (password && password !== config.password) {
        config.password = password;
        changed = true;
    }

    // 6. Tier
    if (tier && ['free', 'pro', 'enterprise'].includes(tier)) {
        userTier = tier;
        addLog(`Tier updated to: ${tier} (${PLATFORM_FEE_TIERS[tier] * 100}% fee)`);
    }

    if (changed) {
        saveData(); // Save new config
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
        autoSwitchInterval = setInterval(checkProfitabilityAndSwitch, 5 * 60 * 1000);

        // Run immediately once
        checkProfitabilityAndSwitch();

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

// AUTO-SWITCH LOGIC
async function checkProfitabilityAndSwitch() {
    if (!autoSwitchEnabled || minerStatus !== 'MINING') return;

    try {
        addLog('📊 Checking market prices...');
        // 1. Fetch Prices
        // Simplified fetch (Node.js doesn't have fetch in older versions but check environment. 
        // We imported http earlier but fetch is available in Node 18+. Assuming modern node given 'import' syntax)
        const ids = 'monero,ravencoin,ethereum-classic,ergo,kaspa';
        const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        const prices = await priceRes.json();

        // Map Prices
        const coinPrices = {
            XMR: prices.monero?.usd || 0,
            RVN: prices.ravencoin?.usd || 0,
            ETC: prices['ethereum-classic']?.usd || 0,
            ERG: prices.ergo?.usd || 0,
            KAS: prices.kaspa?.usd || 0
        };

        // 2. Base Data (Approximate difficulty/rewards for estimation)
        const BASELINE = {
            XMR: { reward: 0.6, diff: 300000000000 },
            RVN: { reward: 2500, diff: 50000 }, // RVN diff varies wildly, this is low-ball
            ETC: { reward: 2.56, diff: 2000000000000000 },
            ERG: { reward: 30, diff: 1500000000000 },
            KAS: { reward: 500, diff: 100000 }
        };

        let bestCoin = currentCoin;
        let maxScore = 0;
        let currentScore = 0;

        // 3. Calc Score
        Object.keys(COIN_POOLS).forEach(coin => {
            const base = BASELINE[coin];
            if (!base || !coinPrices[coin]) return;

            // Simple Score = (Reward * Price) / Difficulty (Ignoring hashrate scale since it's relative)
            // We use a normalized multiplier to make numbers readable
            const score = (base.reward * coinPrices[coin] * 1000000000000) / base.diff;

            if (coin === currentCoin) currentScore = score;
            if (score > maxScore) {
                maxScore = score;
                bestCoin = coin;
            }
        });

        // 4. Decide Switch (Threshold 10% better)
        if (bestCoin !== currentCoin && maxScore > currentScore * 1.10) {
            addLog(`🚀 Auto-Switch: ${bestCoin} is >10% more profitable than ${currentCoin}. Switching...`);

            // Execute Switch
            currentCoin = bestCoin;
            config.poolUrl = COIN_POOLS[bestCoin];
            config.algorithm = COIN_ALGOS[bestCoin] || 'rx/0';
            if (config.wallets[bestCoin]) config.wallet = config.wallets[bestCoin];

            startMiner();
        } else {
            addLog(`✅ ${currentCoin} is still optimal (or difference < 10%).`);
        }

    } catch (e) {
        addLog(`⚠️ Auto-Switch Check Failed: ${e.message}`);
    }
}

// COIN_ALGOS already defined at top of file

// ... (existing code)

app.post('/switch-coin', (req, res) => {
    const { coin } = req.body;

    if (!COIN_POOLS[coin]) {
        return res.status(400).json({ error: 'Unknown coin' });
    }

    currentCoin = coin;
    config.poolUrl = COIN_POOLS[coin];
    config.algorithm = COIN_ALGOS[coin] || 'rx/0';

    // Switch wallet if available
    if (config.wallets[coin]) {
        config.wallet = config.wallets[coin];
    } else {
        // Fallback or generic logic if needed, but usually we keep last or use placeholder
        // If "add same mapping for wallet" means default wallets constants:
        // We already have config.wallets loaded from defaults.
    }

    addLog(`💱 Switching to ${coin} (${config.algorithm})...`);
    startMiner();

    res.json({ success: true, coin });
});

app.post('/stop-miner', (req, res) => {
    if (minerStatus === 'MINING' || minerStatus === 'STARTING') {
        killMiner();
        minerStatus = 'STOPPED';
        addLog('⏹️ Miner stopped by user');
    }
    res.json({ success: true, status: minerStatus });
});

app.post('/start-miner', (req, res) => {
    if (minerStatus !== 'MINING') {
        startMiner();
    }
    res.json({ success: true, status: minerStatus });
});

app.get('/auto-switch', (req, res) => {
    res.json({ enabled: autoSwitchEnabled, currentCoin });
});

// ...
let lastProfitability = 0; // USD/day estimate



// ...

// REAL STATS API (Replaces Fake Dashboard Data)
app.get('/stats', (req, res) => {
    res.json({
        activeNodes: 1, // Self
        totalTflops: telemetry.hashrate / 1000000, // MH/s as proxy
        jobsRunning: minerStatus === 'MINING' ? 1 : 0,
        networkUtilization: minerStatus === 'MINING' ? 100 : 0,
        avgPricePerFLOP: lastProfitability // Using this field to carry profit info
    });
});

// GUI: Metadata Endpoint
app.get('/meta', (req, res) => {
    // ...
    res.json({
        coins: Object.keys(COIN_POOLS),
        pools: COIN_POOLS,
        wallet: config.wallet,
        currentCoin: currentCoin,
        config: config,
        walletHistory: walletHistory
    });
});

// --- FORUM (Real Persistence) ---
let posts = [];
try {
    if (fs.existsSync(POSTS_FILE)) {
        posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    } else {
        // SEEDING: Community Seeding (Feature #5)
        posts = [
            {
                id: 'seed1', title: 'Official Overclocking Database (Wiki)', author: 'System', category: 'General',
                content: 'Check the new Hardware tab for optimized settings. RTX 4090 efficiency targets updated.',
                timestamp: 'Just now', likes: 42, replies: 0, isPinned: true
            },
            {
                id: 'seed2', title: 'Spec Mining Alert: Karlsen (KLS)', author: 'MinerMike', category: 'Announcements',
                content: 'New fork of Kaspa. Difficulty is low. Worth pointing hash for 24h?',
                timestamp: '1h ago', likes: 12, replies: 5
            },
            {
                id: 'seed3', title: 'Setting up local node for Zephyr', author: 'PrivacyMod', category: 'Support',
                content: 'Guide: 1. Download zephyrd. 2. Sync chain (approx 40GB). 3. Point miner to 127.0.0.1:17750.',
                timestamp: '3h ago', likes: 8, replies: 2
            }
        ];
        fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    }
} catch (e) { }

app.get('/forum', (req, res) => {
    res.json(posts);
});

app.post('/forum', (req, res) => {
    const { title, content, category, author } = req.body;
    const newPost = {
        id: Date.now().toString(),
        title,
        content,
        category,
        author: author || 'Anonymous',
        timestamp: new Date().toLocaleTimeString(),
        likes: 0,
        replies: 0,
        isPinned: false
    };
    posts.unshift(newPost);
    if (posts.length > 100) posts.pop(); // Limit
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    res.json(newPost);
});

// --- SECURITY (Real Port Scan) ---
app.get('/hashcat/status', (req, res) => {
    // Legacy mock support or new real scan status
    res.json({ logs: [], hashrate: 0, status: 'idle' });
});

app.post('/security/scan', (req, res) => {
    // REAL COMMAND: Netstat to check open ports
    const cmd = process.platform === 'win32' ? 'netstat -ano | findstr LISTEN' : 'netstat -tuln';
    exec(cmd, (err, stdout, stderr) => {
        res.json({
            success: true,
            output: stdout || stderr,
            ports: stdout.split('\n').length
        });
    });
});

// --- REAL WORLD FEATURES (Batch 1) ---

// 1. Hardware Database API
app.get('/api/hardware', (req, res) => {
    try {
        if (fs.existsSync(HARDWARE_FILE)) {
            const data = JSON.parse(fs.readFileSync(HARDWARE_FILE, 'utf8'));
            res.json(data);
        } else {
            res.json([]);
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Miner's Market Proxy
app.get('/api/prices', async (req, res) => {
    try {
        // Fetch Top PoW Coins
        const ids = 'monero,zephyr,ravencoin,ethereum-classic,kaspa,ergo,karlsen';
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,btc&include_24hr_change=true`);
        const data = await r.json();
        res.json(data);
    } catch (e) { res.status(500).json({ error: "Failed to fetch prices" }); }
});

// 3. Token Audit (Real RPC Check)
app.post('/api/audit', async (req, res) => {
    const { tokenAddress } = req.body;
    try {
        // Call Solana Mainnet RPC
        const rpcRes = await fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getAccountInfo',
                params: [
                    tokenAddress,
                    { encoding: "jsonParsed" }
                ]
            })
        });
        const data = await rpcRes.json();

        if (!data.result || !data.result.value) {
            return res.json({ valid: false, message: "Token not found or invalid address" });
        }

        const info = data.result.value;
        const parsed = info.data.parsed?.info;

        // Basic Safety Checks
        const checks = {
            isMint: info.data.program === 'spl-token' || info.owner === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
            mintAuthority: parsed?.mintAuthority,
            freezeAuthority: parsed?.freezeAuthority,
            decimals: parsed?.decimals,
            supply: parsed?.supply
        };

        res.json({ valid: true, checks });
    } catch (e) {
        res.status(500).json({ error: "RPC Audit Failed" });
    }
});


httpServer.listen(PORT, () => {
    console.log(`Native XMRig Agent running on http://localhost:${PORT}`);
});
