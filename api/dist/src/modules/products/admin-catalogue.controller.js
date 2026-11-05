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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminCatalogueController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path = require("path");
const fs = require("fs");
const admin_catalogue_service_1 = require("./admin-catalogue.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const roles_1 = require("../../common/types/roles");
const catalogue_dto_1 = require("./dto/catalogue.dto");
const productImageStorage = (0, multer_1.diskStorage)({
    destination: (_req, _file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'products');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const uniqueName = `${baseName}_${Date.now()}${ext}`;
        cb(null, uniqueName);
    },
});
let AdminCatalogueController = class AdminCatalogueController {
    catalogueService;
    constructor(catalogueService) {
        this.catalogueService = catalogueService;
    }
    async listCategories() {
        return this.catalogueService.listCategories();
    }
    async getCategoryById(id) {
        return this.catalogueService.getCategoryById(id);
    }
    async createCategory(dto, user) {
        return this.catalogueService.createCategory(dto, user?.sub);
    }
    async updateCategory(id, dto, user) {
        return this.catalogueService.updateCategory(id, dto, user?.sub);
    }
    async deleteCategory(id, user) {
        return this.catalogueService.deleteCategory(id, user?.sub);
    }
    async listProducts(categoryId, status, search, page, limit) {
        return this.catalogueService.listProducts({
            categoryId,
            status,
            search,
            page,
            limit,
        });
    }
    async getProductById(id) {
        return this.catalogueService.getProductById(id);
    }
    async createProduct(dto, user) {
        return this.catalogueService.createProduct(dto, user?.sub);
    }
    async updateProduct(id, dto, user) {
        return this.catalogueService.updateProduct(id, dto, user?.sub);
    }
    async duplicateProduct(id, user) {
        return this.catalogueService.duplicateProduct(id, user?.sub);
    }
    async publishProduct(id, user) {
        return this.catalogueService.publishProduct(id, user?.sub);
    }
    async archiveProduct(id, user) {
        return this.catalogueService.archiveProduct(id, user?.sub);
    }
    async deleteProduct(id, user) {
        return this.catalogueService.deleteProduct(id, user?.sub);
    }
    async listReusableGroups() {
        return this.catalogueService.listReusableGroups();
    }
    async getReusableGroupById(id) {
        return this.catalogueService.getReusableGroupById(id);
    }
    async createReusableGroup(dto, user) {
        return this.catalogueService.createReusableGroup(dto, user?.sub);
    }
    async updateReusableGroup(id, dto, user) {
        return this.catalogueService.updateReusableGroup(id, dto, user?.sub);
    }
    async deleteReusableGroup(id, user) {
        return this.catalogueService.deleteReusableGroup(id, user?.sub);
    }
    async addOptionGroup(productId, dto, user) {
        return this.catalogueService.addOptionGroup(productId, dto, user?.sub);
    }
    async updateOptionGroup(groupId, dto, user) {
        return this.catalogueService.updateOptionGroup(groupId, dto, user?.sub);
    }
    async deleteOptionGroup(groupId, user) {
        return this.catalogueService.deleteOptionGroup(groupId, user?.sub);
    }
    async reorderOptionGroups(productId, orderedGroupIds, user) {
        return this.catalogueService.reorderOptionGroups(productId, orderedGroupIds, user?.sub);
    }
    async addOption(groupId, dto, user) {
        return this.catalogueService.addOption(groupId, dto, user?.sub);
    }
    async updateOption(optionId, dto, user) {
        return this.catalogueService.updateOption(optionId, dto, user?.sub);
    }
    async deleteOption(optionId, user) {
        return this.catalogueService.deleteOption(optionId, user?.sub);
    }
    async bulkSaveOptions(groupId, dto, user) {
        return this.catalogueService.bulkSaveOptions(groupId, dto, user?.sub);
    }
    async reorderOptions(groupId, orderedOptionIds, user) {
        return this.catalogueService.reorderOptions(groupId, orderedOptionIds, user?.sub);
    }
    async saveConfigurationRules(productId, rules, user) {
        return this.catalogueService.saveConfigurationRules(productId, rules || [], user?.sub);
    }
    async deleteConfigurationRule(ruleId, user) {
        return this.catalogueService.deleteConfigurationRule(ruleId, user?.sub);
    }
    async configurePricingSource(productId, dto, user) {
        return this.catalogueService.configurePricingSource(productId, dto, user?.sub);
    }
    async syncPricingSheet(productId, dto, user) {
        return this.catalogueService.syncPricingSheet(productId, dto, user?.sub);
    }
    async getPricingSyncLogs(productId) {
        return this.catalogueService.getPricingSyncLogs(productId);
    }
    async uploadProductImage(productId, file, altText, caption, isPrimary, user) {
        if (!file) {
            throw new common_1.BadRequestException('No media file provided');
        }
        const isPrimaryBool = isPrimary === 'true' || isPrimary === true;
        return this.catalogueService.uploadProductImage(productId, file, { altText, caption, isPrimary: isPrimaryBool }, user?.sub);
    }
    async uploadMedia(file) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        const relativeUrl = `/uploads/products/${file.filename}`;
        return {
            url: relativeUrl,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
        };
    }
    async addProductImage(productId, dto, user) {
        return this.catalogueService.addProductImage(productId, dto, user?.sub);
    }
    async setPrimaryImage(productId, imageId, user) {
        return this.catalogueService.setPrimaryImage(productId, imageId, user?.sub);
    }
    async deleteProductImage(productId, imageId, user) {
        return this.catalogueService.deleteProductImage(productId, imageId, user?.sub);
    }
    async reorderImages(productId, orderedImageIds, user) {
        return this.catalogueService.reorderImages(productId, orderedImageIds, user?.sub);
    }
    async listInventoryItems(category, search, lowStockOnly) {
        return this.catalogueService.listInventoryItems({
            category,
            search,
            lowStockOnly: Boolean(lowStockOnly),
        });
    }
    async createInventoryItem(dto, user) {
        return this.catalogueService.createInventoryItem(dto, user?.sub);
    }
    async updateInventoryItem(id, dto, user) {
        return this.catalogueService.updateInventoryItem(id, dto, user?.sub);
    }
    async recordStockMovement(id, dto, user) {
        return this.catalogueService.recordStockMovement(id, dto, user?.sub);
    }
    async listStockMovements(itemId) {
        return this.catalogueService.listStockMovements(itemId);
    }
    async listPricingRules(productId) {
        return this.catalogueService.listPricingRules(productId);
    }
    async addPricingRule(productId, dto, user) {
        return this.catalogueService.addPricingRule(productId, dto, user?.sub);
    }
    async updatePricingRule(ruleId, dto, user) {
        return this.catalogueService.updatePricingRule(ruleId, dto, user?.sub);
    }
    async deletePricingRule(ruleId, user) {
        return this.catalogueService.deletePricingRule(ruleId, user?.sub);
    }
    async saveBatchPricingRules(productId, dto, user) {
        return this.catalogueService.saveBatchPricingRules(productId, dto, user?.sub);
    }
    async getPricingMatrix(productId) {
        return this.catalogueService.getPricingMatrix(productId);
    }
    async savePricingMatrix(productId, dto, user) {
        return this.catalogueService.savePricingMatrix(productId, dto, user?.sub);
    }
    async generateMatrixCombinations(productId) {
        return this.catalogueService.generateMatrixCombinations(productId);
    }
    async getAdditionalPricing(productId) {
        return this.catalogueService.getAdditionalPricing(productId);
    }
    async saveAdditionalPricing(productId, dto, user) {
        return this.catalogueService.saveAdditionalPricing(productId, dto, user?.sub);
    }
};
exports.AdminCatalogueController = AdminCatalogueController;
__decorate([
    (0, common_1.Get)('catalogue/categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "listCategories", null);
__decorate([
    (0, common_1.Get)('catalogue/categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "getCategoryById", null);
__decorate([
    (0, common_1.Post)('catalogue/categories'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [catalogue_dto_1.CreateCategoryDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Put)('catalogue/categories/:id'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.UpdateCategoryDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('catalogue/categories/:id'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "deleteCategory", null);
__decorate([
    (0, common_1.Get)('catalogue/products'),
    __param(0, (0, common_1.Query)('categoryId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "listProducts", null);
__decorate([
    (0, common_1.Get)('catalogue/products/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "getProductById", null);
__decorate([
    (0, common_1.Post)('catalogue/products'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [catalogue_dto_1.CreateProductDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Put)('catalogue/products/:id'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.UpdateProductDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Post)('catalogue/products/:id/duplicate'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "duplicateProduct", null);
__decorate([
    (0, common_1.Patch)('catalogue/products/:id/publish'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "publishProduct", null);
__decorate([
    (0, common_1.Patch)('catalogue/products/:id/archive'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "archiveProduct", null);
__decorate([
    (0, common_1.Delete)('catalogue/products/:id'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "deleteProduct", null);
__decorate([
    (0, common_1.Get)('catalogue/reusable-groups'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "listReusableGroups", null);
__decorate([
    (0, common_1.Get)('catalogue/reusable-groups/:id'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "getReusableGroupById", null);
__decorate([
    (0, common_1.Post)('catalogue/reusable-groups'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [catalogue_dto_1.CreateReusableOptionGroupDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "createReusableGroup", null);
__decorate([
    (0, common_1.Put)('catalogue/reusable-groups/:id'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.UpdateReusableOptionGroupDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "updateReusableGroup", null);
__decorate([
    (0, common_1.Delete)('catalogue/reusable-groups/:id'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "deleteReusableGroup", null);
__decorate([
    (0, common_1.Post)('catalogue/products/:productId/option-groups'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.CreateProductOptionGroupDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "addOptionGroup", null);
__decorate([
    (0, common_1.Put)('catalogue/products/:productId/option-groups/:groupId'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.UpdateProductOptionGroupDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "updateOptionGroup", null);
__decorate([
    (0, common_1.Delete)('catalogue/products/:productId/option-groups/:groupId'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "deleteOptionGroup", null);
__decorate([
    (0, common_1.Patch)('catalogue/products/:productId/option-groups/reorder'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)('orderedGroupIds')),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "reorderOptionGroups", null);
__decorate([
    (0, common_1.Post)('catalogue/option-groups/:groupId/options'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.CreateProductOptionDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "addOption", null);
__decorate([
    (0, common_1.Put)('catalogue/options/:optionId'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('optionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.UpdateProductOptionDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "updateOption", null);
__decorate([
    (0, common_1.Delete)('catalogue/options/:optionId'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('optionId')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "deleteOption", null);
__decorate([
    (0, common_1.Post)('catalogue/option-groups/:groupId/options-bulk'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.BulkOptionsDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "bulkSaveOptions", null);
__decorate([
    (0, common_1.Patch)('catalogue/option-groups/:groupId/options/reorder'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, common_1.Body)('orderedOptionIds')),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "reorderOptions", null);
__decorate([
    (0, common_1.Put)('catalogue/products/:productId/configuration-rules'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)('rules')),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "saveConfigurationRules", null);
__decorate([
    (0, common_1.Delete)('catalogue/products/:productId/configuration-rules/:ruleId'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('ruleId')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "deleteConfigurationRule", null);
__decorate([
    (0, common_1.Put)('catalogue/products/:productId/pricing-source'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.ConfigurePricingSourceDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "configurePricingSource", null);
__decorate([
    (0, common_1.Post)('catalogue/products/:productId/sync-pricing-sheet'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.SyncPricingSheetDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "syncPricingSheet", null);
__decorate([
    (0, common_1.Get)('catalogue/products/:productId/pricing-sync-logs'),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "getPricingSyncLogs", null);
__decorate([
    (0, common_1.Post)('catalogue/products/:productId/upload-image'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: productImageStorage,
        limits: { fileSize: 100 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('altText')),
    __param(3, (0, common_1.Body)('caption')),
    __param(4, (0, common_1.Body)('isPrimary')),
    __param(5, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "uploadProductImage", null);
__decorate([
    (0, common_1.Post)('catalogue/upload-media'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: productImageStorage,
        limits: { fileSize: 100 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "uploadMedia", null);
__decorate([
    (0, common_1.Post)('catalogue/products/:productId/images'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.CreateProductImageDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "addProductImage", null);
__decorate([
    (0, common_1.Patch)('catalogue/products/:productId/images/:imageId/primary'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Param)('imageId')),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "setPrimaryImage", null);
__decorate([
    (0, common_1.Delete)('catalogue/products/:productId/images/:imageId'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Param)('imageId')),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "deleteProductImage", null);
__decorate([
    (0, common_1.Patch)('catalogue/products/:productId/images/reorder'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)('orderedImageIds')),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "reorderImages", null);
__decorate([
    (0, common_1.Get)('inventory/items'),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('lowStockOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Boolean]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "listInventoryItems", null);
__decorate([
    (0, common_1.Post)('inventory/items'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [catalogue_dto_1.CreateInventoryItemDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "createInventoryItem", null);
__decorate([
    (0, common_1.Put)('inventory/items/:id'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.UpdateInventoryItemDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "updateInventoryItem", null);
__decorate([
    (0, common_1.Post)('inventory/items/:id/movement'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.RecordStockMovementDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "recordStockMovement", null);
__decorate([
    (0, common_1.Get)('inventory/movements'),
    __param(0, (0, common_1.Query)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "listStockMovements", null);
__decorate([
    (0, common_1.Get)('catalogue/products/:productId/pricing-rules'),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "listPricingRules", null);
__decorate([
    (0, common_1.Post)('catalogue/products/:productId/pricing-rules'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.CreatePricingRuleDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "addPricingRule", null);
__decorate([
    (0, common_1.Put)('catalogue/products/:productId/pricing-rules/:ruleId'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('ruleId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.UpdatePricingRuleDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "updatePricingRule", null);
__decorate([
    (0, common_1.Delete)('catalogue/products/:productId/pricing-rules/:ruleId'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('ruleId')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "deletePricingRule", null);
__decorate([
    (0, common_1.Put)('catalogue/products/:productId/pricing-rules-batch'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.BatchPricingRulesDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "saveBatchPricingRules", null);
__decorate([
    (0, common_1.Get)('catalogue/products/:productId/pricing-matrix'),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "getPricingMatrix", null);
__decorate([
    (0, common_1.Put)('catalogue/products/:productId/pricing-matrix'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "savePricingMatrix", null);
__decorate([
    (0, common_1.Post)('catalogue/products/:productId/pricing-matrix/generate-combinations'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "generateMatrixCombinations", null);
__decorate([
    (0, common_1.Get)('catalogue/products/:productId/additional-pricing'),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "getAdditionalPricing", null);
__decorate([
    (0, common_1.Put)('catalogue/products/:productId/additional-pricing'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalogue_dto_1.SaveProductAdditionalPricingDto, Object]),
    __metadata("design:returntype", Promise)
], AdminCatalogueController.prototype, "saveAdditionalPricing", null);
exports.AdminCatalogueController = AdminCatalogueController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.SALES_OFFICE, roles_1.UserRole.PRODUCTION_OPERATOR, roles_1.UserRole.ACCOUNTS),
    __metadata("design:paramtypes", [admin_catalogue_service_1.AdminCatalogueService])
], AdminCatalogueController);
//# sourceMappingURL=admin-catalogue.controller.js.map