/**
 * Profitability Service
 *
 * Fetches real-time coin prices from CoinGecko and calculates mining profitability.
 */

import { apiClient } from './apiClient';

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

const FALLBACK_PRICES: Record<string, number> = {
    XMR: 155.20,
    RVN: 0.024,
    ETC: 23.50,
    ERG: 1.45,
    KAS: 0.12
};

/**
 * Fetch current prices from CoinGecko API
 */
export const fetchCoinPrices = async (): Promise<Record<string, number>> => {
    try {
        const ids = Object.values(COINGECKO_IDS).join(',');
        const data: any = await apiClient.get(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);

        const prices: Record<string, number> = {};
        for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
            prices[symbol] = data[geckoId]?.usd ?? FALLBACK_PRICES[symbol];
        }

        return prices;
    } catch (e) {
        console.warn('Failed to fetch prices, using fallback:', e);
        return FALLBACK_PRICES;
    }
};

/**
 * Calculate profitability score for each coin
 */
export const calculateProfitability = async (hashrateHs: number = 1000): Promise<CoinProfitability[]> => {
    try {
        const prices = await fetchCoinPrices();
        const results: CoinProfitability[] = Object.keys(COIN_PARAMS).map(symbol => {
            const params = COIN_PARAMS[symbol];
            const price = prices[symbol] || 0;

            const blocksPerDay = 720; 
            const yourShare = hashrateHs / params.networkHashrate;
            const dailyCoins = yourShare * blocksPerDay * params.blockReward;
            const dailyUsd = dailyCoins * price;

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

        return results.sort((a, b) => b.profitabilityScore - a.profitabilityScore);
    } catch (e) {
        return [];
    }
};

export const getMostProfitableCoin = async (): Promise<CoinProfitability | null> => {
    const rankings = await calculateProfitability();
    return rankings.length > 0 ? rankings[0] : null;
};

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
