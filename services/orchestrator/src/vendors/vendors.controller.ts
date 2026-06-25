import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';
import { RequestSigningGuard } from '../auth/request-signing.guard';
import { Role } from '../auth/roles';
import { Roles } from '../auth/roles.decorator';
import { SignedRoute } from '../auth/signed.decorator';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { PriceComputeDto } from './dto/price-compute.dto';
import { ComputePriceQuote, VendorPricingService } from './vendor-pricing.service';
import { VendorRecord, VendorsService } from './vendors.service';

@ApiTags('vendors')
@ApiSecurity('x-hnh-api-key')
@Controller('vendors')
@UseGuards(AuthGuard, RequestSigningGuard)
export class VendorsController {
  constructor(
    private readonly vendors: VendorsService,
    private readonly pricing: VendorPricingService,
  ) {}

  @Post()
  @SignedRoute()
  @Roles(Role.Vendor, Role.Admin)
  @ApiCreatedResponse({ description: 'Vendor registered' })
  createVendor(@Body() dto: CreateVendorDto): VendorRecord {
    return this.vendors.createVendor(dto);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiOkResponse({ description: 'Registered vendors' })
  listVendors(): VendorRecord[] {
    return this.vendors.listVendors();
  }

  @Post('price-quote')
  @SignedRoute()
  @Roles(Role.Vendor, Role.Admin)
  @ApiOkResponse({ description: 'Compute job price quote' })
  quote(@Body() dto: PriceComputeDto): ComputePriceQuote {
    return this.pricing.quote(dto);
  }
}
