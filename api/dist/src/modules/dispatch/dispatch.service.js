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
var DispatchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispatchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
let DispatchService = DispatchService_1 = class DispatchService {
    prisma;
    auditService;
    eventEmitter;
    logger = new common_1.Logger(DispatchService_1.name);
    constructor(prisma, auditService, eventEmitter) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.eventEmitter = eventEmitter;
    }
    async confirmCourierHandover(dto, staffId) {
        const order = await this.prisma.order.findFirst({
            where: {
                OR: [
                    { id: dto.orderId },
                    { orderNumber: dto.orderId },
                ],
            },
            include: {
                packages: { include: { shipment: true } },
            },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order '${dto.orderId}' not found`);
        if (order.status !== client_1.OrderStatus.READY_FOR_DISPATCH) {
            throw new common_1.BadRequestException(`Order must be in 'READY_FOR_DISPATCH' state to perform courier handover (Current: ${order.status}).`);
        }
        const orderBarcodes = new Set(order.packages.map((p) => p.barcode));
        for (const barcode of dto.scannedBarcodes) {
            if (!orderBarcodes.has(barcode)) {
                throw new common_1.BadRequestException(`Scanned barcode '${barcode}' does not belong to Order ${order.orderNumber}.`);
            }
        }
        if (dto.scannedBarcodes.length < order.packages.length) {
            throw new common_1.BadRequestException(`Incomplete scan: Scanned ${dto.scannedBarcodes.length} of ${order.packages.length} packages.`);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const res = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.OUT_FOR_DELIVERY,
                    customerStatus: 'OUT_FOR_DELIVERY',
                },
            });
            const shipmentId = order.packages[0]?.shipmentId;
            if (shipmentId) {
                await tx.shipment.update({
                    where: { id: shipmentId },
                    data: {
                        status: client_1.ShipmentStatus.IN_TRANSIT,
                        dispatchedAt: new Date(),
                    },
                });
            }
            await tx.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    fromStatus: order.status,
                    toStatus: client_1.OrderStatus.OUT_FOR_DELIVERY,
                    changedById: staffId,
                    reason: `Handed over to ${dto.courierName}. Manifest: ${dto.manifestReference || 'N/A'}.`,
                },
            });
            return res;
        });
        await this.auditService.log({
            actorId: staffId,
            action: 'COURIER_HANDOVER_DISPATCH',
            entity: 'Order',
            entityId: order.id,
            orderId: order.id,
            newState: { status: client_1.OrderStatus.OUT_FOR_DELIVERY, courier: dto.courierName },
            reason: `Courier handover confirmed with ${dto.scannedBarcodes.length} packages.`,
        });
        this.eventEmitter.emit('dispatch.confirmed', {
            orderId: order.id,
            courierName: dto.courierName,
        });
        return updated;
    }
    async confirmStorePickup(dto, staffId) {
        const order = await this.prisma.order.findFirst({
            where: {
                OR: [
                    { id: dto.orderId },
                    { orderNumber: dto.orderId },
                ],
            },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order '${dto.orderId}' not found`);
        if (order.status !== client_1.OrderStatus.READY_FOR_DISPATCH) {
            throw new common_1.BadRequestException(`Order must be in 'READY_FOR_DISPATCH' state for pickup handover (Current: ${order.status}).`);
        }
        const balance = Number(order.balanceAmount);
        if (balance > 0) {
            throw new common_1.BadRequestException(`Store Pickup BLOCKED: Outstanding balance of ₹${balance.toFixed(2)} must be settled at counter first.`);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const res = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.DELIVERED,
                    customerStatus: 'DELIVERED',
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    fromStatus: order.status,
                    toStatus: client_1.OrderStatus.DELIVERED,
                    changedById: staffId,
                    reason: `Store Pickup Collected by ${dto.collectorName} (Phone: ${dto.collectorPhone}).`,
                    notes: dto.notes,
                },
            });
            return res;
        });
        await this.auditService.log({
            actorId: staffId,
            action: 'STORE_PICKUP_HANDOVER',
            entity: 'Order',
            entityId: order.id,
            orderId: order.id,
            newState: { status: client_1.OrderStatus.DELIVERED, collector: dto.collectorName, phone: dto.collectorPhone },
            reason: `Store pickup completed by ${dto.collectorName}`,
        });
        this.eventEmitter.emit('delivery.confirmed', {
            orderId: order.id,
            method: 'STORE_PICKUP',
            collectorName: dto.collectorName,
        });
        return updated;
    }
    async confirmCourierDelivery(orderId, receiverName) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException(`Order '${orderId}' not found`);
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: client_1.OrderStatus.DELIVERED,
                    customerStatus: 'DELIVERED',
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId,
                    fromStatus: order.status,
                    toStatus: client_1.OrderStatus.DELIVERED,
                    reason: `Delivered to recipient: ${receiverName || 'Customer'}`,
                },
            });
            return updated;
        });
    }
};
exports.DispatchService = DispatchService;
exports.DispatchService = DispatchService = DispatchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        event_emitter_1.EventEmitter2])
], DispatchService);
//# sourceMappingURL=dispatch.service.js.map