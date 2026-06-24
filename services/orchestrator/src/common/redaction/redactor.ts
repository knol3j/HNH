const sensitiveKeys = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-hnh-api-key',
  'x-hnh-signature',
  'apiKey',
  'api_key',
  'password',
  'secret',
  'token',
  'jwt',
  'signature',
]);

export function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === 'object') {
    return redactObject(value as Record<string, unknown>);
  }

  return value;
}

export function redactObject(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (sensitiveKeys.has(key) || sensitiveKeys.has(key.toLowerCase())) {
        return [key, '[REDACTED]'];
      }

      return [key, redactValue(value)];
    }),
  );
}
