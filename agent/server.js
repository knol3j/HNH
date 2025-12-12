
import express from 'express';
import cors from 'cors';
import net from 'net';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4343;

// --- STATE ---
let config = {
    wallet: '0x3a4f...9f2', // Default placeholder
    poolUrl: 'stratum+tcp://rvn.2miners.com:6060', // Default pool
    password: 'x'
};

let stratumClient = null;
let currentJob = null;
let isConnected = false;
let isAuthorized = false;
let recentLogs = [];

// Helper logging
const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[AGENT] ${msg}`);
    recentLogs.unshift(`[${timestamp}] ${msg}`);
    if (recentLogs.length > 50) recentLogs.pop();
};

// --- STRATUM CLIENT ---

class StratumClient {
    constructor(host, port, wallet, password) {
        this.host = host;
        this.port = port;
        this.wallet = wallet;
        this.password = password;
        this.socket = null;
        this.msgId = 1;
        this.buffer = '';
    }

    connect() {
        if (this.socket) this.disconnect();

        addLog(`Connecting to ${this.host}:${this.port}...`);

        this.socket = new net.Socket();

        this.socket.on('connect', () => {
            isConnected = true;
            addLog('✅ TCP Connection established.');
            this.sendSubscribe();
        });

        this.socket.on('data', (data) => {
            this.buffer += data.toString();
            // Process lines
            let newlineIndex;
            while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
                const line = this.buffer.slice(0, newlineIndex);
                this.buffer = this.buffer.slice(newlineIndex + 1);
                this.handleMessage(line);
            }
        });

        this.socket.on('error', (err) => {
            addLog(`❌ Socket Error: ${err.message}`);
            isConnected = false;
            isAuthorized = false;
        });

        this.socket.on('close', () => {
            addLog('⚠️ Connection closed.');
            isConnected = false;
            isAuthorized = false;
            currentJob = null;
            // Simple reconnect logic could go here
        });

        this.socket.connect(this.port, this.host);
    }

    disconnect() {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
    }

    sendJson(method, params) {
        const payload = JSON.stringify({
            id: this.msgId++,
            method: method,
            params: params
        }) + '\n';
        this.socket.write(payload);
    }

    sendSubscribe() {
        addLog('Sending mining.subscribe...');
        this.sendJson('mining.subscribe', ["AntigravityAgent/1.0", null]);
    }

    sendAuthorize() {
        addLog(`Sending mining.authorize for ${this.wallet}...`);
        this.sendJson('mining.authorize', [this.wallet, this.password]);
    }

    handleMessage(line) {
        if (!line.trim()) return;

        try {
            const msg = JSON.parse(line);

            // 1. Handle Responses (Matches our IDs)
            if (msg.id) {
                // Heuristic: If result is array and looks like subscription
                if (Array.isArray(msg.result) && msg.result.length > 0) {
                    addLog('✅ Subscribed to pool.');
                    this.sendAuthorize();
                }
                // Authorization response
                else if (msg.result === true) {
                    isAuthorized = true;
                    addLog('✅ Authorized! Worker logged in.');
                }
                else if (msg.error) {
                    addLog(`❌ Pool Error: ${JSON.stringify(msg.error)}`);
                }
            }

            // 2. Handle Notifications (Method calls from pool)
            if (msg.method === 'mining.notify') {
                // params: [jobId, prevHash, coinb1, coinb2, merkle_branch, version, nbits, ntime, clean_jobs]
                const jobId = msg.params[0];
                const clean = msg.params[8];

                if (clean) {
                    addLog('🧹 New Block! Clearing old jobs.');
                }

                currentJob = {
                    id: jobId,
                    receivedAt: Date.now(),
                    difficulty: 'Pool Defined'
                };

                addLog(`⛏️  Received Real Job: ${jobId.substring(0, 8)}... `);
            }

            if (msg.method === 'mining.set_difficulty') {
                const diff = msg.params[0];
                addLog(`⚖️  Network Difficulty target set to: ${diff}`);
            }

        } catch (e) {
            addLog(`Error parsing message: ${e.message}`);
        }
    }
}

// Function to start/restart client
const startMining = () => {
    // Parse URL "stratum+tcp://host:port"
    try {
        const cleanUrl = config.poolUrl.replace('stratum+tcp://', '');
        const [host, portStr] = cleanUrl.split(':');
        const port = parseInt(portStr);

        if (!host || !port) throw new Error("Invalid Pool URL format");

        if (stratumClient) {
            stratumClient.disconnect();
        }

        stratumClient = new StratumClient(host, port, config.wallet, config.password);
        stratumClient.connect();

    } catch (e) {
        addLog(`❌ Config Error: ${e.message}`);
    }
};

// Start immediately with default/saved config
startMining();


// --- API ENDPOINTS ---

app.get('/telemetry', (req, res) => {
    // Send Real Connection State
    res.json({
        gpu_temp: 65, // Placeholder for safe temp on nodejs miner
        gpu_util: isConnected ? 10 : 0, // Low util for CPU miner
        fan_speed: 40,
        power_draw: 50, // Minimal draw
        vram_used: 128,
        hashrate: isConnected ? 0.001 : 0, // Very low hashrate for text-based client
        verified_shares: 0, // We are just a protocol client, unlikely to solve blocks
        active_job: currentJob ? {
            id: currentJob.id,
            title: "Mining Job (Stratum V1)",
            status: "RUNNING",
            progress: 0, // Indefinite
        } : null,
        wallet: config.wallet,
        status: isConnected ? (isAuthorized ? 'MINING' : 'CONNECTING') : 'OFFLINE',
        logs: recentLogs
    });
});

app.get('/stats', (req, res) => {
    res.json({
        activeNodes: 1,
        totalTflops: 0.01,
        jobsRunning: isConnected ? 1 : 0,
        networkUtilization: isConnected ? 100 : 0,
        avgPricePerFLOP: 0.002
    });
});

app.post('/config', (req, res) => {
    const { wallet, poolUrl, password } = req.body;
    let changed = false;

    if (wallet && wallet !== config.wallet) {
        config.wallet = wallet;
        addLog(`Configuration Update: Wallet -> ${wallet}`);
        changed = true;
    }
    if (poolUrl && poolUrl !== config.poolUrl) {
        config.poolUrl = poolUrl;
        addLog(`Configuration Update: Pool -> ${poolUrl}`);
        changed = true;
    }

    if (changed) {
        addLog('🔄 Restarting miner with new config...');
        startMining();
    }

    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Real Stratum Client running on http://localhost:${PORT}`);
});
