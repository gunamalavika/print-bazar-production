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
var WorkflowStateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowStateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const workflow_1 = require("../../common/types/workflow");
const roles_1 = require("../../common/types/roles");
const client_1 = require("@prisma/client");
let WorkflowStateService = WorkflowStateService_1 = class WorkflowStateService {
    prisma;
    auditService;
    eventEmitter;
    logger = new common_1.Logger(WorkflowStateService_1.name);
    transitionRules = [
        {
            from: [client_1.OrderStatus.ORDER_CREATED],
            to: client_1.OrderStatus.PAYMENT_PENDING,
            allowedRoles: [roles_1.UserRole.CUSTOMER, roles_1.UserRole.SALES_OFFICE, roles_1.UserRole.ADMIN_MANAGER],
        },
        {
            from: [client_1.OrderStatus.PAYMENT_PENDING, client_1.OrderStatus.ORDER_CREATED],
            to: client_1.OrderStatus.PAYMENT_CONFIRMED,
            allowedRoles: [roles_1.UserRole.ACCOUNTS, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.FINANCE, roles_1.Department.MANAGEMENT],
        },
        {
            from: [client_1.OrderStatus.PAYMENT_CONFIRMED, client_1.OrderStatus.ORDER_CREATED, client_1.OrderStatus.ORDER_REVIEW, client_1.OrderStatus.ARTWORK_REVIEW],
            to: client_1.OrderStatus.DESIGN_REQUIRED,
            allowedRoles: [roles_1.UserRole.SALES_OFFICE, roles_1.UserRole.DESIGNER_PREPRESS, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.SALES, roles_1.Department.DESIGN_PREPRESS, roles_1.Department.OPERATIONS, roles_1.Department.MANAGEMENT],
        },
        {
            from: [client_1.OrderStatus.DESIGN_REQUIRED],
            to: client_1.OrderStatus.ARTWORK_APPROVED,
            allowedRoles: [roles_1.UserRole.DESIGNER_PREPRESS, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.DESIGN_PREPRESS, roles_1.Department.OPERATIONS, roles_1.Department.MANAGEMENT],
        },
        {
            from: [client_1.OrderStatus.ORDER_REVIEW],
            to: client_1.OrderStatus.ARTWORK_REVIEW,
            allowedRoles: [roles_1.UserRole.DESIGNER_PREPRESS, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.DESIGN_PREPRESS, roles_1.Department.OPERATIONS, roles_1.Department.MANAGEMENT],
        },
        {
            from: [client_1.OrderStatus.ARTWORK_REVIEW, client_1.OrderStatus.DESIGN_REQUIRED, client_1.OrderStatus.ORDER_REVIEW],
            to: client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
            allowedRoles: [roles_1.UserRole.DESIGNER_PREPRESS, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.DESIGN_PREPRESS, roles_1.Department.OPERATIONS, roles_1.Department.MANAGEMENT],
        },
        {
            from: [client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED, client_1.OrderStatus.ARTWORK_REVIEW],
            to: client_1.OrderStatus.ARTWORK_APPROVED,
            allowedRoles: [roles_1.UserRole.CUSTOMER, roles_1.UserRole.DESIGNER_PREPRESS, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.DESIGN_PREPRESS, roles_1.Department.OPERATIONS, roles_1.Department.MANAGEMENT],
        },
        {
            from: [
                client_1.OrderStatus.ARTWORK_APPROVED,
                client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
                client_1.OrderStatus.ORDER_REVIEW,
                client_1.OrderStatus.ARTWORK_REVIEW,
                client_1.OrderStatus.PAYMENT_CONFIRMED,
                client_1.OrderStatus.PRE_PRODUCTION_QC,
            ],
            to: client_1.OrderStatus.PRODUCTION_QUEUE,
            allowedRoles: [roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.OPERATIONS, roles_1.Department.MANAGEMENT],
            requiresPayment: true,
        },
        {
            from: [client_1.OrderStatus.PRODUCTION_QUEUE],
            to: client_1.OrderStatus.PRINTING,
            allowedRoles: [roles_1.UserRole.PRODUCTION_OPERATOR, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.PRODUCTION, roles_1.Department.MANAGEMENT],
        },
        {
            from: [client_1.OrderStatus.PRINTING],
            to: client_1.OrderStatus.FINISHING,
            allowedRoles: [roles_1.UserRole.PRODUCTION_OPERATOR, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.PRODUCTION, roles_1.Department.MANAGEMENT],
        },
        {
            from: [client_1.OrderStatus.PRINTING, client_1.OrderStatus.FINISHING],
            to: client_1.OrderStatus.QUALITY_CHECK,
            allowedRoles: [roles_1.UserRole.PRODUCTION_OPERATOR, roles_1.UserRole.FINAL_QC_INSPECTOR, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.PRODUCTION, roles_1.Department.QUALITY_ASSURANCE, roles_1.Department.MANAGEMENT],
        },
        {
            from: [client_1.OrderStatus.QUALITY_CHECK, client_1.OrderStatus.PAYMENT_PENDING],
            to: client_1.OrderStatus.PACKING,
            allowedRoles: [roles_1.UserRole.FINAL_QC_INSPECTOR, roles_1.UserRole.ACCOUNTS, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.QUALITY_ASSURANCE, roles_1.Department.FINANCE, roles_1.Department.MANAGEMENT],
            requiresQCPass: true,
            requiresPayment: true,
        },
        {
            from: [client_1.OrderStatus.PACKING],
            to: client_1.OrderStatus.READY_FOR_DISPATCH,
            allowedRoles: [roles_1.UserRole.PACKING_OPERATOR, roles_1.UserRole.DISPATCH_LOGISTICS, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.PACKAGING, roles_1.Department.LOGISTICS, roles_1.Department.MANAGEMENT],
        },
        {
            from: [client_1.OrderStatus.READY_FOR_DISPATCH],
            to: client_1.OrderStatus.OUT_FOR_DELIVERY,
            allowedRoles: [roles_1.UserRole.DISPATCH_LOGISTICS, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.LOGISTICS, roles_1.Department.MANAGEMENT],
        },
        {
            from: [client_1.OrderStatus.OUT_FOR_DELIVERY, client_1.OrderStatus.READY_FOR_DISPATCH],
            to: client_1.OrderStatus.DELIVERED,
            allowedRoles: [roles_1.UserRole.DISPATCH_LOGISTICS, roles_1.UserRole.SALES_OFFICE, roles_1.UserRole.ADMIN_MANAGER],
            allowedDepartments: [roles_1.Department.LOGISTICS, roles_1.Department.SALES, roles_1.Department.MANAGEMENT],
        },
    ];
    constructor(prisma, auditService, eventEmitter) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.eventEmitter = eventEmitter;
    }
    async transition(dto, user) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: {
                items: {
                    include: {
                        artworkVersions: true,
                        jobCards: true,
                    },
                },
                payments: true,
                qcChecklists: true,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order '${dto.orderId}' not found`);
        }
        const currentStatus = order.status;
        const targetStatus = dto.targetStatus;
        if (currentStatus === targetStatus) {
            return order;
        }
        const rule = this.transitionRules.find((r) => r.from.includes(currentStatus) && r.to === targetStatus);
        if (!rule && user.role !== roles_1.UserRole.ADMIN_MANAGER) {
            throw new common_1.BadRequestException(`Transition from '${currentStatus}' to '${targetStatus}' is invalid and forbidden.`);
        }
        if (rule && user.role !== roles_1.UserRole.ADMIN_MANAGER) {
            if (!rule.allowedRoles.includes(user.role)) {
                throw new common_1.ForbiddenException(`User role '${user.role}' is not authorized to transition order to '${targetStatus}'.`);
            }
            if (rule.allowedDepartments &&
                user.department &&
                !rule.allowedDepartments.includes(user.department)) {
                throw new common_1.ForbiddenException(`User department '${user.department}' is not authorized for this operation.`);
            }
        }
        if (rule?.requiresPayment) {
            const isPaidInFull = order.paymentStatus === 'PAID' ||
                order.paymentStatus === 'AUTHORIZED' ||
                Number(order.paidAmount) >= Number(order.totalAmount);
            const isAdvancePaid = order.paymentStatus === 'PARTIALLY_PAID' ||
                Number(order.paidAmount) > 0;
            const isEligible = targetStatus === client_1.OrderStatus.PRODUCTION_QUEUE
                ? isPaidInFull || isAdvancePaid
                : isPaidInFull;
            if (!isEligible) {
                throw new common_1.BadRequestException(`Cannot transition to '${targetStatus}': Order has unpaid balance (Total: ₹${order.totalAmount}, Paid: ₹${order.paidAmount}).`);
            }
        }
        if (rule?.requiresApprovedArtwork) {
            const allItemsApproved = order.items.every((item) => item.approvedArtworkVersionId !== null || item.designNotes === 'BYPASS_ARTWORK');
            if (!allItemsApproved) {
                throw new common_1.BadRequestException(`Cannot transition to '${targetStatus}': All order items must have an approved artwork version.`);
            }
        }
        if (rule?.requiresQCPass) {
            const finalQc = order.qcChecklists.find((qc) => qc.type === 'FINAL_QC' && qc.outcome === 'PASS');
            if (targetStatus === client_1.OrderStatus.PACKING && !finalQc) {
                throw new common_1.BadRequestException(`Cannot release to '${targetStatus}': Final QC inspection has not passed.`);
            }
        }
        const newCustomerStatus = workflow_1.STATUS_MAPPING[targetStatus] || workflow_1.CustomerVisibleStatus.IN_PRODUCTION;
        const updatedOrder = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: targetStatus,
                    customerStatus: newCustomerStatus,
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    fromStatus: currentStatus,
                    toStatus: targetStatus,
                    changedById: user.sub,
                    department: user.department,
                    reason: dto.notes || `Transitioned to ${targetStatus}`,
                    notes: dto.notes,
                },
            });
            return updated;
        });
        await this.auditService.log({
            actorId: user.sub,
            actorType: 'USER',
            action: `TRANSITION_${targetStatus}`,
            entity: 'Order',
            entityId: order.id,
            orderId: order.id,
            previousState: { status: currentStatus, customerStatus: order.customerStatus },
            newState: { status: targetStatus, customerStatus: newCustomerStatus },
            reason: dto.notes,
        });
        this.eventEmitter.emit(`order.status.${targetStatus.toLowerCase()}`, {
            orderId: order.id,
            fromStatus: currentStatus,
            toStatus: targetStatus,
            actorId: user.sub,
        });
        return updatedOrder;
    }
    async managerOverride(dto, user) {
        if (user.role !== roles_1.UserRole.ADMIN_MANAGER) {
            throw new common_1.ForbiddenException('Manager overrides require ADMIN_MANAGER role.');
        }
        if (!dto.reason || dto.reason.trim().length < 8) {
            throw new common_1.BadRequestException('Manager override requires a detailed justification (min 8 characters).');
        }
        const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
        if (!order)
            throw new common_1.NotFoundException(`Order '${dto.orderId}' not found`);
        const currentStatus = order.status;
        const targetStatus = dto.targetStatus;
        const newCustomerStatus = workflow_1.STATUS_MAPPING[targetStatus] || workflow_1.CustomerVisibleStatus.IN_PRODUCTION;
        const updatedOrder = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: targetStatus,
                    customerStatus: newCustomerStatus,
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    fromStatus: currentStatus,
                    toStatus: targetStatus,
                    changedById: user.sub,
                    department: roles_1.Department.MANAGEMENT,
                    reason: `MANAGER OVERRIDE: ${dto.reason}`,
                    notes: dto.notes,
                },
            });
            return updated;
        });
        await this.auditService.log({
            actorId: user.sub,
            actorType: 'USER',
            action: `MANAGER_OVERRIDE_TO_${targetStatus}`,
            entity: 'Order',
            entityId: order.id,
            orderId: order.id,
            previousState: { status: currentStatus },
            newState: { status: targetStatus },
            reason: dto.reason,
        });
        return updatedOrder;
    }
    async pauseOrder(orderId, reason, user) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException(`Order '${orderId}' not found`);
        if (order.status === client_1.OrderStatus.ON_HOLD) {
            return order;
        }
        const preHold = order.status;
        const updated = await this.prisma.$transaction(async (tx) => {
            const res = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: client_1.OrderStatus.ON_HOLD,
                    customerStatus: workflow_1.CustomerVisibleStatus.ON_HOLD,
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId,
                    fromStatus: preHold,
                    toStatus: client_1.OrderStatus.ON_HOLD,
                    changedById: user.sub,
                    reason: `PAUSED: ${reason} (preHoldStatus: ${preHold})`,
                },
            });
            return res;
        });
        await this.auditService.log({
            actorId: user.sub,
            action: 'PAUSE_ORDER',
            entity: 'Order',
            entityId: orderId,
            orderId,
            previousState: { status: preHold },
            newState: { status: client_1.OrderStatus.ON_HOLD, preHoldStatus: preHold },
            reason,
        });
        return updated;
    }
    async resumeOrder(orderId, preHoldStatus, user) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException(`Order '${orderId}' not found`);
        const updated = await this.prisma.$transaction(async (tx) => {
            const res = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: preHoldStatus,
                    customerStatus: workflow_1.STATUS_MAPPING[preHoldStatus] || workflow_1.CustomerVisibleStatus.IN_PRODUCTION,
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId,
                    fromStatus: client_1.OrderStatus.ON_HOLD,
                    toStatus: preHoldStatus,
                    changedById: user.sub,
                    reason: `RESUMED from ON_HOLD back to ${preHoldStatus}`,
                },
            });
            return res;
        });
        await this.auditService.log({
            actorId: user.sub,
            action: 'RESUME_ORDER',
            entity: 'Order',
            entityId: orderId,
            orderId,
            previousState: { status: client_1.OrderStatus.ON_HOLD },
            newState: { status: preHoldStatus },
            reason: `Resumed back to ${preHoldStatus}`,
        });
        return updated;
    }
    resolveInitialWorkflow(order) {
        const isPaid = order.paymentStatus === 'PAID' ||
            order.paymentStatus === 'AUTHORIZED' ||
            order.paymentStatus === 'PARTIALLY_PAID' ||
            Number(order.paidAmount || 0) > 0;
        if (!isPaid) {
            return client_1.OrderStatus.PAYMENT_PENDING;
        }
        const firstItem = order.items?.[0];
        const specs = firstItem?.specifications || {};
        const isDesignRoute = specs.workflowRoute === 'DESIGN_SERVICE' ||
            specs.artworkSource === 'DESIGN_TEAM' ||
            specs.artworkSource === 'CUSTOMER_WITH_DESIGN_ASSISTANCE' ||
            Boolean(specs.selectedDesignService) ||
            Boolean(firstItem?.selectedDesignService);
        if (isDesignRoute) {
            return client_1.OrderStatus.DESIGN_REQUIRED;
        }
        return client_1.OrderStatus.ORDER_REVIEW;
    }
    async evaluatePackingEligibility(orderId, tx) {
        const client = tx || this.prisma;
        const order = await client.order.findUnique({
            where: { id: orderId },
            include: {
                qcChecklists: { orderBy: { createdAt: 'desc' } },
                payments: { orderBy: { createdAt: 'desc' } },
                jobCards: { select: { id: true, status: true, currentStation: true } },
            },
        });
        if (!order) {
            return {
                eligible: false,
                reasons: ['ORDER_NOT_FOUND'],
                finalQcPassed: false,
                paymentCleared: false,
                productionComplete: false,
                noActiveHold: false,
                balanceAmount: 0,
            };
        }
        const reasons = [];
        const finalQcPass = order.qcChecklists.find((qc) => qc.type === client_1.QCInspectionType.FINAL_QC && qc.outcome === client_1.QCOutcome.PASS);
        const finalQcPassed = !!finalQcPass;
        if (!finalQcPassed) {
            const finalQcFail = order.qcChecklists.find((qc) => qc.type === client_1.QCInspectionType.FINAL_QC && qc.outcome === client_1.QCOutcome.FAIL);
            if (finalQcFail) {
                reasons.push('FINAL_QC_FAILED');
            }
            else {
                reasons.push('FINAL_QC_NOT_PASSED');
            }
        }
        const balance = Number(order.balanceAmount);
        const isPaidInFull = balance <= 0 || order.paymentStatus === 'PAID';
        const isCorporateCredit = order.payments.some((p) => p.method === 'CORPORATE_CREDIT') ||
            order.customerNotes?.toLowerCase().includes('net-30') ||
            order.customerNotes?.toLowerCase().includes('credit');
        const paymentCleared = isPaidInFull || isCorporateCredit;
        if (!paymentCleared) {
            if (order.paidAmount && Number(order.paidAmount) > 0) {
                reasons.push('PAYMENT_PARTIAL');
            }
            else {
                reasons.push('PAYMENT_PENDING');
            }
        }
        const hasJobCards = order.jobCards.length > 0;
        const productionComplete = !hasJobCards ||
            order.status === client_1.OrderStatus.PACKING ||
            order.status === client_1.OrderStatus.READY_FOR_DISPATCH ||
            order.jobCards.every((jc) => jc.status === client_1.JobCardStatus.PASSED ||
                jc.status === client_1.JobCardStatus.COMPLETED ||
                jc.status === client_1.JobCardStatus.QC_INSPECTION ||
                jc.currentStation === 'PACKING' ||
                jc.currentStation === 'FINAL_QC' ||
                jc.currentStation === 'FINISHING' ||
                jc.currentStation === 'DISPATCH');
        if (!productionComplete) {
            reasons.push('PRODUCTION_NOT_COMPLETE');
        }
        const noActiveHold = order.status !== client_1.OrderStatus.ON_HOLD;
        if (!noActiveHold) {
            reasons.push('ACTIVE_HOLD');
        }
        const isPaymentCleared = Boolean(paymentCleared);
        const isFinalQcPassed = Boolean(finalQcPassed);
        const isComplete = Boolean(productionComplete);
        const hasNoHold = Boolean(noActiveHold);
        const isEligible = Boolean(isFinalQcPassed && isPaymentCleared && isComplete && hasNoHold);
        return {
            eligible: isEligible,
            reasons,
            finalQcPassed: isFinalQcPassed,
            paymentCleared: isPaymentCleared,
            productionComplete: isComplete,
            noActiveHold: hasNoHold,
            balanceAmount: balance,
        };
    }
    async triggerPackingGate(orderId, actorId, sourceEvent = 'FINAL_QC_PASS') {
        return await this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: {
                    qcChecklists: { orderBy: { createdAt: 'desc' } },
                    payments: { orderBy: { createdAt: 'desc' } },
                    jobCards: true,
                },
            });
            if (!order) {
                throw new common_1.NotFoundException(`Order '${orderId}' not found`);
            }
            if (order.status === client_1.OrderStatus.PACKING ||
                order.status === client_1.OrderStatus.READY_FOR_DISPATCH ||
                order.status === client_1.OrderStatus.OUT_FOR_DELIVERY ||
                order.status === client_1.OrderStatus.DELIVERED) {
                const evalResult = await this.evaluatePackingEligibility(orderId, tx);
                return { transitioned: false, newStatus: order.status, evaluation: evalResult };
            }
            const evaluation = await this.evaluatePackingEligibility(orderId, tx);
            if (evaluation.eligible) {
                const fromStatus = order.status;
                const updated = await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: client_1.OrderStatus.PACKING,
                        customerStatus: workflow_1.CustomerVisibleStatus.QUALITY_CHECK_AND_PACKING,
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
                const reason = sourceEvent === 'FINAL_QC_PASS'
                    ? 'Final QC PASSED and Payment 100% Cleared. Automatically released directly to Packing Station.'
                    : 'Payment 100% Cleared. Final QC already passed -> Automatically released directly to Packing Station.';
                await tx.orderStatusHistory.create({
                    data: {
                        orderId: order.id,
                        fromStatus,
                        toStatus: client_1.OrderStatus.PACKING,
                        changedById: actorId,
                        reason,
                    },
                });
                await this.auditService.log({
                    actorId,
                    action: 'AUTO_RELEASED_TO_PACKING',
                    entity: 'Order',
                    entityId: order.id,
                    orderId: order.id,
                    previousState: { status: fromStatus },
                    newState: { status: client_1.OrderStatus.PACKING, triggerEvent: sourceEvent },
                    reason,
                });
                this.eventEmitter.emit('order.status.packing', {
                    orderId: order.id,
                    fromStatus,
                    toStatus: client_1.OrderStatus.PACKING,
                    actorId,
                    triggerEvent: sourceEvent,
                });
                return { transitioned: true, newStatus: client_1.OrderStatus.PACKING, evaluation };
            }
            else {
                if (evaluation.finalQcPassed && !evaluation.paymentCleared && order.status !== client_1.OrderStatus.ON_HOLD) {
                    if (order.status !== client_1.OrderStatus.PAYMENT_PENDING) {
                        const fromStatus = order.status;
                        await tx.order.update({
                            where: { id: order.id },
                            data: {
                                status: client_1.OrderStatus.PAYMENT_PENDING,
                                customerStatus: workflow_1.CustomerVisibleStatus.PAYMENT_PENDING,
                            },
                        });
                        await tx.orderStatusHistory.create({
                            data: {
                                orderId: order.id,
                                fromStatus,
                                toStatus: client_1.OrderStatus.PAYMENT_PENDING,
                                changedById: actorId,
                                reason: `Final QC PASSED. Outstanding Balance: ₹${evaluation.balanceAmount.toFixed(2)}. Blocked from Packing awaiting payment clearance.`,
                            },
                        });
                        await this.auditService.log({
                            actorId,
                            action: 'PAYMENT_GATE_BLOCKED',
                            entity: 'Order',
                            entityId: order.id,
                            orderId: order.id,
                            previousState: { status: fromStatus },
                            newState: { status: client_1.OrderStatus.PAYMENT_PENDING, balance: evaluation.balanceAmount },
                            reason: 'Packing blocked awaiting payment clearance',
                        });
                    }
                }
                return { transitioned: false, newStatus: order.status, evaluation };
            }
        });
    }
};
exports.WorkflowStateService = WorkflowStateService;
exports.WorkflowStateService = WorkflowStateService = WorkflowStateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        event_emitter_1.EventEmitter2])
], WorkflowStateService);
//# sourceMappingURL=workflow-state.service.js.map