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
var SlaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SlaService = SlaService_1 = class SlaService {
    prisma;
    logger = new common_1.Logger(SlaService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSlaOverview() {
        const now = new Date();
        const [allActiveOrders, activeJobCards, slaRecords] = await Promise.all([
            this.prisma.order.findMany({
                where: {
                    status: {
                        notIn: ['DELIVERED', 'CANCELLED'],
                    },
                },
                select: {
                    id: true,
                    orderNumber: true,
                    status: true,
                    priority: true,
                    slaStatus: true,
                    dueAt: true,
                    createdAt: true,
                },
            }),
            this.prisma.jobCard.findMany({
                where: {
                    status: {
                        notIn: ['COMPLETED', 'PASSED'],
                    },
                },
                select: {
                    id: true,
                    jobNumber: true,
                    status: true,
                    currentStation: true,
                    dueAt: true,
                },
            }),
            this.prisma.slaRecord.findMany({
                where: { isBreached: true },
                include: { order: { select: { orderNumber: true, status: true, priority: true } } },
            }),
        ]);
        let onTimeCount = 0;
        let atRiskCount = 0;
        let delayedCount = 0;
        const delayedOrders = [];
        const atRiskOrders = [];
        for (const order of allActiveOrders) {
            if (!order.dueAt) {
                onTimeCount++;
                continue;
            }
            const diffMs = order.dueAt.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            if (diffHours < 0) {
                delayedCount++;
                delayedOrders.push(order);
            }
            else if (diffHours <= 12) {
                atRiskCount++;
                atRiskOrders.push(order);
            }
            else {
                onTimeCount++;
            }
        }
        return {
            metrics: {
                totalActiveOrders: allActiveOrders.length,
                activeJobCards: activeJobCards.length,
                onTime: onTimeCount,
                atRisk: atRiskCount,
                delayed: delayedCount,
                breachedCount: slaRecords.length,
            },
            delayedOrders,
            atRiskOrders,
        };
    }
};
exports.SlaService = SlaService;
exports.SlaService = SlaService = SlaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SlaService);
//# sourceMappingURL=sla.service.js.map