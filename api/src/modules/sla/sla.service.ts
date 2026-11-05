import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SlaStatus, Priority } from '@prisma/client';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Monitor operational SLA health across active orders & production jobs
   */
  async getSlaOverview() {
    const now = new Date();

    const [allActiveOrders, activeJobCards, slaRecords] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          status: {
            notIn: ['DELIVERED', 'CANCELLED'],
          },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          priority: true,
          slaStatus: true,
          dueAt: true,
          createdAt: true,
        },
      }),
      this.prisma.jobCard.findMany({
        where: {
          status: {
            notIn: ['COMPLETED', 'PASSED'],
          },
        },
        select: {
          id: true,
          jobNumber: true,
          status: true,
          currentStation: true,
          dueAt: true,
        },
      }),
      this.prisma.slaRecord.findMany({
        where: { isBreached: true },
        include: { order: { select: { orderNumber: true, status: true, priority: true } } },
      }),
    ]);

    let onTimeCount = 0;
    let atRiskCount = 0;
    let delayedCount = 0;

    const delayedOrders = [];
    const atRiskOrders = [];

    for (const order of allActiveOrders) {
      if (!order.dueAt) {
        onTimeCount++;
        continue;
      }

      const diffMs = order.dueAt.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 0) {
        delayedCount++;
        delayedOrders.push(order);
      } else if (diffHours <= 12) {
        atRiskCount++;
        atRiskOrders.push(order);
      } else {
        onTimeCount++;
      }
    }

    return {
      metrics: {
        totalActiveOrders: allActiveOrders.length,
        activeJobCards: activeJobCards.length,
        onTime: onTimeCount,
        atRisk: atRiskCount,
        delayed: delayedCount,
        breachedCount: slaRecords.length,
      },
      delayedOrders,
      atRiskOrders,
    };
  }
}
