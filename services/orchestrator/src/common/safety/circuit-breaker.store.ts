import { Injectable } from '@nestjs/common';

export type CircuitBreakerName =
  | 'worker-registration'
  | 'job-creation'
  | 'job-leasing'
  | 'lease-recovery'
  | 'payouts'
  | 'admin-actions';

export interface CircuitBreakerState {
  name: CircuitBreakerName;
  open: boolean;
  reason?: string;
  openedAt?: string;
  openedBy?: string;
}

@Injectable()
export class CircuitBreakerStore {
  private readonly states = new Map<CircuitBreakerName, CircuitBreakerState>();

  constructor() {
    for (const name of this.knownBreakers()) {
      this.states.set(name, { name, open: false });
    }
  }

  list(): CircuitBreakerState[] {
    return Array.from(this.states.values());
  }

  get(name: CircuitBreakerName): CircuitBreakerState {
    return this.states.get(name) ?? { name, open: false };
  }

  open(name: CircuitBreakerName, reason: string, openedBy?: string): CircuitBreakerState {
    const state: CircuitBreakerState = {
      name,
      open: true,
      reason,
      openedBy,
      openedAt: new Date().toISOString(),
    };

    this.states.set(name, state);
    return state;
  }

  close(name: CircuitBreakerName): CircuitBreakerState {
    const state: CircuitBreakerState = { name, open: false };
    this.states.set(name, state);
    return state;
  }

  private knownBreakers(): CircuitBreakerName[] {
    return ['worker-registration', 'job-creation', 'job-leasing', 'lease-recovery', 'payouts', 'admin-actions'];
  }
}
