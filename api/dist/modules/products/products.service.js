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
const fs = require("fs");
const path = require("path");
const DEFAULT_SITE_SETTINGS = {
    heroImageUrl: '/images/home/hero-products.jpg',
    heroAltText: 'Print Bazzar Commercial Products',
    heroBadgeText: 'COMMERCIAL PRINTING & PACKAGING OS',
    heroTitle: 'Commercial Print Excellence,',
    heroHighlightText: 'Engineered',
    heroTitleSuffix: 'for Scale.',
    heroDescription: 'Direct-to-press precision for visiting cards, luxury rigid boxes, roll-up displays, and marketing collateral. Dynamic live quoting, automated pre-flight checks, and ISO 12647 color calibration.',
    heroPrimaryBtnText: 'START CUSTOM CONFIGURATION',
    heroPrimaryBtnHref: '/products/premium-visiting-cards',
    heroSecondaryBtnText: 'EXPLORE 2026 CATALOGUE',
    heroSecondaryBtnHref: '/products',
    heroBannerLinkHref: '/products',
    showHeroTextOverlay: true,
    showHeroBadge: true,
    showHeroHeading: true,
    showHeroDescription: true,
    showHeroPrimaryBtn: true,
    showHeroSecondaryBtn: true,
    showHeroTrustPillars: true,
    heroAutoSlide: true,
    heroSlideIntervalSeconds: 5,
    heroStartingPrice: '₹199',
    heroStartingSubtitle: 'Visiting Cards (100 units)',
    heroSlaTitle: '24-48h',
    heroSlaSubtitle: 'Express Shop Floor Run',
    heroImages: [
        {
            id: 'hero-default-1',
            imageUrl: '/images/home/hero-products.jpg',
            altText: 'Print Bazzar Commercial Products',
            badgeText: 'CALIBRATED TO ISO 12647',
            isActive: true,
        },
    ],
    marqueeItems: [
        {
            id: 'shipping',
            text: 'Free Shipping on Orders Over ₹999',
            icon: 'truck',
            isActive: true,
        },
        {
            id: 'guarantee',
            text: 'High Quality Print Guarantee',
            icon: 'shield',
            isActive: true,
        },
        {
            id: 'turnaround',
            text: 'Fast Turnaround (3-5 Business Days)',
            icon: 'clock',
            isActive: true,
        },
    ],
};
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listProducts(categoryId, search, isFeatured) {
        let categoryCondition = undefined;
        if (categoryId) {
            categoryCondition = { categoryId };
        }
        const where = {
            isActive: true,
            status: 'PUBLISHED',
            ...(isFeatured !== undefined ? { isFeatured } : {}),
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
            'custom-luxury-rigid-box': 'custom-rigid-box',
            'custom-packaging': 'custom-rigid-box',
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
    getSiteSettingsFilePath() {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        return path.join(uploadDir, 'site-settings.json');
    }
    async getSiteSettings() {
        try {
            const filePath = this.getSiteSettingsFilePath();
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf-8');
                const parsed = JSON.parse(raw);
                return {
                    ...DEFAULT_SITE_SETTINGS,
                    ...parsed,
                    heroImages: Array.isArray(parsed.heroImages) && parsed.heroImages.length > 0
                        ? parsed.heroImages
                        : DEFAULT_SITE_SETTINGS.heroImages,
                    marqueeItems: Array.isArray(parsed.marqueeItems)
                        ? parsed.marqueeItems
                        : DEFAULT_SITE_SETTINGS.marqueeItems,
                };
            }
        }
        catch {
        }
        return DEFAULT_SITE_SETTINGS;
    }
    async updateSiteSettings(dto) {
        const current = await this.getSiteSettings();
        const updated = {
            ...current,
            ...dto,
            heroImageUrl: dto.heroImageUrl ?? current.heroImageUrl,
            heroAltText: dto.heroAltText ?? current.heroAltText,
            heroBadgeText: dto.heroBadgeText ?? current.heroBadgeText,
            heroStartingPrice: dto.heroStartingPrice ?? current.heroStartingPrice,
            heroStartingSubtitle: dto.heroStartingSubtitle ?? current.heroStartingSubtitle,
            heroSlaTitle: dto.heroSlaTitle ?? current.heroSlaTitle,
            heroSlaSubtitle: dto.heroSlaSubtitle ?? current.heroSlaSubtitle,
            heroImages: Array.isArray(dto.heroImages) ? dto.heroImages : current.heroImages,
            marqueeItems: Array.isArray(dto.marqueeItems) ? dto.marqueeItems : current.marqueeItems,
            updatedAt: new Date().toISOString(),
        };
        const filePath = this.getSiteSettingsFilePath();
        fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
        return updated;
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map