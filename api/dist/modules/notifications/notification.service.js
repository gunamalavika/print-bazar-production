"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
let NotificationService = NotificationService_1 = class NotificationService {
    logger = new common_1.Logger(NotificationService_1.name);
    handleOrderCreated(event) {
        this.logger.log(`[Notification] Order Created: ${event.orderNumber} (₹${event.totalAmount}) -> Sent confirmation email to customer.`);
    }
    handlePaymentConfirmed(event) {
        this.logger.log(`[Notification] Payment Confirmed: Order ${event.orderId}, Txn: ${event.transactionId}, ₹${event.amount} -> Sent receipt & pre-press alert.`);
    }
    handleProofReady(event) {
        this.logger.log(`[Notification] Proof Ready for Order ${event.orderId} -> Sent approval request link to customer.`);
    }
    handleProofApproved(event) {
        this.logger.log(`[Notification] Customer Proof Approved: Order ${event.orderId} -> Queued for OE Operational Review & Production Assignment.`);
    }
    handleDesignerAssigned(event) {
        this.logger.log(`[Notification] Order ${event.orderNumber} assigned to Designer ${event.designerName} by OE.`);
    }
    handleDesignCompleted(event) {
        this.logger.log(`[Notification] Design completed for Order ${event.orderNumber} -> Returned to OE queue for review & assignment.`);
    }
    handleOperatorAssigned(event) {
        this.logger.log(`[Notification] Order ${event.orderNumber} assigned to Production Operator ${event.operatorName} by OE. Released to Production Queue.`);
    }
    handleFinalQCPass(event) {
        this.logger.log(`[Notification] Final QC Passed: Order ${event.orderId} -> Notified packaging station.`);
    }
    handleFinalQCFail(event) {
        this.logger.warn(`[ALERT] Final QC Failed: Order ${event.orderId} -> Escalated to Production Manager.`);
    }
    handlePackingCompleted(event) {
        this.logger.log(`[Notification] Order ${event.orderId} packed (${event.packageCount} parcels) -> Alerted logistics team.`);
    }
    handleDispatchConfirmed(event) {
        this.logger.log(`[Notification] Order ${event.orderId} dispatched via ${event.courierName} -> Sent tracking link to customer.`);
    }
    handleDeliveryConfirmed(event) {
        this.logger.log(`[Notification] Order ${event.orderId} delivered via ${event.method} -> Sent feedback request to customer.`);
    }
};
exports.NotificationService = NotificationService;
__decorate([
    (0, event_emitter_1.OnEvent)('order.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationService.prototype, "handleOrderCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('payment.confirmed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationService.prototype, "handlePaymentConfirmed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('proof.ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationService.prototype, "handleProofReady", null);
__decorate([
    (0, event_emitter_1.OnEvent)('proof.approved'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationService.prototype, "handleProofApproved", null);
__decorate([
    (0, event_emitter_1.OnEvent)('oe.designer.assigned'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationService.prototype, "handleDesignerAssigned", null);
__decorate([
    (0, event_emitter_1.OnEvent)('design.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationService.prototype, "handleDesignCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('oe.operator.assigned'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationService.prototype, "handleOperatorAssigned", null);
__decorate([
    (0, event_emitter_1.OnEvent)('qc.final_qc.pass'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationService.prototype, "handleFinalQCPass", null);
__decorate([
    (0, event_emitter_1.OnEvent)('qc.final_qc.fail'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationService.prototype, "handleFinalQCFail", null);
__decorate([
    (0, event_emitter_1.OnEvent)('packing.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationService.prototype, "handlePackingCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('dispatch.confirmed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationService.prototype, "handleDispatchConfirmed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('delivery.confirmed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationService.prototype, "handleDeliveryConfirmed", null);
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)()
], NotificationService);
//# sourceMappingURL=notification.service.js.map