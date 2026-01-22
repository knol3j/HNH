/**
 * XmrMiner - XMRig wrapper for Monero (XMR) mining
 * Algorithm: RandomX (CPU optimized)
 */

import { BaseMiner } from './BaseMiner.js';

export class XmrMiner extends BaseMiner {
    constructor(config = {}) {
        super({
            coin: 'XMR',
            algorithm: 'rx/0',
            minerName: 'XMRig',
            binaryName: 'xmrig',
            apiPort: 4444,
            ...config
        });

        this.apiToken = config.apiToken || 'hnh_xmr_secret';
        this.donateLevel = config.donateLevel || 1;
    }

    /**
     * Build XMRig command line arguments
     */
    buildArgs() {
        // Strip protocol prefix for XMRig
        const cleanUrl = this.poolUrl
            .replace('stratum+tcp://', '')
            .replace('stratum+ssl://', '');

        const useTls = this.poolUrl.includes('ssl://') || this.poolUrl.includes(':443');

        const args = [
            '-o', cleanUrl,
            '-u', this.wallet,
            '-p', this.password,
            '-a', 'rx/0',
            '--no-color',
            '--http-host', '127.0.0.1',
            '--http-port', this.apiPort.toString(),
            '--http-access-token', this.apiToken,
            '--http-no-restricted',
            '--donate-level', this.donateLevel.toString()
        ];

        if (useTls) {
            args.push('--tls');
        }

        // Worker ID
        if (this.workerId) {
            args.push('--rig-id', this.workerId);
        }

        return args;
    }

    /**
     * Parse XMRig output
     */
    parseOutput(line) {
        this.addLog(line);

        // Detect accepted share
        if (line.includes('accepted')) {
            this.stats.acceptedShares++;
            this.stats.totalShares++;
        }

        // Detect rejected share
        if (line.includes('rejected')) {
            this.stats.rejectedShares++;
            this.stats.totalShares++;
        }

        // Parse hashrate from output (backup if API fails)
        const hrMatch = line.match(/speed\s+[\d.]+\s+[\d.]+\s+([\d.]+)\s+H\/s/);
        if (hrMatch) {
            this.telemetry.hashrate = parseFloat(hrMatch[1]);
        }
    }

    /**
     * Fetch telemetry from XMRig HTTP API
     */
    async fetchTelemetry() {
        if (this.status !== 'MINING') return;

        try {
            const data = await this.httpGet(this.apiPort, '/2/summary');

            // Hashrate
            if (data.hashrate?.total?.[0]) {
                this.telemetry.hashrate = data.hashrate.total[0];
            }

            // Connection info
            if (data.connection) {
                this.stats.acceptedShares = data.connection.accepted || 0;
                this.stats.rejectedShares = data.connection.rejected || 0;
            }

            // Health/hardware stats
            if (data.cpu) {
                // CPU doesn't typically have temp in XMRig, but check anyway
            }

        } catch (e) {
            // Silent fail - miner might be restarting
        }
    }

    /**
     * Kill any orphaned XMRig processes (Windows specific cleanup)
     */
    killOrphans() {
        if (process.platform === 'win32') {
            try {
                const { spawnSync } = require('child_process');
                spawnSync('taskkill', ['/IM', 'xmrig.exe', '/F'], { stdio: 'ignore' });
            } catch (e) {
                // Ignore errors
            }
        }
    }

    start() {
        this.killOrphans();
        return super.start();
    }
}

export default XmrMiner;
