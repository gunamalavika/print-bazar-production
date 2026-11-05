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
var ShippingConfigService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingConfigService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let ShippingConfigService = class ShippingConfigService {
    static { ShippingConfigService_1 = this; }
    prisma;
    auditService;
    logger = new common_1.Logger(ShippingConfigService_1.name);
    static CONFIG_ID = 'default';
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async getConfiguration() {
        let config = await this.prisma.shippingConfiguration.findUnique({
            where: { id: ShippingConfigService_1.CONFIG_ID },
        });
        if (!config) {
            config = await this.prisma.shippingConfiguration.create({
                data: {
                    id: ShippingConfigService_1.CONFIG_ID,
                    businessName: 'PRINT BAZAAR 2.0',
                    originAddress: '10/24 Industrial Estate, Peelamedu',
                    originCity: 'Coimbatore',
                    originState: 'Tamil Nadu',
                    originCountry: 'India',
                    originPincode: '641004',
                    isWeightBasedEnabled: true,
                    isPincodeZoneEnabled: true,
                    minShippingCharge: 40.0,
                    freeShippingThreshold: 2000.0,
                    isFreeShippingEnabled: true,
                    defaultPackagingWeightGrams: 200.0,
                    gstRate: 18.0,
                },
            });
        }
        return config;
    }
    async updateConfiguration(dto, actorId) {
        const prev = await this.getConfiguration();
        const updated = await this.prisma.shippingConfiguration.upsert({
            where: { id: ShippingConfigService_1.CONFIG_ID },
            create: {
                id: ShippingConfigService_1.CONFIG_ID,
                ...dto,
            },
            update: {
                ...dto,
            },
        });
        await this.auditService.log({
            actorId,
            action: 'SHIPPING_CONFIG_UPDATED',
            entity: 'ShippingConfiguration',
            entityId: ShippingConfigService_1.CONFIG_ID,
            previousState: prev,
            newState: updated,
        });
        return updated;
    }
};
exports.ShippingConfigService = ShippingConfigService;
exports.ShippingConfigService = ShippingConfigService = ShippingConfigService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ShippingConfigService);
//# sourceMappingURL=shipping-config.service.js.map