use anchor_lang::prelude::*;

declare_id!("HNHRegistry111111111111111111111111111111111");

#[program]
pub mod hnh_registry {
    use super::*;

    pub fn initialize_worker_registry(ctx: Context<InitializeWorkerRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.worker_count = 0;
        registry.paused = false;
        Ok(())
    }

    pub fn register_worker(ctx: Context<RegisterWorker>, capabilities_hash: [u8; 32]) -> Result<()> {
        require!(!ctx.accounts.registry.paused, HnhRegistryError::RegistryPaused);
        let worker = &mut ctx.accounts.worker;
        worker.operator = ctx.accounts.operator.key();
        worker.capabilities_hash = capabilities_hash;
        worker.active = true;
        ctx.accounts.registry.worker_count = ctx.accounts.registry.worker_count.checked_add(1).ok_or(HnhRegistryError::MathOverflow)?;
        Ok(())
    }

    pub fn pause_registry(ctx: Context<PauseRegistry>) -> Result<()> {
        require_keys_eq!(ctx.accounts.registry.authority, ctx.accounts.authority.key(), HnhRegistryError::Unauthorized);
        ctx.accounts.registry.paused = true;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeWorkerRegistry<'info> {
    #[account(init, payer = authority, space = 8 + WorkerRegistry::SIZE)]
    pub registry: Account<'info, WorkerRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterWorker<'info> {
    #[account(mut)]
    pub registry: Account<'info, WorkerRegistry>,
    #[account(init, payer = operator, space = 8 + WorkerRecord::SIZE)]
    pub worker: Account<'info, WorkerRecord>,
    #[account(mut)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PauseRegistry<'info> {
    #[account(mut)]
    pub registry: Account<'info, WorkerRegistry>,
    pub authority: Signer<'info>,
}

#[account]
pub struct WorkerRegistry {
    pub authority: Pubkey,
    pub worker_count: u64,
    pub paused: bool,
}

impl WorkerRegistry {
    pub const SIZE: usize = 32 + 8 + 1;
}

#[account]
pub struct WorkerRecord {
    pub operator: Pubkey,
    pub capabilities_hash: [u8; 32],
    pub active: bool,
}

impl WorkerRecord {
    pub const SIZE: usize = 32 + 32 + 1;
}

#[error_code]
pub enum HnhRegistryError {
    #[msg("Registry is paused")]
    RegistryPaused,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Math overflow")]
    MathOverflow,
}
