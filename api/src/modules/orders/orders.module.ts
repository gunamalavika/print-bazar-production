import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PricingModule } from '../pricing/pricing.module';
import { ShippingGstModule } from '../shipping-gst/shipping-gst.module';
import { ShippingModule } from '../shipping/shipping.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [PricingModule, ShippingGstModule, ShippingModule, ProductsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

