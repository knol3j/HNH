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
npm run start:dev
```

The API listens on `ORCHESTRATOR_PORT`, defaulting to `4100`.

## Endpoints in this foundation PR

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

## Notes

This is a first implementation pass. The worker and job stores are intentionally in-memory so the API contract, validation, and lifecycle can be hardened before wiring in PostgreSQL/Prisma persistence.

## Framework decision

See `docs/adr/ADR-001-backend-framework.md`.
