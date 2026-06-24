# Audit Logging and Redaction

The orchestrator emits structured audit events for write operations.

## Audited operations

The global audit interceptor records non-read HTTP operations:

- worker registration
- worker heartbeat
- job creation
- job leasing
- lease recovery
- job lifecycle transitions

## Event fields

Audit events include:

- `action`
- `actorRole`
- `outcome`
- `requestId`
- `ip`
- `userAgent`
- `metadata`
- `timestamp`

## Redaction

The audit logger redacts sensitive fields before logging, including:

- authorization headers
- cookies
- API keys
- signatures
- passwords
- tokens
- JWT values
- secrets

## Production notes

Logs should be shipped to a centralized system such as Loki, Datadog, or a SIEM. Alert rules should watch for repeated denied requests, replay attempts, signature failures, and high-risk admin actions.
