import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QualityControlService, SubmitQCDto } from './qc.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles, CurrentUser } from '../../common/decorators/auth.decorator';
import { UserRole, JwtPayload } from '../../common/types/roles';

@ApiTags('quality-control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('qc')
export class QualityControlController {
  constructor(private readonly qcService: QualityControlService) {}

  @Get('template/final')
  @ApiOperation({ summary: 'Get Final physical inspection checklist template' })
  getFinalQCTemplate() {
    return this.qcService.getFinalQCTemplate();
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get QC inspection records for an order' })
  getChecklistsForOrder(@Param('orderId') orderId: string) {
    return this.qcService.getChecklistsForOrder(orderId);
  }

  @Get('queue/final')
  @Roles(UserRole.FINAL_QC_INSPECTOR, UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'Get live queue of orders waiting for Final QC' })
  getFinalQCQueue() {
    return this.qcService.getFinalQCQueue();
  }

  @Post('inspect')
  @Roles(UserRole.FINAL_QC_INSPECTOR, UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'Submit Final physical QC inspection checklist' })
  async submitInspection(@Body() body: SubmitQCDto, @CurrentUser() user: JwtPayload) {
    return this.qcService.submitInspection(body, user.sub);
  }
}
