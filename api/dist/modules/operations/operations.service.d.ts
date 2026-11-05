import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrderStatus, Prisma, Priority } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobCardEngineService } from '../job-cards/job-card-engine.service';
import { WorkflowStateService } from '../workflow/workflow-state.service';
import { JwtPayload } from '../../common/types/roles';
export interface OperationsDashboardFilters {
    page?: string;
    limit?: string;
    status?: string;
    priority?: string;
    slaStatus?: string;
    paymentStatus?: string;
    search?: string;
    unassignedDesign?: string;
    unassignedProduction?: string;
    newIntake?: string;
    blocked?: string;
    sortBy?: string;
    sortOrder?: string;
}
export interface AssignDesignerDto {
    designerUserId?: string;
    designerId?: string;
    reason?: string;
}
export interface AssignProductionOperatorDto {
    operatorUserId?: string;
    operatorId?: string;
    reason?: string;
    managerOverrideReason?: string;
}
export interface CreateOperationalNoteDto {
    content: string;
}
export interface UpdatePriorityDto {
    priority: Priority;
    reason: string;
}
export interface ReleaseToProductionDto {
    managerOverrideReason?: string;
    notes?: string;
    assignedOperatorId?: string;
}
export interface SizeValidationResult {
    status: 'PASS' | 'MISMATCH' | 'NO_ARTWORK' | 'NOT_APPLICABLE';
    isValid: boolean;
    expectedWidthMm: number | null;
    expectedHeightMm: number | null;
    actualWidthMm: number | null;
    actualHeightMm: number | null;
    expectedDisplay: string;
    actualDisplay: string;
    toleranceMm: number;
    orientationMatch: boolean;
    details: string;
}
export interface OrderReadinessReport {
    orderId: string;
    orderNumber: string;
    status: OrderStatus;
    isEligibleForRelease: boolean;
    blockers: string[];
    customerApproval: {
        status: 'APPROVED' | 'PENDING' | 'NOT_REQUIRED';
        isApproved: boolean;
        approvedAt?: Date | null;
        approvedVersionNumber?: number | null;
    };
    artwork: {
        id?: string;
        versionNumber?: number;
        originalFileName?: string;
        proofUrl?: string;
        storageKey?: string;
        isApproved: boolean;
    } | null;
    sizeValidation: SizeValidationResult;
    productionSpecs: {
        productName: string;
        quantity: number;
        printSide?: string;
        paper?: string;
        gsm?: string;
        lamination?: string;
        specialFinishing?: string;
        orientation?: string;
        customerNotes?: string;
        productionNotes?: string;
    };
    activeHold: boolean;
}
export type OperationalNextAction = 'ASSIGN_DESIGNER' | 'WAITING_FOR_DESIGN' | 'CUSTOMER_APPROVAL_REQUIRED' | 'ASSIGN_PRODUCTION_OPERATOR' | 'PRODUCTION_IN_PROGRESS' | 'FINISHING_IN_PROGRESS' | 'FINAL_QC_PENDING' | 'PAYMENT_CLEARANCE_REQUIRED' | 'READY_FOR_PACKING' | 'PACKING_IN_PROGRESS' | 'READY_FOR_DISPATCH' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED' | 'ORDER_REVIEW';
export interface OperationalBlocker {
    type: string;
    label: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
}
export declare class OperationsService {
    private readonly prisma;
    private readonly auditService;
    private readonly jobCardEngine;
    private readonly workflowState;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService, jobCardEngine: JobCardEngineService, workflowState: WorkflowStateService, eventEmitter: EventEmitter2);
    getDashboardMetrics(): Promise<{
        totalActive: number;
        unassignedOrders: number;
        newIntakeOrders: number;
        designPending: number;
        productionPending: number;
        qcPending: number;
        paymentBlocked: number;
        packingReady: number;
        dispatchReady: number;
        onHold: number;
        atRiskOverdue: number;
        unassignedDesign: number;
        unassignedProduction: number;
        statusBreakdown: Record<string, number>;
    }>;
    listOperationalOrders(filters: OperationsDashboardFilters): Promise<{
        data: {
            nextAction: OperationalNextAction;
            blockers: OperationalBlocker[];
            designAssignment: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } | null;
            productionAssignment: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } | null;
            assignedDesigner: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            assignedOperator: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            id: string;
            orderNumber: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            customerStatus: import(".prisma/client").$Enums.CustomerVisibleStatus;
            deliveryMethod: import(".prisma/client").$Enums.DeliveryMethod;
            totalAmount: Prisma.Decimal;
            paidAmount: Prisma.Decimal;
            balanceAmount: Prisma.Decimal;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
            priority: import(".prisma/client").$Enums.Priority;
            slaStatus: import(".prisma/client").$Enums.SlaStatus;
            dueAt: Date | null;
            createdAt: Date;
            customer: {
                id: string;
                fullName: string;
                email: string;
                phone: string;
                companyName: string | null;
            };
            items: {
                id: string;
                productName: string;
                quantity: number;
                specifications: Prisma.JsonValue;
                approvedArtworkVersionId: string | null;
                artworkVersions: {
                    id: string;
                    status: import(".prisma/client").$Enums.ArtworkStatus;
                    versionNumber: number;
                    storageKey: string;
                    originalFileName: string;
                    mimeType: string;
                    fileSize: number;
                    widthPixels: number | null;
                    heightPixels: number | null;
                    qualityStatus: string | null;
                    proofUrl: string | null;
                    isApproved: boolean;
                }[];
            }[];
            packages: {
                id: string;
                status: import(".prisma/client").$Enums.PackageStatus;
            }[];
            jobCards: {
                id: string;
                status: import(".prisma/client").$Enums.JobCardStatus;
                jobNumber: string;
                currentStation: string;
                operatorId: string | null;
            }[];
            qcChecklists: {
                id: string;
                type: import(".prisma/client").$Enums.QCInspectionType;
                outcome: import(".prisma/client").$Enums.QCOutcome;
            }[];
            assignments: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            }[];
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    private resolveOrderId;
    getOperationalOrderDetail(orderId: string): Promise<{
        nextAction: OperationalNextAction;
        blockers: OperationalBlocker[];
        activeDesignAssignment: ({
            assignedUser: {
                id: string;
                fullName: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
                department: import(".prisma/client").$Enums.Department | null;
            };
            assignedByUser: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            createdAt: Date;
            updatedAt: Date;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            orderId: string;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
            completedAt: Date | null;
            reason: string | null;
        }) | null;
        activeProductionAssignment: ({
            assignedUser: {
                id: string;
                fullName: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
                department: import(".prisma/client").$Enums.Department | null;
            };
            assignedByUser: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            createdAt: Date;
            updatedAt: Date;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            orderId: string;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
            completedAt: Date | null;
            reason: string | null;
        }) | null;
        assignmentHistory: ({
            assignedUser: {
                id: string;
                fullName: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
                department: import(".prisma/client").$Enums.Department | null;
            };
            assignedByUser: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            createdAt: Date;
            updatedAt: Date;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            orderId: string;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
            completedAt: Date | null;
            reason: string | null;
        })[];
        customer: {
            addresses: {
                id: string;
                customerId: string;
                createdAt: Date;
                updatedAt: Date;
                phone: string;
                type: string;
                contactName: string;
                street: string;
                landmark: string | null;
                city: string;
                state: string;
                postalCode: string;
                country: string;
                isDefault: boolean;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            fullName: string;
            email: string;
            phone: string;
            companyName: string | null;
            gstin: string | null;
        };
        shippingAddress: {
            id: string;
            customerId: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string;
            type: string;
            contactName: string;
            street: string;
            landmark: string | null;
            city: string;
            state: string;
            postalCode: string;
            country: string;
            isDefault: boolean;
        } | null;
        billingAddress: {
            id: string;
            customerId: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string;
            type: string;
            contactName: string;
            street: string;
            landmark: string | null;
            city: string;
            state: string;
            postalCode: string;
            country: string;
            isDefault: boolean;
        } | null;
        items: ({
            jobCards: ({
                machine: {
                    id: string;
                    type: string;
                    name: string;
                    code: string;
                } | null;
                operator: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                } | null;
                issues: {
                    id: string;
                    createdAt: Date;
                    jobCardId: string;
                    description: string;
                    reasonCode: string;
                    reportedBy: string;
                    isResolved: boolean;
                    resolvedBy: string | null;
                    resolvedAt: Date | null;
                }[];
            } & {
                id: string;
                status: import(".prisma/client").$Enums.JobCardStatus;
                priority: import(".prisma/client").$Enums.Priority;
                dueAt: Date;
                createdAt: Date;
                updatedAt: Date;
                orderId: string;
                approvedArtworkVersionId: string | null;
                orderItemId: string;
                completedAt: Date | null;
                jobNumber: string;
                preHoldStatus: import(".prisma/client").$Enums.JobCardStatus | null;
                currentStation: string;
                machineId: string | null;
                operatorId: string | null;
                operationSequence: Prisma.JsonValue;
                technicalSpecs: Prisma.JsonValue;
                startedAt: Date | null;
            })[];
            product: {
                id: string;
                sku: string;
                name: string;
                slug: string;
            };
            artworkVersions: {
                id: string;
                status: import(".prisma/client").$Enums.ArtworkStatus;
                customerNotes: string | null;
                createdAt: Date;
                orderItemId: string;
                versionNumber: number;
                storageKey: string;
                originalFileName: string;
                mimeType: string;
                fileSize: number;
                checksum: string;
                resolutionDpi: number | null;
                widthMm: Prisma.Decimal | null;
                heightMm: Prisma.Decimal | null;
                widthPixels: number | null;
                heightPixels: number | null;
                actualMegapixels: number | null;
                qualityStatus: string | null;
                warningAccepted: boolean;
                hasBleed: boolean | null;
                colorProfile: string | null;
                proofUrl: string | null;
                isApproved: boolean;
                prepressNotes: string | null;
                uploadedBy: string;
                approvedAt: Date | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            orderId: string;
            productId: string;
            sku: string;
            productName: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
            totalPrice: Prisma.Decimal;
            specifications: Prisma.JsonValue;
            personalizationData: Prisma.JsonValue | null;
            approvedArtworkVersionId: string | null;
            designNotes: string | null;
        })[];
        payments: {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: Date;
            transactionId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amount: Prisma.Decimal;
            capturedAt: Date | null;
        }[];
        invoices: {
            id: string;
            invoiceNumber: string;
            grandTotal: Prisma.Decimal;
            pdfUrl: string | null;
            issuedAt: Date;
        }[];
        packages: ({
            shipment: {
                id: string;
                status: import(".prisma/client").$Enums.ShipmentStatus;
                shipmentNumber: string;
                courierName: string;
                awbNumber: string;
                trackingUrl: string | null;
                dispatchedAt: Date | null;
                deliveredAt: Date | null;
            } | null;
        } & {
            id: string;
            status: import(".prisma/client").$Enums.PackageStatus;
            createdAt: Date;
            updatedAt: Date;
            orderId: string;
            packageNumber: string;
            sequenceNumber: number;
            totalPackages: number;
            grossWeightGrams: number;
            lengthCm: Prisma.Decimal;
            widthCm: Prisma.Decimal;
            heightCm: Prisma.Decimal;
            labelUrl: string | null;
            barcode: string;
            shipmentId: string | null;
        })[];
        statusHistory: ({
            changedBy: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            reason: string | null;
            department: import(".prisma/client").$Enums.Department | null;
            notes: string | null;
            fromStatus: import(".prisma/client").$Enums.OrderStatus | null;
            toStatus: import(".prisma/client").$Enums.OrderStatus;
            changedById: string | null;
            durationMinutes: number | null;
        })[];
        slaRecords: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            orderId: string;
            jobCardId: string | null;
            entityType: string;
            currentStatus: import(".prisma/client").$Enums.SlaStatus;
            targetDueAt: Date;
            isBreached: boolean;
            escalatedTo: string | null;
        }[];
        qcChecklists: ({
            inspector: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            createdAt: Date;
            items: Prisma.JsonValue;
            orderId: string;
            jobCardId: string | null;
            type: import(".prisma/client").$Enums.QCInspectionType;
            outcome: import(".prisma/client").$Enums.QCOutcome;
            inspectorId: string;
            defects: import(".prisma/client").$Enums.DefectCategory[];
            notes: string | null;
        })[];
        assignments: ({
            assignedUser: {
                id: string;
                fullName: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
                department: import(".prisma/client").$Enums.Department | null;
            };
            assignedByUser: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            createdAt: Date;
            updatedAt: Date;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            orderId: string;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
            completedAt: Date | null;
            reason: string | null;
        })[];
        operationalNotes: {
            id: string;
            createdAt: Date;
            orderId: string;
            authorId: string;
            authorName: string;
            authorRole: import(".prisma/client").$Enums.UserRole;
            content: string;
        }[];
        id: string;
        orderNumber: string;
        customerId: string;
        sourceChannel: import(".prisma/client").$Enums.OrderChannel;
        status: import(".prisma/client").$Enums.OrderStatus;
        customerStatus: import(".prisma/client").$Enums.CustomerVisibleStatus;
        deliveryMethod: import(".prisma/client").$Enums.DeliveryMethod;
        subtotal: Prisma.Decimal;
        taxAmount: Prisma.Decimal;
        shippingAmount: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        totalAmount: Prisma.Decimal;
        paidAmount: Prisma.Decimal;
        balanceAmount: Prisma.Decimal;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        priority: import(".prisma/client").$Enums.Priority;
        slaStatus: import(".prisma/client").$Enums.SlaStatus;
        dueAt: Date | null;
        customerNotes: string | null;
        internalNotes: string | null;
        shippingAddressId: string | null;
        billingAddressId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    assignDesigner(orderId: string, dto: AssignDesignerDto, user: JwtPayload): Promise<{
        assignedUser: {
            id: string;
            fullName: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        assignedByUser: {
            id: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.AssignmentStatus;
        createdAt: Date;
        updatedAt: Date;
        taskType: import(".prisma/client").$Enums.AssignmentTaskType;
        orderId: string;
        assignedUserId: string;
        assignedByUserId: string;
        assignedAt: Date;
        completedAt: Date | null;
        reason: string | null;
    }>;
    assignProductionOperator(orderId: string, dto: AssignProductionOperatorDto, user: JwtPayload): Promise<{
        assignedUser: {
            id: string;
            fullName: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        assignedByUser: {
            id: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.AssignmentStatus;
        createdAt: Date;
        updatedAt: Date;
        taskType: import(".prisma/client").$Enums.AssignmentTaskType;
        orderId: string;
        assignedUserId: string;
        assignedByUserId: string;
        assignedAt: Date;
        completedAt: Date | null;
        reason: string | null;
    }>;
    addOperationalNote(orderId: string, dto: CreateOperationalNoteDto, user: JwtPayload): Promise<{
        id: string;
        createdAt: Date;
        orderId: string;
        authorId: string;
        authorName: string;
        authorRole: import(".prisma/client").$Enums.UserRole;
        content: string;
    }>;
    updateOrderPriority(orderId: string, dto: UpdatePriorityDto, user: JwtPayload): Promise<{
        id: string;
        orderNumber: string;
        priority: import(".prisma/client").$Enums.Priority;
    }>;
    getEligibleDesigners(): Promise<{
        id: string;
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        department: import(".prisma/client").$Enums.Department | null;
        isActive: boolean;
        activeAssignments: number;
    }[]>;
    getEligibleProductionOperators(): Promise<{
        id: string;
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        department: import(".prisma/client").$Enums.Department | null;
        isActive: boolean;
        activeJobCards: number;
        activeAssignments: number;
    }[]>;
    private getOperationalNextAction;
    private getBlockers;
    getOrderTimeline(orderId: string): Promise<{
        statusHistory: ({
            changedBy: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            reason: string | null;
            department: import(".prisma/client").$Enums.Department | null;
            notes: string | null;
            fromStatus: import(".prisma/client").$Enums.OrderStatus | null;
            toStatus: import(".prisma/client").$Enums.OrderStatus;
            changedById: string | null;
            durationMinutes: number | null;
        })[];
        auditLogs: ({
            actor: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            orderId: string | null;
            reason: string | null;
            actorId: string | null;
            actorType: string;
            action: string;
            entity: string;
            entityId: string;
            previousState: Prisma.JsonValue | null;
            newState: Prisma.JsonValue | null;
            ipAddress: string | null;
            userAgent: string | null;
        })[];
        assignments: ({
            assignedUser: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
            assignedByUser: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            createdAt: Date;
            updatedAt: Date;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            orderId: string;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
            completedAt: Date | null;
            reason: string | null;
        })[];
        notes: {
            id: string;
            createdAt: Date;
            orderId: string;
            authorId: string;
            authorName: string;
            authorRole: import(".prisma/client").$Enums.UserRole;
            content: string;
        }[];
    }>;
    parseDimensions(input: any): {
        widthMm: number;
        heightMm: number;
        rawText: string;
    } | null;
    validateArtworkSize(expectedSpecs: any, artwork: any): SizeValidationResult;
    getOrderReadiness(orderId: string): Promise<OrderReadinessReport>;
    releaseToProduction(orderId: string, dto: ReleaseToProductionDto, user: JwtPayload): Promise<{
        success: boolean;
        orderId: string;
        orderNumber: string;
        status: "PRODUCTION_QUEUE";
        sizeValidation: SizeValidationResult;
        jobCards: {
            id: string;
            status: import(".prisma/client").$Enums.JobCardStatus;
            priority: import(".prisma/client").$Enums.Priority;
            dueAt: Date;
            createdAt: Date;
            updatedAt: Date;
            orderId: string;
            approvedArtworkVersionId: string | null;
            orderItemId: string;
            completedAt: Date | null;
            jobNumber: string;
            preHoldStatus: import(".prisma/client").$Enums.JobCardStatus | null;
            currentStation: string;
            machineId: string | null;
            operatorId: string | null;
            operationSequence: Prisma.JsonValue;
            technicalSpecs: Prisma.JsonValue;
            startedAt: Date | null;
        }[];
        releasedBy: string;
    }>;
}
