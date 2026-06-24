import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { circuitBreakerMetadataKey } from './circuit-breaker.decorator';
import { CircuitBreakerName, CircuitBreakerStore } from './circuit-breaker.store';

@Injectable()
export class CircuitBreakerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly store: CircuitBreakerStore,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const breakerName = this.reflector.getAllAndOverride<CircuitBreakerName>(circuitBreakerMetadataKey, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!breakerName) {
      return true;
    }

    const state = this.store.get(breakerName);

    if (state.open) {
      throw new ServiceUnavailableException({
        message: `HashNHedge circuit breaker is open: ${breakerName}`,
        breaker: state,
      });
    }

    return true;
  }
}
