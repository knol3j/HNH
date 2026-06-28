# Task Registry Implementation Notes

The connector blocked the first full Rust program skeleton write, so this branch adds the design, localnet test plan, and security checklist first.

## Next code pass

Add `programs/hnh_task_registry/src/lib.rs` with:

- registry initialization
- task creation
- proof submission
- pause control
- explicit task status enum
- events
- checked arithmetic

## Anchor workspace wiring

After the program file lands, update `Anchor.toml` with the task registry program ID and add the program package manifest.
