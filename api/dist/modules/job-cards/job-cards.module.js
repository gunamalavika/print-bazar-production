"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobCardsModule = void 0;
const common_1 = require("@nestjs/common");
const job_card_engine_service_1 = require("./job-card-engine.service");
const job_cards_controller_1 = require("./job-cards.controller");
const production_board_service_1 = require("./production-board.service");
const production_board_controller_1 = require("./production-board.controller");
let JobCardsModule = class JobCardsModule {
};
exports.JobCardsModule = JobCardsModule;
exports.JobCardsModule = JobCardsModule = __decorate([
    (0, common_1.Module)({
        controllers: [job_cards_controller_1.JobCardsController, production_board_controller_1.ProductionBoardController],
        providers: [job_card_engine_service_1.JobCardEngineService, production_board_service_1.ProductionBoardService],
        exports: [job_card_engine_service_1.JobCardEngineService, production_board_service_1.ProductionBoardService],
    })
], JobCardsModule);
//# sourceMappingURL=job-cards.module.js.map