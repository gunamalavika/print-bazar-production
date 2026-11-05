"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const audit_module_1 = require("../audit/audit.module");
const shipping_controller_1 = require("./shipping.controller");
const shipping_service_1 = require("./shipping.service");
const shipping_config_service_1 = require("./shipping-config.service");
const shipping_zone_service_1 = require("./shipping-zone.service");
const shipping_pincode_service_1 = require("./shipping-pincode.service");
const shipping_rate_service_1 = require("./shipping-rate.service");
const shipping_packaging_service_1 = require("./shipping-packaging.service");
const shipping_calculator_service_1 = require("./shipping-calculator.service");
let ShippingModule = class ShippingModule {
};
exports.ShippingModule = ShippingModule;
exports.ShippingModule = ShippingModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, audit_module_1.AuditModule],
        controllers: [shipping_controller_1.ShippingController],
        providers: [
            shipping_service_1.ShippingService,
            shipping_config_service_1.ShippingConfigService,
            shipping_zone_service_1.ShippingZoneService,
            shipping_pincode_service_1.ShippingPincodeService,
            shipping_rate_service_1.ShippingRateService,
            shipping_packaging_service_1.ShippingPackagingService,
            shipping_calculator_service_1.ShippingCalculatorService,
        ],
        exports: [
            shipping_service_1.ShippingService,
            shipping_config_service_1.ShippingConfigService,
            shipping_zone_service_1.ShippingZoneService,
            shipping_pincode_service_1.ShippingPincodeService,
            shipping_rate_service_1.ShippingRateService,
            shipping_packaging_service_1.ShippingPackagingService,
            shipping_calculator_service_1.ShippingCalculatorService,
        ],
    })
], ShippingModule);
//# sourceMappingURL=shipping.module.js.map