"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeValue = normalizeValue;
exports.evaluateSingleCondition = evaluateSingleCondition;
exports.matchesRuleConditions = matchesRuleConditions;
exports.evaluateProductConfiguration = evaluateProductConfiguration;
function normalizeValue(val) {
    if (val === undefined || val === null)
        return '';
    return String(val).toLowerCase().trim().replace(/[\s-]+/g, '_');
}
function evaluateSingleCondition(condition, userSelections) {
    const currentVal = userSelections[condition.groupCode];
    if (currentVal === undefined || currentVal === null || currentVal === '') {
        return false;
    }
    const normUser = normalizeValue(currentVal);
    const operator = (condition.operator || 'EQUALS').toUpperCase();
    const getOptionList = (val) => {
        if (Array.isArray(val)) {
            return val.map((v) => normalizeValue(v));
        }
        return String(val)
            .split(',')
            .map((s) => normalizeValue(s))
            .filter(Boolean);
    };
    switch (operator) {
        case 'EQUALS': {
            const target = normalizeValue(Array.isArray(condition.optionValue) ? condition.optionValue[0] : condition.optionValue);
            return normUser === target;
        }
        case 'NOT_EQUALS': {
            const target = normalizeValue(Array.isArray(condition.optionValue) ? condition.optionValue[0] : condition.optionValue);
            return normUser !== target;
        }
        case 'IN': {
            const list = getOptionList(condition.optionValue);
            return list.includes(normUser);
        }
        case 'NOT_IN': {
            const list = getOptionList(condition.optionValue);
            return !list.includes(normUser);
        }
        case 'GREATER_THAN': {
            const numUser = Number(currentVal);
            const numTarget = Number(Array.isArray(condition.optionValue) ? condition.optionValue[0] : condition.optionValue);
            return !isNaN(numUser) && !isNaN(numTarget) && numUser > numTarget;
        }
        case 'LESS_THAN': {
            const numUser = Number(currentVal);
            const numTarget = Number(Array.isArray(condition.optionValue) ? condition.optionValue[0] : condition.optionValue);
            return !isNaN(numUser) && !isNaN(numTarget) && numUser < numTarget;
        }
        default:
            return normUser === normalizeValue(condition.optionValue);
    }
}
function matchesRuleConditions(rule, userSelections) {
    if (rule.isActive === false)
        return false;
    const payload = rule.actionPayload || {};
    if (Array.isArray(payload.conditions) && payload.conditions.length > 0) {
        const isOr = (payload.logicalOperator || 'AND').toUpperCase() === 'OR';
        if (isOr) {
            return payload.conditions.some((c) => evaluateSingleCondition(c, userSelections));
        }
        else {
            return payload.conditions.every((c) => evaluateSingleCondition(c, userSelections));
        }
    }
    if (payload.conditionCombination && typeof payload.conditionCombination === 'object') {
        const entries = Object.entries(payload.conditionCombination);
        if (entries.length === 0)
            return false;
        return entries.every(([grpCode, optVal]) => {
            const userVal = userSelections[grpCode];
            if (userVal === undefined || userVal === null)
                return false;
            return normalizeValue(userVal) === normalizeValue(optVal);
        });
    }
    if (!rule.conditionGroupCode)
        return false;
    return evaluateSingleCondition({
        groupCode: rule.conditionGroupCode,
        operator: rule.conditionOperator,
        optionValue: rule.conditionOptionValue,
    }, userSelections);
}
function evaluateProductConfiguration(optionGroups, rules, userSelections = {}) {
    const sanitizedSelections = { ...userSelections };
    const changedSelections = [];
    const invalidCombinations = [];
    const errors = [];
    const groupStatus = {};
    for (const g of optionGroups) {
        groupStatus[g.code] = {
            isVisible: g.isCustomerVisible !== false,
            isRequired: Boolean(g.isRequired),
            isDisabled: false,
        };
    }
    const optionStatus = {};
    for (const g of optionGroups) {
        for (const opt of g.options || []) {
            const key = `${g.code}:${opt.value}`;
            optionStatus[key] = {
                isVisible: opt.isActive !== false,
                isDisabled: false,
            };
        }
    }
    const sortedRules = [...rules]
        .filter((r) => r.isActive !== false)
        .sort((a, b) => {
        const pA = Number(a.actionPayload?.priority || 0);
        const pB = Number(b.actionPayload?.priority || 0);
        return pB - pA;
    });
    const groupVisibilityPriority = {};
    const optionVisibilityPriority = {};
    const optionDisabledPriority = {};
    const groupRequiredPriority = {};
    const activeChargeMap = new Map();
    for (const rule of sortedRules) {
        const isMatch = matchesRuleConditions(rule, sanitizedSelections);
        const rulePriority = Number(rule.actionPayload?.priority || 0);
        const payload = rule.actionPayload || {};
        const targetGroup = rule.targetGroupCode;
        const targetOpt = rule.targetOptionValue;
        if (isMatch) {
            if (rule.actionType === 'INVALID_COMBINATION') {
                const msg = payload.errorMessage || rule.name || 'This option combination is not permitted.';
                invalidCombinations.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    message: msg,
                });
            }
            if (rule.actionType === 'APPLY_CHARGE' || rule.actionType === 'ADD_CHARGE') {
                const chgId = payload.chargeId || `rule-chg-${rule.id || rule.name}`;
                activeChargeMap.set(chgId, {
                    chargeId: chgId,
                    name: payload.name || rule.name,
                    amount: Number(payload.amount ?? payload.price ?? 0),
                    calculationType: payload.calculationType || 'FIXED',
                    description: payload.description,
                });
            }
            else if (rule.actionType === 'REMOVE_CHARGE' || rule.actionType === 'WAIVE_CHARGE') {
                const chgId = payload.chargeId || `rule-chg-${rule.id || rule.name}`;
                activeChargeMap.delete(chgId);
            }
            if (targetGroup && groupStatus[targetGroup]) {
                switch (rule.actionType) {
                    case 'HIDE':
                    case 'HIDE_GROUP':
                    case 'HIDE_OPTION': {
                        if (targetOpt) {
                            const optKey = `${targetGroup}:${targetOpt}`;
                            const prevPri = optionVisibilityPriority[optKey] ?? -Infinity;
                            if (rulePriority >= prevPri) {
                                if (optionStatus[optKey]) {
                                    optionStatus[optKey].isVisible = false;
                                    optionStatus[optKey].disabledReason = payload.reason || `Hidden when ${rule.conditionGroupCode} is selected.`;
                                }
                                optionVisibilityPriority[optKey] = rulePriority;
                            }
                        }
                        else {
                            const prevPri = groupVisibilityPriority[targetGroup] ?? -Infinity;
                            if (rulePriority >= prevPri) {
                                groupStatus[targetGroup].isVisible = false;
                                groupVisibilityPriority[targetGroup] = rulePriority;
                            }
                        }
                        break;
                    }
                    case 'SHOW':
                    case 'SHOW_GROUP':
                    case 'SHOW_OPTION': {
                        if (targetOpt) {
                            const optKey = `${targetGroup}:${targetOpt}`;
                            const prevPri = optionVisibilityPriority[optKey] ?? -Infinity;
                            if (rulePriority > prevPri) {
                                if (optionStatus[optKey]) {
                                    optionStatus[optKey].isVisible = true;
                                }
                                optionVisibilityPriority[optKey] = rulePriority;
                            }
                        }
                        else {
                            const prevPri = groupVisibilityPriority[targetGroup] ?? -Infinity;
                            if (rulePriority > prevPri) {
                                groupStatus[targetGroup].isVisible = true;
                                groupVisibilityPriority[targetGroup] = rulePriority;
                            }
                        }
                        break;
                    }
                    case 'DISABLE':
                    case 'DISABLE_OPTION':
                    case 'DISABLE_GROUP': {
                        if (targetOpt) {
                            const optKey = `${targetGroup}:${targetOpt}`;
                            const prevPri = optionDisabledPriority[optKey] ?? -Infinity;
                            if (rulePriority >= prevPri) {
                                if (optionStatus[optKey]) {
                                    optionStatus[optKey].isDisabled = true;
                                    optionStatus[optKey].disabledReason = payload.reason || `Not available with current selection.`;
                                }
                                optionDisabledPriority[optKey] = rulePriority;
                            }
                        }
                        else {
                            groupStatus[targetGroup].isDisabled = true;
                            groupStatus[targetGroup].disabledReason = payload.reason || `Not available with current selection.`;
                        }
                        break;
                    }
                    case 'ENABLE':
                    case 'ENABLE_OPTION':
                    case 'ENABLE_GROUP': {
                        if (targetOpt) {
                            const optKey = `${targetGroup}:${targetOpt}`;
                            const prevPri = optionDisabledPriority[optKey] ?? -Infinity;
                            if (rulePriority > prevPri) {
                                if (optionStatus[optKey]) {
                                    optionStatus[optKey].isDisabled = false;
                                }
                                optionDisabledPriority[optKey] = rulePriority;
                            }
                        }
                        else {
                            groupStatus[targetGroup].isDisabled = false;
                        }
                        break;
                    }
                    case 'REQUIRE': {
                        const prevPri = groupRequiredPriority[targetGroup] ?? -Infinity;
                        if (rulePriority >= prevPri) {
                            groupStatus[targetGroup].isRequired = true;
                            groupRequiredPriority[targetGroup] = rulePriority;
                        }
                        break;
                    }
                    case 'RESTRICT_OPTIONS': {
                        const allowed = Array.isArray(payload.allowedOptionValues)
                            ? payload.allowedOptionValues.map((v) => normalizeValue(v))
                            : [];
                        const grp = optionGroups.find((g) => g.code === targetGroup);
                        if (grp && allowed.length > 0) {
                            for (const opt of grp.options) {
                                const optKey = `${targetGroup}:${opt.value}`;
                                const isAllowed = allowed.includes(normalizeValue(opt.value));
                                if (!isAllowed) {
                                    if (optionStatus[optKey]) {
                                        optionStatus[optKey].isDisabled = true;
                                        optionStatus[optKey].disabledReason = payload.reason || `Not available for this option combination.`;
                                    }
                                }
                            }
                        }
                        break;
                    }
                    case 'SET_DEFAULT': {
                        const defVal = targetOpt || payload.defaultValue;
                        if (defVal) {
                            groupStatus[targetGroup].defaultValue = defVal;
                        }
                        break;
                    }
                }
            }
        }
    }
    for (const group of optionGroups) {
        const isGroupVis = groupStatus[group.code]?.isVisible !== false;
        const isGroupDis = groupStatus[group.code]?.isDisabled === true;
        const currentVal = sanitizedSelections[group.code];
        if (!isGroupVis || isGroupDis) {
            if (currentVal !== undefined && currentVal !== null) {
                delete sanitizedSelections[group.code];
                changedSelections.push({
                    groupCode: group.code,
                    previousValue: currentVal,
                    newValue: null,
                    reason: `Option group '${group.name}' is not applicable with current configuration.`,
                });
            }
            continue;
        }
        if (currentVal !== undefined && currentVal !== null && currentVal !== '') {
            const optKey = `${group.code}:${currentVal}`;
            const status = optionStatus[optKey];
            const isInvalidChoice = !status || status.isVisible === false || status.isDisabled === true;
            if (isInvalidChoice) {
                const ruleDefault = groupStatus[group.code]?.defaultValue;
                const defaultKey = ruleDefault ? `${group.code}:${ruleDefault}` : null;
                const isRuleDefaultValid = defaultKey &&
                    optionStatus[defaultKey] &&
                    optionStatus[defaultKey].isVisible !== false &&
                    !optionStatus[defaultKey].isDisabled;
                let replacementOption = isRuleDefaultValid
                    ? group.options.find((o) => normalizeValue(o.value) === normalizeValue(ruleDefault))
                    : null;
                if (!replacementOption) {
                    const standardDef = group.options.find((o) => o.isDefault);
                    if (standardDef) {
                        const k = `${group.code}:${standardDef.value}`;
                        if (optionStatus[k] && optionStatus[k].isVisible !== false && !optionStatus[k].isDisabled) {
                            replacementOption = standardDef;
                        }
                    }
                }
                if (!replacementOption) {
                    replacementOption = group.options.find((o) => {
                        const k = `${group.code}:${o.value}`;
                        return o.isActive !== false && optionStatus[k] && optionStatus[k].isVisible !== false && !optionStatus[k].isDisabled;
                    }) || null;
                }
                const newVal = replacementOption ? replacementOption.value : null;
                sanitizedSelections[group.code] = newVal;
                changedSelections.push({
                    groupCode: group.code,
                    previousValue: currentVal,
                    newValue: newVal,
                    reason: status?.disabledReason || `Selected choice was updated because it is not compatible with the current material / options.`,
                });
            }
        }
        else if (isGroupVis && !isGroupDis) {
            const ruleDefault = groupStatus[group.code]?.defaultValue;
            if (ruleDefault) {
                const matchedOpt = group.options.find((o) => normalizeValue(o.value) === normalizeValue(ruleDefault) &&
                    o.isActive !== false &&
                    optionStatus[`${group.code}:${o.value}`] &&
                    optionStatus[`${group.code}:${o.value}`].isVisible !== false &&
                    !optionStatus[`${group.code}:${o.value}`].isDisabled);
                if (matchedOpt) {
                    sanitizedSelections[group.code] = matchedOpt.value;
                    changedSelections.push({
                        groupCode: group.code,
                        previousValue: null,
                        newValue: matchedOpt.value,
                        reason: `Preselected default based on configuration rule.`,
                    });
                }
            }
            else if (groupStatus[group.code]?.isRequired) {
                const defOpt = group.options.find((o) => {
                    const k = `${group.code}:${o.value}`;
                    return (o.isActive !== false &&
                        optionStatus[k] &&
                        optionStatus[k].isVisible !== false &&
                        !optionStatus[k].isDisabled &&
                        o.isDefault);
                }) ||
                    group.options.find((o) => {
                        const k = `${group.code}:${o.value}`;
                        return (o.isActive !== false &&
                            optionStatus[k] &&
                            optionStatus[k].isVisible !== false &&
                            !optionStatus[k].isDisabled);
                    });
                if (defOpt) {
                    sanitizedSelections[group.code] = defOpt.value;
                    changedSelections.push({
                        groupCode: group.code,
                        previousValue: null,
                        newValue: defOpt.value,
                        reason: `Preselected default for required group '${group.name}'.`,
                    });
                }
            }
        }
    }
    if (invalidCombinations.length > 0) {
        for (const inv of invalidCombinations) {
            errors.push(inv.message);
        }
    }
    for (const group of optionGroups) {
        const isGroupVis = groupStatus[group.code]?.isVisible !== false;
        const isGroupReq = groupStatus[group.code]?.isRequired;
        const isGroupDis = groupStatus[group.code]?.isDisabled === true;
        const val = sanitizedSelections[group.code];
        if (isGroupVis && !isGroupDis && isGroupReq && (val === undefined || val === null || val === '')) {
            errors.push(`Selection is required for '${group.name}'.`);
        }
    }
    const visibleGroupCodes = optionGroups
        .filter((g) => groupStatus[g.code]?.isVisible !== false)
        .map((g) => g.code);
    return {
        visibleGroupCodes,
        groupStatus,
        optionStatus,
        invalidCombinations,
        sanitizedSelections,
        changedSelections,
        activeCharges: Array.from(activeChargeMap.values()),
        isValid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=product-rules-engine.js.map