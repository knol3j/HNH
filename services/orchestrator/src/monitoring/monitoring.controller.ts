import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { MetricsService } from './metrics.service';

@ApiTags('monitoring')
@Controller('metrics')
export class MonitoringController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOkResponse({ description: 'Prometheus metrics' })
  getMetrics(): Promise<string> {
    return this.metrics.render();
  }
}
