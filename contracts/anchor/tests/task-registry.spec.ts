import * as anchor from '@coral-xyz/anchor';

describe('hnh_task_registry', () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  it('initializes registry, creates a task, and submits proof', async () => {
    // TODO: enable after hnh_task_registry program is added to Anchor.toml and generated IDL is available.
    // 1. Initialize TaskRegistry.
    // 2. Create TaskRecord with metadata hash and reward amount.
    // 3. Submit proof hash from worker signer.
    // 4. Assert status becomes ProofSubmitted.
    // 5. Assert events are emitted for task creation and proof submission.
  });
});
