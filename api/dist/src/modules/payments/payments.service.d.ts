import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentMethod, Prisma } from '@prisma/client';
export interface CreatePaymentIntentDto {
    orderId: string;
    method?: PaymentMethod;
}
export interface VerifyPaymentDto {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}
export interface ManualPaymentDto {
    orderId: string;
    amount: number;
    method: PaymentMethod;
    referenceNumber: string;
    notes?: string;
}
export interface FinanceBoardFiltersDto {
    search?: string;
    paymentStatus?: string;
    method?: string;
    priority?: string;
}
import { WorkflowStateService } from '../workflow/workflow-state.service';
export declare class PaymentsService {
    private readonly prisma;
    private readonly auditService;
    private readonly eventEmitter;
    private readonly workflowState;
    private readonly logger;
    private readonly razorpayKeySecret;
    constructor(prisma: PrismaService, auditService: AuditService, eventEmitter: EventEmitter2, workflowState: WorkflowStateService);
    getFinanceBoard(filters: FinanceBoardFiltersDto): Promise<{
        metrics: {
            totalGrossBilling: number;
            gstCollected: number;
            settledAmount: number;
            pendingAmount: number;
            corporateCreditAmount: number;
            overdueAmount: number;
            collectionRate: number;
            pendingCount: number;
            corporateCount: number;
            settledCount: number;
            overdueCount: number;
        };
        cards: {
            id: string;
            orderId: string;
            orderNumber: string;
            customerName: string;
            customerEmail: string;
            customerPhone: string;
            productName: string;
            quantity: number;
            subtotal: number;
            taxAmount: number;
            totalAmount: number;
            paidAmount: number;
            balanceAmount: number;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
            financeStatus: string;
            finalQcPassed: boolean;
            packingBlocked: boolean;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            transactionId: string;
            invoiceNumber: string;
            invoicePdfUrl: string | null;
            priority: import(".prisma/client").$Enums.Priority;
            slaStatus: import(".prisma/client").$Enums.SlaStatus;
            createdAt: string;
            dueAt: string | undefined;
        }[];
    }>;
    createPaymentIntent(dto: CreatePaymentIntentDto, userId?: string): Promise<{
        paymentId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
    }>;
    verifyPayment(dto: VerifyPaymentDto, actorId?: string): Promise<{
        success: boolean;
        message: string;
        order?: undefined;
    } | {
        success: boolean;
        order: {
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
        };
        message?: undefined;
    }>;
    handleRazorpayWebhook(eventPayload: unknown, signatureHeader: string): Promise<{
        status: string;
    }>;
    recordManualPayment(dto: ManualPaymentDto, accountsUserId: string): Promise<{
        payment: {
            id: string;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PaymentStatus;
            amount: Prisma.Decimal;
            transactionId: string;
            razorpayOrderId: string | null;
            razorpayPaymentId: string | null;
            razorpaySignature: string | null;
            method: import(".prisma/client").$Enums.PaymentMethod;
            currency: string;
            idempotencyKey: string | null;
            capturedAt: Date | null;
            failureReason: string | null;
        };
        order: {
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
        };
        isAutoReleasedToPacking: boolean;
    }>;
}
