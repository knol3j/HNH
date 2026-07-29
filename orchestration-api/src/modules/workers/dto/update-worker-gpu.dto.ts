import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

export class UpdateWorkerGpuDto {
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
