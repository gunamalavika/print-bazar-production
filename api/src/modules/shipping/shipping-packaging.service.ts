import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePackagingProfileDto, UpdatePackagingProfileDto } from './dto/shipping.dto';

@Injectable()
export class ShippingPackagingService {
  private readonly logger = new Logger(ShippingPackagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listProfiles(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;

    const profiles = await this.prisma.shippingPackagingProfile.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { weightGrams: 'asc' }],
    });

    return profiles.map((p) => ({
      ...p,
      packagingCharge: Number(p.packagingCharge),
    }));
  }

  async getProfile(id: string) {
    const profile = await this.prisma.shippingPackagingProfile.findUnique({
      where: { id },
    });
    if (!profile) {
      throw new NotFoundException(`Packaging profile with ID '${id}' not found`);
    }
    return {
      ...profile,
      packagingCharge: Number(profile.packagingCharge),
    };
  }

  async getDefaultProfile() {
    const profile = await this.prisma.shippingPackagingProfile.findFirst({
      where: { isDefault: true, isActive: true },
    });
    if (profile) {
      return {
        ...profile,
        packagingCharge: Number(profile.packagingCharge),
      };
    }
    // Fallback to first active profile
    const anyActive = await this.prisma.shippingPackagingProfile.findFirst({
      where: { isActive: true },
      orderBy: { weightGrams: 'asc' },
    });
    return anyActive
      ? {
          ...anyActive,
          packagingCharge: Number(anyActive.packagingCharge),
        }
      : null;
  }

  async createProfile(dto: CreatePackagingProfileDto, actorId?: string) {
    if (dto.isDefault) {
      await this.prisma.shippingPackagingProfile.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await this.prisma.shippingPackagingProfile.create({
      data: {
        name: dto.name.trim(),
        type: dto.type?.trim().toUpperCase() || 'CARTON',
        weightGrams: dto.weightGrams,
        lengthMm: dto.lengthMm,
        widthMm: dto.widthMm,
        heightMm: dto.heightMm,
        maxWeightCapacityGrams: dto.maxWeightCapacityGrams,
        packagingCharge: dto.packagingCharge ?? 0,
        isActive: dto.isActive ?? true,
        isDefault: dto.isDefault ?? false,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'PACKAGING_PROFILE_CREATED',
      entity: 'ShippingPackagingProfile',
      entityId: created.id,
      newState: created,
    });

    return {
      ...created,
      packagingCharge: Number(created.packagingCharge),
    };
  }

  async updateProfile(id: string, dto: UpdatePackagingProfileDto, actorId?: string) {
    const existing = await this.prisma.shippingPackagingProfile.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Packaging profile with ID '${id}' not found`);
    }

    if (dto.isDefault) {
      await this.prisma.shippingPackagingProfile.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.shippingPackagingProfile.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.type ? { type: dto.type.trim().toUpperCase() } : {}),
        ...(dto.weightGrams !== undefined ? { weightGrams: dto.weightGrams } : {}),
        ...(dto.lengthMm !== undefined ? { lengthMm: dto.lengthMm } : {}),
        ...(dto.widthMm !== undefined ? { widthMm: dto.widthMm } : {}),
        ...(dto.heightMm !== undefined ? { heightMm: dto.heightMm } : {}),
        ...(dto.maxWeightCapacityGrams !== undefined ? { maxWeightCapacityGrams: dto.maxWeightCapacityGrams } : {}),
        ...(dto.packagingCharge !== undefined ? { packagingCharge: dto.packagingCharge } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });

    await this.auditService.log({
      actorId,
      action: 'PACKAGING_PROFILE_UPDATED',
      entity: 'ShippingPackagingProfile',
      entityId: id,
      previousState: existing,
      newState: updated,
    });

    return {
      ...updated,
      packagingCharge: Number(updated.packagingCharge),
    };
  }

  async deleteProfile(id: string, actorId?: string) {
    const existing = await this.prisma.shippingPackagingProfile.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Packaging profile with ID '${id}' not found`);
    }

    if (existing._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete packaging profile '${existing.name}' because ${existing._count.products} products are associated with it.`,
      );
    }

    await this.prisma.shippingPackagingProfile.delete({ where: { id } });

    await this.auditService.log({
      actorId,
      action: 'PACKAGING_PROFILE_DELETED',
      entity: 'ShippingPackagingProfile',
      entityId: id,
      previousState: existing,
    });

    return { success: true, message: `Packaging profile '${existing.name}' deleted successfully` };
  }
}

