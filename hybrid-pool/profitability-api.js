/**
 * Profitability API - Fetches real-time coin profitability data
 * Queries multiple sources and calculates most profitable coin
 */

const https = require('https');

class ProfitabilityAPI {
    constructor() {
        this.coins = {
            ETC: {
                algorithm: 'etchash',
                whattomine_id: 162,
                pools: ['etc.2miners.com:1010', 'etc.ethermine.org:4444']
            },
            RVN: {
                algorithm: 'kawpow',
                whattomine_id: 234,
                pools: ['rvn.2miners.com:6060', 'stratum-ravencoin.flypool.org:3333']
            },
            ERGO: {
                algorithm: 'autolykos2',
                whattomine_id: 428,
                pools: ['ergo.2miners.com:8888', 'ergo.herominers.com:1180']
            },
            ETHW: {
                algorithm: 'ethash',
                whattomine_id: 440,
                pools: ['pool.woolypooly.com:3096']
            },
            FIRO: {
                algorithm: 'firopow',
                whattomine_id: 286,
                pools: ['firo.2miners.com:8181']
            },
            CFX: {
                algorithm: 'octopus',
                whattomine_id: 442,
                pools: ['cfx-us.minerpool.org:3360']
            },
            ALPH: {
                algorithm: 'blake3',
                whattomine_id: 461,
                pools: ['alph.herominers.com:1199']
            }
        };

        this.apiEndpoints = {
            whattomine: 'https://whattomine.com/coins.json',
            miningpoolstats: 'https://miningpoolstats.stream/api/profitability',
            'twoMiners': 'https://2miners.com/api/stats'
        };

        this.cache = {
            data: null,
            timestamp: 0,
            ttl: 300000 // 5 minutes
        };
    }

    /**
     * Fetch data from WhatToMine API
     */
    async fetchWhatToMine() {
        return new Promise((resolve, reject) => {
            https.get(this.apiEndpoints.whattomine, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', reject);
        });
    }

    /**
     * Calculate profitability for a specific coin
     */
    calculateProfitability(coinData, hashrate, powerConsumption = 250, electricityCost = 0.12) {
        const {
            exchange_rate = 0,
            block_reward = 0,
            nethash = 1,
            block_time = 60
        } = coinData;

        // Calculate daily revenue
        const hashrateRatio = hashrate / (nethash / 1e9); // Convert to GH/s
        const blocksPerDay = (86400 / block_time);
        const dailyRevenue = hashrateRatio * blocksPerDay * block_reward * exchange_rate;

        // Calculate daily cost
        const dailyPowerKwh = (powerConsumption * 24) / 1000;
        const dailyCost = dailyPowerKwh * electricityCost;

        // Calculate profit
        const dailyProfit = dailyRevenue - dailyCost;

        return {
            dailyRevenue,
            dailyCost,
            dailyProfit,
            profitability: dailyProfit / hashrate // Profit per MH/s
        };
    }

    /**
     * Get most profitable coin
     */
    async getMostProfitable(gpuHashrates = {}, powerConsumption = 250, electricityCost = 0.12) {
        // Check cache
        if (this.cache.data && (Date.now() - this.cache.timestamp < this.cache.ttl)) {
            return this.cache.data;
        }

        try {
            const data = await this.fetchWhatToMine();
            const profitabilities = [];

            for (const [symbol, config] of Object.entries(this.coins)) {
                const coinId = config.whattomine_id;
                const coinData = data.coins[coinId];

                if (!coinData) continue;

                // Get hashrate for this algorithm
                const hashrate = gpuHashrates[config.algorithm] || 50; // Default 50 MH/s

                const profit = this.calculateProfitability(
                    coinData,
                    hashrate,
                    powerConsumption,
                    electricityCost
                );

                profitabilities.push({
                    coin: symbol,
                    algorithm: config.algorithm,
                    pools: config.pools,
                    ...profit,
                    price: coinData.exchange_rate,
                    difficulty: coinData.difficulty,
                    nethash: coinData.nethash
                });
            }

            // Sort by profitability
            profitabilities.sort((a, b) => b.dailyProfit - a.dailyProfit);

            const result = {
                timestamp: Date.now(),
                mostProfitable: profitabilities[0],
                allCoins: profitabilities,
                lastUpdate: new Date().toISOString()
            };

            // Update cache
            this.cache.data = result;
            this.cache.timestamp = Date.now();

            return result;

        } catch (error) {
            console.error('Error fetching profitability data:', error);

            // Return cached data if available
            if (this.cache.data) {
                console.log('Using cached profitability data');
                return this.cache.data;
            }

            // Fallback to default
            return {
                timestamp: Date.now(),
                mostProfitable: {
                    coin: 'ETC',
                    algorithm: 'etchash',
                    pools: this.coins.ETC.pools,
                    dailyProfit: 0,
                    profitability: 0
                },
                allCoins: [],
                lastUpdate: new Date().toISOString(),
                error: 'Failed to fetch profitability data'
            };
        }
    }

    /**
     * Get recommended pool for a coin
     */
    getPoolForCoin(coin) {
        const config = this.coins[coin];
        if (!config) return null;

        // Return first pool (can be randomized or load-balanced)
        return {
            coin,
            algorithm: config.algorithm,
            pool: config.pools[0],
            backupPools: config.pools.slice(1)
        };
    }

    /**
     * Format hashrate for display
     */
    formatHashrate(hashrate) {
        if (hashrate > 1000) return `${(hashrate / 1000).toFixed(2)} GH/s`;
        return `${hashrate.toFixed(2)} MH/s`;
    }

    /**
     * Get supported coins list
     */
    getSupportedCoins() {
        return Object.keys(this.coins);
    }
}

module.exports = ProfitabilityAPI;

// CLI testing
if (require.main === module) {
    const api = new ProfitabilityAPI();

    // Example GPU hashrates (RTX 3080 example)
    const gpuHashrates = {
        'etchash': 98,    // ETC
        'kawpow': 48,     // RVN
        'autolykos2': 140, // ERGO
        'ethash': 100,    // ETHW
        'firopow': 35,    // FIRO
        'octopus': 75,    // CFX
        'blake3': 4500    // ALPH (in MH/s)
    };

    console.log('🔍 Fetching profitability data...\n');

    api.getMostProfitable(gpuHashrates, 250, 0.12).then(result => {
        console.log('📊 Most Profitable Coin:');
        console.log(`   Coin: ${result.mostProfitable.coin}`);
        console.log(`   Algorithm: ${result.mostProfitable.algorithm}`);
        console.log(`   Daily Profit: $${result.mostProfitable.dailyProfit.toFixed(2)}`);
        console.log(`   Daily Revenue: $${result.mostProfitable.dailyRevenue.toFixed(2)}`);
        console.log(`   Daily Cost: $${result.mostProfitable.dailyCost.toFixed(2)}`);
        console.log(`   Pool: ${result.mostProfitable.pools[0]}`);
        console.log('');

        console.log('📈 All Coins (sorted by profit):');
        result.allCoins.forEach((coin, index) => {
            console.log(`   ${index + 1}. ${coin.coin} (${coin.algorithm}): $${coin.dailyProfit.toFixed(2)}/day`);
        });
    });
}
