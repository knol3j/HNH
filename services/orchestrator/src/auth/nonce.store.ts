import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { EnvConfig } from '../common/config/env.schema';

interface NonceEntry {
  expiresAt: number;
}

@Injectable()
export class NonceStore implements OnModuleDestroy {
  private readonly nonces = new Map<string, NonceEntry>();
  private readonly redis?: Redis;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    if (this.config.get('NONCE_STORE', { infer: true }) === 'redis') {
      this.redis = new Redis(this.config.get('REDIS_URL', { infer: true }));
    }
  }

  async remember(scope: string, nonce: string, ttlSeconds: number): Promise<boolean> {
    const key = this.key(scope, nonce);

    if (this.redis) {
      const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    }

    this.prune();

    if (this.nonces.has(key)) {
      return false;
    }

    this.nonces.set(key, { expiresAt: Date.now() + ttlSeconds * 1000 });
    return true;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit();
  }

  private key(scope: string, nonce: string): string {
    return `hnh:nonce:${scope}:${nonce}`;
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.nonces.entries()) {
      if (entry.expiresAt <= now) {
        this.nonces.delete(key);
      }
    }
  }
}
