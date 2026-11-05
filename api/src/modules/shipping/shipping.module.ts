import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { ShippingConfigService } from './shipping-config.service';
import { ShippingZoneService } from './shipping-zone.service';
import { ShippingPincodeService } from './shipping-pincode.service';
import { ShippingRateService } from './shipping-rate.service';
import { ShippingPackagingService } from './shipping-packaging.service';
import { ShippingCalculatorService } from './shipping-calculator.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ShippingController],
  providers: [
    ShippingService,
    ShippingConfigService,
    ShippingZoneService,
    ShippingPincodeService,
    ShippingRateService,
    ShippingPackagingService,
    ShippingCalculatorService,
  ],
  exports: [
    ShippingService,
    ShippingConfigService,
    ShippingZoneService,
    ShippingPincodeService,
    ShippingRateService,
    ShippingPackagingService,
    ShippingCalculatorService,
  ],
})
export class ShippingModule {}

