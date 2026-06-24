import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class FailJobDto {
  @ApiProperty({ example: 'worker_runtime_error' })
  @IsString()
  @MinLength(3)
  reason!: string;
}
