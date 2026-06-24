import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class HeartbeatDto {
  @ApiPropertyOptional({ example: 'running' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 87.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gpuUtilizationPercent?: number;

  @ApiPropertyOptional({ example: 173000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hashrate?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  activeJobs?: number;

  @ApiPropertyOptional({ example: { temperatureC: 68, powerWatts: 315 } })
  @IsOptional()
  @IsObject()
  telemetry?: Record<string, unknown>;
}
