import { Module } from '@nestjs/common';

import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';
import { TracingService } from './tracing.service';

@Module({
  controllers: [MonitoringController],
  providers: [MetricsService, TracingService],
  exports: [MetricsService, TracingService]
})
export class MonitoringModule {}
