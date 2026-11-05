import { PrismaClient } from '@prisma/client';
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

  const order = await prisma.order.findFirst({
    where: { orderNumber: { contains: '20261003-0004' } },
    include: { items: true },
  });

  if (!order) {
    console.log('Order not found');
    return;
  }

  for (const item of order.items) {
    try {
      const jc = await engine.generateJobCardForOrderItem(item.id);
      console.log('Successfully generated JC:', jc.jobNumber);
    } catch (e: any) {
      console.error('Failed to generate JC:', e.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
