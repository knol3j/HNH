# Metrics follow-up wiring

This branch adds the Prometheus metrics implementation and docs.

Before merge or immediately after merge, verify:

1. `MonitoringModule` is imported in `AppModule`.
2. `MetricsService` can be resolved from the Nest container.
3. `GET /metrics` returns Prometheus text format.
4. The Grafana starter dashboard loads against the target Prometheus source.

The connector blocked one `app.module.ts` update while creating this PR, so this note tracks the exact remaining wiring check.
