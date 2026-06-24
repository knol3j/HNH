import { Module } from '@nestjs/common';

import { CircuitBreakerGuard } from './circuit-breaker.guard';
import { CircuitBreakerStore } from './circuit-breaker.store';

@Module({
  providers: [CircuitBreakerStore, CircuitBreakerGuard],
  exports: [CircuitBreakerStore, CircuitBreakerGuard],
})
export class SafetyModule {}
