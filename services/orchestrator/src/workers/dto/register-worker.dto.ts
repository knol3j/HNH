import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class RegisterWorkerDto {
  @ApiProperty({ example: 'worker-rig-001' })
  @IsString()
  @MinLength(3)
  workerName!: string;

  @ApiProperty({ example: 'GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc' })
  @IsString()
  @MinLength(32)
  walletAddress!: string;

  @ApiPropertyOptional({ example: ['mining', 'ai-inference', 'general-compute'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(256)
  gpuCount?: number;

  @ApiPropertyOptional({ example: 'NVIDIA RTX 4090' })
  @IsOptional()
  @IsString()
  gpuModel?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  acceptsLeasedJobs?: boolean;

  @ApiPropertyOptional({ example: { region: 'us-east', memoryGb: 96 } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
