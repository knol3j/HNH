import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

class HealthModuleBase {}

export const HealthModule = Module({
  controllers: [HealthController],
  providers: [HealthService],
})(HealthModuleBase) as typeof HealthModuleBase;
