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
  ProductionBoardService,
  BoardFiltersDto,
  TransitionJobDto,
  CreateColumnDto,
  UpdateColumnDto,
} from './production-board.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { JwtPayload } from '../../common/types/roles';

@ApiTags('production')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('production')
export class ProductionBoardController {
  constructor(private readonly boardService: ProductionBoardService) {}

  @Get('board')
  @ApiOperation({ summary: 'Get complete visual production Kanban board with active columns, cards, and shop floor metrics' })
  async getBoard(
    @Query() filters: BoardFiltersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boardService.getBoardData(filters, user);
  }

  @Post('jobs/:id/transition')
  @ApiOperation({ summary: 'Execute state transition for a production Job Card via Kanban drag-and-drop or action buttons' })
  async transitionJob(
    @Param('id') id: string,
    @Body() dto: TransitionJobDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boardService.transitionJob(id, dto, user);
  }

  @Post('columns')
  @ApiOperation({ summary: 'Create a custom or operational Hold Kanban column' })
  async createColumn(
    @Body() dto: CreateColumnDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boardService.createColumn(dto, user);
  }

  @Patch('columns/reorder')
  @ApiOperation({ summary: 'Reorder Kanban columns' })
  async reorderColumns(
    @Body('columnOrders') columnOrders: Array<{ id: string; sortOrder: number }>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boardService.reorderColumns(columnOrders, user);
  }

  @Patch('columns/:id')
  @ApiOperation({ summary: 'Update column metadata, color or workflow mapping' })
  async updateColumn(
    @Param('id') id: string,
    @Body() dto: UpdateColumnDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boardService.updateColumn(id, dto, user);
  }

  @Post('columns/:id/archive')
  @ApiOperation({ summary: 'Archive/deactivate a custom Kanban column' })
  async archiveColumn(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boardService.archiveColumn(id, user);
  }
}
