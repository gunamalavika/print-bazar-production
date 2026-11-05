import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { ShippingService } from './shipping.service';
import { ShippingConfigService } from './shipping-config.service';
import { ShippingZoneService } from './shipping-zone.service';
import { ShippingPincodeService } from './shipping-pincode.service';
import { ShippingRateService } from './shipping-rate.service';
import { ShippingPackagingService } from './shipping-packaging.service';
import { ShippingCalculatorService } from './shipping-calculator.service';
import {
  UpdateShippingConfigurationDto,
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
  CreateShippingPincodeDto,
  UpdateShippingPincodeDto,
  BulkImportPincodesDto,
  CreateShippingRateCardDto,
  UpdateShippingRateCardDto,
  CreatePackagingProfileDto,
  UpdatePackagingProfileDto,
  ShippingCalculationRequestDto,
  CheckServiceabilityDto,
} from './dto/shipping.dto';

@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly configService: ShippingConfigService,
    private readonly zoneService: ShippingZoneService,
    private readonly pincodeService: ShippingPincodeService,
    private readonly rateService: ShippingRateService,
    private readonly packagingService: ShippingPackagingService,
    private readonly calculatorService: ShippingCalculatorService,
  ) {}

  // ==========================================
  // OVERVIEW & ANALYTICS
  // ==========================================
  @Get('overview')
  @UseGuards(JwtAuthGuard)
  async getOverview() {
    return this.shippingService.getOverview();
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getOrders(
    @Query('search') search?: string,
    @Query('pincode') pincode?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.shippingService.getOrders({
      search,
      pincode,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard)
  async getReports() {
    return this.shippingService.getReports();
  }

  // ==========================================
  // CONFIGURATION
  // ==========================================
  @Get('configuration')
  async getConfiguration() {
    return this.configService.getConfiguration();
  }

  @Put('configuration')
  @UseGuards(JwtAuthGuard)
  async updateConfiguration(@Body() dto: UpdateShippingConfigurationDto, @Request() req: any) {
    return this.configService.updateConfiguration(dto, req.user?.sub);
  }

  // ==========================================
  // ZONES
  // ==========================================
  @Get('zones')
  async listZones(@Query('search') search?: string, @Query('isActive') isActive?: string) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.zoneService.listZones(search, activeBool);
  }

  @Get('zones/:id')
  async getZone(@Param('id') id: string) {
    return this.zoneService.getZone(id);
  }

  @Post('zones')
  @UseGuards(JwtAuthGuard)
  async createZone(@Body() dto: CreateShippingZoneDto, @Request() req: any) {
    return this.zoneService.createZone(dto, req.user?.sub);
  }

  @Patch('zones/:id')
  @UseGuards(JwtAuthGuard)
  async updateZone(@Param('id') id: string, @Body() dto: UpdateShippingZoneDto, @Request() req: any) {
    return this.zoneService.updateZone(id, dto, req.user?.sub);
  }

  @Delete('zones/:id')
  @UseGuards(JwtAuthGuard)
  async deleteZone(@Param('id') id: string, @Request() req: any) {
    return this.zoneService.deleteZone(id, req.user?.sub);
  }

  // ==========================================
  // PINCODES
  // ==========================================
  @Get('pincodes')
  async listPincodes(
    @Query('search') search?: string,
    @Query('pincode') pincode?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('zoneId') zoneId?: string,
    @Query('isServiceable') isServiceable?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pincodeService.listPincodes({
      search,
      pincode,
      city,
      state,
      zoneId,
      isServiceable: isServiceable !== undefined ? isServiceable === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('pincodes/export')
  @UseGuards(JwtAuthGuard)
  async exportPincodes() {
    return this.pincodeService.exportPincodes();
  }

  @Get('pincodes/:pincode')
  async getPincode(@Param('pincode') pincode: string) {
    return this.pincodeService.getPincode(pincode);
  }

  @Post('pincodes')
  @UseGuards(JwtAuthGuard)
  async createPincode(@Body() dto: CreateShippingPincodeDto, @Request() req: any) {
    return this.pincodeService.createPincode(dto, req.user?.sub);
  }

  @Post('pincodes/import')
  @UseGuards(JwtAuthGuard)
  async bulkImportPincodes(@Body() dto: BulkImportPincodesDto, @Request() req: any) {
    return this.pincodeService.bulkImport(dto, req.user?.sub);
  }

  @Patch('pincodes/:id')
  @UseGuards(JwtAuthGuard)
  async updatePincode(@Param('id') id: string, @Body() dto: UpdateShippingPincodeDto, @Request() req: any) {
    return this.pincodeService.updatePincode(id, dto, req.user?.sub);
  }

  @Delete('pincodes/:id')
  @UseGuards(JwtAuthGuard)
  async deletePincode(@Param('id') id: string, @Request() req: any) {
    return this.pincodeService.deletePincode(id, req.user?.sub);
  }

  // ==========================================
  // RATE CARDS
  // ==========================================
  @Get('rates')
  async listRateCards(@Query('zoneId') zoneId?: string, @Query('isActive') isActive?: string) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.rateService.listRateCards(zoneId, activeBool);
  }

  @Get('rates/:id')
  async getRateCard(@Param('id') id: string) {
    return this.rateService.getRateCard(id);
  }

  @Post('rates')
  @UseGuards(JwtAuthGuard)
  async createRateCard(@Body() dto: CreateShippingRateCardDto, @Request() req: any) {
    return this.rateService.createRateCard(dto, req.user?.sub);
  }

  @Patch('rates/:id')
  @UseGuards(JwtAuthGuard)
  async updateRateCard(@Param('id') id: string, @Body() dto: UpdateShippingRateCardDto, @Request() req: any) {
    return this.rateService.updateRateCard(id, dto, req.user?.sub);
  }

  @Delete('rates/:id')
  @UseGuards(JwtAuthGuard)
  async deleteRateCard(@Param('id') id: string, @Request() req: any) {
    return this.rateService.deleteRateCard(id, req.user?.sub);
  }

  // ==========================================
  // PACKAGING
  // ==========================================
  @Get('packaging')
  async listPackagingProfiles(@Query('isActive') isActive?: string) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.packagingService.listProfiles(activeBool);
  }

  @Post('packaging')
  @UseGuards(JwtAuthGuard)
  async createPackagingProfile(@Body() dto: CreatePackagingProfileDto, @Request() req: any) {
    return this.packagingService.createProfile(dto, req.user?.sub);
  }

  @Patch('packaging/:id')
  @UseGuards(JwtAuthGuard)
  async updatePackagingProfile(
    @Param('id') id: string,
    @Body() dto: UpdatePackagingProfileDto,
    @Request() req: any,
  ) {
    return this.packagingService.updateProfile(id, dto, req.user?.sub);
  }

  @Delete('packaging/:id')
  @UseGuards(JwtAuthGuard)
  async deletePackagingProfile(@Param('id') id: string, @Request() req: any) {
    return this.packagingService.deleteProfile(id, req.user?.sub);
  }

  // ==========================================
  // SHIPPING CALCULATOR & SERVICEABILITY
  // ==========================================
  @Post('calculate')
  async calculateShipping(@Body() dto: ShippingCalculationRequestDto) {
    return this.calculatorService.calculateShipping(dto);
  }

  @Post('check-serviceability')
  async checkServiceability(@Body() dto: CheckServiceabilityDto) {
    return this.calculatorService.checkServiceability(dto.pincode);
  }
}
