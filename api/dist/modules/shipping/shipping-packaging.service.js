"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ShippingPackagingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingPackagingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let ShippingPackagingService = ShippingPackagingService_1 = class ShippingPackagingService {
    prisma;
    auditService;
    logger = new common_1.Logger(ShippingPackagingService_1.name);
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async listProfiles(isActive) {
        const where = {};
        if (isActive !== undefined)
            where.isActive = isActive;
        const profiles = await this.prisma.shippingPackagingProfile.findMany({
            where,
            orderBy: [{ isDefault: 'desc' }, { weightGrams: 'asc' }],
        });
        return profiles.map((p) => ({
            ...p,
            packagingCharge: Number(p.packagingCharge),
        }));
    }
    async getProfile(id) {
        const profile = await this.prisma.shippingPackagingProfile.findUnique({
            where: { id },
        });
        if (!profile) {
            throw new common_1.NotFoundException(`Packaging profile with ID '${id}' not found`);
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
    async createProfile(dto, actorId) {
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
    async updateProfile(id, dto, actorId) {
        const existing = await this.prisma.shippingPackagingProfile.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException(`Packaging profile with ID '${id}' not found`);
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
    async deleteProfile(id, actorId) {
        const existing = await this.prisma.shippingPackagingProfile.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { products: true },
                },
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Packaging profile with ID '${id}' not found`);
        }
        if (existing._count.products > 0) {
            throw new common_1.BadRequestException(`Cannot delete packaging profile '${existing.name}' because ${existing._count.products} products are associated with it.`);
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
};
exports.ShippingPackagingService = ShippingPackagingService;
exports.ShippingPackagingService = ShippingPackagingService = ShippingPackagingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ShippingPackagingService);
//# sourceMappingURL=shipping-packaging.service.js.map