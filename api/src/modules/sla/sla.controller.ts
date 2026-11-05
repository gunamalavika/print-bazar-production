import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SlaService } from './sla.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/auth.decorator';
import { UserRole } from '../../common/types/roles';

@ApiTags('sla')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sla')
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Get('overview')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.SALES_OFFICE)
  @ApiOperation({ summary: 'Get operational SLA health, at-risk orders, and delay alerts' })
  async getOverview() {
    return this.slaService.getSlaOverview();
  }
}
