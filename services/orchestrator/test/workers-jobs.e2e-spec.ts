import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

function createMockPrisma() {
  const workers = new Map<string, any>();
  const jobs = new Map<string, any>();
  const events: any[] = [];

  const prisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
    worker: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const existing = workers.get(where.id);
        const value = existing
          ? { ...existing, ...update, updatedAt: new Date() }
          : { ...create, createdAt: new Date(), updatedAt: new Date() };
        workers.set(where.id, value);
        return value;
      }),
      findMany: jest.fn(async () => Array.from(workers.values())),
      findUnique: jest.fn(async ({ where }: any) => workers.get(where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => {
        const value = { ...workers.get(where.id), ...data, updatedAt: new Date() };
        workers.set(where.id, value);
        return value;
      }),
    },
    job: {
      create: jest.fn(async ({ data }: any) => {
        const value = { ...data, createdAt: new Date(), updatedAt: new Date() };
        jobs.set(data.id, value);
        if (data.events?.create) events.push(data.events.create);
        return value;
      }),
      findMany: jest.fn(async () => Array.from(jobs.values())),
      findUnique: jest.fn(async ({ where }: any) => jobs.get(where.id) ?? null),
      findFirst: jest.fn(async ({ where }: any) => Array.from(jobs.values()).find((job) => job.status === where.status) ?? null),
      update: jest.fn(async ({ where, data }: any) => {
        const value = { ...jobs.get(where.id), ...data, updatedAt: new Date() };
        jobs.set(where.id, value);
        return value;
      }),
    },
    jobEvent: {
      create: jest.fn(async ({ data }: any) => {
        events.push(data);
        return data;
      }),
    },
  };

  return prisma;
}

describe('Worker and job loop', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/hashnhedge';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(createMockPrisma())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a worker, queues a job, and leases the job', async () => {
    await request(app.getHttpServer())
      .post('/workers')
      .send({
        workerName: 'worker-rig-001',
        walletAddress: 'GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc',
        capabilities: ['mining', 'ai-inference'],
        gpuCount: 2,
      })
      .expect(201);

    const jobResponse = await request(app.getHttpServer())
      .post('/jobs')
      .send({ jobType: 'ai-inference', description: 'Inference batch' })
      .expect(201);

    expect(jobResponse.body.status).toBe('QUEUED');

    const leaseResponse = await request(app.getHttpServer())
      .post('/jobs/lease-next')
      .send({ workerId: 'worker-rig-001' })
      .expect(201);

    expect(leaseResponse.body.status).toBe('ASSIGNED');
    expect(leaseResponse.body.assignedWorkerId).toBe('worker-rig-001');
  });
});
