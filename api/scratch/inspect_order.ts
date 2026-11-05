import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: { orderNumber: { contains: '20261003-0001' } },
    include: {
      items: true,
      jobCards: true,
      qcChecklists: true,
      payments: true,
    },
  });

  console.log('ORDER:', {
    id: order?.id,
    orderNumber: order?.orderNumber,
    status: order?.status,
    paymentStatus: order?.paymentStatus,
    paidAmount: order?.paidAmount,
    totalAmount: order?.totalAmount,
    balanceAmount: order?.balanceAmount,
  });

  console.log('JOB CARDS:', order?.jobCards.map(jc => ({
    id: jc.id,
    jobNumber: jc.jobNumber,
    status: jc.status,
    currentStation: jc.currentStation,
  })));

  console.log('QC CHECKLISTS:', order?.qcChecklists.map(qc => ({
    id: qc.id,
    type: qc.type,
    outcome: qc.outcome,
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
