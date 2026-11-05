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
exports.UpdatePersonalizationTemplateDto = exports.CreatePersonalizationTemplateDto = exports.UpdatePersonalizationFieldDto = exports.CreatePersonalizationFieldDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreatePersonalizationFieldDto {
    name;
    code;
    inputType;
    scope;
    isRequired;
    placeholder;
    helperText;
    defaultValue;
    validationRules;
    options;
    sortOrder;
}
exports.CreatePersonalizationFieldDto = CreatePersonalizationFieldDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePersonalizationFieldDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePersonalizationFieldDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsIn)(['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'EMAIL', 'PHONE', 'SELECT']),
    __metadata("design:type", String)
], CreatePersonalizationFieldDto.prototype, "inputType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsIn)(['PER_ORDER', 'PER_ITEM']),
    __metadata("design:type", String)
], CreatePersonalizationFieldDto.prototype, "scope", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreatePersonalizationFieldDto.prototype, "isRequired", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePersonalizationFieldDto.prototype, "placeholder", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePersonalizationFieldDto.prototype, "helperText", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePersonalizationFieldDto.prototype, "defaultValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreatePersonalizationFieldDto.prototype, "validationRules", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreatePersonalizationFieldDto.prototype, "options", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePersonalizationFieldDto.prototype, "sortOrder", void 0);
class UpdatePersonalizationFieldDto {
    id;
    name;
    code;
    inputType;
    scope;
    isRequired;
    placeholder;
    helperText;
    defaultValue;
    validationRules;
    options;
    sortOrder;
}
exports.UpdatePersonalizationFieldDto = UpdatePersonalizationFieldDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePersonalizationFieldDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePersonalizationFieldDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePersonalizationFieldDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'EMAIL', 'PHONE', 'SELECT']),
    __metadata("design:type", String)
], UpdatePersonalizationFieldDto.prototype, "inputType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['PER_ORDER', 'PER_ITEM']),
    __metadata("design:type", String)
], UpdatePersonalizationFieldDto.prototype, "scope", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdatePersonalizationFieldDto.prototype, "isRequired", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePersonalizationFieldDto.prototype, "placeholder", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePersonalizationFieldDto.prototype, "helperText", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePersonalizationFieldDto.prototype, "defaultValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePersonalizationFieldDto.prototype, "validationRules", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdatePersonalizationFieldDto.prototype, "options", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdatePersonalizationFieldDto.prototype, "sortOrder", void 0);
class CreatePersonalizationTemplateDto {
    name;
    code;
    description;
    category;
    isActive;
    fields;
}
exports.CreatePersonalizationTemplateDto = CreatePersonalizationTemplateDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePersonalizationTemplateDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePersonalizationTemplateDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePersonalizationTemplateDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePersonalizationTemplateDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreatePersonalizationTemplateDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreatePersonalizationFieldDto),
    __metadata("design:type", Array)
], CreatePersonalizationTemplateDto.prototype, "fields", void 0);
class UpdatePersonalizationTemplateDto {
    name;
    code;
    description;
    category;
    isActive;
    fields;
}
exports.UpdatePersonalizationTemplateDto = UpdatePersonalizationTemplateDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePersonalizationTemplateDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePersonalizationTemplateDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePersonalizationTemplateDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePersonalizationTemplateDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdatePersonalizationTemplateDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => UpdatePersonalizationFieldDto),
    __metadata("design:type", Array)
], UpdatePersonalizationTemplateDto.prototype, "fields", void 0);
//# sourceMappingURL=personalization-template.dto.js.map