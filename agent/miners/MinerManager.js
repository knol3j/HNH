/**
 * MinerManager - Manages multiple miners and handles coin switching
 * Only one miner runs at a time, but each coin has its dedicated miner
 */

import path from 'path';
import { XmrMiner } from './XmrMiner.js';
import { RvnMiner } from './RvnMiner.js';
import { EtcMiner } from './EtcMiner.js';
import { ErgMiner } from './ErgMiner.js';
import { KasMiner } from './KasMiner.js';
import { COIN_CONFIG } from './index.js';

export class MinerManager {
    constructor(config = {}) {
        this.binDir = config.binDir || path.join(process.cwd(), 'bin');
        this.wallets = config.wallets || {};
        this.workerId = config.workerId || 'HNH_Worker';

        // Platform fee config
        this.feeTiers = {
            free: 0.02,
            pro: 0.01,
            enterprise: 0.005
        };
        this.userTier = config.userTier || 'free';

        // Stats tracking
        this.totalSharesAllCoins = 0;
        this.feeShares = 0;

        // Active miner tracking
        this.activeMiner = null;
        this.activeCoin = null;

        // Initialize miners (lazy - created on demand)
        this.miners = {};

        // Telemetry polling interval
        this.telemetryInterval = null;
    }

    /**
     * Get or create miner instance for a coin
     */
    getMiner(coin) {
        coin = coin.toUpperCase();

        if (!COIN_CONFIG[coin]) {
            throw new Error(`Unknown coin: ${coin}`);
        }

        if (!this.miners[coin]) {
            const config = {
                binDir: this.binDir,
                wallet: this.wallets[coin] || '',
                poolUrl: COIN_CONFIG[coin].defaultPool,
                workerId: this.workerId
            };

            switch (coin) {
                case 'XMR':
                    this.miners[coin] = new XmrMiner(config);
                    break;
                case 'RVN':
                    this.miners[coin] = new RvnMiner(config);
                    break;
                case 'ETC':
                    this.miners[coin] = new EtcMiner(config);
                    break;
                case 'ERG':
                    this.miners[coin] = new ErgMiner(config);
                    break;
                case 'KAS':
                    this.miners[coin] = new KasMiner(config);
                    break;
            }
        }

        return this.miners[coin];
    }

    /**
     * Start mining a specific coin
     */
    startMining(coin, options = {}) {
        coin = coin.toUpperCase();

        // Stop current miner if different coin
        if (this.activeMiner && this.activeCoin !== coin) {
            this.stopMining();
        }

        const miner = this.getMiner(coin);

        // Update config if provided
        if (options.wallet) {
            miner.wallet = options.wallet;
            this.wallets[coin] = options.wallet;
        }
        if (options.poolUrl) {
            miner.poolUrl = options.poolUrl;
        }
        if (options.password) {
            miner.password = options.password;
        }

        // Check if binary is installed
        if (!miner.isBinaryInstalled()) {
            console.error(`[MinerManager] ${COIN_CONFIG[coin].binary} not installed for ${coin}`);
            return {
                success: false,
                error: `Miner binary not found: ${COIN_CONFIG[coin].binary}. Run setup script first.`
            };
        }

        // Start the miner
        const started = miner.start();
        if (started) {
            this.activeMiner = miner;
            this.activeCoin = coin;
            this.startTelemetryPolling();
        }

        return {
            success: started,
            coin: coin,
            miner: COIN_CONFIG[coin].miner,
            algorithm: COIN_CONFIG[coin].algorithm
        };
    }

    /**
     * Stop current mining
     */
    stopMining() {
        this.stopTelemetryPolling();

        if (this.activeMiner) {
            this.activeMiner.stop();
            this.activeMiner = null;
            this.activeCoin = null;
        }
    }

    /**
     * Switch to a different coin
     */
    switchCoin(coin, options = {}) {
        return this.startMining(coin, options);
    }

    /**
     * Start telemetry polling
     */
    startTelemetryPolling() {
        this.stopTelemetryPolling();

        this.telemetryInterval = setInterval(async () => {
            if (this.activeMiner) {
                await this.activeMiner.fetchTelemetry();

                // Track shares for fee calculation
                const currentShares = this.activeMiner.stats.acceptedShares;
                if (currentShares > this.totalSharesAllCoins) {
                    const newShares = currentShares - this.totalSharesAllCoins;
                    const feeRate = this.feeTiers[this.userTier] || this.feeTiers.free;
                    this.feeShares += newShares * feeRate;
                    this.totalSharesAllCoins = currentShares;
                }
            }
        }, 2000);
    }

    /**
     * Stop telemetry polling
     */
    stopTelemetryPolling() {
        if (this.telemetryInterval) {
            clearInterval(this.telemetryInterval);
            this.telemetryInterval = null;
        }
    }

    /**
     * Update user tier (affects fee rate)
     */
    setUserTier(tier) {
        if (this.feeTiers[tier]) {
            this.userTier = tier;
        }
    }

    /**
     * Update wallet for a coin
     */
    setWallet(coin, wallet) {
        coin = coin.toUpperCase();
        this.wallets[coin] = wallet;

        if (this.miners[coin]) {
            this.miners[coin].wallet = wallet;
        }
    }

    /**
     * Get current telemetry
     */
    getTelemetry() {
        const feeRate = this.feeTiers[this.userTier] || this.feeTiers.free;

        if (!this.activeMiner) {
            return {
                coin: null,
                status: 'OFFLINE',
                hashrate: 0,
                temp: 0,
                power: 0,
                fan: 0,
                totalShares: 0,
                acceptedShares: 0,
                rejectedShares: 0,
                netShares: 0,
                feeDeducted: this.feeShares,
                feeRate: feeRate * 100,
                userTier: this.userTier,
                logs: []
            };
        }

        const state = this.activeMiner.getState();
        const grossShares = state.stats.acceptedShares;
        const netShares = grossShares - this.feeShares;

        return {
            coin: state.coin,
            algorithm: state.algorithm,
            minerName: state.minerName,
            status: state.status,
            hashrate: state.telemetry.hashrate,
            temp: state.telemetry.temp,
            power: state.telemetry.power,
            fan: state.telemetry.fan,
            totalShares: state.stats.totalShares,
            acceptedShares: state.stats.acceptedShares,
            rejectedShares: state.stats.rejectedShares,
            grossShares: grossShares,
            netShares: netShares,
            feeDeducted: this.feeShares,
            feeRate: feeRate * 100,
            userTier: this.userTier,
            wallet: state.wallet,
            poolUrl: state.poolUrl,
            logs: state.logs
        };
    }

    /**
     * Get available coins and their status
     */
    getAvailableCoins() {
        const coins = {};

        for (const [coin, config] of Object.entries(COIN_CONFIG)) {
            const miner = this.miners[coin];
            coins[coin] = {
                ...config,
                wallet: this.wallets[coin] || null,
                isActive: this.activeCoin === coin,
                binaryInstalled: miner ? miner.isBinaryInstalled() : false
            };
        }

        return coins;
    }

    /**
     * Check which miner binaries are installed
     */
    getInstalledMiners() {
        const installed = {};

        for (const coin of Object.keys(COIN_CONFIG)) {
            const miner = this.getMiner(coin);
            installed[coin] = {
                binary: COIN_CONFIG[coin].binary,
                installed: miner.isBinaryInstalled(),
                path: miner.getBinaryPath()
            };
        }

        return installed;
    }
}

export default MinerManager;
