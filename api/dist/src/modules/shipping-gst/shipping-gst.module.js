"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingGstModule = void 0;
const common_1 = require("@nestjs/common");
const shipping_gst_controller_1 = require("./shipping-gst.controller");
const shipping_gst_service_1 = require("./shipping-gst.service");
const prisma_module_1 = require("../prisma/prisma.module");
const audit_module_1 = require("../audit/audit.module");
let ShippingGstModule = class ShippingGstModule {
};
exports.ShippingGstModule = ShippingGstModule;
exports.ShippingGstModule = ShippingGstModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, audit_module_1.AuditModule],
        controllers: [shipping_gst_controller_1.ShippingGstController],
        providers: [shipping_gst_service_1.ShippingGstService],
        exports: [shipping_gst_service_1.ShippingGstService],
    })
], ShippingGstModule);
//# sourceMappingURL=shipping-gst.module.js.map