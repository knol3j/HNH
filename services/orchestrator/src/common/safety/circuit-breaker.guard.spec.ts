import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { CircuitBreakerGuard } from './circuit-breaker.guard';
import { CircuitBreakerStore } from './circuit-breaker.store';

function createContext(): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => class TestController {},
  } as unknown as ExecutionContext;
}

function createConfig(): ConfigService<any, true> {
  return {
    get: (key: string) => (key === 'BREAKER_STORE' ? 'memory' : undefined),
  } as ConfigService<any, true>;
}

describe('CircuitBreakerGuard', () => {
  it('allows traffic when breaker is closed', async () => {
    const reflector = { getAllAndOverride: () => 'job-creation' } as unknown as Reflector;
    const store = new CircuitBreakerStore(createConfig());
    const guard = new CircuitBreakerGuard(reflector, store);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('blocks traffic when breaker is open', async () => {
    const reflector = { getAllAndOverride: () => 'job-creation' } as unknown as Reflector;
    const store = new CircuitBreakerStore(createConfig());
    await store.open('job-creation', 'test');
    const guard = new CircuitBreakerGuard(reflector, store);

    await expect(guard.canActivate(createContext())).rejects.toThrow(ServiceUnavailableException);
  });
});
