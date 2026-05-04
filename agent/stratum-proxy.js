/**
 * Stratum Proxy Server
 * 
 * This proxy sits between miners and the upstream pool.
 * Miners connect to this proxy -> Proxy connects to the real pool.
 * 
 * Inspired by MinerGate's approach: simple, reliable, with automatic failover.
 */

import net from 'net';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PROXY_PORT = 3333;
const STATS_FILE = path.join(__dirname, 'proxy_stats.json');

class StratumProxy extends EventEmitter {
    constructor(options = {}) {
        super();
        this.proxyPort = options.proxyPort || DEFAULT_PROXY_PORT;
        this.upstreamHost = options.upstreamHost || 'xmr.2miners.com';
        this.upstreamPort = options.upstreamPort || 2222;
        this.platformWallet = options.platformWallet || null;
        this.stats = {
            totalShares: 0,
            feeShares: 0,
            activeWorkers: 0,
            startTime: Date.now()
        };
        this.clients = new Map();
        this.upstreamSocket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
    }

    start() {
        // Load persisted stats
        this.loadStats();

        const server = net.createServer((minerSocket) => {
            this.handleMinerConnection(minerSocket);
        });

        server.on('error', (err) => {
            console.error(`[PROXY] Server error: ${err.message}`);
            this.scheduleReconnect();
        });

        server.listen(this.proxyPort, () => {
            console.log(`[PROXY] Stratum Proxy listening on port ${this.proxyPort}`);
            console.log(`[PROXY] Forwarding to ${this.upstreamHost}:${this.upstreamPort}`);
        });

        this.server = server;
        this.saveStats();
    }

    loadStats() {
        try {
            if (fs.existsSync(STATS_FILE)) {
                const data = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
                this.stats = { ...this.stats, ...data };
            }
        } catch (e) {
            console.error('[PROXY] Failed to load stats:', e.message);
        }
    }

    saveStats() {
        try {
            fs.writeFileSync(STATS_FILE, JSON.stringify(this.stats));
        } catch (e) {
            // Ignore save errors
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(5000 * this.reconnectAttempts, 30000);
            console.log(`[PROXY] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.start(), delay);
        }
    }

    handleMinerConnection(minerSocket) {
        const workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        console.log(`[PROXY] New miner connected: ${workerId}`);
        this.stats.activeWorkers++;

        // Connect to upstream pool with retry logic
        this.connectUpstream((upstreamSocket) => {
            if (!upstreamSocket) {
                minerSocket.end();
                return;
            }

            this.clients.set(workerId, { minerSocket, upstreamSocket });
            console.log(`[PROXY] Connected ${workerId} to upstream pool`);

            // Miner -> Proxy -> Pool
            minerSocket.on('data', (data) => {
                const lines = data.toString().split('\n').filter(l => l.trim());
                lines.forEach(line => {
                    try {
                        const msg = JSON.parse(line);
                        upstreamSocket.write(line + '\n');
                    } catch (e) {
                        upstreamSocket.write(line + '\n');
                    }
                });
            });

            // Pool -> Proxy -> Miner
            upstreamSocket.on('data', (data) => {
                const lines = data.toString().split('\n').filter(l => l.trim());
                lines.forEach(line => {
                    try {
                        const msg = JSON.parse(line);
                        // Track accepted shares for telemetry
                        if (msg.result === true && !msg.id && !msg.method) {
                            this.stats.totalShares++;
                            this.saveStats();
                        }
                        minerSocket.write(line + '\n');
                    } catch (e) {
                        minerSocket.write(line + '\n');
                    }
                });
            });

            const cleanup = () => {
                console.log(`[PROXY] Miner disconnected: ${workerId}`);
                upstreamSocket.destroy();
                this.clients.delete(workerId);
                this.stats.activeWorkers = Math.max(0, this.stats.activeWorkers - 1);
            };

            minerSocket.on('close', cleanup);
            minerSocket.on('error', cleanup);
            upstreamSocket.on('error', cleanup);
        });
    }

    connectUpstream(callback) {
        const upstreamSocket = new net.Socket();
        
        upstreamSocket.setTimeout(10000);
        
        upstreamSocket.connect(this.upstreamPort, this.upstreamHost, () => {
            this.reconnectAttempts = 0;
            callback(upstreamSocket);
        });

        upstreamSocket.on('error', (err) => {
            console.error(`[PROXY] Upstream connection error: ${err.message}`);
            callback(null);
        });

        upstreamSocket.on('timeout', () => {
            console.error('[PROXY] Upstream connection timeout');
            upstreamSocket.destroy();
            callback(null);
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
        }
        for (const { upstreamSocket } of this.clients.values()) {
            upstreamSocket.destroy();
        }
        this.clients.clear();
    }

    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.startTime,
            activeWorkers: this.stats.activeWorkers
        };
    }
}

// Start proxy if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const proxy = new StratumProxy();
    proxy.start();
}

export default StratumProxy;
