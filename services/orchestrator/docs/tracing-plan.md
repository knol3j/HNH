# Job Lifecycle Tracing Plan

## Goal

Add request and job lifecycle traces so operators can follow a compute job from vendor submission through worker assignment, running state, proof submission, verification, and payout coordination.

## Trace points

- job created
- job leased
- worker accepted job
- job running
- proof submitted
- job verified
- payout requested
- payout completed
- job failed
- job dead-lettered
- lease recovered

## Required span attributes

- `job.id`
- `job.type`
- `job.status`
- `worker.id`
- `vendor.id`
- `lease.id`
- `retry.count`
- `circuit_breaker.name`
- `security.role`

## Recommended implementation

Use OpenTelemetry Node SDK with OTLP export.

Environment variables:

```text
OTEL_SERVICE_NAME=hashnhedge-orchestrator
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

The next implementation PR should add OpenTelemetry dependencies and initialize tracing before NestJS bootstraps.
