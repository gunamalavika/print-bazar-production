import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsIn,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateShippingConfigurationDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  originAddress?: string;

  @IsOptional()
  @IsString()
  originCity?: string;

  @IsOptional()
  @IsString()
  originState?: string;

  @IsOptional()
  @IsString()
  originCountry?: string;

  @IsOptional()
  @IsString()
  originPincode?: string;

  @IsOptional()
  @IsString()
  originPhone?: string;

  @IsOptional()
  @IsString()
  originEmail?: string;

  @IsOptional()
  @IsBoolean()
  isWeightBasedEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isFixedShippingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isPincodeZoneEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isVolumetricEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(100)
  volumetricDivisor?: number;

  @IsOptional()
  @IsIn(['GRAMS', 'KILOGRAMS'])
  weightUnit?: string;

  @IsOptional()
  @IsIn(['NEXT_SLAB', 'NEAREST_INCREMENT', 'EXACT'])
  weightRoundingMethod?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minShippingCharge?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number;

  @IsOptional()
  @IsBoolean()
  isFreeShippingEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultPackagingWeightGrams?: number;

  @IsOptional()
  @IsString()
  defaultPackagingProfileId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate?: number;
}

export class CreateShippingZoneDto {
  @IsString()
  zoneCode: string;

  @IsString()
  zoneName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  pincodePrefix?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCharge?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  zoneSurcharge?: number;

  @IsOptional()
  @IsString()
  estimatedDeliveryDays?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShippingZoneDto {
  @IsOptional()
  @IsString()
  zoneCode?: string;

  @IsOptional()
  @IsString()
  zoneName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  pincodePrefix?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCharge?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  zoneSurcharge?: number;

  @IsOptional()
  @IsString()
  estimatedDeliveryDays?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateShippingPincodeDto {
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Pincode must be a valid 6-digit Indian PIN code' })
  pincode: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsString()
  zoneId: string;

  @IsOptional()
  @IsBoolean()
  isServiceable?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalSurcharge?: number;

  @IsOptional()
  @IsString()
  deliveryRestrictions?: string;

  @IsOptional()
  @IsString()
  estimatedDays?: string;
}

export class UpdateShippingPincodeDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsBoolean()
  isServiceable?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalSurcharge?: number;

  @IsOptional()
  @IsString()
  deliveryRestrictions?: string;

  @IsOptional()
  @IsString()
  estimatedDays?: string;
}

export class BulkImportPincodesDto {
  @IsArray()
  pincodes: Array<{
    pincode: string;
    city: string;
    district?: string;
    state: string;
    zoneCode: string;
    isServiceable?: boolean;
    additionalSurcharge?: number;
  }>;
}

export class WeightSlabInputDto {
  @IsNumber()
  @Min(0)
  minWeightGrams: number;

  @IsNumber()
  @Min(0)
  maxWeightGrams: number;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateShippingRateCardDto {
  @IsString()
  name: string;

  @IsString()
  zoneId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minShippingCharge?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalWeightPerKg?: number;

  @IsOptional()
  effectiveFrom?: string;

  @IsOptional()
  effectiveTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightSlabInputDto)
  slabs: WeightSlabInputDto[];
}

export class UpdateShippingRateCardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minShippingCharge?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalWeightPerKg?: number;

  @IsOptional()
  effectiveFrom?: string;

  @IsOptional()
  effectiveTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightSlabInputDto)
  slabs?: WeightSlabInputDto[];
}

export class CreatePackagingProfileDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsNumber()
  @Min(0)
  weightGrams: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  widthMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heightMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWeightCapacityGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packagingCharge?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdatePackagingProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  widthMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heightMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWeightCapacityGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packagingCharge?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class ShippingCalculationRequestDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  destinationPincode?: string;

  @IsOptional()
  @IsString()
  packagingProfileId?: string;

  @IsOptional()
  @IsNumber()
  customUnitWeightGrams?: number;

  @IsOptional()
  @IsNumber()
  orderSubtotal?: number;

  @IsOptional()
  @IsIn(['COURIER', 'STORE_PICKUP'])
  deliveryMethod?: 'COURIER' | 'STORE_PICKUP';

  @IsOptional()
  @IsArray()
  items?: Array<{
    productId?: string;
    quantity: number;
    weightGrams?: number;
    subtotal?: number;
  }>;
}

export class CheckServiceabilityDto {
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Pincode must be 6 digits' })
  pincode: string;
}

