# Orchestrator CI

The orchestrator CI check should run these commands from `services/orchestrator`:

```bash
npm install
npm run prisma:generate
npm run build
npm test
```

## Required test environment

```bash
NODE_ENV=test
ORCHESTRATOR_PORT=4100
ORCHESTRATOR_VERSION=0.1.0
ALLOWED_ORIGINS=http://localhost:3000
JWT_SECRET=test-secret-that-is-long-enough
ADMIN_API_KEY=test-admin-api-key-that-is-long
WORKER_API_KEY=test-worker-api-key-that-is-long
VENDOR_API_KEY=test-vendor-api-key-that-is-long
DATABASE_URL=postgresql://user:password@localhost:5432/hashnhedge
NONCE_STORE=memory
```

## Future CI services

Once repository workflow permissions are finalized, add service containers for:

- PostgreSQL for Prisma integration tests
- Redis for replay-protection integration tests

The current Jest e2e tests mock Prisma and can run without external services.
