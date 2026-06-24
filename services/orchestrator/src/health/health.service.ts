import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EnvConfig } from '../common/config/env.schema';

export interface HealthResponse {
  status: 'ok';
  service: 'hashnhedge-orchestrator';
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}

class HealthServiceBase {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'hashnhedge-orchestrator',
      version: this.config.get('ORCHESTRATOR_VERSION', { infer: true }),
      environment: this.config.get('NODE_ENV', { infer: true }),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}

export const HealthService = Injectable()(HealthServiceBase) as typeof HealthServiceBase;
