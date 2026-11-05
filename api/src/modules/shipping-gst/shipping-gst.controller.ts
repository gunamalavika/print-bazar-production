import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ShippingGstService } from './shipping-gst.service';
import {
  UpdateShippingGstSettingsDto,
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
  CalculateShippingAndTaxDto,
  UpdateProductShippingSettingsDto,
  BatchUpdateCategoryShippingSettingsDto,
} from './dto/shipping-gst.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles, CurrentUser } from '../../common/decorators/auth.decorator';
import { UserRole, JwtPayload } from '../../common/types/roles';

@Controller('shipping-gst')
export class ShippingGstController {
  constructor(private readonly shippingGstService: ShippingGstService) {}

  /**
   * Public / checkout preview calculation endpoint
   */
  @Post('calculate')
  async calculateQuote(@Body() dto: CalculateShippingAndTaxDto) {
    return this.shippingGstService.calculateShippingAndTax(
      dto.subtotal,
      dto.postalCode,
      dto.deliveryMethod || 'COURIER',
      dto.isInterState || false,
      dto.items,
      dto.totalQuantity,
      dto.totalWeightKg,
    );
  }

  /**
   * Read current Core Shipping & GST settings
   */
  @Get('settings')
  async getSettings() {
    return this.shippingGstService.getSettings();
  }

  /**
   * Update Core Shipping & GST settings (Admin & Authorized Superadmin)
   */
  @Put('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async updateSettings(
    @Body() dto: UpdateShippingGstSettingsDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.shippingGstService.updateSettings(dto, user?.sub);
  }

  /**
   * List all configured regional pincode zones
   */
  @Get('zones')
  async listZones() {
    return this.shippingGstService.listZones();
  }

  /**
   * Add a new regional pincode zone rate (Admin only)
   */
  @Post('zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async createZone(
    @Body() dto: CreateShippingZoneDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.shippingGstService.createZone(dto, user?.sub);
  }

  /**
   * Update an existing regional pincode zone rate (Admin only)
   */
  @Put('zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async updateZone(
    @Param('id') id: string,
    @Body() dto: UpdateShippingZoneDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.shippingGstService.updateZone(id, dto, user?.sub);
  }

  /**
   * Delete a regional pincode zone rate (Admin only)
   */
  @Delete('zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async deleteZone(
    @Param('id') id: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.shippingGstService.deleteZone(id, user?.sub);
  }

  /**
   * List product-level shipping settings alongside product configuration
   */
  @Get('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async listProductShippingSettings() {
    return this.shippingGstService.listProductShippingSettings();
  }

  /**
   * Bulk update courier settings across multiple products or an entire category
   */
  @Put('products/batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async batchUpdateCategoryShippingSettings(
    @Body() dto: BatchUpdateCategoryShippingSettingsDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.shippingGstService.batchUpdateCategoryShippingSettings(dto, user?.sub);
  }

  /**
   * Update a specific product's courier settings
   */
  @Put('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async updateProductShippingSettings(
    @Param('id') id: string,
    @Body() dto: UpdateProductShippingSettingsDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.shippingGstService.updateProductShippingSettings(id, dto, user?.sub);
  }
}
