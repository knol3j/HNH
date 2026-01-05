/**
 * Stratum Proxy Server
 * 
 * This proxy sits between miners and the upstream pool.
 * Miners connect to this proxy -> Proxy connects to the real pool.
 * 
 * Benefits:
 * 1. Aggregate hashrate under one account (better pool stats)
 * 2. Apply platform fee before forwarding shares
 * 3. Log all traffic for analytics
 */

import net from 'net';
import { EventEmitter } from 'events';

const PROXY_PORT = 3333;
const DEFAULT_UPSTREAM_HOST = 'xmr.2miners.com';
const DEFAULT_UPSTREAM_PORT = 2222;

class StratumProxy extends EventEmitter {
    constructor(upstreamHost, upstreamPort, platformWallet) {
        super();
        this.upstreamHost = upstreamHost;
        this.upstreamPort = upstreamPort;
        this.platformWallet = platformWallet;
        this.clients = new Map(); // worker_id -> { minerSocket, upstreamSocket }
        this.stats = {
            totalShares: 0,
            feeShares: 0,
            activeWorkers: 0
        };
    }

    start() {
        const server = net.createServer((minerSocket) => {
            this.handleMinerConnection(minerSocket);
        });

        server.listen(PROXY_PORT, () => {
            console.log(`[PROXY] Stratum Proxy listening on port ${PROXY_PORT}`);
            console.log(`[PROXY] Forwarding to ${this.upstreamHost}:${this.upstreamPort}`);
        });
    }

    handleMinerConnection(minerSocket) {
        const workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        console.log(`[PROXY] New miner connected: ${workerId}`);
        this.stats.activeWorkers++;

        // Connect to upstream pool
        const upstreamSocket = new net.Socket();
        upstreamSocket.connect(this.upstreamPort, this.upstreamHost);

        this.clients.set(workerId, { minerSocket, upstreamSocket });

        // Miner -> Proxy -> Pool
        minerSocket.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => {
                try {
                    const msg = JSON.parse(line);
                    console.log(`[M->P] ${workerId}: ${msg.method || 'response'}`);

                    // Rewrite wallet for authorize (optional: use platform wallet for poolside aggregation)
                    // For now, pass through as-is
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
                    console.log(`[P->M] ${workerId}: ${msg.method || 'response'}`);

                    // Track accepted shares
                    if (msg.result === true && !msg.method) {
                        this.stats.totalShares++;
                        this.stats.feeShares += 0.02; // 2% fee
                        console.log(`[PROXY] Share accepted! Total: ${this.stats.totalShares}`);
                    }

                    minerSocket.write(line + '\n');
                } catch (e) {
                    minerSocket.write(line + '\n');
                }
            });
        });

        // Cleanup
        minerSocket.on('close', () => {
            console.log(`[PROXY] Miner disconnected: ${workerId}`);
            upstreamSocket.destroy();
            this.clients.delete(workerId);
            this.stats.activeWorkers--;
        });

        minerSocket.on('error', (err) => {
            console.error(`[PROXY] Miner error: ${err.message}`);
        });

        upstreamSocket.on('error', (err) => {
            console.error(`[PROXY] Upstream error: ${err.message}`);
            minerSocket.end();
        });

        upstreamSocket.on('close', () => {
            minerSocket.end();
        });
    }

    getStats() {
        return this.stats;
    }
}

// Start proxy if run directly
const proxy = new StratumProxy(DEFAULT_UPSTREAM_HOST, DEFAULT_UPSTREAM_PORT, null);
proxy.start();

export default StratumProxy;
