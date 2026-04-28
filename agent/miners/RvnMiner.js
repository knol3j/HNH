/**
 * RvnMiner - T-Rex wrapper for Ravencoin (RVN) mining
 * Algorithm: KawPow (GPU - NVIDIA optimized)
 */

import { BaseMiner } from './BaseMiner.js';

export class RvnMiner extends BaseMiner {
    constructor(config = {}) {
        super({
            coin: 'RVN',
            algorithm: 'kawpow',
            minerName: 'T-Rex',
            binaryName: 't-rex',
            apiPort: 4067,
            ...config
        });
    }

    /**
     * Build T-Rex command line arguments for KawPow
     */
    buildArgs() {
        // T-Rex wants the full URL
        let poolUrl = this.poolUrl;
        if (!poolUrl.includes('://')) {
            poolUrl = `stratum+tcp://${poolUrl}`;
        }

        const args = [
            '-a', 'kawpow',
            '-o', poolUrl,
            '-u', this.wallet,
            '-p', this.password,
            '--api-bind-http', `127.0.0.1:${this.apiPort}`,
            '--no-watchdog'
        ];

        // Worker name
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

        // Detect accepted share
        if (line.includes('OK') && line.includes('share')) {
            this.stats.acceptedShares++;
            this.stats.totalShares++;
        }

        // Detect rejected share
        if (line.includes('REJECTED') || line.includes('rejected')) {
            this.stats.rejectedShares++;
            this.stats.totalShares++;
        }

        // Parse hashrate from output
        const hrMatch = line.match(/([\d.]+)\s*MH\/s/i);
        if (hrMatch) {
            this.telemetry.hashrate = parseFloat(hrMatch[1]) * 1000000; // Convert to H/s
        }
    }

    /**
     * Fetch telemetry from T-Rex HTTP API
     */
    async fetchTelemetry() {
        if (this.status !== 'MINING') return;

        try {
            const data = await this.httpGet(this.apiPort, '/summary');

            // Hashrate (T-Rex reports in H/s)
            if (data.hashrate) {
                this.telemetry.hashrate = data.hashrate;
            }

            // Shares
            if (data.accepted_count !== undefined) {
                this.stats.acceptedShares = data.accepted_count;
            }
            if (data.rejected_count !== undefined) {
                this.stats.rejectedShares = data.rejected_count;
            }

            // GPU stats (first GPU)
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

    /**
     * Kill orphaned T-Rex processes
     */
    killOrphans() {
        this.killOrphanedProcesses(['t-rex.exe']);
    }

    start() {
        this.killOrphans();
        return super.start();
    }
}

export default RvnMiner;
