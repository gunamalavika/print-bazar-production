import { Module } from '@nestjs/common';
import { QualityControlService } from './qc.service';
import { QualityControlController } from './qc.controller';
import { JobCardsModule } from '../job-cards/job-cards.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [JobCardsModule, WorkflowModule],
  controllers: [QualityControlController],
  providers: [QualityControlService],
  exports: [QualityControlService],
})
export class QualityControlModule {}
