# HNH Registry Program

This program owns the first on-chain registry skeleton for HashNHedge.

## Current scope

- initialize worker registry
- register worker with capabilities hash
- pause registry with authority check

## Security controls included

- signer checks
- authority check for pause
- checked arithmetic for worker count
- pause guard for worker registration

## Next steps

- derive workers with PDA seeds
- add task registry state
- emit events
- add localnet tests
- add multisig authority pattern
