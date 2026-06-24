import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { EnvConfig } from '../config/env.schema';

export type CircuitBreakerName =
  | 'worker-registration'
  | 'job-creation'
  | 'job-leasing'
  | 'lease-recovery'
  | 'payouts'
  | 'admin-actions';

export interface CircuitBreakerState {
  name: CircuitBreakerName;
  open: boolean;
  reason?: string;
  openedAt?: string;
  openedBy?: string;
}

@Injectable()
export class CircuitBreakerStore implements OnModuleDestroy {
  private readonly states = new Map<CircuitBreakerName, CircuitBreakerState>();
  private readonly redis?: Redis;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    for (const name of this.knownBreakers()) {
      this.states.set(name, { name, open: false });
    }

    if (this.config.get('BREAKER_STORE', { infer: true }) === 'redis') {
      this.redis = new Redis(this.config.get('REDIS_URL', { infer: true }));
    }
  }

  async list(): Promise<CircuitBreakerState[]> {
    if (!this.redis) {
      return Array.from(this.states.values());
    }

    const states = await Promise.all(this.knownBreakers().map((name) => this.get(name)));
    return states;
  }

  async get(name: CircuitBreakerName): Promise<CircuitBreakerState> {
    if (!this.redis) {
      return this.states.get(name) ?? { name, open: false };
    }

    const value = await this.redis.get(this.key(name));
    return value ? (JSON.parse(value) as CircuitBreakerState) : { name, open: false };
  }

  async open(name: CircuitBreakerName, reason: string, openedBy?: string): Promise<CircuitBreakerState> {
    const state: CircuitBreakerState = {
      name,
      open: true,
      reason,
      openedBy,
      openedAt: new Date().toISOString(),
    };

    if (this.redis) {
      await this.redis.set(this.key(name), JSON.stringify(state));
    } else {
      this.states.set(name, state);
    }

    return state;
  }

  async close(name: CircuitBreakerName): Promise<CircuitBreakerState> {
    const state: CircuitBreakerState = { name, open: false };

    if (this.redis) {
      await this.redis.set(this.key(name), JSON.stringify(state));
    } else {
      this.states.set(name, state);
    }

    return state;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit();
  }

  private key(name: CircuitBreakerName): string {
    return `hnh:circuit-breaker:${name}`;
  }

  private knownBreakers(): CircuitBreakerName[] {
    return ['worker-registration', 'job-creation', 'job-leasing', 'lease-recovery', 'payouts', 'admin-actions'];
  }
}
