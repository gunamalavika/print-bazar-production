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
            customer: {
                id: string;
                email: string;
                fullName: string;
                phone: string;
                companyName: string | null;
            };
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            jobCards: {
                id: string;
                status: import(".prisma/client").$Enums.JobCardStatus;
                jobNumber: string;
                currentStation: string;
                operatorId: string | null;
            }[];
            orderNumber: string;
            customerStatus: import(".prisma/client").$Enums.CustomerVisibleStatus;
            deliveryMethod: import(".prisma/client").$Enums.DeliveryMethod;
            totalAmount: Prisma.Decimal;
            paidAmount: Prisma.Decimal;
            balanceAmount: Prisma.Decimal;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
            priority: import(".prisma/client").$Enums.Priority;
            slaStatus: import(".prisma/client").$Enums.SlaStatus;
            dueAt: Date | null;
            items: {
                id: string;
                quantity: number;
                productName: string;
                specifications: Prisma.JsonValue;
                approvedArtworkVersionId: string | null;
                artworkVersions: {
                    id: string;
                    status: import(".prisma/client").$Enums.ArtworkStatus;
                    storageKey: string;
                    originalFileName: string;
                    versionNumber: number;
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
                email: string;
                fullName: string;
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
            reason: string | null;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            completedAt: Date | null;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
        }) | null;
        activeProductionAssignment: ({
            assignedUser: {
                id: string;
                email: string;
                fullName: string;
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
            reason: string | null;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            completedAt: Date | null;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
        }) | null;
        assignmentHistory: ({
            assignedUser: {
                id: string;
                email: string;
                fullName: string;
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
            reason: string | null;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            completedAt: Date | null;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
        })[];
        customer: {
            addresses: {
                id: string;
                createdAt: Date;
                phone: string;
                updatedAt: Date;
                customerId: string;
                isDefault: boolean;
                type: string;
                postalCode: string;
                contactName: string;
                street: string;
                landmark: string | null;
                city: string;
                state: string;
                country: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            email: string;
            fullName: string;
            phone: string;
            updatedAt: Date;
            companyName: string | null;
            gstin: string | null;
            userId: string | null;
        };
        operationalNotes: {
            id: string;
            createdAt: Date;
            orderId: string;
            content: string;
            authorId: string;
            authorName: string;
            authorRole: import(".prisma/client").$Enums.UserRole;
        }[];
        shippingAddress: {
            id: string;
            createdAt: Date;
            phone: string;
            updatedAt: Date;
            customerId: string;
            isDefault: boolean;
            type: string;
            postalCode: string;
            contactName: string;
            street: string;
            landmark: string | null;
            city: string;
            state: string;
            country: string;
        } | null;
        billingAddress: {
            id: string;
            createdAt: Date;
            phone: string;
            updatedAt: Date;
            customerId: string;
            isDefault: boolean;
            type: string;
            postalCode: string;
            contactName: string;
            street: string;
            landmark: string | null;
            city: string;
            state: string;
            country: string;
        } | null;
        items: ({
            product: {
                id: string;
                name: string;
                slug: string;
                sku: string;
            };
            artworkVersions: {
                id: string;
                createdAt: Date;
                status: import(".prisma/client").$Enums.ArtworkStatus;
                storageKey: string;
                orderItemId: string;
                customerNotes: string | null;
                originalFileName: string;
                versionNumber: number;
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
            jobCards: ({
                machine: {
                    id: string;
                    name: string;
                    code: string;
                    type: string;
                } | null;
                issues: {
                    id: string;
                    createdAt: Date;
                    description: string;
                    jobCardId: string;
                    isResolved: boolean;
                    reasonCode: string;
                    reportedBy: string;
                    resolvedBy: string | null;
                    resolvedAt: Date | null;
                }[];
                operator: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                orderId: string;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.JobCardStatus;
                approvedArtworkVersionId: string | null;
                orderItemId: string;
                priority: import(".prisma/client").$Enums.Priority;
                dueAt: Date;
                jobNumber: string;
                preHoldStatus: import(".prisma/client").$Enums.JobCardStatus | null;
                currentStation: string;
                machineId: string | null;
                operatorId: string | null;
                operationSequence: Prisma.JsonValue;
                technicalSpecs: Prisma.JsonValue;
                startedAt: Date | null;
                completedAt: Date | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            sku: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
            productId: string;
            totalPrice: Prisma.Decimal;
            productName: string;
            specifications: Prisma.JsonValue;
            personalizationData: Prisma.JsonValue | null;
            approvedArtworkVersionId: string | null;
            designNotes: string | null;
        })[];
        payments: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.PaymentStatus;
            amount: Prisma.Decimal;
            transactionId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            capturedAt: Date | null;
        }[];
        invoices: {
            id: string;
            grandTotal: Prisma.Decimal;
            invoiceNumber: string;
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
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PackageStatus;
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
            reason: string | null;
            createdAt: Date;
            orderId: string;
            department: import(".prisma/client").$Enums.Department | null;
            notes: string | null;
            fromStatus: import(".prisma/client").$Enums.OrderStatus | null;
            toStatus: import(".prisma/client").$Enums.OrderStatus;
            durationMinutes: number | null;
            changedById: string | null;
        })[];
        slaRecords: {
            id: string;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
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
            orderId: string;
            notes: string | null;
            type: import(".prisma/client").$Enums.QCInspectionType;
            items: Prisma.JsonValue;
            jobCardId: string | null;
            outcome: import(".prisma/client").$Enums.QCOutcome;
            inspectorId: string;
            defects: import(".prisma/client").$Enums.DefectCategory[];
        })[];
        assignments: ({
            assignedUser: {
                id: string;
                email: string;
                fullName: string;
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
            reason: string | null;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            completedAt: Date | null;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        orderNumber: string;
        sourceChannel: import(".prisma/client").$Enums.OrderChannel;
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
    }>;
    assignDesigner(orderId: string, dto: AssignDesignerDto, user: JwtPayload): Promise<{
        assignedUser: {
            id: string;
            email: string;
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
        reason: string | null;
        createdAt: Date;
        orderId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AssignmentStatus;
        completedAt: Date | null;
        taskType: import(".prisma/client").$Enums.AssignmentTaskType;
        assignedUserId: string;
        assignedByUserId: string;
        assignedAt: Date;
    }>;
    assignProductionOperator(orderId: string, dto: AssignProductionOperatorDto, user: JwtPayload): Promise<{
        assignedUser: {
            id: string;
            email: string;
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
        reason: string | null;
        createdAt: Date;
        orderId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AssignmentStatus;
        completedAt: Date | null;
        taskType: import(".prisma/client").$Enums.AssignmentTaskType;
        assignedUserId: string;
        assignedByUserId: string;
        assignedAt: Date;
    }>;
    addOperationalNote(orderId: string, dto: CreateOperationalNoteDto, user: JwtPayload): Promise<{
        id: string;
        createdAt: Date;
        orderId: string;
        content: string;
        authorId: string;
        authorName: string;
        authorRole: import(".prisma/client").$Enums.UserRole;
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
        department: import(".prisma/client").$Enums.Department | null;
        isActive: boolean;
        activeAssignments: number;
    }[]>;
    getEligibleProductionOperators(): Promise<{
        id: string;
        fullName: string;
        email: string;
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
            reason: string | null;
            createdAt: Date;
            orderId: string;
            department: import(".prisma/client").$Enums.Department | null;
            notes: string | null;
            fromStatus: import(".prisma/client").$Enums.OrderStatus | null;
            toStatus: import(".prisma/client").$Enums.OrderStatus;
            durationMinutes: number | null;
            changedById: string | null;
        })[];
        auditLogs: ({
            actor: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: string;
            actorType: string;
            action: string;
            entity: string;
            entityId: string;
            previousState: Prisma.JsonValue | null;
            newState: Prisma.JsonValue | null;
            reason: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            createdAt: Date;
            actorId: string | null;
            orderId: string | null;
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
            reason: string | null;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            completedAt: Date | null;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
        })[];
        notes: {
            id: string;
            createdAt: Date;
            orderId: string;
            content: string;
            authorId: string;
            authorName: string;
            authorRole: import(".prisma/client").$Enums.UserRole;
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
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.JobCardStatus;
            approvedArtworkVersionId: string | null;
            orderItemId: string;
            priority: import(".prisma/client").$Enums.Priority;
            dueAt: Date;
            jobNumber: string;
            preHoldStatus: import(".prisma/client").$Enums.JobCardStatus | null;
            currentStation: string;
            machineId: string | null;
            operatorId: string | null;
            operationSequence: Prisma.JsonValue;
            technicalSpecs: Prisma.JsonValue;
            startedAt: Date | null;
            completedAt: Date | null;
        }[];
        releasedBy: string;
    }>;
}
