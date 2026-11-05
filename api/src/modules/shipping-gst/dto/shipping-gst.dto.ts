import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  Min,
  Max,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class UpdateShippingGstSettingsDto {
  @IsNumber()
  @Min(0, { message: 'Base shipping fee must be a non-negative number' })
  baseShippingFee: number;

  @IsNumber()
  @Min(0, { message: 'GST tax rate cannot be negative' })
  @Max(100, { message: 'GST tax rate cannot exceed 100%' })
  gstRate: number;

  @IsNumber()
  @Min(0, { message: 'Free shipping threshold must be a non-negative number' })
  freeShippingThreshold: number;

  @IsBoolean()
  isFreeShippingEnabled: boolean;

  // Weight-wise courier settings
  @IsBoolean()
  @IsOptional()
  enableWeightCharges?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseWeightKg?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  weightRatePerKg?: number;

  // Quantity-wise courier settings
  @IsBoolean()
  @IsOptional()
  enableQuantityCharges?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  quantityStep?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantitySurchargePerStep?: number;
}

export class CreateShippingZoneDto {
  @IsString()
  @IsNotEmpty({ message: 'Zone name is required' })
  zoneName: string;

  @IsString()
  @IsNotEmpty({ message: 'Pincode or prefix is required' })
  @Matches(/^[0-9]{1,6}$/, {
    message: 'Pincode prefix must be 1 to 6 digits (e.g. 56 or 560001)',
  })
  pincodePrefix: string;

  @IsNumber()
  @Min(0, { message: 'Shipping charge must be a non-negative amount' })
  shippingCharge: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateShippingZoneDto {
  @IsString()
  @IsOptional()
  zoneName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{1,6}$/, {
    message: 'Pincode prefix must be 1 to 6 digits (e.g. 56 or 560001)',
  })
  pincodePrefix?: string;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Shipping charge must be a non-negative amount' })
  shippingCharge?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ShippingCalculationItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  productName?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  weightGrams?: number;
}

export class CalculateShippingAndTaxDto {
  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  deliveryMethod?: 'COURIER' | 'STORE_PICKUP';

  @IsBoolean()
  @IsOptional()
  isInterState?: boolean;

  @IsOptional()
  items?: ShippingCalculationItemDto[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalQuantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalWeightKg?: number;
}

export class QuantityCourierSlabDto {
  @IsNumber()
  @Min(1)
  minQty: number;

  @IsNumber()
  @IsOptional()
  maxQty?: number;

  @IsNumber()
  @Min(0)
  charge: number;
}

export class UpdateProductShippingSettingsDto {
  @IsString()
  @IsOptional()
  shippingChargeType?: string;

  @IsNumber()
  @IsOptional()
  unitWeightGrams?: number;

  @IsNumber()
  @IsOptional()
  courierCharge?: number;

  @IsNumber()
  @IsOptional()
  perAdditionalQtyRate?: number;

  @IsNumber()
  @IsOptional()
  freeShippingThreshold?: number;

  @IsArray()
  @IsOptional()
  quantityCourierSlabs?: QuantityCourierSlabDto[];
}

export class BatchUpdateCategoryShippingSettingsDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @IsOptional()
  productIds?: string[];

  @IsString()
  @IsOptional()
  shippingChargeType?: string;

  @IsNumber()
  @IsOptional()
  unitWeightGrams?: number;

  @IsNumber()
  @IsOptional()
  courierCharge?: number;

  @IsNumber()
  @IsOptional()
  perAdditionalQtyRate?: number;

  @IsNumber()
  @IsOptional()
  freeShippingThreshold?: number;

  @IsArray()
  @IsOptional()
  quantityCourierSlabs?: QuantityCourierSlabDto[];
}

