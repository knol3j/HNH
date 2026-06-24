import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SubmitProofDto {
  @ApiProperty({ example: 'sha256:ab12cd34ef56' })
  @IsString()
  @MinLength(8)
  proofHash!: string;

  @ApiPropertyOptional({ example: 's3://hashnhedge-results/job_123/result.json' })
  @IsOptional()
  @IsString()
  resultUri?: string;
}
