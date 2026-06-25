import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({ example: 'Acme AI Labs' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'ops@acme.ai' })
  @IsEmail()
  contactEmail!: string;

  @ApiPropertyOptional({ example: 'GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc' })
  @IsOptional()
  @IsString()
  walletAddress?: string;

  @ApiPropertyOptional({ example: { tier: 'startup', billing: 'prepaid' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
