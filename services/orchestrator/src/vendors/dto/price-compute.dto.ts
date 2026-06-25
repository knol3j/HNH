import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PriceComputeDto {
  @ApiProperty({ example: 'ai-inference' })
  @IsString()
  jobType!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  gpuCount!: number;

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(0.01)
  estimatedMinutes!: number;

  @ApiPropertyOptional({ example: 'NVIDIA RTX 4090' })
  @IsOptional()
  @IsString()
  gpuModel?: string;

  @ApiPropertyOptional({ example: 'standard', enum: ['economy', 'standard', 'priority'] })
  @IsOptional()
  @IsIn(['economy', 'standard', 'priority'])
  priority?: 'economy' | 'standard' | 'priority';
}
