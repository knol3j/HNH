import { JobStatus as PrismaJobStatus } from '@prisma/client';

import { JobStatus as ApiJobStatus } from './job-status';

export function toApiJobStatus(status: PrismaJobStatus): ApiJobStatus {
  switch (status) {
    case PrismaJobStatus.QUEUED:
      return ApiJobStatus.Queued;
    case PrismaJobStatus.ASSIGNED:
      return ApiJobStatus.Assigned;
    case PrismaJobStatus.RUNNING:
      return ApiJobStatus.Running;
    case PrismaJobStatus.PROOF_SUBMITTED:
      return ApiJobStatus.ProofSubmitted;
    case PrismaJobStatus.VERIFIED:
      return ApiJobStatus.Verified;
    case PrismaJobStatus.PAID:
      return ApiJobStatus.Paid;
    case PrismaJobStatus.FAILED:
      return ApiJobStatus.Failed;
    case PrismaJobStatus.RETRY_QUEUED:
      return ApiJobStatus.RetryQueued;
    case PrismaJobStatus.DEAD_LETTERED:
      return ApiJobStatus.DeadLettered;
    case PrismaJobStatus.LEASE_EXPIRED:
      return ApiJobStatus.LeaseExpired;
  }
}
