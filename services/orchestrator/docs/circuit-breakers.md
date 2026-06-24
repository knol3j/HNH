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

## Production notes

The first implementation uses an in-process store. Before multi-instance production deployment, move breaker state to Redis/PostgreSQL so all orchestrator instances share the same safety state.

Circuit breaker state changes should also be mirrored to alerting and audit systems.
