import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Job, JobStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';

export type JobRecord = Job;

export interface RecoverySummary {
  recovered: number;
  deadLettered: number;
}

@Injectable()
export class JobsService {
  private sequence = 0;

  constructor(private readonly prisma: PrismaService) {}

  async createJob(dto: CreateJobDto): Promise<JobRecord> {
    const id = this.nextId('job');

    const job = await this.prisma.job.create({
      data: {
        id,
        jobType: dto.jobType,
        description: dto.description,
        requesterId: dto.requesterId,
        requirements: this.toJson(dto.requirements ?? {}),
        payload: this.toJson(dto.payload ?? {}),
        status: JobStatus.QUEUED,
        maxRetries: dto.maxRetries ?? 3,
        events: {
          create: {
            id: this.nextId('event'),
            toStatus: JobStatus.QUEUED,
            actorId: dto.requesterId,
            metadata: this.toJson({ reason: 'job_created' }),
          },
        },
      },
    });

    return job;
  }

  async listJobs(): Promise<JobRecord[]> {
    return this.prisma.job.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getJob(jobId: string): Promise<JobRecord> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return job;
  }

  async leaseNextJob(workerId: string): Promise<JobRecord> {
    const job = await this.prisma.job.findFirst({
      where: { status: JobStatus.QUEUED },
      orderBy: { createdAt: 'asc' },
    });

    if (!job) {
      throw new NotFoundException('No queued jobs are available');
    }

    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + 300000);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.ASSIGNED,
          assignedWorkerId: workerId,
          leaseId: this.nextId('lease'),
          leaseExpiresAt,
        },
      });

      await this.createEvent(tx, job.id, job.status, JobStatus.ASSIGNED, workerId, { reason: 'job_leased' });

      return updated;
    });
  }

  async markRunning(jobId: string): Promise<JobRecord> {
    const job = await this.getJob(jobId);

    if (job.status !== JobStatus.ASSIGNED) {
      throw new ConflictException(`Job ${jobId} must be ASSIGNED before it can run`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: jobId },
        data: { status: JobStatus.RUNNING },
      });

      await this.createEvent(tx, jobId, job.status, JobStatus.RUNNING, job.assignedWorkerId, { reason: 'worker_started' });

      return updated;
    });
  }

  async submitProof(jobId: string, proofHash: string, resultUri?: string): Promise<JobRecord> {
    const job = await this.getJob(jobId);

    if (job.status !== JobStatus.RUNNING) {
      throw new ConflictException(`Job ${jobId} must be RUNNING before proof submission`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.PROOF_SUBMITTED,
          proofHash,
          resultUri,
        },
      });

      await this.createEvent(tx, jobId, job.status, JobStatus.PROOF_SUBMITTED, job.assignedWorkerId, {
        reason: 'proof_submitted',
        proofHash,
      });

      return updated;
    });
  }

  async failJob(jobId: string, reason: string): Promise<JobRecord> {
    const job = await this.getJob(jobId);
    const retryCount = job.retryCount + 1;
    const nextStatus = retryCount <= job.maxRetries ? JobStatus.RETRY_QUEUED : JobStatus.DEAD_LETTERED;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: jobId },
        data: {
          status: nextStatus,
          retryCount,
          assignedWorkerId: null,
          leaseId: null,
          leaseExpiresAt: null,
        },
      });

      await this.createEvent(tx, jobId, job.status, nextStatus, job.assignedWorkerId, { reason });

      if (nextStatus === JobStatus.RETRY_QUEUED) {
        const requeued = await tx.job.update({
          where: { id: jobId },
          data: { status: JobStatus.QUEUED },
        });

        await this.createEvent(tx, jobId, nextStatus, JobStatus.QUEUED, job.assignedWorkerId, {
          reason: 'retry_requeued',
          retryCount,
        });

        return requeued;
      }

      return updated;
    });
  }

  async recoverExpiredLeases(now = new Date()): Promise<RecoverySummary> {
    const expiredJobs = await this.prisma.job.findMany({
      where: {
        status: { in: [JobStatus.ASSIGNED, JobStatus.RUNNING] },
        leaseExpiresAt: { lt: now },
      },
      orderBy: { leaseExpiresAt: 'asc' },
    });

    let recovered = 0;
    let deadLettered = 0;

    for (const job of expiredJobs) {
      const retryCount = job.retryCount + 1;
      const nextStatus = retryCount <= job.maxRetries ? JobStatus.QUEUED : JobStatus.DEAD_LETTERED;

      await this.prisma.$transaction(async (tx) => {
        await tx.job.update({
          where: { id: job.id },
          data: {
            status: nextStatus,
            retryCount,
            assignedWorkerId: null,
            leaseId: null,
            leaseExpiresAt: null,
          },
        });

        await this.createEvent(tx, job.id, job.status, nextStatus, job.assignedWorkerId, {
          reason: 'lease_expired',
          retryCount,
        });
      });

      if (nextStatus === JobStatus.QUEUED) {
        recovered += 1;
      } else {
        deadLettered += 1;
      }
    }

    return { recovered, deadLettered };
  }

  private async createEvent(
    tx: Prisma.TransactionClient,
    jobId: string,
    fromStatus: JobStatus | null,
    toStatus: JobStatus,
    actorId: string | null | undefined,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await tx.jobEvent.create({
      data: {
        id: this.nextId('event'),
        jobId,
        fromStatus,
        toStatus,
        actorId,
        metadata: this.toJson(metadata),
      },
    });
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}_${Date.now()}_${this.sequence}`;
  }

  private toJson(value: Record<string, unknown>): Prisma.InputJsonObject {
    return value as Prisma.InputJsonObject;
  }
}
