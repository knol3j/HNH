import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

import { CircuitBreakerName } from '../../common/safety/circuit-breaker.store';

export class UpdateBreakerDto {
  @ApiProperty({ enum: ['open', 'closed'] })
  @IsIn(['open', 'closed'])
  state!: 'open' | 'closed';

  @ApiPropertyOptional({ example: 'suspected payout anomaly' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;

  @ApiPropertyOptional({ example: 'admin@example.com' })
  @IsOptional()
  @IsString()
  actorId?: string;
}

export const breakerNames: CircuitBreakerName[] = [
  'worker-registration',
  'job-creation',
  'job-leasing',
  'lease-recovery',
  'payouts',
  'admin-actions',
];
