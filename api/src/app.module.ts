import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { ArtworkModule } from './modules/artwork/artwork.module';
import { JobCardsModule } from './modules/job-cards/job-cards.module';
import { QualityControlModule } from './modules/quality-control/qc.module';
import { PackingModule } from './modules/packing/packing.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { SlaModule } from './modules/sla/sla.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { OperationsModule } from './modules/operations/operations.module';
import { EventsModule } from './modules/events/events.module';
import { ShippingGstModule } from './modules/shipping-gst/shipping-gst.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    StorageModule,
    PrismaModule,
    AuditModule,
    AuthModule,
    EventsModule,
    ProductsModule,
    PricingModule,
    OrdersModule,
    WorkflowModule,
    ArtworkModule,
    JobCardsModule,
    QualityControlModule,
    PackingModule,
    DispatchModule,
    PaymentsModule,
    InvoicesModule,
    SlaModule,
    NotificationModule,
    OperationsModule,
    ShippingGstModule,
    ShippingModule,
  ],
})
export class AppModule {}
