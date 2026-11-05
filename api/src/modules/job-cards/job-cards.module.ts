import { Module } from '@nestjs/common';
import { JobCardEngineService } from './job-card-engine.service';
import { JobCardsController } from './job-cards.controller';
import { ProductionBoardService } from './production-board.service';
import { ProductionBoardController } from './production-board.controller';

@Module({
  controllers: [JobCardsController, ProductionBoardController],
  providers: [JobCardEngineService, ProductionBoardService],
  exports: [JobCardEngineService, ProductionBoardService],
})
export class JobCardsModule {}
