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
  ADMIN_API_KEY: secretSchema,
  WORKER_API_KEY: secretSchema,
  VENDOR_API_KEY: secretSchema,
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

  return parsed.data;
}
