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
var JobCardEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobCardEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
let JobCardEngineService = JobCardEngineService_1 = class JobCardEngineService {
    prisma;
    auditService;
    eventEmitter;
    logger = new common_1.Logger(JobCardEngineService_1.name);
    constructor(prisma, auditService, eventEmitter) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.eventEmitter = eventEmitter;
    }
    async generateJobCardForOrderItem(orderItemId, actorId) {
        const item = await this.prisma.orderItem.findUnique({
            where: { id: orderItemId },
            include: {
                order: {
                    include: {
                        customer: true,
                        shippingAddress: true,
                        qcChecklists: true,
                    },
                },
                product: {
                    include: {
                        category: true,
                    },
                },
                artworkVersions: true,
                jobCards: true,
            },
        });
        if (!item) {
            throw new common_1.NotFoundException(`OrderItem '${orderItemId}' not found`);
        }
        const existingJob = item.jobCards.find((j) => j.status !== client_1.JobCardStatus.COMPLETED);
        if (existingJob) {
            this.logger.log(`Job Card '${existingJob.jobNumber}' already exists for OrderItem '${orderItemId}'.`);
            return existingJob;
        }
        const order = item.order;
        const isPaid = order.paymentStatus === 'PAID' ||
            order.paymentStatus === 'AUTHORIZED' ||
            order.paymentStatus === 'PARTIALLY_PAID' ||
            Number(order.paidAmount) > 0;
        if (!isPaid) {
            throw new common_1.BadRequestException(`Job Card creation blocked: Order '${order.orderNumber}' has no verified payment or advance deposit.`);
        }
        let approvedArtworkId = item.approvedArtworkVersionId;
        if (!approvedArtworkId) {
            const approvedVersion = item.artworkVersions.find((v) => v.isApproved);
            if (approvedVersion) {
                approvedArtworkId = approvedVersion.id;
            }
        }
        const categorySlug = item.product?.category?.slug || '';
        const operationSequence = this.resolveProductionRoute(categorySlug, item.specifications);
        const turnaroundDays = item.product?.productionDays || 2;
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + turnaroundDays);
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await this.prisma.jobCard.count();
        const jobNumber = `JC-${datePrefix}-${String(count + 1).padStart(4, '0')}`;
        const jobCard = await this.prisma.$transaction(async (tx) => {
            const created = await tx.jobCard.create({
                data: {
                    jobNumber,
                    orderId: order.id,
                    orderItemId: item.id,
                    approvedArtworkVersionId: approvedArtworkId,
                    status: client_1.JobCardStatus.QUEUED,
                    priority: order.priority,
                    currentStation: operationSequence[0]?.station || 'PRINTING',
                    operationSequence,
                    technicalSpecs: {
                        productName: item.productName,
                        sku: item.sku,
                        quantity: item.quantity,
                        specifications: item.specifications,
                        customerName: order.customer?.fullName || 'Valued Customer',
                        customerCompany: order.customer?.companyName || null,
                    },
                    dueAt,
                },
            });
            if (approvedArtworkId && !item.approvedArtworkVersionId) {
                await tx.orderItem.update({
                    where: { id: item.id },
                    data: { approvedArtworkVersionId: approvedArtworkId },
                });
            }
            await tx.slaRecord.create({
                data: {
                    orderId: order.id,
                    jobCardId: created.id,
                    entityType: 'JOB_CARD',
                    targetDueAt: dueAt,
                },
            });
            return created;
        });
        await this.auditService.log({
            actorId,
            actorType: actorId ? 'USER' : 'SYSTEM',
            action: 'AUTOMATIC_JOB_CARD_CREATED',
            entity: 'JobCard',
            entityId: jobCard.id,
            orderId: order.id,
            newState: { jobNumber, status: jobCard.status, currentStation: jobCard.currentStation },
            reason: `Automated Job Card generation for Order ${order.orderNumber}`,
        });
        this.eventEmitter.emit('jobcard.created', {
            jobCardId: jobCard.id,
            jobNumber: jobCard.jobNumber,
            orderId: order.id,
        });
        return jobCard;
    }
    resolveProductionRoute(categorySlug = '', specs) {
        const slug = (categorySlug || '').toLowerCase();
        const defaultRoute = [
            { step: 1, station: 'PREPRESS', action: 'Digital Preflight & RIP', status: 'COMPLETED' },
            { step: 2, station: 'PRINTING', action: 'HP Indigo 12000 4-Color Print', status: 'PENDING' },
            { step: 3, station: 'FINISHING', action: 'Thermal Matt Lamination & Die Cut', status: 'PENDING' },
            { step: 4, station: 'FINAL_QC', action: 'Physical Defect & Alignment Inspection', status: 'PENDING' },
            { step: 5, station: 'PACKING', action: 'Protective Film Wrapping & Boxing', status: 'PENDING' },
        ];
        if (slug.includes('apparel') || slug.includes('t-shirt')) {
            return [
                { step: 1, station: 'PREPRESS', action: 'Color Separation & Film RIP', status: 'COMPLETED' },
                { step: 2, station: 'PRINTING', action: 'DTF / Screen Print Station', status: 'PENDING' },
                { step: 3, station: 'FINISHING', action: 'Heat Press Curing', status: 'PENDING' },
                { step: 4, station: 'FINAL_QC', action: 'Fabric Pull & Wash Fastness QC', status: 'PENDING' },
                { step: 5, station: 'PACKING', action: 'Individual Polybag & Barcode Tagging', status: 'PENDING' },
            ];
        }
        if (slug.includes('signage') || slug.includes('banner')) {
            return [
                { step: 1, station: 'PREPRESS', action: 'Tiling & Grommet Alignment', status: 'COMPLETED' },
                { step: 2, station: 'PRINTING', action: 'Wide Format UV Roll-to-Roll', status: 'PENDING' },
                { step: 3, station: 'FINISHING', action: 'Edge Hemming & Brass Eyelets', status: 'PENDING' },
                { step: 4, station: 'FINAL_QC', action: 'Seam & Eyelet Pull Test', status: 'PENDING' },
                { step: 5, station: 'PACKING', action: 'Corrugated Tube Roll Packing', status: 'PENDING' },
            ];
        }
        return defaultRoute;
    }
    async listJobCards(params) {
        const isOperator = params?.user?.role === 'PRODUCTION_OPERATOR';
        return this.prisma.jobCard.findMany({
            where: {
                ...(params?.status ? { status: params.status } : {}),
                ...(params?.station ? { currentStation: params.station } : {}),
                ...(isOperator && params?.user ? { operatorId: params.user.sub } : {}),
            },
            include: {
                order: {
                    select: {
                        orderNumber: true,
                        priority: true,
                        status: true,
                        customer: { select: { fullName: true, companyName: true, phone: true } },
                    },
                },
                machine: true,
                operator: { select: { id: true, fullName: true, role: true } },
            },
            orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
        });
    }
    async claimJobCard(jobCardId, operatorId) {
        const job = await this.prisma.jobCard.findUnique({ where: { id: jobCardId } });
        if (!job)
            throw new common_1.NotFoundException(`JobCard '${jobCardId}' not found`);
        if (job.operatorId && job.operatorId !== operatorId) {
            throw new common_1.ForbiddenException(`JobCard '${job.jobNumber}' is already assigned to another operator.`);
        }
        return this.prisma.jobCard.update({
            where: { id: jobCardId },
            data: {
                operatorId,
                status: client_1.JobCardStatus.ASSIGNED,
            },
        });
    }
    async assignMachine(jobCardId, machineId) {
        return this.prisma.jobCard.update({
            where: { id: jobCardId },
            data: { machineId },
        });
    }
    async startJob(jobCardId, user) {
        const userId = typeof user === 'string' ? user : user.sub;
        const isOperator = typeof user !== 'string' && user.role === 'PRODUCTION_OPERATOR';
        const job = await this.prisma.jobCard.findUnique({ where: { id: jobCardId } });
        if (!job)
            throw new common_1.NotFoundException(`JobCard '${jobCardId}' not found`);
        if (isOperator && job.operatorId && job.operatorId !== userId) {
            throw new common_1.ForbiddenException(`Forbidden: JobCard is assigned to a different operator`);
        }
        return this.prisma.jobCard.update({
            where: { id: jobCardId },
            data: {
                status: client_1.JobCardStatus.PRINTING,
                startedAt: new Date(),
                operatorId: job.operatorId || userId,
            },
        });
    }
    async completeStation(jobCardId, nextStation, user) {
        const job = await this.prisma.jobCard.findUnique({
            where: { id: jobCardId },
            include: { order: true },
        });
        if (!job)
            throw new common_1.NotFoundException(`JobCard '${jobCardId}' not found`);
        if (user?.role === 'PRODUCTION_OPERATOR' && job.operatorId && job.operatorId !== user.sub) {
            throw new common_1.ForbiddenException(`Forbidden: JobCard belongs to another operator`);
        }
        const updated = await this.prisma.jobCard.update({
            where: { id: jobCardId },
            data: {
                currentStation: nextStation,
                status: nextStation === 'FINAL_QC' ? client_1.JobCardStatus.QC_INSPECTION : client_1.JobCardStatus.PRINTING_COMPLETED,
            },
        });
        if (nextStation === 'FINAL_QC' || nextStation === 'PACKING') {
            await this.prisma.orderAssignment.updateMany({
                where: {
                    orderId: job.orderId,
                    taskType: client_1.AssignmentTaskType.PRODUCTION,
                    status: client_1.AssignmentStatus.ACTIVE,
                },
                data: {
                    status: client_1.AssignmentStatus.COMPLETED,
                    completedAt: new Date(),
                },
            });
        }
        return updated;
    }
};
exports.JobCardEngineService = JobCardEngineService;
exports.JobCardEngineService = JobCardEngineService = JobCardEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        event_emitter_1.EventEmitter2])
], JobCardEngineService);
//# sourceMappingURL=job-card-engine.service.js.map