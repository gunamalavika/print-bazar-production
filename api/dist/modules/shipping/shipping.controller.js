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
exports.ShippingController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/guards/auth.guard");
const shipping_service_1 = require("./shipping.service");
const shipping_config_service_1 = require("./shipping-config.service");
const shipping_zone_service_1 = require("./shipping-zone.service");
const shipping_pincode_service_1 = require("./shipping-pincode.service");
const shipping_rate_service_1 = require("./shipping-rate.service");
const shipping_packaging_service_1 = require("./shipping-packaging.service");
const shipping_calculator_service_1 = require("./shipping-calculator.service");
const shipping_dto_1 = require("./dto/shipping.dto");
let ShippingController = class ShippingController {
    shippingService;
    configService;
    zoneService;
    pincodeService;
    rateService;
    packagingService;
    calculatorService;
    constructor(shippingService, configService, zoneService, pincodeService, rateService, packagingService, calculatorService) {
        this.shippingService = shippingService;
        this.configService = configService;
        this.zoneService = zoneService;
        this.pincodeService = pincodeService;
        this.rateService = rateService;
        this.packagingService = packagingService;
        this.calculatorService = calculatorService;
    }
    async getOverview() {
        return this.shippingService.getOverview();
    }
    async getOrders(search, pincode, status, page, limit) {
        return this.shippingService.getOrders({
            search,
            pincode,
            status,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
    async getReports() {
        return this.shippingService.getReports();
    }
    async getConfiguration() {
        return this.configService.getConfiguration();
    }
    async updateConfiguration(dto, req) {
        return this.configService.updateConfiguration(dto, req.user?.sub);
    }
    async listZones(search, isActive) {
        const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
        return this.zoneService.listZones(search, activeBool);
    }
    async getZone(id) {
        return this.zoneService.getZone(id);
    }
    async createZone(dto, req) {
        return this.zoneService.createZone(dto, req.user?.sub);
    }
    async updateZone(id, dto, req) {
        return this.zoneService.updateZone(id, dto, req.user?.sub);
    }
    async deleteZone(id, req) {
        return this.zoneService.deleteZone(id, req.user?.sub);
    }
    async listPincodes(search, pincode, city, state, zoneId, isServiceable, page, limit) {
        return this.pincodeService.listPincodes({
            search,
            pincode,
            city,
            state,
            zoneId,
            isServiceable: isServiceable !== undefined ? isServiceable === 'true' : undefined,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
    async exportPincodes() {
        return this.pincodeService.exportPincodes();
    }
    async getPincode(pincode) {
        return this.pincodeService.getPincode(pincode);
    }
    async createPincode(dto, req) {
        return this.pincodeService.createPincode(dto, req.user?.sub);
    }
    async bulkImportPincodes(dto, req) {
        return this.pincodeService.bulkImport(dto, req.user?.sub);
    }
    async updatePincode(id, dto, req) {
        return this.pincodeService.updatePincode(id, dto, req.user?.sub);
    }
    async deletePincode(id, req) {
        return this.pincodeService.deletePincode(id, req.user?.sub);
    }
    async listRateCards(zoneId, isActive) {
        const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
        return this.rateService.listRateCards(zoneId, activeBool);
    }
    async getRateCard(id) {
        return this.rateService.getRateCard(id);
    }
    async createRateCard(dto, req) {
        return this.rateService.createRateCard(dto, req.user?.sub);
    }
    async updateRateCard(id, dto, req) {
        return this.rateService.updateRateCard(id, dto, req.user?.sub);
    }
    async deleteRateCard(id, req) {
        return this.rateService.deleteRateCard(id, req.user?.sub);
    }
    async listPackagingProfiles(isActive) {
        const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
        return this.packagingService.listProfiles(activeBool);
    }
    async createPackagingProfile(dto, req) {
        return this.packagingService.createProfile(dto, req.user?.sub);
    }
    async updatePackagingProfile(id, dto, req) {
        return this.packagingService.updateProfile(id, dto, req.user?.sub);
    }
    async deletePackagingProfile(id, req) {
        return this.packagingService.deleteProfile(id, req.user?.sub);
    }
    async calculateShipping(dto) {
        return this.calculatorService.calculateShipping(dto);
    }
    async checkServiceability(dto) {
        return this.calculatorService.checkServiceability(dto.pincode);
    }
};
exports.ShippingController = ShippingController;
__decorate([
    (0, common_1.Get)('overview'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('orders'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('pincode')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Get)('reports'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getReports", null);
__decorate([
    (0, common_1.Get)('configuration'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getConfiguration", null);
__decorate([
    (0, common_1.Put)('configuration'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_dto_1.UpdateShippingConfigurationDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "updateConfiguration", null);
__decorate([
    (0, common_1.Get)('zones'),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "listZones", null);
__decorate([
    (0, common_1.Get)('zones/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getZone", null);
__decorate([
    (0, common_1.Post)('zones'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_dto_1.CreateShippingZoneDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "createZone", null);
__decorate([
    (0, common_1.Patch)('zones/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shipping_dto_1.UpdateShippingZoneDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "updateZone", null);
__decorate([
    (0, common_1.Delete)('zones/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "deleteZone", null);
__decorate([
    (0, common_1.Get)('pincodes'),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('pincode')),
    __param(2, (0, common_1.Query)('city')),
    __param(3, (0, common_1.Query)('state')),
    __param(4, (0, common_1.Query)('zoneId')),
    __param(5, (0, common_1.Query)('isServiceable')),
    __param(6, (0, common_1.Query)('page')),
    __param(7, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "listPincodes", null);
__decorate([
    (0, common_1.Get)('pincodes/export'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "exportPincodes", null);
__decorate([
    (0, common_1.Get)('pincodes/:pincode'),
    __param(0, (0, common_1.Param)('pincode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getPincode", null);
__decorate([
    (0, common_1.Post)('pincodes'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_dto_1.CreateShippingPincodeDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "createPincode", null);
__decorate([
    (0, common_1.Post)('pincodes/import'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_dto_1.BulkImportPincodesDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "bulkImportPincodes", null);
__decorate([
    (0, common_1.Patch)('pincodes/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shipping_dto_1.UpdateShippingPincodeDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "updatePincode", null);
__decorate([
    (0, common_1.Delete)('pincodes/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "deletePincode", null);
__decorate([
    (0, common_1.Get)('rates'),
    __param(0, (0, common_1.Query)('zoneId')),
    __param(1, (0, common_1.Query)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "listRateCards", null);
__decorate([
    (0, common_1.Get)('rates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getRateCard", null);
__decorate([
    (0, common_1.Post)('rates'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_dto_1.CreateShippingRateCardDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "createRateCard", null);
__decorate([
    (0, common_1.Patch)('rates/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shipping_dto_1.UpdateShippingRateCardDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "updateRateCard", null);
__decorate([
    (0, common_1.Delete)('rates/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "deleteRateCard", null);
__decorate([
    (0, common_1.Get)('packaging'),
    __param(0, (0, common_1.Query)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "listPackagingProfiles", null);
__decorate([
    (0, common_1.Post)('packaging'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_dto_1.CreatePackagingProfileDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "createPackagingProfile", null);
__decorate([
    (0, common_1.Patch)('packaging/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shipping_dto_1.UpdatePackagingProfileDto, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "updatePackagingProfile", null);
__decorate([
    (0, common_1.Delete)('packaging/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "deletePackagingProfile", null);
__decorate([
    (0, common_1.Post)('calculate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_dto_1.ShippingCalculationRequestDto]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "calculateShipping", null);
__decorate([
    (0, common_1.Post)('check-serviceability'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_dto_1.CheckServiceabilityDto]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "checkServiceability", null);
exports.ShippingController = ShippingController = __decorate([
    (0, common_1.Controller)('shipping'),
    __metadata("design:paramtypes", [shipping_service_1.ShippingService,
        shipping_config_service_1.ShippingConfigService,
        shipping_zone_service_1.ShippingZoneService,
        shipping_pincode_service_1.ShippingPincodeService,
        shipping_rate_service_1.ShippingRateService,
        shipping_packaging_service_1.ShippingPackagingService,
        shipping_calculator_service_1.ShippingCalculatorService])
], ShippingController);
//# sourceMappingURL=shipping.controller.js.map