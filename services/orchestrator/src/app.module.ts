import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './common/config/env.schema';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { WorkersModule } from './workers/workers.module';

class AppModuleBase {}

export const AppModule = Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    HealthModule,
    WorkersModule,
    JobsModule,
  ],
})(AppModuleBase) as typeof AppModuleBase;
