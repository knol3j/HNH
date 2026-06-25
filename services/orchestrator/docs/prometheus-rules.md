# Prometheus rules

Starter alert rules are included in `docs/prometheus-rules.yml`.

They cover:

- open circuit breakers
- elevated API 5xx rate
- high queued job count
- zero active workers

Tune thresholds before production launch.
