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
exports.ProductionBoardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const production_board_service_1 = require("./production-board.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
let ProductionBoardController = class ProductionBoardController {
    boardService;
    constructor(boardService) {
        this.boardService = boardService;
    }
    async getBoard(filters, user) {
        return this.boardService.getBoardData(filters, user);
    }
    async transitionJob(id, dto, user) {
        return this.boardService.transitionJob(id, dto, user);
    }
    async createColumn(dto, user) {
        return this.boardService.createColumn(dto, user);
    }
    async reorderColumns(columnOrders, user) {
        return this.boardService.reorderColumns(columnOrders, user);
    }
    async updateColumn(id, dto, user) {
        return this.boardService.updateColumn(id, dto, user);
    }
    async archiveColumn(id, user) {
        return this.boardService.archiveColumn(id, user);
    }
};
exports.ProductionBoardController = ProductionBoardController;
__decorate([
    (0, common_1.Get)('board'),
    (0, swagger_1.ApiOperation)({ summary: 'Get complete visual production Kanban board with active columns, cards, and shop floor metrics' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProductionBoardController.prototype, "getBoard", null);
__decorate([
    (0, common_1.Post)('jobs/:id/transition'),
    (0, swagger_1.ApiOperation)({ summary: 'Execute state transition for a production Job Card via Kanban drag-and-drop or action buttons' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductionBoardController.prototype, "transitionJob", null);
__decorate([
    (0, common_1.Post)('columns'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a custom or operational Hold Kanban column' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProductionBoardController.prototype, "createColumn", null);
__decorate([
    (0, common_1.Patch)('columns/reorder'),
    (0, swagger_1.ApiOperation)({ summary: 'Reorder Kanban columns' }),
    __param(0, (0, common_1.Body)('columnOrders')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], ProductionBoardController.prototype, "reorderColumns", null);
__decorate([
    (0, common_1.Patch)('columns/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update column metadata, color or workflow mapping' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductionBoardController.prototype, "updateColumn", null);
__decorate([
    (0, common_1.Post)('columns/:id/archive'),
    (0, swagger_1.ApiOperation)({ summary: 'Archive/deactivate a custom Kanban column' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductionBoardController.prototype, "archiveColumn", null);
exports.ProductionBoardController = ProductionBoardController = __decorate([
    (0, swagger_1.ApiTags)('production'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, common_1.Controller)('production'),
    __metadata("design:paramtypes", [production_board_service_1.ProductionBoardService])
], ProductionBoardController);
//# sourceMappingURL=production-board.controller.js.map