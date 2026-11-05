import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          jobCards: true,
          artworkVersions: true,
        },
      },
      qcChecklists: true,
      jobCards: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('TOTAL ORDERS:', orders.length);
  for (const o of orders) {
    console.log({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paidAmount: o.paidAmount,
      totalAmount: o.totalAmount,
      balanceAmount: o.balanceAmount,
      qcChecklists: o.qcChecklists.map(q => `${q.type}:${q.outcome}`),
      jobCardsCount: o.jobCards.length,
      itemJobCardsCount: o.items.map(i => i.jobCards.length),
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
