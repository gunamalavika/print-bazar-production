"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const product_rules_engine_1 = require("./product-rules-engine");
describe('ProductConfigurationRulesEngine', () => {
    const sampleGroups = [
        {
            id: 'grp-mat',
            name: 'Material',
            code: 'material',
            isRequired: true,
            isCustomerVisible: true,
            options: [
                { id: 'opt-wood', label: 'Solid Wood', value: 'wood', isActive: true, isDefault: true },
                { id: 'opt-metal', label: 'Brushed Metal', value: 'metal', isActive: true },
                { id: 'opt-fabric', label: 'Canvas Fabric', value: 'fabric', isActive: true },
            ],
        },
        {
            id: 'grp-finish',
            name: 'Finish',
            code: 'finish',
            isRequired: true,
            isCustomerVisible: true,
            options: [
                { id: 'opt-matte', label: 'Matte Finish', value: 'matte', isActive: true, isDefault: true },
                { id: 'opt-gloss', label: 'High Gloss', value: 'gloss', isActive: true },
                { id: 'opt-varnish', label: 'Natural Varnish', value: 'varnish', isActive: true },
            ],
        },
        {
            id: 'grp-thickness',
            name: 'Thickness',
            code: 'thickness',
            isRequired: false,
            isCustomerVisible: true,
            options: [
                { id: 'opt-2mm', label: '2mm Thin', value: '2mm', isActive: true, isDefault: true },
                { id: 'opt-5mm', label: '5mm Thick', value: '5mm', isActive: true },
            ],
        },
    ];
    describe('Scenario 1: Dependent Visibility', () => {
        it('should hide thickness group when Canvas Fabric is chosen', () => {
            const rules = [
                {
                    name: 'Hide Thickness for Fabric',
                    conditionGroupCode: 'material',
                    conditionOperator: 'EQUALS',
                    conditionOptionValue: 'fabric',
                    actionType: 'HIDE',
                    targetGroupCode: 'thickness',
                },
            ];
            const result = (0, product_rules_engine_1.evaluateProductConfiguration)(sampleGroups, rules, {
                material: 'fabric',
                finish: 'matte',
                thickness: '2mm',
            });
            expect(result.groupStatus['thickness'].isVisible).toBe(false);
            expect(result.visibleGroupCodes).not.toContain('thickness');
            expect(result.visibleGroupCodes).toContain('material');
            expect(result.visibleGroupCodes).toContain('finish');
        });
        it('should keep thickness group visible when Solid Wood is chosen', () => {
            const rules = [
                {
                    name: 'Hide Thickness for Fabric',
                    conditionGroupCode: 'material',
                    conditionOperator: 'EQUALS',
                    conditionOptionValue: 'fabric',
                    actionType: 'HIDE',
                    targetGroupCode: 'thickness',
                },
            ];
            const result = (0, product_rules_engine_1.evaluateProductConfiguration)(sampleGroups, rules, {
                material: 'wood',
                finish: 'matte',
            });
            expect(result.groupStatus['thickness'].isVisible).toBe(true);
            expect(result.visibleGroupCodes).toContain('thickness');
        });
    });
    describe('Scenario 2: Disabled Options & Restriction', () => {
        it('should disable natural varnish finish when Metal material is selected', () => {
            const rules = [
                {
                    name: 'Disable Varnish for Metal',
                    conditionGroupCode: 'material',
                    conditionOperator: 'EQUALS',
                    conditionOptionValue: 'metal',
                    actionType: 'DISABLE',
                    targetGroupCode: 'finish',
                    targetOptionValue: 'varnish',
                    actionPayload: {
                        reason: 'Varnish cannot be applied to metal surfaces.',
                    },
                },
            ];
            const result = (0, product_rules_engine_1.evaluateProductConfiguration)(sampleGroups, rules, {
                material: 'metal',
                finish: 'matte',
            });
            expect(result.optionStatus['finish:varnish'].isDisabled).toBe(true);
            expect(result.optionStatus['finish:varnish'].disabledReason).toBe('Varnish cannot be applied to metal surfaces.');
            expect(result.optionStatus['finish:matte'].isDisabled).toBe(false);
        });
        it('should restrict finish options to only Matte and Gloss for Metal', () => {
            const rules = [
                {
                    name: 'Restrict Finishes for Metal',
                    conditionGroupCode: 'material',
                    conditionOperator: 'EQUALS',
                    conditionOptionValue: 'metal',
                    actionType: 'RESTRICT_OPTIONS',
                    targetGroupCode: 'finish',
                    actionPayload: {
                        allowedOptionValues: ['matte', 'gloss'],
                        reason: 'Only Matte and High Gloss are supported for Metal.',
                    },
                },
            ];
            const result = (0, product_rules_engine_1.evaluateProductConfiguration)(sampleGroups, rules, {
                material: 'metal',
                finish: 'matte',
            });
            expect(result.optionStatus['finish:matte'].isDisabled).toBe(false);
            expect(result.optionStatus['finish:gloss'].isDisabled).toBe(false);
            expect(result.optionStatus['finish:varnish'].isDisabled).toBe(true);
        });
    });
    describe('Scenario 3: Multiple Conditions with AND/OR Logic', () => {
        it('should match rule when ALL conditions are met (AND logic)', () => {
            const multiAndRule = {
                name: 'Wood + Gloss Premium Surcharge',
                conditionGroupCode: 'material',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'wood',
                actionType: 'APPLY_CHARGE',
                actionPayload: {
                    priority: 20,
                    logicalOperator: 'AND',
                    conditions: [
                        { groupCode: 'material', operator: 'EQUALS', optionValue: 'wood' },
                        { groupCode: 'finish', operator: 'EQUALS', optionValue: 'gloss' },
                    ],
                    chargeId: 'premium-wood-polish',
                    name: 'Hand Polishing Fee',
                    amount: 250,
                    calculationType: 'FIXED',
                },
            };
            const matchPositive = (0, product_rules_engine_1.matchesRuleConditions)(multiAndRule, {
                material: 'wood',
                finish: 'gloss',
            });
            expect(matchPositive).toBe(true);
            const matchNegative = (0, product_rules_engine_1.matchesRuleConditions)(multiAndRule, {
                material: 'wood',
                finish: 'matte',
            });
            expect(matchNegative).toBe(false);
        });
        it('should match rule when ANY condition is met (OR logic)', () => {
            const multiOrRule = {
                name: 'Rigid Material Support Surcharge',
                conditionGroupCode: 'material',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'wood',
                actionType: 'APPLY_CHARGE',
                actionPayload: {
                    logicalOperator: 'OR',
                    conditions: [
                        { groupCode: 'material', operator: 'EQUALS', optionValue: 'wood' },
                        { groupCode: 'material', operator: 'EQUALS', optionValue: 'metal' },
                    ],
                    chargeId: 'rigid-handling-fee',
                    name: 'Heavy Rigid Handling',
                    amount: 150,
                    calculationType: 'FIXED',
                },
            };
            expect((0, product_rules_engine_1.matchesRuleConditions)(multiOrRule, { material: 'wood' })).toBe(true);
            expect((0, product_rules_engine_1.matchesRuleConditions)(multiOrRule, { material: 'metal' })).toBe(true);
            expect((0, product_rules_engine_1.matchesRuleConditions)(multiOrRule, { material: 'fabric' })).toBe(false);
        });
    });
    describe('Scenario 4: Stale Selection Clearing and Safe Defaults', () => {
        it('should automatically clear or reset incompatible selection when controlling selection changes', () => {
            const rules = [
                {
                    name: 'Restrict Finishes for Fabric',
                    conditionGroupCode: 'material',
                    conditionOperator: 'EQUALS',
                    conditionOptionValue: 'fabric',
                    actionType: 'RESTRICT_OPTIONS',
                    targetGroupCode: 'finish',
                    actionPayload: {
                        allowedOptionValues: ['matte'],
                        defaultValue: 'matte',
                    },
                },
            ];
            const result = (0, product_rules_engine_1.evaluateProductConfiguration)(sampleGroups, rules, {
                material: 'fabric',
                finish: 'gloss',
            });
            expect(result.sanitizedSelections['finish']).toBe('matte');
            expect(result.changedSelections.length).toBeGreaterThan(0);
            expect(result.changedSelections[0].groupCode).toBe('finish');
            expect(result.changedSelections[0].previousValue).toBe('gloss');
            expect(result.changedSelections[0].newValue).toBe('matte');
        });
        it('should apply explicit SET_DEFAULT rule when condition is triggered', () => {
            const rules = [
                {
                    name: 'Default Thickness to 5mm for Solid Wood',
                    conditionGroupCode: 'material',
                    conditionOperator: 'EQUALS',
                    conditionOptionValue: 'wood',
                    actionType: 'SET_DEFAULT',
                    targetGroupCode: 'thickness',
                    targetOptionValue: '5mm',
                    actionPayload: {
                        defaultValue: '5mm',
                    },
                },
            ];
            const result = (0, product_rules_engine_1.evaluateProductConfiguration)(sampleGroups, rules, {
                material: 'wood',
                finish: 'matte',
            });
            expect(result.sanitizedSelections['thickness']).toBe('5mm');
        });
    });
    describe('Scenario 5: Rule Priority & Conflict Resolution', () => {
        it('should respect higher priority rule over lower priority conflicting rule', () => {
            const rules = [
                {
                    name: 'Low Priority: Show thickness',
                    conditionGroupCode: 'material',
                    conditionOperator: 'EQUALS',
                    conditionOptionValue: 'metal',
                    actionType: 'SHOW',
                    targetGroupCode: 'thickness',
                    actionPayload: { priority: 5 },
                },
                {
                    name: 'High Priority: Hide thickness for metal',
                    conditionGroupCode: 'material',
                    conditionOperator: 'EQUALS',
                    conditionOptionValue: 'metal',
                    actionType: 'HIDE',
                    targetGroupCode: 'thickness',
                    actionPayload: { priority: 20 },
                },
            ];
            const result = (0, product_rules_engine_1.evaluateProductConfiguration)(sampleGroups, rules, {
                material: 'metal',
            });
            expect(result.groupStatus['thickness'].isVisible).toBe(false);
        });
        it('should resolve equal-priority conflicts safely by picking restrictive action', () => {
            const rules = [
                {
                    name: 'Rule A: Enable gloss',
                    conditionGroupCode: 'material',
                    conditionOperator: 'EQUALS',
                    conditionOptionValue: 'metal',
                    actionType: 'ENABLE',
                    targetGroupCode: 'finish',
                    targetOptionValue: 'gloss',
                    actionPayload: { priority: 10 },
                },
                {
                    name: 'Rule B: Disable gloss',
                    conditionGroupCode: 'material',
                    conditionOperator: 'EQUALS',
                    conditionOptionValue: 'metal',
                    actionType: 'DISABLE',
                    targetGroupCode: 'finish',
                    targetOptionValue: 'gloss',
                    actionPayload: { priority: 10 },
                },
            ];
            const result = (0, product_rules_engine_1.evaluateProductConfiguration)(sampleGroups, rules, {
                material: 'metal',
            });
            expect(result.optionStatus['finish:gloss'].isDisabled).toBe(true);
        });
    });
    describe('Scenario 6: Prohibited Combinations (INVALID_COMBINATION)', () => {
        it('should trigger invalid combination error with customer message', () => {
            const rules = [
                {
                    name: 'Prohibit Metal with 5mm Thickness',
                    conditionGroupCode: 'material',
                    conditionOperator: 'EQUALS',
                    conditionOptionValue: 'metal',
                    actionType: 'INVALID_COMBINATION',
                    actionPayload: {
                        conditions: [
                            { groupCode: 'material', operator: 'EQUALS', optionValue: 'metal' },
                            { groupCode: 'thickness', operator: 'EQUALS', optionValue: '5mm' },
                        ],
                        logicalOperator: 'AND',
                        errorMessage: '5mm thickness is not feasible for metal engraving. Please choose 2mm.',
                    },
                },
            ];
            const result = (0, product_rules_engine_1.evaluateProductConfiguration)(sampleGroups, rules, {
                material: 'metal',
                finish: 'matte',
                thickness: '5mm',
            });
            expect(result.isValid).toBe(false);
            expect(result.invalidCombinations.length).toBe(1);
            expect(result.invalidCombinations[0].message).toBe('5mm thickness is not feasible for metal engraving. Please choose 2mm.');
        });
        it('should remain valid when non-prohibited combination is selected', () => {
            const rules = [
                {
                    name: 'Prohibit Metal with 5mm Thickness',
                    conditionGroupCode: 'material',
                    conditionOperator: 'EQUALS',
                    conditionOptionValue: 'metal',
                    actionType: 'INVALID_COMBINATION',
                    actionPayload: {
                        conditions: [
                            { groupCode: 'material', operator: 'EQUALS', optionValue: 'metal' },
                            { groupCode: 'thickness', operator: 'EQUALS', optionValue: '5mm' },
                        ],
                        logicalOperator: 'AND',
                        errorMessage: '5mm thickness is not feasible for metal.',
                    },
                },
            ];
            const result = (0, product_rules_engine_1.evaluateProductConfiguration)(sampleGroups, rules, {
                material: 'metal',
                finish: 'matte',
                thickness: '2mm',
            });
            expect(result.isValid).toBe(true);
            expect(result.invalidCombinations.length).toBe(0);
        });
    });
    describe('Scenario 7: Legacy Products without Rules', () => {
        it('should evaluate legacy products with empty rules without errors', () => {
            const result = (0, product_rules_engine_1.evaluateProductConfiguration)(sampleGroups, [], {
                material: 'wood',
                finish: 'gloss',
                thickness: '2mm',
            });
            expect(result.isValid).toBe(true);
            expect(result.visibleGroupCodes).toEqual(['material', 'finish', 'thickness']);
            expect(result.invalidCombinations).toHaveLength(0);
            expect(result.changedSelections).toHaveLength(0);
            expect(result.activeCharges).toHaveLength(0);
        });
    });
});
//# sourceMappingURL=product-rules-engine.spec.js.map