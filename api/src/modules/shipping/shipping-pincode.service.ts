import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateShippingPincodeDto,
  UpdateShippingPincodeDto,
  BulkImportPincodesDto,
} from './dto/shipping.dto';

@Injectable()
export class ShippingPincodeService {
  private readonly logger = new Logger(ShippingPincodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listPincodes(query: {
    search?: string;
    pincode?: string;
    city?: string;
    state?: string;
    zoneId?: string;
    isServiceable?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.isServiceable !== undefined) {
      where.isServiceable = query.isServiceable;
    }
    if (query.zoneId) {
      where.zoneId = query.zoneId;
    }
    if (query.state) {
      where.state = { equals: query.state, mode: 'insensitive' };
    }
    if (query.pincode) {
      where.pincode = { startsWith: query.pincode.trim() };
    }
    if (query.city) {
      where.city = { contains: query.city.trim(), mode: 'insensitive' };
    }
    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { pincode: { contains: q } },
        { city: { contains: q, mode: 'insensitive' } },
        { district: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
        { zone: { zoneName: { contains: q, mode: 'insensitive' } } },
        { zone: { zoneCode: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, pincodes] = await Promise.all([
      this.prisma.shippingPincode.count({ where }),
      this.prisma.shippingPincode.findMany({
        where,
        include: {
          zone: {
            select: {
              id: true,
              zoneCode: true,
              zoneName: true,
              shippingCharge: true,
              isActive: true,
            },
          },
        },
        orderBy: [{ pincode: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      pincodes: pincodes.map((p) => ({
        ...p,
        additionalSurcharge: Number(p.additionalSurcharge),
        zone: p.zone
          ? {
              ...p.zone,
              shippingCharge: Number(p.zone.shippingCharge),
            }
          : null,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPincode(pincode: string) {
    const cleanPin = pincode.trim();
    const pin = await this.prisma.shippingPincode.findUnique({
      where: { pincode: cleanPin },
      include: {
        zone: {
          include: {
            rateCards: {
              where: { isActive: true },
              include: {
                slabs: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!pin) {
      throw new NotFoundException(`Pincode '${cleanPin}' not found`);
    }

    return {
      ...pin,
      additionalSurcharge: Number(pin.additionalSurcharge),
    };
  }

  async createPincode(dto: CreateShippingPincodeDto, actorId?: string) {
    const cleanPin = dto.pincode.trim();
    const existing = await this.prisma.shippingPincode.findUnique({
      where: { pincode: cleanPin },
    });
    if (existing) {
      throw new ConflictException(`Pincode '${cleanPin}' already exists`);
    }

    const zone = await this.prisma.shippingZone.findUnique({ where: { id: dto.zoneId } });
    if (!zone) {
      throw new BadRequestException(`Delivery zone with ID '${dto.zoneId}' not found`);
    }

    const created = await this.prisma.shippingPincode.create({
      data: {
        pincode: cleanPin,
        city: dto.city.trim(),
        district: dto.district?.trim(),
        state: dto.state.trim(),
        country: dto.country?.trim() || 'India',
        zoneId: dto.zoneId,
        isServiceable: dto.isServiceable ?? true,
        additionalSurcharge: dto.additionalSurcharge ?? 0,
        deliveryRestrictions: dto.deliveryRestrictions?.trim(),
        estimatedDays: dto.estimatedDays?.trim(),
      },
      include: {
        zone: true,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_PINCODE_CREATED',
      entity: 'ShippingPincode',
      entityId: created.id,
      newState: created,
    });

    return created;
  }

  async updatePincode(id: string, dto: UpdateShippingPincodeDto, actorId?: string) {
    const existing = await this.prisma.shippingPincode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Pincode record with ID '${id}' not found`);
    }

    if (dto.zoneId) {
      const zone = await this.prisma.shippingZone.findUnique({ where: { id: dto.zoneId } });
      if (!zone) {
        throw new BadRequestException(`Delivery zone with ID '${dto.zoneId}' not found`);
      }
    }

    const updated = await this.prisma.shippingPincode.update({
      where: { id },
      data: {
        ...(dto.city ? { city: dto.city.trim() } : {}),
        ...(dto.district !== undefined ? { district: dto.district?.trim() } : {}),
        ...(dto.state ? { state: dto.state.trim() } : {}),
        ...(dto.zoneId ? { zoneId: dto.zoneId } : {}),
        ...(dto.isServiceable !== undefined ? { isServiceable: dto.isServiceable } : {}),
        ...(dto.additionalSurcharge !== undefined ? { additionalSurcharge: dto.additionalSurcharge } : {}),
        ...(dto.deliveryRestrictions !== undefined ? { deliveryRestrictions: dto.deliveryRestrictions?.trim() } : {}),
        ...(dto.estimatedDays !== undefined ? { estimatedDays: dto.estimatedDays?.trim() } : {}),
      },
      include: {
        zone: true,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_PINCODE_UPDATED',
      entity: 'ShippingPincode',
      entityId: id,
      previousState: existing,
      newState: updated,
    });

    return updated;
  }

  async deletePincode(id: string, actorId?: string) {
    const existing = await this.prisma.shippingPincode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Pincode record with ID '${id}' not found`);
    }

    await this.prisma.shippingPincode.delete({ where: { id } });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_PINCODE_DELETED',
      entity: 'ShippingPincode',
      entityId: id,
      previousState: existing,
    });

    return { success: true, message: `Pincode '${existing.pincode}' deleted successfully` };
  }

  async bulkImport(dto: BulkImportPincodesDto, actorId?: string) {
    if (!dto.pincodes || dto.pincodes.length === 0) {
      throw new BadRequestException('No pincode rows provided for import');
    }

    const zones = await this.prisma.shippingZone.findMany();
    const zoneMap = new Map<string, string>(); // code/name -> id
    for (const z of zones) {
      if (z.zoneCode) {
        zoneMap.set(z.zoneCode.toUpperCase(), z.id);
      }
      zoneMap.set(z.zoneName.toUpperCase(), z.id);
    }

    const report = {
      totalReceived: dto.pincodes.length,
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: [] as Array<{ row: number; pincode?: string; error: string }>,
    };

    const seenInBatch = new Set<string>();

    for (let i = 0; i < dto.pincodes.length; i++) {
      const row = dto.pincodes[i];
      const pin = (row.pincode || '').trim();

      if (!/^[1-9][0-9]{5}$/.test(pin)) {
        report.errors.push({ row: i + 1, pincode: pin, error: 'Invalid 6-digit Indian PIN code format' });
        report.skippedCount++;
        continue;
      }

      if (seenInBatch.has(pin)) {
        report.errors.push({ row: i + 1, pincode: pin, error: 'Duplicate pincode in batch' });
        report.skippedCount++;
        continue;
      }
      seenInBatch.add(pin);

      const zoneKey = (row.zoneCode || '').trim().toUpperCase();
      const zoneId = zoneMap.get(zoneKey);
      if (!zoneId) {
        report.errors.push({ row: i + 1, pincode: pin, error: `Zone '${row.zoneCode}' not recognized` });
        report.skippedCount++;
        continue;
      }

      try {
        const existing = await this.prisma.shippingPincode.findUnique({ where: { pincode: pin } });
        if (existing) {
          await this.prisma.shippingPincode.update({
            where: { pincode: pin },
            data: {
              city: row.city?.trim() || existing.city,
              district: row.district?.trim() || existing.district,
              state: row.state?.trim() || existing.state,
              zoneId,
              isServiceable: row.isServiceable !== undefined ? row.isServiceable : existing.isServiceable,
              additionalSurcharge: row.additionalSurcharge !== undefined ? row.additionalSurcharge : existing.additionalSurcharge,
            },
          });
          report.updatedCount++;
        } else {
          await this.prisma.shippingPincode.create({
            data: {
              pincode: pin,
              city: row.city?.trim() || 'City',
              district: row.district?.trim(),
              state: row.state?.trim() || 'State',
              zoneId,
              isServiceable: row.isServiceable ?? true,
              additionalSurcharge: row.additionalSurcharge ?? 0,
            },
          });
          report.importedCount++;
        }
      } catch (err: any) {
        report.errors.push({ row: i + 1, pincode: pin, error: err.message || 'Database error during import' });
        report.skippedCount++;
      }
    }

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_PINCODES_BULK_IMPORTED',
      entity: 'ShippingPincode',
      entityId: 'batch',
      newState: report,
    });

    return report;
  }

  async exportPincodes() {
    const pincodes = await this.prisma.shippingPincode.findMany({
      include: {
        zone: {
          select: {
            zoneCode: true,
            zoneName: true,
          },
        },
      },
      orderBy: { pincode: 'asc' },
    });

    return pincodes.map((p) => ({
      pincode: p.pincode,
      city: p.city,
      district: p.district || '',
      state: p.state,
      zoneCode: p.zone?.zoneCode || '',
      zoneName: p.zone?.zoneName || '',
      isServiceable: p.isServiceable ? 'YES' : 'NO',
      additionalSurcharge: Number(p.additionalSurcharge || 0),
      deliveryRestrictions: p.deliveryRestrictions || '',
    }));
  }
}
