# Redis CI Integration Plan

## Goal

Validate HashNHedge request replay protection against a real Redis instance in CI.

## Required CI service

Use a Redis service container for orchestrator integration tests.

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
```

## Environment

```bash
NONCE_STORE=redis
REDIS_URL=redis://localhost:6379
```

## Test coverage to add

- first signed request with a nonce is accepted
- repeated request with the same nonce is rejected
- same nonce under a different role/API-key scope is accepted
- expired nonce can be reused only after the replay window expires

## Production note

Redis-backed nonce storage is required before running more than one orchestrator instance. The in-memory nonce store is acceptable only for local development and single-instance smoke tests.
