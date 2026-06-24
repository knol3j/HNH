# HashNHedge Production Readiness Project Board

This file mirrors the intended GitHub Projects board so the roadmap remains version-controlled inside the repository.

## Board columns

1. **Backlog**
2. **Ready**
3. **In Progress**
4. **Review / Audit**
5. **Blocked**
6. **Done**

## Epic 1: Backend orchestration platform

**Objective:** Replace prototype/backend sprawl with a scalable NestJS control plane and FastAPI worker adapters.

| Task | Status | Notes |
| --- | --- | --- |
| ADR: NestJS vs FastAPI | Done | See `docs/adr/ADR-001-backend-framework.md` |
| Create NestJS orchestrator skeleton | Ready | `services/orchestrator` |
| Define service boundaries | Ready | Auth, workers, jobs, vendors, payments, monitoring |
| Add worker registry module | Backlog | Worker enrollment, capabilities, heartbeat |
| Add job scheduler module | Backlog | Leasing, retries, state machine |
| Add payment coordinator module | Backlog | Off-chain coordination + on-chain settlement |
| Add Solana coordinator module | Backlog | Anchor program integration |
| Add integration tests | Backlog | API + job lifecycle |

## Epic 2: Anchor smart contracts

**Objective:** Build audited Anchor programs for trust-critical compute and settlement workflows.

| Task | Status | Notes |
| --- | --- | --- |
| Anchor workspace skeleton | Ready | `contracts/anchor` |
| Worker registry program | Backlog | Worker identity and staking hooks |
| Task registry program | Backlog | Task records and proof tracking |
| Escrow program | Backlog | Vendor deposits and payout reserves |
| Rewards program | Backlog | Worker payouts and revenue share |
| Governance and pause controls | Backlog | Multisig/admin safety |
| Anchor tests | Backlog | Unit + localnet integration |
| Internal audit checklist | Backlog | Before third-party audit |
| Third-party audit | Backlog | Required before mainnet launch |

## Epic 3: Security hardening

**Objective:** Secure API, worker, infrastructure, and smart-contract layers before public launch.

| Task | Status | Notes |
| --- | --- | --- |
| JWT/session auth | Ready | Access + refresh token strategy |
| RBAC | Ready | Miner, vendor, community, admin, super admin |
| MFA-ready admin access | Backlog | TOTP or passkey-ready |
| Scoped API keys | Backlog | Vendor and worker API keys |
| Request signing | Backlog | Nonce/timestamp replay protection |
| Centralized validation | Backlog | DTO/schema validation |
| Redacted structured logging | Backlog | No secrets/tokens in logs |
| API circuit breakers | Backlog | Payouts, registration, job creation, admin |
| Security review cadence | Backlog | Recurring assessment checklist |

## Epic 4: Containerized GPU orchestration

**Objective:** Run workloads in isolated GPU-aware containers and scale workers efficiently.

| Task | Status | Notes |
| --- | --- | --- |
| Worker container baseline | Ready | Docker + NVIDIA Container Toolkit |
| GPU telemetry sidecar | Backlog | Utilization, memory, model/job metrics |
| AI inference worker | Backlog | Triton-ready |
| Dynamo gateway worker | Backlog | Distributed inference optimization |
| Scheduler-to-worker protocol | Backlog | Lease, ack, result, proof, heartbeat |
| Autoscaling strategy | Backlog | Recover when workers disappear |
| Observability dashboard | Backlog | Queue depth, GPU use, failure rate, payouts |

## Epic 5: Marketplace and payments

**Objective:** Create a trusted compute marketplace with vendor onboarding, pricing, SLAs, and settlement.

| Task | Status | Notes |
| --- | --- | --- |
| Vendor onboarding flow | Backlog | KYB/KYC-ready later |
| Compute job creation | Backlog | Vendor API + dashboard |
| Pricing engine | Backlog | GPU type, urgency, runtime, marketplace demand |
| Escrow settlement flow | Backlog | Off-chain workflow + Solana escrow |
| SLA tracking | Backlog | Job runtime, success rate, uptime |
| Revenue analytics | Backlog | Platform fee, worker earnings, liabilities |

## Epic 6: Observability and operations

**Objective:** Make the system measurable, debuggable, and operable.

| Task | Status | Notes |
| --- | --- | --- |
| OpenTelemetry baseline | Backlog | API traces and job lifecycle traces |
| Prometheus metrics | Backlog | API + worker + queue metrics |
| Grafana dashboards | Backlog | SLO dashboards |
| Loki logs | Backlog | Structured log aggregation |
| Sentry | Backlog | Error reporting |
| Solana event indexer | Backlog | Program events + suspicious state changes |
| Alerting rules | Backlog | API errors, payout anomalies, worker churn |

## Milestones

### Milestone 1: Control plane foundation

- NestJS skeleton
- Auth module starter
- Worker registry starter
- Job state machine interfaces
- Health checks

### Milestone 2: Secure worker/job loop

- Worker registration
- Heartbeat
- Job leasing
- Retry and dead-letter handling
- Integration tests

### Milestone 3: Anchor MVP

- Anchor workspace
- Worker registry
- Task registry
- Escrow proof of concept
- Localnet tests

### Milestone 4: GPU runtime MVP

- Containerized GPU worker
- GPU telemetry
- Triton adapter proof of concept
- Scheduler-to-worker protocol

### Milestone 5: Security and observability hardening

- RBAC
- API keys
- Request signing
- Structured logs
- Dashboards and alerts
- Circuit breakers

### Milestone 6: Launch readiness

- Internal audit
- Third-party smart-contract audit
- Load testing
- Penetration testing
- Runbooks
- Mainnet/testnet launch decision
