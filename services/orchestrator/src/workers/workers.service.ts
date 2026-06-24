import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Worker, WorkerStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { RegisterWorkerDto } from './dto/register-worker.dto';

export type WorkerRecord = Worker;

@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  async registerWorker(dto: RegisterWorkerDto): Promise<WorkerRecord> {
    const id = this.normalizeWorkerId(dto.workerName);
    const now = new Date();

    return this.prisma.worker.upsert({
      where: { id },
      create: {
        id,
        workerName: dto.workerName,
        walletAddress: dto.walletAddress,
        capabilities: dto.capabilities ?? ['mining'],
        gpuCount: dto.gpuCount ?? 0,
        gpuModel: dto.gpuModel,
        acceptsLeasedJobs: dto.acceptsLeasedJobs ?? true,
        status: WorkerStatus.REGISTERED,
        metadata: this.toJson(dto.metadata ?? {}),
        lastHeartbeatAt: now,
      },
      update: {
        workerName: dto.workerName,
        walletAddress: dto.walletAddress,
        capabilities: dto.capabilities ?? ['mining'],
        gpuCount: dto.gpuCount ?? 0,
        gpuModel: dto.gpuModel,
        acceptsLeasedJobs: dto.acceptsLeasedJobs ?? true,
        metadata: this.toJson(dto.metadata ?? {}),
        lastHeartbeatAt: now,
      },
    });
  }

  async listWorkers(): Promise<WorkerRecord[]> {
    return this.prisma.worker.findMany({ orderBy: { workerName: 'asc' } });
  }

  async getWorker(workerId: string): Promise<WorkerRecord> {
    const worker = await this.prisma.worker.findUnique({ where: { id: workerId } });

    if (!worker) {
      throw new NotFoundException(`Worker ${workerId} not found`);
    }

    return worker;
  }

  async heartbeat(workerId: string, dto: HeartbeatDto): Promise<WorkerRecord> {
    await this.getWorker(workerId);

    return this.prisma.worker.update({
      where: { id: workerId },
      data: {
        status: WorkerStatus.ACTIVE,
        lastHeartbeatAt: new Date(),
        telemetry: this.toJson({
          ...(dto.telemetry ?? {}),
          gpuUtilizationPercent: dto.gpuUtilizationPercent,
          hashrate: dto.hashrate,
          activeJobs: dto.activeJobs,
          status: dto.status,
        }),
      },
    });
  }

  private normalizeWorkerId(workerName: string): string {
    return workerName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  }

  private toJson(value: Record<string, unknown>): Prisma.InputJsonObject {
    return value as Prisma.InputJsonObject;
  }
}
