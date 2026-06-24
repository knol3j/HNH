# HashNHedge Request Signing

The orchestrator supports HMAC request signing for high-risk worker, vendor, and admin operations.

## Headers

- `x-hnh-role`: one of `admin`, `worker`, or `vendor`
- `x-hnh-api-key`: scoped API key for the role
- `x-hnh-timestamp`: Unix timestamp in seconds
- `x-hnh-nonce`: unique nonce for the actor and replay window
- `x-hnh-signature`: hex-encoded HMAC-SHA256 signature

## Payload format

The signature payload is:

```text
METHOD|PATH|TIMESTAMP|NONCE|BODY
```

Where:

- `METHOD` is uppercase HTTP method
- `PATH` is the original URL path including query string
- `TIMESTAMP` is the timestamp header
- `NONCE` is the nonce header
- `BODY` is JSON-stringified request body, or an empty string when no body exists

## Replay window

Requests are accepted only when the timestamp is within five minutes of server time.

Each nonce can be used once per role/API-key scope during the replay window.

## Nonce store modes

`NONCE_STORE=memory` uses the local in-process nonce store and is appropriate for local development or single-instance test environments.

`NONCE_STORE=redis` uses Redis so replay protection works across multiple orchestrator instances. `REDIS_URL` is required in this mode.

## Current implementation

This implementation includes:

- signature header constants
- signature service
- memory nonce store
- Redis nonce store mode
- request signing guard
- route decorator for signed endpoints
- unit tests for HMAC signing

Use Redis before multi-instance production deployment.
