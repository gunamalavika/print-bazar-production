import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobCardEngineService } from '../job-cards/job-card-engine.service';
import { QCInspectionType, DefectCategory, Prisma } from '@prisma/client';
export interface QCCheckItem {
    code: string;
    name: string;
    result: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
    notes?: string;
}
export interface SubmitQCDto {
    orderId: string;
    jobCardId?: string;
    type: QCInspectionType;
    items: QCCheckItem[];
    defects?: DefectCategory[];
    generalNotes?: string;
}
import { WorkflowStateService } from '../workflow/workflow-state.service';
export declare class QualityControlService {
    private readonly prisma;
    private readonly auditService;
    private readonly eventEmitter;
    private readonly jobCardEngine;
    private readonly workflowState;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService, eventEmitter: EventEmitter2, jobCardEngine: JobCardEngineService, workflowState: WorkflowStateService);
    submitInspection(dto: SubmitQCDto, inspectorId: string): Promise<{
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
    }>;
    getChecklistsForOrder(orderId: string): Promise<({
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
    })[]>;
    getFinalQCQueue(search?: string): Promise<({
        customer: {
            id: string;
            email: string;
            fullName: string;
            phone: string;
        };
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
        items: ({
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
        qcChecklists: {
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
        }[];
    } & {
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
    })[]>;
    getFinalQCTemplate(): QCCheckItem[];
}
