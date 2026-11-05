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
exports.PersonalizationTemplateController = void 0;
const common_1 = require("@nestjs/common");
const personalization_template_service_1 = require("./personalization-template.service");
const personalization_template_dto_1 = require("./personalization-template.dto");
const auth_guard_1 = require("../../../common/guards/auth.guard");
const auth_decorator_1 = require("../../../common/decorators/auth.decorator");
const roles_1 = require("../../../common/types/roles");
const prisma_service_1 = require("../../prisma/prisma.service");
let PersonalizationTemplateController = class PersonalizationTemplateController {
    service;
    prisma;
    constructor(service, prisma) {
        this.service = service;
        this.prisma = prisma;
    }
    async listAdminTemplates(search, category, isActive) {
        const activeBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
        return this.service.listTemplates({
            search,
            category,
            isActive: activeBool,
        });
    }
    async getAdminTemplate(id) {
        return this.service.getTemplateById(id);
    }
    async createTemplate(dto, req) {
        return this.service.createTemplate(dto, req.user?.sub);
    }
    async updateTemplate(id, dto, req) {
        return this.service.updateTemplate(id, dto, req.user?.sub);
    }
    async deleteTemplate(id, req) {
        return this.service.deleteTemplate(id, req.user?.sub);
    }
    async duplicateTemplate(id, req, newName) {
        return this.service.duplicateTemplate(id, newName, req.user?.sub);
    }
    async getPublicTemplate(id) {
        const template = await this.service.getTemplateById(id);
        if (!template.isActive) {
            throw new common_1.NotFoundException(`Personalization template is inactive.`);
        }
        return template;
    }
    async validatePublicPayload(id, body) {
        const template = await this.service.getTemplateById(id);
        return this.service.validatePersonalization(template, Math.max(1, Number(body.quantity) || 1), body.payload, body.productConfigOverride);
    }
    async getItemPersonalizationRecords(orderId, itemId) {
        const orderItem = await this.prisma.orderItem.findFirst({
            where: { id: itemId, orderId },
            include: {
                personalizationRecords: {
                    orderBy: { itemIndex: 'asc' },
                },
            },
        });
        if (!orderItem) {
            throw new common_1.NotFoundException(`Order item '${itemId}' not found in order '${orderId}'.`);
        }
        return {
            orderId,
            itemId,
            productName: orderItem.productName,
            sku: orderItem.sku,
            quantity: orderItem.quantity,
            personalizationData: orderItem.personalizationData,
            records: orderItem.personalizationRecords,
        };
    }
    async exportItemPersonalizationCsv(orderId, itemId, res) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { orderNumber: true },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order '${orderId}' not found.`);
        }
        const orderItem = await this.prisma.orderItem.findFirst({
            where: { id: itemId, orderId },
            include: {
                personalizationRecords: {
                    orderBy: { itemIndex: 'asc' },
                },
            },
        });
        if (!orderItem) {
            throw new common_1.NotFoundException(`Order item '${itemId}' not found.`);
        }
        const csvContent = this.service.generatePersonalizationCsv(order, orderItem, orderItem.personalizationRecords);
        const filename = `personalization-${order.orderNumber}-${orderItem.sku}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvContent);
    }
};
exports.PersonalizationTemplateController = PersonalizationTemplateController;
__decorate([
    (0, common_1.Get)('admin/personalization-templates'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.SALES_OFFICE),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PersonalizationTemplateController.prototype, "listAdminTemplates", null);
__decorate([
    (0, common_1.Get)('admin/personalization-templates/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.SALES_OFFICE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PersonalizationTemplateController.prototype, "getAdminTemplate", null);
__decorate([
    (0, common_1.Post)('admin/personalization-templates'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [personalization_template_dto_1.CreatePersonalizationTemplateDto, Object]),
    __metadata("design:returntype", Promise)
], PersonalizationTemplateController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Put)('admin/personalization-templates/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, personalization_template_dto_1.UpdatePersonalizationTemplateDto, Object]),
    __metadata("design:returntype", Promise)
], PersonalizationTemplateController.prototype, "updateTemplate", null);
__decorate([
    (0, common_1.Delete)('admin/personalization-templates/:id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PersonalizationTemplateController.prototype, "deleteTemplate", null);
__decorate([
    (0, common_1.Post)('admin/personalization-templates/:id/duplicate'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], PersonalizationTemplateController.prototype, "duplicateTemplate", null);
__decorate([
    (0, common_1.Get)('catalogue/personalization-templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PersonalizationTemplateController.prototype, "getPublicTemplate", null);
__decorate([
    (0, common_1.Post)('catalogue/personalization-templates/:id/validate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PersonalizationTemplateController.prototype, "validatePublicPayload", null);
__decorate([
    (0, common_1.Get)('admin/orders/:orderId/items/:itemId/personalization/records'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR, roles_1.UserRole.SALES_OFFICE, roles_1.UserRole.FINAL_QC_INSPECTOR),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PersonalizationTemplateController.prototype, "getItemPersonalizationRecords", null);
__decorate([
    (0, common_1.Get)('admin/orders/:orderId/items/:itemId/personalization/export'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.RolesGuard),
    (0, auth_decorator_1.Roles)(roles_1.UserRole.ADMIN_MANAGER, roles_1.UserRole.OPERATIONAL_MANAGER, roles_1.UserRole.PRODUCTION_OPERATOR, roles_1.UserRole.SALES_OFFICE),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PersonalizationTemplateController.prototype, "exportItemPersonalizationCsv", null);
exports.PersonalizationTemplateController = PersonalizationTemplateController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [personalization_template_service_1.PersonalizationTemplateService,
        prisma_service_1.PrismaService])
], PersonalizationTemplateController);
//# sourceMappingURL=personalization-template.controller.js.map