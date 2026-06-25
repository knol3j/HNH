import { Module } from '@nestjs/common';

import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  controllers: [MonitoringController],
  providers: [MetricsService],
  exports: [MetricsService]
})
export class MonitoringModule {}
