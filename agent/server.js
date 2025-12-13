
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4343;
const MINER_BIN = path.join(__dirname, 'bin', 'xmrig');
const DATA_FILE = path.join(__dirname, 'data.json');

// --- PLATFORM FEE CONFIG ---
const PLATFORM_FEE_TIERS = {
    free: 0.02,      // 2%
    pro: 0.01,       // 1%
    enterprise: 0.005 // 0.5%
};
const PLATFORM_WALLET = '48edfHu7V9Z84YzzMa6fUueoELZ9ZRXq9VetWzYGzBY52XU6kl2p4JS17kk074db13V2_RX7k1A5u23c59525'; // Platform owner wallet

// --- STATE ---
let config = {
    wallet: '48edfHu7V9Z84YzzMa6fUueoELZ9ZRXq9VetWzYGzBY52XU6kl2p4JS17kk074db13V2_RX7k1A5u23c59525', // Default Monero wallet
    poolUrl: 'stratum+tcp://xmr.2miners.com:2222',
    password: 'x',
    algorithm: 'rx/0' // RandomX default
};

let minerProcess = null;
let minerStatus = 'OFFLINE'; // OFFLINE, STARTING, MINING, ERROR
let recentLogs = [];
let totalShares = 0;
let feeShares = 0; // Shares owed to platform
let userTier = 'free'; // Current user's tier
let telemetry = {
    hashrate: 0,
    temp: 60, // Fallback if not parsed
    power: 0
};

// --- PERSISTENCE ---
try {
    if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        totalShares = data.totalShares || 0;
        feeShares = data.feeShares || 0;
    }
} catch (e) { console.error(e); }

const saveStats = () => {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify({ totalShares, feeShares })); } catch (e) { }
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
    addLog(`   User: ${config.wallet.substring(0, 8)}...`);

    // XMRig Args
    const args = [
        '-o', cleanUrl,
        '-u', config.wallet,
        '-p', config.password,
        '--no-color',
        '--api-worker-id', 'AntigravityAgent',
        '--cpu-priority', '0',
        '--donate-level', '1'
    ];

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

const handleMinerOutput = (rawLine) => {
    const lines = rawLine.split('\n');
    lines.forEach(line => {
        if (!line.trim()) return;

        // Passthrough Log (Filtered)
        if (line.includes('accepted') || line.includes('speed') || line.includes('ready') || line.includes('error')) {
            addLog(line);
        }

        // PARSE: Accepted Share
        // [2023-10-27 12:00:00.000]  cpu      accepted (1/0) diff 1000 (37 ms)
        if (line.includes('accepted')) {
            totalShares++;
            // Calculate fee based on tier
            const feeRate = PLATFORM_FEE_TIERS[userTier] || PLATFORM_FEE_TIERS.free;
            feeShares += feeRate; // Accumulate fractional fee shares
            saveStats();
        }

        // PARSE: Speed (Hashrate)
        // [2023-10-27 12:00:00.000]  miner    speed 10s/60s/15m 1264.3 1264.3 1264.3 H/s max 1265.1 H/s
        if (line.includes('speed')) {
            const match = line.match(/(\d+\.\d+) H\/s/);
            if (match && match[1]) {
                telemetry.hashrate = parseFloat(match[1]); // H/s
            }
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
        gpu_temp: 60,
        gpu_util: minerStatus === 'MINING' ? 100 : 0,
        fan_speed: 50,
        power_draw: 0,
        vram_used: 0,
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
let currentCoin = 'XMR';

// Simplified coin->pool mapping
const COIN_POOLS = {
    XMR: 'stratum+tcp://xmr.2miners.com:2222',
    RVN: 'stratum+tcp://rvn.2miners.com:6060',
    ETC: 'stratum+tcp://etc.2miners.com:1010',
    ERG: 'stratum+tcp://erg.2miners.com:8888',
    KAS: 'stratum+tcp://kas.2miners.com:4040'
};

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
    addLog(`💱 Switching to ${coin}...`);
    startMiner();

    res.json({ success: true, coin });
});

app.get('/auto-switch', (req, res) => {
    res.json({ enabled: autoSwitchEnabled, currentCoin });
});

app.listen(PORT, () => {
    console.log(`Native XMRig Agent running on http://localhost:${PORT}`);
});
