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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listProducts(categoryId, search) {
        let categoryCondition = undefined;
        if (categoryId) {
            categoryCondition = { categoryId };
        }
        const where = {
            isActive: true,
            status: 'PUBLISHED',
            ...(categoryCondition || {}),
            ...(search
                ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                        { tags: { has: search } },
                    ],
                }
                : {}),
        };
        return this.prisma.product.findMany({
            where,
            include: {
                category: {
                    include: {
                        parent: {
                            select: { id: true, name: true, slug: true },
                        },
                    },
                },
                images: {
                    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                },
                optionGroups: {
                    where: { isActive: true, isCustomerVisible: true },
                    include: {
                        options: {
                            where: { isActive: true },
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
                configurationRules: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'asc' },
                },
                pricingSource: true,
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });
    }
    async getProductBySlug(slugOrId) {
        const normalized = (slugOrId || '').toLowerCase().trim();
        const aliasMap = {
            'business-cards': 'seed-premium-business-cards',
            'premium-visiting-cards': 'seed-premium-business-cards',
            'visiting-cards': 'seed-premium-business-cards',
            'roll-up-luxury-standee': 'luxury-rollup-standee',
            'luxury-standee': 'luxury-rollup-standee',
            'rigid-box': 'custom-rigid-box',
            'rigid-boxes': 'custom-rigid-box',
        };
        const targetSlug = aliasMap[normalized] || normalized;
        const product = await this.prisma.product.findFirst({
            where: {
                OR: [
                    { slug: targetSlug, status: 'PUBLISHED', isActive: true },
                    { slug: normalized, status: 'PUBLISHED', isActive: true },
                    { id: slugOrId, isActive: true },
                ],
            },
            include: {
                category: {
                    include: {
                        parent: {
                            select: { id: true, name: true, slug: true },
                        },
                    },
                },
                images: {
                    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                },
                optionGroups: {
                    where: { isActive: true },
                    include: {
                        options: {
                            where: { isActive: true },
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
                configurationRules: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'asc' },
                },
                pricingMatrices: {
                    orderBy: { minQty: 'asc' },
                },
                additionalPricings: {
                    orderBy: [{ minQty: 'asc' }, { groupCode: 'asc' }, { optionValue: 'asc' }],
                },
                personalizationTemplate: {
                    include: {
                        fields: {
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                },
                pricingSource: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with slug or ID '${slugOrId}' not found or is currently unavailable`);
        }
        return product;
    }
    async listCategories() {
        return this.prisma.productCategory.findMany({
            where: { isActive: true },
            include: {
                _count: {
                    select: {
                        products: {
                            where: { status: 'PUBLISHED', isActive: true },
                        },
                    },
                },
            },
            orderBy: [{ sortOrder: 'asc' }],
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map