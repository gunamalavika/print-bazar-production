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
exports.PackingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const packing_service_1 = require("./packing.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const roles_1 = require("../../common/types/roles");
let PackingController = class PackingController {
    packingService;
    constructor(packingService) {
        this.packingService = packingService;
    }
    async getPackingQueue(search, priority) {
        return this.packingService.getPackingQueue(search, priority);
    }
    getPackagingMaterials() {
        return this.packingService.getPackagingMaterials();
    }
    async getPackingJob(id) {
        return this.packingService.getPackingJob(id);
    }
    async getPackages(orderId) {
        return this.packingService.getPackagesForOrder(orderId);
    }
    async completePacking(body, user) {
        return this.packingService.completePacking(body, user.sub);
    }
    async recordLabelReprint(id, body, user) {
        return this.packingService.recordLabelReprint(id, user.sub, body);
    }
};
exports.PackingController = PackingController;
__decorate([
    (0, common_1.Get)('queue'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.PACKING_OPERATOR, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.DISPATCH_LOGISTICS),
    (0, swagger_1.ApiOperation)({ summary: 'Get live orders waiting in PACKING stage' }),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('priority')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PackingController.prototype, "getPackingQueue", null);
__decorate([
    (0, common_1.Get)('materials'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available standard cartons and packaging materials' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PackingController.prototype, "getPackagingMaterials", null);
__decorate([
    (0, common_1.Get)('jobs/:id'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.PACKING_OPERATOR, roles_1.UserRole.ADMIN_MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get single order packing details' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PackingController.prototype, "getPackingJob", null);
__decorate([
    (0, common_1.Get)('order/:orderId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get parcel packages registered for an order' }),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PackingController.prototype, "getPackages", null);
__decorate([
    (0, common_1.Post)('complete'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.PACKING_OPERATOR, roles_1.UserRole.ADMIN_MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Complete order packing, capture weights/dimensions, generate parcel barcodes, move to READY_FOR_DISPATCH' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PackingController.prototype, "completePacking", null);
__decorate([
    (0, common_1.Post)('jobs/:id/label/reprint'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.PACKING_OPERATOR, roles_1.UserRole.ADMIN_MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Log shipping label reprint audit event' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PackingController.prototype, "recordLabelReprint", null);
exports.PackingController = PackingController = __decorate([
    (0, swagger_1.ApiTags)('packing'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, common_1.Controller)('packing'),
    __metadata("design:paramtypes", [packing_service_1.PackingService])
], PackingController);
//# sourceMappingURL=packing.controller.js.map