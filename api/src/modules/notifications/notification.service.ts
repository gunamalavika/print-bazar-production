import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  @OnEvent('order.created')
  handleOrderCreated(event: { orderId: string; orderNumber: string; totalAmount: number }) {
    this.logger.log(`[Notification] Order Created: ${event.orderNumber} (₹${event.totalAmount}) -> Sent confirmation email to customer.`);
  }

  @OnEvent('payment.confirmed')
  handlePaymentConfirmed(event: { orderId: string; transactionId: string; amount: number }) {
    this.logger.log(`[Notification] Payment Confirmed: Order ${event.orderId}, Txn: ${event.transactionId}, ₹${event.amount} -> Sent receipt & pre-press alert.`);
  }

  @OnEvent('proof.ready')
  handleProofReady(event: { orderId: string; artworkVersionId: string }) {
    this.logger.log(`[Notification] Proof Ready for Order ${event.orderId} -> Sent approval request link to customer.`);
  }

  @OnEvent('proof.approved')
  handleProofApproved(event: { orderId: string; artworkVersionId: string }) {
    this.logger.log(`[Notification] Customer Proof Approved: Order ${event.orderId} -> Queued for OE Operational Review & Production Assignment.`);
  }

  @OnEvent('oe.designer.assigned')
  handleDesignerAssigned(event: { orderId: string; orderNumber: string; designerId: string; designerName: string }) {
    this.logger.log(`[Notification] Order ${event.orderNumber} assigned to Designer ${event.designerName} by OE.`);
  }

  @OnEvent('design.completed')
  handleDesignCompleted(event: { orderId: string; orderNumber: string; artworkVersionId: string }) {
    this.logger.log(`[Notification] Design completed for Order ${event.orderNumber} -> Returned to OE queue for review & assignment.`);
  }

  @OnEvent('oe.operator.assigned')
  handleOperatorAssigned(event: { orderId: string; orderNumber: string; operatorId: string; operatorName: string }) {
    this.logger.log(`[Notification] Order ${event.orderNumber} assigned to Production Operator ${event.operatorName} by OE. Released to Production Queue.`);
  }

  @OnEvent('qc.final_qc.pass')
  handleFinalQCPass(event: { orderId: string; jobCardId?: string }) {
    this.logger.log(`[Notification] Final QC Passed: Order ${event.orderId} -> Notified packaging station.`);
  }

  @OnEvent('qc.final_qc.fail')
  handleFinalQCFail(event: { orderId: string; jobCardId?: string }) {
    this.logger.warn(`[ALERT] Final QC Failed: Order ${event.orderId} -> Escalated to Production Manager.`);
  }

  @OnEvent('packing.completed')
  handlePackingCompleted(event: { orderId: string; packageCount: number }) {
    this.logger.log(`[Notification] Order ${event.orderId} packed (${event.packageCount} parcels) -> Alerted logistics team.`);
  }

  @OnEvent('dispatch.confirmed')
  handleDispatchConfirmed(event: { orderId: string; courierName: string }) {
    this.logger.log(`[Notification] Order ${event.orderId} dispatched via ${event.courierName} -> Sent tracking link to customer.`);
  }

  @OnEvent('delivery.confirmed')
  handleDeliveryConfirmed(event: { orderId: string; method: string }) {
    this.logger.log(`[Notification] Order ${event.orderId} delivered via ${event.method} -> Sent feedback request to customer.`);
  }
}
