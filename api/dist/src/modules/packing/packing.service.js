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
var PackingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackingService = exports.STANDARD_PACKAGING_MATERIALS = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
exports.STANDARD_PACKAGING_MATERIALS = [
    {
        code: 'PB-BOX-01',
        name: 'PB-BOX-01: Micro Rigid Box (Cards up to 500 pcs)',
        category: 'RIGID_BOX',
        innerLengthCm: 12,
        innerWidthCm: 10,
        innerHeightCm: 7,
        tareWeightKg: 0.08,
        maxWeightKg: 2.0,
        description: 'Compact rigid board container for premium visiting cards and tags.',
    },
    {
        code: 'PB-BOX-02',
        name: 'PB-BOX-02: Double-Wall Corrugated (Standard 5-Ply)',
        category: 'CORRUGATED',
        innerLengthCm: 25,
        innerWidthCm: 18,
        innerHeightCm: 12,
        tareWeightKg: 0.18,
        maxWeightKg: 8.0,
        description: 'Universal 5-ply corrugated carton for brochures, flyers, and letterheads.',
    },
    {
        code: 'PB-BOX-03',
        name: 'PB-BOX-03: Heavy Master Shipper (A3/Brochures)',
        category: 'CORRUGATED',
        innerLengthCm: 35,
        innerWidthCm: 26,
        innerHeightCm: 20,
        tareWeightKg: 0.32,
        maxWeightKg: 18.0,
        description: 'Heavy gauge reinforced carton for bulky paper runs and catalogues.',
    },
    {
        code: 'PB-TUBE-01',
        name: 'PB-TUBE-01: Telescopic Standee & Banner Tube',
        category: 'TUBE',
        innerLengthCm: 90,
        innerWidthCm: 15,
        innerHeightCm: 15,
        tareWeightKg: 0.45,
        maxWeightKg: 10.0,
        description: 'Cylindrical rigid tube for roll-up standees, banners, and large posters.',
    },
];
const workflow_state_service_1 = require("../workflow/workflow-state.service");
let PackingService = PackingService_1 = class PackingService {
    prisma;
    auditService;
    eventEmitter;
    workflowState;
    logger = new common_1.Logger(PackingService_1.name);
    constructor(prisma, auditService, eventEmitter, workflowState) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.eventEmitter = eventEmitter;
        this.workflowState = workflowState;
    }
    async getPackingQueue(search, priority) {
        const where = {
            status: client_1.OrderStatus.PACKING,
            ...(priority && priority !== 'ALL' ? { priority: priority } : {}),
            ...(search
                ? {
                    OR: [
                        { orderNumber: { contains: search, mode: 'insensitive' } },
                        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
                        { items: { some: { productName: { contains: search, mode: 'insensitive' } } } },
                    ],
                }
                : {}),
        };
        return this.prisma.order.findMany({
            where,
            include: {
                customer: { select: { id: true, fullName: true, email: true, phone: true } },
                shippingAddress: true,
                billingAddress: true,
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, basePrice: true } },
                        artworkVersions: {
                            where: { isApproved: true },
                            orderBy: { versionNumber: 'desc' },
                            take: 1,
                        },
                    },
                },
                packages: {
                    include: { shipment: true },
                    orderBy: { sequenceNumber: 'asc' },
                },
                jobCards: {
                    select: {
                        id: true,
                        jobNumber: true,
                        status: true,
                        currentStation: true,
                        technicalSpecs: true,
                    },
                },
                qcChecklists: {
                    orderBy: { createdAt: 'desc' },
                    include: { inspector: { select: { id: true, fullName: true, role: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPackingJob(orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                customer: true,
                shippingAddress: true,
                billingAddress: true,
                items: {
                    include: {
                        product: true,
                        artworkVersions: { orderBy: { versionNumber: 'desc' } },
                    },
                },
                packages: {
                    include: { shipment: true },
                    orderBy: { sequenceNumber: 'asc' },
                },
                jobCards: {
                    include: {
                        machine: true,
                        operator: { select: { id: true, fullName: true, role: true } },
                    },
                },
                qcChecklists: {
                    orderBy: { createdAt: 'desc' },
                    include: { inspector: { select: { id: true, fullName: true } } },
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order '${orderId}' not found.`);
        }
        return order;
    }
    getPackagingMaterials() {
        return exports.STANDARD_PACKAGING_MATERIALS;
    }
    async completePacking(dto, operatorId) {
        const order = await this.prisma.order.findFirst({
            where: {
                OR: [
                    { id: dto.orderId },
                    { orderNumber: dto.orderId },
                ],
            },
            include: {
                customer: true,
                shippingAddress: true,
                packages: true,
                qcChecklists: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order '${dto.orderId}' not found`);
        }
        const evalResult = await this.workflowState.evaluatePackingEligibility(order.id);
        if (!evalResult.eligible) {
            if (evalResult.reasons.includes('PAYMENT_PENDING') || evalResult.reasons.includes('PAYMENT_PARTIAL')) {
                throw new common_1.BadRequestException(`Packing blocked: Payment clearance is pending. Outstanding balance of ₹${evalResult.balanceAmount.toFixed(2)} must be cleared before packing.`);
            }
            if (evalResult.reasons.includes('FINAL_QC_FAILED') || evalResult.reasons.includes('FINAL_QC_NOT_PASSED')) {
                throw new common_1.BadRequestException(`Packing blocked: Final QC physical inspection has not passed.`);
            }
            if (evalResult.reasons.includes('ACTIVE_HOLD')) {
                throw new common_1.BadRequestException(`Packing blocked: Order is currently on technical hold.`);
            }
            throw new common_1.BadRequestException(`Packing blocked: Order #${order.orderNumber} is not eligible for packing (${evalResult.reasons.join(', ')}).`);
        }
        if (!order.shippingAddress && order.deliveryMethod === 'COURIER') {
            throw new common_1.BadRequestException(`Shipping address is required for courier delivery on Order #${order.orderNumber}.`);
        }
        const totalPackages = dto.packages.length;
        if (totalPackages === 0) {
            throw new common_1.BadRequestException('At least one physical carton must be registered before completion.');
        }
        for (const p of dto.packages) {
            if (!p.grossWeightGrams || p.grossWeightGrams <= 0) {
                throw new common_1.BadRequestException(`Carton #${p.sequenceNumber} has an invalid weight.`);
            }
            if (!p.lengthCm || !p.widthCm || !p.heightCm || p.lengthCm <= 0 || p.widthCm <= 0 || p.heightCm <= 0) {
                throw new common_1.BadRequestException(`Carton #${p.sequenceNumber} has invalid dimensions.`);
            }
        }
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const createdPackages = await this.prisma.$transaction(async (tx) => {
            await tx.package.deleteMany({ where: { orderId: order.id } });
            const pkgs = [];
            for (const p of dto.packages) {
                const pkgNumber = `${order.orderNumber}-PKG-${p.sequenceNumber.toString().padStart(2, '0')}`;
                const barcode = `BAR-${datePrefix}-${order.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}-${p.sequenceNumber}`;
                const createdPkg = await tx.package.create({
                    data: {
                        orderId: order.id,
                        packageNumber: pkgNumber,
                        sequenceNumber: p.sequenceNumber,
                        totalPackages,
                        grossWeightGrams: p.grossWeightGrams,
                        lengthCm: p.lengthCm,
                        widthCm: p.widthCm,
                        heightCm: p.heightCm,
                        status: client_1.PackageStatus.SEALED,
                        barcode,
                        labelUrl: `/api/v1/packages/label/${barcode}`,
                    },
                });
                pkgs.push(createdPkg);
            }
            let shipmentId = null;
            if (order.deliveryMethod === 'COURIER') {
                const courier = dto.courierName || 'Delhivery Surface Express';
                const awbNumber = `AWB${Math.floor(1000000000 + Math.random() * 9000000000)}`;
                const shipmentNumber = `SHP-${datePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
                const shipment = await tx.shipment.create({
                    data: {
                        shipmentNumber,
                        courierName: courier,
                        awbNumber,
                        trackingUrl: `https://track.printbazzar.com/${awbNumber}`,
                        status: client_1.ShipmentStatus.CREATED,
                    },
                });
                shipmentId = shipment.id;
                await tx.package.updateMany({
                    where: { orderId: order.id },
                    data: { shipmentId },
                });
            }
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.READY_FOR_DISPATCH,
                    customerStatus: order.deliveryMethod === 'STORE_PICKUP'
                        ? 'READY_FOR_PICKUP'
                        : 'READY_TO_SHIP',
                },
            });
            await tx.jobCard.updateMany({
                where: { orderId: order.id },
                data: { currentStation: 'DISPATCH' },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    fromStatus: order.status,
                    toStatus: client_1.OrderStatus.READY_FOR_DISPATCH,
                    changedById: operatorId,
                    reason: `Packaging complete: ${totalPackages} carton(s) weighed and labeled. Moved to Dispatch stage.`,
                },
            });
            return pkgs;
        });
        await this.auditService.log({
            actorId: operatorId,
            action: 'COMPLETE_PACKING',
            entity: 'Order',
            entityId: order.id,
            orderId: order.id,
            newState: {
                totalPackages,
                packages: createdPackages.map((p) => p.packageNumber),
                printer: dto.stationPrinter || 'Zebra ZT411',
            },
            reason: `Packing completed: ${totalPackages} parcel(s)`,
        });
        this.eventEmitter.emit('packing.completed', {
            orderId: order.id,
            packageCount: totalPackages,
            deliveryMethod: order.deliveryMethod,
        });
        return createdPackages;
    }
    async recordLabelReprint(orderId, operatorId, metadata) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, orderNumber: true },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order '${orderId}' not found`);
        }
        await this.auditService.log({
            actorId: operatorId,
            action: 'REPRINT_SHIPPING_LABEL',
            entity: 'Order',
            entityId: order.id,
            orderId: order.id,
            newState: {
                reprintedAt: new Date(),
                reason: metadata?.reason || 'Operator requested label reprint',
            },
            reason: metadata?.reason || 'Label reprint at packing station',
        });
        return { success: true, message: `Reprint event logged for #${order.orderNumber}` };
    }
    async getPackagesForOrder(orderId) {
        return this.prisma.package.findMany({
            where: { orderId },
            include: { shipment: true },
            orderBy: { sequenceNumber: 'asc' },
        });
    }
};
exports.PackingService = PackingService;
exports.PackingService = PackingService = PackingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        event_emitter_1.EventEmitter2,
        workflow_state_service_1.WorkflowStateService])
], PackingService);
//# sourceMappingURL=packing.service.js.map