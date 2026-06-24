import { Injectable, NotFoundException } from '@nestjs/common';

import { HeartbeatDto } from './dto/heartbeat.dto';
import { RegisterWorkerDto } from './dto/register-worker.dto';

export interface WorkerRecord {
  id: string;
  workerName: string;
  walletAddress: string;
  capabilities: string[];
  gpuCount: number;
  gpuModel?: string;
  acceptsLeasedJobs: boolean;
  status: string;
  metadata: Record<string, unknown>;
  lastHeartbeatAt: string;
  createdAt: string;
  telemetry?: Record<string, unknown>;
}

@Injectable()
export class WorkersService {
  private readonly workers = new Map<string, WorkerRecord>();

  registerWorker(dto: RegisterWorkerDto): WorkerRecord {
    const now = new Date().toISOString();
    const id = this.normalizeWorkerId(dto.workerName);
    const existing = this.workers.get(id);

    const worker: WorkerRecord = {
      id,
      workerName: dto.workerName,
      walletAddress: dto.walletAddress,
      capabilities: dto.capabilities ?? ['mining'],
      gpuCount: dto.gpuCount ?? 0,
      gpuModel: dto.gpuModel,
      acceptsLeasedJobs: dto.acceptsLeasedJobs ?? true,
      status: existing?.status ?? 'registered',
      metadata: dto.metadata ?? {},
      createdAt: existing?.createdAt ?? now,
      lastHeartbeatAt: now,
      telemetry: existing?.telemetry,
    };

    this.workers.set(id, worker);
    return worker;
  }

  listWorkers(): WorkerRecord[] {
    return Array.from(this.workers.values()).sort((a, b) => a.workerName.localeCompare(b.workerName));
  }

  getWorker(workerId: string): WorkerRecord {
    const worker = this.workers.get(workerId);

    if (!worker) {
      throw new NotFoundException(`Worker ${workerId} not found`);
    }

    return worker;
  }

  heartbeat(workerId: string, dto: HeartbeatDto): WorkerRecord {
    const worker = this.getWorker(workerId);

    const updated: WorkerRecord = {
      ...worker,
      status: dto.status ?? 'active',
      lastHeartbeatAt: new Date().toISOString(),
      telemetry: {
        ...(worker.telemetry ?? {}),
        ...(dto.telemetry ?? {}),
        gpuUtilizationPercent: dto.gpuUtilizationPercent,
        hashrate: dto.hashrate,
        activeJobs: dto.activeJobs,
      },
    };

    this.workers.set(workerId, updated);
    return updated;
  }

  private normalizeWorkerId(workerName: string): string {
    return workerName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  }
}
