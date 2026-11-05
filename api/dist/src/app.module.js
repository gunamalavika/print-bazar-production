"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_module_1 = require("./modules/prisma/prisma.module");
const audit_module_1 = require("./modules/audit/audit.module");
const auth_module_1 = require("./modules/auth/auth.module");
const products_module_1 = require("./modules/products/products.module");
const pricing_module_1 = require("./modules/pricing/pricing.module");
const orders_module_1 = require("./modules/orders/orders.module");
const workflow_module_1 = require("./modules/workflow/workflow.module");
const artwork_module_1 = require("./modules/artwork/artwork.module");
const job_cards_module_1 = require("./modules/job-cards/job-cards.module");
const qc_module_1 = require("./modules/quality-control/qc.module");
const packing_module_1 = require("./modules/packing/packing.module");
const dispatch_module_1 = require("./modules/dispatch/dispatch.module");
const payments_module_1 = require("./modules/payments/payments.module");
const invoices_module_1 = require("./modules/invoices/invoices.module");
const sla_module_1 = require("./modules/sla/sla.module");
const notification_module_1 = require("./modules/notifications/notification.module");
const operations_module_1 = require("./modules/operations/operations.module");
const events_module_1 = require("./modules/events/events.module");
const shipping_gst_module_1 = require("./modules/shipping-gst/shipping-gst.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            event_emitter_1.EventEmitterModule.forRoot(),
            prisma_module_1.PrismaModule,
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            events_module_1.EventsModule,
            products_module_1.ProductsModule,
            pricing_module_1.PricingModule,
            orders_module_1.OrdersModule,
            workflow_module_1.WorkflowModule,
            artwork_module_1.ArtworkModule,
            job_cards_module_1.JobCardsModule,
            qc_module_1.QualityControlModule,
            packing_module_1.PackingModule,
            dispatch_module_1.DispatchModule,
            payments_module_1.PaymentsModule,
            invoices_module_1.InvoicesModule,
            sla_module_1.SlaModule,
            notification_module_1.NotificationModule,
            operations_module_1.OperationsModule,
            shipping_gst_module_1.ShippingGstModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map