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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { AdminCatalogueService } from './admin-catalogue.service';
import { ProductsService, SiteSettingsDto } from './products.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles, CurrentUser } from '../../common/decorators/auth.decorator';
import { UserRole, JwtPayload } from '../../common/types/roles';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  CreateProductOptionGroupDto,
  UpdateProductOptionGroupDto,
  CreateReusableOptionGroupDto,
  UpdateReusableOptionGroupDto,
  CreateProductOptionDto,
  UpdateProductOptionDto,
  BulkOptionsDto,
  CreateProductConfigurationRuleDto,
  ConfigurePricingSourceDto,
  SyncPricingSheetDto,
  CreateProductImageDto,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  RecordStockMovementDto,
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
  BatchPricingRulesDto,
  SaveProductAdditionalPricingDto,
} from './dto/catalogue.dto';

const productImageStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'products');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${baseName}_${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ADMIN_MANAGER,
  UserRole.OPERATIONAL_MANAGER,
  UserRole.SALES_OFFICE,
  UserRole.PRODUCTION_OPERATOR,
  UserRole.DESIGNER_PREPRESS,
  UserRole.FINAL_QC_INSPECTOR,
  UserRole.PACKING_OPERATOR,
  UserRole.DISPATCH_LOGISTICS,
  UserRole.ACCOUNTS,
)
export class AdminCatalogueController {
  constructor(
    private readonly catalogueService: AdminCatalogueService,
    private readonly productsService: ProductsService,
  ) {}

  // ==========================================
  // SITE SETTINGS (HERO IMAGE & HEADER MARQUEE)
  // ==========================================

  @Get('site-settings')
  @Roles(UserRole.ADMIN_MANAGER)
  async getSiteSettings() {
    return this.productsService.getSiteSettings();
  }

  @Put('site-settings')
  @Roles(UserRole.ADMIN_MANAGER)
  async updateSiteSettings(@Body() dto: Partial<SiteSettingsDto>) {
    return this.productsService.updateSiteSettings(dto);
  }

  // ==========================================
  // CATEGORIES
  // ==========================================

  @Get('catalogue/categories')
  async listCategories() {
    return this.catalogueService.listCategories();
  }

  @Get('catalogue/categories/:id')
  async getCategoryById(@Param('id') id: string) {
    return this.catalogueService.getCategoryById(id);
  }

  @Post('catalogue/categories')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.createCategory(dto, user?.sub);
  }

  @Put('catalogue/categories/:id')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.updateCategory(id, dto, user?.sub);
  }

  @Delete('catalogue/categories/:id')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async deleteCategory(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.deleteCategory(id, user?.sub);
  }

  // ==========================================
  // PRODUCTS
  // ==========================================

  @Get('catalogue/products')
  async listProducts(
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.catalogueService.listProducts({
      categoryId,
      status,
      search,
      page,
      limit,
    });
  }

  @Get('catalogue/products/next-sku')
  async getNextProductSku() {
    return this.catalogueService.getNextProductSku();
  }

  @Get('catalogue/products/:id')
  async getProductById(@Param('id') id: string) {
    return this.catalogueService.getProductById(id);
  }

  @Post('catalogue/products')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async createProduct(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.createProduct(dto, user?.sub);
  }

  @Put('catalogue/products/:id')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.updateProduct(id, dto, user?.sub);
  }

  @Post('catalogue/products/:id/duplicate')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async duplicateProduct(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.duplicateProduct(id, user?.sub);
  }

  @Patch('catalogue/products/:id/publish')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async publishProduct(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.publishProduct(id, user?.sub);
  }

  @Patch('catalogue/products/:id/archive')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async archiveProduct(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.archiveProduct(id, user?.sub);
  }

  @Patch('catalogue/products/:id/feature')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async toggleFeatured(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.toggleFeatured(id, user?.sub);
  }

  @Delete('catalogue/products/:id')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async deleteProduct(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.deleteProduct(id, user?.sub);
  }

  // ==========================================
  // REUSABLE OPTION GROUPS (LIBRARY)
  // ==========================================

  @Get('catalogue/reusable-groups')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async listReusableGroups() {
    return this.catalogueService.listReusableGroups();
  }

  @Get('catalogue/reusable-groups/:id')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async getReusableGroupById(@Param('id') id: string) {
    return this.catalogueService.getReusableGroupById(id);
  }

  @Post('catalogue/reusable-groups')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async createReusableGroup(
    @Body() dto: CreateReusableOptionGroupDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.createReusableGroup(dto, user?.sub);
  }

  @Put('catalogue/reusable-groups/:id')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async updateReusableGroup(
    @Param('id') id: string,
    @Body() dto: UpdateReusableOptionGroupDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.updateReusableGroup(id, dto, user?.sub);
  }

  @Delete('catalogue/reusable-groups/:id')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async deleteReusableGroup(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.deleteReusableGroup(id, user?.sub);
  }

  // ==========================================
  // PRODUCT OPTION GROUPS
  // ==========================================

  @Post('catalogue/products/:productId/option-groups')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async addOptionGroup(
    @Param('productId') productId: string,
    @Body() dto: CreateProductOptionGroupDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.addOptionGroup(productId, dto, user?.sub);
  }

  @Put('catalogue/products/:productId/option-groups/:groupId')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async updateOptionGroup(
    @Param('groupId') groupId: string,
    @Body() dto: UpdateProductOptionGroupDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.updateOptionGroup(groupId, dto, user?.sub);
  }

  @Delete('catalogue/products/:productId/option-groups/:groupId')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async deleteOptionGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.deleteOptionGroup(groupId, user?.sub);
  }

  @Patch('catalogue/products/:productId/option-groups/reorder')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async reorderOptionGroups(
    @Param('productId') productId: string,
    @Body('orderedGroupIds') orderedGroupIds: string[],
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.reorderOptionGroups(productId, orderedGroupIds, user?.sub);
  }

  // ==========================================
  // PRODUCT OPTIONS
  // ==========================================

  @Post('catalogue/option-groups/:groupId/options')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async addOption(
    @Param('groupId') groupId: string,
    @Body() dto: CreateProductOptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.addOption(groupId, dto, user?.sub);
  }

  @Put('catalogue/options/:optionId')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async updateOption(
    @Param('optionId') optionId: string,
    @Body() dto: UpdateProductOptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.updateOption(optionId, dto, user?.sub);
  }

  @Delete('catalogue/options/:optionId')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async deleteOption(
    @Param('optionId') optionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.deleteOption(optionId, user?.sub);
  }

  @Post('catalogue/option-groups/:groupId/options-bulk')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async bulkSaveOptions(
    @Param('groupId') groupId: string,
    @Body() dto: BulkOptionsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.bulkSaveOptions(groupId, dto, user?.sub);
  }

  @Patch('catalogue/option-groups/:groupId/options/reorder')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async reorderOptions(
    @Param('groupId') groupId: string,
    @Body('orderedOptionIds') orderedOptionIds: string[],
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.reorderOptions(groupId, orderedOptionIds, user?.sub);
  }

  // ==========================================
  // CONFIGURATION RULES
  // ==========================================

  @Put('catalogue/products/:productId/configuration-rules')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async saveConfigurationRules(
    @Param('productId') productId: string,
    @Body('rules') rules: CreateProductConfigurationRuleDto[],
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.saveConfigurationRules(productId, rules || [], user?.sub);
  }

  @Delete('catalogue/products/:productId/configuration-rules/:ruleId')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async deleteConfigurationRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.deleteConfigurationRule(ruleId, user?.sub);
  }

  // ==========================================
  // PRICING SOURCE & GOOGLE SHEETS SYNC
  // ==========================================

  @Put('catalogue/products/:productId/pricing-source')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async configurePricingSource(
    @Param('productId') productId: string,
    @Body() dto: ConfigurePricingSourceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.configurePricingSource(productId, dto, user?.sub);
  }

  @Post('catalogue/products/:productId/sync-pricing-sheet')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async syncPricingSheet(
    @Param('productId') productId: string,
    @Body() dto: SyncPricingSheetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.syncPricingSheet(productId, dto, user?.sub);
  }

  @Get('catalogue/products/:productId/pricing-sync-logs')
  async getPricingSyncLogs(@Param('productId') productId: string) {
    return this.catalogueService.getPricingSyncLogs(productId);
  }

  // ==========================================
  // PRODUCT IMAGES & UPLOADS
  // ==========================================

  @Post('catalogue/products/:productId/upload-image')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: productImageStorage,
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  async uploadProductImage(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('altText') altText?: string,
    @Body('caption') caption?: string,
    @Body('isPrimary') isPrimary?: string | boolean,
    @CurrentUser() user?: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No media file provided');
    }
    const isPrimaryBool = isPrimary === 'true' || isPrimary === true;
    return this.catalogueService.uploadProductImage(
      productId,
      file,
      { altText, caption, isPrimary: isPrimaryBool },
      user?.sub,
    );
  }

  @Post('catalogue/upload-media')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: productImageStorage,
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const relativeUrl = `/uploads/products/${file.filename}`;
    return {
      url: relativeUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('catalogue/products/:productId/images')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async addProductImage(
    @Param('productId') productId: string,
    @Body() dto: CreateProductImageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.addProductImage(productId, dto, user?.sub);
  }

  @Patch('catalogue/products/:productId/images/:imageId/primary')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async setPrimaryImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.setPrimaryImage(productId, imageId, user?.sub);
  }

  @Delete('catalogue/products/:productId/images/:imageId')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async deleteProductImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.deleteProductImage(productId, imageId, user?.sub);
  }

  @Patch('catalogue/products/:productId/images/reorder')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async reorderImages(
    @Param('productId') productId: string,
    @Body('orderedImageIds') orderedImageIds: string[],
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.reorderImages(productId, orderedImageIds, user?.sub);
  }

  // ==========================================
  // INVENTORY & RAW MATERIALS
  // ==========================================

  @Get('inventory/items')
  async listInventoryItems(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('lowStockOnly') lowStockOnly?: boolean,
  ) {
    return this.catalogueService.listInventoryItems({
      category,
      search,
      lowStockOnly: Boolean(lowStockOnly),
    });
  }

  @Post('inventory/items')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER, UserRole.PRODUCTION_OPERATOR)
  async createInventoryItem(
    @Body() dto: CreateInventoryItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.createInventoryItem(dto, user?.sub);
  }

  @Put('inventory/items/:id')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER, UserRole.PRODUCTION_OPERATOR)
  async updateInventoryItem(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.updateInventoryItem(id, dto, user?.sub);
  }

  @Post('inventory/items/:id/movement')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER, UserRole.PRODUCTION_OPERATOR)
  async recordStockMovement(
    @Param('id') id: string,
    @Body() dto: RecordStockMovementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.recordStockMovement(id, dto, user?.sub);
  }

  @Get('inventory/movements')
  async listStockMovements(@Query('itemId') itemId?: string) {
    return this.catalogueService.listStockMovements(itemId);
  }

  // ==========================================
  // PRICING RULES / QUANTITY TIER OFFERS
  // ==========================================

  @Get('catalogue/products/:productId/pricing-rules')
  async listPricingRules(@Param('productId') productId: string) {
    return this.catalogueService.listPricingRules(productId);
  }

  @Post('catalogue/products/:productId/pricing-rules')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async addPricingRule(
    @Param('productId') productId: string,
    @Body() dto: CreatePricingRuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.addPricingRule(productId, dto, user?.sub);
  }

  @Put('catalogue/products/:productId/pricing-rules/:ruleId')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async updatePricingRule(
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdatePricingRuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.updatePricingRule(ruleId, dto, user?.sub);
  }

  @Delete('catalogue/products/:productId/pricing-rules/:ruleId')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async deletePricingRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.deletePricingRule(ruleId, user?.sub);
  }

  @Put('catalogue/products/:productId/pricing-rules-batch')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async saveBatchPricingRules(
    @Param('productId') productId: string,
    @Body() dto: BatchPricingRulesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.saveBatchPricingRules(productId, dto, user?.sub);
  }

  // ==========================================
  // NATIVE COMBINATION PRICING MATRIX
  // ==========================================

  @Get('catalogue/products/:productId/pricing-matrix')
  async getPricingMatrix(@Param('productId') productId: string) {
    return this.catalogueService.getPricingMatrix(productId);
  }

  @Put('catalogue/products/:productId/pricing-matrix')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async savePricingMatrix(
    @Param('productId') productId: string,
    @Body() dto: { rows: any[] },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.savePricingMatrix(productId, dto, user?.sub);
  }

  @Post('catalogue/products/:productId/pricing-matrix/generate-combinations')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async generateMatrixCombinations(
    @Param('productId') productId: string,
  ) {
    return this.catalogueService.generateMatrixCombinations(productId);
  }

  // ==========================================
  // DYNAMIC GROUP-BASED ADDITIONAL PRICING
  // ==========================================

  @Get('catalogue/products/:productId/additional-pricing')
  async getAdditionalPricing(@Param('productId') productId: string) {
    return this.catalogueService.getAdditionalPricing(productId);
  }

  @Put('catalogue/products/:productId/additional-pricing')
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async saveAdditionalPricing(
    @Param('productId') productId: string,
    @Body() dto: SaveProductAdditionalPricingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogueService.saveAdditionalPricing(productId, dto, user?.sub);
  }
}

