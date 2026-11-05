import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  OperationsService,
  OperationsDashboardFilters,
  AssignDesignerDto,
  AssignProductionOperatorDto,
  CreateOperationalNoteDto,
  UpdatePriorityDto,
  ReleaseToProductionDto,
} from './operations.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles, CurrentUser } from '../../common/decorators/auth.decorator';
import { UserRole, JwtPayload } from '../../common/types/roles';

@ApiTags('operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  // ─── Dashboard KPIs ────────────────────────────────────────────────────

  @Get('dashboard')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'Get OE dashboard aggregate metrics' })
  async getDashboard() {
    return this.operationsService.getDashboardMetrics();
  }

  // ─── Operational Order List ────────────────────────────────────────────

  @Get('orders')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'List all orders with operational filters and pagination' })
  async listOrders(@Query() query: OperationsDashboardFilters) {
    return this.operationsService.listOperationalOrders(query);
  }

  // ─── New Order Intake Queue ─────────────────────────────────────────────

  @Get('orders/intake')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'List incoming customer orders needing OE triage/assignment' })
  async intakeOrders(@Query() query: OperationsDashboardFilters) {
    return this.operationsService.listOperationalOrders({ ...query, newIntake: 'true' });
  }

  // ─── Unassigned Design Queue ───────────────────────────────────────────

  @Get('orders/unassigned/design')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'List orders needing design with no assigned designer' })
  async unassignedDesign(@Query() query: OperationsDashboardFilters) {
    return this.operationsService.listOperationalOrders({ ...query, unassignedDesign: 'true' });
  }

  // ─── Unassigned Production Queue ───────────────────────────────────────

  @Get('orders/unassigned/production')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'List orders in production queue with no assigned operator' })
  async unassignedProduction(@Query() query: OperationsDashboardFilters) {
    return this.operationsService.listOperationalOrders({ ...query, unassignedProduction: 'true' });
  }

  // ─── Blocked Orders ────────────────────────────────────────────────────

  @Get('orders/blocked')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'List orders blocked by payment, QC, hold, or other issues' })
  async blockedOrders(@Query() query: OperationsDashboardFilters) {
    return this.operationsService.listOperationalOrders({ ...query, blocked: 'true' });
  }

  // ─── Single Order Detail ──────────────────────────────────────────────

  @Get('orders/:id')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'Get full operational detail for a single order' })
  async getOrderDetail(@Param('id') id: string) {
    return this.operationsService.getOperationalOrderDetail(id);
  }

  // ─── Order Timeline ───────────────────────────────────────────────────

  @Get('orders/:id/timeline')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'Get order timeline: status history, audit, assignments, notes' })
  async getTimeline(@Param('id') id: string) {
    return this.operationsService.getOrderTimeline(id);
  }

  // ─── Assign Designer ──────────────────────────────────────────────────

  @Post('orders/:id/design-assignment')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'Assign or reassign a designer to an order' })
  async assignDesigner(
    @Param('id') id: string,
    @Body() body: AssignDesignerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.operationsService.assignDesigner(id, body, user);
  }

  // ─── Assign Production Operator ───────────────────────────────────────

  @Post('orders/:id/production-assignment')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'Assign or reassign a production operator to an order' })
  async assignProductionOperator(
    @Param('id') id: string,
    @Body() body: AssignProductionOperatorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.operationsService.assignProductionOperator(id, body, user);
  }

  // ─── Add Internal Note ────────────────────────────────────────────────

  @Post('orders/:id/notes')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'Add internal operational note to an order' })
  async addNote(
    @Param('id') id: string,
    @Body() body: CreateOperationalNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.operationsService.addOperationalNote(id, body, user);
  }

  // ─── Update Priority ─────────────────────────────────────────────────

  @Patch('orders/:id/priority')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'Update order priority with audited reason' })
  async updatePriority(
    @Param('id') id: string,
    @Body() body: UpdatePriorityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.operationsService.updateOrderPriority(id, body, user);
  }

  // ─── Eligible Assignees ───────────────────────────────────────────────

  @Get('assignees/designers')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'List eligible designers for assignment with workload info' })
  async getDesigners() {
    return this.operationsService.getEligibleDesigners();
  }

  @Get('assignees/operators')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'List eligible production operators for assignment with workload info' })
  async getOperators() {
    return this.operationsService.getEligibleProductionOperators();
  }

  // ─── Operational Readiness & Production Release ───────────────────────

  @Get('orders/:id/readiness')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'Get order production readiness report with automated size validation' })
  async getOrderReadiness(@Param('id') id: string) {
    return this.operationsService.getOrderReadiness(id);
  }

  @Post('orders/:id/release-to-production')
  @Roles(UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER, UserRole.PRODUCTION_OPERATOR)
  @ApiOperation({ summary: 'Release order to production queue with automated size check and Job Card creation' })
  async releaseToProduction(
    @Param('id') id: string,
    @Body() body: ReleaseToProductionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.operationsService.releaseToProduction(id, body, user);
  }
}
