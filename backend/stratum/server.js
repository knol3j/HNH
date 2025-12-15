
import net from 'net';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
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
                    // XMRig often sends { login: "wallet", pass: "x" } or ["wallet", "pass"]
                    let login = null;
                    if (msg.params && msg.params.login) {
                        login = msg.params.login;
                    } else if (Array.isArray(msg.params) && msg.params.length > 0) {
                        login = msg.params[0];
                    }

                    if (login) {
                        // Login might be "username" or "username.worker"
                        const parts = login.split('.');
                        const username = parts[0];
                        const workerName = parts[1] || 'default';

                        try {
                            // Find User
                            console.log(`[PROXY] miner login: ${username}`);
                            const userRes = await pool.query('SELECT id FROM "User" WHERE username = $1', [username]);

                            if (userRes.rows.length > 0) {
                                currentUserId = userRes.rows[0].id;
                                currentWorkerName = workerName;
                                console.log(`[PROXY] Identified user ${username} (ID: ${currentUserId})`);
                            } else {
                                console.log(`[PROXY] User ${username} not found in DB`);
                            }
                        } catch (err) {
                            console.error('[PROXY] Login lookup error:', err);
                        }
                    }
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
                    try {
                        // We need a userId to associate the share. 
                        // For MVP without strict login, we might skip or use a default if not logged in.
                        // Assuming login happened and we have currentUserId
                        if (currentUserId) {
                            await pool.query(
                                'INSERT INTO "Share" ("id", "workerId", "userId", "difficulty", "accepted", "timestamp") VALUES ($1, $2, $3, $4, $5, NOW())',
                                [crypto.randomUUID(), workerId, currentUserId, 1.0, true]
                            );
                        }
                    } catch (dbErr) {
                        console.error('[PROXY] DB Error:', dbErr);
                    }
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

server.listen(PROXY_PORT, () => {
    console.log(`Stratum Proxy listening on port ${PROXY_PORT}`);
});
