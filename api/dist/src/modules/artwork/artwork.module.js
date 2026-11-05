"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtworkModule = void 0;
const common_1 = require("@nestjs/common");
const artwork_service_1 = require("./artwork.service");
const artwork_controller_1 = require("./artwork.controller");
let ArtworkModule = class ArtworkModule {
};
exports.ArtworkModule = ArtworkModule;
exports.ArtworkModule = ArtworkModule = __decorate([
    (0, common_1.Module)({
        controllers: [artwork_controller_1.ArtworkController],
        providers: [artwork_service_1.ArtworkService],
        exports: [artwork_service_1.ArtworkService],
    })
], ArtworkModule);
//# sourceMappingURL=artwork.module.js.map