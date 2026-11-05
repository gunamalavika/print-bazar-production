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
exports.OperationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const operations_service_1 = require("./operations.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const roles_1 = require("../../common/types/roles");
let OperationsController = class OperationsController {
    operationsService;
    constructor(operationsService) {
        this.operationsService = operationsService;
    }
    async getDashboard() {
        return this.operationsService.getDashboardMetrics();
    }
    async listOrders(query) {
        return this.operationsService.listOperationalOrders(query);
    }
    async intakeOrders(query) {
        return this.operationsService.listOperationalOrders({ ...query, newIntake: 'true' });
    }
    async unassignedDesign(query) {
        return this.operationsService.listOperationalOrders({ ...query, unassignedDesign: 'true' });
    }
    async unassignedProduction(query) {
        return this.operationsService.listOperationalOrders({ ...query, unassignedProduction: 'true' });
    }
    async blockedOrders(query) {
        return this.operationsService.listOperationalOrders({ ...query, blocked: 'true' });
    }
    async getOrderDetail(id) {
        return this.operationsService.getOperationalOrderDetail(id);
    }
    async getTimeline(id) {
        return this.operationsService.getOrderTimeline(id);
    }
    async assignDesigner(id, body, user) {
        return this.operationsService.assignDesigner(id, body, user);
    }
    async assignProductionOperator(id, body, user) {
        return this.operationsService.assignProductionOperator(id, body, user);
    }
    async addNote(id, body, user) {
        return this.operationsService.addOperationalNote(id, body, user);
    }
    async updatePriority(id, body, user) {
        return this.operationsService.updateOrderPriority(id, body, user);
    }
    async getDesigners() {
        return this.operationsService.getEligibleDesigners();
    }
    async getOperators() {
        return this.operationsService.getEligibleProductionOperators();
    }
    async getOrderReadiness(id) {
        return this.operationsService.getOrderReadiness(id);
    }
    async releaseToProduction(id, body, user) {
        return this.operationsService.releaseToProduction(id, body, user);
    }
};
exports.OperationsController = OperationsController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'Get OE dashboard aggregate metrics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('orders'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'List all orders with operational filters and pagination' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "listOrders", null);
__decorate([
    (0, common_1.Get)('orders/intake'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'List incoming customer orders needing OE triage/assignment' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "intakeOrders", null);
__decorate([
    (0, common_1.Get)('orders/unassigned/design'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'List orders needing design with no assigned designer' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "unassignedDesign", null);
__decorate([
    (0, common_1.Get)('orders/unassigned/production'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'List orders in production queue with no assigned operator' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "unassignedProduction", null);
__decorate([
    (0, common_1.Get)('orders/blocked'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'List orders blocked by payment, QC, hold, or other issues' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "blockedOrders", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'Get full operational detail for a single order' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "getOrderDetail", null);
__decorate([
    (0, common_1.Get)('orders/:id/timeline'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'Get order timeline: status history, audit, assignments, notes' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "getTimeline", null);
__decorate([
    (0, common_1.Post)('orders/:id/design-assignment'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'Assign or reassign a designer to an order' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "assignDesigner", null);
__decorate([
    (0, common_1.Post)('orders/:id/production-assignment'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'Assign or reassign a production operator to an order' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "assignProductionOperator", null);
__decorate([
    (0, common_1.Post)('orders/:id/notes'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'Add internal operational note to an order' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "addNote", null);
__decorate([
    (0, common_1.Patch)('orders/:id/priority'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'Update order priority with audited reason' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "updatePriority", null);
__decorate([
    (0, common_1.Get)('assignees/designers'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'List eligible designers for assignment with workload info' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "getDesigners", null);
__decorate([
    (0, common_1.Get)('assignees/operators'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'List eligible production operators for assignment with workload info' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "getOperators", null);
__decorate([
    (0, common_1.Get)('orders/:id/readiness'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'Get order production readiness report with automated size validation' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "getOrderReadiness", null);
__decorate([
    (0, common_1.Post)('orders/:id/release-to-production'),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'Release order to production queue with automated size check and Job Card creation' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OperationsController.prototype, "releaseToProduction", null);
exports.OperationsController = OperationsController = __decorate([
    (0, swagger_1.ApiTags)('operations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, common_1.Controller)('operations'),
    __metadata("design:paramtypes", [operations_service_1.OperationsService])
], OperationsController);
//# sourceMappingURL=operations.controller.js.map