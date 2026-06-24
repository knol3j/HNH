import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LeaseJobDto {
  @ApiProperty({ example: 'worker-rig-001' })
  @IsString()
  @MinLength(3)
  workerId!: string;
}
