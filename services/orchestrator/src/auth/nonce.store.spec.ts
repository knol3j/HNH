import { ConfigService } from '@nestjs/config';

import { NonceStore } from './nonce.store';

describe('NonceStore', () => {
  it('accepts a nonce once per scope', async () => {
    const config = {
      get: (key: string) => (key === 'NONCE_STORE' ? 'memory' : undefined),
    } as ConfigService<any, true>;

    const store = new NonceStore(config);

    await expect(store.remember('worker:key', 'nonce-1', 300)).resolves.toBe(true);
    await expect(store.remember('worker:key', 'nonce-1', 300)).resolves.toBe(false);
    await store.onModuleDestroy();
  });
});
