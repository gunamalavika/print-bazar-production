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
exports.QualityControlController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const qc_service_1 = require("./qc.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const roles_1 = require("../../common/types/roles");
let QualityControlController = class QualityControlController {
    qcService;
    constructor(qcService) {
        this.qcService = qcService;
    }
    getFinalQCTemplate() {
        return this.qcService.getFinalQCTemplate();
    }
    getChecklistsForOrder(orderId) {
        return this.qcService.getChecklistsForOrder(orderId);
    }
    getFinalQCQueue() {
        return this.qcService.getFinalQCQueue();
    }
    async submitInspection(body, user) {
        return this.qcService.submitInspection(body, user.sub);
    }
};
exports.QualityControlController = QualityControlController;
__decorate([
    (0, common_1.Get)('template/final'),
    (0, swagger_1.ApiOperation)({ summary: 'Get Final physical inspection checklist template' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QualityControlController.prototype, "getFinalQCTemplate", null);
__decorate([
    (0, common_1.Get)('order/:orderId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get QC inspection records for an order' }),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QualityControlController.prototype, "getChecklistsForOrder", null);
__decorate([
    (0, common_1.Get)('queue/final'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.FINAL_QC_INSPECTOR, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'Get live queue of orders waiting for Final QC' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QualityControlController.prototype, "getFinalQCQueue", null);
__decorate([
    (0, common_1.Post)('inspect'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.FINAL_QC_INSPECTOR, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'Submit Final physical QC inspection checklist' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], QualityControlController.prototype, "submitInspection", null);
exports.QualityControlController = QualityControlController = __decorate([
    (0, swagger_1.ApiTags)('quality-control'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, common_1.Controller)('qc'),
    __metadata("design:paramtypes", [qc_service_1.QualityControlService])
], QualityControlController);
//# sourceMappingURL=qc.controller.js.map