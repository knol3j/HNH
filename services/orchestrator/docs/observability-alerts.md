# Orchestrator Alert Baseline

## Critical alerts

- API 5xx rate above threshold for 5 minutes
- any circuit breaker open for more than 1 minute
- no active workers for 5 minutes
- queued jobs above threshold for 10 minutes
- process memory above threshold

## Warning alerts

- p95 latency above SLO
- worker count drops by more than 50 percent in 10 minutes
- job leasing failures increase
- Redis connectivity degraded
- PostgreSQL connectivity degraded

## Follow-up

Add OpenTelemetry traces for:

- job creation
- job leasing
- worker heartbeat
- lease recovery
- proof submission
- payout coordination
