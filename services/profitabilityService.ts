/**
 * Profitability Service
 *
 * Fetches real-time coin prices from CoinGecko and calculates mining profitability.
 * Used for auto-profit switching feature.
 */

export interface CoinProfitability {
    symbol: string;
    name: string;
    price: number;
    algorithm: string;
    networkDifficulty: number;
    blockReward: number;
    estimatedDailyUsd: number;
    profitabilityScore: number;
}

// Blockchain parameters - these are static protocol values
const COIN_PARAMS: Record<string, { algorithm: string; blockReward: number; networkHashrate: number }> = {
    XMR: { algorithm: 'RandomX', blockReward: 0.6, networkHashrate: 2.5e9 },
    RVN: { algorithm: 'KawPow', blockReward: 2500, networkHashrate: 5e12 },
    ETC: { algorithm: 'Etchash', blockReward: 2.56, networkHashrate: 150e12 },
    ERG: { algorithm: 'Autolykos2', blockReward: 30, networkHashrate: 50e12 },
    KAS: { algorithm: 'kHeavyHash', blockReward: 500, networkHashrate: 200e12 }
};

const COINGECKO_IDS: Record<string, string> = {
    XMR: 'monero',
    RVN: 'ravencoin',
    ETC: 'ethereum-classic',
    ERG: 'ergo',
    KAS: 'kaspa'
};

/**
 * Fetch current prices from CoinGecko API
 */
export const fetchCoinPrices = async (): Promise<Record<string, number> | null> => {
    try {
        const ids = Object.values(COINGECKO_IDS).join(',');
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);

        if (!res.ok) {
            console.error('CoinGecko API error:', res.status);
            return null;
        }

        const data = await res.json();

        const prices: Record<string, number> = {};
        for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
            prices[symbol] = data[geckoId]?.usd || 0;
        }

        return prices;
    } catch (e) {
        console.error('Failed to fetch prices:', e);
        return null;
    }
};

/**
 * Calculate profitability score for each coin
 * Higher score = more profitable to mine
 */
export const calculateProfitability = async (hashrateHs: number = 1000): Promise<CoinProfitability[]> => {
    const prices = await fetchCoinPrices();

    if (!prices) {
        // Return empty array if prices unavailable
        return [];
    }

    const results: CoinProfitability[] = Object.keys(COIN_PARAMS).map(symbol => {
        const params = COIN_PARAMS[symbol];
        const price = prices[symbol] || 0;

        // Calculate expected daily earnings
        // Formula: (your_hashrate / network_hashrate) * blocks_per_day * block_reward * price
        const blocksPerDay = 720; // ~2 minute block time average
        const yourShare = hashrateHs / params.networkHashrate;
        const dailyCoins = yourShare * blocksPerDay * params.blockReward;
        const dailyUsd = dailyCoins * price;

        // Score is simply the daily USD earnings scaled
        const profitabilityScore = Math.min(100, dailyUsd * 100);

        return {
            symbol,
            name: symbol,
            price,
            algorithm: params.algorithm,
            networkDifficulty: params.networkHashrate,
            blockReward: params.blockReward,
            estimatedDailyUsd: dailyUsd,
            profitabilityScore
        };
    });

    // Sort by profitability (highest first)
    return results.sort((a, b) => b.profitabilityScore - a.profitabilityScore);
};

/**
 * Get the most profitable coin to mine right now
 */
export const getMostProfitableCoin = async (): Promise<CoinProfitability | null> => {
    const rankings = await calculateProfitability();
    return rankings.length > 0 ? rankings[0] : null;
};

/**
 * Check if we should switch coins based on profitability threshold
 */
export const shouldSwitchCoin = async (currentCoin: string, thresholdPercent: number = 10): Promise<string | null> => {
    const rankings = await calculateProfitability();
    const current = rankings.find(c => c.symbol === currentCoin);
    const best = rankings[0];

    if (!current || !best || current.profitabilityScore === 0) return null;

    const improvement = ((best.profitabilityScore - current.profitabilityScore) / current.profitabilityScore) * 100;

    if (improvement >= thresholdPercent && best.symbol !== currentCoin) {
        return best.symbol;
    }

    return null;
};
