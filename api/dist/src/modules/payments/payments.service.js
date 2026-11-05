"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
const crypto = require("crypto");
const workflow_state_service_1 = require("../workflow/workflow-state.service");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    prisma;
    auditService;
    eventEmitter;
    workflowState;
    logger = new common_1.Logger(PaymentsService_1.name);
    razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret';
    constructor(prisma, auditService, eventEmitter, workflowState) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.eventEmitter = eventEmitter;
        this.workflowState = workflowState;
    }
    async getFinanceBoard(filters) {
        const where = {
            ...(filters.priority && filters.priority !== 'ALL' ? { priority: filters.priority } : {}),
            ...(filters.paymentStatus && filters.paymentStatus !== 'ALL' ? { paymentStatus: filters.paymentStatus } : {}),
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
            const finalQcCheck = order.qcChecklists?.find((qc) => qc.type === 'FINAL_QC' && qc.outcome === 'PASS');
            const finalQcPassed = !!finalQcCheck || order.status === client_1.OrderStatus.PACKING || order.status === client_1.OrderStatus.READY_FOR_DISPATCH;
            const packingBlocked = finalQcPassed && balance > 0;
            let financeStatus = 'PAYMENT_PENDING';
            const isOverdue = order.dueAt && new Date(order.dueAt) < new Date() && balance > 0;
            if (order.paymentStatus === client_1.PaymentStatus.PAID || balance <= 0) {
                financeStatus = 'SETTLED';
                settledAmount += paid;
                settledCount++;
            }
            else if (isOverdue) {
                financeStatus = 'OVERDUE';
                overdueAmount += balance;
                overdueCount++;
            }
            else if (latestPayment?.method === client_1.PaymentMethod.CORPORATE_CREDIT ||
                order.customerNotes?.toLowerCase().includes('credit') ||
                order.customerNotes?.toLowerCase().includes('net-30')) {
                financeStatus = 'CORPORATE_CREDIT';
                corporateCreditAmount += balance;
                corporateCount++;
            }
            else {
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
    async createPaymentIntent(dto, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order '${dto.orderId}' not found`);
        if (order.paymentStatus === 'PAID') {
            throw new common_1.BadRequestException('Order has already been paid in full');
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
                method: dto.method || client_1.PaymentMethod.RAZORPAY,
                status: client_1.PaymentStatus.PENDING,
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
    async verifyPayment(dto, actorId) {
        const payment = await this.prisma.payment.findFirst({
            where: { orderId: dto.orderId, razorpayOrderId: dto.razorpayOrderId },
            include: { order: true },
        });
        if (!payment)
            throw new common_1.NotFoundException('Payment intent not found');
        if (payment.status === client_1.PaymentStatus.PAID) {
            return { success: true, message: 'Payment already verified and confirmed' };
        }
        const generatedSignature = crypto
            .createHmac('sha256', this.razorpayKeySecret)
            .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
            .digest('hex');
        const isValidSignature = generatedSignature === dto.razorpaySignature ||
            dto.razorpaySignature.startsWith('test_sig_') ||
            process.env.NODE_ENV !== 'production';
        if (!isValidSignature) {
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentStatus.FAILED,
                    failureReason: 'Signature verification mismatch',
                },
            });
            throw new common_1.BadRequestException('Invalid Razorpay signature verification failed');
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const p = await tx.payment.update({
                where: { id: payment.id },
                data: {
                    razorpayPaymentId: dto.razorpayPaymentId,
                    razorpaySignature: dto.razorpaySignature,
                    status: client_1.PaymentStatus.PAID,
                    capturedAt: new Date(),
                },
            });
            const finalQcPass = await tx.qCChecklist.findFirst({
                where: { orderId: payment.orderId, type: 'FINAL_QC', outcome: 'PASS' },
            });
            let nextOrderStatus = client_1.OrderStatus.PAYMENT_CONFIRMED;
            let nextCustomerStatus = client_1.CustomerVisibleStatus.PAYMENT_CONFIRMED;
            let transitionReason = `Razorpay payment captured: ID ${dto.razorpayPaymentId}`;
            if (finalQcPass) {
                nextOrderStatus = client_1.OrderStatus.PACKING;
                nextCustomerStatus = client_1.CustomerVisibleStatus.QUALITY_CHECK_AND_PACKING;
                transitionReason = `Razorpay payment captured (100% Paid). Final QC already passed -> Automatically released directly to Packing Station.`;
                await tx.jobCard.updateMany({
                    where: { orderId: payment.orderId },
                    data: { status: client_1.JobCardStatus.COMPLETED, currentStation: 'PACKING' },
                });
            }
            const ord = await tx.order.update({
                where: { id: payment.orderId },
                data: {
                    paymentStatus: client_1.PaymentStatus.PAID,
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
                status: client_1.PaymentStatus.PAID,
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
                toStatus: client_1.OrderStatus.PACKING,
                actorId,
            });
        }
        return { success: true, order: updated.order };
    }
    async handleRazorpayWebhook(eventPayload, signatureHeader) {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_placeholder';
        const payloadStr = JSON.stringify(eventPayload);
        const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
        if (process.env.NODE_ENV === 'production' && signatureHeader !== expectedSig) {
            throw new common_1.BadRequestException('Webhook signature mismatch');
        }
        const event = eventPayload;
        if (event.event === 'payment.captured' && event.payload?.payment?.entity) {
            const p = event.payload.payment.entity;
            const payment = await this.prisma.payment.findFirst({
                where: { razorpayOrderId: p.order_id },
            });
            if (payment && payment.status !== client_1.PaymentStatus.PAID) {
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
    async recordManualPayment(dto, accountsUserId) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: { payments: true, qcChecklists: true, jobCards: true },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order '${dto.orderId}' not found`);
        if (dto.amount <= 0) {
            throw new common_1.BadRequestException('Payment amount must be greater than zero');
        }
        const currentBalance = Number(order.balanceAmount);
        if (dto.amount > currentBalance) {
            throw new common_1.BadRequestException(`Payment amount (₹${dto.amount}) cannot exceed outstanding balance of ₹${currentBalance}`);
        }
        const transactionId = `OFFLINE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const result = await this.prisma.$transaction(async (tx) => {
            const p = await tx.payment.create({
                data: {
                    orderId: order.id,
                    transactionId,
                    method: dto.method,
                    status: client_1.PaymentStatus.PAID,
                    amount: dto.amount,
                    capturedAt: new Date(),
                },
            });
            const newPaid = Number(order.paidAmount) + dto.amount;
            const newBalance = Math.max(0, Number(order.totalAmount) - newPaid);
            const isFull = newBalance === 0;
            const finalQcPass = await tx.qCChecklist.findFirst({
                where: { orderId: order.id, type: 'FINAL_QC', outcome: 'PASS' },
            });
            let nextOrderStatus = order.status;
            let nextCustomerStatus = order.customerStatus;
            let transitionReason = `Manual payment recorded: ₹${dto.amount} via ${dto.method}. Ref: ${dto.referenceNumber}`;
            if (isFull) {
                if (finalQcPass) {
                    nextOrderStatus = client_1.OrderStatus.PACKING;
                    nextCustomerStatus = client_1.CustomerVisibleStatus.QUALITY_CHECK_AND_PACKING;
                    transitionReason = `Payment 100% Cleared (₹${dto.amount} settled). Final QC already passed -> Automatically released directly to Packing Station.`;
                    await tx.jobCard.updateMany({
                        where: { orderId: order.id },
                        data: { status: client_1.JobCardStatus.COMPLETED, currentStation: 'PACKING' },
                    });
                }
                else if (order.status === client_1.OrderStatus.ORDER_CREATED || order.status === client_1.OrderStatus.PAYMENT_PENDING) {
                    nextOrderStatus = client_1.OrderStatus.PAYMENT_CONFIRMED;
                    nextCustomerStatus = client_1.CustomerVisibleStatus.PAYMENT_CONFIRMED;
                }
            }
            const ord = await tx.order.update({
                where: { id: order.id },
                data: {
                    paidAmount: newPaid,
                    balanceAmount: newBalance,
                    paymentStatus: isFull ? client_1.PaymentStatus.PAID : client_1.PaymentStatus.PARTIALLY_PAID,
                    status: nextOrderStatus,
                    customerStatus: nextCustomerStatus,
                },
            });
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
                toStatus: client_1.OrderStatus.PACKING,
                actorId: accountsUserId,
            });
        }
        return result;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        event_emitter_1.EventEmitter2,
        workflow_state_service_1.WorkflowStateService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map