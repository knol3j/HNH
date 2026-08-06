
import net from 'net';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const PROXY_PORT = process.env.PORT || 3333;

// DePIN Compute Telemetry & Cluster Command Relay Node
console.log(`[DEPIN RELAY] Starting Compute Telemetry Relay on port ${PROXY_PORT}...`);

const server = net.createServer((nodeSocket) => {
    const nodeRelayId = `relay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    console.log(`[DEPIN RELAY] Compute Node worker connected: ${nodeRelayId}`);

    nodeSocket.on('data', (data) => {
        try {
            const telemetry = JSON.parse(data.toString().trim());
            console.log(`[DEPIN RELAY] Node Telemetry received from ${nodeRelayId}:`, telemetry);
            nodeSocket.write(JSON.stringify({ status: 'ACK', relayId: nodeRelayId, timestamp: Date.now() }) + '\n');
        } catch (err) {
            // Buffer streaming line support
        }
    });

    nodeSocket.on('close', () => {
        console.log(`[DEPIN RELAY] Node worker disconnected: ${nodeRelayId}`);
    });
});

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
