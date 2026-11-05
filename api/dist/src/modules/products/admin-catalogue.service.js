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
var AdminCatalogueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminCatalogueService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const catalogue_dto_1 = require("./dto/catalogue.dto");
const client_1 = require("@prisma/client");
let AdminCatalogueService = AdminCatalogueService_1 = class AdminCatalogueService {
    prisma;
    auditService;
    logger = new common_1.Logger(AdminCatalogueService_1.name);
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async listCategories() {
        return this.prisma.productCategory.findMany({
            include: {
                _count: {
                    select: { products: true },
                },
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
    }
    async getCategoryById(id) {
        const cat = await this.prisma.productCategory.findUnique({
            where: { id },
            include: {
                products: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        sku: true,
                        status: true,
                        basePrice: true,
                    },
                },
                _count: {
                    select: { products: true },
                },
            },
        });
        if (!cat) {
            throw new common_1.NotFoundException(`Category with ID '${id}' not found`);
        }
        return cat;
    }
    async createCategory(dto, actorId) {
        const existing = await this.prisma.productCategory.findUnique({
            where: { slug: dto.slug },
        });
        if (existing) {
            throw new common_1.ConflictException(`Category slug '${dto.slug}' already exists`);
        }
        const category = await this.prisma.productCategory.create({
            data: {
                name: dto.name,
                slug: dto.slug,
                description: dto.description,
                image: dto.image,
                parentId: null,
                sortOrder: dto.sortOrder ?? 0,
                isActive: dto.isActive ?? true,
            },
            include: {
                _count: { select: { products: true } },
            },
        });
        await this.auditService.log({
            actorId,
            action: 'CATEGORY_CREATED',
            entity: 'ProductCategory',
            entityId: category.id,
            newState: category,
        });
        return category;
    }
    async updateCategory(id, dto, actorId) {
        const current = await this.getCategoryById(id);
        if (dto.slug && dto.slug !== current.slug) {
            const existing = await this.prisma.productCategory.findUnique({
                where: { slug: dto.slug },
            });
            if (existing) {
                throw new common_1.ConflictException(`Category slug '${dto.slug}' already exists`);
            }
        }
        const updated = await this.prisma.productCategory.update({
            where: { id },
            data: {
                name: dto.name,
                slug: dto.slug,
                description: dto.description,
                image: dto.image,
                parentId: null,
                sortOrder: dto.sortOrder,
                isActive: dto.isActive,
            },
            include: {
                _count: { select: { products: true } },
            },
        });
        await this.auditService.log({
            actorId,
            action: 'CATEGORY_UPDATED',
            entity: 'ProductCategory',
            entityId: id,
            previousState: current,
            newState: updated,
        });
        return updated;
    }
    async deleteCategory(id, actorId) {
        const category = await this.getCategoryById(id);
        const productCount = await this.prisma.product.count({
            where: { categoryId: id },
        });
        if (productCount > 0) {
            throw new common_1.BadRequestException(`Cannot delete category '${category.name}' because it contains ${productCount} products. Reassign or delete products first.`);
        }
        await this.prisma.productCategory.delete({ where: { id } });
        await this.auditService.log({
            actorId,
            action: 'CATEGORY_DELETED',
            entity: 'ProductCategory',
            entityId: id,
            previousState: category,
        });
        return { success: true, message: `Category '${category.name}' deleted successfully` };
    }
    async listProducts(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;
        const where = {
            ...(query.categoryId ? { categoryId: query.categoryId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.search
                ? {
                    OR: [
                        { name: { contains: query.search, mode: 'insensitive' } },
                        { sku: { contains: query.search, mode: 'insensitive' } },
                        { slug: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [total, products] = await Promise.all([
            this.prisma.product.count({ where }),
            this.prisma.product.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true, slug: true } },
                    images: {
                        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                    },
                    optionGroups: {
                        include: {
                            options: {
                                orderBy: { sortOrder: 'asc' },
                            },
                        },
                        orderBy: { sortOrder: 'asc' },
                    },
                    configurationRules: {
                        orderBy: { createdAt: 'asc' },
                    },
                    pricingSource: true,
                },
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
        ]);
        return {
            data: products,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getProductById(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                images: {
                    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                },
                optionGroups: {
                    include: {
                        options: {
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
                configurationRules: {
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
                pricingSource: {
                    include: {
                        syncLogs: {
                            take: 10,
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                },
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID '${id}' not found`);
        }
        return product;
    }
    async createProduct(dto, actorId) {
        const category = await this.prisma.productCategory.findUnique({
            where: { id: dto.categoryId },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID '${dto.categoryId}' not found`);
        }
        const existingSlug = await this.prisma.product.findUnique({ where: { slug: dto.slug } });
        if (existingSlug) {
            throw new common_1.ConflictException(`Product slug '${dto.slug}' already in use`);
        }
        const existingSku = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
        if (existingSku) {
            throw new common_1.ConflictException(`Product SKU '${dto.sku}' already in use`);
        }
        const product = await this.prisma.$transaction(async (tx) => {
            const created = await tx.product.create({
                data: {
                    categoryId: dto.categoryId,
                    name: dto.name,
                    slug: dto.slug,
                    sku: dto.sku,
                    description: dto.description,
                    status: dto.status || catalogue_dto_1.ProductStatusDto.DRAFT,
                    pricingModel: dto.pricingModel || 'MATRIX',
                    basePrice: dto.basePrice,
                    minQuantity: dto.minQuantity || 1,
                    quantityStep: dto.quantityStep !== undefined ? dto.quantityStep : 100,
                    maxQuantity: dto.maxQuantity || 100000,
                    productionDays: dto.productionDays || 2,
                    sortOrder: dto.sortOrder || 0,
                    isFeatured: dto.isFeatured ?? false,
                    tags: dto.tags || [],
                    seoTitle: dto.seoTitle,
                    seoDescription: dto.seoDescription,
                    trackInventory: dto.trackInventory ?? false,
                    stockQuantity: dto.stockQuantity || 0,
                    lowStockAlert: dto.lowStockAlert || 10,
                    defaultSize: dto.defaultSize,
                    isStudioConfigured: true,
                    configVersion: 1,
                    artworkRequirement: dto.artworkRequirement || 'OPTIONAL',
                    artworkPrice: dto.artworkPrice !== undefined ? dto.artworkPrice : 0,
                    artworkQualityVerification: dto.artworkQualityVerification ?? true,
                    minimumArtworkMegapixels: dto.minimumArtworkMegapixels !== undefined ? dto.minimumArtworkMegapixels : 1.0,
                    artworkFileFormats: dto.artworkFileFormats || ['PDF', 'AI', 'PSD', 'TIFF', 'PNG', 'JPG'],
                    maxArtworkFileSizeMb: dto.maxArtworkFileSizeMb || 50,
                    referenceImageRequirement: dto.referenceImageRequirement || 'DISABLED',
                    designServiceRequirement: dto.designServiceRequirement || 'DISABLED',
                    designServicePrice: dto.designServicePrice !== undefined ? dto.designServicePrice : 0,
                    designServiceFee: dto.designServiceFee !== undefined ? dto.designServiceFee : (dto.designServicePrice || 0),
                    allowMultipleVariants: dto.allowMultipleVariants ?? false,
                    variantDimensions: dto.variantDimensions || [],
                    personalizationTemplateId: dto.personalizationTemplateId || null,
                    personalizationConfig: dto.personalizationConfig || null,
                    shippingChargeType: dto.shippingChargeType || 'DEFAULT',
                    unitWeightGrams: dto.unitWeightGrams !== undefined ? dto.unitWeightGrams : 0,
                    courierCharge: dto.courierCharge !== undefined ? dto.courierCharge : 100,
                    perAdditionalQtyRate: dto.perAdditionalQtyRate !== undefined ? dto.perAdditionalQtyRate : 0,
                    freeShippingThreshold: dto.freeShippingThreshold !== undefined ? dto.freeShippingThreshold : 1000,
                    allowCod: dto.allowCod !== undefined ? dto.allowCod : true,
                    codSurcharge: dto.codSurcharge !== undefined ? dto.codSurcharge : 50,
                },
            });
            if (dto.images && dto.images.length > 0) {
                for (let i = 0; i < dto.images.length; i++) {
                    const img = dto.images[i];
                    await tx.productImage.create({
                        data: {
                            productId: created.id,
                            url: img.url,
                            storageKey: img.storageKey,
                            altText: img.altText || created.name,
                            caption: img.caption,
                            sortOrder: img.sortOrder ?? i,
                            isPrimary: img.isPrimary ?? i === 0,
                        },
                    });
                }
            }
            if (dto.optionGroups && dto.optionGroups.length > 0) {
                for (let i = 0; i < dto.optionGroups.length; i++) {
                    const g = dto.optionGroups[i];
                    const groupRecord = await tx.productOptionGroup.create({
                        data: {
                            productId: created.id,
                            reusableGroupId: g.reusableGroupId || null,
                            name: g.name,
                            code: g.code,
                            inputType: g.inputType || 'SELECT',
                            description: g.description,
                            isRequired: g.isRequired ?? true,
                            isCustomerVisible: g.isCustomerVisible ?? true,
                            sortOrder: g.sortOrder ?? i,
                            enableAdditionalPricing: Boolean(g.enableAdditionalPricing),
                            selectionBehavior: g.selectionBehavior || 'SINGLE',
                            isActive: g.isActive ?? true,
                        },
                    });
                    if (g.options && g.options.length > 0) {
                        for (let j = 0; j < g.options.length; j++) {
                            const opt = g.options[j];
                            await tx.productOption.create({
                                data: {
                                    groupId: groupRecord.id,
                                    label: opt.label,
                                    value: opt.value,
                                    priceModifierType: opt.priceModifierType || 'FIXED',
                                    priceModifier: opt.priceModifier || 0,
                                    sortOrder: opt.sortOrder ?? j,
                                    isDefault: opt.isDefault ?? j === 0,
                                    isActive: opt.isActive ?? true,
                                    fileCount: opt.fileCount,
                                    fileSlotLabels: opt.fileSlotLabels || [],
                                    minMegapixels: opt.minMegapixels,
                                },
                            });
                        }
                    }
                }
            }
            if (dto.configurationRules && dto.configurationRules.length > 0) {
                for (let i = 0; i < dto.configurationRules.length; i++) {
                    const r = dto.configurationRules[i];
                    await tx.productConfigurationRule.create({
                        data: {
                            productId: created.id,
                            name: r.name,
                            conditionGroupCode: r.conditionGroupCode,
                            conditionOperator: r.conditionOperator || 'EQUALS',
                            conditionOptionValue: r.conditionOptionValue,
                            actionType: r.actionType,
                            targetGroupCode: r.targetGroupCode,
                            targetOptionValue: r.targetOptionValue,
                            actionPayload: r.actionPayload,
                            isActive: r.isActive ?? true,
                        },
                    });
                }
            }
            if (dto.pricingSource) {
                await tx.productPricingSource.create({
                    data: {
                        productId: created.id,
                        sourceType: dto.pricingSource.sourceType || 'GOOGLE_SHEETS',
                        spreadsheetId: dto.pricingSource.spreadsheetId,
                        worksheetName: dto.pricingSource.worksheetName,
                        apiKey: dto.pricingSource.apiKey,
                        columnMapping: dto.pricingSource.columnMapping,
                    },
                });
            }
            return created;
        });
        await this.auditService.log({
            actorId,
            action: 'PRODUCT_CREATED',
            entity: 'Product',
            entityId: product.id,
            newState: product,
        });
        return this.getProductById(product.id);
    }
    async updateProduct(id, dto, actorId) {
        const current = await this.getProductById(id);
        if (dto.slug && dto.slug !== current.slug) {
            const existing = await this.prisma.product.findUnique({ where: { slug: dto.slug } });
            if (existing) {
                throw new common_1.ConflictException(`Product slug '${dto.slug}' already exists`);
            }
        }
        if (dto.sku && dto.sku !== current.sku) {
            const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
            if (existing) {
                throw new common_1.ConflictException(`Product SKU '${dto.sku}' already exists`);
            }
        }
        const updated = await this.prisma.product.update({
            where: { id },
            data: {
                categoryId: dto.categoryId,
                name: dto.name,
                slug: dto.slug,
                sku: dto.sku,
                description: dto.description,
                status: dto.status,
                pricingModel: dto.pricingModel,
                basePrice: dto.basePrice,
                minQuantity: dto.minQuantity,
                quantityStep: dto.quantityStep,
                maxQuantity: dto.maxQuantity,
                productionDays: dto.productionDays,
                sortOrder: dto.sortOrder,
                isFeatured: dto.isFeatured,
                tags: dto.tags,
                seoTitle: dto.seoTitle,
                seoDescription: dto.seoDescription,
                trackInventory: dto.trackInventory,
                stockQuantity: dto.stockQuantity,
                lowStockAlert: dto.lowStockAlert,
                defaultSize: dto.defaultSize,
                isActive: dto.isActive,
                artworkRequirement: dto.artworkRequirement,
                artworkPrice: dto.artworkPrice,
                artworkQualityVerification: dto.artworkQualityVerification,
                minimumArtworkMegapixels: dto.minimumArtworkMegapixels,
                artworkFileFormats: dto.artworkFileFormats,
                maxArtworkFileSizeMb: dto.maxArtworkFileSizeMb,
                designServiceFee: dto.designServiceFee,
                allowMultipleVariants: dto.allowMultipleVariants !== undefined ? dto.allowMultipleVariants : current.allowMultipleVariants,
                variantDimensions: dto.variantDimensions !== undefined ? dto.variantDimensions : current.variantDimensions,
                personalizationTemplateId: dto.personalizationTemplateId !== undefined ? (dto.personalizationTemplateId || null) : current.personalizationTemplateId,
                personalizationConfig: dto.personalizationConfig !== undefined ? dto.personalizationConfig : current.personalizationConfig,
                referenceImageRequirement: dto.referenceImageRequirement,
                designServiceRequirement: dto.designServiceRequirement,
                designServicePrice: dto.designServicePrice,
                shippingChargeType: dto.shippingChargeType,
                unitWeightGrams: dto.unitWeightGrams,
                courierCharge: dto.courierCharge,
                perAdditionalQtyRate: dto.perAdditionalQtyRate,
                freeShippingThreshold: dto.freeShippingThreshold,
                allowCod: dto.allowCod,
                codSurcharge: dto.codSurcharge,
            },
        });
        if (dto.optionGroups !== undefined) {
            await this.prisma.$transaction(async (tx) => {
                const existingGroups = await tx.productOptionGroup.findMany({
                    where: { productId: id },
                    select: { id: true },
                });
                const groupIds = existingGroups.map((g) => g.id);
                await tx.productOption.deleteMany({
                    where: { groupId: { in: groupIds } },
                });
                await tx.productOptionGroup.deleteMany({
                    where: { productId: id },
                });
                for (let i = 0; i < dto.optionGroups.length; i++) {
                    const g = dto.optionGroups[i];
                    const groupRecord = await tx.productOptionGroup.create({
                        data: {
                            productId: id,
                            reusableGroupId: g.reusableGroupId || null,
                            name: g.name,
                            code: g.code,
                            inputType: g.inputType || 'SELECT',
                            description: g.description,
                            isRequired: g.isRequired ?? true,
                            isCustomerVisible: g.isCustomerVisible ?? true,
                            sortOrder: g.sortOrder ?? i,
                            enableAdditionalPricing: Boolean(g.enableAdditionalPricing),
                            selectionBehavior: g.selectionBehavior || 'SINGLE',
                            isActive: g.isActive ?? true,
                        },
                    });
                    if (g.options && g.options.length > 0) {
                        for (let j = 0; j < g.options.length; j++) {
                            const opt = g.options[j];
                            await tx.productOption.create({
                                data: {
                                    groupId: groupRecord.id,
                                    label: opt.label,
                                    value: opt.value,
                                    priceModifierType: opt.priceModifierType || 'FIXED',
                                    priceModifier: opt.priceModifier || 0,
                                    sortOrder: opt.sortOrder ?? j,
                                    isDefault: opt.isDefault ?? j === 0,
                                    isActive: opt.isActive ?? true,
                                    fileCount: opt.fileCount,
                                    fileSlotLabels: opt.fileSlotLabels || [],
                                    minMegapixels: opt.minMegapixels,
                                },
                            });
                        }
                    }
                }
            });
        }
        if (dto.configurationRules !== undefined) {
            this.validateRules(dto.configurationRules);
            await this.prisma.$transaction(async (tx) => {
                await tx.productConfigurationRule.deleteMany({
                    where: { productId: id },
                });
                for (let i = 0; i < dto.configurationRules.length; i++) {
                    const r = dto.configurationRules[i];
                    await tx.productConfigurationRule.create({
                        data: {
                            productId: id,
                            name: r.name,
                            conditionGroupCode: r.conditionGroupCode,
                            conditionOperator: r.conditionOperator || 'EQUALS',
                            conditionOptionValue: r.conditionOptionValue,
                            actionType: r.actionType,
                            targetGroupCode: r.targetGroupCode,
                            targetOptionValue: r.targetOptionValue,
                            actionPayload: r.actionPayload,
                            isActive: r.isActive ?? true,
                        },
                    });
                }
            });
        }
        if (dto.pricingSource !== undefined) {
            await this.prisma.productPricingSource.upsert({
                where: { productId: id },
                create: {
                    productId: id,
                    sourceType: dto.pricingSource.sourceType || 'GOOGLE_SHEETS',
                    spreadsheetId: dto.pricingSource.spreadsheetId,
                    worksheetName: dto.pricingSource.worksheetName,
                    apiKey: dto.pricingSource.apiKey,
                    columnMapping: dto.pricingSource.columnMapping,
                },
                update: {
                    sourceType: dto.pricingSource.sourceType || 'GOOGLE_SHEETS',
                    spreadsheetId: dto.pricingSource.spreadsheetId,
                    worksheetName: dto.pricingSource.worksheetName,
                    apiKey: dto.pricingSource.apiKey,
                    columnMapping: dto.pricingSource.columnMapping,
                },
            });
        }
        await this.auditService.log({
            actorId,
            action: 'PRODUCT_UPDATED',
            entity: 'Product',
            entityId: id,
            previousState: current,
            newState: updated,
        });
        return this.getProductById(id);
    }
    async duplicateProduct(id, actorId) {
        const source = await this.getProductById(id);
        const timestamp = Date.now().toString().slice(-4);
        const newSku = `${source.sku}-COPY-${timestamp}`;
        const newSlug = `${source.slug}-copy-${timestamp}`;
        const newName = `${source.name} (Copy)`;
        const duplicated = await this.prisma.$transaction(async (tx) => {
            const created = await tx.product.create({
                data: {
                    categoryId: source.categoryId,
                    name: newName,
                    slug: newSlug,
                    sku: newSku,
                    description: source.description,
                    status: catalogue_dto_1.ProductStatusDto.DRAFT,
                    pricingModel: source.pricingModel,
                    basePrice: source.basePrice,
                    minQuantity: source.minQuantity,
                    maxQuantity: source.maxQuantity,
                    productionDays: source.productionDays,
                    sortOrder: (source.sortOrder || 0) + 1,
                    isFeatured: false,
                    tags: source.tags,
                    seoTitle: source.seoTitle,
                    seoDescription: source.seoDescription,
                    isStudioConfigured: true,
                    configVersion: 1,
                    artworkRequirement: source.artworkRequirement,
                    artworkPrice: source.artworkPrice,
                    artworkQualityVerification: source.artworkQualityVerification,
                    minimumArtworkMegapixels: source.minimumArtworkMegapixels,
                    artworkFileFormats: source.artworkFileFormats,
                    maxArtworkFileSizeMb: source.maxArtworkFileSizeMb,
                    designServiceFee: source.designServiceFee,
                    referenceImageRequirement: source.referenceImageRequirement,
                    designServiceRequirement: source.designServiceRequirement,
                    designServicePrice: source.designServicePrice,
                },
            });
            for (const img of source.images || []) {
                await tx.productImage.create({
                    data: {
                        productId: created.id,
                        url: img.url,
                        storageKey: img.storageKey,
                        altText: img.altText,
                        caption: img.caption,
                        sortOrder: img.sortOrder,
                        isPrimary: img.isPrimary,
                    },
                });
            }
            for (const g of source.optionGroups || []) {
                const createdGroup = await tx.productOptionGroup.create({
                    data: {
                        productId: created.id,
                        name: g.name,
                        code: g.code,
                        inputType: g.inputType,
                        description: g.description,
                        isRequired: g.isRequired,
                        isCustomerVisible: g.isCustomerVisible,
                        sortOrder: g.sortOrder,
                        isActive: g.isActive,
                    },
                });
                for (const opt of g.options || []) {
                    await tx.productOption.create({
                        data: {
                            groupId: createdGroup.id,
                            label: opt.label,
                            value: opt.value,
                            priceModifierType: opt.priceModifierType,
                            priceModifier: opt.priceModifier,
                            sortOrder: opt.sortOrder,
                            isDefault: opt.isDefault,
                            isActive: opt.isActive,
                            fileCount: opt.fileCount,
                            fileSlotLabels: opt.fileSlotLabels,
                            minMegapixels: opt.minMegapixels,
                        },
                    });
                }
            }
            for (const r of source.configurationRules || []) {
                await tx.productConfigurationRule.create({
                    data: {
                        productId: created.id,
                        name: r.name,
                        conditionGroupCode: r.conditionGroupCode,
                        conditionOperator: r.conditionOperator,
                        conditionOptionValue: r.conditionOptionValue,
                        actionType: r.actionType,
                        targetGroupCode: r.targetGroupCode,
                        targetOptionValue: r.targetOptionValue,
                        actionPayload: r.actionPayload,
                        isActive: r.isActive,
                    },
                });
            }
            if (source.pricingSource) {
                await tx.productPricingSource.create({
                    data: {
                        productId: created.id,
                        sourceType: source.pricingSource.sourceType,
                        spreadsheetId: source.pricingSource.spreadsheetId,
                        worksheetName: source.pricingSource.worksheetName,
                        apiKey: source.pricingSource.apiKey,
                        columnMapping: source.pricingSource.columnMapping,
                    },
                });
            }
            return created;
        });
        await this.auditService.log({
            actorId,
            action: 'PRODUCT_DUPLICATED',
            entity: 'Product',
            entityId: duplicated.id,
            newState: duplicated,
            reason: `Cloned from product ID: ${id}`,
        });
        return this.getProductById(duplicated.id);
    }
    async publishProduct(id, actorId) {
        const product = await this.getProductById(id);
        const errors = [];
        if (!product.name || product.name.trim() === '') {
            errors.push('Product name is required.');
        }
        if (!product.categoryId) {
            errors.push('Product must belong to a valid category.');
        }
        if (Number(product.basePrice) < 0) {
            errors.push('Base price cannot be negative.');
        }
        const matrices = product.pricingMatrices || [];
        const hasCombinationMatrices = matrices.some((m) => {
            const c = m.attributeCombination || {};
            const keys = Object.keys(c).filter((k) => ![
                'discountPercent',
                'label',
                'offerName',
                'isExcluded',
                'status',
                'exclusionReason',
                'type',
                'isBasePrice',
                'price',
                'totalPrice',
                'quantity',
            ].includes(k));
            return keys.length > 0;
        });
        const hasBasePrice = Number(product.basePrice) > 0;
        const isBaseOnly = product.pricingModel === 'BASE_ONLY';
        if (hasCombinationMatrices) {
            if (matrices.length === 0 && !hasBasePrice) {
                errors.push('At least one valid combination quantity-price entry is required before publishing.');
            }
            else if (matrices.length > 0) {
                const comboMap = new Map();
                for (const m of matrices) {
                    const c = m.attributeCombination || {};
                    const keys = Object.keys(c)
                        .filter((k) => ![
                        'discountPercent',
                        'label',
                        'offerName',
                        'isExcluded',
                        'status',
                        'exclusionReason',
                        'type',
                        'isBasePrice',
                        'price',
                        'totalPrice',
                        'quantity',
                    ].includes(k))
                        .sort();
                    const comboKey = keys.map((k) => `${k}=${c[k]}`).join('|') || 'base';
                    const list = comboMap.get(comboKey) || [];
                    list.push(m);
                    comboMap.set(comboKey, list);
                }
                for (const [comboKey, entries] of comboMap.entries()) {
                    const isExcluded = entries.some((e) => {
                        const c = e.attributeCombination || {};
                        return c.isExcluded === true || c.status === 'EXCLUDED';
                    });
                    if (isExcluded)
                        continue;
                    const validEntries = entries.filter((e) => {
                        const c = e.attributeCombination || {};
                        const exactPrice = Number(c.price ?? c.totalPrice ?? Number(e.unitPrice || 0) * Number(e.minQty || 0));
                        return Number(e.minQty) > 0 && exactPrice > 0;
                    });
                    if (validEntries.length === 0) {
                        errors.push(`Combination "${comboKey}" has no valid quantity-price entries.`);
                    }
                    const qSet = new Set();
                    for (const e of entries) {
                        if (qSet.has(e.minQty)) {
                            errors.push(`Duplicate quantity ${e.minQty} detected in combination "${comboKey}".`);
                        }
                        qSet.add(e.minQty);
                    }
                }
            }
        }
        if (errors.length > 0) {
            throw new common_1.BadRequestException({
                message: 'Cannot publish product due to validation failures',
                errors,
            });
        }
        const updated = await this.prisma.product.update({
            where: { id },
            data: {
                status: catalogue_dto_1.ProductStatusDto.PUBLISHED,
                isActive: true,
            },
        });
        await this.auditService.log({
            actorId,
            action: 'PRODUCT_PUBLISHED',
            entity: 'Product',
            entityId: id,
            previousState: { status: product.status },
            newState: { status: catalogue_dto_1.ProductStatusDto.PUBLISHED },
        });
        return updated;
    }
    async archiveProduct(id, actorId) {
        const product = await this.getProductById(id);
        const updated = await this.prisma.product.update({
            where: { id },
            data: {
                status: catalogue_dto_1.ProductStatusDto.ARCHIVED,
                isActive: false,
            },
        });
        await this.auditService.log({
            actorId,
            action: 'PRODUCT_ARCHIVED',
            entity: 'Product',
            entityId: id,
            previousState: { status: product.status },
            newState: { status: catalogue_dto_1.ProductStatusDto.ARCHIVED },
        });
        return updated;
    }
    async deleteProduct(id, actorId) {
        const product = await this.getProductById(id);
        const orderItemCount = await this.prisma.orderItem.count({
            where: { productId: id },
        });
        if (orderItemCount > 0) {
            return this.archiveProduct(id, actorId);
        }
        await this.prisma.product.delete({ where: { id } });
        await this.auditService.log({
            actorId,
            action: 'PRODUCT_DELETED',
            entity: 'Product',
            entityId: id,
            previousState: product,
        });
        return { success: true, message: `Product '${product.name}' deleted successfully` };
    }
    async listReusableGroups() {
        return this.prisma.reusableOptionGroup.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
    }
    async getReusableGroupById(id) {
        const group = await this.prisma.reusableOptionGroup.findUnique({
            where: { id },
        });
        if (!group) {
            throw new common_1.NotFoundException(`Reusable option group '${id}' not found`);
        }
        return group;
    }
    async createReusableGroup(dto, actorId) {
        const existing = await this.prisma.reusableOptionGroup.findFirst({
            where: { code: dto.code },
        });
        if (existing) {
            throw new common_1.ConflictException(`Reusable group code '${dto.code}' already exists`);
        }
        const group = await this.prisma.reusableOptionGroup.create({
            data: {
                name: dto.name,
                code: dto.code,
                inputType: dto.inputType || 'SELECT',
                description: dto.description,
                defaultOptions: dto.defaultOptions || [],
                metadata: dto.metadata || {},
                sortOrder: dto.sortOrder ?? 0,
                enableAdditionalPricing: Boolean(dto.enableAdditionalPricing),
                selectionBehavior: dto.selectionBehavior || 'SINGLE',
                isActive: dto.isActive ?? true,
            },
        });
        await this.auditService.log({
            actorId,
            action: 'REUSABLE_OPTION_GROUP_CREATED',
            entity: 'ReusableOptionGroup',
            entityId: group.id,
            newState: group,
        });
        return group;
    }
    async updateReusableGroup(id, dto, actorId) {
        const group = await this.getReusableGroupById(id);
        if (dto.code && dto.code !== group.code) {
            const existing = await this.prisma.reusableOptionGroup.findFirst({
                where: { code: dto.code, NOT: { id } },
            });
            if (existing) {
                throw new common_1.ConflictException(`Reusable group code '${dto.code}' already exists`);
            }
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const master = await tx.reusableOptionGroup.update({
                where: { id },
                data: {
                    ...(dto.name !== undefined && { name: dto.name }),
                    ...(dto.code !== undefined && { code: dto.code }),
                    ...(dto.inputType !== undefined && { inputType: dto.inputType }),
                    ...(dto.description !== undefined && { description: dto.description }),
                    ...(dto.defaultOptions !== undefined && { defaultOptions: dto.defaultOptions }),
                    ...(dto.metadata !== undefined && { metadata: dto.metadata }),
                    ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
                    ...(dto.enableAdditionalPricing !== undefined && { enableAdditionalPricing: dto.enableAdditionalPricing }),
                    ...(dto.selectionBehavior !== undefined && { selectionBehavior: dto.selectionBehavior }),
                    ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                },
            });
            const attachedProductGroups = await tx.productOptionGroup.findMany({
                where: {
                    OR: [{ reusableGroupId: id }, { code: group.code }],
                },
                include: {
                    options: true,
                },
            });
            const nextName = dto.name !== undefined ? dto.name : group.name;
            const nextCode = dto.code !== undefined ? dto.code : group.code;
            const nextInputType = dto.inputType !== undefined ? dto.inputType : group.inputType;
            const nextDescription = dto.description !== undefined ? dto.description : group.description;
            const nextIsActive = dto.isActive !== undefined ? dto.isActive : group.isActive;
            for (const prodGrp of attachedProductGroups) {
                await tx.productOptionGroup.update({
                    where: { id: prodGrp.id },
                    data: {
                        reusableGroupId: id,
                        name: nextName,
                        code: nextCode,
                        inputType: nextInputType,
                        description: nextDescription,
                        enableAdditionalPricing: dto.enableAdditionalPricing !== undefined ? dto.enableAdditionalPricing : prodGrp.enableAdditionalPricing,
                        selectionBehavior: dto.selectionBehavior !== undefined ? dto.selectionBehavior : prodGrp.selectionBehavior,
                        isActive: nextIsActive,
                    },
                });
                if (dto.code && dto.code !== group.code) {
                    await tx.productConfigurationRule.updateMany({
                        where: { productId: prodGrp.productId, conditionGroupCode: group.code },
                        data: { conditionGroupCode: dto.code },
                    });
                    await tx.productConfigurationRule.updateMany({
                        where: { productId: prodGrp.productId, targetGroupCode: group.code },
                        data: { targetGroupCode: dto.code },
                    });
                    await tx.productAdditionalPricing.updateMany({
                        where: { productId: prodGrp.productId, groupCode: group.code },
                        data: { groupCode: dto.code },
                    });
                }
                if (dto.defaultOptions && Array.isArray(dto.defaultOptions)) {
                    const newOpts = dto.defaultOptions;
                    const existingOptsMap = new Map(prodGrp.options.map((o) => [o.value, o]));
                    await tx.productOption.deleteMany({
                        where: { groupId: prodGrp.id },
                    });
                    for (let i = 0; i < newOpts.length; i++) {
                        const rawOpt = newOpts[i];
                        const existing = existingOptsMap.get(rawOpt.value);
                        await tx.productOption.create({
                            data: {
                                groupId: prodGrp.id,
                                label: rawOpt.label || existing?.label || rawOpt.value,
                                value: rawOpt.value,
                                priceModifierType: existing?.priceModifierType || 'FIXED',
                                priceModifier: existing?.priceModifier || 0,
                                sortOrder: rawOpt.sortOrder !== undefined ? rawOpt.sortOrder : i,
                                isDefault: rawOpt.isDefault !== undefined ? rawOpt.isDefault : (existing?.isDefault ?? i === 0),
                                isActive: rawOpt.isActive !== undefined ? rawOpt.isActive : (existing?.isActive ?? true),
                                fileCount: existing?.fileCount || 0,
                                fileSlotLabels: existing?.fileSlotLabels || [],
                                minMegapixels: existing?.minMegapixels || null,
                            },
                        });
                    }
                }
            }
            return {
                ...master,
                affectedProductsCount: attachedProductGroups.length,
            };
        });
        await this.auditService.log({
            actorId,
            action: 'REUSABLE_OPTION_GROUP_UPDATED',
            entity: 'ReusableOptionGroup',
            entityId: updated.id,
            previousState: group,
            newState: updated,
            reason: `Updated master reusable group and synchronized across ${updated.affectedProductsCount} product(s)`,
        });
        return updated;
    }
    async deleteReusableGroup(id, actorId) {
        const group = await this.getReusableGroupById(id);
        const attachedProductGroups = await this.prisma.productOptionGroup.findMany({
            where: {
                OR: [{ reusableGroupId: id }, { code: group.code }],
            },
            select: { id: true, productId: true },
        });
        const attachedGroupIds = attachedProductGroups.map((g) => g.id);
        await this.prisma.$transaction(async (tx) => {
            if (attachedGroupIds.length > 0) {
                await tx.productOption.deleteMany({
                    where: { groupId: { in: attachedGroupIds } },
                });
                await tx.productOptionGroup.deleteMany({
                    where: { id: { in: attachedGroupIds } },
                });
                await tx.productConfigurationRule.updateMany({
                    where: {
                        OR: [
                            { conditionGroupCode: group.code },
                            { targetGroupCode: group.code },
                        ],
                    },
                    data: { isActive: false },
                });
                await tx.productAdditionalPricing.deleteMany({
                    where: {
                        productId: { in: attachedProductGroups.map((p) => p.productId) },
                        groupCode: group.code,
                    },
                });
            }
            await tx.reusableOptionGroup.delete({
                where: { id },
            });
        });
        await this.auditService.log({
            actorId,
            action: 'REUSABLE_OPTION_GROUP_DELETED',
            entity: 'ReusableOptionGroup',
            entityId: id,
            previousState: group,
            reason: `Deleted reusable group and removed across ${attachedProductGroups.length} product(s)`,
        });
        return {
            success: true,
            affectedProductsCount: attachedProductGroups.length,
            message: `Reusable group '${group.name}' removed from library and deleted across ${attachedProductGroups.length} product(s).`,
        };
    }
    async addOptionGroup(productId, dto, actorId) {
        await this.getProductById(productId);
        const existing = await this.prisma.productOptionGroup.findFirst({
            where: { productId, code: dto.code },
        });
        if (existing) {
            throw new common_1.ConflictException(`Option group code '${dto.code}' already exists for this product`);
        }
        const group = await this.prisma.$transaction(async (tx) => {
            const created = await tx.productOptionGroup.create({
                data: {
                    productId,
                    reusableGroupId: dto.reusableGroupId || null,
                    name: dto.name,
                    code: dto.code,
                    inputType: dto.inputType || 'SELECT',
                    description: dto.description,
                    isRequired: dto.isRequired ?? true,
                    isCustomerVisible: dto.isCustomerVisible ?? true,
                    sortOrder: dto.sortOrder ?? 0,
                    enableAdditionalPricing: Boolean(dto.enableAdditionalPricing),
                    isActive: dto.isActive ?? true,
                },
            });
            if (dto.options && dto.options.length > 0) {
                for (let i = 0; i < dto.options.length; i++) {
                    const opt = dto.options[i];
                    await tx.productOption.create({
                        data: {
                            groupId: created.id,
                            label: opt.label,
                            value: opt.value,
                            priceModifierType: opt.priceModifierType || 'FIXED',
                            priceModifier: opt.priceModifier || 0,
                            sortOrder: opt.sortOrder ?? i,
                            isDefault: opt.isDefault ?? i === 0,
                            isActive: opt.isActive ?? true,
                            fileCount: opt.fileCount,
                            fileSlotLabels: opt.fileSlotLabels || [],
                            minMegapixels: opt.minMegapixels,
                        },
                    });
                }
            }
            return created;
        });
        await this.auditService.log({
            actorId,
            action: 'OPTION_GROUP_CREATED',
            entity: 'ProductOptionGroup',
            entityId: group.id,
            newState: group,
        });
        return this.prisma.productOptionGroup.findUnique({
            where: { id: group.id },
            include: { options: { orderBy: { sortOrder: 'asc' } } },
        });
    }
    async updateOptionGroup(groupId, dto, actorId) {
        const current = await this.prisma.productOptionGroup.findUnique({ where: { id: groupId } });
        if (!current) {
            throw new common_1.NotFoundException(`Option group with ID '${groupId}' not found`);
        }
        if (dto.code && dto.code !== current.code) {
            const existing = await this.prisma.productOptionGroup.findFirst({
                where: { productId: current.productId, code: dto.code },
            });
            if (existing) {
                throw new common_1.ConflictException(`Option group code '${dto.code}' already exists for this product`);
            }
        }
        const updated = await this.prisma.productOptionGroup.update({
            where: { id: groupId },
            data: {
                name: dto.name,
                code: dto.code,
                inputType: dto.inputType,
                description: dto.description,
                isRequired: dto.isRequired,
                isCustomerVisible: dto.isCustomerVisible,
                sortOrder: dto.sortOrder,
                isActive: dto.isActive,
            },
            include: { options: { orderBy: { sortOrder: 'asc' } } },
        });
        await this.auditService.log({
            actorId,
            action: 'OPTION_GROUP_UPDATED',
            entity: 'ProductOptionGroup',
            entityId: groupId,
            previousState: current,
            newState: updated,
        });
        return updated;
    }
    async deleteOptionGroup(groupId, actorId) {
        const group = await this.prisma.productOptionGroup.findUnique({ where: { id: groupId } });
        if (!group) {
            throw new common_1.NotFoundException(`Option group with ID '${groupId}' not found`);
        }
        await this.prisma.productOption.deleteMany({ where: { groupId } });
        await this.prisma.productOptionGroup.delete({ where: { id: groupId } });
        await this.auditService.log({
            actorId,
            action: 'OPTION_GROUP_DELETED',
            entity: 'ProductOptionGroup',
            entityId: groupId,
            previousState: group,
        });
        return { success: true, message: `Option group '${group.name}' deleted successfully` };
    }
    async reorderOptionGroups(productId, orderedGroupIds, actorId) {
        await this.prisma.$transaction(orderedGroupIds.map((id, index) => this.prisma.productOptionGroup.update({
            where: { id },
            data: { sortOrder: index },
        })));
        await this.auditService.log({
            actorId,
            action: 'OPTION_GROUPS_REORDERED',
            entity: 'Product',
            entityId: productId,
        });
        return { success: true, message: 'Option groups reordered' };
    }
    async addOption(groupId, dto, actorId) {
        const group = await this.prisma.productOptionGroup.findUnique({ where: { id: groupId } });
        if (!group) {
            throw new common_1.NotFoundException(`Option group with ID '${groupId}' not found`);
        }
        const option = await this.prisma.productOption.create({
            data: {
                groupId,
                label: dto.label,
                value: dto.value,
                priceModifierType: dto.priceModifierType || 'FIXED',
                priceModifier: dto.priceModifier || 0,
                sortOrder: dto.sortOrder ?? 0,
                isDefault: dto.isDefault ?? false,
                isActive: dto.isActive ?? true,
                fileCount: dto.fileCount,
                fileSlotLabels: dto.fileSlotLabels || [],
                minMegapixels: dto.minMegapixels,
            },
        });
        await this.auditService.log({
            actorId,
            action: 'PRODUCT_OPTION_CREATED',
            entity: 'ProductOption',
            entityId: option.id,
            newState: option,
        });
        return option;
    }
    async updateOption(optionId, dto, actorId) {
        const current = await this.prisma.productOption.findUnique({ where: { id: optionId } });
        if (!current) {
            throw new common_1.NotFoundException(`Option with ID '${optionId}' not found`);
        }
        const updated = await this.prisma.productOption.update({
            where: { id: optionId },
            data: {
                label: dto.label,
                value: dto.value,
                priceModifierType: dto.priceModifierType,
                priceModifier: dto.priceModifier,
                sortOrder: dto.sortOrder,
                isDefault: dto.isDefault,
                isActive: dto.isActive,
                fileCount: dto.fileCount,
                fileSlotLabels: dto.fileSlotLabels,
                minMegapixels: dto.minMegapixels,
            },
        });
        await this.auditService.log({
            actorId,
            action: 'PRODUCT_OPTION_UPDATED',
            entity: 'ProductOption',
            entityId: optionId,
            previousState: current,
            newState: updated,
        });
        return updated;
    }
    async deleteOption(optionId, actorId) {
        const option = await this.prisma.productOption.findUnique({ where: { id: optionId } });
        if (!option) {
            throw new common_1.NotFoundException(`Option with ID '${optionId}' not found`);
        }
        await this.prisma.productOption.delete({ where: { id: optionId } });
        await this.auditService.log({
            actorId,
            action: 'PRODUCT_OPTION_DELETED',
            entity: 'ProductOption',
            entityId: optionId,
            previousState: option,
        });
        return { success: true, message: `Option '${option.label}' deleted successfully` };
    }
    async bulkSaveOptions(groupId, dto, actorId) {
        const group = await this.prisma.productOptionGroup.findUnique({ where: { id: groupId } });
        if (!group) {
            throw new common_1.NotFoundException(`Option group with ID '${groupId}' not found`);
        }
        const saved = await this.prisma.$transaction(async (tx) => {
            await tx.productOption.deleteMany({ where: { groupId } });
            const created = [];
            for (let i = 0; i < dto.options.length; i++) {
                const opt = dto.options[i];
                const record = await tx.productOption.create({
                    data: {
                        groupId,
                        label: opt.label,
                        value: opt.value,
                        priceModifierType: opt.priceModifierType || 'FIXED',
                        priceModifier: opt.priceModifier || 0,
                        sortOrder: opt.sortOrder ?? i,
                        isDefault: opt.isDefault ?? i === 0,
                        isActive: opt.isActive ?? true,
                        fileCount: opt.fileCount,
                        fileSlotLabels: opt.fileSlotLabels || [],
                        minMegapixels: opt.minMegapixels,
                    },
                });
                created.push(record);
            }
            return created;
        });
        await this.auditService.log({
            actorId,
            action: 'BULK_OPTIONS_SAVED',
            entity: 'ProductOptionGroup',
            entityId: groupId,
            reason: `Bulk saved ${saved.length} options for group ${group.name}`,
        });
        return saved;
    }
    async reorderOptions(groupId, orderedOptionIds, actorId) {
        await this.prisma.$transaction(orderedOptionIds.map((id, index) => this.prisma.productOption.update({
            where: { id },
            data: { sortOrder: index },
        })));
        await this.auditService.log({
            actorId,
            action: 'OPTIONS_REORDERED',
            entity: 'ProductOptionGroup',
            entityId: groupId,
        });
        return { success: true, message: 'Options reordered' };
    }
    validateRules(rules) {
        const conditionMap = new Map();
        for (const rule of rules) {
            const condKey = `${rule.conditionGroupCode}:${rule.conditionOptionValue}`;
            if (!conditionMap.has(condKey)) {
                conditionMap.set(condKey, []);
            }
            conditionMap.get(condKey).push(rule);
        }
        for (const [cond, ruleList] of conditionMap.entries()) {
            const targetActions = new Map();
            const chargeActions = new Map();
            for (const r of ruleList) {
                if (r.targetGroupCode) {
                    const prevAction = targetActions.get(r.targetGroupCode);
                    if ((prevAction === 'SHOW' && r.actionType === 'HIDE') ||
                        (prevAction === 'HIDE' && r.actionType === 'SHOW') ||
                        (prevAction === 'REQUIRE' && r.actionType === 'DISABLE')) {
                        throw new common_1.BadRequestException(`Contradictory configuration rule detected for condition '${cond}' on target group '${r.targetGroupCode}': cannot both ${prevAction} and ${r.actionType}`);
                    }
                    targetActions.set(r.targetGroupCode, r.actionType);
                }
                if (r.actionType === 'APPLY_CHARGE' || r.actionType === 'REMOVE_CHARGE') {
                    const payload = r.actionPayload || {};
                    const chargeId = payload.chargeId || r.name;
                    if (r.actionType === 'APPLY_CHARGE') {
                        if (payload.amount !== undefined && Number(payload.amount) < 0) {
                            throw new common_1.BadRequestException(`Charge amount for rule '${r.name}' cannot be negative.`);
                        }
                    }
                    const prevChargeAction = chargeActions.get(chargeId);
                    if ((prevChargeAction === 'APPLY_CHARGE' && r.actionType === 'REMOVE_CHARGE') ||
                        (prevChargeAction === 'REMOVE_CHARGE' && r.actionType === 'APPLY_CHARGE')) {
                        throw new common_1.BadRequestException(`Contradictory configuration rule detected for condition '${cond}' on charge '${chargeId}': cannot both APPLY_CHARGE and REMOVE_CHARGE`);
                    }
                    chargeActions.set(chargeId, r.actionType);
                }
            }
        }
        const graph = new Map();
        for (const rule of rules) {
            if (rule.targetGroupCode && rule.conditionGroupCode !== rule.targetGroupCode) {
                if (!graph.has(rule.conditionGroupCode)) {
                    graph.set(rule.conditionGroupCode, new Set());
                }
                graph.get(rule.conditionGroupCode).add(rule.targetGroupCode);
            }
        }
        for (const [source, targets] of graph.entries()) {
            for (const target of targets) {
                if (graph.get(target)?.has(source)) {
                    throw new common_1.BadRequestException(`Circular dependency rule detected between option groups '${source}' and '${target}'`);
                }
            }
        }
    }
    async saveConfigurationRules(productId, rules, actorId) {
        await this.getProductById(productId);
        this.validateRules(rules);
        const saved = await this.prisma.$transaction(async (tx) => {
            await tx.productConfigurationRule.deleteMany({ where: { productId } });
            const records = [];
            for (let i = 0; i < rules.length; i++) {
                const r = rules[i];
                const record = await tx.productConfigurationRule.create({
                    data: {
                        productId,
                        name: r.name,
                        conditionGroupCode: r.conditionGroupCode,
                        conditionOperator: r.conditionOperator || 'EQUALS',
                        conditionOptionValue: r.conditionOptionValue,
                        actionType: r.actionType,
                        targetGroupCode: r.targetGroupCode,
                        targetOptionValue: r.targetOptionValue,
                        actionPayload: r.actionPayload,
                        isActive: r.isActive ?? true,
                    },
                });
                records.push(record);
            }
            return records;
        });
        await this.auditService.log({
            actorId,
            action: 'CONFIGURATION_RULES_SAVED',
            entity: 'Product',
            entityId: productId,
            reason: `Saved ${saved.length} configuration rules`,
        });
        return saved;
    }
    async deleteConfigurationRule(ruleId, actorId) {
        const rule = await this.prisma.productConfigurationRule.findUnique({ where: { id: ruleId } });
        if (!rule) {
            throw new common_1.NotFoundException(`Configuration rule with ID '${ruleId}' not found`);
        }
        await this.prisma.productConfigurationRule.delete({ where: { id: ruleId } });
        await this.auditService.log({
            actorId,
            action: 'CONFIGURATION_RULE_DELETED',
            entity: 'ProductConfigurationRule',
            entityId: ruleId,
            previousState: rule,
        });
        return { success: true, message: `Rule '${rule.name}' deleted successfully` };
    }
    async configurePricingSource(productId, dto, actorId) {
        await this.getProductById(productId);
        const pricingSource = await this.prisma.productPricingSource.upsert({
            where: { productId },
            create: {
                productId,
                sourceType: dto.sourceType || 'GOOGLE_SHEETS',
                spreadsheetId: dto.spreadsheetId,
                worksheetName: dto.worksheetName,
                apiKey: dto.apiKey,
                columnMapping: dto.columnMapping,
            },
            update: {
                sourceType: dto.sourceType || 'GOOGLE_SHEETS',
                spreadsheetId: dto.spreadsheetId,
                worksheetName: dto.worksheetName,
                apiKey: dto.apiKey,
                columnMapping: dto.columnMapping,
            },
        });
        await this.auditService.log({
            actorId,
            action: 'PRICING_SOURCE_CONFIGURED',
            entity: 'ProductPricingSource',
            entityId: pricingSource.id,
            newState: pricingSource,
        });
        return pricingSource;
    }
    async syncPricingSheet(productId, dto, actorId) {
        const product = await this.getProductById(productId);
        let pricingSource = product.pricingSource;
        if (!pricingSource) {
            pricingSource = await this.prisma.productPricingSource.create({
                data: {
                    productId,
                    sourceType: 'GOOGLE_SHEETS',
                    spreadsheetId: dto.spreadsheetId || null,
                    worksheetName: dto.worksheetName || null,
                },
            });
        }
        const errors = [];
        const rows = dto.manualRows || [];
        const seenTiers = new Set();
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.minQty || row.minQty < 1) {
                errors.push(`Row ${i + 1}: minQty must be >= 1`);
            }
            if (!row.maxQty || row.maxQty < row.minQty) {
                errors.push(`Row ${i + 1}: maxQty must be >= minQty`);
            }
            if (row.unitPrice === undefined || row.unitPrice <= 0) {
                errors.push(`Row ${i + 1}: unitPrice must be greater than 0`);
            }
            const comboKey = `${JSON.stringify(row.combination || {})}-${row.minQty}-${row.maxQty}`;
            if (seenTiers.has(comboKey)) {
                errors.push(`Row ${i + 1}: Duplicate quantity tier [${row.minQty} - ${row.maxQty}] for combination`);
            }
            seenTiers.add(comboKey);
        }
        const status = errors.length === 0 ? 'SUCCESS' : 'FAILED';
        const message = status === 'SUCCESS'
            ? `Successfully synchronized ${rows.length} pricing matrix tiers`
            : `Synchronization failed with ${errors.length} validation errors`;
        const syncLog = await this.prisma.productPricingSyncLog.create({
            data: {
                pricingSourceId: pricingSource.id,
                status,
                recordsParsed: rows.length,
                recordsImported: status === 'SUCCESS' ? rows.length : 0,
                errorMessage: errors.length > 0 ? errors.join('; ') : null,
                errorDetails: errors.length > 0 ? errors : client_1.Prisma.JsonNull,
                triggeredBy: actorId,
            },
        });
        if (status === 'SUCCESS' && rows.length > 0) {
            await this.prisma.$transaction(async (tx) => {
                await tx.pricingMatrix.deleteMany({ where: { productId } });
                for (const row of rows) {
                    await tx.pricingMatrix.create({
                        data: {
                            productId,
                            minQty: row.minQty,
                            maxQty: row.maxQty,
                            unitPrice: new client_1.Prisma.Decimal(row.unitPrice),
                            attributeCombination: row.combination || {},
                        },
                    });
                }
                await tx.productPricingSource.update({
                    where: { id: pricingSource.id },
                    data: {
                        lastSyncAt: new Date(),
                        syncStatus: status,
                        syncRowCount: rows.length,
                        syncMessage: message,
                    },
                });
            });
        }
        if (status === 'FAILED') {
            throw new common_1.BadRequestException({
                message,
                errors,
                syncLogId: syncLog.id,
            });
        }
        await this.auditService.log({
            actorId,
            action: 'PRICING_SYNC_EXECUTED',
            entity: 'ProductPricingSyncLog',
            entityId: syncLog.id,
            newState: { status, rows: rows.length },
        });
        return {
            status,
            message,
            syncedRows: rows.length,
            syncLogId: syncLog.id,
            lastSyncedAt: new Date(),
        };
    }
    async getPricingSyncLogs(productId) {
        const product = await this.getProductById(productId);
        if (!product.pricingSource) {
            return [];
        }
        return this.prisma.productPricingSyncLog.findMany({
            where: { pricingSourceId: product.pricingSource.id },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }
    async uploadProductImage(productId, file, metadata, actorId) {
        const product = await this.getProductById(productId);
        const relativeUrl = `/uploads/products/${file.filename}`;
        return this.prisma.$transaction(async (tx) => {
            if (metadata?.isPrimary) {
                await tx.productImage.updateMany({
                    where: { productId },
                    data: { isPrimary: false },
                });
            }
            const count = await tx.productImage.count({ where: { productId } });
            const isPrimary = metadata?.isPrimary || count === 0;
            const image = await tx.productImage.create({
                data: {
                    productId,
                    url: relativeUrl,
                    storageKey: file.filename,
                    altText: metadata?.altText || product.name,
                    caption: metadata?.caption,
                    sortOrder: count,
                    isPrimary,
                },
            });
            await this.auditService.log({
                actorId,
                action: 'PRODUCT_IMAGE_UPLOADED',
                entity: 'ProductImage',
                entityId: image.id,
                newState: image,
            });
            return image;
        });
    }
    async addProductImage(productId, dto, actorId) {
        const product = await this.getProductById(productId);
        return this.prisma.$transaction(async (tx) => {
            if (dto.isPrimary) {
                await tx.productImage.updateMany({
                    where: { productId },
                    data: { isPrimary: false },
                });
            }
            const count = await tx.productImage.count({ where: { productId } });
            const isPrimary = dto.isPrimary || count === 0;
            const image = await tx.productImage.create({
                data: {
                    productId,
                    url: dto.url,
                    storageKey: dto.storageKey,
                    altText: dto.altText || product.name,
                    caption: dto.caption,
                    sortOrder: dto.sortOrder ?? count,
                    isPrimary,
                },
            });
            await this.auditService.log({
                actorId,
                action: 'PRODUCT_IMAGE_ADDED',
                entity: 'ProductImage',
                entityId: image.id,
                newState: image,
            });
            return image;
        });
    }
    async setPrimaryImage(productId, imageId, actorId) {
        const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
        if (!image || image.productId !== productId) {
            throw new common_1.NotFoundException(`Image with ID '${imageId}' not found on this product`);
        }
        await this.prisma.$transaction([
            this.prisma.productImage.updateMany({
                where: { productId },
                data: { isPrimary: false },
            }),
            this.prisma.productImage.update({
                where: { id: imageId },
                data: { isPrimary: true },
            }),
        ]);
        await this.auditService.log({
            actorId,
            action: 'PRIMARY_IMAGE_SET',
            entity: 'ProductImage',
            entityId: imageId,
            reason: `Set as primary image for product ${productId}`,
        });
        return { success: true, message: 'Primary image updated' };
    }
    async deleteProductImage(productId, imageId, actorId) {
        const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
        if (!image || image.productId !== productId) {
            throw new common_1.NotFoundException(`Image not found on product`);
        }
        await this.prisma.productImage.delete({ where: { id: imageId } });
        if (image.isPrimary) {
            const nextImg = await this.prisma.productImage.findFirst({
                where: { productId },
                orderBy: { sortOrder: 'asc' },
            });
            if (nextImg) {
                await this.prisma.productImage.update({
                    where: { id: nextImg.id },
                    data: { isPrimary: true },
                });
            }
        }
        await this.auditService.log({
            actorId,
            action: 'PRODUCT_IMAGE_DELETED',
            entity: 'ProductImage',
            entityId: imageId,
            previousState: image,
        });
        return { success: true, message: 'Image deleted successfully' };
    }
    async reorderImages(productId, orderedImageIds, actorId) {
        await this.prisma.$transaction(orderedImageIds.map((id, index) => this.prisma.productImage.update({
            where: { id },
            data: { sortOrder: index },
        })));
        await this.auditService.log({
            actorId,
            action: 'PRODUCT_IMAGES_REORDERED',
            entity: 'Product',
            entityId: productId,
        });
        return { success: true, message: 'Image ordering updated' };
    }
    async listInventoryItems(query) {
        const where = {
            ...(query?.category ? { category: query.category } : {}),
            ...(query?.search
                ? {
                    OR: [
                        { name: { contains: query.search, mode: 'insensitive' } },
                        { sku: { contains: query.search, mode: 'insensitive' } },
                        { location: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const items = await this.prisma.inventoryItem.findMany({
            where,
            include: {
                movements: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { name: 'asc' },
        });
        if (query?.lowStockOnly) {
            return items.filter((item) => Number(item.currentStock) <= Number(item.minStockThreshold));
        }
        return items;
    }
    async createInventoryItem(dto, actorId) {
        const existing = await this.prisma.inventoryItem.findUnique({
            where: { sku: dto.sku },
        });
        if (existing) {
            throw new common_1.ConflictException(`Inventory SKU '${dto.sku}' already exists`);
        }
        const item = await this.prisma.$transaction(async (tx) => {
            const created = await tx.inventoryItem.create({
                data: {
                    name: dto.name,
                    sku: dto.sku,
                    category: dto.category,
                    unit: dto.unit,
                    currentStock: dto.currentStock,
                    minStockThreshold: dto.minStockThreshold || 100,
                    costPerUnit: dto.costPerUnit || 0,
                    location: dto.location,
                    notes: dto.notes,
                },
            });
            if (dto.currentStock > 0) {
                await tx.stockMovement.create({
                    data: {
                        inventoryItemId: created.id,
                        type: 'STOCK_IN',
                        quantity: dto.currentStock,
                        balanceAfter: dto.currentStock,
                        referenceType: 'INITIAL_COUNT',
                        notes: 'Initial inventory setup',
                        performedById: actorId,
                    },
                });
            }
            return created;
        });
        await this.auditService.log({
            actorId,
            action: 'INVENTORY_ITEM_CREATED',
            entity: 'InventoryItem',
            entityId: item.id,
            newState: item,
        });
        return item;
    }
    async updateInventoryItem(id, dto, actorId) {
        const current = await this.prisma.inventoryItem.findUnique({ where: { id } });
        if (!current) {
            throw new common_1.NotFoundException(`Inventory item with ID '${id}' not found`);
        }
        const updated = await this.prisma.inventoryItem.update({
            where: { id },
            data: {
                name: dto.name,
                sku: dto.sku,
                category: dto.category,
                unit: dto.unit,
                minStockThreshold: dto.minStockThreshold,
                costPerUnit: dto.costPerUnit,
                location: dto.location,
                notes: dto.notes,
                isActive: dto.isActive,
            },
        });
        await this.auditService.log({
            actorId,
            action: 'INVENTORY_ITEM_UPDATED',
            entity: 'InventoryItem',
            entityId: id,
            previousState: current,
            newState: updated,
        });
        return updated;
    }
    async recordStockMovement(itemId, dto, actorId) {
        const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
        if (!item) {
            throw new common_1.NotFoundException(`Inventory item with ID '${itemId}' not found`);
        }
        const currentQty = Number(item.currentStock);
        const movementQty = Number(dto.quantity);
        let newBalance = currentQty;
        if (dto.type === 'STOCK_IN' || dto.type === 'RETURN') {
            newBalance = currentQty + movementQty;
        }
        else if (dto.type === 'CONSUMPTION' || dto.type === 'RELEASE') {
            if (currentQty < movementQty) {
                throw new common_1.BadRequestException(`Insufficient stock. Available: ${currentQty} ${item.unit}, Requested: ${movementQty} ${item.unit}`);
            }
            newBalance = currentQty - movementQty;
        }
        else if (dto.type === 'ADJUSTMENT') {
            newBalance = movementQty;
        }
        const movement = await this.prisma.$transaction(async (tx) => {
            await tx.inventoryItem.update({
                where: { id: itemId },
                data: { currentStock: newBalance },
            });
            return tx.stockMovement.create({
                data: {
                    inventoryItemId: itemId,
                    type: dto.type,
                    quantity: movementQty,
                    balanceAfter: newBalance,
                    referenceType: dto.referenceType || 'MANUAL_AUDIT',
                    referenceId: dto.referenceId,
                    notes: dto.notes,
                    performedById: actorId,
                },
            });
        });
        await this.auditService.log({
            actorId,
            action: 'STOCK_MOVEMENT_RECORDED',
            entity: 'StockMovement',
            entityId: movement.id,
            newState: {
                type: dto.type,
                quantity: movementQty,
                previousBalance: currentQty,
                newBalance,
            },
        });
        return {
            movement,
            item: await this.prisma.inventoryItem.findUnique({ where: { id: itemId } }),
        };
    }
    async listStockMovements(itemId) {
        return this.prisma.stockMovement.findMany({
            where: {
                ...(itemId ? { inventoryItemId: itemId } : {}),
            },
            include: {
                inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    async listPricingRules(productId) {
        await this.getProductById(productId);
        return this.prisma.pricingMatrix.findMany({
            where: { productId },
            orderBy: { minQty: 'asc' },
        });
    }
    async addPricingRule(productId, dto, actorId) {
        const product = await this.getProductById(productId);
        const base = Number(product.basePrice);
        let unitPrice = dto.unitPrice;
        if (dto.discountPercent !== undefined && (!unitPrice || unitPrice <= 0)) {
            unitPrice = Math.round(base * (1 - dto.discountPercent / 100) * 10000) / 10000;
        }
        if (!unitPrice || unitPrice <= 0) {
            unitPrice = base;
        }
        const combo = {
            ...(dto.attributeCombination || {}),
            discountPercent: dto.discountPercent,
            label: dto.label || (dto.discountPercent ? `${dto.discountPercent}% Volume Offer` : undefined),
        };
        const rule = await this.prisma.pricingMatrix.create({
            data: {
                productId,
                minQty: dto.minQty,
                maxQty: dto.maxQty,
                unitPrice: new client_1.Prisma.Decimal(unitPrice),
                attributeCombination: combo,
            },
        });
        await this.auditService.log({
            actorId,
            action: 'PRICING_RULE_CREATED',
            entity: 'PricingMatrix',
            entityId: rule.id,
            newState: rule,
        });
        return rule;
    }
    async updatePricingRule(ruleId, dto, actorId) {
        const current = await this.prisma.pricingMatrix.findUnique({ where: { id: ruleId } });
        if (!current) {
            throw new common_1.NotFoundException(`Pricing rule with ID '${ruleId}' not found`);
        }
        const product = await this.getProductById(current.productId);
        const base = Number(product.basePrice);
        let unitPrice = dto.unitPrice !== undefined ? dto.unitPrice : Number(current.unitPrice);
        if (dto.discountPercent !== undefined && (!dto.unitPrice || dto.unitPrice <= 0)) {
            unitPrice = Math.round(base * (1 - dto.discountPercent / 100) * 10000) / 10000;
        }
        const currentCombo = current.attributeCombination || {};
        const combo = {
            ...currentCombo,
            ...(dto.attributeCombination || {}),
            ...(dto.discountPercent !== undefined ? { discountPercent: dto.discountPercent } : {}),
            ...(dto.label !== undefined ? { label: dto.label } : {}),
        };
        const updated = await this.prisma.pricingMatrix.update({
            where: { id: ruleId },
            data: {
                ...(dto.minQty !== undefined ? { minQty: dto.minQty } : {}),
                ...(dto.maxQty !== undefined ? { maxQty: dto.maxQty } : {}),
                unitPrice: new client_1.Prisma.Decimal(unitPrice),
                attributeCombination: combo,
            },
        });
        await this.auditService.log({
            actorId,
            action: 'PRICING_RULE_UPDATED',
            entity: 'PricingMatrix',
            entityId: ruleId,
            previousState: current,
            newState: updated,
        });
        return updated;
    }
    async deletePricingRule(ruleId, actorId) {
        const current = await this.prisma.pricingMatrix.findUnique({ where: { id: ruleId } });
        if (!current) {
            throw new common_1.NotFoundException(`Pricing rule with ID '${ruleId}' not found`);
        }
        await this.prisma.pricingMatrix.delete({ where: { id: ruleId } });
        await this.auditService.log({
            actorId,
            action: 'PRICING_RULE_DELETED',
            entity: 'PricingMatrix',
            entityId: ruleId,
            previousState: current,
        });
        return { success: true, message: 'Pricing rule deleted successfully' };
    }
    async saveBatchPricingRules(productId, dto, actorId) {
        const product = await this.getProductById(productId);
        const base = Number(product.basePrice);
        return this.prisma.$transaction(async (tx) => {
            await tx.pricingMatrix.deleteMany({ where: { productId } });
            if (dto.rules && dto.rules.length > 0) {
                for (const r of dto.rules) {
                    let unitPrice = r.unitPrice;
                    if (r.discountPercent !== undefined && (!unitPrice || unitPrice <= 0)) {
                        unitPrice = Math.round(base * (1 - r.discountPercent / 100) * 10000) / 10000;
                    }
                    if (!unitPrice || unitPrice <= 0) {
                        unitPrice = base;
                    }
                    const combo = {
                        ...(r.attributeCombination || {}),
                        discountPercent: r.discountPercent,
                        label: r.label || (r.discountPercent ? `${r.discountPercent}% Volume Offer` : undefined),
                    };
                    await tx.pricingMatrix.create({
                        data: {
                            productId,
                            minQty: r.minQty,
                            maxQty: r.maxQty,
                            unitPrice: new client_1.Prisma.Decimal(unitPrice),
                            attributeCombination: combo,
                        },
                    });
                }
            }
            return tx.pricingMatrix.findMany({
                where: { productId },
                orderBy: { minQty: 'asc' },
            });
        });
    }
    async getPricingMatrix(productId) {
        await this.getProductById(productId);
        return this.prisma.pricingMatrix.findMany({
            where: { productId },
            orderBy: [{ minQty: 'asc' }, { createdAt: 'asc' }],
        });
    }
    async savePricingMatrix(productId, dto, actorId) {
        await this.getProductById(productId);
        const rows = dto.rows || [];
        const seenTiers = new Set();
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const minQty = Number(r.minQty) || 1;
            const maxQty = Number(r.maxQty) || minQty;
            const isExcluded = Boolean(r.isExcluded || r.attributeCombination?.isExcluded || r.attributeCombination?.status === 'EXCLUDED');
            if (minQty < 1) {
                throw new common_1.BadRequestException(`Row ${i + 1}: Minimum quantity must be at least 1.`);
            }
            if (maxQty < minQty) {
                throw new common_1.BadRequestException(`Row ${i + 1}: Maximum quantity (${maxQty}) cannot be less than minimum quantity (${minQty}).`);
            }
            if (!isExcluded && (r.unitPrice === undefined || Number(r.unitPrice) <= 0)) {
                throw new common_1.BadRequestException(`Row ${i + 1}: Active combinations must have a positive unit price.`);
            }
            const combo = r.attributeCombination || {};
            const normalizedCombo = Object.keys(combo)
                .filter((k) => !['isExcluded', 'label', 'status', 'discountPercent', 'exclusionReason', 'price', 'totalPrice', 'quantity'].includes(k))
                .sort()
                .reduce((acc, k) => {
                acc[k] = combo[k];
                return acc;
            }, {});
            const tierKey = `${JSON.stringify(normalizedCombo)}_${minQty}_${maxQty}`;
            if (seenTiers.has(tierKey)) {
                const qtyLabel = minQty === maxQty ? `Qty ${minQty}` : `bracket [${minQty}–${maxQty}]`;
                throw new common_1.BadRequestException(`Row ${i + 1}: Duplicate combination detected for ${qtyLabel}.`);
            }
            seenTiers.add(tierKey);
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.pricingMatrix.deleteMany({ where: { productId } });
            for (const r of rows) {
                const isExcluded = Boolean(r.isExcluded || r.attributeCombination?.isExcluded || r.attributeCombination?.status === 'EXCLUDED');
                const rawPrice = r.attributeCombination?.price ?? r.attributeCombination?.totalPrice;
                const calcPrice = rawPrice !== undefined && rawPrice !== null ? Number(rawPrice) : Math.round(Number(r.unitPrice) * (Number(r.minQty) || 1) * 100) / 100;
                const qty = Number(r.minQty) || 1;
                const unitRate = Number(r.unitPrice) > 0 ? Number(r.unitPrice) : (calcPrice / Math.max(1, qty));
                const combo = {
                    ...(r.attributeCombination || {}),
                    price: calcPrice,
                    totalPrice: calcPrice,
                    quantity: qty,
                    isExcluded,
                    status: isExcluded ? 'EXCLUDED' : 'ACTIVE',
                    ...(r.label ? { label: r.label } : {}),
                    ...(r.discountPercent ? { discountPercent: Number(r.discountPercent) } : {}),
                    ...(r.exclusionReason ? { exclusionReason: r.exclusionReason } : {}),
                };
                await tx.pricingMatrix.create({
                    data: {
                        productId,
                        minQty: qty,
                        maxQty: Number(r.maxQty) || qty,
                        unitPrice: new client_1.Prisma.Decimal(unitRate),
                        attributeCombination: combo,
                    },
                });
            }
            await this.auditService.log({
                actorId,
                action: 'PRICING_MATRIX_SAVED',
                entity: 'Product',
                entityId: productId,
                reason: `Saved ${rows.length} manual combination matrix rows`,
            });
            return tx.pricingMatrix.findMany({
                where: { productId },
                orderBy: [{ minQty: 'asc' }, { createdAt: 'asc' }],
            });
        });
    }
    async generateMatrixCombinations(productId) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: {
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
                },
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID '${productId}' not found`);
        }
        const groups = product.optionGroups.filter((g) => g.options.length > 0);
        if (groups.length === 0) {
            return { combinations: [] };
        }
        let combos = [{}];
        for (const group of groups) {
            const nextCombos = [];
            for (const existing of combos) {
                for (const opt of group.options) {
                    nextCombos.push({
                        ...existing,
                        [group.code]: opt.value,
                    });
                }
            }
            combos = nextCombos;
        }
        const rules = product.configurationRules;
        const evaluated = combos.map((combo) => {
            let isExcluded = false;
            let exclusionReason = undefined;
            for (const rule of rules) {
                const condVal = combo[rule.conditionGroupCode];
                if (!condVal)
                    continue;
                let conditionMet = false;
                if (rule.conditionOperator === 'EQUALS') {
                    conditionMet = String(condVal) === String(rule.conditionOptionValue);
                }
                else if (rule.conditionOperator === 'NOT_EQUALS') {
                    conditionMet = String(condVal) !== String(rule.conditionOptionValue);
                }
                else if (rule.conditionOperator === 'IN') {
                    const arr = Array.isArray(rule.conditionOptionValue)
                        ? rule.conditionOptionValue
                        : String(rule.conditionOptionValue).split(',').map((s) => s.trim());
                    conditionMet = arr.includes(String(condVal));
                }
                if (conditionMet) {
                    if (rule.targetGroupCode && rule.targetOptionValue) {
                        if ((rule.actionType === 'HIDE' || rule.actionType === 'DISABLE' || rule.actionType === 'HIDE_OPTION') &&
                            combo[rule.targetGroupCode] === rule.targetOptionValue) {
                            isExcluded = true;
                            exclusionReason = `Incompatible with rule "${rule.name}" (${rule.targetOptionValue} disabled when ${rule.conditionGroupCode}=${condVal})`;
                            break;
                        }
                    }
                }
            }
            return {
                attributeCombination: combo,
                isExcluded,
                exclusionReason,
                unitPrice: Number(product.basePrice) || 0,
                minQty: product.minQuantity || 100,
                maxQty: product.minQuantity || 100,
            };
        });
        return {
            totalGenerated: evaluated.length,
            combinations: evaluated,
        };
    }
    async getAdditionalPricing(productId) {
        await this.getProductById(productId);
        return this.prisma.productAdditionalPricing.findMany({
            where: { productId },
            orderBy: [{ minQty: 'asc' }, { groupCode: 'asc' }, { optionValue: 'asc' }],
        });
    }
    async saveAdditionalPricing(productId, dto, actorId) {
        const product = await this.getProductById(productId);
        const tiers = dto.tiers || [];
        const productGroups = product.optionGroups || [];
        const groupMap = new Map();
        for (const g of productGroups) {
            const activeOptions = g.options.filter((o) => o.isActive !== false);
            groupMap.set(g.code, {
                group: g,
                optionValueSet: new Set(activeOptions.map((o) => o.value)),
            });
        }
        const seenCombos = new Set();
        for (let i = 0; i < tiers.length; i++) {
            const t = tiers[i];
            const minQty = Number(t.minQty) || 1;
            const maxQty = Number(t.maxQty) || minQty;
            const unitPrice = Number(t.unitPrice) || 0;
            if (minQty < 1) {
                throw new common_1.BadRequestException(`Tier ${i + 1}: Minimum quantity must be at least 1.`);
            }
            if (maxQty < minQty) {
                throw new common_1.BadRequestException(`Tier ${i + 1}: Maximum quantity (${maxQty}) cannot be less than minimum quantity (${minQty}).`);
            }
            if (unitPrice < 0) {
                throw new common_1.BadRequestException(`Tier ${i + 1}: Additional unit price cannot be negative.`);
            }
            const grpInfo = groupMap.get(t.groupCode);
            if (!grpInfo) {
                throw new common_1.BadRequestException(`Tier ${i + 1}: Option group code '${t.groupCode}' does not exist on product '${product.name}'.`);
            }
            if (!grpInfo.optionValueSet.has(t.optionValue)) {
                throw new common_1.BadRequestException(`Tier ${i + 1}: Option value '${t.optionValue}' does not belong to active options of group '${t.groupCode}'.`);
            }
            const tierKey = `${t.groupCode}_${t.optionValue}_${minQty}_${maxQty}`;
            if (seenCombos.has(tierKey)) {
                throw new common_1.BadRequestException(`Tier ${i + 1}: Duplicate additional pricing tier for '${t.groupCode}' / '${t.optionValue}' at quantity bracket [${minQty}–${maxQty}].`);
            }
            seenCombos.add(tierKey);
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.productAdditionalPricing.deleteMany({ where: { productId } });
            for (const t of tiers) {
                const minQty = Number(t.minQty) || 1;
                const maxQty = Number(t.maxQty) || minQty;
                const unitPrice = Number(t.unitPrice) || 0;
                await tx.productAdditionalPricing.create({
                    data: {
                        productId,
                        groupCode: t.groupCode,
                        optionValue: t.optionValue,
                        minQty,
                        maxQty,
                        unitPrice: new client_1.Prisma.Decimal(unitPrice),
                        chargeBasis: t.chargeBasis || 'PER_UNIT',
                        isExcluded: Boolean(t.isExcluded),
                    },
                });
            }
            await this.auditService.log({
                actorId,
                action: 'PRODUCT_ADDITIONAL_PRICING_SAVED',
                entity: 'Product',
                entityId: productId,
                reason: `Saved ${tiers.length} group-based additional pricing tiers`,
            });
            return tx.productAdditionalPricing.findMany({
                where: { productId },
                orderBy: [{ minQty: 'asc' }, { groupCode: 'asc' }, { optionValue: 'asc' }],
            });
        });
    }
};
exports.AdminCatalogueService = AdminCatalogueService;
exports.AdminCatalogueService = AdminCatalogueService = AdminCatalogueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AdminCatalogueService);
//# sourceMappingURL=admin-catalogue.service.js.map