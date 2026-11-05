"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchUpdateCategoryShippingSettingsDto = exports.UpdateProductShippingSettingsDto = exports.QuantityCourierSlabDto = exports.CalculateShippingAndTaxDto = exports.ShippingCalculationItemDto = exports.UpdateShippingZoneDto = exports.CreateShippingZoneDto = exports.UpdateShippingGstSettingsDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateShippingGstSettingsDto {
    baseShippingFee;
    gstRate;
    freeShippingThreshold;
    isFreeShippingEnabled;
    enableWeightCharges;
    baseWeightKg;
    weightRatePerKg;
    enableQuantityCharges;
    quantityStep;
    quantitySurchargePerStep;
}
exports.UpdateShippingGstSettingsDto = UpdateShippingGstSettingsDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: 'Base shipping fee must be a non-negative number' }),
    __metadata("design:type", Number)
], UpdateShippingGstSettingsDto.prototype, "baseShippingFee", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: 'GST tax rate cannot be negative' }),
    (0, class_validator_1.Max)(100, { message: 'GST tax rate cannot exceed 100%' }),
    __metadata("design:type", Number)
], UpdateShippingGstSettingsDto.prototype, "gstRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: 'Free shipping threshold must be a non-negative number' }),
    __metadata("design:type", Number)
], UpdateShippingGstSettingsDto.prototype, "freeShippingThreshold", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShippingGstSettingsDto.prototype, "isFreeShippingEnabled", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateShippingGstSettingsDto.prototype, "enableWeightCharges", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateShippingGstSettingsDto.prototype, "baseWeightKg", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateShippingGstSettingsDto.prototype, "weightRatePerKg", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateShippingGstSettingsDto.prototype, "enableQuantityCharges", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateShippingGstSettingsDto.prototype, "quantityStep", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateShippingGstSettingsDto.prototype, "quantitySurchargePerStep", void 0);
class CreateShippingZoneDto {
    zoneName;
    pincodePrefix;
    shippingCharge;
    isActive;
}
exports.CreateShippingZoneDto = CreateShippingZoneDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Zone name is required' }),
    __metadata("design:type", String)
], CreateShippingZoneDto.prototype, "zoneName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Pincode or prefix is required' }),
    (0, class_validator_1.Matches)(/^[0-9]{1,6}$/, {
        message: 'Pincode prefix must be 1 to 6 digits (e.g. 56 or 560001)',
    }),
    __metadata("design:type", String)
], CreateShippingZoneDto.prototype, "pincodePrefix", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: 'Shipping charge must be a non-negative amount' }),
    __metadata("design:type", Number)
], CreateShippingZoneDto.prototype, "shippingCharge", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateShippingZoneDto.prototype, "isActive", void 0);
class UpdateShippingZoneDto {
    zoneName;
    pincodePrefix;
    shippingCharge;
    isActive;
}
exports.UpdateShippingZoneDto = UpdateShippingZoneDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateShippingZoneDto.prototype, "zoneName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^[0-9]{1,6}$/, {
        message: 'Pincode prefix must be 1 to 6 digits (e.g. 56 or 560001)',
    }),
    __metadata("design:type", String)
], UpdateShippingZoneDto.prototype, "pincodePrefix", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0, { message: 'Shipping charge must be a non-negative amount' }),
    __metadata("design:type", Number)
], UpdateShippingZoneDto.prototype, "shippingCharge", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateShippingZoneDto.prototype, "isActive", void 0);
class ShippingCalculationItemDto {
    productId;
    productName;
    quantity;
    unitPrice;
    totalPrice;
    weightGrams;
}
exports.ShippingCalculationItemDto = ShippingCalculationItemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ShippingCalculationItemDto.prototype, "productId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ShippingCalculationItemDto.prototype, "productName", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ShippingCalculationItemDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ShippingCalculationItemDto.prototype, "unitPrice", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ShippingCalculationItemDto.prototype, "totalPrice", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ShippingCalculationItemDto.prototype, "weightGrams", void 0);
class CalculateShippingAndTaxDto {
    subtotal;
    postalCode;
    deliveryMethod;
    isInterState;
    items;
    totalQuantity;
    totalWeightKg;
}
exports.CalculateShippingAndTaxDto = CalculateShippingAndTaxDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateShippingAndTaxDto.prototype, "subtotal", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CalculateShippingAndTaxDto.prototype, "postalCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CalculateShippingAndTaxDto.prototype, "deliveryMethod", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CalculateShippingAndTaxDto.prototype, "isInterState", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CalculateShippingAndTaxDto.prototype, "items", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CalculateShippingAndTaxDto.prototype, "totalQuantity", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CalculateShippingAndTaxDto.prototype, "totalWeightKg", void 0);
class QuantityCourierSlabDto {
    minQty;
    maxQty;
    charge;
}
exports.QuantityCourierSlabDto = QuantityCourierSlabDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], QuantityCourierSlabDto.prototype, "minQty", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], QuantityCourierSlabDto.prototype, "maxQty", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], QuantityCourierSlabDto.prototype, "charge", void 0);
class UpdateProductShippingSettingsDto {
    shippingChargeType;
    unitWeightGrams;
    courierCharge;
    perAdditionalQtyRate;
    freeShippingThreshold;
    quantityCourierSlabs;
}
exports.UpdateProductShippingSettingsDto = UpdateProductShippingSettingsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProductShippingSettingsDto.prototype, "shippingChargeType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateProductShippingSettingsDto.prototype, "unitWeightGrams", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateProductShippingSettingsDto.prototype, "courierCharge", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateProductShippingSettingsDto.prototype, "perAdditionalQtyRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateProductShippingSettingsDto.prototype, "freeShippingThreshold", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateProductShippingSettingsDto.prototype, "quantityCourierSlabs", void 0);
class BatchUpdateCategoryShippingSettingsDto {
    categoryId;
    productIds;
    shippingChargeType;
    unitWeightGrams;
    courierCharge;
    perAdditionalQtyRate;
    freeShippingThreshold;
    quantityCourierSlabs;
}
exports.BatchUpdateCategoryShippingSettingsDto = BatchUpdateCategoryShippingSettingsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BatchUpdateCategoryShippingSettingsDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], BatchUpdateCategoryShippingSettingsDto.prototype, "productIds", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BatchUpdateCategoryShippingSettingsDto.prototype, "shippingChargeType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], BatchUpdateCategoryShippingSettingsDto.prototype, "unitWeightGrams", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], BatchUpdateCategoryShippingSettingsDto.prototype, "courierCharge", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], BatchUpdateCategoryShippingSettingsDto.prototype, "perAdditionalQtyRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], BatchUpdateCategoryShippingSettingsDto.prototype, "freeShippingThreshold", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], BatchUpdateCategoryShippingSettingsDto.prototype, "quantityCourierSlabs", void 0);
//# sourceMappingURL=shipping-gst.dto.js.map