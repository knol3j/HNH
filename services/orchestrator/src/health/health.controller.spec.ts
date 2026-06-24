import { ConfigService } from '@nestjs/config';

import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns health metadata', () => {
    const config = {
      get: (key: string) => {
        const values: Record<string, string> = {
          ORCHESTRATOR_VERSION: '0.1.0',
          NODE_ENV: 'test',
        };
        return values[key];
      },
    } as ConfigService<any, true>;

    const service = new HealthService(config);

    expect(service.getHealth()).toMatchObject({
      status: 'ok',
      service: 'hashnhedge-orchestrator',
      version: '0.1.0',
      environment: 'test',
    });
  });
});
