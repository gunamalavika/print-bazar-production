export declare enum ProductStatusDto {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
    ARCHIVED = "ARCHIVED"
}
export declare enum ProductOptionRequirementDto {
    REQUIRED = "REQUIRED",
    OPTIONAL = "OPTIONAL",
    DISABLED = "DISABLED"
}
export declare enum ProductOptionInputTypeDto {
    TEXT = "TEXT",
    TEXTAREA = "TEXTAREA",
    NUMBER = "NUMBER",
    EMAIL = "EMAIL",
    PHONE = "PHONE",
    DATE = "DATE",
    TIME = "TIME",
    SELECT = "SELECT",
    MULTI_SELECT = "MULTI_SELECT",
    RADIO = "RADIO",
    CHECKBOX = "CHECKBOX",
    TOGGLE = "TOGGLE",
    FILE = "FILE",
    IMAGE = "IMAGE",
    COLOR = "COLOR",
    RANGE = "RANGE"
}
export declare enum InventoryCategoryDto {
    SUBSTRATE = "SUBSTRATE",
    BOARD = "BOARD",
    FABRIC = "FABRIC",
    VINYL = "VINYL",
    INK_CONSUMABLE = "INK_CONSUMABLE",
    PACKAGING = "PACKAGING",
    FINISHED_GOODS = "FINISHED_GOODS"
}
export declare enum StockMovementTypeDto {
    STOCK_IN = "STOCK_IN",
    ADJUSTMENT = "ADJUSTMENT",
    RESERVATION = "RESERVATION",
    RELEASE = "RELEASE",
    CONSUMPTION = "CONSUMPTION",
    RETURN = "RETURN"
}
export declare class CreateCategoryDto {
    name: string;
    slug: string;
    description?: string;
    image?: string;
    parentId?: string | null;
    sortOrder?: number;
    isActive?: boolean;
}
export declare class UpdateCategoryDto {
    name?: string;
    slug?: string;
    description?: string;
    image?: string;
    parentId?: string | null;
    sortOrder?: number;
    isActive?: boolean;
}
export declare class CreateProductOptionDto {
    label: string;
    value: string;
    priceModifierType?: string;
    priceModifier?: number;
    sortOrder?: number;
    isDefault?: boolean;
    isActive?: boolean;
    fileCount?: number;
    fileSlotLabels?: string[];
    minMegapixels?: number;
}
export declare class UpdateProductOptionDto {
    label?: string;
    value?: string;
    priceModifierType?: string;
    priceModifier?: number;
    sortOrder?: number;
    isDefault?: boolean;
    isActive?: boolean;
    fileCount?: number;
    fileSlotLabels?: string[];
    minMegapixels?: number;
}
export declare class CreateProductOptionGroupDto {
    name: string;
    code: string;
    reusableGroupId?: string;
    inputType?: string;
    description?: string;
    isRequired?: boolean;
    isCustomerVisible?: boolean;
    sortOrder?: number;
    enableAdditionalPricing?: boolean;
    selectionBehavior?: string;
    isActive?: boolean;
    options?: CreateProductOptionDto[];
}
export declare class UpdateProductOptionGroupDto {
    name?: string;
    code?: string;
    reusableGroupId?: string;
    inputType?: string;
    description?: string;
    isRequired?: boolean;
    isCustomerVisible?: boolean;
    sortOrder?: number;
    enableAdditionalPricing?: boolean;
    isActive?: boolean;
    options?: CreateProductOptionDto[];
}
export declare class BulkOptionsDto {
    groupId: string;
    options: CreateProductOptionDto[];
}
export declare class CreateReusableOptionGroupDto {
    name: string;
    code: string;
    inputType?: string;
    description?: string;
    defaultOptions?: any;
    metadata?: any;
    sortOrder?: number;
    enableAdditionalPricing?: boolean;
    selectionBehavior?: string;
    isActive?: boolean;
}
export declare class UpdateReusableOptionGroupDto {
    name?: string;
    code?: string;
    inputType?: string;
    description?: string;
    defaultOptions?: any;
    metadata?: any;
    sortOrder?: number;
    enableAdditionalPricing?: boolean;
    selectionBehavior?: string;
    isActive?: boolean;
}
export declare class CreateProductConfigurationRuleDto {
    name: string;
    conditionGroupCode: string;
    conditionOperator?: string;
    conditionOptionValue: string;
    actionType: string;
    targetGroupCode?: string;
    targetOptionValue?: string;
    actionPayload?: any;
    isActive?: boolean;
}
export declare class UpdateProductConfigurationRuleDto {
    name?: string;
    conditionGroupCode?: string;
    conditionOperator?: string;
    conditionOptionValue?: string;
    actionType?: string;
    targetGroupCode?: string;
    targetOptionValue?: string;
    actionPayload?: any;
    isActive?: boolean;
}
export declare class ConfigurePricingSourceDto {
    sourceType?: string;
    spreadsheetId?: string;
    worksheetName?: string;
    apiKey?: string;
    columnMapping?: Record<string, string>;
}
export declare class SyncPricingSheetDto {
    spreadsheetId?: string;
    worksheetName?: string;
    manualRows?: Array<{
        minQty: number;
        maxQty: number;
        unitPrice: number;
        combination?: Record<string, string>;
    }>;
}
export declare class CreateProductImageDto {
    url: string;
    storageKey?: string;
    altText?: string;
    caption?: string;
    sortOrder?: number;
    isPrimary?: boolean;
}
export declare class UpdateProductImageDto {
    url?: string;
    altText?: string;
    caption?: string;
    sortOrder?: number;
    isPrimary?: boolean;
}
export declare class CreateProductDto {
    categoryId: string;
    name: string;
    slug: string;
    sku: string;
    description?: string;
    status?: ProductStatusDto;
    pricingModel?: string;
    basePrice: number;
    minQuantity?: number;
    quantityStep?: number;
    maxQuantity?: number;
    productionDays?: number;
    sortOrder?: number;
    isFeatured?: boolean;
    tags?: string[];
    seoTitle?: string;
    seoDescription?: string;
    trackInventory?: boolean;
    stockQuantity?: number;
    lowStockAlert?: number;
    defaultSize?: string;
    artworkRequirement?: ProductOptionRequirementDto;
    artworkPrice?: number;
    artworkQualityVerification?: boolean;
    minimumArtworkMegapixels?: number;
    referenceImageRequirement?: ProductOptionRequirementDto;
    designServiceRequirement?: ProductOptionRequirementDto;
    designServicePrice?: number;
    shippingChargeType?: string;
    unitWeightGrams?: number;
    courierCharge?: number;
    perAdditionalQtyRate?: number;
    freeShippingThreshold?: number;
    allowCod?: boolean;
    codSurcharge?: number;
    images?: CreateProductImageDto[];
    optionGroups?: CreateProductOptionGroupDto[];
    configurationRules?: CreateProductConfigurationRuleDto[];
    pricingSource?: ConfigurePricingSourceDto;
    artworkFileFormats?: string[];
    maxArtworkFileSizeMb?: number;
    designServiceFee?: number;
    allowMultipleVariants?: boolean;
    variantDimensions?: string[];
    personalizationTemplateId?: string;
    personalizationConfig?: any;
}
export declare class UpdateProductDto {
    categoryId?: string;
    name?: string;
    slug?: string;
    sku?: string;
    description?: string;
    status?: ProductStatusDto;
    pricingModel?: string;
    basePrice?: number;
    minQuantity?: number;
    quantityStep?: number;
    maxQuantity?: number;
    productionDays?: number;
    sortOrder?: number;
    isFeatured?: boolean;
    tags?: string[];
    seoTitle?: string;
    seoDescription?: string;
    trackInventory?: boolean;
    stockQuantity?: number;
    lowStockAlert?: number;
    defaultSize?: string;
    isActive?: boolean;
    artworkRequirement?: ProductOptionRequirementDto;
    artworkPrice?: number;
    artworkQualityVerification?: boolean;
    minimumArtworkMegapixels?: number;
    referenceImageRequirement?: ProductOptionRequirementDto;
    designServiceRequirement?: ProductOptionRequirementDto;
    designServicePrice?: number;
    shippingChargeType?: string;
    unitWeightGrams?: number;
    courierCharge?: number;
    perAdditionalQtyRate?: number;
    freeShippingThreshold?: number;
    allowCod?: boolean;
    codSurcharge?: number;
    optionGroups?: CreateProductOptionGroupDto[];
    configurationRules?: CreateProductConfigurationRuleDto[];
    pricingSource?: ConfigurePricingSourceDto;
    artworkFileFormats?: string[];
    maxArtworkFileSizeMb?: number;
    designServiceFee?: number;
    allowMultipleVariants?: boolean;
    variantDimensions?: string[];
    personalizationTemplateId?: string;
    personalizationConfig?: any;
}
export declare class CreateInventoryItemDto {
    name: string;
    sku: string;
    category: InventoryCategoryDto;
    unit: string;
    currentStock: number;
    minStockThreshold?: number;
    costPerUnit?: number;
    location?: string;
    notes?: string;
}
export declare class UpdateInventoryItemDto {
    name?: string;
    sku?: string;
    category?: InventoryCategoryDto;
    unit?: string;
    minStockThreshold?: number;
    costPerUnit?: number;
    location?: string;
    notes?: string;
    isActive?: boolean;
}
export declare class RecordStockMovementDto {
    type: StockMovementTypeDto;
    quantity: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
}
export declare class CreatePricingRuleDto {
    minQty: number;
    maxQty: number;
    discountPercent?: number;
    unitPrice?: number;
    label?: string;
    attributeCombination?: Record<string, any>;
}
export declare class UpdatePricingRuleDto {
    minQty?: number;
    maxQty?: number;
    discountPercent?: number;
    unitPrice?: number;
    label?: string;
    attributeCombination?: Record<string, any>;
}
export declare class BatchPricingRulesDto {
    rules: CreatePricingRuleDto[];
}
export declare class ProductAdditionalPricingTierDto {
    groupCode: string;
    optionValue: string;
    minQty: number;
    maxQty: number;
    unitPrice: number;
    chargeBasis?: string;
    isExcluded?: boolean;
}
export declare class SaveProductAdditionalPricingDto {
    tiers: ProductAdditionalPricingTierDto[];
}
