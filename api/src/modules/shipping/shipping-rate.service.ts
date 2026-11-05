import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateShippingRateCardDto,
  UpdateShippingRateCardDto,
  WeightSlabInputDto,
} from './dto/shipping.dto';

@Injectable()
export class ShippingRateService {
  private readonly logger = new Logger(ShippingRateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private validateSlabs(slabs: WeightSlabInputDto[]) {
    if (!slabs || slabs.length === 0) {
      throw new BadRequestException('At least one weight slab is required for a rate card');
    }

    // Sort by minWeightGrams
    const sorted = [...slabs].sort((a, b) => a.minWeightGrams - b.minWeightGrams);

    for (let i = 0; i < sorted.length; i++) {
      const slab = sorted[i];
      if (slab.minWeightGrams < 0 || slab.maxWeightGrams <= slab.minWeightGrams) {
        throw new BadRequestException(
          `Invalid weight slab range: ${slab.minWeightGrams}g to ${slab.maxWeightGrams}g. Max weight must be greater than min weight.`,
        );
      }
      if (slab.rate < 0) {
        throw new BadRequestException(`Slab rate cannot be negative: ₹${slab.rate}`);
      }

      // Check overlap or gaps with previous slab
      if (i > 0) {
        const prev = sorted[i - 1];
        if (slab.minWeightGrams < prev.maxWeightGrams) {
          throw new BadRequestException(
            `Overlapping weight slabs detected: [${prev.minWeightGrams}g - ${prev.maxWeightGrams}g] overlaps with [${slab.minWeightGrams}g - ${slab.maxWeightGrams}g]`,
          );
        }
      }
    }
    return sorted;
  }

  async listRateCards(zoneId?: string, isActive?: boolean) {
    const where: any = {};
    if (zoneId) where.zoneId = zoneId;
    if (isActive !== undefined) where.isActive = isActive;

    const cards = await this.prisma.shippingRateCard.findMany({
      where,
      include: {
        zone: {
          select: {
            id: true,
            zoneCode: true,
            zoneName: true,
          },
        },
        slabs: {
          orderBy: { minWeightGrams: 'asc' },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return cards.map((c) => ({
      ...c,
      minShippingCharge: Number(c.minShippingCharge),
      additionalWeightPerKg: Number(c.additionalWeightPerKg),
      slabs: c.slabs.map((s) => ({
        ...s,
        rate: Number(s.rate),
      })),
    }));
  }

  async getRateCard(id: string) {
    const card = await this.prisma.shippingRateCard.findUnique({
      where: { id },
      include: {
        zone: true,
        slabs: {
          orderBy: { minWeightGrams: 'asc' },
        },
      },
    });

    if (!card) {
      throw new NotFoundException(`Rate card with ID '${id}' not found`);
    }

    return {
      ...card,
      minShippingCharge: Number(card.minShippingCharge),
      additionalWeightPerKg: Number(card.additionalWeightPerKg),
      slabs: card.slabs.map((s) => ({
        ...s,
        rate: Number(s.rate),
      })),
    };
  }

  async createRateCard(dto: CreateShippingRateCardDto, actorId?: string) {
    const zone = await this.prisma.shippingZone.findUnique({ where: { id: dto.zoneId } });
    if (!zone) {
      throw new BadRequestException(`Zone with ID '${dto.zoneId}' not found`);
    }

    const validatedSlabs = this.validateSlabs(dto.slabs);

    const card = await this.prisma.shippingRateCard.create({
      data: {
        name: dto.name.trim(),
        zoneId: dto.zoneId,
        minShippingCharge: dto.minShippingCharge ?? validatedSlabs[0].rate,
        additionalWeightPerKg: dto.additionalWeightPerKg ?? 25.0,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        isActive: dto.isActive ?? true,
        priority: dto.priority ?? 1,
        slabs: {
          create: validatedSlabs.map((s, idx) => ({
            minWeightGrams: s.minWeightGrams,
            maxWeightGrams: s.maxWeightGrams,
            rate: s.rate,
            sortOrder: s.sortOrder ?? idx + 1,
          })),
        },
      },
      include: {
        zone: true,
        slabs: { orderBy: { minWeightGrams: 'asc' } },
      },
    });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_RATE_CARD_CREATED',
      entity: 'ShippingRateCard',
      entityId: card.id,
      newState: card,
    });

    return {
      ...card,
      minShippingCharge: Number(card.minShippingCharge),
      additionalWeightPerKg: Number(card.additionalWeightPerKg),
      slabs: card.slabs.map((s) => ({ ...s, rate: Number(s.rate) })),
    };
  }

  async updateRateCard(id: string, dto: UpdateShippingRateCardDto, actorId?: string) {
    const existing = await this.prisma.shippingRateCard.findUnique({
      where: { id },
      include: { slabs: true },
    });

    if (!existing) {
      throw new NotFoundException(`Rate card with ID '${id}' not found`);
    }

    if (dto.zoneId) {
      const zone = await this.prisma.shippingZone.findUnique({ where: { id: dto.zoneId } });
      if (!zone) {
        throw new BadRequestException(`Zone with ID '${dto.zoneId}' not found`);
      }
    }

    let validatedSlabs: WeightSlabInputDto[] | undefined = undefined;
    if (dto.slabs) {
      validatedSlabs = this.validateSlabs(dto.slabs);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (validatedSlabs) {
        await tx.shippingWeightSlab.deleteMany({ where: { rateCardId: id } });
        await tx.shippingWeightSlab.createMany({
          data: validatedSlabs.map((s, idx) => ({
            rateCardId: id,
            minWeightGrams: s.minWeightGrams,
            maxWeightGrams: s.maxWeightGrams,
            rate: s.rate,
            sortOrder: s.sortOrder ?? idx + 1,
          })),
        });
      }

      return tx.shippingRateCard.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.zoneId ? { zoneId: dto.zoneId } : {}),
          ...(dto.minShippingCharge !== undefined ? { minShippingCharge: dto.minShippingCharge } : {}),
          ...(dto.additionalWeightPerKg !== undefined ? { additionalWeightPerKg: dto.additionalWeightPerKg } : {}),
          ...(dto.effectiveFrom !== undefined ? { effectiveFrom: new Date(dto.effectiveFrom) } : {}),
          ...(dto.effectiveTo !== undefined ? { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        },
        include: {
          zone: true,
          slabs: { orderBy: { minWeightGrams: 'asc' } },
        },
      });
    });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_RATE_CARD_UPDATED',
      entity: 'ShippingRateCard',
      entityId: id,
      previousState: existing,
      newState: updated,
    });

    return {
      ...updated,
      minShippingCharge: Number(updated.minShippingCharge),
      additionalWeightPerKg: Number(updated.additionalWeightPerKg),
      slabs: updated.slabs.map((s) => ({ ...s, rate: Number(s.rate) })),
    };
  }

  async deleteRateCard(id: string, actorId?: string) {
    const existing = await this.prisma.shippingRateCard.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Rate card with ID '${id}' not found`);
    }

    await this.prisma.shippingRateCard.delete({ where: { id } });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_RATE_CARD_DELETED',
      entity: 'ShippingRateCard',
      entityId: id,
      previousState: existing,
    });

    return { success: true, message: `Rate card '${existing.name}' deleted successfully` };
  }
}

