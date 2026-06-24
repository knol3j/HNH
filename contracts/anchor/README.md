# HashNHedge Anchor Programs

This directory is the target workspace for Solana/Anchor programs.

## Programs to build

1. **Worker Registry**
   - worker identity
   - operator wallet
   - capability metadata hash
   - reputation hooks
   - optional stake hooks

2. **Task Registry**
   - task records
   - requester identity
   - task metadata hash
   - proof/result hash
   - lifecycle state mirror

3. **Escrow**
   - vendor deposits
   - reserved job budget
   - payout release
   - refund path

4. **Rewards**
   - worker reward calculation
   - platform fee calculation
   - payout accounting

5. **Governance / Emergency Controls**
   - multisig admin authority
   - pause controls
   - parameter updates
   - emergency withdrawal policy

## Security requirements

Every program must include:

- signer validation
- owner validation
- PDA derivation checks
- checked arithmetic
- strict account sizing
- event emission
- pause controls for high-risk flows
- test coverage for failure cases

## Launch rule

No mainnet deployment until:

- localnet tests pass
- devnet/testnet deployment has been exercised
- internal audit checklist is complete
- third-party audit is complete
- emergency procedures are documented
