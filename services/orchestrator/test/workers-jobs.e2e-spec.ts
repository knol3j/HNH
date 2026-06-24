import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Worker and job loop', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/hashnhedge';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

    expect(jobResponse.body.status).toBe('queued');

    const leaseResponse = await request(app.getHttpServer())
      .post('/jobs/lease-next')
      .send({ workerId: 'worker-rig-001' })
      .expect(201);

    expect(leaseResponse.body.status).toBe('assigned');
    expect(leaseResponse.body.assignedWorkerId).toBe('worker-rig-001');
  });
});
