import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export type PersonalizationScope = 'PER_ORDER' | 'PER_ITEM';
export type PersonalizationInputType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'EMAIL'
  | 'PHONE'
  | 'SELECT';

export interface FieldValidationRules {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minValue?: number;
  maxValue?: number;
  allowedValues?: string[];
}

export interface FieldOptionChoice {
  label: string;
  value: string;
}

export class CreatePersonalizationFieldDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'EMAIL', 'PHONE', 'SELECT'])
  inputType: PersonalizationInputType;

  @IsString()
  @IsNotEmpty()
  @IsIn(['PER_ORDER', 'PER_ITEM'])
  scope: PersonalizationScope;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsString()
  @IsOptional()
  helperText?: string;

  @IsString()
  @IsOptional()
  defaultValue?: string;

  @IsOptional()
  validationRules?: FieldValidationRules;

  @IsOptional()
  options?: FieldOptionChoice[];

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdatePersonalizationFieldDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  @IsIn(['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'EMAIL', 'PHONE', 'SELECT'])
  inputType?: PersonalizationInputType;

  @IsString()
  @IsOptional()
  @IsIn(['PER_ORDER', 'PER_ITEM'])
  scope?: PersonalizationScope;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsString()
  @IsOptional()
  helperText?: string;

  @IsString()
  @IsOptional()
  defaultValue?: string;

  @IsOptional()
  validationRules?: FieldValidationRules;

  @IsOptional()
  options?: FieldOptionChoice[];

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class CreatePersonalizationTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePersonalizationFieldDto)
  fields?: CreatePersonalizationFieldDto[];
}

export class UpdatePersonalizationTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdatePersonalizationFieldDto)
  fields?: UpdatePersonalizationFieldDto[];
}

export interface PersonalizationItemEntry {
  itemIndex: number;
  variantCombination?: Record<string, string>;
  values: Record<string, any>;
}

export interface PersonalizationPayload {
  templateId?: string;
  templateCode?: string;
  sharedValues: Record<string, any>;
  perItemEntries?: PersonalizationItemEntry[];
}
