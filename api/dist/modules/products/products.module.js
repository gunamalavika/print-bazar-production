"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsModule = void 0;
const common_1 = require("@nestjs/common");
const products_service_1 = require("./products.service");
const products_controller_1 = require("./products.controller");
const admin_catalogue_service_1 = require("./admin-catalogue.service");
const admin_catalogue_controller_1 = require("./admin-catalogue.controller");
const audit_module_1 = require("../audit/audit.module");
const personalization_template_service_1 = require("./personalization/personalization-template.service");
const personalization_template_controller_1 = require("./personalization/personalization-template.controller");
let ProductsModule = class ProductsModule {
};
exports.ProductsModule = ProductsModule;
exports.ProductsModule = ProductsModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule],
        controllers: [
            products_controller_1.ProductsController,
            admin_catalogue_controller_1.AdminCatalogueController,
            personalization_template_controller_1.PersonalizationTemplateController,
        ],
        providers: [
            products_service_1.ProductsService,
            admin_catalogue_service_1.AdminCatalogueService,
            personalization_template_service_1.PersonalizationTemplateService,
        ],
        exports: [
            products_service_1.ProductsService,
            admin_catalogue_service_1.AdminCatalogueService,
            personalization_template_service_1.PersonalizationTemplateService,
        ],
    })
], ProductsModule);
//# sourceMappingURL=products.module.js.map