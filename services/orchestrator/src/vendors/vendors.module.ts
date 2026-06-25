import { Module } from '@nestjs/common';

import { VendorPricingService } from './vendor-pricing.service';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  controllers: [VendorsController],
  providers: [VendorsService, VendorPricingService],
  exports: [VendorsService, VendorPricingService]
})
export class VendorsModule {}
