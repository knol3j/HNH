/**
 * ErgMiner - T-Rex wrapper for Ergo (ERG) mining
 * Algorithm: Autolykos2 (GPU - NVIDIA optimized)
 */

import { BaseMiner } from './BaseMiner.js';

export class ErgMiner extends BaseMiner {
    constructor(config = {}) {
        super({
            coin: 'ERG',
            algorithm: 'autolykos2',
            minerName: 'T-Rex',
            binaryName: 't-rex',
            apiPort: 4069,
            ...config
        });
    }

    /**
     * SECURITY NOTE: T-Rex miner API is unauthenticated by design (no HTTP auth).
     * It only listens on 127.0.0.1, so this is low risk on single-user systems.
     * On multi-tenant or shared-infra setups, consider a local firewall rule
     * or reverse-proxy with basic auth to protect the API endpoint.
     * Build T-Rex arguments for Ergo (Autolykos2)
     */
    buildArgs() {
        let poolUrl = this.poolUrl;
        if (!poolUrl.includes('://')) {
            poolUrl = `stratum+tcp://${poolUrl}`;
        }

        const args = [
            '-a', 'autolykos2',
            '-o', poolUrl,
            '-u', this.wallet,
            '-p', this.password,
            '--api-bind-http', `127.0.0.1:${this.apiPort}`,
            '--no-watchdog'
        ];

        if (this.workerId) {
            args.push('-w', this.workerId);
        }

        return args;
    }

    /**
     * Parse T-Rex output
     */
    parseOutput(line) {
        this.addLog(line);

        // Detect accepted shares from either "accepted: N/M" or "SHARE OK" format
        if (line.includes('accepted') || (line.includes('OK') && /share/i.test(line))) {
            this.stats.acceptedShares++;
            this.stats.totalShares++;
        }

        // Detect rejected shares (uppercase REJECTED only to avoid double-counting
        // with the 'rejected: N/M' summary line that follows the same share)
        if (line.includes('REJECTED')) {
            this.stats.rejectedShares++;
            this.stats.totalShares++;
        }

        // Parse hashrate: sum all GPU MH/s values for total system hashrate
        const hrMatches = line.matchAll(/([\d.]+)\s*MH\/s/gi);
        let totalMh = 0;
        for (const match of hrMatches) {
            totalMh += parseFloat(match[1]);
        }
        if (totalMh > 0) {
            this.telemetry.hashrate = totalMh * 1000000; // Convert to H/s
        }
    }

    /**
     * Fetch telemetry from T-Rex HTTP API
     */
    async fetchTelemetry() {
        if (this.status !== 'MINING') return;

        try {
            const data = await this.httpGet(this.apiPort, '/summary');

            if (data.hashrate) {
                this.telemetry.hashrate = data.hashrate;
            }

            if (data.accepted_count !== undefined) {
                this.stats.acceptedShares = data.accepted_count;
            }
            if (data.rejected_count !== undefined) {
                this.stats.rejectedShares = data.rejected_count;
            }

            if (data.gpus && data.gpus.length > 0) {
                const gpu = data.gpus[0];
                this.telemetry.temp = gpu.temperature || 0;
                this.telemetry.power = gpu.power || 0;
                this.telemetry.fan = gpu.fan_speed || 0;
            }

        } catch (e) {
            // Silent fail
        }
    }

    killOrphans() {
        this.killOrphanedProcesses(['t-rex.exe']);
    }

    start() {
        this.killOrphans();
        return super.start();
    }
}

export default ErgMiner;
