import { PrismaClient, JobCardStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.jobCard.updateMany({
    where: {
      order: {
        status: { in: ['PACKING', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED'] }
      },
      status: { not: JobCardStatus.COMPLETED }
    },
    data: {
      status: JobCardStatus.COMPLETED,
      currentStation: 'PACKING',
      completedAt: new Date()
    }
  });

  console.log(`Updated ${updated.count} job cards to COMPLETED.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
