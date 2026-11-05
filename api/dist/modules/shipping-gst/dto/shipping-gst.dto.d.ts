export declare class UpdateShippingGstSettingsDto {
    baseShippingFee: number;
    gstRate: number;
    freeShippingThreshold: number;
    isFreeShippingEnabled: boolean;
    enableWeightCharges?: boolean;
    baseWeightKg?: number;
    weightRatePerKg?: number;
    enableQuantityCharges?: boolean;
    quantityStep?: number;
    quantitySurchargePerStep?: number;
}
export declare class CreateShippingZoneDto {
    zoneName: string;
    pincodePrefix: string;
    shippingCharge: number;
    isActive?: boolean;
}
export declare class UpdateShippingZoneDto {
    zoneName?: string;
    pincodePrefix?: string;
    shippingCharge?: number;
    isActive?: boolean;
}
export declare class ShippingCalculationItemDto {
    productId?: string;
    productName?: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    weightGrams?: number;
}
export declare class CalculateShippingAndTaxDto {
    subtotal: number;
    postalCode?: string;
    deliveryMethod?: 'COURIER' | 'STORE_PICKUP';
    isInterState?: boolean;
    items?: ShippingCalculationItemDto[];
    totalQuantity?: number;
    totalWeightKg?: number;
}
export declare class QuantityCourierSlabDto {
    minQty: number;
    maxQty?: number;
    charge: number;
}
export declare class UpdateProductShippingSettingsDto {
    shippingChargeType?: string;
    unitWeightGrams?: number;
    courierCharge?: number;
    perAdditionalQtyRate?: number;
    freeShippingThreshold?: number;
    quantityCourierSlabs?: QuantityCourierSlabDto[];
}
export declare class BatchUpdateCategoryShippingSettingsDto {
    categoryId?: string;
    productIds?: string[];
    shippingChargeType?: string;
    unitWeightGrams?: number;
    courierCharge?: number;
    perAdditionalQtyRate?: number;
    freeShippingThreshold?: number;
    quantityCourierSlabs?: QuantityCourierSlabDto[];
}
