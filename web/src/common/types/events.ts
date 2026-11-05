export class BaseDomainEvent {
  occurredAt: Date = new Date();
  constructor(public readonly actorId?: string) {}
}

export class OrderCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly totalAmount: number,
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class PaymentConfirmedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly transactionId: string,
    public readonly amount: number,
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class ArtworkUploadedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderItemId: string,
    public readonly versionNumber: number,
    public readonly storageKey: string,
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class ProofApprovedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderItemId: string,
    public readonly artworkVersionId: string,
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class PreProductionQCPassedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly checklistId: string,
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class PreProductionQCFailedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly checklistId: string,
    public readonly reason: string,
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class JobCardCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly jobCardId: string,
    public readonly jobNumber: string,
    public readonly orderId: string,
    public readonly route: string,
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class QCPassedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly jobCardId: string,
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class QCFailedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly jobCardId: string,
    public readonly defects: string[],
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class PackingCompletedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly packageCount: number,
    public readonly totalWeightGrams: number,
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class ShipmentCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly shipmentId: string,
    public readonly awbNumber: string,
    public readonly trackingUrl?: string,
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class DispatchConfirmedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly method: string,
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class DeliveryConfirmedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly receiverName?: string,
    actorId?: string,
  ) {
    super(actorId);
  }
}

export class SlaRiskDetectedEvent extends BaseDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly jobCardId?: string,
    public readonly dueAt?: Date,
    actorId?: string,
  ) {
    super(actorId);
  }
}
