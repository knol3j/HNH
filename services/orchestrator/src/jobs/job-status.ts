export enum JobStatus {
  Queued = 'queued',
  Assigned = 'assigned',
  Running = 'running',
  ProofSubmitted = 'proof_submitted',
  Verified = 'verified',
  Paid = 'paid',
  Failed = 'failed',
  RetryQueued = 'retry_queued',
  DeadLettered = 'dead_lettered',
  LeaseExpired = 'lease_expired',
}

export const terminalJobStatuses = new Set<JobStatus>([
  JobStatus.Paid,
  JobStatus.DeadLettered,
]);

export function isTerminalJobStatus(status: JobStatus): boolean {
  return terminalJobStatuses.has(status);
}
