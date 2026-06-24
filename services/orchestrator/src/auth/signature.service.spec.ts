import { SignatureService } from './signature.service';

describe('SignatureService', () => {
  const service = new SignatureService();

  it('verifies matching signatures', () => {
    const payload = service.buildPayload('POST', '/workers', '1760000000', 'nonce-1', { ok: true });
    const signature = service.sign(payload, 'secret-that-is-long-enough');

    expect(service.verify(payload, 'secret-that-is-long-enough', signature)).toBe(true);
  });

  it('rejects mismatched signatures', () => {
    const payload = service.buildPayload('POST', '/workers', '1760000000', 'nonce-1', { ok: true });
    const signature = service.sign(payload, 'secret-that-is-long-enough');

    expect(service.verify(payload, 'different-secret-that-is-long-enough', signature)).toBe(false);
  });
});
