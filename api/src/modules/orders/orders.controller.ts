import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService, CreateOrderDto, OrderQueryFilters } from './orders.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { JwtPayload } from '../../common/types/roles';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create omnichannel order (recalculates server pricing)' })
  async createOrder(@Body() body: CreateOrderDto, @Req() req: any) {
    // Extract user ID if Bearer token present in request header
    let creatorUserId: string | undefined = undefined;
    const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
          if (decoded?.sub) {
            creatorUserId = decoded.sub;
          }
        }
      } catch {
        // Continue with guest checkout if token decoding fails
      }
    }
    return this.ordersService.createOrder(body, creatorUserId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List and filter orders for ERP control center or Customer Portal' })
  async listOrders(@Query() query: OrderQueryFilters, @CurrentUser() user: JwtPayload) {
    return this.ordersService.listOrders(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get unified Order Master Record with all downstream relations' })
  async getOrderDetails(@Param('id') id: string) {
    return this.ordersService.getOrderDetails(id);
  }
}
