/**
 * PRINT BAZAAR 2.0 — Shared Artwork Rule Resolver & Conflict Validator
 * 
 * Provides deterministic artwork slot, design brief, and reference file resolution
 * across Admin Product Setup Studio, Live Preview, Storefront Configurator, and Validation.
 */

import { ProductConfigurationRule, ProductOptionGroup, ProductOptionRequirement } from './api';

export interface ArtworkSlotConfig {
  slotKey: string;
  label: string;
  minMegapixels: number;
  isRequired: boolean;
  isCustomerSupplied?: boolean;
}

export interface ResolvedArtworkCondition {
  artworkStatus: ProductOptionRequirement; // REQUIRED | OPTIONAL | DISABLED
  slots: ArtworkSlotConfig[];
  requireDesignBrief: boolean;
  showDesignBrief: boolean;
  requireReferenceImage: boolean;
  showReferenceImage: boolean;
  maxArtworkFileSizeMb: number;
  minimumArtworkMegapixels: number;
  allowedFormats: string[];
  matchedRuleName?: string;
  isCombinationRule: boolean;
  designFee?: number;
  designScope?: string;
  designServiceRequirement?: ProductOptionRequirement;
}

export interface ArtworkConditionConflict {
  ruleId?: string;
  ruleName: string;
  type:
    | 'ORPHAN_GROUP'
    | 'ORPHAN_OPTION'
    | 'CONTRADICTORY_SLOTS'
    | 'MISSING_SLOTS'
    | 'UNSATISFIABLE'
    | 'NEGATIVE_DESIGN_AMOUNT'
    | 'MISSING_REQUIRED_DESIGN_PRICE'
    | 'INVALID_DESIGN_SCOPE'
    | 'INCONSISTENT_DESIGN_SLOTS';
  message: string;
  groupCode?: string;
  optionValue?: string;
  slotKey?: string;
}

export interface ResolverDefaultSettings {
  artworkRequirement?: ProductOptionRequirement;
  maxArtworkFileSizeMb?: number;
  minimumArtworkMegapixels?: number;
  artworkFileFormats?: string[];
  designServiceRequirement?: ProductOptionRequirement;
  designServiceFee?: number | string;
  designServicePrice?: number | string;
}

const DEFAULT_FORMATS = ['PDF', 'AI', 'PSD', 'CDR', 'TIFF', 'PNG', 'JPG'];

/**
 * Normalizes an option code / value string for reliable matching
 */
export function normalizeKey(str: string | undefined | null): string {
  if (!str) return '';
  return String(str).toLowerCase().trim().replace(/[\s-]+/g, '_');
}

/**
 * Checks whether a rule condition matches the currently selected option values.
 * Supports both:
 * 1. Multi-group combination rules: rule.actionPayload.conditionCombination = { [groupCode]: optionValue }
 * 2. Single-group rules: rule.conditionGroupCode & rule.conditionOptionValue
 */
export function matchesRuleCondition(
  rule: ProductConfigurationRule,
  selectedOptions: Record<string, any>
): boolean {
  if (!rule.isActive) return false;

  const payload = (rule.actionPayload as any) || {};

  // Case 1: Multi-group combination condition
  if (payload.conditionCombination && typeof payload.conditionCombination === 'object') {
    const combo = payload.conditionCombination;
    const entries = Object.entries(combo);
    if (entries.length === 0) return false;

    return entries.every(([grpCode, optVal]) => {
      const userVal = selectedOptions[grpCode];
      if (userVal === undefined || userVal === null) return false;
      return normalizeKey(userVal) === normalizeKey(optVal as string);
    });
  }

  // Case 2: Single-group condition
  const userVal = selectedOptions[rule.conditionGroupCode];
  if (userVal === undefined || userVal === null) return false;

  const normUser = normalizeKey(userVal);
  const normRule = normalizeKey(rule.conditionOptionValue);

  if (rule.conditionOperator === 'EQUALS') {
    return normUser === normRule;
  }
  if (rule.conditionOperator === 'NOT_EQUALS') {
    return normUser !== normRule;
  }
  if (rule.conditionOperator === 'IN') {
    const list = Array.isArray(rule.conditionOptionValue)
      ? rule.conditionOptionValue.map((v) => normalizeKey(String(v)))
      : String(rule.conditionOptionValue)
          .split(',')
          .map((s) => normalizeKey(s));
    return list.includes(normUser);
  }

  return normUser === normRule;
}

/**
 * Resolves artwork configuration for given selections based on configured rules.
 */
export function resolveArtworkConditions(
  rules: ProductConfigurationRule[] = [],
  selectedOptions: Record<string, any> = {},
  defaults: ResolverDefaultSettings = {},
  availableOptionGroups: ProductOptionGroup[] = []
): ResolvedArtworkCondition {
  const baseStatus = defaults.artworkRequirement || 'OPTIONAL';
  const baseMinMP = Number(defaults.minimumArtworkMegapixels) || 1.5;
  const baseMaxMB = Number(defaults.maxArtworkFileSizeMb) || 50;
  const baseFormats = defaults.artworkFileFormats && defaults.artworkFileFormats.length > 0
    ? defaults.artworkFileFormats
    : DEFAULT_FORMATS;

  // Find all configured artwork rules on the product
  const configuredArtworkRules = rules.filter(
    (r) =>
      r.isActive &&
      (r.actionType === 'REQUIRE_ARTWORK_FILES' ||
        r.actionType === 'CONFIGURE_ARTWORK' ||
        r.actionType === 'ARTWORK_CONDITIONS')
  );

  const matchingArtworkRules = configuredArtworkRules.filter((rule) =>
    matchesRuleCondition(rule, selectedOptions)
  );

  // Case 1: Product has configured artwork rules in Step 4
  if (configuredArtworkRules.length > 0) {
    if (matchingArtworkRules.length > 0) {
      // Prioritize multi-group combination rules over single-group rules
      matchingArtworkRules.sort((a, b) => {
        const aCombo = (a.actionPayload as any)?.conditionCombination;
        const bCombo = (b.actionPayload as any)?.conditionCombination;
        const aCount = aCombo && typeof aCombo === 'object' ? Object.keys(aCombo).length : 1;
        const bCount = bCombo && typeof bCombo === 'object' ? Object.keys(bCombo).length : 1;
        return bCount - aCount;
      });

      const bestRule = matchingArtworkRules[0];
      const p = (bestRule.actionPayload as any) || {};
      const status: ProductOptionRequirement = p.artworkStatus || 'REQUIRED';
      const slotCount = Number(p.slotCount) || (Array.isArray(p.slotLabels) ? p.slotLabels.length : 1);
      const rawLabels: string[] = Array.isArray(p.slotLabels)
        ? p.slotLabels
        : String(p.slotLabels || '').split(',').map((s) => s.trim()).filter(Boolean);

      const labels = rawLabels.length > 0
        ? rawLabels
        : slotCount === 2
        ? ['Front Side', 'Back Side']
        : slotCount === 1
        ? ['Front Side']
        : Array.from({ length: slotCount }, (_, i) => `Artwork File ${i + 1}`);

      const slots: ArtworkSlotConfig[] = [];
      if (status !== 'DISABLED') {
        for (let i = 0; i < slotCount; i++) {
          const lbl = labels[i] || `Artwork File ${i + 1}`;
          const key = `slot_${i + 1}_${normalizeKey(lbl)}`;
          const isHidden = Array.isArray(p.hiddenSlots) && p.hiddenSlots.includes(key);
          if (isHidden) continue;

          const isRequiredSlot =
            status === 'REQUIRED' &&
            (!Array.isArray(p.optionalSlots) || !p.optionalSlots.includes(key));

          slots.push({
            slotKey: key,
            label: lbl,
            minMegapixels: Number(p.minMegapixels) || baseMinMP,
            isRequired: isRequiredSlot,
            isCustomerSupplied: p.customerSuppliedSides ? p.customerSuppliedSides.includes(lbl) : true,
          });
        }
      }

      return {
        artworkStatus: status,
        slots,
        requireDesignBrief: Boolean(p.requireDesignBrief || p.designServicePolicy === 'REQUIRE_BRIEF'),
        showDesignBrief: p.showDesignBrief !== false && (p.requireDesignBrief || p.designServicePolicy === 'REQUIRE_BRIEF'),
        requireReferenceImage: Boolean(p.requireReferenceImage),
        showReferenceImage: p.showReferenceImage !== false,
        maxArtworkFileSizeMb: Number(p.maxFileSizeMb) || baseMaxMB,
        minimumArtworkMegapixels: Number(p.minMegapixels) || baseMinMP,
        allowedFormats: Array.isArray(p.acceptedFormats)
          ? p.acceptedFormats
          : typeof p.acceptedFormats === 'string'
          ? p.acceptedFormats.split(',').map((s: string) => s.trim()).filter(Boolean)
          : baseFormats,
        matchedRuleName: bestRule.name,
        isCombinationRule: Boolean(p.conditionCombination),
        designFee: p.designFee !== undefined ? Number(p.designFee) : (p.designFeeEnabled ? (Number(defaults.designServiceFee) || 150) : undefined),
        designScope: p.designScope || undefined,
        designServiceRequirement:
          p.designFeeEnabled === true || (p.designFee !== undefined && Number(p.designFee) > 0) || p.requireDesignBrief === true
            ? 'REQUIRED'
            : (defaults.designServiceRequirement || 'DISABLED'),
      };
    }

    // Rules exist for this product, but none match this customer's selected groups/options:
    // Therefore artwork/design is NOT applicable for this configuration!
    return {
      artworkStatus: 'DISABLED',
      slots: [],
      requireDesignBrief: false,
      showDesignBrief: false,
      requireReferenceImage: false,
      showReferenceImage: false,
      maxArtworkFileSizeMb: baseMaxMB,
      minimumArtworkMegapixels: baseMinMP,
      allowedFormats: baseFormats,
      isCombinationRule: false,
      designFee: undefined,
      designServiceRequirement: 'DISABLED',
    };
  }

  // Case 2: Product has ZERO custom artwork rules configured in Step 4.
  // Evaluate strictly based on option groups selected by customer.
  let isArtworkOrDesignGroupSelected = false;
  let isDesignSelected = false;
  let detectedCount = 0;
  let detectedLabels: string[] = [];

  for (const grp of availableOptionGroups) {
    const val = selectedOptions[grp.code] ?? selectedOptions[grp.id];
    if (val === undefined || val === null || val === '') continue;
    const opt = grp.options?.find((o) => normalizeKey(o.value) === normalizeKey(val));
    const valStr = String(val).toLowerCase();
    const lblStr = String(opt?.label || '').toLowerCase();
    const grpCodeStr = String(grp.code).toLowerCase();
    const grpNameStr = String(grp.name).toLowerCase();
    const isSidesOrDesignGroup =
      grpCodeStr.includes('side') ||
      grpCodeStr.includes('print') ||
      grpCodeStr.includes('design') ||
      grpCodeStr.includes('upload') ||
      grpCodeStr.includes('artwork') ||
      grpCodeStr.includes('location') ||
      grpNameStr.includes('side') ||
      grpNameStr.includes('print') ||
      grpNameStr.includes('design') ||
      grpNameStr.includes('upload') ||
      grpNameStr.includes('artwork') ||
      grpNameStr.includes('location');

    if (opt && opt.fileCount && opt.fileCount > 0) {
      detectedCount = opt.fileCount;
      isArtworkOrDesignGroupSelected = true;
      if (opt.fileSlotLabels && opt.fileSlotLabels.length > 0) {
        detectedLabels = opt.fileSlotLabels;
      } else if (detectedCount === 2) {
        detectedLabels = ['Front Side', 'Back Side'];
      } else if (detectedCount === 1) {
        detectedLabels = ['Front Side'];
      } else {
        detectedLabels = Array.from({ length: detectedCount }, (_, i) => `Artwork File ${i + 1}`);
      }
      break;
    }

    if (isSidesOrDesignGroup) {
      isArtworkOrDesignGroupSelected = true;
      if (
        valStr.includes('both') ||
        valStr.includes('double') ||
        valStr.includes('front_and_back') ||
        valStr.includes('front_back') ||
        valStr.includes('2_side') ||
        valStr.includes('2_design') ||
        valStr === '2' ||
        lblStr.includes('both') ||
        lblStr.includes('double') ||
        lblStr.includes('front & back') ||
        lblStr.includes('front and back') ||
        lblStr.includes('2 side') ||
        lblStr.includes('2 design')
      ) {
        detectedCount = 2;
        detectedLabels = ['Front Side', 'Back Side'];
        break;
      } else if (
        valStr.includes('front') ||
        valStr.includes('single') ||
        valStr.includes('1_side') ||
        valStr.includes('1_design') ||
        valStr === '1' ||
        lblStr.includes('front') ||
        lblStr.includes('single') ||
        lblStr.includes('1 side') ||
        lblStr.includes('1 design')
      ) {
        detectedCount = 1;
        detectedLabels = ['Front Side'];
        break;
      } else if (valStr.includes('back') || lblStr.includes('back')) {
        detectedCount = 1;
        detectedLabels = ['Back Side'];
        break;
      } else if (valStr.includes('3') || lblStr.includes('3')) {
        detectedCount = 3;
        detectedLabels = ['Artwork File 1', 'Artwork File 2', 'Artwork File 3'];
        break;
      } else if (valStr.includes('4') || lblStr.includes('4')) {
        detectedCount = 4;
        detectedLabels = ['Artwork File 1', 'Artwork File 2', 'Artwork File 3', 'Artwork File 4'];
        break;
      } else if (
        valStr.includes('upload') ||
        valStr.includes('own_file') ||
        lblStr.includes('upload') ||
        lblStr.includes('own artwork') ||
        lblStr.includes('customer supplied')
      ) {
        detectedCount = 1;
        detectedLabels = ['Artwork File'];
        break;
      }
    }
  }

  // Check if customer selected design service
  for (const [key, val] of Object.entries(selectedOptions || {})) {
    if (val === undefined || val === null) continue;
    const normKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      normKey.includes('design') ||
      normKey.includes('artworkservice') ||
      normKey.includes('hireservice') ||
      normKey.includes('designer')
    ) {
      const strVal = String(val).toLowerCase().trim();
      if (
        strVal === 'yes' ||
        strVal === 'true' ||
        strVal === 'required' ||
        strVal.includes('hire') ||
        strVal.includes('assist') ||
        strVal.includes('need') ||
        strVal.includes('yes_please')
      ) {
        isDesignSelected = true;
        isArtworkOrDesignGroupSelected = true;
        break;
      }
    }
  }

  const isExplicitlyMandated =
    defaults.artworkRequirement === 'REQUIRED' || defaults.designServiceRequirement === 'REQUIRED';

  // If customer did NOT select any artwork/sides/design option group, and product doesn't mandate it:
  if (!isArtworkOrDesignGroupSelected && !isDesignSelected && !isExplicitlyMandated) {
    return {
      artworkStatus: 'DISABLED',
      slots: [],
      requireDesignBrief: false,
      showDesignBrief: false,
      requireReferenceImage: false,
      showReferenceImage: false,
      maxArtworkFileSizeMb: baseMaxMB,
      minimumArtworkMegapixels: baseMinMP,
      allowedFormats: baseFormats,
      isCombinationRule: false,
      designFee: undefined,
      designServiceRequirement: 'DISABLED',
    };
  }

  const heuristicSlots: ArtworkSlotConfig[] = [];
  const effectiveSlotCount = detectedCount > 0 ? detectedCount : (defaults.artworkRequirement === 'REQUIRED' ? 1 : 0);
  for (let i = 0; i < effectiveSlotCount; i++) {
    const lbl = detectedLabels[i] || `Artwork File ${i + 1}`;
    heuristicSlots.push({
      slotKey: `slot_${i + 1}_${normalizeKey(lbl)}`,
      label: lbl,
      minMegapixels: baseMinMP,
      isRequired: defaults.artworkRequirement === 'REQUIRED',
      isCustomerSupplied: true,
    });
  }

  const globalDesignFee = Number(defaults.designServiceFee) > 0 ? Number(defaults.designServiceFee) : 150;

  return {
    artworkStatus: isDesignSelected ? 'OPTIONAL' : (effectiveSlotCount > 0 ? (defaults.artworkRequirement || 'REQUIRED') : 'DISABLED'),
    slots: heuristicSlots,
    requireDesignBrief: isDesignSelected || defaults.designServiceRequirement === 'REQUIRED',
    showDesignBrief: isDesignSelected || defaults.designServiceRequirement === 'REQUIRED',
    requireReferenceImage: false,
    showReferenceImage: isArtworkOrDesignGroupSelected,
    maxArtworkFileSizeMb: baseMaxMB,
    minimumArtworkMegapixels: baseMinMP,
    allowedFormats: baseFormats,
    isCombinationRule: false,
    designFee: isDesignSelected ? globalDesignFee : undefined,
    designServiceRequirement: isDesignSelected ? 'REQUIRED' : (defaults.designServiceRequirement === 'REQUIRED' ? 'REQUIRED' : 'DISABLED'),
  };
}

/**
 * Validates all artwork rules for conflicts, orphan references, or impossible requirements.
 */
export function validateArtworkConditions(
  rules: ProductConfigurationRule[],
  optionGroups: ProductOptionGroup[]
): { errors: ArtworkConditionConflict[]; warnings: ArtworkConditionConflict[] } {
  const errors: ArtworkConditionConflict[] = [];
  const warnings: ArtworkConditionConflict[] = [];

  const groupMap = new Map<string, Set<string>>();
  for (const g of optionGroups) {
    const valSet = new Set<string>();
    for (const opt of g.options) {
      valSet.add(normalizeKey(opt.value));
    }
    groupMap.set(g.code, valSet);
  }

  const combinationSignatures = new Set<string>();

  for (const rule of rules) {
    if (!rule.isActive) continue;
    const isArtworkRule =
      rule.actionType === 'REQUIRE_ARTWORK_FILES' ||
      rule.actionType === 'CONFIGURE_ARTWORK' ||
      rule.actionType === 'ARTWORK_CONDITIONS';

    if (!isArtworkRule) continue;

    const payload = (rule.actionPayload as any) || {};

    // Check multi-group combination references
    if (payload.conditionCombination && typeof payload.conditionCombination === 'object') {
      const combo = payload.conditionCombination;
      const sortedKeys = Object.keys(combo).sort();
      const sig = sortedKeys.map((k) => `${k}=${combo[k]}`).join('&');

      if (combinationSignatures.has(sig)) {
        errors.push({
          ruleId: rule.id,
          ruleName: rule.name,
          type: 'CONTRADICTORY_SLOTS',
          message: `Duplicate artwork condition detected for combination [${sig}]. Multiple conflicting rules cannot target the same combination.`,
        });
      }
      combinationSignatures.add(sig);

      for (const [grpCode, optVal] of Object.entries(combo)) {
        if (!groupMap.has(grpCode)) {
          errors.push({
            ruleId: rule.id,
            ruleName: rule.name,
            type: 'ORPHAN_GROUP',
            groupCode: grpCode,
            message: `Artwork rule "${rule.name}" references non-existent option group "${grpCode}".`,
          });
        } else {
          const validVals = groupMap.get(grpCode)!;
          if (!validVals.has(normalizeKey(optVal as string))) {
            errors.push({
              ruleId: rule.id,
              ruleName: rule.name,
              type: 'ORPHAN_OPTION',
              groupCode: grpCode,
              optionValue: String(optVal),
              message: `Artwork rule "${rule.name}" references deleted or invalid option choice "${optVal}" in group "${grpCode}".`,
            });
          }
        }
      }
    } else {
      // Check single group reference
      if (!groupMap.has(rule.conditionGroupCode)) {
        errors.push({
          ruleId: rule.id,
          ruleName: rule.name,
          type: 'ORPHAN_GROUP',
          groupCode: rule.conditionGroupCode,
          message: `Artwork rule "${rule.name}" references non-existent option group "${rule.conditionGroupCode}".`,
        });
      } else {
        const validVals = groupMap.get(rule.conditionGroupCode)!;
        const list = Array.isArray(rule.conditionOptionValue)
          ? rule.conditionOptionValue.map((v) => normalizeKey(String(v)))
          : String(rule.conditionOptionValue)
              .split(',')
              .map((s) => normalizeKey(s));

        for (const v of list) {
          if (!validVals.has(v)) {
            errors.push({
              ruleId: rule.id,
              ruleName: rule.name,
              type: 'ORPHAN_OPTION',
              groupCode: rule.conditionGroupCode,
              optionValue: v,
              message: `Artwork rule "${rule.name}" references non-existent option value "${v}" in group "${rule.conditionGroupCode}".`,
            });
          }
        }
      }
    }

    // Check slot contradictions (e.g. slot simultaneously required and hidden)
    const requiredSlots: string[] = Array.isArray(payload.requiredSlots) ? payload.requiredSlots : [];
    const hiddenSlots: string[] = Array.isArray(payload.hiddenSlots) ? payload.hiddenSlots : [];
    const overlap = requiredSlots.filter((s) => hiddenSlots.includes(s));
    if (overlap.length > 0) {
      errors.push({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'CONTRADICTORY_SLOTS',
        message: `Rule "${rule.name}" marks slot(s) [${overlap.join(', ')}] as simultaneously REQUIRED and HIDDEN.`,
      });
    }

    // Check if artwork is marked REQUIRED but 0 slots configured
    if (payload.artworkStatus === 'REQUIRED') {
      const slotCount = Number(payload.slotCount) || (Array.isArray(payload.slotLabels) ? payload.slotLabels.length : 1);
      if (slotCount <= 0 && !payload.requireDesignBrief) {
        errors.push({
          ruleId: rule.id,
          ruleName: rule.name,
          type: 'MISSING_SLOTS',
          message: `Rule "${rule.name}" requires artwork upload but specifies 0 upload slots.`,
        });
      }
    }

    // Check non-negative design amounts
    if (payload.designFee !== undefined && payload.designFee !== null) {
      const feeNum = Number(payload.designFee);
      if (isNaN(feeNum) || feeNum < 0) {
        errors.push({
          ruleId: rule.id,
          ruleName: rule.name,
          type: 'NEGATIVE_DESIGN_AMOUNT',
          message: `Rule "${rule.name}" configures a negative or invalid design service amount (₹${payload.designFee}). Amounts must be non-negative.`,
        });
      }
    }

    // Check design scope references if explicitly declared
    if (payload.designScope) {
      const scopeVal = normalizeKey(payload.designScope);
      const isKnownStandardScope = ['front', 'back', 'full', 'both'].includes(scopeVal);
      let foundInOptions = false;

      for (const [_, valSet] of groupMap.entries()) {
        if (valSet.has(scopeVal)) {
          foundInOptions = true;
          break;
        }
      }

      if (!isKnownStandardScope && !foundInOptions) {
        errors.push({
          ruleId: rule.id,
          ruleName: rule.name,
          type: 'INVALID_DESIGN_SCOPE',
          message: `Rule "${rule.name}" references unknown design scope "${payload.designScope}".`,
        });
      }
    }

    // Check slot consistency with design scope
    if (payload.designScope === 'full' || payload.designScope === 'both') {
      if (payload.artworkStatus === 'REQUIRED' && (payload.slotCount > 0 || (payload.slotLabels && payload.slotLabels.length > 0))) {
        warnings.push({
          ruleId: rule.id,
          ruleName: rule.name,
          type: 'INCONSISTENT_DESIGN_SLOTS',
          message: `Rule "${rule.name}" configures Full / Both Sides PB Design but still marks customer production artwork files as REQUIRED.`,
        });
      }
    }
  }

  return { errors, warnings };
}
