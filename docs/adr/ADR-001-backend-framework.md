# ADR-001: Backend framework for HashNHedge orchestration

## Status

Accepted

## Context

HashNHedge needs a production-grade off-chain orchestration layer for worker registration, compute job scheduling, vendor marketplace workflows, pool statistics, payment coordination, monitoring, and admin controls.

The current backend is primarily Express/Node. That is workable for a prototype, but HashNHedge is moving toward a multi-service platform with:

- decentralized GPU worker coordination
- vendor-facing compute marketplace APIs
- miner/worker telemetry
- payout and escrow coordination
- Solana program integration
- security-sensitive admin operations
- high-volume job scheduling and state transitions

The framework choice should optimize for maintainability, resilience, security boundaries, and team scaling.

## Options considered

### Option A: NestJS

**Strengths**

- Strong module architecture for large Node/TypeScript systems
- Dependency injection and clear service boundaries
- First-class TypeScript support
- Mature guard/interceptor/pipe system for auth, validation, logging, and rate limiting
- Good fit for REST, WebSocket, queue workers, and microservices
- Easier migration path from existing Node/Express code
- Strong ecosystem for Prisma, Passport/JWT, OpenAPI, BullMQ, Redis, NATS, Kafka, and observability

**Weaknesses**

- More boilerplate than FastAPI
- GPU/ML runtime integration is not as natural as Python
- Requires discipline to avoid over-engineering

### Option B: FastAPI

**Strengths**

- Excellent Python ergonomics
- Native fit for ML/GPU-adjacent services
- Great OpenAPI generation
- Fast iteration speed
- Strong validation via Pydantic
- Natural integration with AI, Triton clients, CUDA-adjacent Python tooling, and scientific libraries

**Weaknesses**

- Less structured for very large multi-domain backends unless conventions are enforced
- Migration from existing Node code is larger
- Enterprise auth/RBAC patterns require more custom assembly
- Less natural fit for the existing JavaScript-heavy repository

## Decision

Use **NestJS** as the primary HashNHedge control-plane backend.

Use **FastAPI** selectively for GPU/AI worker-adjacent microservices.

## Rationale

HashNHedge's core orchestration layer is closer to an enterprise marketplace and job-control system than a model-serving service. It needs strong boundaries around authentication, authorization, job lifecycle management, payments, vendor workflows, and Solana coordination.

NestJS is the better default for the control plane because it gives HashNHedge:

- clear modules and service boundaries
- a safe migration path from Express
- production-ready guard/interceptor/validation patterns
- strong TypeScript contracts for public APIs
- easier team onboarding as the codebase grows

FastAPI remains the better choice for GPU runtime adapters, AI inference workers, Triton/Dynamo gateways, and ML-specific services.

## Target split

```text
NestJS control plane
  ├── Auth module
  ├── Worker registry module
  ├── Job scheduler module
  ├── Vendor marketplace module
  ├── Payment coordination module
  ├── Solana coordination module
  ├── Monitoring module
  └── Admin module

FastAPI worker services
  ├── Triton gateway
  ├── Dynamo gateway
  ├── GPU telemetry collector
  ├── AI inference worker
  └── Specialized compute adapters
```

## Consequences

### Positive

- Stronger long-term maintainability
- Better security and validation consistency
- Easier migration from existing Node backend
- Clear path to modular services and event-driven orchestration

### Negative

- Requires TypeScript/NestJS setup work
- ML/GPU service code will likely still need Python services
- Requires an explicit service contract between NestJS and FastAPI workers

## Implementation plan

1. Create `services/orchestrator` as the NestJS control plane.
2. Define DTOs and OpenAPI schemas for worker, job, vendor, auth, stats, and payment APIs.
3. Add Prisma integration using the existing data model as a starting point.
4. Implement worker heartbeat and job lifecycle state machine first.
5. Add FastAPI worker templates under `services/workers` for GPU-specific workloads.
6. Add integration tests before production deployment.

## Review date

Revisit after the first production-readiness milestone or after a complete worker/job/payout flow is implemented.
