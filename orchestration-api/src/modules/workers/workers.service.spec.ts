import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { PrismaService } from '../../database/prisma.service';
import { RegisterWorkerDto, UpdateWorkerGpuDto } from './dto';

describe('WorkersService', () => {
  let service: WorkersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    worker: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<WorkersService>(WorkersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const validWallet = 'HN7hnF3n7R6n7n7n7n7n7n7n7n7n7n7n7n7n7n7n7n';

    it('should register a new worker with GPU info', async () => {
      const dto: RegisterWorkerDto = {
        walletAddress: validWallet,
        gpuInfo: {
          count: 2,
          model: 'NVIDIA RTX 4090',
          memoryMb: 24576,
          utilization: 85,
          temperature: 65,
          powerDrawW: 350,
        },
        cpuInfo: {
          model: 'AMD Ryzen 9 5950X',
          cores: 16,
          threads: 32,
        },
        ramMb: 65536,
        osType: 'Linux',
        osVersion: 'Ubuntu 22.04',
      };

      mockPrismaService.worker.findUnique.mockResolvedValue(null);
      mockPrismaService.worker.create.mockResolvedValue({
        id: 'uuid',
        workerId: 'worker_abc123',
        walletAddress: validWallet,
        gpuCount: 2,
        gpuModel: 'NVIDIA RTX 4090',
        cpuCores: 16,
        ramGb: 64,
        status: 'active',
      });

      const result = await service.register(dto);

      expect(mockPrismaService.worker.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            walletAddress: validWallet,
            gpuCount: 2,
            gpuModel: 'NVIDIA RTX 4090',
            cpuCores: 16,
            ramGb: 64,
            hardwareInfo: expect.objectContaining({
              gpuModel: 'NVIDIA RTX 4090',
              gpuCount: 2,
              gpuMemoryMb: 24576,
              cpuModel: 'AMD Ryzen 9 5950X',
              cpuCores: 16,
              ramGb: 64,
              osType: 'Linux',
              osVersion: 'Ubuntu 22.04',
            }),
          }),
        }),
      );
      expect(result.status).toBe('active');
    });

    it('should reject invalid Solana wallet address', async () => {
      const dto: RegisterWorkerDto = {
        walletAddress: 'invalid-wallet',
      };

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('should update existing worker on re-registration', async () => {
      const dto: RegisterWorkerDto = {
        walletAddress: validWallet,
        gpuInfo: { count: 4, model: 'RTX 3090' },
      };

      mockPrismaService.worker.findUnique.mockResolvedValue({
        id: 'uuid',
        workerId: 'worker_abc123',
        walletAddress: validWallet,
        hardwareInfo: { gpuCount: 2, gpuModel: 'RTX 2080' },
        status: 'inactive',
      });
      mockPrismaService.worker.update.mockResolvedValue({
        id: 'uuid',
        workerId: 'worker_abc123',
        status: 'active',
      });

      const result = await service.register(dto);

      expect(mockPrismaService.worker.update).toHaveBeenCalled();
      expect(result.status).toBe('active');
    });
  });

  describe('updateGpuInfo', () => {
    it('should update GPU info for existing worker', async () => {
      const workerId = 'worker_abc123';
      const dto: UpdateWorkerGpuDto = {
        count: 4,
        model: 'RTX 4090',
        utilization: 92,
        temperature: 72,
      };

      mockPrismaService.worker.findUnique.mockResolvedValue({
        id: 'uuid',
        workerId,
        hardwareInfo: { gpuCount: 2, gpuModel: 'RTX 3090' },
      });
      mockPrismaService.worker.update.mockResolvedValue({
        id: 'uuid',
        workerId,
        gpuCount: 4,
        gpuModel: 'RTX 4090',
      });

      const result = await service.updateGpuInfo(workerId, dto);

      expect(mockPrismaService.worker.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workerId },
          data: expect.objectContaining({
            gpuCount: 4,
            gpuModel: 'RTX 4090',
            hardwareInfo: expect.objectContaining({
              gpuCount: 4,
              gpuModel: 'RTX 4090',
              gpuUtilization: 92,
              gpuTemperature: 72,
            }),
          }),
        }),
      );
      expect(result.gpuCount).toBe(4);
    });

    it('should throw NotFoundException for non-existent worker', async () => {
      mockPrismaService.worker.findUnique.mockResolvedValue(null);

      await expect(
        service.updateGpuInfo('nonexistent', { count: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getGpuStats', () => {
    it('should aggregate GPU stats across active workers', async () => {
      mockPrismaService.worker.findMany.mockResolvedValue([
        {
          workerId: 'worker_1',
          walletAddress: 'addr1',
          status: 'active',
          gpuCount: 2,
          gpuModel: 'RTX 4090',
          hardwareInfo: {
            gpuCount: 2,
            gpuModel: 'RTX 4090',
            gpuMemoryMb: 24576,
            gpuUtilization: 90,
            gpuTemperature: 70,
          },
          lastSeen: new Date(),
        },
        {
          workerId: 'worker_2',
          walletAddress: 'addr2',
          status: 'active',
          gpuCount: 1,
          gpuModel: 'RTX 3090',
          hardwareInfo: {
            gpuCount: 1,
            gpuModel: 'RTX 3090',
            gpuMemoryMb: 24576,
            gpuUtilization: 80,
            gpuTemperature: 65,
          },
          lastSeen: new Date(),
        },
        {
          workerId: 'worker_3',
          walletAddress: 'addr3',
          status: 'active',
          gpuCount: null,
          gpuModel: null,
          hardwareInfo: {},
          lastSeen: new Date(),
        },
      ]);

      const result = await service.getGpuStats();

      expect(result.totalWorkers).toBe(3);
      expect(result.gpuWorkers).toBe(2);
      expect(result.totalGpus).toBe(3);
      expect(result.models).toEqual({
        'RTX 4090': 2,
        'RTX 3090': 1,
      });
      expect(result.avgUtilization).toBeCloseTo(86.67, 1);
      expect(result.avgTemperature).toBeCloseTo(68.33, 1);
    });
  });
});
