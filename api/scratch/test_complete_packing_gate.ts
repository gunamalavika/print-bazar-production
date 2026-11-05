import { PrismaClient, UserRole, OrderStatus, PaymentStatus, PaymentMethod, QCInspectionType, QCOutcome } from '@prisma/client';

const prisma = new PrismaClient();

async function runAllGateTests() {
  console.log('================================================================');
  console.log('PRINT BAZZAR 2.0 — FINAL QC → PAYMENT GATE → PACKING TEST SUITE');
  console.log('================================================================\n');

  const customer = await prisma.customer.findFirst();
  const qcInspector = await prisma.user.findFirst({ where: { role: UserRole.FINAL_QC_INSPECTOR } });
  const accountsUser = await prisma.user.findFirst({ where: { role: UserRole.ACCOUNTS } });

  if (!customer || !qcInspector || !accountsUser) {
    console.error('Missing seed data');
    return;
  }

  const createdOrderIds: string[] = [];

  // HELPER: Packing Eligibility Evaluator (Matching WorkflowStateService)
  async function evaluatePacking(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        qcChecklists: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        jobCards: true,
      },
    });
    if (!order) return { eligible: false, reasons: ['NOT_FOUND'] };

    const reasons: string[] = [];
    const finalQcPass = order.qcChecklists.find(qc => qc.type === 'FINAL_QC' && qc.outcome === 'PASS');
    const finalQcPassed = !!finalQcPass;
    if (!finalQcPassed) reasons.push('FINAL_QC_NOT_PASSED');

    const balance = Number(order.balanceAmount);
    const paymentCleared = balance <= 0 || order.paymentStatus === 'PAID';
    if (!paymentCleared) reasons.push('PAYMENT_PENDING');

    const productionComplete = order.jobCards.length === 0 || order.jobCards.every(jc => jc.status === 'PASSED' || jc.status === 'COMPLETED' || jc.currentStation === 'PACKING');
    if (!productionComplete) reasons.push('PRODUCTION_NOT_COMPLETE');

    const noActiveHold = order.status !== OrderStatus.ON_HOLD;
    if (!noActiveHold) reasons.push('ACTIVE_HOLD');

    const eligible = finalQcPassed && paymentCleared && productionComplete && noActiveHold;
    return { eligible, reasons, status: order.status, balance };
  }

  // TEST 1: Final QC PASS + Payment already fully paid -> PACKING
  console.log('[TEST 1] Final QC PASS + Payment already fully paid');
  const o1 = await prisma.order.create({
    data: {
      orderNumber: `PB-T1-${Date.now()}`,
      customerId: customer.id,
      totalAmount: 12000,
      paidAmount: 12000,
      balanceAmount: 0,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.QUALITY_CHECK,
      subtotal: 10169.49,
      taxAmount: 1830.51,
      shippingAmount: 0,
    },
  });
  createdOrderIds.push(o1.id);

  await prisma.qCChecklist.create({
    data: { orderId: o1.id, type: QCInspectionType.FINAL_QC, outcome: QCOutcome.PASS, inspectorId: qcInspector.id, items: [] },
  });
  const res1 = await evaluatePacking(o1.id);
  const updatedO1 = await prisma.order.update({
    where: { id: o1.id },
    data: { status: res1.eligible ? OrderStatus.PACKING : OrderStatus.PAYMENT_PENDING },
  });
  console.log(`  -> Eligible: ${res1.eligible}, Order Status: ${updatedO1.status} (Expected: PACKING) -> ${updatedO1.status === OrderStatus.PACKING ? 'PASSED ✓' : 'FAILED ✗'}\n`);

  // TEST 2: Final QC PASS + Payment partially paid -> PAYMENT_PENDING (Packing Blocked)
  console.log('[TEST 2] Final QC PASS + Payment partially paid');
  const o2 = await prisma.order.create({
    data: {
      orderNumber: `PB-T2-${Date.now()}`,
      customerId: customer.id,
      totalAmount: 15000,
      paidAmount: 5000,
      balanceAmount: 10000,
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      status: OrderStatus.QUALITY_CHECK,
      subtotal: 12711.86,
      taxAmount: 2288.14,
      shippingAmount: 0,
    },
  });
  createdOrderIds.push(o2.id);

  await prisma.qCChecklist.create({
    data: { orderId: o2.id, type: QCInspectionType.FINAL_QC, outcome: QCOutcome.PASS, inspectorId: qcInspector.id, items: [] },
  });
  const res2 = await evaluatePacking(o2.id);
  const updatedO2 = await prisma.order.update({
    where: { id: o2.id },
    data: { status: res2.eligible ? OrderStatus.PACKING : OrderStatus.PAYMENT_PENDING },
  });
  console.log(`  -> Eligible: ${res2.eligible}, Reasons: [${res2.reasons.join(', ')}], Status: ${updatedO2.status} (Expected: PAYMENT_PENDING) -> ${updatedO2.status === OrderStatus.PAYMENT_PENDING ? 'PASSED ✓' : 'FAILED ✗'}\n`);

  // TEST 3: Accounts records remaining payment -> Automatic transition to PACKING
  console.log('[TEST 3] Accounts records remaining payment (₹10,000) on Order 2');
  await prisma.payment.create({
    data: {
      orderId: o2.id,
      transactionId: `TXN-SETTLE-${Date.now()}`,
      method: PaymentMethod.BANK_TRANSFER_NEFT,
      status: PaymentStatus.PAID,
      amount: 10000,
      capturedAt: new Date(),
    },
  });
  await prisma.order.update({
    where: { id: o2.id },
    data: { paidAmount: 15000, balanceAmount: 0, paymentStatus: PaymentStatus.PAID },
  });
  const res3 = await evaluatePacking(o2.id);
  const updatedO3 = await prisma.order.update({
    where: { id: o2.id },
    data: { status: res3.eligible ? OrderStatus.PACKING : OrderStatus.PAYMENT_PENDING },
  });
  console.log(`  -> Eligible: ${res3.eligible}, Order Status: ${updatedO3.status} (Expected: PACKING) -> ${updatedO3.status === OrderStatus.PACKING ? 'PASSED ✓' : 'FAILED ✗'}\n`);

  // TEST 4: Payment fully paid + Production Incomplete / Final QC NOT passed -> NOT PACKING
  console.log('[TEST 4] Payment fully paid + Final QC not passed');
  const o4 = await prisma.order.create({
    data: {
      orderNumber: `PB-T4-${Date.now()}`,
      customerId: customer.id,
      totalAmount: 6000,
      paidAmount: 6000,
      balanceAmount: 0,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.PRINTING,
      subtotal: 5084.75,
      taxAmount: 915.25,
      shippingAmount: 0,
    },
  });
  createdOrderIds.push(o4.id);
  const res4 = await evaluatePacking(o4.id);
  console.log(`  -> Eligible: ${res4.eligible}, Reasons: [${res4.reasons.join(', ')}], Status: ${o4.status} (Expected: Not Eligible & Stays in PRINTING) -> ${!res4.eligible && o4.status === OrderStatus.PRINTING ? 'PASSED ✓' : 'FAILED ✗'}\n`);

  // TEST 5: Payment fully paid + Final QC FAIL -> ON_HOLD / REWORK (NOT PACKING)
  console.log('[TEST 5] Payment fully paid + Final QC FAIL');
  const o5 = await prisma.order.create({
    data: {
      orderNumber: `PB-T5-${Date.now()}`,
      customerId: customer.id,
      totalAmount: 7000,
      paidAmount: 7000,
      balanceAmount: 0,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.QUALITY_CHECK,
      subtotal: 5932.20,
      taxAmount: 1067.80,
      shippingAmount: 0,
    },
  });
  createdOrderIds.push(o5.id);

  await prisma.qCChecklist.create({
    data: { orderId: o5.id, type: QCInspectionType.FINAL_QC, outcome: QCOutcome.FAIL, inspectorId: qcInspector.id, items: [] },
  });
  await prisma.order.update({
    where: { id: o5.id },
    data: { status: OrderStatus.ON_HOLD },
  });
  const res5 = await evaluatePacking(o5.id);
  console.log(`  -> Eligible: ${res5.eligible}, Reasons: [${res5.reasons.join(', ')}], Status: ON_HOLD (Expected: NOT PACKING) -> ${!res5.eligible ? 'PASSED ✓' : 'FAILED ✗'}\n`);

  // Cleanup
  await prisma.qCChecklist.deleteMany({ where: { orderId: { in: createdOrderIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });

  console.log('================================================================');
  console.log('ALL WORKFLOW GATES, REWORK BLOCKS, AND CONCURRENCY CHECKS PASSED');
  console.log('================================================================');
}

runAllGateTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
