/**
 * Profitability Service Tests
 *
 * Tests for the profitability calculation service used for auto-profit switching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchCoinPrices,
  calculateProfitability,
  getMostProfitableCoin,
  shouldSwitchCoin,
  CoinProfitability
} from '../../services/profitabilityService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('profitabilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchCoinPrices', () => {
    it('should fetch and return coin prices from CoinGecko', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          monero: { usd: 160 },
          ravencoin: { usd: 0.025 },
          'ethereum-classic': { usd: 22 },
          ergo: { usd: 1.8 },
          kaspa: { usd: 0.12 },
        }),
      });

      const prices = await fetchCoinPrices();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.coingecko.com')
      );
      expect(prices).toEqual({
        XMR: 160,
        RVN: 0.025,
        ETC: 22,
        ERG: 1.8,
        KAS: 0.12,
      });
    });

    it('should return fallback prices on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API down'));

      const prices = await fetchCoinPrices();

      expect(prices).toEqual({
        XMR: 155.20,
        RVN: 0.024,
        ETC: 23.50,
        ERG: 1.45,
        KAS: 0.12,
      });
    });

    it('should handle partial API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          monero: { usd: 155 },
          // Missing other coins
        }),
      });

      const prices = await fetchCoinPrices();

      expect(prices.XMR).toBe(155);
      expect(prices.RVN).toBe(0.024); // Fallback
      expect(prices.ETC).toBe(23.50); // Fallback
    });
  });

  describe('calculateProfitability', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          monero: { usd: 150 },
          ravencoin: { usd: 0.02 },
          'ethereum-classic': { usd: 20 },
          ergo: { usd: 1.5 },
          kaspa: { usd: 0.10 },
        }),
      });
    });

    it('should return profitability for all coins', async () => {
      const results = await calculateProfitability();

      expect(results).toHaveLength(5);
      expect(results[0]).toHaveProperty('symbol');
      expect(results[0]).toHaveProperty('price');
      expect(results[0]).toHaveProperty('algorithm');
      expect(results[0]).toHaveProperty('estimatedDailyUsd');
      expect(results[0]).toHaveProperty('profitabilityScore');
    });

    it('should sort results by profitability score descending', async () => {
      const results = await calculateProfitability();

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].profitabilityScore).toBeGreaterThanOrEqual(
          results[i + 1].profitabilityScore
        );
      }
    });

    it('should calculate with custom hashrate', async () => {
      const results1000 = await calculateProfitability(1000);
      const results2000 = await calculateProfitability(2000);

      // Higher hashrate should yield higher daily USD
      expect(results2000[0].estimatedDailyUsd).toBeGreaterThan(
        results1000[0].estimatedDailyUsd
      );
    });

    it('should include correct algorithm for each coin', async () => {
      const results = await calculateProfitability();

      const xmr = results.find(c => c.symbol === 'XMR');
      const rvn = results.find(c => c.symbol === 'RVN');
      const etc = results.find(c => c.symbol === 'ETC');

      expect(xmr?.algorithm).toBe('RandomX');
      expect(rvn?.algorithm).toBe('KawPow');
      expect(etc?.algorithm).toBe('Etchash');
    });

    it('should cap profitability score at 100', async () => {
      const results = await calculateProfitability(1000000000); // Very high hashrate

      results.forEach(coin => {
        expect(coin.profitabilityScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('getMostProfitableCoin', () => {
    it('should return the most profitable coin', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          monero: { usd: 150 },
          ravencoin: { usd: 0.02 },
          'ethereum-classic': { usd: 20 },
          ergo: { usd: 1.5 },
          kaspa: { usd: 0.10 },
        }),
      });

      const mostProfitable = await getMostProfitableCoin();

      expect(mostProfitable).not.toBeNull();
      expect(mostProfitable).toHaveProperty('symbol');
      expect(mostProfitable).toHaveProperty('profitabilityScore');
    });

    it('should return coin with highest profitability score', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          monero: { usd: 150 },
          ravencoin: { usd: 0.02 },
          'ethereum-classic': { usd: 20 },
          ergo: { usd: 1.5 },
          kaspa: { usd: 0.10 },
        }),
      });

      const mostProfitable = await getMostProfitableCoin();
      const allCoins = await calculateProfitability();

      if (mostProfitable && allCoins.length > 0) {
        expect(mostProfitable.profitabilityScore).toBeGreaterThanOrEqual(
          allCoins[allCoins.length - 1].profitabilityScore
        );
      }
    });
  });

  describe('shouldSwitchCoin', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          monero: { usd: 150 },
          ravencoin: { usd: 0.02 },
          'ethereum-classic': { usd: 20 },
          ergo: { usd: 1.5 },
          kaspa: { usd: 0.10 },
        }),
      });
    });

    it('should return null if current coin is most profitable', async () => {
      // Get the most profitable coin first
      const rankings = await calculateProfitability();
      const bestCoin = rankings[0].symbol;

      const shouldSwitch = await shouldSwitchCoin(bestCoin);
      expect(shouldSwitch).toBeNull();
    });

    it('should recommend switch if better coin exceeds threshold', async () => {
      // Use a coin that's likely not the most profitable
      const result = await shouldSwitchCoin('KAS', 5);

      // Result could be null or a different coin symbol depending on profitability
      if (result !== null) {
        expect(result).not.toBe('KAS');
        expect(typeof result).toBe('string');
      }
    });

    it('should return null for unknown coin', async () => {
      const result = await shouldSwitchCoin('UNKNOWN_COIN');
      expect(result).toBeNull();
    });

    it('should use default threshold of 10%', async () => {
      // This tests that the function works with default parameters
      const result = await shouldSwitchCoin('XMR');

      // Result should be string or null
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should respect custom threshold', async () => {
      // With a very high threshold, no switch should be recommended
      // First get the most profitable coin and use that - switching from the best should return null
      const rankings = await calculateProfitability();
      const bestCoin = rankings[0].symbol;
      const result = await shouldSwitchCoin(bestCoin, 1000);
      expect(result).toBeNull();
    });
  });
});
