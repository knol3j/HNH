/**
 * BaseMiner - Abstract base class for all miner implementations
 * Each coin-specific miner extends this class
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';

export class BaseMiner {
    constructor(config = {}) {
        this.coin = config.coin || 'UNKNOWN';
        this.algorithm = config.algorithm || 'unknown';
        this.minerName = config.minerName || 'unknown';
        this.binaryName = config.binaryName || 'miner';
        this.apiPort = config.apiPort || 4444;

        this.process = null;
        this.status = 'OFFLINE';
        this.logs = [];
        this.maxLogs = 50;

        this.telemetry = {
            hashrate: 0,
            temp: 0,
            power: 0,
            fan: 0
        };

        this.stats = {
            totalShares: 0,
            acceptedShares: 0,
            rejectedShares: 0
        };

        // Pool and wallet config
        this.poolUrl = config.poolUrl || '';
        this.wallet = config.wallet || '';
        this.password = config.password || 'x';
        this.workerId = config.workerId || 'HNH_Worker';

        // Paths
        this.binDir = config.binDir || path.join(process.cwd(), 'bin');
    }

    /**
     * Get the full path to the miner binary
     */
    getBinaryPath() {
        const ext = process.platform === 'win32' ? '.exe' : '';
        return path.join(this.binDir, `${this.binaryName}${ext}`);
    }

    /**
     * Check if miner binary exists
     */
    isBinaryInstalled() {
        return fs.existsSync(this.getBinaryPath());
    }

    /**
     * Build command line arguments - MUST be overridden by subclass
     */
    buildArgs() {
        throw new Error('buildArgs() must be implemented by subclass');
    }

    /**
     * Parse miner output line - MUST be overridden by subclass
     */
    parseOutput(line) {
        throw new Error('parseOutput() must be implemented by subclass');
    }

    /**
     * Fetch telemetry from miner API - Override in subclass if miner has HTTP API
     */
    async fetchTelemetry() {
        // Default: no-op, subclass can override
    }

    /**
     * Add a log entry
     */
    addLog(msg) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `[${timestamp}] [${this.coin}] ${msg}`;
        console.log(entry);
        this.logs.unshift(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }
    }

    /**
     * Start the miner
     */
    start() {
        this.stop(); // Ensure clean state

        if (!this.isBinaryInstalled()) {
            this.addLog(`Binary not found: ${this.getBinaryPath()}`);
            this.status = 'ERROR';
            return false;
        }

        const args = this.buildArgs();
        this.addLog(`Starting ${this.minerName} for ${this.coin}...`);
        this.addLog(`Pool: ${this.poolUrl}`);
        this.addLog(`Wallet: ${this.wallet.substring(0, 12)}...`);

        this.status = 'STARTING';

        try {
            this.process = spawn(this.getBinaryPath(), args, {
                cwd: this.binDir
            });

            this.process.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        this.parseOutput(line.trim());
                    }
                });
            });

            this.process.stderr.on('data', (data) => {
                this.addLog(`[ERR] ${data.toString().trim()}`);
            });

            this.process.on('close', (code) => {
                this.addLog(`Miner exited with code ${code}`);
                this.status = 'OFFLINE';
                this.telemetry.hashrate = 0;
                this.process = null;
            });

            this.process.on('error', (err) => {
                this.addLog(`Failed to start: ${err.message}`);
                this.status = 'ERROR';
            });

            this.status = 'MINING';
            return true;

        } catch (e) {
            this.addLog(`Exception starting miner: ${e.message}`);
            this.status = 'ERROR';
            return false;
        }
    }

    /**
     * Stop the miner
     */
    stop() {
        if (this.process) {
            try {
                if (process.platform === 'win32') {
                    spawn('taskkill', ['/PID', this.process.pid.toString(), '/F', '/T']);
                } else {
                    this.process.kill('SIGKILL');
                }
            } catch (e) {
                console.error(`Failed to kill ${this.minerName}:`, e);
            }
            this.process = null;
        }
        this.status = 'OFFLINE';
        this.telemetry.hashrate = 0;
    }

    /**
     * Check if miner is running
     */
    isRunning() {
        return this.process !== null && this.status === 'MINING';
    }

    /**
     * Get current state
     */
    getState() {
        return {
            coin: this.coin,
            algorithm: this.algorithm,
            minerName: this.minerName,
            status: this.status,
            telemetry: this.telemetry,
            stats: this.stats,
            logs: this.logs,
            poolUrl: this.poolUrl,
            wallet: this.wallet
        };
    }

    /**
     * Update configuration
     */
    updateConfig(config) {
        if (config.poolUrl) this.poolUrl = config.poolUrl;
        if (config.wallet) this.wallet = config.wallet;
        if (config.password) this.password = config.password;
        if (config.workerId) this.workerId = config.workerId;
    }

    /**
     * Helper to make HTTP request to miner API
     */
    httpGet(port, path, useHttps = false) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: '127.0.0.1',
                port: port,
                path: path,
                method: 'GET',
                timeout: 5000
            };

            const client = useHttps ? https : http;
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.end();
        });
    }
}

export default BaseMiner;
