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
var OperationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
const event_emitter_1 = require("@nestjs/event-emitter");
const job_card_engine_service_1 = require("../job-cards/job-card-engine.service");
const workflow_state_service_1 = require("../workflow/workflow-state.service");
const OE_STATUS_GROUPS = {
    NEW_UNASSIGNED: [client_1.OrderStatus.ORDER_CREATED, client_1.OrderStatus.PAYMENT_PENDING, client_1.OrderStatus.PAYMENT_CONFIRMED],
    REQUIREMENT_REVIEW: [client_1.OrderStatus.ORDER_REVIEW],
    DESIGN: [client_1.OrderStatus.ARTWORK_REVIEW, client_1.OrderStatus.DESIGN_REQUIRED, client_1.OrderStatus.ARTWORK_APPROVED, client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED],
    PRODUCTION: [client_1.OrderStatus.PRODUCTION_QUEUE, client_1.OrderStatus.PRINTING],
    FINISHING: [client_1.OrderStatus.FINISHING],
    FINAL_QC: [client_1.OrderStatus.QUALITY_CHECK],
    PACKING: [client_1.OrderStatus.PACKING],
    DISPATCH: [client_1.OrderStatus.READY_FOR_DISPATCH, client_1.OrderStatus.OUT_FOR_DELIVERY],
    COMPLETED: [client_1.OrderStatus.DELIVERED],
    HOLD: [client_1.OrderStatus.ON_HOLD, client_1.OrderStatus.CANCELLED],
};
let OperationsService = OperationsService_1 = class OperationsService {
    prisma;
    auditService;
    jobCardEngine;
    workflowState;
    eventEmitter;
    logger = new common_1.Logger(OperationsService_1.name);
    constructor(prisma, auditService, jobCardEngine, workflowState, eventEmitter) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.jobCardEngine = jobCardEngine;
        this.workflowState = workflowState;
        this.eventEmitter = eventEmitter;
    }
    async getDashboardMetrics() {
        const activeStatuses = [
            client_1.OrderStatus.ORDER_CREATED,
            client_1.OrderStatus.PAYMENT_PENDING,
            client_1.OrderStatus.PAYMENT_CONFIRMED,
            client_1.OrderStatus.ORDER_REVIEW,
            client_1.OrderStatus.ARTWORK_REVIEW,
            client_1.OrderStatus.DESIGN_REQUIRED,
            client_1.OrderStatus.ARTWORK_APPROVED,
            client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
            client_1.OrderStatus.PRODUCTION_QUEUE,
            client_1.OrderStatus.PRINTING,
            client_1.OrderStatus.FINISHING,
            client_1.OrderStatus.QUALITY_CHECK,
            client_1.OrderStatus.PACKING,
            client_1.OrderStatus.READY_FOR_DISPATCH,
            client_1.OrderStatus.OUT_FOR_DELIVERY,
            client_1.OrderStatus.ON_HOLD,
        ];
        const [totalActive, statusCounts, paymentBlockedCount, slaAtRisk, unassignedDesign, unassignedProduction, newIntakeCount,] = await Promise.all([
            this.prisma.order.count({ where: { status: { in: activeStatuses } } }),
            this.prisma.order.groupBy({
                by: ['status'],
                where: { status: { in: activeStatuses } },
                _count: { id: true },
            }),
            this.prisma.order.count({
                where: {
                    status: { in: [client_1.OrderStatus.QUALITY_CHECK, client_1.OrderStatus.PACKING] },
                    paymentStatus: { in: [client_1.PaymentStatus.PENDING, client_1.PaymentStatus.PARTIALLY_PAID] },
                },
            }),
            this.prisma.order.count({
                where: {
                    status: { in: activeStatuses },
                    slaStatus: { in: ['AT_RISK', 'DELAYED', 'BREACHED'] },
                },
            }),
            this.prisma.order.count({
                where: {
                    status: { in: [client_1.OrderStatus.ARTWORK_REVIEW, client_1.OrderStatus.DESIGN_REQUIRED] },
                    assignments: {
                        none: {
                            taskType: client_1.AssignmentTaskType.DESIGN,
                            status: client_1.AssignmentStatus.ACTIVE,
                        },
                    },
                },
            }),
            this.prisma.order.count({
                where: {
                    status: { in: [client_1.OrderStatus.PRODUCTION_QUEUE] },
                    assignments: {
                        none: {
                            taskType: client_1.AssignmentTaskType.PRODUCTION,
                            status: client_1.AssignmentStatus.ACTIVE,
                        },
                    },
                },
            }),
            this.prisma.order.count({
                where: {
                    status: {
                        in: [
                            client_1.OrderStatus.ORDER_CREATED,
                            client_1.OrderStatus.PAYMENT_PENDING,
                            client_1.OrderStatus.PAYMENT_CONFIRMED,
                            client_1.OrderStatus.ORDER_REVIEW,
                        ],
                    },
                    assignments: {
                        none: {
                            status: client_1.AssignmentStatus.ACTIVE,
                        },
                    },
                },
            }),
        ]);
        const countsMap = {};
        for (const row of statusCounts) {
            countsMap[row.status] = row._count.id;
        }
        return {
            totalActive,
            unassignedOrders: (newIntakeCount || 0) + (unassignedDesign || 0) + (unassignedProduction || 0),
            newIntakeOrders: newIntakeCount || 0,
            designPending: (countsMap[client_1.OrderStatus.ARTWORK_REVIEW] || 0) + (countsMap[client_1.OrderStatus.DESIGN_REQUIRED] || 0),
            productionPending: (countsMap[client_1.OrderStatus.PRODUCTION_QUEUE] || 0) + (countsMap[client_1.OrderStatus.PRINTING] || 0) + (countsMap[client_1.OrderStatus.FINISHING] || 0),
            qcPending: countsMap[client_1.OrderStatus.QUALITY_CHECK] || 0,
            paymentBlocked: paymentBlockedCount,
            packingReady: countsMap[client_1.OrderStatus.PACKING] || 0,
            dispatchReady: countsMap[client_1.OrderStatus.READY_FOR_DISPATCH] || 0,
            onHold: countsMap[client_1.OrderStatus.ON_HOLD] || 0,
            atRiskOverdue: slaAtRisk,
            unassignedDesign,
            unassignedProduction,
            statusBreakdown: countsMap,
        };
    }
    async listOperationalOrders(filters) {
        const page = Math.max(1, parseInt(filters.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(filters.limit || '20', 10)));
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.status) {
            const statusGroup = OE_STATUS_GROUPS[filters.status];
            if (statusGroup) {
                where.status = { in: statusGroup };
            }
            else if (Object.values(client_1.OrderStatus).includes(filters.status)) {
                where.status = filters.status;
            }
        }
        else {
            where.status = {
                notIn: [client_1.OrderStatus.DELIVERED, client_1.OrderStatus.CANCELLED],
            };
        }
        if (filters.priority && Object.values(client_1.Priority).includes(filters.priority)) {
            where.priority = filters.priority;
        }
        if (filters.slaStatus) {
            where.slaStatus = filters.slaStatus;
        }
        if (filters.paymentStatus) {
            where.paymentStatus = filters.paymentStatus;
        }
        if (filters.unassignedDesign === 'true') {
            where.status = { in: [client_1.OrderStatus.ARTWORK_REVIEW, client_1.OrderStatus.DESIGN_REQUIRED] };
            where.assignments = {
                none: {
                    taskType: client_1.AssignmentTaskType.DESIGN,
                    status: client_1.AssignmentStatus.ACTIVE,
                },
            };
        }
        if (filters.unassignedProduction === 'true') {
            where.status = { in: [client_1.OrderStatus.PRODUCTION_QUEUE] };
            where.assignments = {
                none: {
                    taskType: client_1.AssignmentTaskType.PRODUCTION,
                    status: client_1.AssignmentStatus.ACTIVE,
                },
            };
        }
        if (filters.newIntake === 'true') {
            where.status = {
                in: [
                    client_1.OrderStatus.ORDER_CREATED,
                    client_1.OrderStatus.PAYMENT_PENDING,
                    client_1.OrderStatus.PAYMENT_CONFIRMED,
                    client_1.OrderStatus.ORDER_REVIEW,
                ],
            };
            where.assignments = {
                none: {
                    status: client_1.AssignmentStatus.ACTIVE,
                },
            };
        }
        if (filters.blocked === 'true') {
            where.OR = [
                { status: client_1.OrderStatus.ON_HOLD },
                {
                    status: { in: [client_1.OrderStatus.QUALITY_CHECK, client_1.OrderStatus.PACKING] },
                    paymentStatus: { in: [client_1.PaymentStatus.PENDING, client_1.PaymentStatus.PARTIALLY_PAID] },
                },
            ];
        }
        if (filters.search) {
            const term = filters.search.trim();
            where.OR = [
                { orderNumber: { contains: term, mode: 'insensitive' } },
                { customer: { fullName: { contains: term, mode: 'insensitive' } } },
                { customer: { email: { contains: term, mode: 'insensitive' } } },
                { customer: { phone: { contains: term } } },
            ];
        }
        const orderBy = {};
        if (filters.sortBy === 'priority') {
            orderBy.priority = (filters.sortOrder || 'desc');
        }
        else if (filters.sortBy === 'dueAt') {
            orderBy.dueAt = (filters.sortOrder || 'asc');
        }
        else {
            orderBy.createdAt = 'desc';
        }
        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                select: {
                    id: true,
                    orderNumber: true,
                    status: true,
                    customerStatus: true,
                    priority: true,
                    slaStatus: true,
                    paymentStatus: true,
                    totalAmount: true,
                    paidAmount: true,
                    balanceAmount: true,
                    dueAt: true,
                    createdAt: true,
                    deliveryMethod: true,
                    customer: {
                        select: { id: true, fullName: true, email: true, phone: true, companyName: true },
                    },
                    items: {
                        select: {
                            id: true,
                            productName: true,
                            quantity: true,
                            specifications: true,
                            approvedArtworkVersionId: true,
                            artworkVersions: {
                                select: {
                                    id: true,
                                    status: true,
                                    isApproved: true,
                                    versionNumber: true,
                                    originalFileName: true,
                                    storageKey: true,
                                    proofUrl: true,
                                    fileSize: true,
                                    mimeType: true,
                                    widthPixels: true,
                                    heightPixels: true,
                                    qualityStatus: true,
                                },
                                orderBy: { versionNumber: 'desc' },
                                take: 1,
                            },
                        },
                    },
                    assignments: {
                        where: { status: client_1.AssignmentStatus.ACTIVE },
                        select: {
                            id: true,
                            taskType: true,
                            assignedUser: { select: { id: true, fullName: true, role: true } },
                            assignedAt: true,
                        },
                    },
                    jobCards: {
                        select: { id: true, jobNumber: true, status: true, operatorId: true, currentStation: true },
                        take: 1,
                    },
                    qcChecklists: {
                        select: { id: true, type: true, outcome: true },
                        orderBy: { createdAt: 'desc' },
                    },
                    packages: {
                        select: { id: true, status: true },
                    },
                },
            }),
            this.prisma.order.count({ where }),
        ]);
        const enrichedOrders = orders.map((order) => {
            const designAssignment = order.assignments.find((a) => a.taskType === client_1.AssignmentTaskType.DESIGN) || null;
            const productionAssignment = order.assignments.find((a) => a.taskType === client_1.AssignmentTaskType.PRODUCTION) || null;
            return {
                ...order,
                nextAction: this.getOperationalNextAction(order),
                blockers: this.getBlockers(order),
                designAssignment,
                productionAssignment,
                assignedDesigner: designAssignment?.assignedUser || null,
                assignedOperator: productionAssignment?.assignedUser || null,
            };
        });
        return {
            data: enrichedOrders,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async resolveOrderId(identifier) {
        if (!identifier)
            throw new common_1.NotFoundException('Order ID is required');
        const byId = await this.prisma.order.findUnique({
            where: { id: identifier },
            select: { id: true },
        });
        if (byId)
            return byId.id;
        const byOrderNumber = await this.prisma.order.findUnique({
            where: { orderNumber: identifier },
            select: { id: true },
        });
        if (byOrderNumber)
            return byOrderNumber.id;
        const suffix = identifier.replace(/^ord-ref-?/i, '').trim();
        if (suffix) {
            const bySuffix = await this.prisma.order.findFirst({
                where: {
                    orderNumber: {
                        contains: suffix,
                        mode: 'insensitive',
                    },
                },
                select: { id: true },
            });
            if (bySuffix)
                return bySuffix.id;
        }
        throw new common_1.NotFoundException(`Order ${identifier} not found`);
    }
    async getOperationalOrderDetail(orderId) {
        const resolvedOrderId = await this.resolveOrderId(orderId);
        const order = await this.prisma.order.findUnique({
            where: { id: resolvedOrderId },
            include: {
                customer: {
                    include: { addresses: true },
                },
                items: {
                    include: {
                        product: { select: { id: true, name: true, slug: true, sku: true } },
                        artworkVersions: {
                            orderBy: { versionNumber: 'desc' },
                        },
                        jobCards: {
                            include: {
                                machine: { select: { id: true, name: true, code: true, type: true } },
                                operator: { select: { id: true, fullName: true, role: true } },
                                issues: true,
                            },
                        },
                    },
                },
                assignments: {
                    include: {
                        assignedUser: { select: { id: true, fullName: true, email: true, role: true, department: true } },
                        assignedByUser: { select: { id: true, fullName: true, role: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                operationalNotes: {
                    orderBy: { createdAt: 'desc' },
                },
                payments: {
                    select: {
                        id: true,
                        transactionId: true,
                        method: true,
                        status: true,
                        amount: true,
                        capturedAt: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                invoices: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        grandTotal: true,
                        pdfUrl: true,
                        issuedAt: true,
                    },
                },
                packages: {
                    include: {
                        shipment: {
                            select: {
                                id: true,
                                shipmentNumber: true,
                                courierName: true,
                                awbNumber: true,
                                trackingUrl: true,
                                status: true,
                                dispatchedAt: true,
                                deliveredAt: true,
                            },
                        },
                    },
                },
                qcChecklists: {
                    include: {
                        inspector: { select: { id: true, fullName: true, role: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                statusHistory: {
                    include: {
                        changedBy: { select: { id: true, fullName: true, role: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                slaRecords: {
                    orderBy: { createdAt: 'desc' },
                },
                shippingAddress: true,
                billingAddress: true,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order ${orderId} not found`);
        }
        const activeDesignAssignment = order.assignments.find((a) => a.taskType === client_1.AssignmentTaskType.DESIGN && a.status === client_1.AssignmentStatus.ACTIVE);
        const activeProductionAssignment = order.assignments.find((a) => a.taskType === client_1.AssignmentTaskType.PRODUCTION && a.status === client_1.AssignmentStatus.ACTIVE);
        return {
            ...order,
            nextAction: this.getOperationalNextAction(order),
            blockers: this.getBlockers(order),
            activeDesignAssignment: activeDesignAssignment || null,
            activeProductionAssignment: activeProductionAssignment || null,
            assignmentHistory: order.assignments,
        };
    }
    async assignDesigner(orderId, dto, user) {
        if (user.role !== client_1.UserRole.OPERATIONAL_MANAGER &&
            user.role !== client_1.UserRole.ADMIN_MANAGER &&
            user.role !== client_1.UserRole.PRODUCTION_OPERATOR) {
            throw new common_1.ForbiddenException('Only Operational Managers, Administrators, or Production Operators can assign designers');
        }
        const resolvedOrderId = await this.resolveOrderId(orderId);
        const order = await this.prisma.order.findUnique({
            where: { id: resolvedOrderId },
            include: {
                items: { select: { id: true, productName: true } },
                assignments: {
                    where: { status: client_1.AssignmentStatus.ACTIVE },
                },
            },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order ${orderId} not found`);
        if (order.status === client_1.OrderStatus.DELIVERED || order.status === client_1.OrderStatus.CANCELLED) {
            throw new common_1.BadRequestException('Cannot assign designer to completed or cancelled order');
        }
        if (order.status === client_1.OrderStatus.ON_HOLD) {
            throw new common_1.BadRequestException('Cannot assign designer while order is ON HOLD');
        }
        const postApprovalProductionStatuses = [
            client_1.OrderStatus.PRINTING,
            client_1.OrderStatus.FINISHING,
            client_1.OrderStatus.QUALITY_CHECK,
            client_1.OrderStatus.PACKING,
            client_1.OrderStatus.READY_FOR_DISPATCH,
            client_1.OrderStatus.OUT_FOR_DELIVERY,
        ];
        if (postApprovalProductionStatuses.includes(order.status)) {
            throw new common_1.BadRequestException(`Cannot assign designer: Order is currently in ${order.status}. Send order to rework/hold before reassigning design.`);
        }
        const targetUserId = dto.designerUserId || dto.designerId;
        if (!targetUserId)
            throw new common_1.BadRequestException('Designer user ID is required');
        const designer = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!designer)
            throw new common_1.NotFoundException('Designer user not found');
        if (!designer.isActive)
            throw new common_1.BadRequestException('Designer user is not active');
        if (designer.role !== client_1.UserRole.DESIGNER_PREPRESS) {
            throw new common_1.BadRequestException(`User ${designer.fullName} does not have DESIGNER_PREPRESS role`);
        }
        const previousAssignment = order.assignments.find((a) => a.taskType === client_1.AssignmentTaskType.DESIGN) || null;
        const newAssignment = await this.prisma.$transaction(async (tx) => {
            await tx.orderAssignment.updateMany({
                where: {
                    orderId: order.id,
                    taskType: client_1.AssignmentTaskType.DESIGN,
                    status: client_1.AssignmentStatus.ACTIVE,
                },
                data: {
                    status: client_1.AssignmentStatus.REASSIGNED,
                    reason: dto.reason || 'Reassigned to another designer by OE',
                },
            });
            await tx.orderAssignment.updateMany({
                where: {
                    orderId: order.id,
                    taskType: client_1.AssignmentTaskType.PRODUCTION,
                    status: client_1.AssignmentStatus.ACTIVE,
                },
                data: {
                    status: client_1.AssignmentStatus.REASSIGNED,
                    reason: 'Cancelled production assignment in favor of design step by OE',
                },
            });
            const createdAssignment = await tx.orderAssignment.create({
                data: {
                    orderId: order.id,
                    taskType: client_1.AssignmentTaskType.DESIGN,
                    assignedUserId: targetUserId,
                    assignedByUserId: user.sub,
                    status: client_1.AssignmentStatus.ACTIVE,
                    reason: dto.reason,
                },
                include: {
                    assignedUser: { select: { id: true, fullName: true, email: true, role: true } },
                    assignedByUser: { select: { id: true, fullName: true, role: true } },
                },
            });
            const intakeStatuses = [
                client_1.OrderStatus.ORDER_CREATED,
                client_1.OrderStatus.PAYMENT_PENDING,
                client_1.OrderStatus.PAYMENT_CONFIRMED,
                client_1.OrderStatus.ORDER_REVIEW,
                client_1.OrderStatus.ARTWORK_REVIEW,
            ];
            if (intakeStatuses.includes(order.status)) {
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: client_1.OrderStatus.DESIGN_REQUIRED,
                        customerStatus: 'DESIGN_IN_PROGRESS',
                    },
                });
                await tx.orderStatusHistory.create({
                    data: {
                        orderId: order.id,
                        fromStatus: order.status,
                        toStatus: client_1.OrderStatus.DESIGN_REQUIRED,
                        changedById: user.sub,
                        reason: `Assigned to Designer ${designer.fullName} by OE`,
                        notes: dto.reason,
                    },
                });
            }
            return createdAssignment;
        });
        await this.auditService.log({
            actorId: user.sub,
            action: 'DESIGN_ASSIGNED',
            entity: 'OrderAssignment',
            entityId: newAssignment.id,
            previousState: previousAssignment
                ? { assignedUserId: previousAssignment.assignedUserId }
                : undefined,
            newState: { assignedUserId: targetUserId, designerName: designer.fullName },
            reason: dto.reason,
            orderId: order.id,
        });
        this.eventEmitter.emit('oe.designer.assigned', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            designerId: targetUserId,
            designerName: designer.fullName,
            assignedBy: user.email,
        });
        this.logger.log(`${previousAssignment ? 'Reassigned' : 'Assigned'} designer ${designer.fullName} to order ${order.orderNumber} by ${user.email}`);
        return newAssignment;
    }
    async assignProductionOperator(orderId, dto, user) {
        if (user.role !== client_1.UserRole.OPERATIONAL_MANAGER &&
            user.role !== client_1.UserRole.ADMIN_MANAGER &&
            user.role !== client_1.UserRole.PRODUCTION_OPERATOR) {
            throw new common_1.ForbiddenException('Only Operational Managers, Administrators, or Production Operators can assign production operators');
        }
        const resolvedOrderId = await this.resolveOrderId(orderId);
        const order = await this.prisma.order.findUnique({
            where: { id: resolvedOrderId },
            include: {
                items: {
                    include: {
                        artworkVersions: { orderBy: { versionNumber: 'desc' } },
                        jobCards: true,
                    },
                },
                assignments: {
                    where: { status: client_1.AssignmentStatus.ACTIVE },
                },
                jobCards: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order ${orderId} not found`);
        if (order.status === client_1.OrderStatus.DELIVERED || order.status === client_1.OrderStatus.CANCELLED) {
            throw new common_1.BadRequestException('Cannot assign operator to completed or cancelled order');
        }
        if (order.status === client_1.OrderStatus.ON_HOLD) {
            throw new common_1.BadRequestException('Cannot assign operator while order is ON HOLD');
        }
        const primaryItem = order.items?.[0];
        let latestArtwork = null;
        let isArtworkApproved = false;
        if (primaryItem) {
            latestArtwork = primaryItem.artworkVersions?.find((v) => v.isApproved) || primaryItem.artworkVersions?.[0] || null;
            if (primaryItem.approvedArtworkVersionId) {
                const explicitApproved = primaryItem.artworkVersions?.find((v) => v.id === primaryItem.approvedArtworkVersionId);
                if (explicitApproved)
                    latestArtwork = explicitApproved;
            }
            isArtworkApproved = Boolean(latestArtwork?.isApproved ||
                primaryItem.approvedArtworkVersionId ||
                order.status === client_1.OrderStatus.ARTWORK_APPROVED ||
                order.status === client_1.OrderStatus.PRODUCTION_QUEUE ||
                order.status === client_1.OrderStatus.PRINTING);
        }
        else {
            isArtworkApproved = (order.status !== client_1.OrderStatus.DESIGN_REQUIRED &&
                order.status !== client_1.OrderStatus.ARTWORK_REVIEW &&
                order.status !== client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED);
        }
        const requiresDesignFirst = order.status === client_1.OrderStatus.DESIGN_REQUIRED ||
            order.status === client_1.OrderStatus.ARTWORK_REVIEW ||
            order.status === client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED;
        if (requiresDesignFirst && !isArtworkApproved) {
            throw new common_1.BadRequestException(`Cannot assign production operator: Artwork is still pending approval (${order.status}). Prepress design must be completed and approved before production assignment.`);
        }
        const targetUserId = dto.operatorUserId || dto.operatorId;
        if (!targetUserId)
            throw new common_1.BadRequestException('Operator user ID is required');
        const operator = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!operator)
            throw new common_1.NotFoundException('Production operator not found');
        if (!operator.isActive)
            throw new common_1.BadRequestException('Operator is not active');
        if (operator.role !== client_1.UserRole.PRODUCTION_OPERATOR) {
            throw new common_1.BadRequestException(`User ${operator.fullName} does not have PRODUCTION_OPERATOR role`);
        }
        const specs = primaryItem?.specifications || {};
        const sizeValidation = primaryItem
            ? this.validateArtworkSize(specs, latestArtwork)
            : { status: 'PASS', isMatch: true, expectedDisplay: 'Standard', actualDisplay: 'Standard' };
        let wasOverridden = false;
        if (sizeValidation.status === 'MISMATCH') {
            if (!dto.managerOverrideReason || dto.managerOverrideReason.trim().length < 5) {
                throw new common_1.BadRequestException(`SIZE MISMATCH: Expected ${sizeValidation.expectedDisplay}, but actual artwork is ${sizeValidation.actualDisplay}. Operator assignment blocked. An authorized manager override with justification is required.`);
            }
            wasOverridden = true;
        }
        const previousAssignment = order.assignments.find((a) => a.taskType === client_1.AssignmentTaskType.PRODUCTION) || null;
        const newAssignment = await this.prisma.$transaction(async (tx) => {
            await tx.orderAssignment.updateMany({
                where: {
                    orderId: order.id,
                    taskType: client_1.AssignmentTaskType.PRODUCTION,
                    status: client_1.AssignmentStatus.ACTIVE,
                },
                data: {
                    status: client_1.AssignmentStatus.REASSIGNED,
                    reason: dto.reason || 'Reassigned to another operator by OE',
                },
            });
            await tx.orderAssignment.updateMany({
                where: {
                    orderId: order.id,
                    taskType: client_1.AssignmentTaskType.DESIGN,
                    status: client_1.AssignmentStatus.ACTIVE,
                },
                data: {
                    status: isArtworkApproved ? client_1.AssignmentStatus.COMPLETED : client_1.AssignmentStatus.CANCELLED,
                    completedAt: new Date(),
                    reason: 'Completed prior to production operator assignment',
                },
            });
            const createdAssignment = await tx.orderAssignment.create({
                data: {
                    orderId: order.id,
                    taskType: client_1.AssignmentTaskType.PRODUCTION,
                    assignedUserId: targetUserId,
                    assignedByUserId: user.sub,
                    status: client_1.AssignmentStatus.ACTIVE,
                    reason: dto.reason,
                },
                include: {
                    assignedUser: { select: { id: true, fullName: true, email: true, role: true } },
                    assignedByUser: { select: { id: true, fullName: true, role: true } },
                },
            });
            if (order.jobCards && order.jobCards.length > 0) {
                for (const jc of order.jobCards) {
                    await tx.jobCard.update({
                        where: { id: jc.id },
                        data: { operatorId: targetUserId },
                    });
                }
            }
            else {
                await tx.jobCard.updateMany({
                    where: { orderId: order.id },
                    data: { operatorId: targetUserId },
                });
            }
            const preProdStatuses = [
                client_1.OrderStatus.ORDER_CREATED,
                client_1.OrderStatus.PAYMENT_CONFIRMED,
                client_1.OrderStatus.ORDER_REVIEW,
                client_1.OrderStatus.ARTWORK_APPROVED,
            ];
            if (preProdStatuses.includes(order.status)) {
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: client_1.OrderStatus.PRODUCTION_QUEUE,
                        customerStatus: 'PREPARING_ORDER',
                    },
                });
                await tx.orderStatusHistory.create({
                    data: {
                        orderId: order.id,
                        fromStatus: order.status,
                        toStatus: client_1.OrderStatus.PRODUCTION_QUEUE,
                        changedById: user.sub,
                        reason: wasOverridden
                            ? `OE Assigned Production Operator ${operator.fullName} with Size Override: ${dto.managerOverrideReason}`
                            : `OE Assigned Production Operator ${operator.fullName}. Released to Production Queue.`,
                        notes: dto.reason,
                    },
                });
            }
            return createdAssignment;
        });
        if (order.items && order.items.length > 0) {
            for (const orderItem of order.items) {
                try {
                    await this.jobCardEngine.generateJobCardForOrderItem(orderItem.id, user.sub);
                }
                catch (err) {
                    this.logger.warn(`JobCard check/generation for item ${orderItem.id}: ${err.message}`);
                }
            }
        }
        await this.prisma.jobCard.updateMany({
            where: { orderId: order.id, operatorId: null },
            data: { operatorId: targetUserId },
        });
        await this.auditService.log({
            actorId: user.sub,
            action: 'PRODUCTION_OPERATOR_ASSIGNED',
            entity: 'OrderAssignment',
            entityId: newAssignment.id,
            previousState: previousAssignment
                ? { assignedUserId: previousAssignment.assignedUserId }
                : undefined,
            newState: { assignedUserId: targetUserId, operatorName: operator.fullName, sizeOverride: wasOverridden },
            reason: dto.reason,
            orderId: order.id,
        });
        this.eventEmitter.emit('oe.operator.assigned', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            operatorId: targetUserId,
            operatorName: operator.fullName,
            assignedBy: user.email,
        });
        this.logger.log(`${previousAssignment ? 'Reassigned' : 'Assigned'} production operator ${operator.fullName} to order ${order.orderNumber} by ${user.email}`);
        return newAssignment;
    }
    async addOperationalNote(orderId, dto, user) {
        const resolvedOrderId = await this.resolveOrderId(orderId);
        const order = await this.prisma.order.findUnique({ where: { id: resolvedOrderId }, select: { id: true } });
        if (!order)
            throw new common_1.NotFoundException(`Order ${orderId} not found`);
        if (!dto.content || dto.content.trim().length === 0) {
            throw new common_1.BadRequestException('Note content cannot be empty');
        }
        const note = await this.prisma.operationalNote.create({
            data: {
                orderId: resolvedOrderId,
                authorId: user.sub,
                authorName: user.email,
                authorRole: user.role,
                content: dto.content.trim(),
            },
        });
        await this.auditService.log({
            actorId: user.sub,
            action: 'OPERATIONAL_NOTE_CREATED',
            entity: 'OperationalNote',
            entityId: note.id,
            newState: { content: dto.content.trim().substring(0, 200) },
            orderId: resolvedOrderId,
        });
        return note;
    }
    async updateOrderPriority(orderId, dto, user) {
        if (user.role !== client_1.UserRole.OPERATIONAL_MANAGER &&
            user.role !== client_1.UserRole.ADMIN_MANAGER &&
            user.role !== client_1.UserRole.PRODUCTION_OPERATOR) {
            throw new common_1.ForbiddenException('Only Operational Managers, Administrators, or Production Operators can update order priority');
        }
        if (!dto.reason || dto.reason.trim().length < 5) {
            throw new common_1.BadRequestException('Priority change reason must be at least 5 characters');
        }
        const resolvedOrderId = await this.resolveOrderId(orderId);
        const order = await this.prisma.order.findUnique({
            where: { id: resolvedOrderId },
            select: { id: true, priority: true, orderNumber: true },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order ${orderId} not found`);
        const previousPriority = order.priority;
        const updated = await this.prisma.order.update({
            where: { id: resolvedOrderId },
            data: { priority: dto.priority },
            select: { id: true, orderNumber: true, priority: true },
        });
        await this.auditService.log({
            actorId: user.sub,
            action: 'ORDER_PRIORITY_CHANGED',
            entity: 'Order',
            entityId: resolvedOrderId,
            previousState: { priority: previousPriority },
            newState: { priority: dto.priority },
            reason: dto.reason.trim(),
            orderId: resolvedOrderId,
        });
        return updated;
    }
    async getEligibleDesigners() {
        const designers = await this.prisma.user.findMany({
            where: { role: client_1.UserRole.DESIGNER_PREPRESS, isActive: true },
            select: {
                id: true,
                fullName: true,
                email: true,
                department: true,
                isActive: true,
                assignedTasks: {
                    where: { taskType: client_1.AssignmentTaskType.DESIGN, status: client_1.AssignmentStatus.ACTIVE },
                    select: { id: true },
                },
            },
        });
        return designers.map((d) => ({
            id: d.id,
            fullName: d.fullName,
            email: d.email,
            department: d.department,
            isActive: d.isActive,
            activeAssignments: d.assignedTasks.length,
        }));
    }
    async getEligibleProductionOperators() {
        const operators = await this.prisma.user.findMany({
            where: { role: client_1.UserRole.PRODUCTION_OPERATOR, isActive: true },
            select: {
                id: true,
                fullName: true,
                email: true,
                department: true,
                isActive: true,
                assignedJobs: {
                    where: { status: { in: ['QUEUED', 'ASSIGNED', 'PRINTING', 'FINISHING'] } },
                    select: { id: true },
                },
                assignedTasks: {
                    where: { taskType: client_1.AssignmentTaskType.PRODUCTION, status: client_1.AssignmentStatus.ACTIVE },
                    select: { id: true },
                },
            },
        });
        return operators.map((o) => ({
            id: o.id,
            fullName: o.fullName,
            email: o.email,
            department: o.department,
            isActive: o.isActive,
            activeJobCards: o.assignedJobs.length,
            activeAssignments: o.assignedTasks.length,
        }));
    }
    getOperationalNextAction(order) {
        const status = order.status;
        const hasActiveDesigner = order.assignments?.some((a) => a.taskType === 'DESIGN' && a.status === 'ACTIVE');
        const hasActiveOperator = order.assignments?.some((a) => a.taskType === 'PRODUCTION' && a.status === 'ACTIVE');
        const finalQCPassed = order.qcChecklists?.some((qc) => qc.type === 'FINAL_QC' && qc.outcome === 'PASS');
        switch (status) {
            case client_1.OrderStatus.ORDER_CREATED:
            case client_1.OrderStatus.PAYMENT_PENDING:
            case client_1.OrderStatus.PAYMENT_CONFIRMED:
            case client_1.OrderStatus.ORDER_REVIEW:
                return hasActiveDesigner ? 'WAITING_FOR_DESIGN' : (hasActiveOperator ? 'PRODUCTION_IN_PROGRESS' : 'ORDER_REVIEW');
            case client_1.OrderStatus.ARTWORK_REVIEW:
            case client_1.OrderStatus.DESIGN_REQUIRED:
                return hasActiveDesigner ? 'WAITING_FOR_DESIGN' : 'ASSIGN_DESIGNER';
            case client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED:
                return 'CUSTOMER_APPROVAL_REQUIRED';
            case client_1.OrderStatus.ARTWORK_APPROVED:
                return hasActiveOperator ? 'PRODUCTION_IN_PROGRESS' : 'ASSIGN_PRODUCTION_OPERATOR';
            case client_1.OrderStatus.PRODUCTION_QUEUE:
                return hasActiveOperator ? 'PRODUCTION_IN_PROGRESS' : 'ASSIGN_PRODUCTION_OPERATOR';
            case client_1.OrderStatus.PRINTING:
                return 'PRODUCTION_IN_PROGRESS';
            case client_1.OrderStatus.FINISHING:
                return 'FINISHING_IN_PROGRESS';
            case client_1.OrderStatus.QUALITY_CHECK:
                return 'FINAL_QC_PENDING';
            case client_1.OrderStatus.PACKING:
                if (order.paymentStatus !== client_1.PaymentStatus.PAID) {
                    return 'PAYMENT_CLEARANCE_REQUIRED';
                }
                return 'PACKING_IN_PROGRESS';
            case client_1.OrderStatus.READY_FOR_DISPATCH:
                return 'READY_FOR_DISPATCH';
            case client_1.OrderStatus.OUT_FOR_DELIVERY:
                return 'OUT_FOR_DELIVERY';
            case client_1.OrderStatus.DELIVERED:
                return 'COMPLETED';
            case client_1.OrderStatus.ON_HOLD:
                return 'ON_HOLD';
            case client_1.OrderStatus.CANCELLED:
                return 'CANCELLED';
            default:
                return 'ORDER_REVIEW';
        }
    }
    getBlockers(order) {
        const blockers = [];
        if ((order.status === client_1.OrderStatus.ARTWORK_REVIEW || order.status === client_1.OrderStatus.DESIGN_REQUIRED) &&
            order.items?.every((item) => !item.artworkVersions?.length)) {
            blockers.push({ type: 'ARTWORK_MISSING', label: 'Artwork Not Uploaded', severity: 'CRITICAL' });
        }
        if ((order.status === client_1.OrderStatus.ARTWORK_REVIEW || order.status === client_1.OrderStatus.DESIGN_REQUIRED) &&
            !order.assignments?.some((a) => a.taskType === 'DESIGN' && a.status === 'ACTIVE')) {
            blockers.push({ type: 'DESIGNER_NOT_ASSIGNED', label: 'Designer Not Assigned', severity: 'WARNING' });
        }
        if (order.status === client_1.OrderStatus.PRODUCTION_QUEUE &&
            !order.assignments?.some((a) => a.taskType === 'PRODUCTION' && a.status === 'ACTIVE')) {
            blockers.push({ type: 'PRODUCTION_NOT_ASSIGNED', label: 'Production Operator Not Assigned', severity: 'WARNING' });
        }
        if ((order.status === client_1.OrderStatus.QUALITY_CHECK || order.status === client_1.OrderStatus.PACKING) &&
            order.paymentStatus !== client_1.PaymentStatus.PAID) {
            blockers.push({ type: 'PAYMENT_PENDING', label: 'Payment Clearance Required', severity: 'CRITICAL' });
        }
        if (order.qcChecklists?.some((qc) => qc.type === 'FINAL_QC' && qc.outcome === 'FAIL')) {
            blockers.push({ type: 'FINAL_QC_FAILED', label: 'Final QC Failed — Rework Required', severity: 'CRITICAL' });
        }
        if (order.status === client_1.OrderStatus.ON_HOLD) {
            blockers.push({ type: 'ON_HOLD', label: 'Order on Hold', severity: 'CRITICAL' });
        }
        return blockers;
    }
    async getOrderTimeline(orderId) {
        const resolvedOrderId = await this.resolveOrderId(orderId);
        const [statusHistory, auditLogs, assignments, notes] = await Promise.all([
            this.prisma.orderStatusHistory.findMany({
                where: { orderId: resolvedOrderId },
                include: { changedBy: { select: { id: true, fullName: true, role: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.auditLog.findMany({
                where: { orderId: resolvedOrderId },
                include: { actor: { select: { id: true, fullName: true, role: true } } },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            this.prisma.orderAssignment.findMany({
                where: { orderId: resolvedOrderId },
                include: {
                    assignedUser: { select: { id: true, fullName: true, role: true } },
                    assignedByUser: { select: { id: true, fullName: true, role: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.operationalNote.findMany({
                where: { orderId: resolvedOrderId },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return { statusHistory, auditLogs, assignments, notes };
    }
    parseDimensions(input) {
        if (!input)
            return null;
        if (typeof input === 'object') {
            if (input.widthMm && input.heightMm) {
                return {
                    widthMm: Number(input.widthMm),
                    heightMm: Number(input.heightMm),
                    rawText: `${input.widthMm} × ${input.heightMm} mm`,
                };
            }
            if (input.width && input.height) {
                const unit = (input.unit || 'mm').toLowerCase();
                let w = Number(input.width);
                let h = Number(input.height);
                if (unit === 'in' || unit === 'inch' || unit === 'inches') {
                    w *= 25.4;
                    h *= 25.4;
                }
                else if (unit === 'cm') {
                    w *= 10;
                    h *= 10;
                }
                return {
                    widthMm: Math.round(w * 10) / 10,
                    heightMm: Math.round(h * 10) / 10,
                    rawText: `${input.width} × ${input.height} ${unit}`,
                };
            }
            if (input.size) {
                return this.parseDimensions(input.size);
            }
            if (input.dimensions) {
                return this.parseDimensions(input.dimensions);
            }
        }
        if (typeof input === 'string') {
            const text = input.trim();
            const lower = text.toLowerCase();
            if (lower.includes('a3'))
                return { widthMm: 297, heightMm: 420, rawText: text };
            if (lower.includes('a4'))
                return { widthMm: 210, heightMm: 297, rawText: text };
            if (lower.includes('a5'))
                return { widthMm: 148, heightMm: 210, rawText: text };
            if (lower.includes('a6'))
                return { widthMm: 105, heightMm: 148, rawText: text };
            if (lower.includes('business card') || lower.includes('visiting card')) {
                return { widthMm: 89, heightMm: 51, rawText: text };
            }
            if (lower.includes('letter'))
                return { widthMm: 215.9, heightMm: 279.4, rawText: text };
            const match = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:mm|cm|in|inch|inches|px)?\s*[x×*]\s*([0-9]+(?:\.[0-9]+)?)\s*(mm|cm|in|inch|inches|px)?/i);
            if (match) {
                let w = parseFloat(match[1]);
                let h = parseFloat(match[2]);
                const unit = (match[3] || 'mm').toLowerCase();
                if (unit.startsWith('in')) {
                    w *= 25.4;
                    h *= 25.4;
                }
                else if (unit === 'cm') {
                    w *= 10;
                    h *= 10;
                }
                else if (unit === 'px') {
                    w = (w / 300) * 25.4;
                    h = (h / 300) * 25.4;
                }
                return {
                    widthMm: Math.round(w * 10) / 10,
                    heightMm: Math.round(h * 10) / 10,
                    rawText: text,
                };
            }
        }
        return null;
    }
    validateArtworkSize(expectedSpecs, artwork) {
        const expected = this.parseDimensions(expectedSpecs);
        if (!expected) {
            return {
                status: 'NOT_APPLICABLE',
                isValid: true,
                expectedWidthMm: null,
                expectedHeightMm: null,
                actualWidthMm: null,
                actualHeightMm: null,
                expectedDisplay: 'Standard Configuration',
                actualDisplay: 'N/A',
                toleranceMm: 1.5,
                orientationMatch: true,
                details: 'No specific size dimension configured in order specifications.',
            };
        }
        if (!artwork) {
            return {
                status: 'NO_ARTWORK',
                isValid: false,
                expectedWidthMm: expected.widthMm,
                expectedHeightMm: expected.heightMm,
                actualWidthMm: null,
                actualHeightMm: null,
                expectedDisplay: `${expected.widthMm} × ${expected.heightMm} mm`,
                actualDisplay: 'Artwork missing',
                toleranceMm: 1.5,
                orientationMatch: false,
                details: 'Approved production artwork file is not yet available.',
            };
        }
        let actualWidthMm = artwork.widthMm ? Number(artwork.widthMm) : null;
        let actualHeightMm = artwork.heightMm ? Number(artwork.heightMm) : null;
        if ((!actualWidthMm || !actualHeightMm) && artwork.width && artwork.height) {
            const dpi = artwork.resolutionDpi || 300;
            actualWidthMm = Math.round(((artwork.width / dpi) * 25.4) * 10) / 10;
            actualHeightMm = Math.round(((artwork.height / dpi) * 25.4) * 10) / 10;
        }
        if (!actualWidthMm || !actualHeightMm) {
            const parsedFromArt = this.parseDimensions(artwork.originalFileName || artwork.customerNotes);
            if (parsedFromArt) {
                actualWidthMm = parsedFromArt.widthMm;
                actualHeightMm = parsedFromArt.heightMm;
            }
        }
        if (!actualWidthMm || !actualHeightMm) {
            return {
                status: 'PASS',
                isValid: true,
                expectedWidthMm: expected.widthMm,
                expectedHeightMm: expected.heightMm,
                actualWidthMm: null,
                actualHeightMm: null,
                expectedDisplay: `${expected.widthMm} × ${expected.heightMm} mm`,
                actualDisplay: 'Valid format',
                toleranceMm: 1.5,
                orientationMatch: true,
                details: 'Artwork format verified; dimensions conform to required aspect ratio.',
            };
        }
        const tolerance = 1.5;
        const directMatch = Math.abs(expected.widthMm - actualWidthMm) <= tolerance &&
            Math.abs(expected.heightMm - actualHeightMm) <= tolerance;
        const rotatedMatch = Math.abs(expected.widthMm - actualHeightMm) <= tolerance &&
            Math.abs(expected.heightMm - actualWidthMm) <= tolerance;
        const isValid = directMatch || rotatedMatch;
        const status = isValid ? 'PASS' : 'MISMATCH';
        return {
            status,
            isValid,
            expectedWidthMm: expected.widthMm,
            expectedHeightMm: expected.heightMm,
            actualWidthMm,
            actualHeightMm,
            expectedDisplay: `${expected.widthMm} × ${expected.heightMm} mm`,
            actualDisplay: `${actualWidthMm} × ${actualHeightMm} mm`,
            toleranceMm: tolerance,
            orientationMatch: isValid,
            details: isValid
                ? 'SIZE VALID: Artwork dimensions match production configuration.'
                : `SIZE MISMATCH: Expected ${expected.widthMm} × ${expected.heightMm} mm, but actual artwork is ${actualWidthMm} × ${actualHeightMm} mm.`,
        };
    }
    async getOrderReadiness(orderId) {
        const resolvedOrderId = await this.resolveOrderId(orderId);
        const order = await this.prisma.order.findUnique({
            where: { id: resolvedOrderId },
            include: {
                items: {
                    include: {
                        artworkVersions: { orderBy: { versionNumber: 'desc' } },
                        jobCards: true,
                    },
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order ${orderId} not found`);
        }
        const item = order.items[0];
        const specs = item?.specifications || {};
        let latestArtwork = item?.artworkVersions?.find((v) => v.isApproved) || item?.artworkVersions?.[0] || null;
        if (item?.approvedArtworkVersionId) {
            const explicitApproved = item.artworkVersions?.find((v) => v.id === item.approvedArtworkVersionId);
            if (explicitApproved)
                latestArtwork = explicitApproved;
        }
        const sizeValidation = this.validateArtworkSize(specs, latestArtwork);
        const isApproved = Boolean(latestArtwork?.isApproved ||
            item?.approvedArtworkVersionId ||
            order.status === client_1.OrderStatus.ARTWORK_APPROVED ||
            order.status === client_1.OrderStatus.PRODUCTION_QUEUE);
        const requiresCustomerApproval = specs.workflowRoute === 'DESIGN_SERVICE' ||
            specs.artworkSource === 'DESIGN_TEAM' ||
            order.status === client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED;
        const approvalStatus = isApproved
            ? 'APPROVED'
            : requiresCustomerApproval
                ? 'PENDING'
                : 'NOT_REQUIRED';
        const blockers = [];
        if (order.status === client_1.OrderStatus.ON_HOLD)
            blockers.push('Order is currently ON_HOLD.');
        if (!latestArtwork)
            blockers.push('No artwork file uploaded or approved.');
        if (sizeValidation.status === 'MISMATCH') {
            blockers.push(`Size Mismatch: Expected ${sizeValidation.expectedDisplay}, Actual ${sizeValidation.actualDisplay}.`);
        }
        if (approvalStatus === 'PENDING')
            blockers.push('Customer proof approval is pending.');
        if (order.status === client_1.OrderStatus.DELIVERED || order.status === client_1.OrderStatus.CANCELLED) {
            blockers.push(`Order is already ${order.status}.`);
        }
        const isEligibleForRelease = blockers.length === 0;
        return {
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            isEligibleForRelease,
            blockers,
            customerApproval: {
                status: approvalStatus,
                isApproved,
                approvedAt: latestArtwork?.approvedAt,
                approvedVersionNumber: latestArtwork?.versionNumber,
            },
            artwork: latestArtwork
                ? {
                    id: latestArtwork.id,
                    versionNumber: latestArtwork.versionNumber,
                    originalFileName: latestArtwork.originalFileName,
                    proofUrl: latestArtwork.proofUrl || undefined,
                    storageKey: latestArtwork.storageKey,
                    isApproved: Boolean(latestArtwork.isApproved),
                }
                : null,
            sizeValidation,
            productionSpecs: {
                productName: item?.productName || 'Custom Print Job',
                quantity: item?.quantity || 1,
                printSide: specs.printSide || specs.sides || '4+4 (Both Sides)',
                paper: specs.paper || specs.substrate || '350 GSM Art Card',
                gsm: specs.gsm || '350 GSM',
                lamination: specs.lamination || 'Matte Thermal',
                specialFinishing: specs.specialFinishing || specs.finishing || 'None',
                orientation: specs.orientation || 'Portrait',
                customerNotes: order.customerNotes || specs.customerNotes || undefined,
                productionNotes: item?.designNotes || specs.productionNotes || undefined,
            },
            activeHold: order.status === client_1.OrderStatus.ON_HOLD,
        };
    }
    async releaseToProduction(orderId, dto, user) {
        if (user.role !== client_1.UserRole.OPERATIONAL_MANAGER &&
            user.role !== client_1.UserRole.ADMIN_MANAGER &&
            user.role !== client_1.UserRole.PRODUCTION_OPERATOR) {
            throw new common_1.ForbiddenException('Only Operational Managers, Administrators, or Production Operators can release orders to production.');
        }
        const resolvedOrderId = await this.resolveOrderId(orderId);
        const order = await this.prisma.order.findUnique({
            where: { id: resolvedOrderId },
            include: {
                items: {
                    include: {
                        artworkVersions: { orderBy: { versionNumber: 'desc' } },
                        jobCards: true,
                    },
                },
                customer: true,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order ${orderId} not found`);
        }
        if (order.status === client_1.OrderStatus.ON_HOLD) {
            throw new common_1.BadRequestException('Cannot release order to production: Order is on HOLD.');
        }
        if (order.status === client_1.OrderStatus.DELIVERED || order.status === client_1.OrderStatus.CANCELLED) {
            throw new common_1.BadRequestException(`Cannot release order in ${order.status} state.`);
        }
        const item = order.items[0];
        if (!item) {
            throw new common_1.BadRequestException('Order contains no line items.');
        }
        const specs = item.specifications || {};
        let latestArtwork = item.artworkVersions?.find((v) => v.isApproved) || item.artworkVersions?.[0] || null;
        if (item.approvedArtworkVersionId) {
            const explicitApproved = item.artworkVersions?.find((v) => v.id === item.approvedArtworkVersionId);
            if (explicitApproved)
                latestArtwork = explicitApproved;
        }
        const sizeValidation = this.validateArtworkSize(specs, latestArtwork);
        let wasOverridden = false;
        if (sizeValidation.status === 'MISMATCH') {
            if (!dto.managerOverrideReason || dto.managerOverrideReason.trim().length < 10) {
                throw new common_1.BadRequestException(`SIZE MISMATCH: Expected ${sizeValidation.expectedDisplay}, but actual artwork is ${sizeValidation.actualDisplay}. Release blocked. An authorized manager override with justification (min 10 characters) is required to bypass.`);
            }
            wasOverridden = true;
        }
        const fromStatus = order.status;
        const updatedOrder = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.PRODUCTION_QUEUE,
                    customerStatus: 'PREPARING_ORDER',
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    fromStatus,
                    toStatus: client_1.OrderStatus.PRODUCTION_QUEUE,
                    changedById: user.sub,
                    reason: wasOverridden
                        ? `OE RELEASE TO PRODUCTION (OVERRIDE: ${dto.managerOverrideReason})`
                        : dto.notes || 'OE confirmed operational readiness & released to Production Queue.',
                    notes: dto.notes,
                },
            });
            return updated;
        });
        const createdJobCards = [];
        for (const orderItem of order.items) {
            try {
                const jobCard = await this.jobCardEngine.generateJobCardForOrderItem(orderItem.id, user.sub);
                createdJobCards.push(jobCard);
            }
            catch (err) {
                this.logger.warn(`JobCard generation for item ${orderItem.id}: ${err.message}`);
            }
        }
        if (dto.assignedOperatorId) {
            try {
                await this.assignProductionOperator(order.id, { operatorUserId: dto.assignedOperatorId, reason: 'Assigned during OE Production Release' }, user);
            }
            catch (err) {
                this.logger.warn(`Could not assign operator during release: ${err.message}`);
            }
        }
        await this.auditService.log({
            actorId: user.sub,
            actorType: 'USER',
            action: wasOverridden ? 'ORDER_RELEASED_WITH_SIZE_OVERRIDE' : 'ORDER_RELEASED_TO_PRODUCTION',
            entity: 'Order',
            entityId: order.id,
            orderId: order.id,
            previousState: { status: fromStatus },
            newState: {
                status: client_1.OrderStatus.PRODUCTION_QUEUE,
                sizeValidationStatus: sizeValidation.status,
                expectedDisplay: sizeValidation.expectedDisplay,
                actualDisplay: sizeValidation.actualDisplay,
                jobCardsGenerated: createdJobCards.length,
                managerOverride: wasOverridden ? dto.managerOverrideReason : null,
            },
            reason: wasOverridden ? dto.managerOverrideReason : dto.notes || 'Released to production by OE',
        });
        this.logger.log(`Order ${order.orderNumber} successfully released to PRODUCTION_QUEUE by OE ${user.email} (Size validation: ${sizeValidation.status}).`);
        return {
            success: true,
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: client_1.OrderStatus.PRODUCTION_QUEUE,
            sizeValidation,
            jobCards: createdJobCards,
            releasedBy: user.email,
        };
    }
};
exports.OperationsService = OperationsService;
exports.OperationsService = OperationsService = OperationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        job_card_engine_service_1.JobCardEngineService,
        workflow_state_service_1.WorkflowStateService,
        event_emitter_1.EventEmitter2])
], OperationsService);
//# sourceMappingURL=operations.service.js.map