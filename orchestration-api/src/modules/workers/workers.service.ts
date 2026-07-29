import { Injectable, BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { RegisterWorkerDto, UpdateWorkerGpuDto } from './dto';

interface WorkerRegistrationData {
  walletAddress: string;
  hardwareInfo?: {
    gpuModel?: string;
    gpuCount?: number;
    cpuModel?: string;
    cpuCores?: number;
    ramGb?: number;
    osType?: string;
    osVersion?: string;
  };
}

@Injectable()
export class WorkersService {
  private readonly logger = new Logger(WorkersService.name);

  constructor(private prisma: PrismaService) {}

  async register(data: RegisterWorkerDto) {
    this.logger.log(`Registering new worker for wallet: ${data.walletAddress}`);

    // Validate wallet address
    if (!data.walletAddress || typeof data.walletAddress !== 'string') {
      throw new BadRequestException('Valid wallet address is required');
    }

    // Validate wallet address format (basic Solana address validation)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(data.walletAddress)) {
      throw new BadRequestException('Invalid Solana wallet address format');
    }

    try {
      // Generate unique worker ID
      const workerId = this.generateWorkerId(data.walletAddress);

      // Build hardware info from structured DTO fields
      const hardwareInfo: Record<string, any> = {};
      if (data.gpuInfo) {
        hardwareInfo.gpuModel = data.gpuInfo.model;
        hardwareInfo.gpuCount = data.gpuInfo.count;
        hardwareInfo.gpuMemoryMb = data.gpuInfo.memoryMb;
        hardwareInfo.gpuUtilization = data.gpuInfo.utilization;
        hardwareInfo.gpuTemperature = data.gpuInfo.temperature;
        hardwareInfo.gpuPowerDrawW = data.gpuInfo.powerDrawW;
      }
      if (data.cpuInfo) {
        hardwareInfo.cpuModel = data.cpuInfo.model;
        hardwareInfo.cpuCores = data.cpuInfo.cores;
        hardwareInfo.cpuThreads = data.cpuInfo.threads;
      }
      if (data.ramMb) {
        hardwareInfo.ramGb = Math.round(data.ramMb / 1024);
      }
      if (data.osType) {
        hardwareInfo.osType = data.osType;
      }
      if (data.osVersion) {
        hardwareInfo.osVersion = data.osVersion;
      }

      // Check if worker already exists
      const existingWorker = await this.prisma.worker.findUnique({
        where: { workerId },
      });

      if (existingWorker) {
        // Update existing worker instead of creating duplicate
        this.logger.log(`Worker ${workerId} already exists, updating last seen`);
        return await this.prisma.worker.update({
          where: { workerId },
          data: {
            lastSeen: new Date(),
            hardwareInfo: {
              ...(existingWorker.hardwareInfo as Record<string, any> || {}),
              ...hardwareInfo,
            } as Prisma.JsonValue,
            gpuCount: data.gpuInfo?.count ?? (existingWorker.hardwareInfo as Record<string, any>)?.gpuCount ?? null,
            gpuModel: data.gpuInfo?.model ?? (existingWorker.hardwareInfo as Record<string, any>)?.gpuModel ?? null,
            cpuCores: data.cpuInfo?.cores ?? (existingWorker.hardwareInfo as Record<string, any>)?.cpuCores ?? null,
            ramGb: hardwareInfo.ramGb ?? (existingWorker.hardwareInfo as Record<string, any>)?.ramGb ?? null,
            status: 'active',
          },
        });
      }

      // Create new worker
      const worker = await this.prisma.worker.create({
        data: {
          workerId,
          walletAddress: data.walletAddress,
          hardwareInfo: hardwareInfo as Prisma.JsonValue || {},
          gpuCount: data.gpuInfo?.count ?? null,
          gpuModel: data.gpuInfo?.model ?? null,
          cpuCores: data.cpuInfo?.cores ?? null,
          ramGb: hardwareInfo.ramGb ?? null,
          status: 'active',
          lastSeen: new Date(),
        },
      });

      this.logger.log(`Successfully registered worker ${workerId}`);
      return worker;

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }

      this.logger.error(`Failed to register worker: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to register worker. Please try again.');
    }
  }

  async updateGpuInfo(workerId: string, gpuDto: UpdateWorkerGpuDto) {
    this.logger.log(`Updating GPU info for worker ${workerId}`);

    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
    });

    if (!worker) {
      throw new NotFoundException(`Worker ${workerId} not found`);
    }

    const existingHardware = (worker.hardwareInfo as Record<string, any>) || {};

    const updatedHardware = {
      ...existingHardware,
      gpuModel: gpuDto.model ?? existingHardware.gpuModel,
      gpuCount: gpuDto.count,
      gpuMemoryMb: gpuDto.memoryMb ?? existingHardware.gpuMemoryMb,
      gpuUtilization: gpuDto.utilization ?? existingHardware.gpuUtilization,
      gpuTemperature: gpuDto.temperature ?? existingHardware.gpuTemperature,
      gpuPowerDrawW: gpuDto.powerDrawW ?? existingHardware.gpuPowerDrawW,
    };

    return this.prisma.worker.update({
      where: { workerId },
      data: {
        hardwareInfo: updatedHardware as Prisma.JsonValue,
        gpuCount: gpuDto.count,
        gpuModel: gpuDto.model ?? existingHardware.gpuModel ?? null,
        lastSeen: new Date(),
      },
    });
  }

  async getGpuStats() {
    this.logger.log('Aggregating GPU stats across all workers');

    const workers = await this.prisma.worker.findMany({
      where: {
        status: 'active',
      },
      select: {
        workerId: true,
        walletAddress: true,
        hardwareInfo: true,
        gpuCount: true,
        gpuModel: true,
        status: true,
        lastSeen: true,
      },
    });

    const gpuWorkers = workers.filter((w) => {
      const hw = w.hardwareInfo as Record<string, any>;
      return w.gpuCount && w.gpuCount > 0 || w.gpuModel || (hw && (hw.gpuCount > 0 || hw.gpuModel));
    });

    const modelCounts: Record<string, number> = {};
    let totalGpus = 0;
    let totalMemoryMb = 0;
    let avgUtilization = 0;
    let avgTemperature = 0;
    let utilCount = 0;
    let tempCount = 0;

    for (const w of gpuWorkers) {
      const hw = w.hardwareInfo as Record<string, any>;
      const count = w.gpuCount || hw?.gpuCount || 0;
      totalGpus += count;

      const model = w.gpuModel || hw?.gpuModel;
      if (model) {
        modelCounts[model] = (modelCounts[model] || 0) + count;
      }
      if (hw?.gpuMemoryMb) {
        totalMemoryMb += hw.gpuMemoryMb * count;
      }
      if (typeof hw?.gpuUtilization === 'number') {
        avgUtilization += hw.gpuUtilization * count;
        utilCount += count;
      }
      if (typeof hw?.gpuTemperature === 'number') {
        avgTemperature += hw.gpuTemperature * count;
        tempCount += count;
      }
    }

    return {
      totalWorkers: workers.length,
      gpuWorkers: gpuWorkers.length,
      totalGpus,
      models: modelCounts,
      totalMemoryMb,
      avgUtilization: utilCount > 0 ? parseFloat((avgUtilization / utilCount).toFixed(2)) : 0,
      avgTemperature: tempCount > 0 ? parseFloat((avgTemperature / tempCount).toFixed(2)) : 0,
      workers: gpuWorkers.map((w) => ({
        workerId: w.workerId,
        walletAddress: w.walletAddress,
        status: w.status,
        lastSeen: w.lastSeen,
        gpuInfo: w.hardwareInfo,
      })),
    };
  }

  async findOne(workerId: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
      include: {
        shares: {
          take: 10,
          orderBy: { submittedAt: 'desc' },
        },
        earnings: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!worker) {
      return null;
    }

    return worker;
  }

  async findAll() {
    return this.prisma.worker.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        workerId: true,
        walletAddress: true,
        status: true,
        createdAt: true,
        lastSeen: true,
        totalShares: true,
        validShares: true,
        invalidShares: true,
        totalEarnings: true,
        hardwareInfo: true,
        gpuCount: true,
        gpuModel: true,
        cpuCores: true,
        ramGb: true,
      },
    });
  }

  async updateHeartbeat(workerId: string) {
    try {
      return await this.prisma.worker.update({
        where: { workerId },
        data: {
          lastSeen: new Date(),
          status: 'active',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update heartbeat for worker ${workerId}: ${error.message}`);
      throw new BadRequestException('Failed to update worker heartbeat');
    }
  }

  async getStats(workerId: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
      include: {
        shares: {
          where: {
            submittedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        },
        earnings: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        },
      },
    });

    if (!worker) {
      return null;
    }

    const validShares24h = worker.shares.filter(s => s.isValid).length;
    const invalidShares24h = worker.shares.filter(s => !s.isValid).length;
    const earnings24h = worker.earnings.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    return {
      workerId: worker.workerId,
      walletAddress: worker.walletAddress,
      status: worker.status,
      totalShares: Number(worker.totalShares),
      validShares: Number(worker.validShares),
      invalidShares: Number(worker.invalidShares),
      totalEarnings: Number(worker.totalEarnings),
      validShares24h,
      invalidShares24h,
      earnings24h,
      acceptanceRate: worker.totalShares > 0
        ? (Number(worker.validShares) / Number(worker.totalShares) * 100).toFixed(2) + '%'
        : '0%',
      lastSeen: worker.lastSeen,
      createdAt: worker.createdAt,
      hardwareInfo: worker.hardwareInfo,
      gpuCount: worker.gpuCount,
      gpuModel: worker.gpuModel,
      cpuCores: worker.cpuCores,
      ramGb: worker.ramGb,
    };
  }

  private generateWorkerId(walletAddress: string): string {
    // Generate deterministic worker ID from wallet address
    const hash = crypto.createHash('sha256').update(walletAddress).digest('hex');
    return `worker_${hash.substring(0, 16)}`;
  }
}
