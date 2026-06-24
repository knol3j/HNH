import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SignatureService {
  buildPayload(method: string, path: string, timestamp: string, nonce: string, body: unknown): string {
    const normalizedBody = body === undefined ? '' : JSON.stringify(body ?? {});
    return [method.toUpperCase(), path, timestamp, nonce, normalizedBody].join('|');
  }

  sign(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  verify(payload: string, secret: string, signature: string): boolean {
    const expected = this.sign(payload, secret);
    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, actualBuffer);
  }
}
