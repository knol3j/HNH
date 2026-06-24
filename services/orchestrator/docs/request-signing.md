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

## Current implementation

This PR adds:

- signature header constants
- signature service
- nonce store
- request signing guard
- route decorator for signed endpoints
- unit tests for HMAC signing

The nonce store is in-memory for the first pass. It should be replaced with Redis before multi-instance production deployment.
