# Monitoring registration note

Add `MonitoringModule` to `AppModule` imports before enabling the `/metrics` endpoint in production.

The connector blocked the `app.module.ts` update, so this PR carries the module/controller/service scaffolding and documents the required wiring step.
