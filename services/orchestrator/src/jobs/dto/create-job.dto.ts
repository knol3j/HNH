import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ example: 'ai-inference' })
  @IsString()
  @MinLength(3)
  jobType!: string;

  @ApiProperty({ example: 'Run LLM inference batch for vendor workload' })
  @IsString()
  @MinLength(3)
  description!: string;

  @ApiPropertyOptional({ example: 'vendor_123' })
  @IsOptional()
  @IsString()
  requesterId?: string;

  @ApiPropertyOptional({ example: { gpus: 1, memoryGb: 24, region: 'us-east' } })
  @IsOptional()
  @IsObject()
  requirements?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxRetries?: number;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsInt()
  @Min(30)
  leaseSeconds?: number;

  @ApiPropertyOptional({ example: { model: 'llama', batch: 64 } })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
