import { JobStatus } from '@prisma/client';

import { JobsService } from './jobs.service';

function createPrismaMock(seedJobs: any[]) {
  const jobs = new Map(seedJobs.map((job) => [job.id, job]));
  const events: any[] = [];

  const prisma = {
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
    job: {
      findMany: jest.fn(async () => Array.from(jobs.values())),
      update: jest.fn(async ({ where, data }: any) => {
        const updated = { ...jobs.get(where.id), ...data };
        jobs.set(where.id, updated);
        return updated;
      }),
    },
    jobEvent: {
      create: jest.fn(async ({ data }: any) => {
        events.push(data);
        return data;
      }),
    },
  };

  return { prisma, jobs, events };
}

describe('JobsService recovery', () => {
  it('requeues retryable expired jobs', async () => {
    const expiredAt = new Date('2026-01-01T00:00:00.000Z');
    const { prisma, jobs, events } = createPrismaMock([
      {
        id: 'job_1',
        status: JobStatus.ASSIGNED,
        retryCount: 0,
        maxRetries: 3,
        assignedWorkerId: 'worker_1',
        leaseExpiresAt: expiredAt,
      },
    ]);

    const service = new JobsService(prisma as any);
    const summary = await service.recoverExpiredLeases(new Date('2026-01-01T00:05:00.000Z'));

    expect(summary).toEqual({ recovered: 1, deadLettered: 0 });
    expect(jobs.get('job_1')).toMatchObject({
      status: JobStatus.QUEUED,
      retryCount: 1,
      assignedWorkerId: null,
      leaseId: null,
      leaseExpiresAt: null,
    });
    expect(events[0]).toMatchObject({
      jobId: 'job_1',
      fromStatus: JobStatus.ASSIGNED,
      toStatus: JobStatus.QUEUED,
      actorId: 'worker_1',
    });
  });

  it('dead letters exhausted expired jobs', async () => {
    const expiredAt = new Date('2026-01-01T00:00:00.000Z');
    const { prisma, jobs } = createPrismaMock([
      {
        id: 'job_2',
        status: JobStatus.RUNNING,
        retryCount: 3,
        maxRetries: 3,
        assignedWorkerId: 'worker_2',
        leaseExpiresAt: expiredAt,
      },
    ]);

    const service = new JobsService(prisma as any);
    const summary = await service.recoverExpiredLeases(new Date('2026-01-01T00:05:00.000Z'));

    expect(summary).toEqual({ recovered: 0, deadLettered: 1 });
    expect(jobs.get('job_2')).toMatchObject({
      status: JobStatus.DEAD_LETTERED,
      retryCount: 4,
      assignedWorkerId: null,
    });
  });
});
