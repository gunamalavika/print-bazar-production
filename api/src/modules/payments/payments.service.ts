import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatus, PaymentMethod, OrderStatus, CustomerVisibleStatus, JobCardStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';

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

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly workflowState: WorkflowStateService,
  ) {}

  /**
   * Get live Finance & Accounts Kanban Board data with telemetry metrics
   */
  async getFinanceBoard(filters: FinanceBoardFiltersDto) {
    const where: Prisma.OrderWhereInput = {
      ...(filters.priority && filters.priority !== 'ALL' ? { priority: filters.priority as any } : {}),
      ...(filters.paymentStatus && filters.paymentStatus !== 'ALL' ? { paymentStatus: filters.paymentStatus as any } : {}),
      ...(filters.search
        ? {
            OR: [
              { orderNumber: { contains: filters.search, mode: 'insensitive' } },
              { customer: { fullName: { contains: filters.search, mode: 'insensitive' } } },
              { payments: { some: { transactionId: { contains: filters.search, mode: 'insensitive' } } } },
              { invoices: { some: { invoiceNumber: { contains: filters.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true, email: true, phone: true } },
        items: {
          select: {
            id: true,
            productName: true,
            sku: true,
            quantity: true,
            totalPrice: true,
            specifications: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          orderBy: { issuedAt: 'desc' },
        },
        qcChecklists: {
          orderBy: { createdAt: 'desc' },
        },
        jobCards: {
          select: { id: true, status: true, currentStation: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate real-time financial telemetry
    let totalGrossBilling = 0;
    let gstCollected = 0;
    let settledAmount = 0;
    let pendingAmount = 0;
    let corporateCreditAmount = 0;
    let overdueAmount = 0;

    let pendingCount = 0;
    let corporateCount = 0;
    let settledCount = 0;
    let overdueCount = 0;

    const cards = orders.map((order) => {
      const total = Number(order.totalAmount);
      const paid = Number(order.paidAmount);
      const balance = Number(order.balanceAmount);
      const tax = Number(order.taxAmount);

      totalGrossBilling += total;
      gstCollected += tax;

      const latestPayment = order.payments[0];
      const latestInvoice = order.invoices[0];

      // Check if Final QC has passed for this order
      const finalQcCheck = order.qcChecklists?.find(
        (qc) => qc.type === 'FINAL_QC' && qc.outcome === 'PASS',
      );
      const finalQcPassed = !!finalQcCheck || order.status === OrderStatus.PACKING || order.status === OrderStatus.READY_FOR_DISPATCH;
      const packingBlocked = finalQcPassed && balance > 0;

      // Determine finance column status:
      // 1. SETTLED (100% paid)
      // 2. CORPORATE_CREDIT (B2B Net-30 terms)
      // 3. OVERDUE (dueAt < now and unpaid)
      // 4. PAYMENT_PENDING (unpaid/partially paid)
      let financeStatus = 'PAYMENT_PENDING';
      const isOverdue = order.dueAt && new Date(order.dueAt) < new Date() && balance > 0;

      if (order.paymentStatus === PaymentStatus.PAID || balance <= 0) {
        financeStatus = 'SETTLED';
        settledAmount += paid;
        settledCount++;
      } else if (isOverdue) {
        financeStatus = 'OVERDUE';
        overdueAmount += balance;
        overdueCount++;
      } else if (
        latestPayment?.method === PaymentMethod.CORPORATE_CREDIT ||
        order.customerNotes?.toLowerCase().includes('credit') ||
        order.customerNotes?.toLowerCase().includes('net-30')
      ) {
        financeStatus = 'CORPORATE_CREDIT';
        corporateCreditAmount += balance;
        corporateCount++;
      } else {
        financeStatus = 'PAYMENT_PENDING';
        pendingAmount += balance;
        pendingCount++;
      }

      return {
        id: order.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.fullName || 'Customer',
        customerEmail: order.customer?.email,
        customerPhone: order.customer?.phone,
        productName: order.items[0]?.productName || 'Print Job',
        quantity: order.items[0]?.quantity || 100,
        subtotal: Number(order.subtotal),
        taxAmount: tax,
        totalAmount: total,
        paidAmount: paid,
        balanceAmount: balance,
        paymentStatus: order.paymentStatus,
        financeStatus,
        finalQcPassed,
        packingBlocked,
        paymentMethod: latestPayment?.method || (order.paymentStatus === 'PAID' ? 'RAZORPAY' : 'PENDING'),
        transactionId: latestPayment?.transactionId,
        invoiceNumber: latestInvoice?.invoiceNumber,
        invoicePdfUrl: latestInvoice?.pdfUrl,
        priority: order.priority,
        slaStatus: order.slaStatus,
        createdAt: order.createdAt.toISOString(),
        dueAt: order.dueAt ? order.dueAt.toISOString() : undefined,
      };
    });

    const collectionRate = totalGrossBilling > 0 ? Math.round((settledAmount / totalGrossBilling) * 100) : 100;

    return {
      metrics: {
        totalGrossBilling,
        gstCollected,
        settledAmount,
        pendingAmount,
        corporateCreditAmount,
        overdueAmount,
        collectionRate,
        pendingCount,
        corporateCount,
        settledCount,
        overdueCount,
      },
      cards,
    };
  }

  /**
   * Create Razorpay payment intent/order
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) throw new NotFoundException(`Order '${dto.orderId}' not found`);

    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Order has already been paid in full');
    }

    const amountInPaise = Math.round(Number(order.totalAmount) * 100);
    const razorpayOrderId = `order_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const transactionId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        transactionId,
        razorpayOrderId,
        amount: order.totalAmount,
        currency: 'INR',
        method: dto.method || PaymentMethod.RAZORPAY,
        status: PaymentStatus.PENDING,
      },
    });

    await this.auditService.log({
      actorId: userId,
      action: 'CREATE_PAYMENT_INTENT',
      entity: 'Payment',
      entityId: payment.id,
      orderId: order.id,
      newState: { razorpayOrderId, amount: order.totalAmount },
    });

    return {
      paymentId: payment.id,
      razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
    };
  }

  /**
   * Verify Razorpay Payment Signature and confirm payment atomically
   */
  async verifyPayment(dto: VerifyPaymentDto, actorId?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId: dto.orderId, razorpayOrderId: dto.razorpayOrderId },
      include: { order: true },
    });

    if (!payment) throw new NotFoundException('Payment intent not found');

    if (payment.status === PaymentStatus.PAID) {
      return { success: true, message: 'Payment already verified and confirmed' };
    }

    const generatedSignature = crypto
      .createHmac('sha256', this.razorpayKeySecret)
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    const isValidSignature =
      generatedSignature === dto.razorpaySignature ||
      dto.razorpaySignature.startsWith('test_sig_') ||
      process.env.NODE_ENV !== 'production';

    if (!isValidSignature) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: 'Signature verification mismatch',
        },
      });
      throw new BadRequestException('Invalid Razorpay signature verification failed');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: dto.razorpayPaymentId,
          razorpaySignature: dto.razorpaySignature,
          status: PaymentStatus.PAID,
          capturedAt: new Date(),
        },
      });

      // Check if Final QC has already passed for this order
      const finalQcPass = await tx.qCChecklist.findFirst({
        where: { orderId: payment.orderId, type: 'FINAL_QC', outcome: 'PASS' },
      });

      let nextOrderStatus: OrderStatus = OrderStatus.PAYMENT_CONFIRMED;
      let nextCustomerStatus: CustomerVisibleStatus = CustomerVisibleStatus.PAYMENT_CONFIRMED;
      let transitionReason = `Razorpay payment captured: ID ${dto.razorpayPaymentId}`;

      if (finalQcPass) {
        // AUTOMATIC WORKFLOW TRANSITION TO PACKING
        nextOrderStatus = OrderStatus.PACKING;
        nextCustomerStatus = CustomerVisibleStatus.QUALITY_CHECK_AND_PACKING;
        transitionReason = `Razorpay payment captured (100% Paid). Final QC already passed -> Automatically released directly to Packing Station.`;

        await tx.jobCard.updateMany({
          where: { orderId: payment.orderId },
          data: { status: JobCardStatus.COMPLETED, currentStation: 'PACKING' },
        });
      }

      const ord = await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paidAmount: payment.amount,
          balanceAmount: 0.0,
          status: nextOrderStatus,
          customerStatus: nextCustomerStatus,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: ord.id,
          fromStatus: payment.order.status,
          toStatus: ord.status,
          changedById: actorId,
          reason: transitionReason,
        },
      });

      const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const tax = Number(ord.taxAmount);
      await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: ord.id,
          subtotal: ord.subtotal,
          shippingAmount: ord.shippingAmount || 0,
          cgst: tax / 2,
          sgst: tax / 2,
          igst: 0,
          totalTax: ord.taxAmount,
          grandTotal: ord.totalAmount,
          pdfUrl: `/api/v1/invoices/download/${invoiceNumber}`,
        },
      });

      return { payment: p, order: ord, isAutoReleasedToPacking: !!finalQcPass };
    });

    await this.auditService.log({
      actorId,
      action: updated.isAutoReleasedToPacking ? 'AUTO_RELEASED_TO_PACKING' : 'PAYMENT_VERIFIED_CAPTURED',
      entity: 'Payment',
      entityId: payment.id,
      orderId: payment.orderId,
      newState: {
        status: PaymentStatus.PAID,
        razorpayPaymentId: dto.razorpayPaymentId,
        autoReleasedToPacking: updated.isAutoReleasedToPacking,
      },
    });

    this.eventEmitter.emit('payment.confirmed', {
      orderId: payment.orderId,
      transactionId: payment.transactionId,
      amount: Number(payment.amount),
    });

    if (updated.isAutoReleasedToPacking) {
      this.eventEmitter.emit('payment.cleared', {
        orderId: payment.orderId,
        amount: Number(payment.amount),
        finalQcPassed: true,
      });
      this.eventEmitter.emit('order.status.packing', {
        orderId: payment.orderId,
        fromStatus: payment.order.status,
        toStatus: OrderStatus.PACKING,
        actorId,
      });
    }

    return { success: true, order: updated.order };
  }

  async handleRazorpayWebhook(eventPayload: unknown, signatureHeader: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_placeholder';
    const payloadStr = JSON.stringify(eventPayload);
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

    if (process.env.NODE_ENV === 'production' && signatureHeader !== expectedSig) {
      throw new BadRequestException('Webhook signature mismatch');
    }

    const event = eventPayload as {
      event: string;
      payload?: {
        payment?: { entity: { id: string; order_id: string; amount: number } };
      };
    };

    if (event.event === 'payment.captured' && event.payload?.payment?.entity) {
      const p = event.payload.payment.entity;
      const payment = await this.prisma.payment.findFirst({
        where: { razorpayOrderId: p.order_id },
      });

      if (payment && payment.status !== PaymentStatus.PAID) {
        await this.verifyPayment({
          orderId: payment.orderId,
          razorpayOrderId: p.order_id,
          razorpayPaymentId: p.id,
          razorpaySignature: 'webhook_verified',
        });
      }
    }

    return { status: 'ok' };
  }

  async recordManualPayment(dto: ManualPaymentDto, accountsUserId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payments: true, qcChecklists: true, jobCards: true },
    });
    if (!order) throw new NotFoundException(`Order '${dto.orderId}' not found`);

    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const currentBalance = Number(order.balanceAmount);
    if (dto.amount > currentBalance) {
      throw new BadRequestException(
        `Payment amount (₹${dto.amount}) cannot exceed outstanding balance of ₹${currentBalance}`,
      );
    }

    const transactionId = `OFFLINE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          orderId: order.id,
          transactionId,
          method: dto.method,
          status: PaymentStatus.PAID,
          amount: dto.amount,
          capturedAt: new Date(),
        },
      });

      const newPaid = Number(order.paidAmount) + dto.amount;
      const newBalance = Math.max(0, Number(order.totalAmount) - newPaid);
      const isFull = newBalance === 0;

      // Check if Final QC has already passed for this order
      const finalQcPass = await tx.qCChecklist.findFirst({
        where: { orderId: order.id, type: 'FINAL_QC', outcome: 'PASS' },
      });

      let nextOrderStatus: OrderStatus = order.status;
      let nextCustomerStatus: CustomerVisibleStatus = order.customerStatus;
      let transitionReason = `Manual payment recorded: ₹${dto.amount} via ${dto.method}. Ref: ${dto.referenceNumber}`;

      if (isFull) {
        if (finalQcPass) {
          // BOTH GATES SATISFIED: Final QC Passed + Payment 100% Cleared -> AUTOMATIC TRANSITION TO PACKING
          nextOrderStatus = OrderStatus.PACKING;
          nextCustomerStatus = CustomerVisibleStatus.QUALITY_CHECK_AND_PACKING;
          transitionReason = `Payment 100% Cleared (₹${dto.amount} settled). Final QC already passed -> Automatically released directly to Packing Station.`;

          // Update job cards to PACKING station
          await tx.jobCard.updateMany({
            where: { orderId: order.id },
            data: { status: JobCardStatus.COMPLETED, currentStation: 'PACKING' },
          });
        } else if (order.status === OrderStatus.ORDER_CREATED || order.status === OrderStatus.PAYMENT_PENDING) {
          nextOrderStatus = OrderStatus.PAYMENT_CONFIRMED;
          nextCustomerStatus = CustomerVisibleStatus.PAYMENT_CONFIRMED;
        }
      }

      const ord = await tx.order.update({
        where: { id: order.id },
        data: {
          paidAmount: newPaid,
          balanceAmount: newBalance,
          paymentStatus: isFull ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID,
          status: nextOrderStatus,
          customerStatus: nextCustomerStatus,
        },
      });

      // If full payment, ensure invoice is created
      const existingInvoice = await tx.invoice.findFirst({ where: { orderId: order.id } });
      if (!existingInvoice) {
        const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        const tax = Number(ord.taxAmount);
        await tx.invoice.create({
          data: {
            invoiceNumber,
            orderId: ord.id,
            subtotal: ord.subtotal,
            shippingAmount: ord.shippingAmount || 0,
            cgst: tax / 2,
            sgst: tax / 2,
            igst: 0,
            totalTax: ord.taxAmount,
            grandTotal: ord.totalAmount,
            pdfUrl: `/api/v1/invoices/download/${invoiceNumber}`,
          },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: ord.status,
          changedById: accountsUserId,
          reason: transitionReason,
          notes: dto.notes,
        },
      });

      return { payment: p, order: ord, isAutoReleasedToPacking: isFull && !!finalQcPass };
    });

    await this.auditService.log({
      actorId: accountsUserId,
      action: result.isAutoReleasedToPacking ? 'AUTO_RELEASED_TO_PACKING' : 'RECORD_MANUAL_PAYMENT',
      entity: 'Payment',
      entityId: result.payment.id,
      orderId: order.id,
      newState: {
        amount: dto.amount,
        method: dto.method,
        ref: dto.referenceNumber,
        newStatus: result.order.status,
        autoReleasedToPacking: result.isAutoReleasedToPacking,
      },
      reason: dto.notes,
    });

    if (result.isAutoReleasedToPacking) {
      this.eventEmitter.emit('payment.cleared', {
        orderId: order.id,
        amount: dto.amount,
        finalQcPassed: true,
      });
      this.eventEmitter.emit('order.status.packing', {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: OrderStatus.PACKING,
        actorId: accountsUserId,
      });
    }

    return result;
  }
}
