# HashNHedge Orchestrator Service

NestJS control-plane backend for HashNHedge production orchestration.

## Responsibilities

- authentication and RBAC
- worker registration and heartbeats
- job scheduling and leasing
- vendor marketplace APIs
- payment coordination
- Solana transaction coordination
- observability and audit logging
- circuit breakers for high-risk actions

## Local setup

```bash
cd services/orchestrator
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

The API listens on `ORCHESTRATOR_PORT`, defaulting to `4100`.

## Persistence

This service uses Prisma with PostgreSQL.

Initial persisted models:

- `Worker`
- `Job`
- `JobEvent`

`JobEvent` records lifecycle transitions for auditability.

## Endpoints

- `GET /health`
- `POST /workers`
- `GET /workers`
- `GET /workers/:workerId`
- `POST /workers/:workerId/heartbeat`
- `POST /jobs`
- `GET /jobs`
- `GET /jobs/:jobId`
- `POST /jobs/lease-next`
- `POST /jobs/:jobId/running`

## API docs

Swagger docs are exposed at `/docs` when the service is running.

## Testing

```bash
npm test
```

The e2e tests mock Prisma so they can run without a live database. Database-backed integration tests should be added once CI has a PostgreSQL service.

## Framework decision

See `docs/adr/ADR-001-backend-framework.md`.
