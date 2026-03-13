import { defineConfig } from 'prisma/config';

// Prisma 7.x configuration file
// DATABASE_URL must be set as an environment variable in Railway
// Format: postgresql://user:password@host:port/database
export default defineConfig({
  earlyAccess: true,
  schema: './schema.prisma',
});
