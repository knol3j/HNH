import { Injectable } from '@nestjs/common';
import { JobStatus, WorkerStatus } from '@prisma/client';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

import { CircuitBreakerStore } from '../common/safety/circuit-breaker.store';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpRequests = new Counter({
    name: 'hnh_http_requests_total',
    help: 'Total HTTP requests handled by the orchestrator',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });

  readonly httpDuration = new Histogram({
    name: 'hnh_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [this.registry],
  });

  readonly activeWorkers = new Gauge({
    name: 'hnh_workers_active',
    help: 'Currently active worker count',
    registers: [this.registry],
  });

  readonly queuedJobs = new Gauge({
    name: 'hnh_jobs_queued',
    help: 'Queued job count',
    registers: [this.registry],
  });

  readonly runningJobs = new Gauge({
    name: 'hnh_jobs_running',
    help: 'Running job count',
    registers: [this.registry],
  });

  readonly openBreakers = new Gauge({
    name: 'hnh_circuit_breakers_open',
    help: 'Open circuit breaker count',
    registers: [this.registry],
  });

  constructor(private readonly prisma: PrismaService, private readonly breakers: CircuitBreakerStore) {
    collectDefaultMetrics({ register: this.registry, prefix: 'hnh_' });
  }

  async updateGauges(): Promise<void> {
    const activeWorkerCount = await this.prisma.worker.count({ where: { status: WorkerStatus.ACTIVE } });
    const queuedJobCount = await this.prisma.job.count({ where: { status: JobStatus.QUEUED } });
    const runningJobCount = await this.prisma.job.count({ where: { status: JobStatus.RUNNING } });
    const breakerStates = await this.breakers.list();

    this.activeWorkers.set(activeWorkerCount);
    this.queuedJobs.set(queuedJobCount);
    this.runningJobs.set(runningJobCount);
    this.openBreakers.set(breakerStates.filter((breaker) => breaker.open).length);
  }

  async render(): Promise<string> {
    await this.updateGauges();
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
