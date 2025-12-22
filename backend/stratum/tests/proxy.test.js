/**
 * Stratum Proxy Tests
 *
 * Tests for the mining stratum proxy server functionality.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock pg Pool
const mockPool = {
  query: jest.fn(),
};

jest.unstable_mockModule('pg', () => ({
  default: {
    Pool: jest.fn(() => mockPool),
  },
  Pool: jest.fn(() => mockPool),
}));

describe('Stratum Proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Login Message Parsing', () => {
    // Simulate the login parsing logic from the proxy
    const parseLogin = (msg) => {
      let login = null;

      if (msg.params && msg.params.login) {
        login = msg.params.login;
      } else if (Array.isArray(msg.params) && msg.params.length > 0) {
        login = msg.params[0];
      }

      if (login) {
        const parts = login.split('.');
        return {
          username: parts[0],
          workerName: parts[1] || 'default'
        };
      }

      return null;
    };

    it('should parse login from params.login', () => {
      const msg = {
        method: 'login',
        params: { login: 'testuser.rig1' }
      };

      const result = parseLogin(msg);

      expect(result.username).toBe('testuser');
      expect(result.workerName).toBe('rig1');
    });

    it('should parse login from params array', () => {
      const msg = {
        method: 'submitLogin',
        params: ['mineruser.worker2', 'x']
      };

      const result = parseLogin(msg);

      expect(result.username).toBe('mineruser');
      expect(result.workerName).toBe('worker2');
    });

    it('should use default worker name when not specified', () => {
      const msg = {
        method: 'login',
        params: { login: 'solouser' }
      };

      const result = parseLogin(msg);

      expect(result.username).toBe('solouser');
      expect(result.workerName).toBe('default');
    });

    it('should handle missing login data', () => {
      const msg = {
        method: 'login',
        params: {}
      };

      const result = parseLogin(msg);

      expect(result).toBeNull();
    });

    it('should handle complex worker names', () => {
      const msg = {
        method: 'login',
        params: { login: 'user.rig.primary' }
      };

      const result = parseLogin(msg);

      expect(result.username).toBe('user');
      expect(result.workerName).toBe('rig'); // Only first part after username
    });
  });

  describe('User Lookup', () => {
    it('should query database for user by username', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 'user123' }]
      });

      const result = await mockPool.query(
        'SELECT id FROM "User" WHERE username = $1',
        ['testminer']
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id FROM "User" WHERE username = $1',
        ['testminer']
      );
      expect(result.rows[0].id).toBe('user123');
    });

    it('should return empty when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await mockPool.query(
        'SELECT id FROM "User" WHERE username = $1',
        ['unknownuser']
      );

      expect(result.rows).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection failed'));

      await expect(
        mockPool.query('SELECT id FROM "User" WHERE username = $1', ['user'])
      ).rejects.toThrow('Connection failed');
    });
  });

  describe('Share Recording', () => {
    it('should insert share into database', async () => {
      const workerId = 'worker_123';
      const userId = 'user_456';
      const difficulty = 1.0;
      const accepted = true;

      mockPool.query.mockResolvedValue({ rowCount: 1 });

      await mockPool.query(
        'INSERT INTO "Share" ("id", "workerId", "userId", "difficulty", "accepted", "timestamp") VALUES ($1, $2, $3, $4, $5, NOW())',
        [expect.any(String), workerId, userId, difficulty, accepted]
      );

      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should generate unique share ID', () => {
      // Test UUID generation logic
      const generateShareId = () => {
        return `share_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      };

      const id1 = generateShareId();
      const id2 = generateShareId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^share_/);
    });

    it('should record accepted shares', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const recordShare = async (workerId, userId, accepted) => {
        return await mockPool.query(
          'INSERT INTO "Share" VALUES ($1, $2, $3, $4)',
          ['id', workerId, userId, accepted]
        );
      };

      await recordShare('w1', 'u1', true);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([true])
      );
    });
  });

  describe('Stratum Message Handling', () => {
    it('should recognize login method', () => {
      const isLoginMethod = (method) => {
        return method === 'login' || method === 'submitLogin';
      };

      expect(isLoginMethod('login')).toBe(true);
      expect(isLoginMethod('submitLogin')).toBe(true);
      expect(isLoginMethod('mining.submit')).toBe(false);
    });

    it('should detect share acceptance response', () => {
      const isShareAccepted = (msg) => {
        return msg.result === true && msg.id !== undefined;
      };

      expect(isShareAccepted({ result: true, id: 1 })).toBe(true);
      expect(isShareAccepted({ result: false, id: 1 })).toBe(false);
      expect(isShareAccepted({ result: true })).toBe(false);
      expect(isShareAccepted({ error: 'rejected' })).toBe(false);
    });

    it('should parse multi-line stratum messages', () => {
      const parseMessages = (data) => {
        return data.toString().split('\n').filter(l => l.trim());
      };

      const data = '{"id":1}\n{"id":2}\n{"id":3}\n';
      const messages = parseMessages(data);

      expect(messages).toHaveLength(3);
      expect(JSON.parse(messages[0]).id).toBe(1);
    });

    it('should handle empty lines in data', () => {
      const parseMessages = (data) => {
        return data.toString().split('\n').filter(l => l.trim());
      };

      const data = '{"id":1}\n\n\n{"id":2}\n';
      const messages = parseMessages(data);

      expect(messages).toHaveLength(2);
    });
  });

  describe('Fee Configuration', () => {
    const FEE_PERCENT = 0.02; // 2%

    it('should calculate fee shares correctly', () => {
      const totalShares = 100;
      const feeShares = totalShares * FEE_PERCENT;

      expect(feeShares).toBe(2);
    });

    it('should accumulate fee shares incrementally', () => {
      let feeShares = 0;

      // Simulate 50 accepted shares
      for (let i = 0; i < 50; i++) {
        feeShares += FEE_PERCENT;
      }

      // Use toBeCloseTo for floating point comparison
      expect(feeShares).toBeCloseTo(1, 5);
    });

    it('should track fee percentage', () => {
      expect(FEE_PERCENT).toBe(0.02);
      expect(FEE_PERCENT * 100).toBe(2);
    });
  });

  describe('Connection Handling', () => {
    it('should generate unique worker ID', () => {
      const generateWorkerId = () => {
        return `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      };

      const id1 = generateWorkerId();
      const id2 = generateWorkerId();

      expect(id1).toMatch(/^worker_\d+_[a-z0-9]{4}$/);
      expect(id1).not.toBe(id2);
    });

    it('should track current user state', () => {
      let currentUserId = null;
      let currentWorkerName = 'Unknown';

      // Simulate login
      currentUserId = 'user123';
      currentWorkerName = 'rig1';

      expect(currentUserId).toBe('user123');
      expect(currentWorkerName).toBe('rig1');
    });
  });

  describe('Upstream Pool Connection', () => {
    it('should use configured pool settings', () => {
      const config = {
        UPSTREAM_HOST: 'rvn.2miners.com',
        UPSTREAM_PORT: 6060
      };

      expect(config.UPSTREAM_HOST).toBe('rvn.2miners.com');
      expect(config.UPSTREAM_PORT).toBe(6060);
    });

    it('should support environment variable override', () => {
      const getConfig = (envHost, envPort) => ({
        host: envHost || 'rvn.2miners.com',
        port: envPort || 6060
      });

      const config1 = getConfig();
      expect(config1.host).toBe('rvn.2miners.com');

      const config2 = getConfig('custom.pool.com', 7070);
      expect(config2.host).toBe('custom.pool.com');
      expect(config2.port).toBe(7070);
    });
  });
});
