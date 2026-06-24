import { z } from 'zod';

const portSchema = z.coerce.number().int().min(1).max(65_535);
const secretSchema = z.string().min(24, 'secret must be at least 24 characters');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ORCHESTRATOR_PORT: portSchema.default(4100),
  ORCHESTRATOR_VERSION: z.string().min(1).default('0.1.0'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(24, 'JWT_SECRET must be at least 24 characters'),
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  REDIS_URL: z.string().url().optional(),
  NONCE_STORE: z.enum(['memory', 'redis']).default('memory'),
  BREAKER_STORE: z.enum(['memory', 'redis']).default('memory'),
  ADMIN_API_KEY: secretSchema.default('local-admin-api-key-change-me'),
  WORKER_API_KEY: secretSchema.default('local-worker-api-key-change-me'),
  VENDOR_API_KEY: secretSchema.default('local-vendor-api-key-change-me'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid orchestrator environment: ${errors}`);
  }

  if (parsed.data.NONCE_STORE === 'redis' && !parsed.data.REDIS_URL) {
    throw new Error('Invalid orchestrator environment: REDIS_URL is required when NONCE_STORE=redis');
  }

  if (parsed.data.BREAKER_STORE === 'redis' && !parsed.data.REDIS_URL) {
    throw new Error('Invalid orchestrator environment: REDIS_URL is required when BREAKER_STORE=redis');
  }

  return parsed.data;
}
