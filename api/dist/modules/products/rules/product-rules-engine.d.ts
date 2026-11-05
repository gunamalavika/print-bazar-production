export interface RuleCondition {
    groupCode: string;
    operator?: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN' | 'GREATER_THAN' | 'LESS_THAN' | string;
    optionValue: string | string[];
}
export interface ProductConfigurationRuleDto {
    id?: string;
    name: string;
    conditionGroupCode: string;
    conditionOperator: string;
    conditionOptionValue: string | string[];
    actionType: string;
    targetGroupCode?: string | null;
    targetOptionValue?: string | null;
    actionPayload?: {
        priority?: number;
        logicalOperator?: 'AND' | 'OR';
        conditions?: RuleCondition[];
        allowedOptionValues?: string[];
        disabledOptionValues?: string[];
        defaultValue?: string;
        errorMessage?: string;
        reason?: string;
        conditionCombination?: Record<string, string>;
        chargeId?: string;
        name?: string;
        amount?: number;
        calculationType?: 'FIXED' | 'PER_UNIT' | 'PERCENTAGE';
        description?: string;
        [key: string]: any;
    } | null;
    isActive?: boolean;
}
export interface RuleOptionItem {
    id?: string;
    label: string;
    value: string;
    isActive?: boolean;
    isDefault?: boolean;
    priceModifier?: number;
    priceModifierType?: string;
}
export interface RuleOptionGroupItem {
    id?: string;
    name: string;
    code: string;
    isRequired?: boolean;
    isCustomerVisible?: boolean;
    options: RuleOptionItem[];
}
export interface ConfigurationEvaluationResult {
    visibleGroupCodes: string[];
    groupStatus: Record<string, {
        isVisible: boolean;
        isRequired: boolean;
        isDisabled: boolean;
        disabledReason?: string;
        defaultValue?: string;
    }>;
    optionStatus: Record<string, {
        isVisible: boolean;
        isDisabled: boolean;
        disabledReason?: string;
    }>;
    invalidCombinations: Array<{
        ruleId?: string;
        ruleName: string;
        message: string;
    }>;
    sanitizedSelections: Record<string, any>;
    changedSelections: Array<{
        groupCode: string;
        previousValue: any;
        newValue: any;
        reason: string;
    }>;
    activeCharges: Array<{
        chargeId: string;
        name: string;
        amount: number;
        calculationType: 'FIXED' | 'PER_UNIT' | 'PERCENTAGE';
        description?: string;
    }>;
    isValid: boolean;
    errors: string[];
}
export declare function normalizeValue(val: any): string;
export declare function evaluateSingleCondition(condition: RuleCondition, userSelections: Record<string, any>): boolean;
export declare function matchesRuleConditions(rule: ProductConfigurationRuleDto, userSelections: Record<string, any>): boolean;
export declare function evaluateProductConfiguration(optionGroups: RuleOptionGroupItem[], rules: ProductConfigurationRuleDto[], userSelections?: Record<string, any>): ConfigurationEvaluationResult;
