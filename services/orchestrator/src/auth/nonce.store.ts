import { Injectable } from '@nestjs/common';

interface NonceEntry {
  expiresAt: number;
}

@Injectable()
export class NonceStore {
  private readonly nonces = new Map<string, NonceEntry>();

  remember(scope: string, nonce: string, ttlSeconds: number): boolean {
    this.prune();

    const key = `${scope}:${nonce}`;
    if (this.nonces.has(key)) {
      return false;
    }

    this.nonces.set(key, { expiresAt: Date.now() + ttlSeconds * 1000 });
    return true;
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.nonces.entries()) {
      if (entry.expiresAt <= now) {
        this.nonces.delete(key);
      }
    }
  }
}
