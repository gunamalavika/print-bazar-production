export type PersonalizationScope = 'PER_ORDER' | 'PER_ITEM';
export type PersonalizationInputType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'EMAIL' | 'PHONE' | 'SELECT';
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
export declare class CreatePersonalizationFieldDto {
    name: string;
    code: string;
    inputType: PersonalizationInputType;
    scope: PersonalizationScope;
    isRequired?: boolean;
    placeholder?: string;
    helperText?: string;
    defaultValue?: string;
    validationRules?: FieldValidationRules;
    options?: FieldOptionChoice[];
    sortOrder?: number;
}
export declare class UpdatePersonalizationFieldDto {
    id?: string;
    name?: string;
    code?: string;
    inputType?: PersonalizationInputType;
    scope?: PersonalizationScope;
    isRequired?: boolean;
    placeholder?: string;
    helperText?: string;
    defaultValue?: string;
    validationRules?: FieldValidationRules;
    options?: FieldOptionChoice[];
    sortOrder?: number;
}
export declare class CreatePersonalizationTemplateDto {
    name: string;
    code: string;
    description?: string;
    category?: string;
    isActive?: boolean;
    fields?: CreatePersonalizationFieldDto[];
}
export declare class UpdatePersonalizationTemplateDto {
    name?: string;
    code?: string;
    description?: string;
    category?: string;
    isActive?: boolean;
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
