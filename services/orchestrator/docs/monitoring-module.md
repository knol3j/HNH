# Monitoring module

This module provides the first observability baseline for the HashNHedge orchestrator.

## Files

- `metrics.service.ts` defines Prometheus collectors.
- `metrics.interceptor.ts` records HTTP request counts and duration.
- `monitoring.controller.ts` exposes `GET /metrics`.
- `monitoring.module.ts` groups the monitoring providers.

## Required wiring

Import `MonitoringModule` in `AppModule` and register `MetricsInterceptor` globally in `main.ts`.

The interceptor wiring is included in this PR. The `AppModule` import may need a follow-up commit because the connector blocked that specific file update.
