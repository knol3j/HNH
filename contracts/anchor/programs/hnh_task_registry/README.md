# HNH Task Registry Program

This is the planned on-chain task registry for HashNHedge.

## Responsibilities

- create task records
- store task metadata hash
- store proof hash
- record requester and worker identities
- mirror high-level task lifecycle state
- emit task/proof events
- support pause controls

## Security requirements

- signer validation
- PDA validation for task accounts
- checked arithmetic for counters
- pause guard on task creation
- strict state transition checks
- event emission for indexers

## Next implementation pass

Add the Rust Anchor program skeleton with:

- `TaskRegistry`
- `TaskRecord`
- `TaskStatus`
- task creation instruction
- proof submission instruction
- pause instruction
- localnet tests
