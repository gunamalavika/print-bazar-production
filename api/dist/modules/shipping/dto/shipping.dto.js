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
exports.CheckServiceabilityDto = exports.ShippingCalculationRequestDto = exports.UpdatePackagingProfileDto = exports.CreatePackagingProfileDto = exports.UpdateShippingRateCardDto = exports.CreateShippingRateCardDto = exports.WeightSlabInputDto = exports.BulkImportPincodesDto = exports.UpdateShippingPincodeDto = exports.CreateShippingPincodeDto = exports.UpdateShippingZoneDto = exports.CreateShippingZoneDto = exports.UpdateShippingConfigurationDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class UpdateShippingConfigurationDto {
    businessName;
    originAddress;
    originCity;
    originState;
    originCountry;
    originPincode;
    originPhone;
    originEmail;
    isWeightBasedEnabled;
    isFixedShippingEnabled;
    isPincodeZoneEnabled;
    isVolumetricEnabled;
    volumetricDivisor;
    weightUnit;
    weightRoundingMethod;
    minShippingCharge;
    freeShippingThreshold;
    isFreeShippingEnabled;
    defaultPackagingWeightGrams;
    defaultPackagingProfileId;
    gstRate;
}
exports.UpdateShippingConfigurationDto = UpdateShippingConfigurationDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingConfigurationDto.prototype, "businessName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingConfigurationDto.prototype, "originAddress", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingConfigurationDto.prototype, "originCity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingConfigurationDto.prototype, "originState", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingConfigurationDto.prototype, "originCountry", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingConfigurationDto.prototype, "originPincode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingConfigurationDto.prototype, "originPhone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingConfigurationDto.prototype, "originEmail", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShippingConfigurationDto.prototype, "isWeightBasedEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShippingConfigurationDto.prototype, "isFixedShippingEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShippingConfigurationDto.prototype, "isPincodeZoneEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShippingConfigurationDto.prototype, "isVolumetricEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(100),
    __metadata("design:type", Number)
], UpdateShippingConfigurationDto.prototype, "volumetricDivisor", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['GRAMS', 'KILOGRAMS']),
    __metadata("design:type", String)
], UpdateShippingConfigurationDto.prototype, "weightUnit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['NEXT_SLAB', 'NEAREST_INCREMENT', 'EXACT']),
    __metadata("design:type", String)
], UpdateShippingConfigurationDto.prototype, "weightRoundingMethod", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateShippingConfigurationDto.prototype, "minShippingCharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateShippingConfigurationDto.prototype, "freeShippingThreshold", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShippingConfigurationDto.prototype, "isFreeShippingEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateShippingConfigurationDto.prototype, "defaultPackagingWeightGrams", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingConfigurationDto.prototype, "defaultPackagingProfileId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateShippingConfigurationDto.prototype, "gstRate", void 0);
class CreateShippingZoneDto {
    zoneCode;
    zoneName;
    description;
    pincodePrefix;
    shippingCharge;
    zoneSurcharge;
    estimatedDeliveryDays;
    isActive;
}
exports.CreateShippingZoneDto = CreateShippingZoneDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingZoneDto.prototype, "zoneCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingZoneDto.prototype, "zoneName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingZoneDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingZoneDto.prototype, "pincodePrefix", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateShippingZoneDto.prototype, "shippingCharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateShippingZoneDto.prototype, "zoneSurcharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingZoneDto.prototype, "estimatedDeliveryDays", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateShippingZoneDto.prototype, "isActive", void 0);
class UpdateShippingZoneDto {
    zoneCode;
    zoneName;
    description;
    pincodePrefix;
    shippingCharge;
    zoneSurcharge;
    estimatedDeliveryDays;
    isActive;
}
exports.UpdateShippingZoneDto = UpdateShippingZoneDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingZoneDto.prototype, "zoneCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingZoneDto.prototype, "zoneName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingZoneDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingZoneDto.prototype, "pincodePrefix", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateShippingZoneDto.prototype, "shippingCharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateShippingZoneDto.prototype, "zoneSurcharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingZoneDto.prototype, "estimatedDeliveryDays", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShippingZoneDto.prototype, "isActive", void 0);
class CreateShippingPincodeDto {
    pincode;
    city;
    district;
    state;
    country;
    zoneId;
    isServiceable;
    additionalSurcharge;
    deliveryRestrictions;
    estimatedDays;
}
exports.CreateShippingPincodeDto = CreateShippingPincodeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[1-9][0-9]{5}$/, { message: 'Pincode must be a valid 6-digit Indian PIN code' }),
    __metadata("design:type", String)
], CreateShippingPincodeDto.prototype, "pincode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingPincodeDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingPincodeDto.prototype, "district", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingPincodeDto.prototype, "state", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingPincodeDto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingPincodeDto.prototype, "zoneId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateShippingPincodeDto.prototype, "isServiceable", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateShippingPincodeDto.prototype, "additionalSurcharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingPincodeDto.prototype, "deliveryRestrictions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingPincodeDto.prototype, "estimatedDays", void 0);
class UpdateShippingPincodeDto {
    city;
    district;
    state;
    zoneId;
    isServiceable;
    additionalSurcharge;
    deliveryRestrictions;
    estimatedDays;
}
exports.UpdateShippingPincodeDto = UpdateShippingPincodeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingPincodeDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingPincodeDto.prototype, "district", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingPincodeDto.prototype, "state", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingPincodeDto.prototype, "zoneId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShippingPincodeDto.prototype, "isServiceable", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateShippingPincodeDto.prototype, "additionalSurcharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingPincodeDto.prototype, "deliveryRestrictions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingPincodeDto.prototype, "estimatedDays", void 0);
class BulkImportPincodesDto {
    pincodes;
}
exports.BulkImportPincodesDto = BulkImportPincodesDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], BulkImportPincodesDto.prototype, "pincodes", void 0);
class WeightSlabInputDto {
    minWeightGrams;
    maxWeightGrams;
    rate;
    sortOrder;
}
exports.WeightSlabInputDto = WeightSlabInputDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], WeightSlabInputDto.prototype, "minWeightGrams", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], WeightSlabInputDto.prototype, "maxWeightGrams", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], WeightSlabInputDto.prototype, "rate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], WeightSlabInputDto.prototype, "sortOrder", void 0);
class CreateShippingRateCardDto {
    name;
    zoneId;
    minShippingCharge;
    additionalWeightPerKg;
    effectiveFrom;
    effectiveTo;
    isActive;
    priority;
    slabs;
}
exports.CreateShippingRateCardDto = CreateShippingRateCardDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingRateCardDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingRateCardDto.prototype, "zoneId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateShippingRateCardDto.prototype, "minShippingCharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateShippingRateCardDto.prototype, "additionalWeightPerKg", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateShippingRateCardDto.prototype, "effectiveFrom", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateShippingRateCardDto.prototype, "effectiveTo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateShippingRateCardDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateShippingRateCardDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => WeightSlabInputDto),
    __metadata("design:type", Array)
], CreateShippingRateCardDto.prototype, "slabs", void 0);
class UpdateShippingRateCardDto {
    name;
    zoneId;
    minShippingCharge;
    additionalWeightPerKg;
    effectiveFrom;
    effectiveTo;
    isActive;
    priority;
    slabs;
}
exports.UpdateShippingRateCardDto = UpdateShippingRateCardDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingRateCardDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingRateCardDto.prototype, "zoneId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateShippingRateCardDto.prototype, "minShippingCharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateShippingRateCardDto.prototype, "additionalWeightPerKg", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateShippingRateCardDto.prototype, "effectiveFrom", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateShippingRateCardDto.prototype, "effectiveTo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShippingRateCardDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateShippingRateCardDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => WeightSlabInputDto),
    __metadata("design:type", Array)
], UpdateShippingRateCardDto.prototype, "slabs", void 0);
class CreatePackagingProfileDto {
    name;
    type;
    weightGrams;
    lengthMm;
    widthMm;
    heightMm;
    maxWeightCapacityGrams;
    packagingCharge;
    isActive;
    isDefault;
}
exports.CreatePackagingProfileDto = CreatePackagingProfileDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePackagingProfileDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePackagingProfileDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePackagingProfileDto.prototype, "weightGrams", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePackagingProfileDto.prototype, "lengthMm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePackagingProfileDto.prototype, "widthMm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePackagingProfileDto.prototype, "heightMm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePackagingProfileDto.prototype, "maxWeightCapacityGrams", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePackagingProfileDto.prototype, "packagingCharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePackagingProfileDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePackagingProfileDto.prototype, "isDefault", void 0);
class UpdatePackagingProfileDto {
    name;
    type;
    weightGrams;
    lengthMm;
    widthMm;
    heightMm;
    maxWeightCapacityGrams;
    packagingCharge;
    isActive;
    isDefault;
}
exports.UpdatePackagingProfileDto = UpdatePackagingProfileDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePackagingProfileDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePackagingProfileDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdatePackagingProfileDto.prototype, "weightGrams", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdatePackagingProfileDto.prototype, "lengthMm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdatePackagingProfileDto.prototype, "widthMm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdatePackagingProfileDto.prototype, "heightMm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdatePackagingProfileDto.prototype, "maxWeightCapacityGrams", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdatePackagingProfileDto.prototype, "packagingCharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePackagingProfileDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePackagingProfileDto.prototype, "isDefault", void 0);
class ShippingCalculationRequestDto {
    productId;
    quantity;
    destinationPincode;
    packagingProfileId;
    customUnitWeightGrams;
    orderSubtotal;
    deliveryMethod;
    items;
}
exports.ShippingCalculationRequestDto = ShippingCalculationRequestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShippingCalculationRequestDto.prototype, "productId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ShippingCalculationRequestDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShippingCalculationRequestDto.prototype, "destinationPincode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShippingCalculationRequestDto.prototype, "packagingProfileId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ShippingCalculationRequestDto.prototype, "customUnitWeightGrams", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ShippingCalculationRequestDto.prototype, "orderSubtotal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['COURIER', 'STORE_PICKUP']),
    __metadata("design:type", String)
], ShippingCalculationRequestDto.prototype, "deliveryMethod", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], ShippingCalculationRequestDto.prototype, "items", void 0);
class CheckServiceabilityDto {
    pincode;
}
exports.CheckServiceabilityDto = CheckServiceabilityDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[1-9][0-9]{5}$/, { message: 'Pincode must be 6 digits' }),
    __metadata("design:type", String)
], CheckServiceabilityDto.prototype, "pincode", void 0);
//# sourceMappingURL=shipping.dto.js.map