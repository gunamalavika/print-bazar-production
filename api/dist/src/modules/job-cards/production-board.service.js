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
var ProductionBoardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionBoardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
let ProductionBoardService = ProductionBoardService_1 = class ProductionBoardService {
    prisma;
    auditService;
    eventEmitter;
    logger = new common_1.Logger(ProductionBoardService_1.name);
    constructor(prisma, auditService, eventEmitter) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.eventEmitter = eventEmitter;
    }
    async getBoardData(filters, user) {
        let columns = await this.prisma.productionColumn.findMany({
            where: { isActive: true, key: { not: 'READY_FOR_PRODUCTION' } },
            orderBy: { sortOrder: 'asc' },
        });
        if (columns.length === 0) {
            await this.seedDefaultColumns();
            columns = await this.prisma.productionColumn.findMany({
                where: { isActive: true, key: { not: 'READY_FOR_PRODUCTION' } },
                orderBy: { sortOrder: 'asc' },
            });
        }
        const jobCardsWhere = {};
        if (user.role === client_1.UserRole.PRODUCTION_OPERATOR) {
            jobCardsWhere.OR = [
                { operatorId: user.sub },
                {
                    order: {
                        assignments: {
                            some: {
                                assignedUserId: user.sub,
                                taskType: client_1.AssignmentTaskType.PRODUCTION,
                                status: client_1.AssignmentStatus.ACTIVE,
                            },
                        },
                    },
                },
            ];
        }
        const jobCards = await this.prisma.jobCard.findMany({
            where: jobCardsWhere,
            include: {
                order: {
                    include: {
                        customer: true,
                        shippingAddress: true,
                        qcChecklists: true,
                    },
                },
                orderItem: {
                    include: {
                        product: {
                            include: {
                                category: true,
                            },
                        },
                        artworkVersions: true,
                    },
                },
                machine: true,
                operator: true,
                issues: {
                    where: { isResolved: false },
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
        });
        const now = new Date();
        const mappedCards = [];
        for (const job of jobCards) {
            const specs = job.technicalSpecs || {};
            const rawSpecs = specs.specifications || {};
            const dueTime = new Date(job.dueAt).getTime();
            const diffMs = dueTime - now.getTime();
            const diffMinutes = Math.round(diffMs / (1000 * 60));
            let slaStatus = 'ON_TIME';
            let slaBadgeText = 'On Time';
            if (diffMinutes < 0) {
                slaStatus = 'OVERDUE';
                const overdueMins = Math.abs(diffMinutes);
                const hours = Math.floor(overdueMins / 60);
                const mins = overdueMins % 60;
                slaBadgeText = hours > 0 ? `Overdue +${hours}h ${mins}m` : `Overdue +${mins}m`;
            }
            else if (diffMinutes <= 180) {
                slaStatus = 'DUE_SOON';
                const hours = Math.floor(diffMinutes / 60);
                const mins = diffMinutes % 60;
                slaBadgeText = hours > 0 ? `Due in ${hours}h ${mins}m` : `Due in ${mins}m`;
            }
            else {
                const hours = Math.floor(diffMinutes / 60);
                slaBadgeText = `Due in ${hours}h`;
            }
            let timeLabel = 'Waiting';
            let timeText = 'Ready for production';
            if (job.status === client_1.JobCardStatus.PRINTING && job.startedAt) {
                const elapsedMs = now.getTime() - new Date(job.startedAt).getTime();
                const elapsedMins = Math.floor(elapsedMs / (1000 * 60));
                const hours = Math.floor(elapsedMins / 60);
                const mins = elapsedMins % 60;
                timeLabel = 'Printing';
                timeText = hours > 0 ? `${hours}h ${mins}m in progress` : `${mins}m in progress`;
            }
            else if (job.status === client_1.JobCardStatus.FINISHING && job.startedAt) {
                timeLabel = 'Finishing';
                timeText = 'Under post-press processing';
            }
            else if (job.status === client_1.JobCardStatus.QC_INSPECTION) {
                timeLabel = 'Final QC';
                timeText = 'Awaiting physical inspection';
            }
            else if (job.order.status === client_1.OrderStatus.PACKING) {
                timeLabel = 'Packing';
                timeText = 'Staged at parcel station';
            }
            else if (job.order.status === client_1.OrderStatus.READY_FOR_DISPATCH) {
                timeLabel = 'Dispatch';
                timeText = 'Manifest ready';
            }
            else if (job.order.status === client_1.OrderStatus.OUT_FOR_DELIVERY || job.order.status === client_1.OrderStatus.DELIVERED) {
                timeLabel = 'Dispatched';
                timeText = 'Shipped via carrier';
            }
            const { allowedActions, allowedTransitions } = this.resolveRoleCapabilities(job, user.role);
            const isHeld = job.status === client_1.JobCardStatus.ON_HOLD || job.order.status === client_1.OrderStatus.ON_HOLD;
            const latestIssue = job.issues[0];
            const artworkVersions = job.orderItem?.artworkVersions || [];
            const approvedArtwork = artworkVersions.find((a) => a.isApproved || a.status === client_1.ArtworkStatus.PROOF_APPROVED || a.status === client_1.ArtworkStatus.PREFLIGHT_PASSED) ||
                artworkVersions[0];
            let fileUrl = approvedArtwork?.storageKey || '';
            if (fileUrl && !fileUrl.startsWith('http')) {
                if (fileUrl.startsWith('/uploads')) {
                }
                else if (fileUrl.startsWith('uploads/')) {
                    fileUrl = `/${fileUrl}`;
                }
                else if (fileUrl.startsWith('artwork/')) {
                    fileUrl = `/uploads/${fileUrl}`;
                }
                else if (fileUrl.startsWith('/')) {
                    fileUrl = `/uploads/artwork${fileUrl}`;
                }
                else {
                    fileUrl = `/uploads/artwork/${fileUrl}`;
                }
            }
            const artwork = approvedArtwork
                ? {
                    id: approvedArtwork.id,
                    storageKey: approvedArtwork.storageKey,
                    fileUrl,
                    originalFileName: approvedArtwork.originalFileName || 'approved_artwork.pdf',
                    mimeType: approvedArtwork.mimeType || 'application/pdf',
                    fileSize: approvedArtwork.fileSize || 0,
                    status: approvedArtwork.status,
                    isApproved: approvedArtwork.isApproved || approvedArtwork.status === client_1.ArtworkStatus.PROOF_APPROVED,
                    proofUrl: approvedArtwork.proofUrl,
                }
                : null;
            mappedCards.push({
                id: job.id,
                jobNumber: job.jobNumber,
                orderId: job.orderId,
                orderNumber: job.order.orderNumber,
                customerName: job.order.customer?.fullName || 'B2B Client',
                customerCompany: job.order.customer?.companyName || undefined,
                productName: specs.productName || job.orderItem?.productName || 'Print Product',
                quantity: specs.quantity || job.orderItem?.quantity || 1,
                specifications: {
                    paperGsm: rawSpecs['paper_gsm'] || rawSpecs['gsm'] || '350 GSM Art Card',
                    finish: rawSpecs['lamination'] || rawSpecs['finish'] || 'Thermal Matt Lamination',
                    printMode: rawSpecs['print_sides'] || rawSpecs['color_mode'] || '4+4 CMYK Digital',
                    dimensions: rawSpecs['dimensions'] || rawSpecs['size'] || undefined,
                    sides: rawSpecs['sides'] || undefined,
                    raw: rawSpecs,
                },
                machine: job.machine
                    ? {
                        id: job.machine.id,
                        name: job.machine.name,
                        code: job.machine.code,
                        type: job.machine.type,
                    }
                    : null,
                operator: job.operator
                    ? {
                        id: job.operator.id,
                        fullName: job.operator.fullName,
                        role: job.operator.role,
                    }
                    : null,
                status: job.status,
                orderStatus: job.order.status,
                currentStation: job.currentStation,
                priority: job.priority,
                dueAt: job.dueAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                slaStatus,
                slaBadgeText,
                timeInfo: {
                    label: timeLabel,
                    text: timeText,
                },
                allowedTransitions,
                allowedActions,
                holdReason: isHeld ? latestIssue?.description || 'Job placed on hold' : undefined,
                isHeld,
                version: job.updatedAt.getTime(),
                artwork,
            });
        }
        let filteredCards = mappedCards;
        if (filters.search) {
            const q = filters.search.toLowerCase().trim();
            filteredCards = filteredCards.filter((c) => c.orderNumber.toLowerCase().includes(q) ||
                c.jobNumber.toLowerCase().includes(q) ||
                c.customerName.toLowerCase().includes(q) ||
                c.productName.toLowerCase().includes(q) ||
                (c.customerCompany && c.customerCompany.toLowerCase().includes(q)) ||
                (c.machine && c.machine.name.toLowerCase().includes(q)));
        }
        if (filters.machineId && filters.machineId !== 'ALL') {
            filteredCards = filteredCards.filter((c) => c.machine?.id === filters.machineId);
        }
        if (user.role === client_1.UserRole.PRODUCTION_OPERATOR) {
            filteredCards = filteredCards.filter((c) => c.operator?.id === user.sub);
        }
        else if (filters.operatorId && filters.operatorId !== 'ALL') {
            filteredCards = filteredCards.filter((c) => c.operator?.id === filters.operatorId);
        }
        if (filters.priority && filters.priority !== 'ALL') {
            filteredCards = filteredCards.filter((c) => c.priority === filters.priority);
        }
        if (filters.slaStatus && filters.slaStatus !== 'ALL') {
            filteredCards = filteredCards.filter((c) => c.slaStatus === filters.slaStatus);
        }
        const resultColumns = columns.map((col) => {
            const matchingCards = filteredCards.filter((card) => this.isCardInColumn(card, col));
            return {
                id: col.id,
                key: col.key,
                name: col.name,
                description: col.description,
                type: col.type,
                sortOrder: col.sortOrder,
                color: col.color,
                mappedStatus: col.mappedStatus,
                mappedStation: col.mappedStation,
                cards: matchingCards,
                cardCount: matchingCards.length,
            };
        });
        const activeJobs = mappedCards.filter((c) => c.orderStatus !== client_1.OrderStatus.DELIVERED && c.orderStatus !== client_1.OrderStatus.CANCELLED).length;
        const printing = mappedCards.filter((c) => c.status === client_1.JobCardStatus.PRINTING).length;
        const finishing = mappedCards.filter((c) => c.status === client_1.JobCardStatus.FINISHING).length;
        const finalQc = mappedCards.filter((c) => c.status === client_1.JobCardStatus.QC_INSPECTION || c.orderStatus === client_1.OrderStatus.QUALITY_CHECK).length;
        const packing = mappedCards.filter((c) => c.orderStatus === client_1.OrderStatus.PACKING).length;
        const readyForDispatch = mappedCards.filter((c) => c.orderStatus === client_1.OrderStatus.READY_FOR_DISPATCH).length;
        const dispatched = mappedCards.filter((c) => c.orderStatus === client_1.OrderStatus.OUT_FOR_DELIVERY || c.orderStatus === client_1.OrderStatus.DELIVERED).length;
        const onHold = mappedCards.filter((c) => c.isHeld).length;
        const availableMachines = await this.prisma.machineWorkCenter.findMany({
            where: { isActive: true },
            select: { id: true, name: true, code: true, type: true },
            orderBy: { name: 'asc' },
        });
        const availableOperators = await this.prisma.user.findMany({
            where: {
                role: {
                    in: [
                        client_1.UserRole.PRODUCTION_OPERATOR,
                        client_1.UserRole.FINAL_QC_INSPECTOR,
                        client_1.UserRole.PACKING_OPERATOR,
                        client_1.UserRole.DISPATCH_LOGISTICS,
                        client_1.UserRole.ADMIN_MANAGER,
                    ],
                },
            },
            select: { id: true, fullName: true, role: true, department: true },
            orderBy: { fullName: 'asc' },
        });
        return {
            columns: resultColumns,
            metrics: {
                activeJobs,
                printing,
                finishing,
                finalQc,
                packing,
                readyForDispatch,
                dispatched,
                onHold,
            },
            shiftInfo: {
                shiftName: 'Shift A (General Day Shift)',
                liveStatus: 'PRESS ONLINE',
                activePressCount: availableMachines.length,
                operatorCount: availableOperators.length,
            },
            availableMachines,
            availableOperators,
        };
    }
    isCardInColumn(card, col) {
        if (col.type === client_1.ProductionColumnType.HOLD) {
            return card.isHeld && (card.holdReason?.toUpperCase().includes(col.key) || col.key === 'HOLD');
        }
        switch (col.key) {
            case 'QC_APPROVED':
                return (!card.isHeld &&
                    (card.status === client_1.JobCardStatus.QUEUED ||
                        card.status === client_1.JobCardStatus.ASSIGNED ||
                        card.orderStatus === client_1.OrderStatus.PRODUCTION_QUEUE) &&
                    card.status !== client_1.JobCardStatus.PRINTING &&
                    card.status !== client_1.JobCardStatus.FINISHING &&
                    card.status !== client_1.JobCardStatus.QC_INSPECTION &&
                    card.orderStatus !== client_1.OrderStatus.QUALITY_CHECK &&
                    card.orderStatus !== client_1.OrderStatus.PACKING &&
                    card.orderStatus !== client_1.OrderStatus.READY_FOR_DISPATCH &&
                    card.orderStatus !== client_1.OrderStatus.OUT_FOR_DELIVERY &&
                    card.orderStatus !== client_1.OrderStatus.DELIVERED);
            case 'PRINTING':
                return (!card.isHeld &&
                    (card.status === client_1.JobCardStatus.PRINTING ||
                        (card.orderStatus === client_1.OrderStatus.PRINTING && card.status !== client_1.JobCardStatus.FINISHING)));
            case 'FINISHING':
                return (!card.isHeld &&
                    (card.status === client_1.JobCardStatus.FINISHING ||
                        card.status === client_1.JobCardStatus.PRINTING_COMPLETED ||
                        card.orderStatus === client_1.OrderStatus.FINISHING) &&
                    card.status !== client_1.JobCardStatus.QC_INSPECTION &&
                    card.orderStatus !== client_1.OrderStatus.QUALITY_CHECK &&
                    card.orderStatus !== client_1.OrderStatus.PACKING &&
                    card.orderStatus !== client_1.OrderStatus.READY_FOR_DISPATCH &&
                    card.orderStatus !== client_1.OrderStatus.OUT_FOR_DELIVERY &&
                    card.orderStatus !== client_1.OrderStatus.DELIVERED);
            case 'FINAL_QC':
                return (!card.isHeld &&
                    (card.status === client_1.JobCardStatus.QC_INSPECTION ||
                        card.orderStatus === client_1.OrderStatus.QUALITY_CHECK) &&
                    card.orderStatus !== client_1.OrderStatus.PACKING &&
                    card.orderStatus !== client_1.OrderStatus.READY_FOR_DISPATCH &&
                    card.orderStatus !== client_1.OrderStatus.OUT_FOR_DELIVERY &&
                    card.orderStatus !== client_1.OrderStatus.DELIVERED);
            case 'PACKING':
                return (!card.isHeld &&
                    card.orderStatus === client_1.OrderStatus.PACKING);
            case 'READY_FOR_DISPATCH':
                return (!card.isHeld &&
                    card.orderStatus === client_1.OrderStatus.READY_FOR_DISPATCH);
            case 'DISPATCHED':
                return (!card.isHeld &&
                    (card.orderStatus === client_1.OrderStatus.OUT_FOR_DELIVERY ||
                        card.orderStatus === client_1.OrderStatus.DELIVERED));
            default:
                if (col.mappedStatus && card.orderStatus === col.mappedStatus)
                    return true;
                if (col.mappedStation && card.currentStation === col.mappedStation)
                    return true;
                return false;
        }
    }
    resolveRoleCapabilities(job, role) {
        const allowedTransitions = [];
        const allowedActions = [];
        if (role === client_1.UserRole.ADMIN_MANAGER) {
            allowedTransitions.push('QC_APPROVED', 'PRINTING', 'FINISHING', 'FINAL_QC', 'PACKING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'HOLD');
            allowedActions.push('CLAIM', 'START_PRINTING', 'PAUSE', 'RESUME', 'COMPLETE_PRINTING', 'COMPLETE_FINISHING', 'QC_PASS', 'QC_FAIL', 'START_PACKING', 'COMPLETE_PACKING', 'DISPATCH', 'HOLD', 'OVERRIDE');
            return { allowedActions, allowedTransitions };
        }
        if (role === client_1.UserRole.PRODUCTION_OPERATOR) {
            if (job.status === client_1.JobCardStatus.QUEUED || job.status === client_1.JobCardStatus.ASSIGNED) {
                allowedTransitions.push('PRINTING', 'HOLD');
                allowedActions.push('CLAIM', 'START_PRINTING');
            }
            else if (job.status === client_1.JobCardStatus.PRINTING) {
                allowedTransitions.push('FINISHING', 'HOLD');
                allowedActions.push('PAUSE', 'COMPLETE_PRINTING');
            }
            else if (job.status === client_1.JobCardStatus.FINISHING || job.status === client_1.JobCardStatus.PRINTING_COMPLETED) {
                allowedTransitions.push('FINAL_QC', 'HOLD');
                allowedActions.push('COMPLETE_FINISHING');
            }
        }
        if (role === client_1.UserRole.FINAL_QC_INSPECTOR) {
            if (job.status === client_1.JobCardStatus.QC_INSPECTION || job.order.status === client_1.OrderStatus.QUALITY_CHECK) {
                allowedTransitions.push('PACKING', 'HOLD', 'REWORK');
                allowedActions.push('INSPECT', 'QC_PASS', 'QC_FAIL');
            }
        }
        if (role === client_1.UserRole.PACKING_OPERATOR) {
            if (job.order.status === client_1.OrderStatus.PACKING) {
                allowedTransitions.push('READY_FOR_DISPATCH', 'HOLD');
                allowedActions.push('START_PACKING', 'COMPLETE_PACKING');
            }
        }
        if (role === client_1.UserRole.DISPATCH_LOGISTICS) {
            if (job.order.status === client_1.OrderStatus.READY_FOR_DISPATCH) {
                allowedTransitions.push('DISPATCHED');
                allowedActions.push('CREATE_MANIFEST', 'DISPATCH');
            }
        }
        return { allowedActions, allowedTransitions };
    }
    async transitionJob(jobId, dto, user) {
        const job = await this.prisma.jobCard.findUnique({
            where: { id: jobId },
            include: {
                order: {
                    include: {
                        qcChecklists: true,
                    },
                },
                machine: true,
                operator: true,
            },
        });
        if (!job) {
            throw new common_1.NotFoundException(`JobCard '${jobId}' not found.`);
        }
        if (user.role === client_1.UserRole.PRODUCTION_OPERATOR) {
            const isAssigned = job.operatorId === user.sub ||
                (await this.prisma.orderAssignment.findFirst({
                    where: {
                        orderId: job.orderId,
                        assignedUserId: user.sub,
                        taskType: client_1.AssignmentTaskType.PRODUCTION,
                        status: client_1.AssignmentStatus.ACTIVE,
                    },
                }));
            if (!isAssigned) {
                throw new common_1.ForbiddenException('You cannot transition a production job assigned to another operator.');
            }
        }
        const targetColumnKey = dto.targetColumnKey || dto.toStationKey || '';
        const { reason, machineId, operatorId, managerOverrideReason } = dto;
        const isManager = user.role === client_1.UserRole.ADMIN_MANAGER;
        if (!targetColumnKey) {
            throw new common_1.BadRequestException('targetColumnKey is required');
        }
        if (managerOverrideReason && !isManager) {
            throw new common_1.ForbiddenException('Only ADMIN_MANAGER can supply a manager override reason.');
        }
        if (isManager && managerOverrideReason && managerOverrideReason.trim().length < 10) {
            throw new common_1.BadRequestException('Manager override requires a structured reason of at least 10 characters.');
        }
        const isHoldTarget = targetColumnKey.includes('HOLD') ||
            targetColumnKey.includes('REWORK') ||
            targetColumnKey.includes('ISSUE');
        if (isHoldTarget && (!reason || reason.trim().length < 3)) {
            throw new common_1.BadRequestException('Placing a job on Hold requires a specific, valid reason.');
        }
        if (!isManager || !managerOverrideReason) {
            this.validateTransitionPermissions(job, targetColumnKey, user.role);
        }
        let newJobStatus = job.status;
        let newOrderStatus = job.order.status;
        let newStation = job.currentStation;
        let startedAt = undefined;
        let completedAt = undefined;
        switch (targetColumnKey) {
            case 'PRINTING':
                newJobStatus = client_1.JobCardStatus.PRINTING;
                newOrderStatus = client_1.OrderStatus.PRINTING;
                newStation = 'PRINTING';
                startedAt = job.startedAt || new Date();
                break;
            case 'FINISHING':
                newJobStatus = client_1.JobCardStatus.FINISHING;
                newOrderStatus = client_1.OrderStatus.FINISHING;
                newStation = 'FINISHING';
                break;
            case 'FINAL_QC':
                newJobStatus = client_1.JobCardStatus.QC_INSPECTION;
                newOrderStatus = client_1.OrderStatus.QUALITY_CHECK;
                newStation = 'FINAL_QC';
                break;
            case 'PACKING':
                newJobStatus = client_1.JobCardStatus.COMPLETED;
                newOrderStatus = client_1.OrderStatus.PACKING;
                newStation = 'PACKING';
                completedAt = new Date();
                break;
            case 'READY_FOR_DISPATCH':
                newJobStatus = client_1.JobCardStatus.COMPLETED;
                newOrderStatus = client_1.OrderStatus.READY_FOR_DISPATCH;
                newStation = 'DISPATCH';
                break;
            case 'DISPATCHED':
                newJobStatus = client_1.JobCardStatus.COMPLETED;
                newOrderStatus = client_1.OrderStatus.OUT_FOR_DELIVERY;
                newStation = 'DISPATCH';
                break;
            case 'MATERIAL_HOLD':
            case 'MACHINE_ISSUE':
            case 'HOLD':
            case 'REWORK':
                newJobStatus = client_1.JobCardStatus.ON_HOLD;
                newOrderStatus = client_1.OrderStatus.ON_HOLD;
                break;
            case 'QC_APPROVED':
                newJobStatus = client_1.JobCardStatus.QUEUED;
                newOrderStatus = client_1.OrderStatus.PRODUCTION_QUEUE;
                newStation = 'PRINTING';
                break;
            default:
                const customCol = await this.prisma.productionColumn.findUnique({
                    where: { key: targetColumnKey },
                });
                if (customCol) {
                    if (customCol.type === client_1.ProductionColumnType.HOLD) {
                        newJobStatus = client_1.JobCardStatus.ON_HOLD;
                        newOrderStatus = client_1.OrderStatus.ON_HOLD;
                    }
                    else if (customCol.mappedStatus) {
                        newOrderStatus = customCol.mappedStatus;
                    }
                    if (customCol.mappedStation) {
                        newStation = customCol.mappedStation;
                    }
                }
                break;
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const updatedJob = await tx.jobCard.update({
                where: { id: job.id },
                data: {
                    status: newJobStatus,
                    currentStation: newStation,
                    ...(startedAt ? { startedAt } : {}),
                    ...(completedAt ? { completedAt } : {}),
                    ...(machineId ? { machineId } : {}),
                    ...(operatorId ? { operatorId } : user.role === client_1.UserRole.PRODUCTION_OPERATOR ? { operatorId: user.sub } : {}),
                    ...(isHoldTarget ? { preHoldStatus: job.status } : {}),
                },
            });
            await tx.order.update({
                where: { id: job.orderId },
                data: {
                    status: newOrderStatus,
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: job.orderId,
                    fromStatus: job.order.status,
                    toStatus: newOrderStatus,
                    changedById: user.sub,
                    department: user.department,
                    reason: reason || managerOverrideReason || `Kanban drag to ${targetColumnKey}`,
                },
            });
            if (isHoldTarget && reason) {
                await tx.jobIssue.create({
                    data: {
                        jobCardId: job.id,
                        reasonCode: targetColumnKey,
                        description: reason,
                        reportedBy: user.sub,
                    },
                });
            }
            if (['PACKING', 'READY_FOR_DISPATCH', 'DISPATCHED'].includes(targetColumnKey)) {
                await tx.orderAssignment.updateMany({
                    where: {
                        orderId: job.orderId,
                        taskType: client_1.AssignmentTaskType.PRODUCTION,
                        status: client_1.AssignmentStatus.ACTIVE,
                    },
                    data: {
                        status: client_1.AssignmentStatus.COMPLETED,
                        completedAt: new Date(),
                        reason: `Production step completed: moved to ${targetColumnKey}`,
                    },
                });
            }
            return updatedJob;
        });
        await this.auditService.log({
            actorId: user.sub,
            actorType: 'USER',
            action: managerOverrideReason ? 'KANBAN_MANAGER_OVERRIDE' : 'KANBAN_DRAG',
            entity: 'JobCard',
            entityId: job.id,
            orderId: job.orderId,
            previousState: {
                jobStatus: job.status,
                orderStatus: job.order.status,
                station: job.currentStation,
            },
            newState: {
                jobStatus: newJobStatus,
                orderStatus: newOrderStatus,
                station: newStation,
                targetColumnKey,
            },
            reason: reason || managerOverrideReason || `Transitioned to ${targetColumnKey}`,
        });
        this.eventEmitter.emit('production.job.transitioned', {
            jobCardId: job.id,
            jobNumber: job.jobNumber,
            orderId: job.orderId,
            targetColumnKey,
            actorId: user.sub,
        });
        return result;
    }
    validateTransitionPermissions(job, targetKey, role) {
        if (targetKey === 'PRINTING') {
            if (role !== client_1.UserRole.PRODUCTION_OPERATOR) {
                throw new common_1.ForbiddenException('Only PRODUCTION_OPERATOR can start printing runs.');
            }
            if (job.status !== client_1.JobCardStatus.QUEUED && job.status !== client_1.JobCardStatus.ASSIGNED && job.status !== client_1.JobCardStatus.ON_HOLD) {
                throw new common_1.BadRequestException('Cannot move to PRINTING: Job must be in QC APPROVED or ON_HOLD state.');
            }
        }
        else if (targetKey === 'FINISHING') {
            if (role !== client_1.UserRole.PRODUCTION_OPERATOR) {
                throw new common_1.ForbiddenException('Only PRODUCTION_OPERATOR can handover jobs to Finishing.');
            }
            if (job.status !== client_1.JobCardStatus.PRINTING && job.status !== client_1.JobCardStatus.ON_HOLD) {
                throw new common_1.BadRequestException('Cannot move to FINISHING: Job must complete printing first.');
            }
        }
        else if (targetKey === 'FINAL_QC') {
            if (role !== client_1.UserRole.PRODUCTION_OPERATOR && role !== client_1.UserRole.FINAL_QC_INSPECTOR) {
                throw new common_1.ForbiddenException('Only PRODUCTION_OPERATOR or FINAL_QC_INSPECTOR can route jobs to Final QC.');
            }
            if (job.status !== client_1.JobCardStatus.FINISHING && job.status !== client_1.JobCardStatus.PRINTING_COMPLETED && job.status !== client_1.JobCardStatus.PRINTING && job.status !== client_1.JobCardStatus.ON_HOLD) {
                throw new common_1.BadRequestException('Cannot move to FINAL QC: Job must complete printing and finishing first.');
            }
        }
        else if (targetKey === 'PACKING') {
            if (role !== client_1.UserRole.FINAL_QC_INSPECTOR) {
                throw new common_1.ForbiddenException('Only FINAL_QC_INSPECTOR can approve release to PACKING after physical inspection.');
            }
            const passedQc = job.order.qcChecklists.some((q) => q.type === 'FINAL_QC' && q.outcome === 'PASS');
            if (!passedQc) {
                throw new common_1.BadRequestException('This job must have a PASSED Final QC inspection before moving to Packing.');
            }
        }
        else if (targetKey === 'READY_FOR_DISPATCH') {
            if (role !== client_1.UserRole.PACKING_OPERATOR) {
                throw new common_1.ForbiddenException('Only PACKING_OPERATOR can complete packaging and stage for dispatch.');
            }
            if (job.order.status !== client_1.OrderStatus.PACKING) {
                throw new common_1.BadRequestException('Job must be in PACKING station before moving to READY FOR DISPATCH.');
            }
        }
        else if (targetKey === 'DISPATCHED') {
            if (role !== client_1.UserRole.DISPATCH_LOGISTICS) {
                throw new common_1.ForbiddenException('Only DISPATCH_LOGISTICS can dispatch shipments.');
            }
            if (job.order.status !== client_1.OrderStatus.READY_FOR_DISPATCH) {
                throw new common_1.BadRequestException('Job must be packaged and in READY FOR DISPATCH before handover.');
            }
        }
    }
    async createColumn(dto, user) {
        if (user.role !== client_1.UserRole.ADMIN_MANAGER) {
            throw new common_1.ForbiddenException('Only ADMIN_MANAGER is authorized to configure production columns.');
        }
        const key = dto.key || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        const existing = await this.prisma.productionColumn.findUnique({
            where: { key },
        });
        if (existing) {
            throw new common_1.BadRequestException(`Column with key '${key}' already exists.`);
        }
        const maxSort = await this.prisma.productionColumn.aggregate({
            _max: { sortOrder: true },
        });
        const sortOrder = dto.sortOrder ?? (maxSort._max.sortOrder || 0) + 10;
        const created = await this.prisma.productionColumn.create({
            data: {
                key,
                name: dto.name,
                description: dto.description,
                type: dto.type || client_1.ProductionColumnType.CUSTOM,
                mappedStatus: dto.mappedStatus,
                mappedStation: dto.mappedStation,
                sortOrder,
                color: dto.color || '#64748B',
                createdById: user.sub,
            },
        });
        await this.auditService.log({
            actorId: user.sub,
            actorType: 'USER',
            action: 'PRODUCTION_COLUMN_CREATED',
            entity: 'ProductionColumn',
            entityId: created.id,
            newState: created,
            reason: `Created production column ${created.name}`,
        });
        return created;
    }
    async updateColumn(id, dto, user) {
        if (user.role !== client_1.UserRole.ADMIN_MANAGER) {
            throw new common_1.ForbiddenException('Only ADMIN_MANAGER is authorized to update production columns.');
        }
        const existing = await this.prisma.productionColumn.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException(`Column '${id}' not found.`);
        }
        const updated = await this.prisma.productionColumn.update({
            where: { id },
            data: {
                ...(dto.name ? { name: dto.name } : {}),
                ...(dto.description !== undefined ? { description: dto.description } : {}),
                ...(dto.type ? { type: dto.type } : {}),
                ...(dto.mappedStatus !== undefined ? { mappedStatus: dto.mappedStatus } : {}),
                ...(dto.mappedStation !== undefined ? { mappedStation: dto.mappedStation } : {}),
                ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
                ...(dto.color ? { color: dto.color } : {}),
                ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            },
        });
        await this.auditService.log({
            actorId: user.sub,
            actorType: 'USER',
            action: 'PRODUCTION_COLUMN_UPDATED',
            entity: 'ProductionColumn',
            entityId: updated.id,
            previousState: existing,
            newState: updated,
            reason: `Updated column ${updated.name}`,
        });
        return updated;
    }
    async reorderColumns(columnOrders, user) {
        if (user.role !== client_1.UserRole.ADMIN_MANAGER) {
            throw new common_1.ForbiddenException('Only ADMIN_MANAGER is authorized to reorder production columns.');
        }
        await this.prisma.$transaction(columnOrders.map((item) => this.prisma.productionColumn.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
        })));
        await this.auditService.log({
            actorId: user.sub,
            actorType: 'USER',
            action: 'PRODUCTION_COLUMNS_REORDERED',
            entity: 'ProductionColumn',
            entityId: 'ALL',
            newState: { columnOrders },
            reason: 'Reordered production Kanban columns',
        });
        return { success: true, message: 'Columns reordered successfully.' };
    }
    async archiveColumn(id, user) {
        if (user.role !== client_1.UserRole.ADMIN_MANAGER) {
            throw new common_1.ForbiddenException('Only ADMIN_MANAGER is authorized to archive production columns.');
        }
        const column = await this.prisma.productionColumn.findUnique({ where: { id } });
        if (!column) {
            throw new common_1.NotFoundException(`Column '${id}' not found.`);
        }
        if (column.type === client_1.ProductionColumnType.SYSTEM) {
            throw new common_1.BadRequestException('System default workflow columns cannot be archived.');
        }
        const board = await this.getBoardData({}, user);
        const targetCol = board.columns.find((c) => c.id === id);
        if (targetCol && targetCol.cardCount > 0) {
            throw new common_1.BadRequestException(`This column contains ${targetCol.cardCount} active jobs. Move these jobs before deactivating the column.`);
        }
        const archived = await this.prisma.productionColumn.update({
            where: { id },
            data: {
                isActive: false,
                type: client_1.ProductionColumnType.ARCHIVED,
            },
        });
        await this.auditService.log({
            actorId: user.sub,
            actorType: 'USER',
            action: 'PRODUCTION_COLUMN_ARCHIVED',
            entity: 'ProductionColumn',
            entityId: archived.id,
            reason: `Archived custom column ${archived.name}`,
        });
        return archived;
    }
    async seedDefaultColumns() {
        const defaultColumns = [
            {
                key: 'QC_APPROVED',
                name: 'QC APPROVED',
                description: 'Pre-Production QC 100% Passed. Ready for machine queue.',
                type: client_1.ProductionColumnType.SYSTEM,
                mappedStatus: client_1.OrderStatus.PRODUCTION_QUEUE,
                mappedStation: 'PRINTING',
                sortOrder: 10,
                color: '#3B82F6',
                isActive: true,
            },
            {
                key: 'PRINTING',
                name: 'PRINTING',
                description: 'Digital & Offset sheet press run in progress.',
                type: client_1.ProductionColumnType.SYSTEM,
                mappedStatus: client_1.OrderStatus.PRINTING,
                mappedStation: 'PRINTING',
                sortOrder: 20,
                color: '#F59E0B',
                isActive: true,
            },
            {
                key: 'FINISHING',
                name: 'FINISHING',
                description: 'Lamination, die-cutting, folding & blade trimming.',
                type: client_1.ProductionColumnType.SYSTEM,
                mappedStatus: client_1.OrderStatus.FINISHING,
                mappedStation: 'FINISHING',
                sortOrder: 30,
                color: '#8B5CF6',
                isActive: true,
            },
            {
                key: 'FINAL_QC',
                name: 'FINAL QC',
                description: 'Physical output inspection, color & registration audit.',
                type: client_1.ProductionColumnType.SYSTEM,
                mappedStatus: client_1.OrderStatus.QUALITY_CHECK,
                mappedStation: 'FINAL_QC',
                sortOrder: 40,
                color: '#10B981',
                isActive: true,
            },
            {
                key: 'PACKING',
                name: 'PACKING',
                description: 'Carton packaging, weigh station & shipping labeling.',
                type: client_1.ProductionColumnType.SYSTEM,
                mappedStatus: client_1.OrderStatus.PACKING,
                mappedStation: 'PACKING',
                sortOrder: 50,
                color: '#06B6D4',
                isActive: true,
            },
            {
                key: 'READY_FOR_DISPATCH',
                name: 'READY FOR DISPATCH',
                description: 'Packaged orders staged for courier manifest & pickup.',
                type: client_1.ProductionColumnType.SYSTEM,
                mappedStatus: client_1.OrderStatus.READY_FOR_DISPATCH,
                mappedStation: 'DISPATCH',
                sortOrder: 60,
                color: '#F97316',
                isActive: true,
            },
            {
                key: 'DISPATCHED',
                name: 'DISPATCHED',
                description: 'Waybill assigned and handed over to logistics carrier.',
                type: client_1.ProductionColumnType.SYSTEM,
                mappedStatus: client_1.OrderStatus.OUT_FOR_DELIVERY,
                mappedStation: 'DISPATCH',
                sortOrder: 70,
                color: '#64748B',
                isActive: true,
            },
        ];
        for (const col of defaultColumns) {
            await this.prisma.productionColumn.upsert({
                where: { key: col.key },
                update: {
                    name: col.name,
                    description: col.description,
                    sortOrder: col.sortOrder,
                    color: col.color,
                    mappedStatus: col.mappedStatus,
                    mappedStation: col.mappedStation,
                },
                create: col,
            });
        }
    }
};
exports.ProductionBoardService = ProductionBoardService;
exports.ProductionBoardService = ProductionBoardService = ProductionBoardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        event_emitter_1.EventEmitter2])
], ProductionBoardService);
//# sourceMappingURL=production-board.service.js.map