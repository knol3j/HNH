# Task Registry Security Checklist

Before this program can be used outside localnet, verify:

- Task accounts use deterministic PDA seeds.
- Requester signer is validated.
- Worker signer is validated for proof submission.
- State transitions are explicit and one-way where appropriate.
- Reward values use checked arithmetic.
- Task metadata and proof hashes are fixed length.
- Pause controls are gated by authority or multisig.
- Events are emitted for task creation, proof submission, verification, failure, and payout.
- Localnet tests cover invalid signer, paused registry, invalid state transition, and overflow cases.
- Third-party audit is complete before mainnet deployment.
