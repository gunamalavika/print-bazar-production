import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductStatusDto {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ProductOptionRequirementDto {
  REQUIRED = 'REQUIRED',
  OPTIONAL = 'OPTIONAL',
  DISABLED = 'DISABLED',
}

export enum ProductOptionInputTypeDto {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  DATE = 'DATE',
  TIME = 'TIME',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  TOGGLE = 'TOGGLE',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  COLOR = 'COLOR',
  RANGE = 'RANGE',
}

export enum InventoryCategoryDto {
  SUBSTRATE = 'SUBSTRATE',
  BOARD = 'BOARD',
  FABRIC = 'FABRIC',
  VINYL = 'VINYL',
  INK_CONSUMABLE = 'INK_CONSUMABLE',
  PACKAGING = 'PACKAGING',
  FINISHED_GOODS = 'FINISHED_GOODS',
}

export enum StockMovementTypeDto {
  STOCK_IN = 'STOCK_IN',
  ADJUSTMENT = 'ADJUSTMENT',
  RESERVATION = 'RESERVATION',
  RELEASE = 'RELEASE',
  CONSUMPTION = 'CONSUMPTION',
  RETURN = 'RETURN',
}

// ==========================================
// CATEGORY DTOS
// ==========================================

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  parentId?: string | null;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  parentId?: string | null;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ==========================================
// PRODUCT OPTION & OPTION GROUP DTOS
// ==========================================

export class CreateProductOptionDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  priceModifierType?: string; // FIXED, PERCENTAGE, PER_UNIT

  @IsNumber()
  @IsOptional()
  priceModifier?: number;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  fileCount?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fileSlotLabels?: string[];

  @IsNumber()
  @IsOptional()
  minMegapixels?: number;
}

export class UpdateProductOptionDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  priceModifierType?: string;

  @IsNumber()
  @IsOptional()
  priceModifier?: number;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  fileCount?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fileSlotLabels?: string[];

  @IsNumber()
  @IsOptional()
  minMegapixels?: number;
}

export class CreateProductOptionGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  reusableGroupId?: string;

  @IsString()
  @IsOptional()
  inputType?: string; // SELECT, RADIO, CHECKBOX, TOGGLE, NUMBER, TEXT

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  isCustomerVisible?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  enableAdditionalPricing?: boolean;

  @IsString()
  @IsOptional()
  selectionBehavior?: string; // SINGLE, MULTIPLE, VARIANT_WISE

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductOptionDto)
  @IsOptional()
  options?: CreateProductOptionDto[];
}

export class UpdateProductOptionGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  reusableGroupId?: string;

  @IsString()
  @IsOptional()
  inputType?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  isCustomerVisible?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  enableAdditionalPricing?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductOptionDto)
  @IsOptional()
  options?: CreateProductOptionDto[];
}

export class BulkOptionsDto {
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductOptionDto)
  options: CreateProductOptionDto[];
}

// ==========================================
// REUSABLE OPTION GROUP (LIBRARY) DTOS
// ==========================================

export class CreateReusableOptionGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  inputType?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  defaultOptions?: any;

  @IsOptional()
  metadata?: any;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  enableAdditionalPricing?: boolean;

  @IsString()
  @IsOptional()
  selectionBehavior?: string; // SINGLE, MULTIPLE, VARIANT_WISE

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateReusableOptionGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  inputType?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  defaultOptions?: any;

  @IsOptional()
  metadata?: any;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  enableAdditionalPricing?: boolean;

  @IsString()
  @IsOptional()
  selectionBehavior?: string; // SINGLE, MULTIPLE, VARIANT_WISE

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ==========================================
// CONFIGURATION RULE DTOS
// ==========================================

export class CreateProductConfigurationRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  conditionGroupCode: string;

  @IsString()
  @IsOptional()
  conditionOperator?: string;

  @IsString()
  @IsNotEmpty()
  conditionOptionValue: string;

  @IsString()
  @IsNotEmpty()
  actionType: string;

  @IsString()
  @IsOptional()
  targetGroupCode?: string;

  @IsString()
  @IsOptional()
  targetOptionValue?: string;

  @IsOptional()
  actionPayload?: any;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateProductConfigurationRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  conditionGroupCode?: string;

  @IsString()
  @IsOptional()
  conditionOperator?: string;

  @IsString()
  @IsOptional()
  conditionOptionValue?: string;

  @IsString()
  @IsOptional()
  actionType?: string;

  @IsString()
  @IsOptional()
  targetGroupCode?: string;

  @IsString()
  @IsOptional()
  targetOptionValue?: string;

  @IsOptional()
  actionPayload?: any;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ==========================================
// PRICING SOURCE & SYNC DTOS
// ==========================================

export class ConfigurePricingSourceDto {
  @IsString()
  @IsOptional()
  sourceType?: string;

  @IsString()
  @IsOptional()
  spreadsheetId?: string;

  @IsString()
  @IsOptional()
  worksheetName?: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsOptional()
  columnMapping?: Record<string, string>;
}

export class SyncPricingSheetDto {
  @IsString()
  @IsOptional()
  spreadsheetId?: string;

  @IsString()
  @IsOptional()
  worksheetName?: string;

  @IsArray()
  @IsOptional()
  manualRows?: Array<{
    minQty: number;
    maxQty: number;
    unitPrice: number;
    combination?: Record<string, string>;
  }>;
}

// ==========================================
// PRODUCT IMAGE DTOS
// ==========================================

export class CreateProductImageDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  storageKey?: string;

  @IsString()
  @IsOptional()
  altText?: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class UpdateProductImageDto {
  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  altText?: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

// ==========================================
// PRODUCT DTOS
// ==========================================

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProductStatusDto)
  @IsOptional()
  status?: ProductStatusDto;

  @IsString()
  @IsOptional()
  pricingModel?: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  minQuantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantityStep?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxQuantity?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  productionDays?: number;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keyPoints?: string[];

  @IsString()
  @IsOptional()
  seoTitle?: string;

  @IsString()
  @IsOptional()
  seoDescription?: string;

  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  @IsNumber()
  @IsOptional()
  stockQuantity?: number;

  @IsNumber()
  @IsOptional()
  lowStockAlert?: number;

  @IsString()
  @IsOptional()
  defaultSize?: string;

  // Dynamic Product Flow Engine Configuration (Admin-Controlled)
  @IsEnum(ProductOptionRequirementDto)
  @IsOptional()
  artworkRequirement?: ProductOptionRequirementDto;

  @IsNumber()
  @Min(0)
  @IsOptional()
  artworkPrice?: number;

  @IsBoolean()
  @IsOptional()
  artworkQualityVerification?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minimumArtworkMegapixels?: number;

  @IsEnum(ProductOptionRequirementDto)
  @IsOptional()
  referenceImageRequirement?: ProductOptionRequirementDto;

  @IsEnum(ProductOptionRequirementDto)
  @IsOptional()
  designServiceRequirement?: ProductOptionRequirementDto;

  @IsNumber()
  @Min(0)
  @IsOptional()
  designServicePrice?: number;

  // Courier & Delivery Charges Configuration (Alongside Product Configuration)
  @IsString()
  @IsOptional()
  shippingChargeType?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitWeightGrams?: number;

  @IsOptional()
  bulkTierWeights?: any[];

  @IsString()
  @IsOptional()
  packagingProfileId?: string;

  @IsBoolean()
  @IsOptional()
  isShippable?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  courierCharge?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  perAdditionalQtyRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  freeShippingThreshold?: number;

  @IsBoolean()
  @IsOptional()
  allowCod?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  codSurcharge?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProductOptionGroupDto)
  optionGroups?: CreateProductOptionGroupDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProductConfigurationRuleDto)
  configurationRules?: CreateProductConfigurationRuleDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfigurePricingSourceDto)
  pricingSource?: ConfigurePricingSourceDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  artworkFileFormats?: string[];

  @IsNumber()
  @IsOptional()
  maxArtworkFileSizeMb?: number;

  @IsNumber()
  @IsOptional()
  designServiceFee?: number;

  @IsBoolean()
  @IsOptional()
  allowMultipleVariants?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variantDimensions?: string[];

  @IsString()
  @IsOptional()
  personalizationTemplateId?: string;

  @IsOptional()
  personalizationConfig?: any;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProductStatusDto)
  @IsOptional()
  status?: ProductStatusDto;

  @IsString()
  @IsOptional()
  pricingModel?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  minQuantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantityStep?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxQuantity?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  productionDays?: number;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keyPoints?: string[];

  @IsString()
  @IsOptional()
  seoTitle?: string;

  @IsString()
  @IsOptional()
  seoDescription?: string;

  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  @IsNumber()
  @IsOptional()
  stockQuantity?: number;

  @IsNumber()
  @IsOptional()
  lowStockAlert?: number;

  @IsString()
  @IsOptional()
  defaultSize?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Dynamic Product Flow Engine Configuration (Admin-Controlled)
  @IsEnum(ProductOptionRequirementDto)
  @IsOptional()
  artworkRequirement?: ProductOptionRequirementDto;

  @IsNumber()
  @Min(0)
  @IsOptional()
  artworkPrice?: number;

  @IsBoolean()
  @IsOptional()
  artworkQualityVerification?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minimumArtworkMegapixels?: number;

  @IsEnum(ProductOptionRequirementDto)
  @IsOptional()
  referenceImageRequirement?: ProductOptionRequirementDto;

  @IsEnum(ProductOptionRequirementDto)
  @IsOptional()
  designServiceRequirement?: ProductOptionRequirementDto;

  @IsNumber()
  @Min(0)
  @IsOptional()
  designServicePrice?: number;

  // Courier & Delivery Charges Configuration (Alongside Product Configuration)
  @IsString()
  @IsOptional()
  shippingChargeType?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitWeightGrams?: number;

  @IsOptional()
  bulkTierWeights?: any[];

  @IsString()
  @IsOptional()
  packagingProfileId?: string;

  @IsBoolean()
  @IsOptional()
  isShippable?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  courierCharge?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  perAdditionalQtyRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  freeShippingThreshold?: number;

  @IsBoolean()
  @IsOptional()
  allowCod?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  codSurcharge?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductOptionGroupDto)
  @IsOptional()
  optionGroups?: CreateProductOptionGroupDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductConfigurationRuleDto)
  @IsOptional()
  configurationRules?: CreateProductConfigurationRuleDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfigurePricingSourceDto)
  pricingSource?: ConfigurePricingSourceDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  artworkFileFormats?: string[];

  @IsNumber()
  @IsOptional()
  maxArtworkFileSizeMb?: number;

  @IsNumber()
  @IsOptional()
  designServiceFee?: number;

  @IsBoolean()
  @IsOptional()
  allowMultipleVariants?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variantDimensions?: string[];

  @IsString()
  @IsOptional()
  personalizationTemplateId?: string;

  @IsOptional()
  personalizationConfig?: any;
}

// ==========================================
// INVENTORY DTOS
// ==========================================

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsEnum(InventoryCategoryDto)
  category: InventoryCategoryDto;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber()
  @Min(0)
  currentStock: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minStockThreshold?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  costPerUnit?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateInventoryItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsEnum(InventoryCategoryDto)
  @IsOptional()
  category?: InventoryCategoryDto;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minStockThreshold?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  costPerUnit?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class RecordStockMovementDto {
  @IsEnum(StockMovementTypeDto)
  type: StockMovementTypeDto;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// ==========================================
// PRICING RULES / QUANTITY TIER OFFER DTOS
// ==========================================

export class CreatePricingRuleDto {
  @IsNumber()
  @Min(1)
  minQty: number;

  @IsNumber()
  @Min(1)
  maxQty: number;

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @IsString()
  @IsOptional()
  label?: string;

  @IsOptional()
  attributeCombination?: Record<string, any>;
}

export class UpdatePricingRuleDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  minQty?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxQty?: number;

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @IsString()
  @IsOptional()
  label?: string;

  @IsOptional()
  attributeCombination?: Record<string, any>;
}

export class BatchPricingRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePricingRuleDto)
  rules: CreatePricingRuleDto[];
}

// ==========================================
// DYNAMIC GROUP-BASED ADDITIONAL PRICING DTOS
// ==========================================

export class ProductAdditionalPricingTierDto {
  @IsString()
  @IsNotEmpty()
  groupCode: string;

  @IsString()
  @IsNotEmpty()
  optionValue: string;

  @IsNumber()
  @Min(1)
  minQty: number;

  @IsNumber()
  @Min(1)
  maxQty: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsString()
  @IsOptional()
  chargeBasis?: string; // PER_UNIT

  @IsBoolean()
  @IsOptional()
  isExcluded?: boolean;
}

export class SaveProductAdditionalPricingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAdditionalPricingTierDto)
  tiers: ProductAdditionalPricingTierDto[];
}


