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
exports.DispatchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const dispatch_service_1 = require("./dispatch.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const roles_1 = require("../../common/types/roles");
let DispatchController = class DispatchController {
    dispatchService;
    constructor(dispatchService) {
        this.dispatchService = dispatchService;
    }
    async confirmCourierHandover(body, user) {
        return this.dispatchService.confirmCourierHandover(body, user.sub);
    }
    async confirmStorePickup(body, user) {
        return this.dispatchService.confirmStorePickup(body, user.sub);
    }
    async confirmDelivery(orderId, receiverName) {
        return this.dispatchService.confirmCourierDelivery(orderId, receiverName);
    }
};
exports.DispatchController = DispatchController;
__decorate([
    (0, common_1.Post)('courier-handover'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.DISPATCH_LOGISTICS, roles_1.UserRole.ADMIN_MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Scan parcels and confirm courier handover dispatch' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DispatchController.prototype, "confirmCourierHandover", null);
__decorate([
    (0, common_1.Post)('store-pickup-handover'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.SALES_OFFICE, roles_1.UserRole.DISPATCH_LOGISTICS, roles_1.UserRole.ADMIN_MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Verify zero balance and hand over store pickup parcel to customer' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DispatchController.prototype, "confirmStorePickup", null);
__decorate([
    (0, common_1.Post)(':orderId/confirm-delivery'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.DISPATCH_LOGISTICS, roles_1.UserRole.ADMIN_MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Mark order as DELIVERED upon Proof of Delivery receipt' }),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)('receiverName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DispatchController.prototype, "confirmDelivery", null);
exports.DispatchController = DispatchController = __decorate([
    (0, swagger_1.ApiTags)('dispatch'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, common_1.Controller)('dispatch'),
    __metadata("design:paramtypes", [dispatch_service_1.DispatchService])
], DispatchController);
//# sourceMappingURL=dispatch.controller.js.map