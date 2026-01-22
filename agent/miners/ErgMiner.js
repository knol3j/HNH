/**
 * ErgMiner - lolMiner wrapper for Ergo (ERG) mining
 * Algorithm: Autolykos2 (GPU)
 */

import { BaseMiner } from './BaseMiner.js';

export class ErgMiner extends BaseMiner {
    constructor(config = {}) {
        super({
            coin: 'ERG',
            algorithm: 'autolykos2',
            minerName: 'lolMiner',
            binaryName: 'lolMiner',
            apiPort: 4069,
            ...config
        });
    }

    /**
     * Build lolMiner command line arguments for Autolykos2
     */
    buildArgs() {
        // lolMiner format: --pool stratum+tcp://host:port --user wallet
        let poolUrl = this.poolUrl;
        if (!poolUrl.includes('://')) {
            poolUrl = `stratum+tcp://${poolUrl}`;
        }

        const args = [
            '--algo', 'AUTOLYKOS2',
            '--pool', poolUrl,
            '--user', this.wallet,
            '--pass', this.password,
            '--apiport', this.apiPort.toString(),
            '--apihost', '127.0.0.1'
        ];

        // Worker name
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

        // lolMiner share accepted
        if (line.includes('Share accepted') || line.includes('Accepted')) {
            this.stats.acceptedShares++;
            this.stats.totalShares++;
        }

        // lolMiner share rejected
        if (line.includes('Share rejected') || line.includes('Rejected')) {
            this.stats.rejectedShares++;
            this.stats.totalShares++;
        }

        // Parse hashrate
        const hrMatch = line.match(/Total\s+([\d.]+)\s*(MH|GH|KH)\/s/i);
        if (hrMatch) {
            let hashrate = parseFloat(hrMatch[1]);
            const unit = hrMatch[2].toUpperCase();
            if (unit === 'GH') hashrate *= 1000000000;
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

            // lolMiner API format
            if (data.Session?.Performance_Summary) {
                this.telemetry.hashrate = data.Session.Performance_Summary * 1000000; // MH/s to H/s
            }

            if (data.Session?.Accepted) {
                this.stats.acceptedShares = data.Session.Accepted;
            }
            if (data.Session?.Rejected) {
                this.stats.rejectedShares = data.Session.Rejected;
            }

            // GPU stats
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
        if (process.platform === 'win32') {
            try {
                const { spawnSync } = require('child_process');
                spawnSync('taskkill', ['/IM', 'lolMiner.exe', '/F'], { stdio: 'ignore' });
            } catch (e) {}
        }
    }

    start() {
        this.killOrphans();
        return super.start();
    }
}

export default ErgMiner;
