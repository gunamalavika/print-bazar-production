"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaRiskDetectedEvent = exports.DeliveryConfirmedEvent = exports.DispatchConfirmedEvent = exports.ShipmentCreatedEvent = exports.PackingCompletedEvent = exports.QCFailedEvent = exports.QCPassedEvent = exports.JobCardCreatedEvent = exports.PreProductionQCFailedEvent = exports.PreProductionQCPassedEvent = exports.ProofApprovedEvent = exports.ArtworkUploadedEvent = exports.PaymentConfirmedEvent = exports.OrderCreatedEvent = exports.BaseDomainEvent = void 0;
class BaseDomainEvent {
    actorId;
    occurredAt = new Date();
    constructor(actorId) {
        this.actorId = actorId;
    }
}
exports.BaseDomainEvent = BaseDomainEvent;
class OrderCreatedEvent extends BaseDomainEvent {
    orderId;
    orderNumber;
    customerId;
    totalAmount;
    constructor(orderId, orderNumber, customerId, totalAmount, actorId) {
        super(actorId);
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.customerId = customerId;
        this.totalAmount = totalAmount;
    }
}
exports.OrderCreatedEvent = OrderCreatedEvent;
class PaymentConfirmedEvent extends BaseDomainEvent {
    orderId;
    transactionId;
    amount;
    constructor(orderId, transactionId, amount, actorId) {
        super(actorId);
        this.orderId = orderId;
        this.transactionId = transactionId;
        this.amount = amount;
    }
}
exports.PaymentConfirmedEvent = PaymentConfirmedEvent;
class ArtworkUploadedEvent extends BaseDomainEvent {
    orderItemId;
    versionNumber;
    storageKey;
    constructor(orderItemId, versionNumber, storageKey, actorId) {
        super(actorId);
        this.orderItemId = orderItemId;
        this.versionNumber = versionNumber;
        this.storageKey = storageKey;
    }
}
exports.ArtworkUploadedEvent = ArtworkUploadedEvent;
class ProofApprovedEvent extends BaseDomainEvent {
    orderId;
    orderItemId;
    artworkVersionId;
    constructor(orderId, orderItemId, artworkVersionId, actorId) {
        super(actorId);
        this.orderId = orderId;
        this.orderItemId = orderItemId;
        this.artworkVersionId = artworkVersionId;
    }
}
exports.ProofApprovedEvent = ProofApprovedEvent;
class PreProductionQCPassedEvent extends BaseDomainEvent {
    orderId;
    checklistId;
    constructor(orderId, checklistId, actorId) {
        super(actorId);
        this.orderId = orderId;
        this.checklistId = checklistId;
    }
}
exports.PreProductionQCPassedEvent = PreProductionQCPassedEvent;
class PreProductionQCFailedEvent extends BaseDomainEvent {
    orderId;
    checklistId;
    reason;
    constructor(orderId, checklistId, reason, actorId) {
        super(actorId);
        this.orderId = orderId;
        this.checklistId = checklistId;
        this.reason = reason;
    }
}
exports.PreProductionQCFailedEvent = PreProductionQCFailedEvent;
class JobCardCreatedEvent extends BaseDomainEvent {
    jobCardId;
    jobNumber;
    orderId;
    route;
    constructor(jobCardId, jobNumber, orderId, route, actorId) {
        super(actorId);
        this.jobCardId = jobCardId;
        this.jobNumber = jobNumber;
        this.orderId = orderId;
        this.route = route;
    }
}
exports.JobCardCreatedEvent = JobCardCreatedEvent;
class QCPassedEvent extends BaseDomainEvent {
    orderId;
    jobCardId;
    constructor(orderId, jobCardId, actorId) {
        super(actorId);
        this.orderId = orderId;
        this.jobCardId = jobCardId;
    }
}
exports.QCPassedEvent = QCPassedEvent;
class QCFailedEvent extends BaseDomainEvent {
    orderId;
    jobCardId;
    defects;
    constructor(orderId, jobCardId, defects, actorId) {
        super(actorId);
        this.orderId = orderId;
        this.jobCardId = jobCardId;
        this.defects = defects;
    }
}
exports.QCFailedEvent = QCFailedEvent;
class PackingCompletedEvent extends BaseDomainEvent {
    orderId;
    packageCount;
    totalWeightGrams;
    constructor(orderId, packageCount, totalWeightGrams, actorId) {
        super(actorId);
        this.orderId = orderId;
        this.packageCount = packageCount;
        this.totalWeightGrams = totalWeightGrams;
    }
}
exports.PackingCompletedEvent = PackingCompletedEvent;
class ShipmentCreatedEvent extends BaseDomainEvent {
    orderId;
    shipmentId;
    awbNumber;
    trackingUrl;
    constructor(orderId, shipmentId, awbNumber, trackingUrl, actorId) {
        super(actorId);
        this.orderId = orderId;
        this.shipmentId = shipmentId;
        this.awbNumber = awbNumber;
        this.trackingUrl = trackingUrl;
    }
}
exports.ShipmentCreatedEvent = ShipmentCreatedEvent;
class DispatchConfirmedEvent extends BaseDomainEvent {
    orderId;
    method;
    constructor(orderId, method, actorId) {
        super(actorId);
        this.orderId = orderId;
        this.method = method;
    }
}
exports.DispatchConfirmedEvent = DispatchConfirmedEvent;
class DeliveryConfirmedEvent extends BaseDomainEvent {
    orderId;
    receiverName;
    constructor(orderId, receiverName, actorId) {
        super(actorId);
        this.orderId = orderId;
        this.receiverName = receiverName;
    }
}
exports.DeliveryConfirmedEvent = DeliveryConfirmedEvent;
class SlaRiskDetectedEvent extends BaseDomainEvent {
    orderId;
    jobCardId;
    dueAt;
    constructor(orderId, jobCardId, dueAt, actorId) {
        super(actorId);
        this.orderId = orderId;
        this.jobCardId = jobCardId;
        this.dueAt = dueAt;
    }
}
exports.SlaRiskDetectedEvent = SlaRiskDetectedEvent;
//# sourceMappingURL=events.js.map