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
var QualityControlService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityControlService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const job_card_engine_service_1 = require("../job-cards/job-card-engine.service");
const client_1 = require("@prisma/client");
const workflow_state_service_1 = require("../workflow/workflow-state.service");
let QualityControlService = QualityControlService_1 = class QualityControlService {
    prisma;
    auditService;
    eventEmitter;
    jobCardEngine;
    workflowState;
    logger = new common_1.Logger(QualityControlService_1.name);
    constructor(prisma, auditService, eventEmitter, jobCardEngine, workflowState) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.eventEmitter = eventEmitter;
        this.jobCardEngine = jobCardEngine;
        this.workflowState = workflowState;
    }
    async submitInspection(dto, inspectorId) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: {
                items: true,
                payments: true,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order '${dto.orderId}' not found`);
        }
        const hasFailure = dto.items.some((item) => item.result === 'FAIL');
        const outcome = hasFailure ? client_1.QCOutcome.FAIL : client_1.QCOutcome.PASS;
        const inspectionType = client_1.QCInspectionType.FINAL_QC;
        const checklist = await this.prisma.$transaction(async (tx) => {
            const created = await tx.qCChecklist.create({
                data: {
                    orderId: order.id,
                    jobCardId: dto.jobCardId,
                    type: inspectionType,
                    outcome,
                    inspectorId,
                    items: dto.items,
                    defects: dto.defects || [],
                    notes: dto.generalNotes,
                },
            });
            if (outcome === client_1.QCOutcome.PASS) {
                const balance = Number(order.balanceAmount);
                const isPaidInFull = balance <= 0 || order.paymentStatus === 'PAID';
                const isCorporateCredit = order.payments.some((p) => p.method === 'CORPORATE_CREDIT') ||
                    order.customerNotes?.toLowerCase().includes('net-30') ||
                    order.customerNotes?.toLowerCase().includes('credit');
                const isFinanciallyCleared = isPaidInFull || isCorporateCredit;
                if (isFinanciallyCleared) {
                    await tx.order.update({
                        where: { id: order.id },
                        data: {
                            status: client_1.OrderStatus.PACKING,
                            customerStatus: 'QUALITY_CHECK_AND_PACKING',
                        },
                    });
                    await tx.orderStatusHistory.create({
                        data: {
                            orderId: order.id,
                            fromStatus: order.status,
                            toStatus: client_1.OrderStatus.PACKING,
                            changedById: inspectorId,
                            reason: 'Final QC PASSED (100% Paid / Approved Credit). Automatically released directly to Packing Station.',
                        },
                    });
                    await tx.jobCard.updateMany({
                        where: { orderId: order.id },
                        data: {
                            status: client_1.JobCardStatus.COMPLETED,
                            currentStation: 'PACKING',
                            completedAt: new Date(),
                        },
                    });
                }
                else {
                    await tx.order.update({
                        where: { id: order.id },
                        data: {
                            status: client_1.OrderStatus.PAYMENT_PENDING,
                            customerStatus: 'PAYMENT_PENDING',
                        },
                    });
                    await tx.orderStatusHistory.create({
                        data: {
                            orderId: order.id,
                            fromStatus: order.status,
                            toStatus: client_1.OrderStatus.PAYMENT_PENDING,
                            changedById: inspectorId,
                            reason: `Final QC PASSED. Outstanding Balance: ₹${balance.toFixed(2)}. Transferred to Finance/Payments queue (Packing Blocked until settled).`,
                        },
                    });
                    await tx.jobCard.updateMany({
                        where: { orderId: order.id },
                        data: {
                            status: client_1.JobCardStatus.PASSED,
                            currentStation: 'FINISHING',
                            completedAt: new Date(),
                        },
                    });
                }
            }
            else {
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: client_1.OrderStatus.ON_HOLD,
                        customerStatus: 'ON_HOLD',
                    },
                });
                await tx.orderStatusHistory.create({
                    data: {
                        orderId: order.id,
                        fromStatus: order.status,
                        toStatus: client_1.OrderStatus.ON_HOLD,
                        changedById: inspectorId,
                        reason: `Final QC REJECTED: Defects [${dto.defects?.join(', ')}]. Rework required.`,
                    },
                });
                if (dto.jobCardId) {
                    await tx.jobCard.update({
                        where: { id: dto.jobCardId },
                        data: {
                            status: client_1.JobCardStatus.FAILED_REWORK,
                            currentStation: 'REWORK',
                        },
                    });
                    await tx.jobIssue.create({
                        data: {
                            jobCardId: dto.jobCardId,
                            reasonCode: dto.defects?.[0] || 'FINAL_QC_DEFECT',
                            description: dto.generalNotes || 'Defect detected in Final QC inspection',
                            reportedBy: inspectorId,
                        },
                    });
                }
            }
            return created;
        });
        await this.auditService.log({
            actorId: inspectorId,
            actorType: 'USER',
            action: `QC_INSPECTION_FINAL_QC_${outcome}`,
            entity: 'QCChecklist',
            entityId: checklist.id,
            orderId: order.id,
            newState: { outcome, defects: dto.defects },
            reason: dto.generalNotes,
        });
        this.eventEmitter.emit(`qc.final_qc.${outcome.toLowerCase()}`, {
            orderId: order.id,
            jobCardId: dto.jobCardId,
            checklistId: checklist.id,
            inspectorId,
        });
        return checklist;
    }
    async getChecklistsForOrder(orderId) {
        return this.prisma.qCChecklist.findMany({
            where: { orderId },
            include: {
                inspector: { select: { id: true, fullName: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getFinalQCQueue(search) {
        const where = {
            OR: [
                {
                    status: {
                        in: [
                            client_1.OrderStatus.QUALITY_CHECK,
                            client_1.OrderStatus.PACKING,
                            client_1.OrderStatus.READY_FOR_DISPATCH,
                            client_1.OrderStatus.OUT_FOR_DELIVERY,
                            client_1.OrderStatus.DELIVERED,
                            client_1.OrderStatus.ON_HOLD,
                        ],
                    },
                },
                {
                    qcChecklists: {
                        some: {
                            type: 'FINAL_QC',
                            outcome: 'PASS',
                        },
                    },
                },
                {
                    jobCards: {
                        some: {
                            currentStation: 'PACKING',
                        },
                    },
                },
            ],
            ...(search
                ? {
                    AND: [
                        {
                            OR: [
                                { orderNumber: { contains: search, mode: 'insensitive' } },
                                { customer: { fullName: { contains: search, mode: 'insensitive' } } },
                            ],
                        },
                    ],
                }
                : {}),
        };
        return this.prisma.order.findMany({
            where,
            include: {
                customer: { select: { id: true, fullName: true, email: true, phone: true } },
                items: {
                    include: {
                        artworkVersions: { orderBy: { versionNumber: 'desc' } },
                    },
                },
                jobCards: true,
                qcChecklists: { orderBy: { createdAt: 'desc' } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    getFinalQCTemplate() {
        return [
            { code: 'COLOR_ACCURACY', name: 'Color Density & Registration against Approved Proof', result: 'NOT_APPLICABLE' },
            { code: 'SURFACE_INTEGRITY', name: 'No Scratches, Ink Smudges or Ghosting', result: 'NOT_APPLICABLE' },
            { code: 'CUT_AND_CREASE', name: 'Trim Squareness & Crease / Fold Alignment', result: 'NOT_APPLICABLE' },
            { code: 'LAMINATION_ADHESION', name: 'Lamination Adhesion & Bubble Check', result: 'NOT_APPLICABLE' },
            { code: 'ACCURATE_COUNT', name: 'Total Physical Count & Packing Bundles', result: 'NOT_APPLICABLE' },
        ];
    }
};
exports.QualityControlService = QualityControlService;
exports.QualityControlService = QualityControlService = QualityControlService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        event_emitter_1.EventEmitter2,
        job_card_engine_service_1.JobCardEngineService,
        workflow_state_service_1.WorkflowStateService])
], QualityControlService);
//# sourceMappingURL=qc.service.js.map