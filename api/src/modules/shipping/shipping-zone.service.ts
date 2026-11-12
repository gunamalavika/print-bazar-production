import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateShippingZoneDto, UpdateShippingZoneDto } from './dto/shipping.dto';

@Injectable()
export class ShippingZoneService {
  private readonly logger = new Logger(ShippingZoneService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listZones(search?: string, isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { zoneCode: { contains: q, mode: 'insensitive' } },
        { zoneName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const zones = await this.prisma.shippingZone.findMany({
      where,
      include: {
        _count: {
          select: {
            pincodes: true,
            rateCards: true,
          },
        },
        rateCards: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            minShippingCharge: true,
            additionalWeightPerKg: true,
            slabs: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return zones.map((z) => ({
      ...z,
      name: z.zoneName,
      baseSurcharge: Number(z.zoneSurcharge),
      shippingCharge: Number(z.shippingCharge),
      zoneSurcharge: Number(z.zoneSurcharge),
      pincodeCount: z._count.pincodes,
      rateCardCount: z._count.rateCards,
    }));
  }

  async getZone(id: string) {
    const zone = await this.prisma.shippingZone.findUnique({
      where: { id },
      include: {
        pincodes: {
          take: 100,
          orderBy: { pincode: 'asc' },
        },
        rateCards: {
          include: {
            slabs: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException(`Shipping zone with ID '${id}' not found`);
    }

    return {
      ...zone,
      name: zone.zoneName,
      baseSurcharge: Number(zone.zoneSurcharge),
      shippingCharge: Number(zone.shippingCharge),
      zoneSurcharge: Number(zone.zoneSurcharge),
    };
  }

  async createZone(dto: CreateShippingZoneDto, actorId?: string) {
    const cleanCode = dto.zoneCode.trim().toUpperCase().replace(/[\s-]+/g, '_');
    const existing = await this.prisma.shippingZone.findUnique({
      where: { zoneCode: cleanCode },
    });
    if (existing) {
      throw new ConflictException(`Zone code '${cleanCode}' is already in use`);
    }

    const zoneName = (dto.zoneName || dto.name || '').trim();
    if (!zoneName) {
      throw new BadRequestException('Zone name is required');
    }

    const surcharge = dto.zoneSurcharge !== undefined ? dto.zoneSurcharge : (dto.baseSurcharge !== undefined ? dto.baseSurcharge : 0);

    const zone = await this.prisma.shippingZone.create({
      data: {
        zoneCode: cleanCode,
        zoneName,
        description: dto.description?.trim(),
        pincodePrefix: dto.pincodePrefix?.trim(),
        shippingCharge: dto.shippingCharge ?? 100,
        zoneSurcharge: surcharge,
        estimatedDeliveryDays: dto.estimatedDeliveryDays?.trim(),
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_ZONE_CREATED',
      entity: 'ShippingZone',
      entityId: zone.id,
      newState: zone,
    });

    return {
      ...zone,
      name: zone.zoneName,
      baseSurcharge: Number(zone.zoneSurcharge),
    };
  }

  async updateZone(id: string, dto: UpdateShippingZoneDto, actorId?: string) {
    const existing = await this.prisma.shippingZone.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Shipping zone with ID '${id}' not found`);
    }

    if (dto.zoneCode) {
      const cleanCode = dto.zoneCode.trim().toUpperCase().replace(/[\s-]+/g, '_');
      if (cleanCode !== existing.zoneCode) {
        const dup = await this.prisma.shippingZone.findUnique({ where: { zoneCode: cleanCode } });
        if (dup) {
          throw new ConflictException(`Zone code '${cleanCode}' is already in use`);
        }
      }
    }

    const zoneName = dto.zoneName || dto.name;
    const surcharge = dto.zoneSurcharge !== undefined ? dto.zoneSurcharge : dto.baseSurcharge;

    const updated = await this.prisma.shippingZone.update({
      where: { id },
      data: {
        ...(dto.zoneCode ? { zoneCode: dto.zoneCode.trim().toUpperCase().replace(/[\s-]+/g, '_') } : {}),
        ...(zoneName ? { zoneName: zoneName.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
        ...(dto.pincodePrefix !== undefined ? { pincodePrefix: dto.pincodePrefix?.trim() } : {}),
        ...(dto.shippingCharge !== undefined ? { shippingCharge: dto.shippingCharge } : {}),
        ...(surcharge !== undefined ? { zoneSurcharge: surcharge } : {}),
        ...(dto.estimatedDeliveryDays !== undefined ? { estimatedDeliveryDays: dto.estimatedDeliveryDays?.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_ZONE_UPDATED',
      entity: 'ShippingZone',
      entityId: id,
      previousState: existing,
      newState: updated,
    });

    return {
      ...updated,
      name: updated.zoneName,
      baseSurcharge: Number(updated.zoneSurcharge),
    };
  }

  async deleteZone(id: string, actorId?: string) {
    const zone = await this.prisma.shippingZone.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            pincodes: true,
            rateCards: true,
          },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException(`Shipping zone with ID '${id}' not found`);
    }

    if (zone._count.pincodes > 0) {
      throw new BadRequestException(
        `Cannot delete zone '${zone.zoneName}' because it has ${zone._count.pincodes} active pincodes mapped. Reassign or delete them first.`,
      );
    }

    if (zone._count.rateCards > 0) {
      throw new BadRequestException(
        `Cannot delete zone '${zone.zoneName}' because it has ${zone._count.rateCards} associated rate cards. Delete or reassign the rate cards first.`,
      );
    }

    await this.prisma.shippingZone.delete({ where: { id } });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_ZONE_DELETED',
      entity: 'ShippingZone',
      entityId: id,
      previousState: zone,
    });

    return { success: true, message: `Zone '${zone.zoneName}' deleted successfully` };
  }
}

