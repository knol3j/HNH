import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AuthGuard } from './auth.guard';
import { apiKeyHeaderName, roleHeaderName, Role } from './roles';

function createContext(headers: Record<string, string>): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => class TestClass {},
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) => headers[name],
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  const config = {
    get: (key: string) => {
      const values: Record<string, string> = {
        ADMIN_API_KEY: 'admin-key-that-is-long-enough',
        WORKER_API_KEY: 'worker-key-that-is-long-enough',
        VENDOR_API_KEY: 'vendor-key-that-is-long-enough',
      };
      return values[key];
    },
  } as ConfigService<any, true>;

  it('allows a role with matching API key', () => {
    const reflector = {
      getAllAndOverride: () => [Role.Admin],
    } as unknown as Reflector;

    const guard = new AuthGuard(reflector, config);

    expect(
      guard.canActivate(
        createContext({
          [roleHeaderName]: Role.Admin,
          [apiKeyHeaderName]: 'admin-key-that-is-long-enough',
        }),
      ),
    ).toBe(true);
  });

  it('rejects a role not allowed by metadata', () => {
    const reflector = {
      getAllAndOverride: () => [Role.Admin],
    } as unknown as Reflector;

    const guard = new AuthGuard(reflector, config);

    expect(() =>
      guard.canActivate(
        createContext({
          [roleHeaderName]: Role.Worker,
          [apiKeyHeaderName]: 'worker-key-that-is-long-enough',
        }),
      ),
    ).toThrow('cannot access');
  });
});
