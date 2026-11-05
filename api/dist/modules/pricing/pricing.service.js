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
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const shipping_gst_service_1 = require("../shipping-gst/shipping-gst.service");
const shipping_calculator_service_1 = require("../shipping/shipping-calculator.service");
const product_rules_engine_1 = require("../products/rules/product-rules-engine");
const IGNORED_COMBO_KEYS = [
    'discountPercent',
    'label',
    'rangeLabel',
    'quantityRanges',
    'offerName',
    'isExcluded',
    'status',
    'exclusionReason',
    'type',
    'isBasePrice',
    'price',
    'totalPrice',
    'quantity',
    'totalProductWeightGrams',
    'unitWeightGrams',
    'weightGrams',
    'id',
    'minQty',
    'maxQty',
];
function normalizeKey(str) {
    if (!str)
        return '';
    return String(str).toLowerCase().trim().replace(/[\s-]+/g, '_');
}
function matchesRuleCondition(rule, userSelections) {
    return (0, product_rules_engine_1.matchesRuleConditions)(rule, userSelections);
}
let PricingService = class PricingService {
    prisma;
    shippingGstService;
    shippingCalculatorService;
    constructor(prisma, shippingGstService, shippingCalculatorService) {
        this.prisma = prisma;
        this.shippingGstService = shippingGstService;
        this.shippingCalculatorService = shippingCalculatorService;
    }
    evaluateCombinationPricing(product, initialSelections, effectiveOrderQty, lineQty) {
        const userSelections = { ...initialSelections };
        let optionsUnitModifier = 0;
        let percentageModifierTotal = 0;
        const groupOptionModifiers = new Map();
        const selectedOptionsSummary = [];
        const specificationsSnapshot = {};
        const optionGroups = product.optionGroups || product.options || [];
        const configurationRules = product.configurationRules || [];
        const ruleEval = (0, product_rules_engine_1.evaluateProductConfiguration)(optionGroups.map((g) => ({
            id: g.id,
            name: g.name,
            code: g.code,
            isRequired: g.isRequired,
            isCustomerVisible: g.isCustomerVisible,
            options: (g.options || g.values || []).map((o) => ({
                id: o.id,
                label: o.label || o.name,
                value: o.value || o.code,
                isActive: o.isActive,
                isDefault: o.isDefault,
                priceModifier: o.priceModifier,
                priceModifierType: o.priceModifierType,
            })),
        })), configurationRules, userSelections);
        if (ruleEval.invalidCombinations && ruleEval.invalidCombinations.length > 0) {
            throw new common_1.BadRequestException(`Invalid option combination: ${ruleEval.invalidCombinations.map((c) => c.message).join('; ')}`);
        }
        for (const [grpCode, val] of Object.entries(initialSelections)) {
            if (val === undefined || val === null || val === '')
                continue;
            const optKey = `${grpCode}:${val}`;
            if (ruleEval.optionStatus[optKey]?.isDisabled === true) {
                const reason = ruleEval.optionStatus[optKey]?.disabledReason ||
                    `Option '${val}' in '${grpCode}' is not available with the current configuration.`;
                throw new common_1.BadRequestException(reason);
            }
            const isPrintingLocation = /print(ing)?_?(loc(ation)?|side)/i.test(grpCode || '');
            const isDesignCondition = configurationRules.some((r) => /design/i.test(r.conditionGroupCode || ''));
            if (isPrintingLocation && isDesignCondition) {
            }
            else if (ruleEval.groupStatus[grpCode]?.isVisible === false) {
                throw new common_1.BadRequestException(`Option group '${grpCode}' is not applicable for this configuration.`);
            }
        }
        for (const [key, val] of Object.entries(ruleEval.sanitizedSelections)) {
            if (userSelections[key] === undefined || userSelections[key] === null || userSelections[key] === '') {
                if (val !== undefined && val !== null) {
                    userSelections[key] = val;
                }
            }
        }
        const isBulkRangeProduct = product.pricingModel === 'BULK_RANGE';
        for (const group of optionGroups) {
            let isVisible = ruleEval.groupStatus[group.code]?.isVisible !== false;
            const isPrintingLocation = /print(ing)?_?(loc(ation)?|side)/i.test(group.code || '');
            const isDesignCondition = configurationRules.some((r) => /design/i.test(r.conditionGroupCode || ''));
            if (isPrintingLocation && isDesignCondition) {
                isVisible = true;
            }
            if (!isVisible) {
                delete userSelections[group.code];
                continue;
            }
            const activeOptVal = userSelections[group.code];
            if (activeOptVal !== undefined && activeOptVal !== null && activeOptVal !== '') {
                const optKey = `${group.code}:${activeOptVal}`;
                if (ruleEval.optionStatus[optKey]?.isVisible === false) {
                    delete userSelections[group.code];
                    continue;
                }
            }
            const groupOptions = group.options || group.values || [];
            const selectedVal = userSelections[group.code];
            if (group.isRequired && (selectedVal === undefined || selectedVal === null || selectedVal === '')) {
                const defaultOpt = groupOptions.find((o) => o.isDefault) || groupOptions[0];
                if (defaultOpt) {
                    userSelections[group.code] = defaultOpt.value || defaultOpt.code;
                }
            }
            const activeVal = userSelections[group.code];
            if (activeVal === undefined || activeVal === null || activeVal === '') {
                continue;
            }
            const matchedOption = groupOptions.find((o) => (o.value || o.code) === String(activeVal) ||
                normalizeKey(o.value || o.code) === normalizeKey(activeVal) ||
                String(o.value || o.code).toLowerCase().trim() === String(activeVal).toLowerCase().trim());
            if (matchedOption) {
                const additionalPricings = product.additionalPricings || [];
                const groupAdditionalPricings = additionalPricings.filter((ap) => ap.groupCode === group.code);
                let modVal = Number(matchedOption.priceModifier || 0);
                let modType = matchedOption.priceModifierType || 'FIXED';
                let isAdditionalTierPricing = false;
                let matchedTierLabel = undefined;
                if (groupAdditionalPricings.length > 0 && effectiveOrderQty > 0) {
                    const valMatches = (apVal, optVal) => {
                        return (String(apVal).toLowerCase().trim() === String(optVal).toLowerCase().trim() ||
                            normalizeKey(apVal) === normalizeKey(optVal));
                    };
                    const valTiers = groupAdditionalPricings.filter((ap) => valMatches(ap.optionValue, matchedOption.value || matchedOption.code));
                    if (valTiers.length === 0) {
                        throw new common_1.BadRequestException(`Missing pricing matrix configuration for option '${matchedOption.label || matchedOption.value}' in group '${group.name || group.label}'.`);
                    }
                    let matchingTier = valTiers.find((ap) => {
                        const minQ = Number(ap.minQty) || 0;
                        const maxQ = ap.maxQty !== undefined && ap.maxQty !== null && Number(ap.maxQty) >= minQ
                            ? Number(ap.maxQty)
                            : minQ;
                        return (effectiveOrderQty >= minQ &&
                            (maxQ > minQ ? effectiveOrderQty <= maxQ : (ap.maxQty ? effectiveOrderQty <= ap.maxQty : true)));
                    });
                    if (!matchingTier) {
                        throw new common_1.BadRequestException(`Invalid quantity tier ${effectiveOrderQty} for option '${matchedOption.label || matchedOption.value}'. No configured additional pricing tier matches this quantity.`);
                    }
                    matchedTierLabel =
                        matchingTier.maxQty && Number(matchingTier.maxQty) > Number(matchingTier.minQty)
                            ? `${matchingTier.minQty}–${matchingTier.maxQty} pcs`
                            : `${matchingTier.minQty} pcs`;
                    if (matchingTier.isExcluded) {
                        modVal = 0;
                        modType = 'FLAT_PER_ORDER';
                        isAdditionalTierPricing = true;
                    }
                    else {
                        const tierCharge = Number(matchingTier.unitPrice || 0);
                        if (tierCharge < 0) {
                            throw new common_1.BadRequestException(`Additional charge for '${matchedOption.label}' in '${group.name}' cannot be negative.`);
                        }
                        modVal = tierCharge;
                        modType = 'FLAT_PER_ORDER';
                        isAdditionalTierPricing = true;
                    }
                }
                if (modVal < 0) {
                    throw new common_1.BadRequestException(`Option charge for '${matchedOption.label || matchedOption.name || group.name}' cannot be negative.`);
                }
                groupOptionModifiers.set(group.code, { modVal, type: modType, isAdditionalTierPricing });
                if (isAdditionalTierPricing) {
                    const unitContribution = lineQty > 0 ? (modVal / lineQty) : modVal;
                    optionsUnitModifier += unitContribution;
                }
                else if (modType === 'FIXED' || modType === 'PER_UNIT') {
                    optionsUnitModifier += modVal;
                }
                else if (modType === 'PERCENTAGE') {
                    percentageModifierTotal += modVal;
                }
                selectedOptionsSummary.push({
                    optionName: group.name || group.label,
                    optionCode: group.code,
                    valueName: matchedOption.label || matchedOption.name,
                    valueCode: matchedOption.value || matchedOption.code,
                    priceModifier: modVal,
                    matchedTier: matchedTierLabel,
                    flatAddonAmount: isAdditionalTierPricing ? modVal : undefined,
                    additionalUnitPrice: isAdditionalTierPricing
                        ? (lineQty > 0 ? Math.round((modVal / lineQty) * 10000) / 10000 : modVal)
                        : 0,
                    additionalChargeTotal: isAdditionalTierPricing ? modVal : 0,
                });
                specificationsSnapshot[group.code] = {
                    label: group.label || group.name,
                    value: matchedOption.value || matchedOption.code,
                    displayValue: matchedOption.label || matchedOption.name,
                    priceModifier: modVal,
                    isAdditionalTierPricing,
                };
            }
            else {
                specificationsSnapshot[group.code] = {
                    label: group.label || group.name,
                    value: activeVal,
                    displayValue: String(activeVal),
                };
            }
        }
        const startingReferenceRate = Number(product.basePrice || 0);
        const minQuantity = Math.max(1, Number(product.minQuantity) || 1);
        const referenceUnitPrice = startingReferenceRate > 0
            ? Math.round((startingReferenceRate / minQuantity) * 10000) / 10000
            : 0;
        const originalBasePrice = startingReferenceRate;
        let baseUnitPrice = referenceUnitPrice;
        let appliedOffer = null;
        const availableOffers = [];
        let bestMatchingRule = null;
        const isBaseOnly = product.pricingModel === 'BASE_ONLY';
        const isSingleTypeProduct = product.pricingModel === 'SINGLE' ||
            product.pricingModel === 'SINGLE_RANGE' ||
            (product.tags && product.tags.includes('SINGLE_TYPE'));
        if (isSingleTypeProduct && product.pricingMatrices && product.pricingMatrices.length > 0) {
            const sortedMatrices = [...product.pricingMatrices].sort((a, b) => a.minQty - b.minQty);
            for (const m of sortedMatrices) {
                const combo = m.attributeCombination || {};
                const isBase = combo.isBasePrice === true || combo.type === 'BASE' || !combo.attributeCode;
                if (isBase) {
                    const rulePrice = Number(m.unitPrice);
                    const label = m.minQty === m.maxQty
                        ? `Qty ${m.minQty}: ₹${rulePrice.toFixed(2)}/pc`
                        : `Qty ${m.minQty}–${m.maxQty}: ₹${rulePrice.toFixed(2)}/pc`;
                    availableOffers.push({
                        id: m.id,
                        minQty: m.minQty,
                        maxQty: m.maxQty,
                        discountPercent: referenceUnitPrice > rulePrice && referenceUnitPrice > 0
                            ? Math.round(((referenceUnitPrice - rulePrice) / referenceUnitPrice) * 100)
                            : 0,
                        unitPrice: rulePrice,
                        label,
                    });
                }
            }
            const matchingRangeRules = product.pricingMatrices.filter((m) => effectiveOrderQty >= m.minQty && (m.maxQty === null || m.maxQty === undefined || effectiveOrderQty <= m.maxQty));
            if (matchingRangeRules.length > 0) {
                const baseRule = matchingRangeRules.find((m) => {
                    const combo = m.attributeCombination || {};
                    return (combo.isBasePrice === true ||
                        combo.type === 'BASE' ||
                        (!combo.attributeCode && !combo.type) ||
                        Object.keys(combo).filter((k) => !IGNORED_COMBO_KEYS.includes(k)).length === 0);
                }) || matchingRangeRules[0];
                baseUnitPrice = Number(baseRule.unitPrice);
                let singleTypeAddonModifier = 0;
                for (const [fieldKey, userVal] of Object.entries(userSelections)) {
                    if (userVal === undefined || userVal === null || userVal === '')
                        continue;
                    const attrRule = matchingRangeRules.find((m) => {
                        const combo = m.attributeCombination || {};
                        return ((combo.type === 'ATTRIBUTE' &&
                            combo.attributeCode?.toLowerCase() === fieldKey.toLowerCase() &&
                            String(combo.attributeValue)?.toLowerCase() === String(userVal).toLowerCase()) ||
                            (combo[fieldKey] !== undefined && String(combo[fieldKey]) === String(userVal)));
                    });
                    if (attrRule) {
                        const rawVal = Number(attrRule.unitPrice || attrRule.attributeCombination?.extraPrice || 0);
                        const extra = rawVal > baseUnitPrice && baseUnitPrice > 0 ? rawVal - baseUnitPrice : rawVal;
                        if (extra > 0) {
                            singleTypeAddonModifier += extra;
                            const existingSummary = selectedOptionsSummary.find((s) => s.optionCode === fieldKey);
                            if (existingSummary) {
                                existingSummary.priceModifier = extra;
                            }
                        }
                    }
                }
                if (singleTypeAddonModifier > 0) {
                    optionsUnitModifier = singleTypeAddonModifier;
                }
                const firstBaseRule = sortedMatrices.find((m) => {
                    const combo = m.attributeCombination || {};
                    return combo.isBasePrice === true || combo.type === 'BASE';
                }) || sortedMatrices[0];
                const firstRate = Number(firstBaseRule.unitPrice);
                if (firstRate > baseUnitPrice && firstRate > 0) {
                    const savingsPerUnit = firstRate - baseUnitPrice;
                    const disc = Math.round((savingsPerUnit / firstRate) * 100);
                    appliedOffer = {
                        offerId: baseRule.id,
                        minQty: baseRule.minQty,
                        maxQty: baseRule.maxQty,
                        discountPercent: disc,
                        offerName: `Volume Savings (${disc}% OFF for Qty ${baseRule.minQty}–${baseRule.maxQty})`,
                        savingsAmount: Math.round(savingsPerUnit * lineQty * 100) / 100,
                    };
                }
            }
        }
        else if (isBaseOnly) {
            baseUnitPrice = referenceUnitPrice;
            if (product.pricingMatrices && product.pricingMatrices.length > 0) {
                const sortedMatrices = [...product.pricingMatrices].sort((a, b) => a.minQty - b.minQty);
                const matchingTier = sortedMatrices.find((m) => effectiveOrderQty >= m.minQty && (m.maxQty === null || m.maxQty === undefined || effectiveOrderQty <= m.maxQty));
                if (matchingTier) {
                    const isRangeTier = Boolean(matchingTier.maxQty && matchingTier.maxQty > matchingTier.minQty);
                    const combo = matchingTier.attributeCombination || {};
                    const comboExact = combo.totalPrice ?? combo.price;
                    if (!isRangeTier && comboExact !== undefined && comboExact !== null && Number(comboExact) > 0 && effectiveOrderQty === matchingTier.minQty) {
                        baseUnitPrice = Number(comboExact) / effectiveOrderQty;
                    }
                    else if (Number(matchingTier.unitPrice) > 0) {
                        baseUnitPrice = Number(matchingTier.unitPrice);
                    }
                }
            }
        }
        else if (product.pricingMatrices && product.pricingMatrices.length > 0) {
            const sortedMatrices = [...product.pricingMatrices].sort((a, b) => a.minQty - b.minQty);
            const matchingComboMatrices = sortedMatrices.filter((m) => {
                const combo = m.attributeCombination || {};
                const comboEntries = Object.entries(combo).filter(([k]) => !IGNORED_COMBO_KEYS.includes(k));
                if (comboEntries.length === 0)
                    return false;
                return comboEntries.every(([k, v]) => String(userSelections[k]) === String(v));
            });
            const hasBaseRules = sortedMatrices.some((m) => {
                const c = m.attributeCombination || {};
                const entries = Object.entries(c).filter(([k]) => !IGNORED_COMBO_KEYS.includes(k));
                return entries.length === 0;
            });
            bestMatchingRule = null;
            let highestMatchSpecificity = -1;
            if (matchingComboMatrices.length > 0) {
                const isRangeBracketMode = product.pricingModel === 'SINGLE_FIXED_QUANTITY';
                const isIncrementalAllowed = Number(product.quantityStep) > 0;
                const exactQtyMatch = matchingComboMatrices.find((m) => m.minQty === effectiveOrderQty) ||
                    (isRangeBracketMode
                        ? matchingComboMatrices.find((m) => m.minQty <= effectiveOrderQty &&
                            (m.maxQty && m.maxQty >= m.minQty ? effectiveOrderQty <= m.maxQty : false))
                        : (isIncrementalAllowed
                            ? matchingComboMatrices.find((m) => m.minQty <= effectiveOrderQty)
                            : undefined));
                if (!exactQtyMatch) {
                    const avail = matchingComboMatrices
                        .filter((m) => {
                        const c = m.attributeCombination || {};
                        return !c.isExcluded && c.status !== 'EXCLUDED';
                    })
                        .map((m) => (m.maxQty && m.maxQty > m.minQty ? `${m.minQty}–${m.maxQty}` : `${m.minQty}`))
                        .sort();
                    throw new common_1.BadRequestException(`Quantity ${effectiveOrderQty} is not available for this combination. Please select an available quantity${avail.length > 0 ? ` (${avail.join(', ')})` : ''}.`);
                }
                const combo = exactQtyMatch.attributeCombination || {};
                if (combo.isExcluded === true || combo.status === 'EXCLUDED') {
                    throw new common_1.BadRequestException('The selected product option combination is not supported for production.');
                }
                const comboExactPrice = combo.price ?? combo.totalPrice;
                if (comboExactPrice !== undefined && comboExactPrice !== null && Number(comboExactPrice) > 0) {
                    baseUnitPrice = Number(comboExactPrice) / effectiveOrderQty;
                }
                else {
                    baseUnitPrice = Number(exactQtyMatch.unitPrice);
                }
                bestMatchingRule = {
                    rule: exactQtyMatch,
                    discountPercent: Number(combo.discountPercent || 0),
                    label: combo.label || `Quantity ${effectiveOrderQty}`,
                    isSpecific: true,
                };
            }
            else if (!hasBaseRules) {
                if (product.pricingModel === 'AUTOMATIC') {
                    baseUnitPrice = referenceUnitPrice;
                }
                else {
                    throw new common_1.BadRequestException('This combination is currently unavailable. Please select another configuration.');
                }
            }
            else {
                for (const m of sortedMatrices) {
                    const combo = m.attributeCombination || {};
                    const ruleUnitPrice = Number(m.unitPrice);
                    let discountPercent = combo.discountPercent !== undefined ? Number(combo.discountPercent) : 0;
                    if (!discountPercent && ruleUnitPrice < referenceUnitPrice && referenceUnitPrice > 0) {
                        discountPercent = Math.round(((referenceUnitPrice - ruleUnitPrice) / referenceUnitPrice) * 100);
                    }
                    const label = combo.label ||
                        combo.offerName ||
                        (discountPercent > 0
                            ? `${discountPercent}% OFF (${m.minQty.toLocaleString()}–${m.maxQty.toLocaleString()} units)`
                            : `Special Tier Price (${m.minQty.toLocaleString()}–${m.maxQty.toLocaleString()} units)`);
                    availableOffers.push({
                        id: m.id,
                        minQty: m.minQty,
                        maxQty: m.maxQty,
                        discountPercent,
                        unitPrice: ruleUnitPrice,
                        label,
                    });
                    const isRangeBracketMode = product.pricingModel === 'SINGLE_FIXED_QUANTITY';
                    const isIncrementalAllowed = Number(product.quantityStep) > 0;
                    const isExactQtyMatch = effectiveOrderQty === m.minQty;
                    const isBracketMatch = isRangeBracketMode &&
                        effectiveOrderQty >= m.minQty &&
                        (m.maxQty && m.maxQty >= m.minQty ? effectiveOrderQty <= m.maxQty : true);
                    const isThresholdMatch = !isRangeBracketMode && isIncrementalAllowed && effectiveOrderQty >= m.minQty;
                    if (isExactQtyMatch || isBracketMatch || isThresholdMatch) {
                        const comboEntries = Object.entries(combo).filter(([k]) => !IGNORED_COMBO_KEYS.includes(k));
                        if (comboEntries.length === 0) {
                            const qtyScore = isExactQtyMatch ? 1000000 : m.minQty;
                            if (highestMatchSpecificity <= 0 && qtyScore > highestMatchSpecificity) {
                                bestMatchingRule = { rule: m, discountPercent, label, isSpecific: false };
                                highestMatchSpecificity = 0;
                            }
                        }
                        else {
                            const allMatch = comboEntries.every(([k, v]) => String(userSelections[k]) === String(v));
                            if (allMatch) {
                                const qtyScore = isExactQtyMatch ? 1000000 : m.minQty;
                                const ruleScore = comboEntries.length * 10000000 + qtyScore;
                                if (ruleScore > highestMatchSpecificity) {
                                    bestMatchingRule = { rule: m, discountPercent, label, isSpecific: true };
                                    highestMatchSpecificity = ruleScore;
                                }
                            }
                        }
                    }
                }
            }
            if (bestMatchingRule) {
                const { rule, discountPercent, label, isSpecific } = bestMatchingRule;
                const combo = rule.attributeCombination || {};
                if (combo.isExcluded === true || combo.status === 'EXCLUDED') {
                    throw new common_1.BadRequestException('The selected product option combination is not supported for production.');
                }
                const ruleUnitPrice = Number(rule.unitPrice);
                const comboExactPrice = combo.totalPrice ?? combo.price;
                const isRangeTier = Boolean(rule.maxQty && rule.maxQty > rule.minQty);
                if (discountPercent > 0) {
                    baseUnitPrice = Math.round(referenceUnitPrice * (1 - discountPercent / 100) * 10000) / 10000;
                }
                else if (!isRangeTier &&
                    comboExactPrice !== undefined &&
                    comboExactPrice !== null &&
                    Number(comboExactPrice) > 0 &&
                    effectiveOrderQty === rule.minQty) {
                    baseUnitPrice = Number(comboExactPrice) / effectiveOrderQty;
                }
                else if (ruleUnitPrice > 0) {
                    baseUnitPrice = ruleUnitPrice;
                    if (referenceUnitPrice > ruleUnitPrice && referenceUnitPrice > 0) {
                        const calculatedDisc = Math.round(((referenceUnitPrice - ruleUnitPrice) / referenceUnitPrice) * 100);
                        appliedOffer = {
                            offerId: rule.id,
                            minQty: rule.minQty,
                            maxQty: rule.maxQty,
                            discountPercent: calculatedDisc,
                            offerName: label,
                            savingsAmount: Math.round((referenceUnitPrice - ruleUnitPrice) * lineQty * 100) / 100,
                        };
                    }
                }
                if (isSpecific) {
                    const comboKeys = new Set(Object.keys(combo).filter((k) => !IGNORED_COMBO_KEYS.includes(k)));
                    optionsUnitModifier = 0;
                    for (const [grpCode, { modVal, type, isAdditionalTierPricing }] of groupOptionModifiers.entries()) {
                        if (!comboKeys.has(grpCode) || isAdditionalTierPricing) {
                            if (isAdditionalTierPricing) {
                                const unitContribution = lineQty > 0 ? (modVal / lineQty) : modVal;
                                optionsUnitModifier += unitContribution;
                            }
                            else if (type === 'FIXED' || type === 'PER_UNIT') {
                                optionsUnitModifier += modVal;
                            }
                        }
                    }
                }
                if (!appliedOffer && discountPercent > 0) {
                    const savingsPerUnit = Math.max(0, originalBasePrice - baseUnitPrice);
                    appliedOffer = {
                        offerId: rule.id,
                        minQty: rule.minQty,
                        maxQty: rule.maxQty,
                        discountPercent,
                        offerName: label,
                        savingsAmount: Math.round(savingsPerUnit * lineQty * 100) / 100,
                    };
                }
            }
            else if (hasBaseRules && product.pricingModel !== 'SINGLE_FIXED_QUANTITY' && Number(product.quantityStep) <= 0) {
                const avail = sortedMatrices
                    .filter((m) => {
                    const c = m.attributeCombination || {};
                    return !c.isExcluded && c.status !== 'EXCLUDED';
                })
                    .map((m) => (m.maxQty && m.maxQty > m.minQty ? `${m.minQty}–${m.maxQty}` : `${m.minQty}`))
                    .sort();
                throw new common_1.BadRequestException(`Quantity ${effectiveOrderQty} is not available for ${product.name}. Please select an available quantity tier${avail.length > 0 ? ` (${avail.join(', ')})` : ''}.`);
            }
        }
        if (!appliedOffer && configurationRules && configurationRules.length > 0) {
            for (const rule of configurationRules) {
                if (!rule.isActive)
                    continue;
                if (rule.actionType === 'VOLUME_DISCOUNT' || rule.actionType === 'TIER_DISCOUNT') {
                    const payload = rule.actionPayload || {};
                    const ruleMinQty = Number(payload.minQty || rule.conditionOptionValue || 0);
                    const ruleMaxQty = payload.maxQty ? Number(payload.maxQty) : Infinity;
                    if (effectiveOrderQty >= ruleMinQty && effectiveOrderQty <= ruleMaxQty) {
                        const discPercent = Number(payload.discountPercent || payload.percent || 0);
                        if (discPercent > 0) {
                            const discountedRate = Math.round(baseUnitPrice * (1 - discPercent / 100) * 10000) / 10000;
                            const savingsUnit = baseUnitPrice - discountedRate;
                            baseUnitPrice = discountedRate;
                            appliedOffer = {
                                offerId: `rule-${rule.id}`,
                                minQty: ruleMinQty,
                                maxQty: ruleMaxQty === Infinity ? 100000 : ruleMaxQty,
                                discountPercent: discPercent,
                                offerName: rule.name || `${discPercent}% OFF for Qty ${ruleMinQty}+`,
                                savingsAmount: Math.round(savingsUnit * lineQty * 100) / 100,
                            };
                            break;
                        }
                    }
                }
            }
        }
        let unitPrice = (baseUnitPrice + optionsUnitModifier) * (1 + percentageModifierTotal / 100);
        const lineSubtotal = Math.round(unitPrice * lineQty * 100) / 100;
        unitPrice = lineQty > 0 ? Math.round((lineSubtotal / lineQty) * 10000) / 10000 : Math.round(unitPrice * 100) / 100;
        return {
            startingReferenceRate,
            unitPrice,
            baseUnitPrice,
            optionsUnitModifier,
            lineSubtotal,
            selectedOptionsSummary,
            specificationsSnapshot,
            appliedOffer,
            availableOffers,
            groupOptionModifiers,
            bestMatchingRule,
            referenceUnitPrice,
            originalBasePrice,
            userSelections,
        };
    }
    checkDesignServiceRequested(userSelections, optionGroups, configurationRules, dtoHasDesignService, designReq) {
        if (designReq === 'REQUIRED')
            return true;
        let userDesignValue = '';
        for (const [key, val] of Object.entries(userSelections || {})) {
            if (val === undefined || val === null)
                continue;
            const normKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normKey.includes('design') ||
                normKey.includes('artworkservice') ||
                normKey.includes('hireservice')) {
                userDesignValue = String(val).toLowerCase().trim();
                break;
            }
        }
        if (!userDesignValue && optionGroups && optionGroups.length > 0) {
            for (const grp of optionGroups) {
                const normCode = String(grp.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const normName = String(grp.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                if (normCode.includes('design') || normName.includes('design')) {
                    if (userSelections && userSelections[grp.code] !== undefined && userSelections[grp.code] !== null) {
                        userDesignValue = String(userSelections[grp.code]).toLowerCase().trim();
                        break;
                    }
                }
            }
        }
        const isExplicitNo = userDesignValue === 'no' ||
            userDesignValue === 'false' ||
            userDesignValue === 'none' ||
            userDesignValue.includes('own_file') ||
            userDesignValue.includes('customer_supplied') ||
            userDesignValue.includes('upload');
        if (isExplicitNo)
            return false;
        const isExplicitYes = userDesignValue === 'yes' ||
            userDesignValue === 'true' ||
            userDesignValue === 'required' ||
            userDesignValue.includes('hire') ||
            userDesignValue.includes('assist') ||
            userDesignValue.includes('yes_please');
        if (isExplicitYes || dtoHasDesignService === true)
            return true;
        for (const rule of configurationRules || []) {
            if (!rule.isActive)
                continue;
            const isArtRule = rule.actionType === 'ARTWORK_CONDITIONS' ||
                rule.actionType === 'CONFIGURE_ARTWORK' ||
                rule.actionType === 'REQUIRE_ARTWORK_FILES';
            if (isArtRule && matchesRuleCondition(rule, userSelections)) {
                const payload = rule.actionPayload || {};
                if (payload.designFeeEnabled === true ||
                    (payload.designFee !== undefined && Number(payload.designFee) > 0) ||
                    payload.requireDesignBrief === true) {
                    return true;
                }
            }
        }
        return false;
    }
    async calculateQuote(dto) {
        let product = await this.prisma.product.findFirst({
            where: {
                OR: [
                    { id: dto.productId },
                    { slug: dto.productId },
                    { sku: dto.productId },
                ],
            },
            include: {
                optionGroups: {
                    include: {
                        options: {
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
                configurationRules: {
                    where: { isActive: true },
                },
                pricingMatrices: {
                    orderBy: { minQty: 'asc' },
                },
                additionalPricings: {
                    orderBy: [{ minQty: 'asc' }, { groupCode: 'asc' }, { optionValue: 'asc' }],
                },
            },
        });
        if (!product) {
            product = await this.prisma.product.findFirst({
                where: { status: 'PUBLISHED' },
                include: {
                    optionGroups: {
                        include: {
                            options: {
                                orderBy: { sortOrder: 'asc' },
                            },
                        },
                        orderBy: { sortOrder: 'asc' },
                    },
                    configurationRules: {
                        where: { isActive: true },
                    },
                    pricingMatrices: {
                        orderBy: { minQty: 'asc' },
                    },
                    additionalPricings: {
                        orderBy: [{ minQty: 'asc' }, { groupCode: 'asc' }, { optionValue: 'asc' }],
                    },
                },
            });
        }
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID '${dto.productId}' not found`);
        }
        if (dto.quantity < product.minQuantity) {
            throw new common_1.BadRequestException(`Minimum quantity for ${product.name} is ${product.minQuantity}`);
        }
        if (dto.quantity > product.maxQuantity) {
            throw new common_1.BadRequestException(`Maximum quantity for ${product.name} is ${product.maxQuantity}`);
        }
        const userSelections = { ...(dto.fieldValues || {}) };
        if (dto.options && dto.options.length > 0) {
            for (const opt of dto.options) {
                if (!userSelections[opt.optionCode]) {
                    userSelections[opt.optionCode] = opt.valueCode;
                }
            }
        }
        const optionGroups = product.optionGroups || product.options || [];
        const configurationRules = product.configurationRules || [];
        const isMultiVariantRequest = Boolean(dto.variantLines && dto.variantLines.length > 0);
        if (isMultiVariantRequest) {
            const rawLines = dto.variantLines;
            const normalizedLines = [];
            for (const line of rawLines) {
                const qty = Math.floor(Number(line.quantity ?? line.qty));
                if (isNaN(qty) || qty <= 0) {
                    throw new common_1.BadRequestException('Each variant line must have a quantity of at least 1.');
                }
                let combo = line.combination;
                if (!combo || Object.keys(combo).length === 0) {
                    const optVal = line.code || line.optionCode;
                    if (optVal) {
                        const matchedGrp = product.optionGroups?.find((g) => g.options?.some((o) => String(o.value).toLowerCase() === String(optVal).toLowerCase() ||
                            String(o.label).toLowerCase() === String(optVal).toLowerCase()));
                        if (matchedGrp) {
                            combo = { [matchedGrp.code]: String(optVal) };
                        }
                        else {
                            combo = { variant: String(optVal) };
                        }
                    }
                }
                if (!combo || Object.keys(combo).length === 0) {
                    throw new common_1.BadRequestException('Each variant line must have a valid option combination.');
                }
                const normCombo = {};
                for (const [k, v] of Object.entries(combo)) {
                    const groupCode = k.trim();
                    const valCode = String(v).trim();
                    normCombo[groupCode] = valCode;
                    const grp = product.optionGroups?.find((g) => g.code.toLowerCase() === groupCode.toLowerCase());
                    if (grp) {
                        const opt = grp.options?.find((o) => String(o.value).toLowerCase() === valCode.toLowerCase());
                        if (opt && opt.isActive === false) {
                            throw new common_1.BadRequestException(`Option '${opt.label || valCode}' in '${grp.name}' is inactive and cannot be ordered.`);
                        }
                    }
                }
                const existing = normalizedLines.find((l) => {
                    const keysA = Object.keys(l.combination);
                    const keysB = Object.keys(normCombo);
                    if (keysA.length !== keysB.length)
                        return false;
                    return keysA.every((k) => l.combination[k] === normCombo[k]);
                });
                if (existing) {
                    existing.quantity += qty;
                }
                else {
                    normalizedLines.push({
                        id: line.id,
                        sku: line.sku,
                        combination: normCombo,
                        quantity: qty,
                        artworkUrl: line.artworkUrl,
                    });
                }
            }
            const totalVariantQuantity = normalizedLines.reduce((sum, l) => sum + l.quantity, 0);
            if (totalVariantQuantity < product.minQuantity) {
                throw new common_1.BadRequestException(`Minimum total quantity for ${product.name} is ${product.minQuantity}. Current total is ${totalVariantQuantity}.`);
            }
            if (totalVariantQuantity > product.maxQuantity) {
                throw new common_1.BadRequestException(`Maximum total quantity for ${product.name} is ${product.maxQuantity}. Current total is ${totalVariantQuantity}.`);
            }
            const variantLinesQuote = [];
            let printItemsTotal = 0;
            let dynamicModifiersTotal = 0;
            let firstRefUnitPrice = 0;
            let firstOrigBasePrice = 0;
            let firstEffectiveBasePrice = 0;
            const combinedOptionsSummary = [];
            const specificationsSnapshot = {
                isMultiVariant: true,
                totalVariantQuantity,
                variantDimensions: product.variantDimensions || [],
            };
            for (let i = 0; i < normalizedLines.length; i++) {
                const line = normalizedLines[i];
                const mergedSelections = { ...userSelections, ...line.combination };
                const linePricing = this.evaluateCombinationPricing(product, mergedSelections, totalVariantQuantity, line.quantity);
                if (i === 0) {
                    firstRefUnitPrice = linePricing.referenceUnitPrice;
                    firstOrigBasePrice = linePricing.originalBasePrice;
                    firstEffectiveBasePrice = linePricing.baseUnitPrice;
                }
                variantLinesQuote.push({
                    id: line.id,
                    sku: line.sku || `${product.sku}-${Object.values(line.combination).join('-')}`,
                    combination: line.combination,
                    optionsSummary: linePricing.selectedOptionsSummary,
                    quantity: line.quantity,
                    unitPrice: linePricing.unitPrice,
                    lineSubtotal: linePricing.lineSubtotal,
                    artworkUrl: line.artworkUrl,
                });
                printItemsTotal += linePricing.lineSubtotal;
                dynamicModifiersTotal += linePricing.optionsUnitModifier * line.quantity;
                for (const opt of linePricing.selectedOptionsSummary) {
                    const already = combinedOptionsSummary.find((o) => o.optionCode === opt.optionCode && o.valueCode === opt.valueCode);
                    if (!already) {
                        combinedOptionsSummary.push(opt);
                    }
                }
            }
            printItemsTotal = Math.round(printItemsTotal * 100) / 100;
            dynamicModifiersTotal = Math.round(dynamicModifiersTotal * 100) / 100;
            let artworkFee = 0;
            const artworkReq = product.artworkRequirement || 'OPTIONAL';
            const rawArtworkPrice = Number(product.artworkPrice) || 0;
            const hasAnyLineArtwork = normalizedLines.some((l) => Boolean(l.artworkUrl));
            if (artworkReq === 'REQUIRED') {
                artworkFee = rawArtworkPrice;
            }
            else if (artworkReq === 'OPTIONAL' && (dto.hasArtwork || hasAnyLineArtwork)) {
                artworkFee = rawArtworkPrice;
            }
            let designServiceFee = 0;
            const designReq = product.designServiceRequirement || 'DISABLED';
            const rawDesignPrice = Number(product.designServiceFee ?? product.designServicePrice) || 0;
            const wantsDesign = this.checkDesignServiceRequested(userSelections, optionGroups, configurationRules, dto.hasDesignService, designReq);
            if (wantsDesign) {
                let resolvedFromRule = false;
                for (const rule of configurationRules) {
                    if (!rule.isActive)
                        continue;
                    const isArtRule = rule.actionType === 'ARTWORK_CONDITIONS' ||
                        rule.actionType === 'CONFIGURE_ARTWORK' ||
                        rule.actionType === 'REQUIRE_ARTWORK_FILES';
                    if (isArtRule && matchesRuleCondition(rule, userSelections)) {
                        const payload = rule.actionPayload || {};
                        if (payload.designFee !== undefined && payload.designFeeEnabled !== false) {
                            const feeNum = Number(payload.designFee);
                            if (feeNum < 0) {
                                throw new common_1.BadRequestException('Configured design service amount cannot be negative.');
                            }
                            designServiceFee = feeNum;
                            resolvedFromRule = true;
                            break;
                        }
                    }
                }
                if (!resolvedFromRule) {
                    if (rawDesignPrice < 0) {
                        throw new common_1.BadRequestException('Configured design service amount cannot be negative.');
                    }
                    designServiceFee = rawDesignPrice > 0 ? rawDesignPrice : 150;
                }
            }
            const refReq = product.referenceImageRequirement || 'DISABLED';
            const appliedCharges = [];
            const activeChargeMap = new Map();
            for (const rule of configurationRules) {
                if (rule.isActive === false)
                    continue;
                const conditionMet = matchesRuleCondition(rule, userSelections);
                if (conditionMet && (rule.actionType === 'APPLY_CHARGE' || rule.actionType === 'ADD_CHARGE')) {
                    const payload = rule.actionPayload || {};
                    const chargeId = payload.chargeId || `charge-${rule.id}`;
                    const chargeName = payload.name || rule.name || '';
                    if (designServiceFee > 0 && (/design/i.test(chargeId) || /design/i.test(chargeName))) {
                        continue;
                    }
                    const rawAmount = Number(payload.amount ?? payload.price ?? 0);
                    const calcType = payload.calculationType || 'FIXED';
                    let effectiveChargeAmount = 0;
                    if (calcType === 'PER_UNIT') {
                        effectiveChargeAmount = Math.round(rawAmount * totalVariantQuantity * 100) / 100;
                    }
                    else if (calcType === 'PERCENTAGE') {
                        effectiveChargeAmount = Math.round(printItemsTotal * (rawAmount / 100) * 100) / 100;
                    }
                    else {
                        effectiveChargeAmount = rawAmount;
                    }
                    activeChargeMap.set(chargeId, {
                        chargeId,
                        name: payload.name || rule.name,
                        amount: effectiveChargeAmount,
                        calculationType: calcType,
                        description: payload.description,
                    });
                }
                else if (conditionMet && (rule.actionType === 'REMOVE_CHARGE' || rule.actionType === 'WAIVE_CHARGE')) {
                    const payload = rule.actionPayload || {};
                    const chargeId = payload.chargeId || `charge-${rule.id}`;
                    activeChargeMap.delete(chargeId);
                }
            }
            let additionalChargesTotal = 0;
            for (const chg of activeChargeMap.values()) {
                appliedCharges.push(chg);
                additionalChargesTotal += chg.amount;
            }
            additionalChargesTotal = Math.round(additionalChargesTotal * 100) / 100;
            const subtotal = Math.round((printItemsTotal + artworkFee + designServiceFee + additionalChargesTotal) * 100) / 100;
            const deliveryMethod = dto.deliveryMethod || 'COURIER';
            const shippingBreakdown = await this.shippingCalculatorService.calculateShipping({
                productId: dto.productId,
                quantity: totalVariantQuantity,
                destinationPincode: dto.shippingPincode,
                orderSubtotal: subtotal,
                deliveryMethod: deliveryMethod === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'COURIER',
            });
            const shipTaxResult = await this.shippingGstService.calculateShippingAndTax(subtotal, dto.shippingPincode, deliveryMethod === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'COURIER', dto.isInterState || false);
            const estimatedShipping = dto.shippingPincode
                ? shippingBreakdown.finalShippingAmount
                : 0;
            const grandTotal = Math.round((subtotal + shipTaxResult.gstAmount + estimatedShipping) * 100) / 100;
            const avgUnitPrice = totalVariantQuantity > 0
                ? Math.round((printItemsTotal / totalVariantQuantity) * 100) / 100
                : 0;
            specificationsSnapshot['_artworkRequirement'] = {
                requirement: artworkReq,
                price: rawArtworkPrice,
                feeApplied: artworkFee,
            };
            specificationsSnapshot['_designServiceRequirement'] = {
                requirement: designReq,
                price: rawDesignPrice,
                feeApplied: designServiceFee,
            };
            specificationsSnapshot['variantLines'] = variantLinesQuote;
            return {
                isMultiVariant: true,
                totalVariantQuantity,
                variantLines: variantLinesQuote,
                startingReferenceRate: firstOrigBasePrice,
                referenceUnitPrice: firstRefUnitPrice,
                basePrice: firstRefUnitPrice > 0 ? firstRefUnitPrice : firstOrigBasePrice,
                originalBasePrice: firstOrigBasePrice,
                effectiveBasePrice: firstEffectiveBasePrice,
                quantity: totalVariantQuantity,
                baseSubtotal: printItemsTotal,
                optionsCost: dynamicModifiersTotal,
                dynamicModifiersTotal,
                discountAmount: 0,
                discountPercent: 0,
                artworkFee,
                designServiceFee,
                additionalChargesTotal,
                appliedCharges,
                artworkRequirement: artworkReq,
                designServiceRequirement: designReq,
                referenceImageRequirement: refReq,
                unitPrice: avgUnitPrice,
                subtotal,
                cgst: shipTaxResult.cgst,
                sgst: shipTaxResult.sgst,
                igst: shipTaxResult.igst,
                totalTax: shipTaxResult.gstAmount,
                courierCharge: shippingBreakdown.baseShippingCharge,
                freeShippingThreshold: shippingBreakdown.freeShippingThreshold,
                estimatedShipping,
                shipping: shippingBreakdown,
                matchedZone: shipTaxResult.matchedZone
                    ? {
                        ...shipTaxResult.matchedZone,
                        pincodePrefix: shipTaxResult.matchedZone.pincodePrefix || '',
                    }
                    : null,
                isFreeShippingApplied: shippingBreakdown.isFreeShippingApplied,
                gstRatePercent: shipTaxResult.gstRatePercent,
                allowCod: false,
                codSurcharge: 0,
                codCharge: 0,
                deliveryMethod,
                paymentMethod: dto.paymentMethod || 'FULL',
                grandTotal,
                productionDays: product.productionDays,
                appliedOffer: null,
                availableOffers: [],
                selectedOptionsSummary: combinedOptionsSummary,
                specificationsSnapshot,
            };
        }
        if (dto.quantity < product.minQuantity) {
            throw new common_1.BadRequestException(`Minimum quantity for ${product.name} is ${product.minQuantity}`);
        }
        if (dto.quantity > product.maxQuantity) {
            throw new common_1.BadRequestException(`Maximum quantity for ${product.name} is ${product.maxQuantity}`);
        }
        const singleResult = this.evaluateCombinationPricing(product, userSelections, dto.quantity, dto.quantity);
        const { startingReferenceRate, unitPrice, baseUnitPrice, optionsUnitModifier, selectedOptionsSummary, specificationsSnapshot, appliedOffer, availableOffers, referenceUnitPrice, originalBasePrice, bestMatchingRule, } = singleResult;
        let artworkFee = 0;
        const artworkReq = product.artworkRequirement || 'OPTIONAL';
        const rawArtworkPrice = Number(product.artworkPrice) || 0;
        if (artworkReq === 'REQUIRED') {
            artworkFee = rawArtworkPrice;
        }
        else if (artworkReq === 'OPTIONAL' && dto.hasArtwork) {
            artworkFee = rawArtworkPrice;
        }
        let designServiceFee = 0;
        const designReq = product.designServiceRequirement || 'DISABLED';
        const rawDesignPrice = Number(product.designServiceFee ?? product.designServicePrice) || 0;
        const wantsDesign = this.checkDesignServiceRequested(userSelections, optionGroups, configurationRules, dto.hasDesignService, designReq);
        if (userSelections['design_scope']) {
            const scopeGroup = optionGroups.find((g) => g.code === 'design_scope');
            if (scopeGroup && scopeGroup.options) {
                const validScope = scopeGroup.options.some((o) => normalizeKey(o.value || o.code) === normalizeKey(userSelections['design_scope']));
                if (!validScope) {
                    throw new common_1.BadRequestException(`Invalid design scope '${userSelections['design_scope']}' selected for this product.`);
                }
            }
        }
        const matrixIncludesDesign = Boolean(bestMatchingRule?.isSpecific &&
            bestMatchingRule.rule?.attributeCombination &&
            Object.keys(bestMatchingRule.rule.attributeCombination).some((k) => /design/i.test(k)));
        if (wantsDesign && !matrixIncludesDesign) {
            let resolvedFromRule = false;
            for (const rule of configurationRules) {
                if (!rule.isActive)
                    continue;
                const isArtRule = rule.actionType === 'ARTWORK_CONDITIONS' ||
                    rule.actionType === 'CONFIGURE_ARTWORK' ||
                    rule.actionType === 'REQUIRE_ARTWORK_FILES';
                if (isArtRule && matchesRuleCondition(rule, userSelections)) {
                    const payload = rule.actionPayload || {};
                    if (payload.designFee !== undefined && payload.designFeeEnabled !== false) {
                        const feeNum = Number(payload.designFee);
                        if (feeNum < 0) {
                            throw new common_1.BadRequestException('Configured design service amount cannot be negative.');
                        }
                        designServiceFee = feeNum;
                        resolvedFromRule = true;
                        break;
                    }
                }
            }
            if (!resolvedFromRule) {
                let detectedScope = normalizeKey(userSelections['design_scope']);
                if (!detectedScope) {
                    const loc = normalizeKey(userSelections['print_location'] ||
                        userSelections['printing_location'] ||
                        userSelections['printing_side'] ||
                        userSelections['location']);
                    if (loc.includes('both') || loc.includes('2') || loc.includes('double') || loc.includes('full')) {
                        detectedScope = 'full';
                    }
                    else if (loc.includes('back')) {
                        detectedScope = 'back';
                    }
                    else if (loc.includes('front')) {
                        detectedScope = 'front';
                    }
                }
                for (const rule of configurationRules) {
                    if (!rule.isActive)
                        continue;
                    const payload = rule.actionPayload || {};
                    const ruleScope = normalizeKey(payload.designScope || rule.conditionOptionValue);
                    if (detectedScope && ruleScope === detectedScope) {
                        const feeVal = payload.designFee ?? payload.amount;
                        if (feeVal !== undefined && feeVal !== null) {
                            const feeNum = Number(feeVal);
                            if (feeNum < 0) {
                                throw new common_1.BadRequestException('Configured design service amount cannot be negative.');
                            }
                            designServiceFee = feeNum;
                            resolvedFromRule = true;
                            break;
                        }
                    }
                }
            }
            if (!resolvedFromRule) {
                if (rawDesignPrice < 0) {
                    throw new common_1.BadRequestException('Configured design service amount cannot be negative.');
                }
                designServiceFee = rawDesignPrice > 0 ? rawDesignPrice : 150;
            }
        }
        else {
            designServiceFee = 0;
        }
        const refReq = product.referenceImageRequirement || 'DISABLED';
        const baseSubtotal = referenceUnitPrice > 0
            ? Math.round(referenceUnitPrice * dto.quantity * 100) / 100
            : Math.round(baseUnitPrice * dto.quantity * 100) / 100;
        const dynamicModifiersTotal = Math.round(optionsUnitModifier * dto.quantity * 100) / 100;
        const discountAmount = appliedOffer ? appliedOffer.savingsAmount : 0;
        const discountPercent = appliedOffer ? appliedOffer.discountPercent : 0;
        const appliedCharges = [];
        const activeChargeMap = new Map();
        for (const rule of configurationRules) {
            if (rule.isActive === false)
                continue;
            const conditionMet = matchesRuleCondition(rule, userSelections);
            if (conditionMet && (rule.actionType === 'APPLY_CHARGE' || rule.actionType === 'ADD_CHARGE')) {
                const payload = rule.actionPayload || {};
                const chargeId = payload.chargeId || `charge-${rule.id}`;
                const chargeName = payload.name || rule.name || '';
                if (designServiceFee > 0 && (/design/i.test(chargeId) || /design/i.test(chargeName))) {
                    continue;
                }
                const rawAmount = Number(payload.amount ?? payload.price ?? 0);
                const calcType = payload.calculationType || 'FIXED';
                let effectiveChargeAmount = 0;
                if (calcType === 'PER_UNIT') {
                    effectiveChargeAmount = Math.round(rawAmount * dto.quantity * 100) / 100;
                }
                else if (calcType === 'PERCENTAGE') {
                    effectiveChargeAmount = Math.round(baseSubtotal * (rawAmount / 100) * 100) / 100;
                }
                else {
                    effectiveChargeAmount = rawAmount;
                }
                activeChargeMap.set(chargeId, {
                    chargeId,
                    name: payload.name || rule.name,
                    amount: effectiveChargeAmount,
                    calculationType: calcType,
                    description: payload.description,
                });
            }
            else if (conditionMet && (rule.actionType === 'REMOVE_CHARGE' || rule.actionType === 'WAIVE_CHARGE')) {
                const payload = rule.actionPayload || {};
                const chargeId = payload.chargeId || `charge-${rule.id}`;
                activeChargeMap.delete(chargeId);
            }
        }
        let additionalChargesTotal = 0;
        for (const chg of activeChargeMap.values()) {
            appliedCharges.push(chg);
            additionalChargesTotal += chg.amount;
        }
        additionalChargesTotal = Math.round(additionalChargesTotal * 100) / 100;
        const printItemsTotal = Math.round(unitPrice * dto.quantity * 100) / 100;
        const subtotal = Math.round((printItemsTotal + artworkFee + designServiceFee + additionalChargesTotal) * 100) / 100;
        const deliveryMethod = dto.deliveryMethod || 'COURIER';
        const shippingBreakdown = await this.shippingCalculatorService.calculateShipping({
            productId: dto.productId,
            quantity: dto.quantity,
            destinationPincode: dto.shippingPincode,
            orderSubtotal: subtotal,
            deliveryMethod: deliveryMethod === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'COURIER',
        });
        const shipTaxResult = await this.shippingGstService.calculateShippingAndTax(subtotal, dto.shippingPincode, deliveryMethod === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'COURIER', dto.isInterState || false);
        const cgst = shipTaxResult.cgst;
        const sgst = shipTaxResult.sgst;
        const igst = shipTaxResult.igst;
        const totalTax = shipTaxResult.gstAmount;
        const estimatedShipping = dto.shippingPincode
            ? shippingBreakdown.finalShippingAmount
            : 0;
        const courierRate = shippingBreakdown.baseShippingCharge;
        const freeShippingThreshold = shippingBreakdown.freeShippingThreshold;
        const allowCod = false;
        const codSurcharge = 0;
        const codCharge = 0;
        const paymentMethod = dto.paymentMethod || 'FULL';
        const grandTotal = Math.round((subtotal + totalTax + estimatedShipping) * 100) / 100;
        specificationsSnapshot['_artworkRequirement'] = {
            requirement: artworkReq,
            price: rawArtworkPrice,
            feeApplied: artworkFee,
            qualityVerification: product.artworkQualityVerification,
            minimumMegapixels: product.minimumArtworkMegapixels,
        };
        specificationsSnapshot['_referenceImageRequirement'] = {
            requirement: refReq,
        };
        specificationsSnapshot['_designServiceRequirement'] = {
            requirement: designReq,
            price: rawDesignPrice,
            feeApplied: designServiceFee,
        };
        specificationsSnapshot['_fulfillment'] = {
            deliveryMethod,
            courierCharge: courierRate,
            freeShippingThreshold,
            shippingApplied: estimatedShipping,
            paymentMethod,
            allowCod,
            codSurcharge,
            codChargeApplied: codCharge,
        };
        if (appliedOffer) {
            specificationsSnapshot['_appliedOffer'] = appliedOffer;
        }
        if (appliedCharges.length > 0) {
            specificationsSnapshot['_appliedCharges'] = appliedCharges;
        }
        return {
            startingReferenceRate,
            referenceUnitPrice,
            basePrice: referenceUnitPrice > 0 ? referenceUnitPrice : originalBasePrice,
            originalBasePrice,
            effectiveBasePrice: baseUnitPrice,
            quantity: dto.quantity,
            baseSubtotal,
            optionsCost: dynamicModifiersTotal,
            dynamicModifiersTotal,
            discountAmount,
            discountPercent,
            artworkFee,
            designServiceFee,
            additionalChargesTotal,
            appliedCharges,
            artworkRequirement: artworkReq,
            designServiceRequirement: designReq,
            referenceImageRequirement: refReq,
            unitPrice,
            subtotal,
            cgst,
            sgst,
            igst,
            totalTax,
            courierCharge: courierRate,
            freeShippingThreshold,
            estimatedShipping,
            shipping: shippingBreakdown,
            matchedZone: shipTaxResult.matchedZone
                ? {
                    ...shipTaxResult.matchedZone,
                    pincodePrefix: shipTaxResult.matchedZone.pincodePrefix || '',
                }
                : null,
            isFreeShippingApplied: shippingBreakdown.isFreeShippingApplied,
            gstRatePercent: shipTaxResult.gstRatePercent,
            allowCod,
            codSurcharge,
            codCharge,
            deliveryMethod,
            paymentMethod,
            grandTotal,
            productionDays: product.productionDays,
            appliedOffer,
            availableOffers,
            selectedOptionsSummary,
            specificationsSnapshot,
        };
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shipping_gst_service_1.ShippingGstService,
        shipping_calculator_service_1.ShippingCalculatorService])
], PricingService);
//# sourceMappingURL=pricing.service.js.map