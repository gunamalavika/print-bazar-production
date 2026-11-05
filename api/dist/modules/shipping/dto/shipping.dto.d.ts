export declare class UpdateShippingConfigurationDto {
    businessName?: string;
    originAddress?: string;
    originCity?: string;
    originState?: string;
    originCountry?: string;
    originPincode?: string;
    originPhone?: string;
    originEmail?: string;
    isWeightBasedEnabled?: boolean;
    isFixedShippingEnabled?: boolean;
    isPincodeZoneEnabled?: boolean;
    isVolumetricEnabled?: boolean;
    volumetricDivisor?: number;
    weightUnit?: string;
    weightRoundingMethod?: string;
    minShippingCharge?: number;
    freeShippingThreshold?: number;
    isFreeShippingEnabled?: boolean;
    defaultPackagingWeightGrams?: number;
    defaultPackagingProfileId?: string;
    gstRate?: number;
}
export declare class CreateShippingZoneDto {
    zoneCode: string;
    zoneName: string;
    description?: string;
    pincodePrefix?: string;
    shippingCharge?: number;
    zoneSurcharge?: number;
    estimatedDeliveryDays?: string;
    isActive?: boolean;
}
export declare class UpdateShippingZoneDto {
    zoneCode?: string;
    zoneName?: string;
    description?: string;
    pincodePrefix?: string;
    shippingCharge?: number;
    zoneSurcharge?: number;
    estimatedDeliveryDays?: string;
    isActive?: boolean;
}
export declare class CreateShippingPincodeDto {
    pincode: string;
    city: string;
    district?: string;
    state: string;
    country?: string;
    zoneId: string;
    isServiceable?: boolean;
    additionalSurcharge?: number;
    deliveryRestrictions?: string;
    estimatedDays?: string;
}
export declare class UpdateShippingPincodeDto {
    city?: string;
    district?: string;
    state?: string;
    zoneId?: string;
    isServiceable?: boolean;
    additionalSurcharge?: number;
    deliveryRestrictions?: string;
    estimatedDays?: string;
}
export declare class BulkImportPincodesDto {
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
export declare class WeightSlabInputDto {
    minWeightGrams: number;
    maxWeightGrams: number;
    rate: number;
    sortOrder?: number;
}
export declare class CreateShippingRateCardDto {
    name: string;
    zoneId: string;
    minShippingCharge?: number;
    additionalWeightPerKg?: number;
    effectiveFrom?: string;
    effectiveTo?: string;
    isActive?: boolean;
    priority?: number;
    slabs: WeightSlabInputDto[];
}
export declare class UpdateShippingRateCardDto {
    name?: string;
    zoneId?: string;
    minShippingCharge?: number;
    additionalWeightPerKg?: number;
    effectiveFrom?: string;
    effectiveTo?: string;
    isActive?: boolean;
    priority?: number;
    slabs?: WeightSlabInputDto[];
}
export declare class CreatePackagingProfileDto {
    name: string;
    type?: string;
    weightGrams: number;
    lengthMm?: number;
    widthMm?: number;
    heightMm?: number;
    maxWeightCapacityGrams?: number;
    packagingCharge?: number;
    isActive?: boolean;
    isDefault?: boolean;
}
export declare class UpdatePackagingProfileDto {
    name?: string;
    type?: string;
    weightGrams?: number;
    lengthMm?: number;
    widthMm?: number;
    heightMm?: number;
    maxWeightCapacityGrams?: number;
    packagingCharge?: number;
    isActive?: boolean;
    isDefault?: boolean;
}
export declare class ShippingCalculationRequestDto {
    productId?: string;
    quantity: number;
    destinationPincode?: string;
    packagingProfileId?: string;
    customUnitWeightGrams?: number;
    orderSubtotal?: number;
    deliveryMethod?: 'COURIER' | 'STORE_PICKUP';
    items?: Array<{
        productId?: string;
        quantity: number;
        weightGrams?: number;
        subtotal?: number;
    }>;
}
export declare class CheckServiceabilityDto {
    pincode: string;
}
