import { redactObject } from './redactor';

describe('redactObject', () => {
  it('redacts sensitive fields recursively', () => {
    expect(
      redactObject({
        authorization: 'Bearer secret',
        safe: 'visible',
        nested: {
          token: 'secret-token',
          value: 42,
        },
      }),
    ).toEqual({
      authorization: '[REDACTED]',
      safe: 'visible',
      nested: {
        token: '[REDACTED]',
        value: 42,
      },
    });
  });
});
