import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateJobDto } from './dto/create-job.dto';
import { JobStatus } from './job-status';

export interface JobRecord {
  id: string;
  jobType: string;
  description: string;
  status: JobStatus;
  assignedWorkerId?: string;
  leaseId?: string;
  leaseExpiresAt?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class JobsService {
  private readonly jobs = new Map<string, JobRecord>();
  private sequence = 0;

  createJob(dto: CreateJobDto): JobRecord {
    const now = new Date().toISOString();
    const job: JobRecord = {
      id: this.nextId('job'),
      jobType: dto.jobType,
      description: dto.description,
      status: JobStatus.Queued,
      retryCount: 0,
      maxRetries: dto.maxRetries ?? 3,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(job.id, job);
    return job;
  }

  listJobs(): JobRecord[] {
    return Array.from(this.jobs.values());
  }

  getJob(jobId: string): JobRecord {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return job;
  }

  leaseNextJob(workerId: string): JobRecord {
    const job = this.listJobs().find((candidate) => candidate.status === JobStatus.Queued);

    if (!job) {
      throw new NotFoundException('No queued jobs are available');
    }

    const now = new Date();
    const updated: JobRecord = {
      ...job,
      status: JobStatus.Assigned,
      assignedWorkerId: workerId,
      leaseId: this.nextId('lease'),
      leaseExpiresAt: new Date(now.getTime() + 300000).toISOString(),
      updatedAt: now.toISOString(),
    };

    this.jobs.set(job.id, updated);
    return updated;
  }

  markRunning(jobId: string): JobRecord {
    const job = this.getJob(jobId);
    const updated = { ...job, status: JobStatus.Running, updatedAt: new Date().toISOString() };
    this.jobs.set(job.id, updated);
    return updated;
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}_${Date.now()}_${this.sequence}`;
  }
}
