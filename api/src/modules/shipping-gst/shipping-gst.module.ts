import { Module } from '@nestjs/common';
import { ShippingGstController } from './shipping-gst.controller';
import { ShippingGstService } from './shipping-gst.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ShippingGstController],
  providers: [ShippingGstService],
  exports: [ShippingGstService],
})
export class ShippingGstModule {}
