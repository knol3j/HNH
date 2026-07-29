import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GpuInfoDto {
  @IsNumber()
  @Min(0)
  @Max(1000000)
  count: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  memoryMb?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  utilization?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(150)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  powerDrawW?: number;
}

export class CpuInfoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1024)
  cores?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1024)
  threads?: number;
}

export class RegisterWorkerDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
    message: 'Invalid Solana wallet address format',
  })
  walletAddress: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GpuInfoDto)
  gpuInfo?: GpuInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CpuInfoDto)
  cpuInfo?: CpuInfoDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1048576)
  ramMb?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  osType?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  osVersion?: string;
}
