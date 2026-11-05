import { Module } from '@nestjs/common';
import { WorkflowStateService } from './workflow-state.service';
import { WorkflowController } from './workflow.controller';

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowStateService],
  exports: [WorkflowStateService],
})
export class WorkflowModule {}
