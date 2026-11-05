import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { ShippingGstModule } from '../shipping-gst/shipping-gst.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [ShippingGstModule, ShippingModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}

