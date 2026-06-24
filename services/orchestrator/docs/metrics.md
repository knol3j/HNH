# Orchestrator Metrics

The orchestrator exposes Prometheus metrics at:

```text
GET /metrics
```

## Initial metrics

- `hnh_http_requests_total`
- `hnh_http_request_duration_seconds`
- `hnh_workers_active`
- `hnh_jobs_queued`
- `hnh_circuit_breakers_open`
- default Node.js process metrics prefixed with `hnh_`

## Dashboard baseline

Initial Grafana panels should include:

- API request rate by route and status
- API p95 and p99 latency
- queued job count
- active worker count
- open circuit breaker count
- process CPU and memory
- Node event loop lag

## Alert baseline

Initial alerts should fire on:

- sustained API 5xx rate
- open circuit breaker count greater than zero
- queued jobs above threshold
- active workers dropping below threshold
- process memory above threshold

## Next steps

Wire service-level gauges to database-backed worker/job/breaker counts and add OpenTelemetry traces for job lifecycle transitions.
