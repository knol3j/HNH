
import net from 'net';
import http from 'http';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const PROXY_PORT = process.env.PORT || 3333;
const UPSTREAM_HOST = process.env.UPSTREAM_HOST || 'rvn.2miners.com';
const UPSTREAM_PORT = process.env.UPSTREAM_PORT || 6060;

// Fee config
const FEE_PERCENT = 0.02; // 2%
let shareCounter = 0;

const server = net.createServer((minerSocket) => {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    console.log(`[PROXY] New miner connected: ${workerId}`);

    const upstreamSocket = new net.Socket();
    upstreamSocket.connect(UPSTREAM_PORT, UPSTREAM_HOST);

    let currentUserId = null;
    let currentWorkerName = 'Unknown';

    // Miner -> Upstream
    minerSocket.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        lines.forEach(async (line) => {
            try {
                const msg = JSON.parse(line);

                // Capture Login to associate Socket with User
                if (msg.method === 'login' || msg.method === 'submitLogin') {
                    // Wallet address might be passed here.
                    // For HNH, we expect "username" or "wallet" in the login param
                    // msg.params.login
                    // We need to parse this to map to our DB User
                }

                upstreamSocket.write(line + '\n');
            } catch (e) {
                upstreamSocket.write(line + '\n');
            }
        });
    });

    // Upstream -> Miner
    upstreamSocket.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        lines.forEach(async (line) => {
            try {
                // Check if Share Accepted
                // Stratum v1: { id: ..., result: true, error: null }
                const msg = JSON.parse(line);

                if (msg.result === true && msg.id) {
                    // This is a response. If it corresponds to a submit...
                    // In a real proxy we map IDs. For this MVP we assume "result: true" is a share accept.
                    // Ideally we track the request ID 'mining.submit'.
                    console.log(`[PROXY] Share accepted for ${workerId}`);

                    // SAVE SHARE TO DB
                    /*
                    await pool.query(
                        'INSERT INTO "Share" ("id", "workerId", "userId", "difficulty", "accepted") VALUES ($1, $2, $3, $4, $5)',
                        [crypto.randomUUID(), workerId, userId, 1.0, true]
                    );
                    */
                }

                minerSocket.write(line + '\n');
            } catch (e) {
                minerSocket.write(line + '\n');
            }
        });
    });

    minerSocket.on('error', () => { upstreamSocket.destroy(); });
    minerSocket.on('close', () => { upstreamSocket.destroy(); });
    upstreamSocket.on('error', () => { minerSocket.destroy(); });
    upstreamSocket.on('close', () => { minerSocket.destroy(); });
});

// Health check endpoint for Railway (HTTP server for health checks)
const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'hnh-stratum-proxy', port: PROXY_PORT }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

const HEALTH_PORT = process.env.HEALTH_PORT || 3334;
healthServer.listen(HEALTH_PORT, () => {
    console.log(`Health check server listening on port ${HEALTH_PORT}`);
});

server.listen(PROXY_PORT, () => {
    console.log(`Stratum Proxy listening on port ${PROXY_PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});
