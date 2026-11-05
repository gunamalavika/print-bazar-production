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
exports.JobCardsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const job_card_engine_service_1 = require("./job-card-engine.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const client_1 = require("@prisma/client");
let JobCardsController = class JobCardsController {
    jobCardEngine;
    constructor(jobCardEngine) {
        this.jobCardEngine = jobCardEngine;
    }
    async listJobCards(status, station, user) {
        return this.jobCardEngine.listJobCards({ status, station, user });
    }
    async generateJobCard(orderItemId, user) {
        return this.jobCardEngine.generateJobCardForOrderItem(orderItemId, user.sub);
    }
    async claimJob(id, user) {
        return this.jobCardEngine.claimJobCard(id, user.sub);
    }
    async assignMachine(id, machineId) {
        return this.jobCardEngine.assignMachine(id, machineId);
    }
    async startJob(id, user) {
        return this.jobCardEngine.startJob(id, user);
    }
    async completeStation(id, nextStation, user) {
        return this.jobCardEngine.completeStation(id, nextStation, user);
    }
};
exports.JobCardsController = JobCardsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List shop floor job cards filtered by status or work center station' }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('station')),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], JobCardsController.prototype, "listJobCards", null);
__decorate([
    (0, common_1.Post)('auto-generate/:orderItemId'),
    (0, swagger_1.ApiOperation)({ summary: 'Trigger automatic Job Card generation for an approved Order Item' }),
    __param(0, (0, common_1.Param)('orderItemId')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], JobCardsController.prototype, "generateJobCard", null);
__decorate([
    (0, common_1.Post)(':id/claim'),
    (0, swagger_1.ApiOperation)({ summary: 'Operator claims a Job Card from queue' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], JobCardsController.prototype, "claimJob", null);
__decorate([
    (0, common_1.Post)(':id/assign-machine'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign a machine work center to a Job Card' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('machineId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], JobCardsController.prototype, "assignMachine", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    (0, swagger_1.ApiOperation)({ summary: 'Operator starts printing/production run on assigned machine' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], JobCardsController.prototype, "startJob", null);
__decorate([
    (0, common_1.Post)(':id/complete-station'),
    (0, swagger_1.ApiOperation)({ summary: 'Handover Job Card to subsequent work center station' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('nextStation')),
    __param(2, (0, auth_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], JobCardsController.prototype, "completeStation", null);
exports.JobCardsController = JobCardsController = __decorate([
    (0, swagger_1.ApiTags)('job-cards'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, common_1.Controller)('job-cards'),
    __metadata("design:paramtypes", [job_card_engine_service_1.JobCardEngineService])
], JobCardsController);
//# sourceMappingURL=job-cards.controller.js.map