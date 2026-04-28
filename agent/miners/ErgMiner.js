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
     * Build T-Rex command line arguments for Autolykos2
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

        if (line.includes('OK') && line.includes('share')) {
            this.stats.acceptedShares++;
            this.stats.totalShares++;
        }

        if (line.includes('REJECTED') || line.includes('rejected')) {
            this.stats.rejectedShares++;
            this.stats.totalShares++;
        }

        const hrMatch = line.match(/([\d.]+)\s*MH\/s/i);
        if (hrMatch) {
            this.telemetry.hashrate = parseFloat(hrMatch[1]) * 1000000;
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
