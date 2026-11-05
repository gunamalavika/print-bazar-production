import { Controller, Post, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowStateService, TransitionRequestDto, ManagerOverrideRequestDto } from './workflow-state.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles, CurrentUser } from '../../common/decorators/auth.decorator';
import { UserRole, JwtPayload } from '../../common/types/roles';
import { OrderStatus } from '../../common/types/workflow';

@ApiTags('workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowStateService) {}

  @Post('transition')
  @ApiOperation({ summary: 'Transition order through authoritative workflow state machine' })
  async transition(@Body() body: TransitionRequestDto, @CurrentUser() user: JwtPayload) {
    return this.workflowService.transition(body, user);
  }

  @Post('override')
  @Roles(UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Admin / Manager manual workflow override (Audited)' })
  async managerOverride(@Body() body: ManagerOverrideRequestDto, @CurrentUser() user: JwtPayload) {
    return this.workflowService.managerOverride(body, user);
  }

  @Post(':orderId/pause')
  @ApiOperation({ summary: 'Pause an active order and record preHoldStatus' })
  async pauseOrder(
    @Param('orderId') orderId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workflowService.pauseOrder(orderId, reason || 'Production Hold', user);
  }

  @Post(':orderId/resume')
  @ApiOperation({ summary: 'Resume a paused order back to its exact preHoldStatus' })
  async resumeOrder(
    @Param('orderId') orderId: string,
    @Body('preHoldStatus') preHoldStatus: OrderStatus,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workflowService.resumeOrder(orderId, preHoldStatus, user);
  }
}
