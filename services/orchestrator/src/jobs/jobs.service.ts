import { Injectable, NotFoundException } from '@nestjs/common';
import { Job, JobStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';

export type JobRecord = Job;

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

      await tx.jobEvent.create({
        data: {
          id: this.nextId('event'),
          jobId: job.id,
          fromStatus: job.status,
          toStatus: JobStatus.ASSIGNED,
          actorId: workerId,
          metadata: this.toJson({ reason: 'job_leased' }),
        },
      });

      return updated;
    });
  }

  async markRunning(jobId: string): Promise<JobRecord> {
    const job = await this.getJob(jobId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: jobId },
        data: { status: JobStatus.RUNNING },
      });

      await tx.jobEvent.create({
        data: {
          id: this.nextId('event'),
          jobId,
          fromStatus: job.status,
          toStatus: JobStatus.RUNNING,
          actorId: job.assignedWorkerId,
          metadata: this.toJson({ reason: 'worker_started' }),
        },
      });

      return updated;
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
