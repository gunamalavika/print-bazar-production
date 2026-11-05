import { PaymentsService, CreatePaymentIntentDto, VerifyPaymentDto, ManualPaymentDto } from './payments.service';
import { JwtPayload } from '../../common/types/roles';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    getFinanceBoard(search?: string, paymentStatus?: string, method?: string, priority?: string): Promise<{
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
    createIntent(body: CreatePaymentIntentDto, user: JwtPayload): Promise<{
        paymentId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
    }>;
    verifyPayment(body: VerifyPaymentDto, user: JwtPayload): Promise<{
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
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            shippingAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            paidAmount: import("@prisma/client/runtime/library").Decimal;
            balanceAmount: import("@prisma/client/runtime/library").Decimal;
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
    handleWebhook(payload: unknown, signature: string): Promise<{
        status: string;
    }>;
    recordManualPayment(body: ManualPaymentDto, user: JwtPayload): Promise<{
        payment: {
            id: string;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PaymentStatus;
            amount: import("@prisma/client/runtime/library").Decimal;
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
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            shippingAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            paidAmount: import("@prisma/client/runtime/library").Decimal;
            balanceAmount: import("@prisma/client/runtime/library").Decimal;
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
