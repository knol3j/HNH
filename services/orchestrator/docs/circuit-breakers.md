# Circuit Breakers

Circuit breakers allow operators to pause high-risk orchestrator actions during incidents without taking the whole API offline.

## Breakers

- `worker-registration`
- `job-creation`
- `job-leasing`
- `lease-recovery`
- `payouts`
- `admin-actions`

## Protected operations

Initial protected API operations:

- worker registration
- job creation
- job leasing
- lease recovery
- marking jobs running

## Admin controls

The admin controller exposes circuit breaker state management:

- `GET /admin/circuit-breakers`
- `PUT /admin/circuit-breakers/:name`

Admin writes must be signed and authenticated.

## Store modes

`BREAKER_STORE=memory` keeps breaker state in-process and is suitable for local development or single-instance testing.

`BREAKER_STORE=redis` stores breaker state in Redis so all orchestrator instances share the same safety state. `REDIS_URL` is required in this mode.

## Production notes

Use Redis-backed breaker state before running multiple orchestrator instances.

Circuit breaker state changes should also be mirrored to alerting and audit systems.
