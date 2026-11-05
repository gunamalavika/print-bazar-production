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
exports.WorkflowController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const workflow_state_service_1 = require("./workflow-state.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const roles_1 = require("../../common/types/roles");
const workflow_1 = require("../../common/types/workflow");
let WorkflowController = class WorkflowController {
    workflowService;
    constructor(workflowService) {
        this.workflowService = workflowService;
    }
    async transition(body, user) {
        return this.workflowService.transition(body, user);
    }
    async managerOverride(body, user) {
        return this.workflowService.managerOverride(body, user);
    }
    async pauseOrder(orderId, reason, user) {
        return this.workflowService.pauseOrder(orderId, reason || 'Production Hold', user);
    }
    async resumeOrder(orderId, preHoldStatus, user) {
        return this.workflowService.resumeOrder(orderId, preHoldStatus, user);
    }
};
exports.WorkflowController = WorkflowController;
__decorate([
    (0, common_1.Post)('transition'),
    (0, swagger_1.ApiOperation)({ summary: 'Transition order through authoritative workflow state machine' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorkflowController.prototype, "transition", null);
__decorate([
    (0, common_1.Post)('override'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Admin / Manager manual workflow override (Audited)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorkflowController.prototype, "managerOverride", null);
__decorate([
    (0, common_1.Post)(':orderId/pause'),
    (0, swagger_1.ApiOperation)({ summary: 'Pause an active order and record preHoldStatus' }),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WorkflowController.prototype, "pauseOrder", null);
__decorate([
    (0, common_1.Post)(':orderId/resume'),
    (0, swagger_1.ApiOperation)({ summary: 'Resume a paused order back to its exact preHoldStatus' }),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)('preHoldStatus')),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WorkflowController.prototype, "resumeOrder", null);
exports.WorkflowController = WorkflowController = __decorate([
    (0, swagger_1.ApiTags)('workflow'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, common_1.Controller)('workflow'),
    __metadata("design:paramtypes", [workflow_state_service_1.WorkflowStateService])
], WorkflowController);
//# sourceMappingURL=workflow.controller.js.map