import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateAuditLogDto {
  actorId?: string;
  actorType?: 'USER' | 'SYSTEM' | 'WEBHOOK' | 'WORKER';
  action: string;
  entity: string;
  entityId: string;
  previousState?: unknown;
  newState?: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  orderId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          actorId: dto.actorId,
          actorType: dto.actorType || 'USER',
          action: dto.action,
          entity: dto.entity,
          entityId: dto.entityId,
          previousState: dto.previousState as Prisma.InputJsonValue,
          newState: dto.newState as Prisma.InputJsonValue,
          reason: dto.reason,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          orderId: dto.orderId,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to record audit log: ${(err as Error).message}`, (err as Error).stack);
    }
  }

  async findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrder(orderId: string) {
    return this.prisma.auditLog.findMany({
      where: { orderId },
      include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
