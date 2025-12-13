/**
 * Profitability Service
 * 
 * Fetches real-time coin prices and calculates mining profitability.
 * Used for auto-profit switching feature.
 */

// Coin profitability data structure
export interface CoinProfitability {
    symbol: string;
    name: string;
    price: number; // USD
    algorithm: string;
    networkDifficulty: number;
    blockReward: number;
    estimatedDailyUsd: number; // Per MH/s
    profitabilityScore: number; // Higher = better
}

// Hardcoded baseline data (fallback when API fails)
const BASELINE_DATA: Record<string, Partial<CoinProfitability>> = {
    XMR: { algorithm: 'RandomX', blockReward: 0.6, networkDifficulty: 300000000000 },
    RVN: { algorithm: 'KawPow', blockReward: 2500, networkDifficulty: 50000 },
    ETC: { algorithm: 'Etchash', blockReward: 2.56, networkDifficulty: 2000000000000000 },
    ERG: { algorithm: 'Autolykos2', blockReward: 30, networkDifficulty: 1500000000000 },
    KAS: { algorithm: 'kHeavyHash', blockReward: 500, networkDifficulty: 100000 }
};

/**
 * Fetch current prices from CoinGecko
 */
export const fetchCoinPrices = async (): Promise<Record<string, number>> => {
    try {
        const ids = 'monero,ravencoin,ethereum-classic,ergo,kaspa';
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        const data = await res.json();

        return {
            XMR: data.monero?.usd || 150,
            RVN: data.ravencoin?.usd || 0.02,
            ETC: data['ethereum-classic']?.usd || 20,
            ERG: data.ergo?.usd || 1.5,
            KAS: data.kaspa?.usd || 0.10
        };
    } catch (e) {
        console.error('Failed to fetch prices:', e);
        // Fallback prices
        return { XMR: 150, RVN: 0.02, ETC: 20, ERG: 1.5, KAS: 0.10 };
    }
};

/**
 * Calculate profitability score for each coin
 * Higher score = more profitable to mine
 */
export const calculateProfitability = async (hashrateHs: number = 1000): Promise<CoinProfitability[]> => {
    const prices = await fetchCoinPrices();

    const results: CoinProfitability[] = Object.keys(BASELINE_DATA).map(symbol => {
        const base = BASELINE_DATA[symbol];
        const price = prices[symbol] || 1;

        // Simplified profitability calculation
        // Real formula would use network hashrate, but this gives relative comparison
        const dailyCoins = (hashrateHs * 86400 * (base.blockReward || 1)) / ((base.networkDifficulty || 1) * 1000);
        const dailyUsd = dailyCoins * price;

        // Normalize to a 0-100 score
        const profitabilityScore = Math.min(100, dailyUsd * 1000);

        return {
            symbol,
            name: symbol,
            price,
            algorithm: base.algorithm || 'Unknown',
            networkDifficulty: base.networkDifficulty || 0,
            blockReward: base.blockReward || 0,
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
 * Returns the new coin symbol if switch is recommended, null otherwise
 */
export const shouldSwitchCoin = async (currentCoin: string, thresholdPercent: number = 10): Promise<string | null> => {
    const rankings = await calculateProfitability();
    const current = rankings.find(c => c.symbol === currentCoin);
    const best = rankings[0];

    if (!current || !best) return null;

    // Switch if best coin is X% more profitable than current
    const improvement = ((best.profitabilityScore - current.profitabilityScore) / current.profitabilityScore) * 100;

    if (improvement >= thresholdPercent && best.symbol !== currentCoin) {
        return best.symbol;
    }

    return null;
};
