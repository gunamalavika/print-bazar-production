export declare class BaseDomainEvent {
    readonly actorId?: string | undefined;
    occurredAt: Date;
    constructor(actorId?: string | undefined);
}
export declare class OrderCreatedEvent extends BaseDomainEvent {
    readonly orderId: string;
    readonly orderNumber: string;
    readonly customerId: string;
    readonly totalAmount: number;
    constructor(orderId: string, orderNumber: string, customerId: string, totalAmount: number, actorId?: string);
}
export declare class PaymentConfirmedEvent extends BaseDomainEvent {
    readonly orderId: string;
    readonly transactionId: string;
    readonly amount: number;
    constructor(orderId: string, transactionId: string, amount: number, actorId?: string);
}
export declare class ArtworkUploadedEvent extends BaseDomainEvent {
    readonly orderItemId: string;
    readonly versionNumber: number;
    readonly storageKey: string;
    constructor(orderItemId: string, versionNumber: number, storageKey: string, actorId?: string);
}
export declare class ProofApprovedEvent extends BaseDomainEvent {
    readonly orderId: string;
    readonly orderItemId: string;
    readonly artworkVersionId: string;
    constructor(orderId: string, orderItemId: string, artworkVersionId: string, actorId?: string);
}
export declare class PreProductionQCPassedEvent extends BaseDomainEvent {
    readonly orderId: string;
    readonly checklistId: string;
    constructor(orderId: string, checklistId: string, actorId?: string);
}
export declare class PreProductionQCFailedEvent extends BaseDomainEvent {
    readonly orderId: string;
    readonly checklistId: string;
    readonly reason: string;
    constructor(orderId: string, checklistId: string, reason: string, actorId?: string);
}
export declare class JobCardCreatedEvent extends BaseDomainEvent {
    readonly jobCardId: string;
    readonly jobNumber: string;
    readonly orderId: string;
    readonly route: string;
    constructor(jobCardId: string, jobNumber: string, orderId: string, route: string, actorId?: string);
}
export declare class QCPassedEvent extends BaseDomainEvent {
    readonly orderId: string;
    readonly jobCardId: string;
    constructor(orderId: string, jobCardId: string, actorId?: string);
}
export declare class QCFailedEvent extends BaseDomainEvent {
    readonly orderId: string;
    readonly jobCardId: string;
    readonly defects: string[];
    constructor(orderId: string, jobCardId: string, defects: string[], actorId?: string);
}
export declare class PackingCompletedEvent extends BaseDomainEvent {
    readonly orderId: string;
    readonly packageCount: number;
    readonly totalWeightGrams: number;
    constructor(orderId: string, packageCount: number, totalWeightGrams: number, actorId?: string);
}
export declare class ShipmentCreatedEvent extends BaseDomainEvent {
    readonly orderId: string;
    readonly shipmentId: string;
    readonly awbNumber: string;
    readonly trackingUrl?: string | undefined;
    constructor(orderId: string, shipmentId: string, awbNumber: string, trackingUrl?: string | undefined, actorId?: string);
}
export declare class DispatchConfirmedEvent extends BaseDomainEvent {
    readonly orderId: string;
    readonly method: string;
    constructor(orderId: string, method: string, actorId?: string);
}
export declare class DeliveryConfirmedEvent extends BaseDomainEvent {
    readonly orderId: string;
    readonly receiverName?: string | undefined;
    constructor(orderId: string, receiverName?: string | undefined, actorId?: string);
}
export declare class SlaRiskDetectedEvent extends BaseDomainEvent {
    readonly orderId: string;
    readonly jobCardId?: string | undefined;
    readonly dueAt?: Date | undefined;
    constructor(orderId: string, jobCardId?: string | undefined, dueAt?: Date | undefined, actorId?: string);
}
