import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DispatchService, CourierHandoverDto, StorePickupHandoverDto } from './dispatch.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles, CurrentUser } from '../../common/decorators/auth.decorator';
import { UserRole, JwtPayload } from '../../common/types/roles';

@ApiTags('dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get(':orderId/weight-details')
  @Roles(UserRole.DISPATCH_LOGISTICS, UserRole.ADMIN_MANAGER, UserRole.PACKING_OPERATOR)
  @ApiOperation({ summary: 'Get calculated vs measured weight and shipping charge details for an order' })
  async getOrderDispatchDetails(@Param('orderId') orderId: string) {
    return this.dispatchService.getOrderDispatchDetails(orderId);
  }

  @Post(':orderId/adjust-weight')
  @Roles(UserRole.DISPATCH_LOGISTICS, UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Record actual scale measured shipment weight with audited variance recalculation' })
  async adjustDispatchWeight(
    @Param('orderId') orderId: string,
    @Body() body: { measuredWeightGrams: number; reason?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dispatchService.adjustDispatchWeight(orderId, body, user.sub);
  }

  @Post('courier-handover')
  @Roles(UserRole.DISPATCH_LOGISTICS, UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Scan parcels and confirm courier handover dispatch' })
  async confirmCourierHandover(
    @Body() body: CourierHandoverDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dispatchService.confirmCourierHandover(body, user.sub);
  }

  @Post('store-pickup-handover')
  @Roles(UserRole.SALES_OFFICE, UserRole.DISPATCH_LOGISTICS, UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Verify zero balance and hand over store pickup parcel to customer' })
  async confirmStorePickup(
    @Body() body: StorePickupHandoverDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dispatchService.confirmStorePickup(body, user.sub);
  }

  @Post(':orderId/confirm-delivery')
  @Roles(UserRole.DISPATCH_LOGISTICS, UserRole.ADMIN_MANAGER)
  @ApiOperation({ summary: 'Mark order as DELIVERED upon Proof of Delivery receipt' })
  async confirmDelivery(
    @Param('orderId') orderId: string,
    @Body('receiverName') receiverName?: string,
  ) {
    return this.dispatchService.confirmCourierDelivery(orderId, receiverName);
  }
}
