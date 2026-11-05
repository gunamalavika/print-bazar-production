import { PrismaClient, JobCardStatus } from '@prisma/client';
import { JobCardEngineService } from '../src/modules/job-cards/job-card-engine.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

const prisma = new PrismaClient();

async function main() {
  const prismaService = new PrismaService();
  await prismaService.$connect();
  const auditService = new AuditService(prismaService);
  const eventEmitter = new EventEmitter2();
  const engine = new JobCardEngineService(prismaService, auditService, eventEmitter);

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ['PRODUCTION_QUEUE', 'PRINTING', 'FINISHING', 'QUALITY_CHECK'] },
    },
    include: {
      items: {
        include: {
          jobCards: true,
        },
      },
    },
  });

  console.log(`Checking ${orders.length} in-production orders...`);

  for (const order of orders) {
    for (const item of order.items) {
      if (item.jobCards.length === 0) {
        try {
          const jc = await engine.generateJobCardForOrderItem(item.id);
          console.log(`Generated Job Card ${jc.jobNumber} for Order ${order.orderNumber}`);
        } catch (e: any) {
          console.error(`Failed to generate Job Card for Order ${order.orderNumber}:`, e.message);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
