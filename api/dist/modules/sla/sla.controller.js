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
exports.SlaController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sla_service_1 = require("./sla.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const roles_1 = require("../../common/types/roles");
let SlaController = class SlaController {
    slaService;
    constructor(slaService) {
        this.slaService = slaService;
    }
    async getOverview() {
        return this.slaService.getSlaOverview();
    }
};
exports.SlaController = SlaController;
__decorate([
    (0, common_1.Get)('overview'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.SALES_OFFICE),
    (0, swagger_1.ApiOperation)({ summary: 'Get operational SLA health, at-risk orders, and delay alerts' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SlaController.prototype, "getOverview", null);
exports.SlaController = SlaController = __decorate([
    (0, swagger_1.ApiTags)('sla'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, common_1.Controller)('sla'),
    __metadata("design:paramtypes", [sla_service_1.SlaService])
], SlaController);
//# sourceMappingURL=sla.controller.js.map