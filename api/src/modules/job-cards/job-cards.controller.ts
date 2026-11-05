import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobCardEngineService } from './job-card-engine.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { JwtPayload } from '../../common/types/roles';
import { JobCardStatus } from '@prisma/client';

@ApiTags('job-cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('job-cards')
export class JobCardsController {
  constructor(private readonly jobCardEngine: JobCardEngineService) {}

  @Get()
  @ApiOperation({ summary: 'List shop floor job cards filtered by status or work center station' })
  async listJobCards(
    @Query('status') status?: JobCardStatus,
    @Query('station') station?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.jobCardEngine.listJobCards({ status, station, user });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single job card details by ID or Job Number' })
  async getJobCard(@Param('id') id: string) {
    return this.jobCardEngine.getJobCardById(id);
  }

  @Post('auto-generate/:orderItemId')
  @ApiOperation({ summary: 'Trigger automatic Job Card generation for an approved Order Item' })
  async generateJobCard(
    @Param('orderItemId') orderItemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobCardEngine.generateJobCardForOrderItem(orderItemId, user.sub);
  }

  @Post(':id/claim')
  @ApiOperation({ summary: 'Operator claims a Job Card from queue' })
  async claimJob(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.jobCardEngine.claimJobCard(id, user.sub);
  }

  @Post(':id/assign-machine')
  @ApiOperation({ summary: 'Assign a machine work center to a Job Card' })
  async assignMachine(@Param('id') id: string, @Body('machineId') machineId: string) {
    return this.jobCardEngine.assignMachine(id, machineId);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Operator starts printing/production run on assigned machine' })
  async startJob(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.jobCardEngine.startJob(id, user);
  }

  @Post(':id/complete-station')
  @ApiOperation({ summary: 'Handover Job Card to subsequent work center station' })
  async completeStation(
    @Param('id') id: string,
    @Body('nextStation') nextStation: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobCardEngine.completeStation(id, nextStation, user);
  }
}
