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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AuditService = AuditService_1 = class AuditService {
    prisma;
    logger = new common_1.Logger(AuditService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(dto) {
        try {
            return await this.prisma.auditLog.create({
                data: {
                    actorId: dto.actorId,
                    actorType: dto.actorType || 'USER',
                    action: dto.action,
                    entity: dto.entity,
                    entityId: dto.entityId,
                    previousState: dto.previousState,
                    newState: dto.newState,
                    reason: dto.reason,
                    ipAddress: dto.ipAddress,
                    userAgent: dto.userAgent,
                    orderId: dto.orderId,
                },
            });
        }
        catch (err) {
            this.logger.error(`Failed to record audit log: ${err.message}`, err.stack);
        }
    }
    async findByEntity(entity, entityId) {
        return this.prisma.auditLog.findMany({
            where: { entity, entityId },
            include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByOrder(orderId) {
        return this.prisma.auditLog.findMany({
            where: { orderId },
            include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map