import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PackingService, CompletePackingDto } from './packing.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles, CurrentUser } from '../../common/decorators/auth.decorator';
import { UserRole, JwtPayload } from '../../common/types/roles';

@ApiTags('packing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('packing')
export class PackingController {
  constructor(private readonly packingService: PackingService) {}

  @Get('queue')
  @Roles(UserRole.PACKING_OPERATOR, UserRole.ADMIN_MANAGER, UserRole.DISPATCH_LOGISTICS)
  @ApiOperation({ summary: 'Get live orders waiting in PACKING stage' })
  async getPackingQueue(
    @Query('search') search?: string,
    @Query('priority') priority?: string,
  ) {
    return this.packingService.getPackingQueue(search, priority);
  }

  @Get('materials')
  @ApiOperation({ summary: 'Get available standard cartons and packaging materials' })
  getPackagingMaterials() {
    return this.packingService.getPackagingMaterials();
  }

  @Get('jobs/:id')
  @Roles(UserRole.PACKING_OPERATOR, UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Get single order packing details' })
  async getPackingJob(@Param('id') id: string) {
    return this.packingService.getPackingJob(id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get parcel packages registered for an order' })
  async getPackages(@Param('orderId') orderId: string) {
    return this.packingService.getPackagesForOrder(orderId);
  }

  @Post('complete')
  @Roles(UserRole.PACKING_OPERATOR, UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Complete order packing, capture weights/dimensions, generate parcel barcodes, move to READY_FOR_DISPATCH' })
  async completePacking(@Body() body: CompletePackingDto, @CurrentUser() user: JwtPayload) {
    return this.packingService.completePacking(body, user.sub);
  }

  @Post('jobs/:id/label/reprint')
  @Roles(UserRole.PACKING_OPERATOR, UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Log shipping label reprint audit event' })
  async recordLabelReprint(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.packingService.recordLabelReprint(id, user.sub, body);
  }
}
