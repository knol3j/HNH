# HashNHedge Orchestrator Service

This directory is the target home for the NestJS control-plane backend.

## Responsibility

The orchestrator coordinates off-chain workflows:

- authentication and RBAC
- worker registration and heartbeats
- job scheduling and leasing
- vendor marketplace APIs
- payment coordination
- Solana transaction coordination
- observability and audit logging
- circuit breakers for high-risk actions

## Initial module layout

```text
services/orchestrator/
├── src/
│   ├── auth/
│   ├── workers/
│   ├── jobs/
│   ├── vendors/
│   ├── payments/
│   ├── solana/
│   ├── monitoring/
│   ├── admin/
│   └── common/
├── prisma/
├── test/
└── README.md
```

## First build target

Milestone 1 should produce:

- NestJS application skeleton
- health endpoint
- config validation
- auth module starter
- worker registry module starter
- job lifecycle types
- integration test harness

## Framework decision

See `docs/adr/ADR-001-backend-framework.md`.
