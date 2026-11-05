import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole, Department, JwtPayload } from '../../common/types/roles';
import { OrderStatus, Prisma } from '@prisma/client';
export interface TransitionRequestDto {
    orderId: string;
    targetStatus: OrderStatus;
    notes?: string;
    metadata?: Record<string, unknown>;
}
export interface ManagerOverrideRequestDto {
    orderId: string;
    targetStatus: OrderStatus;
    reason: string;
    notes?: string;
}
export interface TransitionRule {
    from: OrderStatus[];
    to: OrderStatus;
    allowedRoles: UserRole[];
    allowedDepartments?: Department[];
    requiresPayment?: boolean;
    requiresApprovedArtwork?: boolean;
    requiresQCPass?: boolean;
}
export declare class WorkflowStateService {
    private readonly prisma;
    private readonly auditService;
    private readonly eventEmitter;
    private readonly logger;
    private readonly transitionRules;
    constructor(prisma: PrismaService, auditService: AuditService, eventEmitter: EventEmitter2);
    transition(dto: TransitionRequestDto, user: JwtPayload): Promise<{
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
    managerOverride(dto: ManagerOverrideRequestDto, user: JwtPayload): Promise<{
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
    pauseOrder(orderId: string, reason: string, user: JwtPayload): Promise<{
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
    resumeOrder(orderId: string, preHoldStatus: OrderStatus, user: JwtPayload): Promise<{
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
    resolveInitialWorkflow(order: {
        paymentStatus?: string;
        paidAmount?: number | Prisma.Decimal;
        totalAmount?: number | Prisma.Decimal;
        items?: Array<{
            specifications?: any;
            selectedDesignService?: boolean;
        }>;
    }): OrderStatus;
    evaluatePackingEligibility(orderId: string, tx?: Prisma.TransactionClient): Promise<{
        eligible: boolean;
        reasons: string[];
        finalQcPassed: boolean;
        paymentCleared: boolean;
        productionComplete: boolean;
        noActiveHold: boolean;
        balanceAmount: number;
    }>;
    triggerPackingGate(orderId: string, actorId?: string, sourceEvent?: 'FINAL_QC_PASS' | 'PAYMENT_CLEARED' | 'MANUAL_SETTLEMENT'): Promise<{
        transitioned: boolean;
        newStatus: OrderStatus;
        evaluation: {
            eligible: boolean;
            reasons: string[];
            finalQcPassed: boolean;
            paymentCleared: boolean;
            balanceAmount: number;
        };
    }>;
}
