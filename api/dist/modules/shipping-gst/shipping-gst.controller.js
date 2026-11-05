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
exports.ShippingGstController = void 0;
const common_1 = require("@nestjs/common");
const shipping_gst_service_1 = require("./shipping-gst.service");
const shipping_gst_dto_1 = require("./dto/shipping-gst.dto");
const auth_guard_1 = require("../../common/guards/auth.guard");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const roles_1 = require("../../common/types/roles");
let ShippingGstController = class ShippingGstController {
    shippingGstService;
    constructor(shippingGstService) {
        this.shippingGstService = shippingGstService;
    }
    async calculateQuote(dto) {
        return this.shippingGstService.calculateShippingAndTax(dto.subtotal, dto.postalCode, dto.deliveryMethod || 'COURIER', dto.isInterState || false, dto.items, dto.totalQuantity, dto.totalWeightKg);
    }
    async getSettings() {
        return this.shippingGstService.getSettings();
    }
    async updateSettings(dto, user) {
        return this.shippingGstService.updateSettings(dto, user?.sub);
    }
    async listZones() {
        return this.shippingGstService.listZones();
    }
    async createZone(dto, user) {
        return this.shippingGstService.createZone(dto, user?.sub);
    }
    async updateZone(id, dto, user) {
        return this.shippingGstService.updateZone(id, dto, user?.sub);
    }
    async deleteZone(id, user) {
        return this.shippingGstService.deleteZone(id, user?.sub);
    }
    async listProductShippingSettings() {
        return this.shippingGstService.listProductShippingSettings();
    }
    async batchUpdateCategoryShippingSettings(dto, user) {
        return this.shippingGstService.batchUpdateCategoryShippingSettings(dto, user?.sub);
    }
    async updateProductShippingSettings(id, dto, user) {
        return this.shippingGstService.updateProductShippingSettings(id, dto, user?.sub);
    }
};
exports.ShippingGstController = ShippingGstController;
__decorate([
    (0, common_1.Post)('calculate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_gst_dto_1.CalculateShippingAndTaxDto]),
    __metadata("design:returntype", Promise)
], ShippingGstController.prototype, "calculateQuote", null);
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShippingGstController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)('settings'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_gst_dto_1.UpdateShippingGstSettingsDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingGstController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('zones'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShippingGstController.prototype, "listZones", null);
__decorate([
    (0, common_1.Post)('zones'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_gst_dto_1.CreateShippingZoneDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingGstController.prototype, "createZone", null);
__decorate([
    (0, common_1.Put)('zones/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shipping_gst_dto_1.UpdateShippingZoneDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingGstController.prototype, "updateZone", null);
__decorate([
    (0, common_1.Delete)('zones/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShippingGstController.prototype, "deleteZone", null);
__decorate([
    (0, common_1.Get)('products'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShippingGstController.prototype, "listProductShippingSettings", null);
__decorate([
    (0, common_1.Put)('products/batch'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_gst_dto_1.BatchUpdateCategoryShippingSettingsDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingGstController.prototype, "batchUpdateCategoryShippingSettings", null);
__decorate([
    (0, common_1.Put)('products/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shipping_gst_dto_1.UpdateProductShippingSettingsDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingGstController.prototype, "updateProductShippingSettings", null);
exports.ShippingGstController = ShippingGstController = __decorate([
    (0, common_1.Controller)('shipping-gst'),
    __metadata("design:paramtypes", [shipping_gst_service_1.ShippingGstService])
], ShippingGstController);
//# sourceMappingURL=shipping-gst.controller.js.map