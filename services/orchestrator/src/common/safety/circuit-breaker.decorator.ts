import { SetMetadata } from '@nestjs/common';

import { CircuitBreakerName } from './circuit-breaker.store';

export const circuitBreakerMetadataKey = 'hnh_circuit_breaker';

export const CircuitBreaker = (name: CircuitBreakerName) => SetMetadata(circuitBreakerMetadataKey, name);
