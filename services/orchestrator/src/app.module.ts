import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { validateEnv } from './common/config/env.schema';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { WorkersModule } from './workers/workers.module';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), AuthModule, DatabaseModule, HealthModule, WorkersModule, JobsModule] })
export class AppModule {}
