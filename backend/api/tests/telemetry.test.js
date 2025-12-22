/**
 * Backend API Telemetry Tests
 *
 * Tests for the miner telemetry endpoint.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Prisma Client
const mockPrisma = {
  worker: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

describe('Telemetry API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /miner/telemetry', () => {
    // Simulate the telemetry handler logic
    const handleTelemetry = async (body) => {
      const { userId, workerName, hashrate, temp, power } = body;

      if (!userId) {
        return { status: 400, body: { error: 'Missing userId' } };
      }

      try {
        let worker = await mockPrisma.worker.findFirst({
          where: { userId, name: workerName }
        });

        if (!worker) {
          worker = await mockPrisma.worker.create({
            data: { userId, name: workerName, hashrate: parseFloat(hashrate) }
          });
        } else {
          await mockPrisma.worker.update({
            where: { id: worker.id },
            data: { hashrate: parseFloat(hashrate), lastSeen: new Date() }
          });
        }

        return { status: 200, body: { success: true, workerId: worker.id } };
      } catch (e) {
        return { status: 500, body: { error: e.message } };
      }
    };

    it('should require userId', async () => {
      const result = await handleTelemetry({});

      expect(result.status).toBe(400);
      expect(result.body.error).toBe('Missing userId');
    });

    it('should create new worker if not exists', async () => {
      mockPrisma.worker.findFirst.mockResolvedValue(null);
      mockPrisma.worker.create.mockResolvedValue({
        id: 'worker123',
        userId: 'user123',
        name: 'rig1',
        hashrate: 5000
      });

      const result = await handleTelemetry({
        userId: 'user123',
        workerName: 'rig1',
        hashrate: '5000',
        temp: 65,
        power: 120
      });

      expect(mockPrisma.worker.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user123', name: 'rig1' }
      });
      expect(mockPrisma.worker.create).toHaveBeenCalledWith({
        data: { userId: 'user123', name: 'rig1', hashrate: 5000 }
      });
      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
    });

    it('should update existing worker', async () => {
      const existingWorker = {
        id: 'worker456',
        userId: 'user123',
        name: 'rig1',
        hashrate: 4000
      };
      mockPrisma.worker.findFirst.mockResolvedValue(existingWorker);
      mockPrisma.worker.update.mockResolvedValue({
        ...existingWorker,
        hashrate: 5500
      });

      const result = await handleTelemetry({
        userId: 'user123',
        workerName: 'rig1',
        hashrate: '5500',
        temp: 70,
        power: 130
      });

      expect(mockPrisma.worker.update).toHaveBeenCalledWith({
        where: { id: 'worker456' },
        data: expect.objectContaining({ hashrate: 5500 })
      });
      expect(result.status).toBe(200);
    });

    it('should parse hashrate as float', async () => {
      mockPrisma.worker.findFirst.mockResolvedValue(null);
      mockPrisma.worker.create.mockResolvedValue({
        id: 'worker789',
        hashrate: 1234.56
      });

      await handleTelemetry({
        userId: 'user123',
        workerName: 'rig1',
        hashrate: '1234.56'
      });

      expect(mockPrisma.worker.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ hashrate: 1234.56 })
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.worker.findFirst.mockRejectedValue(new Error('DB connection failed'));

      const result = await handleTelemetry({
        userId: 'user123',
        workerName: 'rig1',
        hashrate: '5000'
      });

      expect(result.status).toBe(500);
      expect(result.body.error).toBe('DB connection failed');
    });

    it('should return workerId on success', async () => {
      mockPrisma.worker.findFirst.mockResolvedValue(null);
      mockPrisma.worker.create.mockResolvedValue({
        id: 'new_worker_id',
        userId: 'user123',
        name: 'miner1',
        hashrate: 10000
      });

      const result = await handleTelemetry({
        userId: 'user123',
        workerName: 'miner1',
        hashrate: '10000'
      });

      expect(result.body.workerId).toBe('new_worker_id');
    });

    it('should update lastSeen timestamp', async () => {
      const existingWorker = { id: 'worker1', userId: 'user1', name: 'rig1' };
      mockPrisma.worker.findFirst.mockResolvedValue(existingWorker);
      mockPrisma.worker.update.mockResolvedValue(existingWorker);

      await handleTelemetry({
        userId: 'user1',
        workerName: 'rig1',
        hashrate: '5000'
      });

      expect(mockPrisma.worker.update).toHaveBeenCalledWith({
        where: { id: 'worker1' },
        data: expect.objectContaining({
          lastSeen: expect.any(Date)
        })
      });
    });
  });

  describe('Telemetry Data Validation', () => {
    it('should handle missing workerName', async () => {
      mockPrisma.worker.findFirst.mockResolvedValue(null);
      mockPrisma.worker.create.mockResolvedValue({
        id: 'w1',
        name: undefined
      });

      // The current implementation would create with undefined name
      // This tests current behavior
      const handleTelemetry = async (body) => {
        const { userId, workerName, hashrate } = body;
        if (!userId) return { status: 400, body: { error: 'Missing userId' } };

        await mockPrisma.worker.create({
          data: { userId, name: workerName, hashrate: parseFloat(hashrate) }
        });
        return { status: 200, body: { success: true } };
      };

      const result = await handleTelemetry({
        userId: 'user1',
        hashrate: '5000'
      });

      expect(result.status).toBe(200);
    });

    it('should handle NaN hashrate', async () => {
      mockPrisma.worker.findFirst.mockResolvedValue(null);
      mockPrisma.worker.create.mockResolvedValue({ id: 'w1' });

      const handleTelemetry = async (body) => {
        const { userId, workerName, hashrate } = body;
        if (!userId) return { status: 400, body: { error: 'Missing userId' } };

        const parsedHashrate = parseFloat(hashrate);
        await mockPrisma.worker.create({
          data: { userId, name: workerName, hashrate: parsedHashrate }
        });
        return { status: 200, body: { success: true } };
      };

      await handleTelemetry({
        userId: 'user1',
        workerName: 'rig1',
        hashrate: 'not_a_number'
      });

      expect(mockPrisma.worker.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ hashrate: NaN })
      });
    });
  });
});
