import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CircuitBreakerGuard } from './circuit-breaker.guard';
import { CircuitBreakerStore } from './circuit-breaker.store';

function createContext(): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => class TestController {},
  } as unknown as ExecutionContext;
}

describe('CircuitBreakerGuard', () => {
  it('allows traffic when breaker is closed', () => {
    const reflector = { getAllAndOverride: () => 'job-creation' } as unknown as Reflector;
    const store = new CircuitBreakerStore();
    const guard = new CircuitBreakerGuard(reflector, store);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('blocks traffic when breaker is open', () => {
    const reflector = { getAllAndOverride: () => 'job-creation' } as unknown as Reflector;
    const store = new CircuitBreakerStore();
    store.open('job-creation', 'test');
    const guard = new CircuitBreakerGuard(reflector, store);

    expect(() => guard.canActivate(createContext())).toThrow(ServiceUnavailableException);
  });
});
