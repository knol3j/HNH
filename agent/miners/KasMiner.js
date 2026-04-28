/**
 * KasMiner - lolMiner wrapper for Kaspa (KAS) mining
 * Algorithm: kHeavyHash (GPU)
 */

import { BaseMiner } from './BaseMiner.js';

export class KasMiner extends BaseMiner {
    constructor(config = {}) {
        super({
            coin: 'KAS',
            algorithm: 'kheavyhash',
            minerName: 'lolMiner',
            binaryName: 'lolMiner',
            apiPort: 4070,
            ...config
        });
    }

    /**
     * Build lolMiner command line arguments for kHeavyHash
     */
    buildArgs() {
        let poolUrl = this.poolUrl;
        if (!poolUrl.includes('://')) {
            poolUrl = `stratum+tcp://${poolUrl}`;
        }

        const args = [
            '--algo', 'KASPA',
            '--pool', poolUrl,
            '--user', this.wallet,
            '--pass', this.password,
            '--apiport', this.apiPort.toString(),
            '--apihost', '127.0.0.1'
        ];

        if (this.workerId) {
            args.push('--worker', this.workerId);
        }

        return args;
    }

    /**
     * Parse lolMiner output
     */
    parseOutput(line) {
        this.addLog(line);

        if (line.includes('Share accepted') || line.includes('Accepted')) {
            this.stats.acceptedShares++;
            this.stats.totalShares++;
        }

        if (line.includes('Share rejected') || line.includes('Rejected')) {
            this.stats.rejectedShares++;
            this.stats.totalShares++;
        }

        // Parse hashrate (KAS is typically GH/s range)
        const hrMatch = line.match(/Total\s+([\d.]+)\s*(GH|MH|KH|TH)\/s/i);
        if (hrMatch) {
            let hashrate = parseFloat(hrMatch[1]);
            const unit = hrMatch[2].toUpperCase();
            if (unit === 'TH') hashrate *= 1000000000000;
            else if (unit === 'GH') hashrate *= 1000000000;
            else if (unit === 'MH') hashrate *= 1000000;
            else if (unit === 'KH') hashrate *= 1000;
            this.telemetry.hashrate = hashrate;
        }
    }

    /**
     * Fetch telemetry from lolMiner HTTP API
     */
    async fetchTelemetry() {
        if (this.status !== 'MINING') return;

        try {
            const data = await this.httpGet(this.apiPort, '/summary');

            if (data.Session?.Performance_Summary) {
                // lolMiner reports in MH/s for KAS
                this.telemetry.hashrate = data.Session.Performance_Summary * 1000000;
            }

            if (data.Session?.Accepted) {
                this.stats.acceptedShares = data.Session.Accepted;
            }
            if (data.Session?.Rejected) {
                this.stats.rejectedShares = data.Session.Rejected;
            }

            if (data.GPUs && data.GPUs.length > 0) {
                const gpu = data.GPUs[0];
                this.telemetry.temp = gpu.Temp_Sensor || 0;
                this.telemetry.power = gpu.Power || 0;
                this.telemetry.fan = gpu.Fan || 0;
            }

        } catch (e) {
            // Silent fail
        }
    }

    killOrphans() {
        this.killOrphanedProcesses(['lolMiner.exe']);
    }

    start() {
        this.killOrphans();
        return super.start();
    }
}

export default KasMiner;
