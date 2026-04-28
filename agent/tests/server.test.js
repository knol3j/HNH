/**
 * Agent Server Tests
 *
 * Tests for the mining agent server functionality.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { getReportedGpuUtil, getReportedMinerStatus } from '../status.js';

describe('Agent Server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    const defaultConfig = {
      wallet: 'Rqr113e2e3... (User Wallet)',
      poolUrl: 'stratum+tcp://rvn.2miners.com:6060',
      password: 'x',
      algorithm: 'kawpow'
    };

    it('should have default configuration values', () => {
      expect(defaultConfig.wallet).toBeDefined();
      expect(defaultConfig.poolUrl).toContain('stratum+tcp://');
      expect(defaultConfig.password).toBe('x');
      expect(defaultConfig.algorithm).toBe('kawpow');
    });

    it('should support config updates', () => {
      const config = { ...defaultConfig };

      config.wallet = 'new_wallet_address';
      config.poolUrl = 'stratum+tcp://etc.2miners.com:1010';

      expect(config.wallet).toBe('new_wallet_address');
      expect(config.poolUrl).toContain('etc.2miners.com');
    });

    it('should clean stratum URL correctly', () => {
      const cleanUrl = (url) => url.replace('stratum+tcp://', '');

      expect(cleanUrl('stratum+tcp://pool.example.com:1234')).toBe('pool.example.com:1234');
      expect(cleanUrl('pool.example.com:1234')).toBe('pool.example.com:1234');
    });
  });

  describe('Platform Fee Tiers', () => {
    const PLATFORM_FEE_TIERS = {
      free: 0.02,      // 2%
      pro: 0.01,       // 1%
      enterprise: 0.005 // 0.5%
    };

    it('should have correct fee rates', () => {
      expect(PLATFORM_FEE_TIERS.free).toBe(0.02);
      expect(PLATFORM_FEE_TIERS.pro).toBe(0.01);
      expect(PLATFORM_FEE_TIERS.enterprise).toBe(0.005);
    });

    it('should calculate fee correctly', () => {
      const totalShares = 1000;

      expect(totalShares * PLATFORM_FEE_TIERS.free).toBe(20);
      expect(totalShares * PLATFORM_FEE_TIERS.pro).toBe(10);
      expect(totalShares * PLATFORM_FEE_TIERS.enterprise).toBe(5);
    });

    it('should default to free tier', () => {
      const userTier = undefined;
      const feeRate = PLATFORM_FEE_TIERS[userTier] || PLATFORM_FEE_TIERS.free;

      expect(feeRate).toBe(0.02);
    });
  });

  describe('Miner Status', () => {
    const VALID_STATUSES = ['OFFLINE', 'STARTING', 'MINING', 'ERROR'];

    it('should have valid status values', () => {
      VALID_STATUSES.forEach(status => {
        expect(typeof status).toBe('string');
      });
    });

    it('should track status transitions', () => {
      let minerStatus = 'OFFLINE';

      minerStatus = 'STARTING';
      expect(minerStatus).toBe('STARTING');

      minerStatus = 'MINING';
      expect(minerStatus).toBe('MINING');

      minerStatus = 'ERROR';
      expect(minerStatus).toBe('ERROR');
    });

    it('should reset status on miner stop', () => {
      let minerStatus = 'MINING';
      let telemetry = { hashrate: 5000 };

      // Simulate miner exit
      minerStatus = 'OFFLINE';
      telemetry.hashrate = 0;

      expect(minerStatus).toBe('OFFLINE');
      expect(telemetry.hashrate).toBe(0);
    });

    it('should report STARTING until the miner API shows a connection', () => {
      const reportedStatus = getReportedMinerStatus({
        minerStatus: 'MINING',
        hasMinerProcess: true,
        minerApiStats: {
          connection: { pool: '', ip: null, uptime_ms: 0 },
          hashrate: { total: [0] }
        }
      });

      expect(reportedStatus).toBe('STARTING');
    });

    it('should report MINING after the miner API shows a connection', () => {
      const reportedStatus = getReportedMinerStatus({
        minerStatus: 'MINING',
        hasMinerProcess: true,
        minerApiStats: {
          connection: { pool: 'xmr.2miners.com:2222', ip: '127.0.0.1', uptime_ms: 5000 },
          hashrate: { total: [1250000] }
        }
      });

      expect(reportedStatus).toBe('MINING');
    });

    it('should only report gpu utilization when the miner is actually hashing', () => {
      expect(getReportedGpuUtil({ reportedStatus: 'STARTING', hashrate: 0 })).toBe(0);
      expect(getReportedGpuUtil({ reportedStatus: 'MINING', hashrate: 1250000 })).toBe(100);
    });

    it('should ignore stale close events from an older miner process after restart', () => {
      const oldMiner = { pid: 1 };
      const newMiner = { pid: 2 };
      let minerProcess = newMiner;
      let minerStatus = 'MINING';

      const handleClose = (closingMiner) => {
        if (minerProcess === closingMiner) {
          minerStatus = 'OFFLINE';
          minerProcess = null;
        }
      };

      handleClose(oldMiner);

      expect(minerProcess).toBe(newMiner);
      expect(minerStatus).toBe('MINING');
    });
  });

  describe('Telemetry Endpoint', () => {
    it('should calculate net shares correctly', () => {
      const totalShares = 100;
      const feeShares = 2;
      const netShares = totalShares - feeShares;

      expect(netShares).toBe(98);
    });

    it('should format telemetry response', () => {
      const telemetry = {
        hashrate: 5000000, // 5 MH/s in H/s
        temp: 65,
        power: 120,
        fan: 70
      };

      const response = {
        gpu_temp: telemetry.temp,
        gpu_util: 100,
        fan_speed: telemetry.fan,
        power_draw: telemetry.power,
        hashrate: telemetry.hashrate / 1000000, // Convert to MH/s
        verified_shares: 98,
        gross_shares: 100,
        fee_deducted: 2,
        status: 'MINING'
      };

      expect(response.hashrate).toBe(5);
      expect(response.gpu_temp).toBe(65);
      expect(response.verified_shares).toBe(98);
    });

    it('should include active job when mining', () => {
      const minerStatus = 'MINING';
      const algorithm = 'kawpow';

      const activeJob = minerStatus === 'MINING' ? {
        id: 'xmrig-job',
        title: `Mining ${algorithm}`,
        status: 'RUNNING',
        progress: 0
      } : null;

      expect(activeJob).not.toBeNull();
      expect(activeJob.title).toBe('Mining kawpow');
    });

    it('should return null job when offline', () => {
      const minerStatus = 'OFFLINE';

      const activeJob = minerStatus === 'MINING' ? {
        id: 'xmrig-job'
      } : null;

      expect(activeJob).toBeNull();
    });
  });

  describe('Config Endpoint', () => {
    it('should validate tier values', () => {
      const validTiers = ['free', 'pro', 'enterprise'];

      expect(validTiers.includes('free')).toBe(true);
      expect(validTiers.includes('pro')).toBe(true);
      expect(validTiers.includes('enterprise')).toBe(true);
      expect(validTiers.includes('invalid')).toBe(false);
    });

    it('should detect config changes', () => {
      const config = { wallet: 'old_wallet', poolUrl: 'old_pool' };

      const detectChange = (newConfig) => {
        let changed = false;
        if (newConfig.wallet && newConfig.wallet !== config.wallet) changed = true;
        if (newConfig.poolUrl && newConfig.poolUrl !== config.poolUrl) changed = true;
        return changed;
      };

      expect(detectChange({ wallet: 'new_wallet' })).toBe(true);
      expect(detectChange({ poolUrl: 'new_pool' })).toBe(true);
      expect(detectChange({ wallet: 'old_wallet' })).toBe(false);
      expect(detectChange({})).toBe(false);
    });
  });

  describe('Auto-Switch Feature', () => {
    const COIN_POOLS = {
      XMR: 'stratum+tcp://xmr.2miners.com:2222',
      RVN: 'stratum+tcp://rvn.2miners.com:6060',
      ETC: 'stratum+tcp://etc.herominers.com:10161',
      ERG: 'stratum+tcp://de.ergo.herominers.com:11800',
      KAS: 'stratum+tcp://pool.woolypooly.com:3112'
    };

    it('should have pool mappings for all coins', () => {
      expect(COIN_POOLS.XMR).toContain('xmr');
      expect(COIN_POOLS.RVN).toContain('rvn');
      expect(COIN_POOLS.ETC).toContain('etc');
      expect(COIN_POOLS.ERG).toContain('ergo');
      expect(COIN_POOLS.KAS).toContain('woolypooly');
    });

    it('should validate coin before switching', () => {
      const validateCoin = (coin) => COIN_POOLS.hasOwnProperty(coin);

      expect(validateCoin('XMR')).toBe(true);
      expect(validateCoin('BTC')).toBe(false);
      expect(validateCoin('UNKNOWN')).toBe(false);
    });

    it('should update pool URL on switch', () => {
      let currentCoin = 'XMR';
      let poolUrl = COIN_POOLS[currentCoin];

      currentCoin = 'RVN';
      poolUrl = COIN_POOLS[currentCoin];

      expect(currentCoin).toBe('RVN');
      expect(poolUrl).toContain('rvn.2miners.com');
    });

    it('should toggle auto-switch state', () => {
      let autoSwitchEnabled = false;

      autoSwitchEnabled = true;
      expect(autoSwitchEnabled).toBe(true);

      autoSwitchEnabled = false;
      expect(autoSwitchEnabled).toBe(false);
    });
  });

  describe('Logging', () => {
    it('should maintain log history', () => {
      const recentLogs = [];
      const MAX_LOGS = 50;

      const addLog = (msg) => {
        const timestamp = new Date().toLocaleTimeString();
        recentLogs.unshift(`[${timestamp}] ${msg}`);
        if (recentLogs.length > MAX_LOGS) recentLogs.pop();
      };

      addLog('Test message 1');
      addLog('Test message 2');

      expect(recentLogs).toHaveLength(2);
      expect(recentLogs[0]).toContain('Test message 2');
      expect(recentLogs[1]).toContain('Test message 1');
    });

    it('should limit log size', () => {
      const recentLogs = [];
      const MAX_LOGS = 50;

      const addLog = (msg) => {
        recentLogs.unshift(msg);
        if (recentLogs.length > MAX_LOGS) recentLogs.pop();
      };

      for (let i = 0; i < 60; i++) {
        addLog(`Log ${i}`);
      }

      expect(recentLogs).toHaveLength(50);
      expect(recentLogs[0]).toBe('Log 59');
    });
  });

  describe('Share Tracking', () => {
    it('should accumulate total shares', () => {
      let totalShares = 0;

      totalShares++;
      totalShares++;
      totalShares++;

      expect(totalShares).toBe(3);
    });

    it('should calculate fee shares correctly', () => {
      let totalShares = 0;
      let feeShares = 0;
      const feeRate = 0.02;

      for (let i = 0; i < 100; i++) {
        totalShares++;
        feeShares += feeRate;
      }

      expect(totalShares).toBe(100);
      // Use toBeCloseTo for floating point comparison
      expect(feeShares).toBeCloseTo(2, 5);
    });

    it('should detect accepted shares in output', () => {
      const detectAccepted = (line) => line.includes('accepted');

      expect(detectAccepted('Share accepted (100ms)')).toBe(true);
      expect(detectAccepted('Share rejected')).toBe(false);
      expect(detectAccepted('New job received')).toBe(false);
    });
  });

  describe('XMRig Arguments', () => {
    it('should build correct arguments for GPU mining', () => {
      const config = {
        poolUrl: 'stratum+tcp://rvn.2miners.com:6060',
        wallet: 'test_wallet',
        password: 'x',
        algorithm: 'kawpow'
      };

      const cleanUrl = config.poolUrl.replace('stratum+tcp://', '');

      const args = [
        '-o', cleanUrl,
        '-u', config.wallet,
        '-p', config.password,
        '--no-color',
        '--http-port', '4444'
      ];

      if (config.algorithm === 'kawpow' || config.algorithm === 'etchash') {
        args.push('--cuda');
        args.push('--opencl');
      }

      args.push('-a', config.algorithm);

      expect(args).toContain('-o');
      expect(args).toContain(cleanUrl);
      expect(args).toContain('--cuda');
      expect(args).toContain('--opencl');
      expect(args).toContain('kawpow');
    });

    it('should not add GPU flags for CPU algorithms', () => {
      const algorithm = 'randomx';

      const shouldAddGpuFlags = algorithm === 'kawpow' || algorithm === 'etchash';

      expect(shouldAddGpuFlags).toBe(false);
    });
  });
});
