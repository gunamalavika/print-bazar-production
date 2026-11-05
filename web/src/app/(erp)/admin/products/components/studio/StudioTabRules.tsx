'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  RiAddLine,
  RiDeleteBin7Line,
  RiFileCopyLine,
  RiSparklingFill,
  RiCheckLine,
  RiErrorWarningLine,
  RiArrowRightLine,
  RiInformationLine,
  RiEditLine,
  RiUploadCloud2Line,
  RiCheckboxCircleLine,
  RiPriceTag3Line,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
  RiForbidLine,
  RiFlashlightLine,
  RiAlertLine,
  RiStopCircleLine,
  RiDiscountPercentLine,
  RiFlaskLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCloseLine,
  RiSearch2Line,
  RiCheckDoubleLine,
  RiShieldCheckLine,
} from 'react-icons/ri';
import { ProductConfigurationRule, ProductOptionGroup } from '@/lib/api';
import { Modal } from '@/components/ui';
import { evaluateProductConfiguration } from '@/lib/product-rules-engine';
import { StudioTab } from './StudioTabReview';

export interface StudioTabRulesProps {
  rules: ProductConfigurationRule[];
  setRules: React.Dispatch<React.SetStateAction<ProductConfigurationRule[]>>;
  optionGroups: ProductOptionGroup[];
  onNavigateToTab?: (tab: StudioTab) => void;
  onChange?: () => void;
}

// ---------------------------------------------------------------------------
// 1. ACTION PRESETS DEFINITION (Human-friendly labels, zero raw tech jargon)
// ---------------------------------------------------------------------------

export interface ActionPreset {
  id: string;
  label: string;
  shortBadge: string;
  tagline: string;
  description: string;
  category: 'OPTIONS' | 'VISIBILITY' | 'VALIDATION' | 'PRICING' | 'ARTWORK';
  color: 'purple' | 'slate' | 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo';
  icon: React.ComponentType<{ className?: string }>;
  needsTargetGroup: boolean;
  needsTargetOption: boolean;
}

export const ACTION_PRESETS: ActionPreset[] = [
  {
    id: 'RESTRICT_OPTIONS',
    label: 'Restrict Available Choices',
    shortBadge: 'Whitelist Choices',
    tagline: 'Limit selectable choices in another group',
    description: 'Only allow specific choices in a downstream option group and automatically disable the rest (e.g. When Material is Cotton, allow only White, Black, Red).',
    category: 'OPTIONS',
    color: 'purple',
    icon: RiLockLine,
    needsTargetGroup: true,
    needsTargetOption: false,
  },
  {
    id: 'HIDE',
    label: 'Hide Option Group or Choice',
    shortBadge: 'Hide Options',
    tagline: 'Completely conceal from customer',
    description: 'Remove an entire option group or a specific choice from the customer view so they do not see it at all.',
    category: 'VISIBILITY',
    color: 'slate',
    icon: RiEyeOffLine,
    needsTargetGroup: true,
    needsTargetOption: false,
  },
  {
    id: 'SHOW',
    label: 'Show Option Group or Choice',
    shortBadge: 'Show Options',
    tagline: 'Make visible when condition is met',
    description: 'Explicitly reveal an option group or choice that is otherwise hidden.',
    category: 'VISIBILITY',
    color: 'emerald',
    icon: RiEyeLine,
    needsTargetGroup: true,
    needsTargetOption: false,
  },
  {
    id: 'DISABLE',
    label: 'Disable Choice with Explanation',
    shortBadge: 'Disable Choice',
    tagline: 'Keep visible but greyed out',
    description: 'Keep the choice visible to the customer so they know it exists, but disable it with an informative tooltip explanation.',
    category: 'OPTIONS',
    color: 'amber',
    icon: RiForbidLine,
    needsTargetGroup: true,
    needsTargetOption: true,
  },
  {
    id: 'ENABLE',
    label: 'Re-enable Choice',
    shortBadge: 'Re-enable Choice',
    tagline: 'Make choice clickable again',
    description: 'Ensure a choice remains active and selectable when this condition applies.',
    category: 'OPTIONS',
    color: 'emerald',
    icon: RiCheckLine,
    needsTargetGroup: true,
    needsTargetOption: true,
  },
  {
    id: 'SET_DEFAULT',
    label: 'Auto-Select Recommended Default',
    shortBadge: 'Auto-Select Choice',
    tagline: 'Pre-select a specific option',
    description: 'Automatically select a specific choice in another group (e.g. When Spot UV is selected, default Finish to Velvet Matte).',
    category: 'OPTIONS',
    color: 'amber',
    icon: RiFlashlightLine,
    needsTargetGroup: true,
    needsTargetOption: true,
  },
  {
    id: 'REQUIRE',
    label: 'Make Option Mandatory',
    shortBadge: 'Make Required',
    tagline: 'Force customer to make a choice',
    description: 'Turn an optional field into a strictly required selection before the customer can proceed to checkout.',
    category: 'VALIDATION',
    color: 'rose',
    icon: RiAlertLine,
    needsTargetGroup: true,
    needsTargetOption: false,
  },
  {
    id: 'INVALID_COMBINATION',
    label: 'Block Incompatible Combination',
    shortBadge: 'Block Combination',
    tagline: 'Disallow checkout with clear notice',
    description: 'Prevent the customer from ordering this specific combination and show an informative message explaining why.',
    category: 'VALIDATION',
    color: 'rose',
    icon: RiStopCircleLine,
    needsTargetGroup: false,
    needsTargetOption: false,
  },
  {
    id: 'APPLY_CHARGE',
    label: 'Add Extra Surcharge / Fee',
    shortBadge: 'Add Extra Surcharge',
    tagline: 'Apply conditional fee',
    description: 'Add a fixed fee, per-unit charge, or percentage surcharge to the order total when this condition is selected.',
    category: 'PRICING',
    color: 'blue',
    icon: RiPriceTag3Line,
    needsTargetGroup: false,
    needsTargetOption: false,
  },
  {
    id: 'REMOVE_CHARGE',
    label: 'Waive Conditional Fee',
    shortBadge: 'Waive Fee',
    tagline: 'Remove conditional surcharge',
    description: 'Waive or remove a previously applied fee for this specific option combination.',
    category: 'PRICING',
    color: 'emerald',
    icon: RiDiscountPercentLine,
    needsTargetGroup: false,
    needsTargetOption: false,
  },
];

export const CONDITION_OPERATORS = [
  { value: 'IN', label: 'is any of (selected choices)', description: 'Matches if customer selects any of the checked choices' },
  { value: 'EQUALS', label: 'is exactly equal to', description: 'Matches single exact option' },
  { value: 'NOT_EQUALS', label: 'is NOT equal to', description: 'Matches any choice other than this' },
  { value: 'NOT_IN', label: 'is NOT one of', description: 'Matches if choice is outside the checked list' },
  { value: 'GREATER_THAN', label: 'is greater than (numeric)', description: 'Numeric comparison' },
  { value: 'LESS_THAN', label: 'is less than (numeric)', description: 'Numeric comparison' },
];

// ---------------------------------------------------------------------------
// 2. NATURAL LANGUAGE SUMMARY GENERATOR
// ---------------------------------------------------------------------------

export function generateRuleSummary(
  rule: {
    conditionGroupCode?: string;
    conditionOperator?: string;
    conditionOptionValue?: string | string[];
    actionType?: string;
    targetGroupCode?: string | null;
    targetOptionValue?: string | null;
    actionPayload?: any;
    name?: string;
  },
  optionGroups: ProductOptionGroup[]
): string {
  const triggerGroup = optionGroups.find((g) => g.code === rule.conditionGroupCode);
  const triggerGroupName = triggerGroup?.name || rule.conditionGroupCode || 'an option';

  // Extract trigger values
  const payload = rule.actionPayload || {};
  let conditionPhrases: string[] = [];

  if (Array.isArray(payload.conditions) && payload.conditions.length > 0) {
    conditionPhrases = payload.conditions.map((c: any) => {
      const g = optionGroups.find((grp) => grp.code === c.groupCode);
      const gName = g?.name || c.groupCode;
      const rawVals = Array.isArray(c.optionValue)
        ? c.optionValue
        : String(c.optionValue || '').split(',').map((s) => s.trim()).filter(Boolean);
      const labels = rawVals.map((v: string) => g?.options.find((o) => o.value === v)?.label || v);
      const joinedVals = labels.length > 0 ? labels.join(' or ') : 'any value';
      const op = c.operator || 'IN';
      if (op === 'NOT_EQUALS' || op === 'NOT_IN') return `${gName} is not ${joinedVals}`;
      return `${gName} is ${joinedVals}`;
    });
  } else {
    const rawVals = Array.isArray(rule.conditionOptionValue)
      ? rule.conditionOptionValue
      : String(rule.conditionOptionValue || '').split(',').map((s) => s.trim()).filter(Boolean);
    const labels = rawVals.map((v) => triggerGroup?.options.find((o) => o.value === v)?.label || v);
    const joinedVals = labels.length > 0 ? labels.join(' or ') : 'any value';
    const op = rule.conditionOperator || 'IN';
    if (op === 'NOT_EQUALS' || op === 'NOT_IN') {
      conditionPhrases.push(`${triggerGroupName} is not ${joinedVals}`);
    } else {
      conditionPhrases.push(`${triggerGroupName} is ${joinedVals}`);
    }
  }

  const logicOp = payload.logicalOperator === 'OR' ? ' OR ' : ' AND ';
  const whenClause = conditionPhrases.length > 0 ? `When ${conditionPhrases.join(logicOp)}` : 'When condition matches';

  // Target effect phrase
  const targetGroup = optionGroups.find((g) => g.code === rule.targetGroupCode);
  const targetGroupName = targetGroup?.name || rule.targetGroupCode || 'target group';

  const actionType = rule.actionType || 'RESTRICT_OPTIONS';

  switch (actionType) {
    case 'RESTRICT_OPTIONS': {
      const allowed = Array.isArray(payload.allowedOptionValues) ? payload.allowedOptionValues : [];
      const allowedLabels = allowed.map((v: string) => targetGroup?.options.find((o) => o.value === v)?.label || v);
      if (allowedLabels.length > 0) {
        return `${whenClause}, customers can choose ${allowedLabels.join(', ')}. Other ${targetGroupName.toLowerCase()} choices are unavailable.`;
      }
      return `${whenClause}, customers are restricted to specific ${targetGroupName} choices.`;
    }

    case 'HIDE': {
      if (rule.targetOptionValue) {
        const optLabel = targetGroup?.options.find((o) => o.value === rule.targetOptionValue)?.label || rule.targetOptionValue;
        return `${whenClause}, the choice "${optLabel}" in ${targetGroupName} will be hidden from the customer.`;
      }
      return `${whenClause}, the entire option group "${targetGroupName}" will be hidden from the customer.`;
    }

    case 'SHOW': {
      if (rule.targetOptionValue) {
        const optLabel = targetGroup?.options.find((o) => o.value === rule.targetOptionValue)?.label || rule.targetOptionValue;
        return `${whenClause}, the choice "${optLabel}" in ${targetGroupName} will become visible to the customer.`;
      }
      return `${whenClause}, the option group "${targetGroupName}" will become visible to the customer.`;
    }

    case 'DISABLE': {
      const optLabel = targetGroup?.options.find((o) => o.value === rule.targetOptionValue)?.label || rule.targetOptionValue || targetGroupName;
      return `${whenClause}, "${optLabel}" will be disabled (visible but unavailable to order).`;
    }

    case 'ENABLE': {
      const optLabel = targetGroup?.options.find((o) => o.value === rule.targetOptionValue)?.label || rule.targetOptionValue || targetGroupName;
      return `${whenClause}, "${optLabel}" will be re-enabled for selection.`;
    }

    case 'SET_DEFAULT': {
      const defVal = payload.defaultValue || rule.targetOptionValue;
      const optLabel = targetGroup?.options.find((o) => o.value === defVal)?.label || defVal || 'default';
      return `${whenClause}, ${targetGroupName} will automatically be set to "${optLabel}".`;
    }

    case 'REQUIRE': {
      return `${whenClause}, selecting a choice for ${targetGroupName} is strictly required.`;
    }

    case 'INVALID_COMBINATION': {
      const errorMsg = payload.errorMessage || rule.name || 'This option combination is not permitted.';
      return `${whenClause}, this combination is blocked with warning: "${errorMsg}".`;
    }

    case 'APPLY_CHARGE': {
      const amt = payload.amount ?? 0;
      const type = payload.calculationType === 'PER_UNIT' ? 'per unit' : payload.calculationType === 'PERCENTAGE' ? '% of base' : 'fixed fee';
      const chgName = payload.name || rule.name || 'Extra Fee';
      return `${whenClause}, an extra charge of ₹${amt} (${type}) will be added as "${chgName}".`;
    }

    case 'REMOVE_CHARGE': {
      const chgName = payload.name || rule.name || 'Fee';
      return `${whenClause}, the conditional charge "${chgName}" will be waived.`;
    }

    case 'CONFIGURE_ARTWORK':
    case 'REQUIRE_ARTWORK_FILES': {
      const count = payload.slotCount || 1;
      const labels = Array.isArray(payload.slotLabels) && payload.slotLabels.length > 0 ? payload.slotLabels.join(', ') : 'Production Artwork';
      return `${whenClause}, customers must upload ${count} artwork file(s) (${labels}).`;
    }

    default:
      return `${whenClause}, then ${actionType} will be applied to ${targetGroupName}.`;
  }
}

// ---------------------------------------------------------------------------
// 3. MAIN COMPONENT: StudioTabRules
// ---------------------------------------------------------------------------

export function StudioTabRules({
  rules,
  setRules,
  optionGroups,
  onNavigateToTab,
  onChange,
}: StudioTabRulesProps) {
  // Navigation & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  // Builder Modal State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Builder Step Navigation (1: When, 2: Condition, 3: Action, 4: Target, 5: Review & Save)
  const [activeStep, setActiveStep] = useState<number>(1);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Test Sandbox Mode Drawer
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [sandboxSelections, setSandboxSelections] = useState<Record<string, any>>({});
  const [testWithDraftRule, setTestWithDraftRule] = useState<boolean>(true);

  // -------------------------------------------------------------------------
  // RULE DRAFT STATE
  // -------------------------------------------------------------------------
  const [draftName, setDraftName] = useState('');
  const [draftTriggerGroup, setDraftTriggerGroup] = useState<string>('');
  const [draftTriggerOperator, setDraftTriggerOperator] = useState<string>('IN');
  const [draftTriggerValues, setDraftTriggerValues] = useState<string[]>([]);
  const [draftActionType, setDraftActionType] = useState<string>('RESTRICT_OPTIONS');
  const [draftTargetGroup, setDraftTargetGroup] = useState<string>('');
  const [draftTargetOption, setDraftTargetOption] = useState<string>('');
  const [draftAllowedValues, setDraftAllowedValues] = useState<string[]>([]);
  const [draftDefaultValue, setDraftDefaultValue] = useState<string>('');
  const [draftErrorMessage, setDraftErrorMessage] = useState<string>('');
  const [draftDisabledReason, setDraftDisabledReason] = useState<string>('');
  const [draftPriority, setDraftPriority] = useState<number>(10);

  // Multi-Condition Rows (In Advanced Section)
  interface SecondaryCondition {
    id: string;
    groupCode: string;
    operator: string;
    optionValues: string[];
  }
  const [secondaryConditions, setSecondaryConditions] = useState<SecondaryCondition[]>([]);
  const [logicalOperator, setLogicalOperator] = useState<'AND' | 'OR'>('AND');

  // Charge Payload
  const [chargeName, setChargeName] = useState<string>('');
  const [chargeAmount, setChargeAmount] = useState<number | string>(0);
  const [chargeType, setChargeType] = useState<'FIXED' | 'PER_UNIT' | 'PERCENTAGE'>('FIXED');
  const [chargeDesc, setChargeDesc] = useState<string>('');

  // Artwork Payload
  const [slotCount, setSlotCount] = useState<number>(1);
  const [slotLabels, setSlotLabels] = useState<string[]>(['Front Side']);
  const [minMegapixels, setMinMegapixels] = useState<number>(1.5);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState<number>(50);
  const [artworkStatus, setArtworkStatus] = useState<'REQUIRED' | 'OPTIONAL' | 'DISABLED'>('REQUIRED');

  // Error & Validation Notice
  const [builderError, setBuilderError] = useState<string | null>(null);

  // Auto-init trigger group if empty
  useEffect(() => {
    if (optionGroups.length > 0 && !draftTriggerGroup) {
      setDraftTriggerGroup(optionGroups[0].code);
    }
    if (optionGroups.length > 1 && !draftTargetGroup) {
      setDraftTargetGroup(optionGroups[1].code);
    }
  }, [optionGroups, draftTriggerGroup, draftTargetGroup]);

  // Sync sample sandbox state whenever option groups change
  useEffect(() => {
    if (optionGroups.length > 0 && Object.keys(sandboxSelections).length === 0) {
      const initial: Record<string, any> = {};
      optionGroups.forEach((g) => {
        const def = g.options.find((o) => o.isDefault) || g.options[0];
        if (def) initial[g.code] = def.value;
      });
      setSandboxSelections(initial);
    }
  }, [optionGroups]);

  // Selected Group References
  const currentTriggerGroupObj = useMemo(
    () => optionGroups.find((g) => g.code === draftTriggerGroup),
    [optionGroups, draftTriggerGroup]
  );

  const currentTargetGroupObj = useMemo(
    () => optionGroups.find((g) => g.code === draftTargetGroup),
    [optionGroups, draftTargetGroup]
  );

  const currentActionPreset = useMemo(
    () => ACTION_PRESETS.find((a) => a.id === draftActionType) || ACTION_PRESETS[0],
    [draftActionType]
  );

  // -------------------------------------------------------------------------
  // VALIDATION & INTEGRITY CHECKS
  // -------------------------------------------------------------------------
  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!draftTriggerGroup) {
      warnings.push('Please select which option group triggers this rule.');
    }
    if (draftTriggerValues.length === 0) {
      warnings.push(`Please select at least one trigger choice from '${currentTriggerGroupObj?.name || draftTriggerGroup}'.`);
    }

    if (currentActionPreset.needsTargetGroup && !draftTargetGroup) {
      warnings.push('Please select which downstream option group is affected.');
    }

    if (currentActionPreset.needsTargetGroup && draftTriggerGroup === draftTargetGroup) {
      warnings.push('Trigger option group and target option group are the same. Please select a different target group to avoid recursive loops.');
    }

    if (draftActionType === 'RESTRICT_OPTIONS' && draftAllowedValues.length === 0) {
      warnings.push('Please select at least one choice to allow for the target group.');
    }

    if (draftActionType === 'SET_DEFAULT' && !draftDefaultValue && !draftTargetOption) {
      warnings.push('Please specify which choice should be pre-selected as the default.');
    }

    if (draftActionType === 'APPLY_CHARGE') {
      if (!chargeName.trim()) warnings.push('Please provide a name/title for this surcharge.');
      if (Number(chargeAmount) <= 0) warnings.push('Charge amount should be greater than ₹0.');
    }

    // Contradiction Check with existing rules
    for (let i = 0; i < rules.length; i++) {
      if (editingIndex !== null && i === editingIndex) continue;
      const r = rules[i];
      if (!r.isActive) continue;

      if (r.conditionGroupCode === draftTriggerGroup && r.targetGroupCode === draftTargetGroup) {
        if (
          (r.actionType === 'SHOW' && draftActionType === 'HIDE') ||
          (r.actionType === 'HIDE' && draftActionType === 'SHOW') ||
          (r.actionType === 'REQUIRE' && draftActionType === 'DISABLE')
        ) {
          warnings.push(`Potential contradiction with active rule "${r.name}": Cannot both ${r.actionType} and ${draftActionType} on "${draftTargetGroup}".`);
        }
      }

      // Circular dependency check (A -> B and B -> A)
      if (r.targetGroupCode === draftTriggerGroup && r.conditionGroupCode === draftTargetGroup) {
        warnings.push(`Circular dependency detected with rule "${r.name}": It links '${r.conditionGroupCode}' → '${r.targetGroupCode}', while this rule links '${draftTriggerGroup}' → '${draftTargetGroup}'.`);
      }
    }

    return warnings;
  }, [
    draftTriggerGroup,
    draftTriggerValues,
    currentActionPreset,
    draftTargetGroup,
    draftActionType,
    draftAllowedValues,
    draftDefaultValue,
    draftTargetOption,
    chargeName,
    chargeAmount,
    rules,
    editingIndex,
    currentTriggerGroupObj,
  ]);

  // Live Rule Summary for the current draft
  const currentDraftSummary = useMemo(() => {
    return generateRuleSummary(
      {
        conditionGroupCode: draftTriggerGroup,
        conditionOperator: draftTriggerOperator,
        conditionOptionValue: draftTriggerValues,
        actionType: draftActionType,
        targetGroupCode: currentActionPreset.needsTargetGroup ? draftTargetGroup : null,
        targetOptionValue: draftDefaultValue || draftTargetOption,
        actionPayload: {
          allowedOptionValues: draftAllowedValues,
          defaultValue: draftDefaultValue || draftTargetOption,
          errorMessage: draftErrorMessage,
          priority: draftPriority,
          amount: chargeAmount,
          calculationType: chargeType,
          name: chargeName,
          slotCount,
          slotLabels,
          logicalOperator,
          conditions: secondaryConditions.length > 0 ? [
            { groupCode: draftTriggerGroup, operator: draftTriggerOperator, optionValue: draftTriggerValues },
            ...secondaryConditions,
          ] : undefined,
        },
      },
      optionGroups
    );
  }, [
    draftTriggerGroup,
    draftTriggerOperator,
    draftTriggerValues,
    draftActionType,
    draftTargetGroup,
    draftTargetOption,
    draftDefaultValue,
    draftAllowedValues,
    draftErrorMessage,
    draftPriority,
    chargeAmount,
    chargeType,
    chargeName,
    slotCount,
    slotLabels,
    logicalOperator,
    secondaryConditions,
    currentActionPreset,
    optionGroups,
  ]);

  // -------------------------------------------------------------------------
  // OPEN / CLOSE BUILDER
  // -------------------------------------------------------------------------
  const handleOpenBuilder = (indexToEdit?: number) => {
    setBuilderError(null);
    setActiveStep(1);

    if (indexToEdit !== undefined && rules[indexToEdit]) {
      setEditingIndex(indexToEdit);
      const r = rules[indexToEdit];
      const payload = (r.actionPayload as any) || {};

      setDraftName(r.name);
      setDraftActionType(r.actionType);
      setDraftPriority(Number(payload.priority ?? 10));

      // Trigger condition
      setDraftTriggerGroup(r.conditionGroupCode || optionGroups[0]?.code || '');
      setDraftTriggerOperator(r.conditionOperator || 'IN');

      const triggerVals = Array.isArray(r.conditionOptionValue)
        ? r.conditionOptionValue
        : String(r.conditionOptionValue || '').split(',').map((s) => s.trim()).filter(Boolean);
      setDraftTriggerValues(triggerVals);

      // Multi conditions
      if (Array.isArray(payload.conditions) && payload.conditions.length > 1) {
        setLogicalOperator(payload.logicalOperator === 'OR' ? 'OR' : 'AND');
        setSecondaryConditions(
          payload.conditions.slice(1).map((c: any, i: number) => ({
            id: `sec-${i + 1}`,
            groupCode: c.groupCode,
            operator: c.operator || 'IN',
            optionValues: Array.isArray(c.optionValue)
              ? c.optionValue
              : String(c.optionValue || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          }))
        );
      } else {
        setSecondaryConditions([]);
        setLogicalOperator('AND');
      }

      // Target
      setDraftTargetGroup(r.targetGroupCode || (optionGroups[1]?.code || optionGroups[0]?.code || ''));
      setDraftTargetOption(r.targetOptionValue || '');
      setDraftAllowedValues(Array.isArray(payload.allowedOptionValues) ? payload.allowedOptionValues : []);
      setDraftDefaultValue(payload.defaultValue || r.targetOptionValue || '');
      setDraftErrorMessage(payload.errorMessage || '');
      setDraftDisabledReason(payload.reason || '');

      // Charges
      setChargeName(payload.name || '');
      setChargeAmount(payload.amount ?? 0);
      setChargeType(payload.calculationType || 'FIXED');
      setChargeDesc(payload.description || '');

      // Artwork
      setSlotCount(Number(payload.slotCount) || 1);
      setSlotLabels(Array.isArray(payload.slotLabels) ? payload.slotLabels : ['Front Side']);
      setMinMegapixels(payload.minMegapixels || 1.5);
      setMaxFileSizeMb(payload.maxFileSizeMb || 50);
      setArtworkStatus(payload.artworkStatus || 'REQUIRED');
    } else {
      setEditingIndex(null);
      const defaultTrig = optionGroups[0]?.code || '';
      const defaultTarget = optionGroups[1]?.code || optionGroups[0]?.code || '';

      setDraftName('');
      setDraftTriggerGroup(defaultTrig);
      setDraftTriggerOperator('IN');
      setDraftTriggerValues([]);
      setDraftActionType('RESTRICT_OPTIONS');
      setDraftTargetGroup(defaultTarget);
      setDraftTargetOption('');
      setDraftAllowedValues([]);
      setDraftDefaultValue('');
      setDraftErrorMessage('');
      setDraftDisabledReason('');
      setDraftPriority(10);
      setSecondaryConditions([]);
      setLogicalOperator('AND');
      setChargeName('');
      setChargeAmount(0);
      setChargeType('FIXED');
      setChargeDesc('');
      setSlotCount(1);
      setSlotLabels(['Front Side']);
      setMinMegapixels(1.5);
      setMaxFileSizeMb(50);
      setArtworkStatus('REQUIRED');
    }

    setIsBuilderOpen(true);
  };

  // -------------------------------------------------------------------------
  // SAVE RULE
  // -------------------------------------------------------------------------
  const handleSaveRule = () => {
    setBuilderError(null);

    // Run hard validations
    if (validationWarnings.length > 0) {
      setBuilderError(validationWarnings[0]);
      return;
    }

    const autoName = draftName.trim() || currentDraftSummary.slice(0, 80);

    const basePayload: Record<string, any> = {
      priority: Number(draftPriority) || 10,
      logicalOperator,
    };

    if (secondaryConditions.length > 0) {
      basePayload.conditions = [
        {
          groupCode: draftTriggerGroup,
          operator: draftTriggerOperator,
          optionValue: draftTriggerValues,
        },
        ...secondaryConditions.map((sc) => ({
          groupCode: sc.groupCode,
          operator: sc.operator,
          optionValue: sc.optionValues,
        })),
      ];
    }

    if (draftActionType === 'RESTRICT_OPTIONS') {
      basePayload.allowedOptionValues = draftAllowedValues;
      basePayload.reason = draftDisabledReason.trim() || `Not available when ${currentTriggerGroupObj?.name || draftTriggerGroup} is selected.`;
    } else if (draftActionType === 'INVALID_COMBINATION') {
      basePayload.errorMessage = draftErrorMessage.trim() || `${autoName}: This combination is not permitted.`;
    } else if (draftActionType === 'SET_DEFAULT') {
      basePayload.defaultValue = draftDefaultValue || draftTargetOption;
    } else if (draftActionType === 'DISABLE') {
      basePayload.reason = draftDisabledReason.trim() || `Not available with current selection.`;
    } else if (draftActionType === 'APPLY_CHARGE') {
      basePayload.chargeId = `chg-${autoName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      basePayload.name = chargeName.trim() || autoName;
      basePayload.amount = Number(chargeAmount) || 0;
      basePayload.calculationType = chargeType;
      basePayload.description = chargeDesc.trim() || undefined;
    } else if (draftActionType === 'REMOVE_CHARGE') {
      basePayload.chargeId = `chg-${autoName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    } else if (draftActionType === 'CONFIGURE_ARTWORK' || draftActionType === 'REQUIRE_ARTWORK_FILES') {
      basePayload.artworkStatus = artworkStatus;
      basePayload.slotCount = Number(slotCount) || 1;
      basePayload.slotLabels = slotLabels;
      basePayload.minMegapixels = Number(minMegapixels) || 1.5;
      basePayload.maxFileSizeMb = Number(maxFileSizeMb) || 50;
    }

    const ruleData: ProductConfigurationRule = {
      id: editingIndex !== null ? rules[editingIndex].id : `rule-${Date.now()}`,
      productId: '',
      name: autoName,
      conditionGroupCode: draftTriggerGroup,
      conditionOperator: draftTriggerOperator,
      conditionOptionValue: draftTriggerValues.join(','),
      actionType: draftActionType,
      targetGroupCode: currentActionPreset.needsTargetGroup ? draftTargetGroup : null,
      targetOptionValue: currentActionPreset.needsTargetOption ? (draftDefaultValue || draftTargetOption || null) : null,
      actionPayload: basePayload,
      isActive: editingIndex !== null ? rules[editingIndex].isActive : true,
    };

    if (editingIndex !== null) {
      setRules((prev) => {
        const next = [...prev];
        next[editingIndex] = ruleData;
        return next;
      });
    } else {
      setRules((prev) => [...prev, ruleData]);
    }

    setIsBuilderOpen(false);
    onChange?.();
  };

  // -------------------------------------------------------------------------
  // DUPLICATE, DELETE, TOGGLE
  // -------------------------------------------------------------------------
  const handleDuplicate = (idx: number) => {
    const orig = rules[idx];
    const copy: ProductConfigurationRule = {
      ...orig,
      id: `rule-${Date.now()}`,
      name: `${orig.name} (Copy)`,
    };
    setRules((prev) => [...prev, copy]);
    onChange?.();
  };

  const handleDelete = (idx: number) => {
    if (!confirm('Are you sure you want to remove this conditional rule?')) return;
    setRules((prev) => prev.filter((_, i) => i !== idx));
    onChange?.();
  };

  const handleToggleActive = (idx: number) => {
    setRules((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, isActive: !r.isActive } : r))
    );
    onChange?.();
  };

  // -------------------------------------------------------------------------
  // SANDBOX SIMULATION ENGINE
  // -------------------------------------------------------------------------
  const testRulesList = useMemo(() => {
    if (!testWithDraftRule || !isBuilderOpen) {
      return rules;
    }
    // Synthesize current draft rule for sandbox preview
    const draftRuleObj: ProductConfigurationRule = {
      id: 'draft-rule-preview',
      productId: '',
      name: draftName || 'Draft Rule',
      conditionGroupCode: draftTriggerGroup,
      conditionOperator: draftTriggerOperator,
      conditionOptionValue: draftTriggerValues.join(','),
      actionType: draftActionType,
      targetGroupCode: currentActionPreset.needsTargetGroup ? draftTargetGroup : null,
      targetOptionValue: draftDefaultValue || draftTargetOption || null,
      actionPayload: {
        priority: draftPriority,
        allowedOptionValues: draftAllowedValues,
        defaultValue: draftDefaultValue || draftTargetOption,
        errorMessage: draftErrorMessage,
        name: chargeName,
        amount: Number(chargeAmount) || 0,
        calculationType: chargeType,
        conditions: secondaryConditions.length > 0 ? [
          { groupCode: draftTriggerGroup, operator: draftTriggerOperator, optionValue: draftTriggerValues },
          ...secondaryConditions,
        ] : undefined,
      },
      isActive: true,
    };

    if (editingIndex !== null) {
      const copy = [...rules];
      copy[editingIndex] = draftRuleObj;
      return copy;
    }
    return [...rules, draftRuleObj];
  }, [
    rules,
    testWithDraftRule,
    isBuilderOpen,
    editingIndex,
    draftName,
    draftTriggerGroup,
    draftTriggerOperator,
    draftTriggerValues,
    draftActionType,
    currentActionPreset,
    draftTargetGroup,
    draftDefaultValue,
    draftTargetOption,
    draftPriority,
    draftAllowedValues,
    draftErrorMessage,
    chargeName,
    chargeAmount,
    chargeType,
    secondaryConditions,
  ]);

  const sandboxEvaluation = useMemo(() => {
    return evaluateProductConfiguration(
      optionGroups.map((g) => ({
        id: g.id,
        name: g.name,
        code: g.code,
        isRequired: g.isRequired,
        isCustomerVisible: g.isCustomerVisible,
        options: (g.options || []).map((o) => ({
          id: o.id,
          label: o.label,
          value: o.value,
          isActive: o.isActive,
          isDefault: o.isDefault,
        })),
      })),
      testRulesList as any,
      sandboxSelections
    );
  }, [optionGroups, testRulesList, sandboxSelections]);

  // Filtered Option Rules for Display (Artwork matrix rules are managed separately in Stage 4)
  const filteredRules = useMemo(() => {
    return rules
      .filter(
        (r) =>
          r.actionType !== 'ARTWORK_CONDITIONS' &&
          r.actionType !== 'REQUIRE_ARTWORK_FILES' &&
          r.actionType !== 'CONFIGURE_ARTWORK'
      )
      .filter((r) => {
        if (filterAction !== 'ALL') {
          const preset = ACTION_PRESETS.find((p) => p.id === r.actionType);
          if (preset?.category !== filterAction && r.actionType !== filterAction) {
            return false;
          }
        }
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const trig = optionGroups.find((g) => g.code === r.conditionGroupCode)?.name.toLowerCase() || '';
        const targ = optionGroups.find((g) => g.code === r.targetGroupCode)?.name.toLowerCase() || '';
        const summary = generateRuleSummary(r, optionGroups).toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.conditionGroupCode.toLowerCase().includes(q) ||
          (r.targetGroupCode && r.targetGroupCode.toLowerCase().includes(q)) ||
          trig.includes(q) ||
          targ.includes(q) ||
          summary.includes(q)
        );
      });
  }, [rules, searchQuery, filterAction, optionGroups]);

  // Statistics (Option Rules only)
  const ruleStats = useMemo(() => {
    const optRules = rules.filter(
      (r) =>
        r.actionType !== 'ARTWORK_CONDITIONS' &&
        r.actionType !== 'REQUIRE_ARTWORK_FILES' &&
        r.actionType !== 'CONFIGURE_ARTWORK'
    );
    return {
      total: optRules.length,
      active: optRules.filter((r) => r.isActive !== false).length,
      restrictions: optRules.filter((r) => r.actionType === 'RESTRICT_OPTIONS').length,
      visibility: optRules.filter((r) => r.actionType === 'HIDE' || r.actionType === 'SHOW').length,
      charges: optRules.filter((r) => r.actionType === 'APPLY_CHARGE').length,
      blocks: optRules.filter((r) => r.actionType === 'INVALID_COMBINATION').length,
    };
  }, [rules]);

  // -------------------------------------------------------------------------
  // RENDER: EMPTY OPTION GROUPS GUARD
  // -------------------------------------------------------------------------
  if (optionGroups.length === 0) {
    return (
      <div className="w-full p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl border border-amber-200">
          <RiSparklingFill />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-base font-bold text-slate-900">Configure Option Groups First</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Conditional dependencies and rules link your product options together (e.g. Material $\rightarrow$ Color or Size $\rightarrow$ Finish). Please define at least two option groups in <strong>Step 2 (Options)</strong> before creating conditional rules.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & STUDIO CONTROLS                                       */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display">
              Option Dependencies & Conditional Rules
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {ruleStats.active} of {ruleStats.total} Rules Active
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Guide customers seamlessly by defining when choices appear, restrict unavailable materials, enforce mandatory fields, or apply dynamic charges without manual code.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsSandboxOpen(!isSandboxOpen)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
              isSandboxOpen
                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
            }`}
          >
            <RiFlaskLine className="w-4 h-4 text-indigo-600" />
            <span>{isSandboxOpen ? 'Close Test Sandbox' : 'Test Rules Sandbox'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenBuilder()}
            className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl border border-amber-400 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <RiAddLine className="w-4 h-4" />
            <span>Create New Rule</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. STATS & CATEGORY FILTER TABS                                       */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setFilterAction('ALL')}
          className={`p-3 rounded-xl border text-left cursor-pointer transition ${
            filterAction === 'ALL'
              ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">All Rules</span>
          <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">{ruleStats.total}</span>
        </div>

        <div
          onClick={() => setFilterAction('OPTIONS')}
          className={`p-3 rounded-xl border text-left cursor-pointer transition ${
            filterAction === 'OPTIONS'
              ? 'bg-purple-50/80 border-purple-300 shadow-2xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Restrictions</span>
          <span className="text-lg font-black text-purple-900 font-mono mt-0.5 block">{ruleStats.restrictions}</span>
        </div>

        <div
          onClick={() => setFilterAction('VISIBILITY')}
          className={`p-3 rounded-xl border text-left cursor-pointer transition ${
            filterAction === 'VISIBILITY'
              ? 'bg-slate-100 border-slate-400 shadow-2xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Hide / Show</span>
          <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">{ruleStats.visibility}</span>
        </div>

        <div
          onClick={() => setFilterAction('PRICING')}
          className={`p-3 rounded-xl border text-left cursor-pointer transition ${
            filterAction === 'PRICING'
              ? 'bg-blue-50/80 border-blue-300 shadow-2xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Surcharges</span>
          <span className="text-lg font-black text-blue-900 font-mono mt-0.5 block">{ruleStats.charges}</span>
        </div>

        <div
          onClick={() => setFilterAction('VALIDATION')}
          className={`p-3 rounded-xl border text-left cursor-pointer transition ${
            filterAction === 'VALIDATION'
              ? 'bg-rose-50/80 border-rose-300 shadow-2xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Blocked Combos</span>
          <span className="text-lg font-black text-rose-900 font-mono mt-0.5 block">{ruleStats.blocks}</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. INTERACTIVE TEST-RULE SANDBOX (SIMULATOR)                           */}
      {/* ===================================================================== */}
      {isSandboxOpen && (
        <div className="bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 p-5 rounded-2xl border-2 border-indigo-200 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-600 text-white rounded-lg text-sm shadow-xs">
                <RiFlaskLine />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Customer Experience Simulator (Live Test Mode)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select sample values below to observe how rules affect visibility, choice availability, and pricing in real time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const reset: Record<string, any> = {};
                  optionGroups.forEach((g) => {
                    if (g.options[0]) reset[g.code] = g.options[0].value;
                  });
                  setSandboxSelections(reset);
                }}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-950 underline cursor-pointer"
              >
                Reset Selections
              </button>
            </div>
          </div>

          {/* Interactive Option Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {optionGroups.map((g) => {
              const currentVal = sandboxSelections[g.code];
              const isGroupVisible = sandboxEvaluation.groupStatus[g.code]?.isVisible !== false;
              const isGroupRequired = sandboxEvaluation.groupStatus[g.code]?.isRequired;

              return (
                <div
                  key={g.code}
                  className={`p-3 rounded-xl border transition ${
                    isGroupVisible
                      ? 'bg-white border-slate-200 shadow-2xs'
                      : 'bg-slate-100/70 border-dashed border-slate-300 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-900 truncate">{g.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600">
                      {!isGroupVisible ? 'HIDDEN' : isGroupRequired ? 'REQUIRED' : 'VISIBLE'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {g.options.map((opt) => {
                      const isSelected = currentVal === opt.value;
                      const optKey = `${g.code}:${opt.value}`;
                      const status = sandboxEvaluation.optionStatus[optKey];
                      const isDisabled = status?.isDisabled === true;
                      const isOptVisible = status?.isVisible !== false;

                      if (!isOptVisible) return null;

                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={!isGroupVisible || isDisabled}
                          onClick={() => setSandboxSelections((prev) => ({ ...prev, [g.code]: opt.value }))}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-slate-950 text-white font-bold shadow-xs'
                              : isDisabled
                              ? 'bg-slate-50 text-slate-400 line-through cursor-not-allowed border border-slate-200/50'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {isDisabled && (
                            <span className="text-[9px] font-mono px-1 rounded bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                              DISABLED
                            </span>
                          )}
                          {isSelected && <RiCheckLine className="w-3.5 h-3.5 shrink-0 text-amber-300" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Evaluation Diagnostic Banner */}
          <div className="p-3.5 rounded-xl border bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 ${
                  sandboxEvaluation.isValid
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {sandboxEvaluation.isValid ? (
                  <>
                    <RiCheckboxCircleLine className="w-4 h-4 text-emerald-700" />
                    <span>Configuration Valid for Checkout</span>
                  </>
                ) : (
                  <>
                    <RiStopCircleLine className="w-4 h-4 text-rose-700" />
                    <span>Checkout Blocked by Rules</span>
                  </>
                )}
              </span>

              {sandboxEvaluation.activeCharges.length > 0 && (
                <span className="px-2.5 py-1 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-300">
                  +₹{sandboxEvaluation.activeCharges.reduce((sum, c) => sum + c.amount, 0)} Active Surcharges
                </span>
              )}
            </div>

            {sandboxEvaluation.errors.length > 0 && (
              <div className="text-rose-700 font-semibold text-[11px]">
                {sandboxEvaluation.errors.join(' • ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. RULES LIST WITH NATURAL-LANGUAGE SUMMARY CARDS                     */}
      {/* ===================================================================== */}
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <RiSearch2Line className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules by material, option, or summary..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            />
          </div>

          <span className="text-xs text-slate-500 self-center">
            Showing <strong>{filteredRules.length}</strong> of <strong>{rules.length}</strong> rules
          </span>
        </div>

        {/* Empty State */}
        {filteredRules.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3 shadow-2xs">
            <RiSparklingFill className="w-10 h-10 text-amber-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">
              {rules.length === 0 ? 'No Conditional Rules Created Yet' : 'No Rules Match Your Search'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {rules.length === 0
                ? 'Create your first rule to control option dependencies, enforce requirements, or limit combinations.'
                : 'Try adjusting your search terms or clearing the category filter.'}
            </p>
            {rules.length === 0 && (
              <button
                type="button"
                onClick={() => handleOpenBuilder()}
                className="mt-2 inline-flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-black text-xs px-4 py-2 rounded-xl border border-amber-400 shadow-xs cursor-pointer"
              >
                <RiAddLine className="w-4 h-4" />
                <span>Create Your First Rule</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRules.map((rule, idx) => {
              const ruleIndex = rules.findIndex((r) => r.id === rule.id);
              const summaryText = generateRuleSummary(rule, optionGroups);
              const preset = ACTION_PRESETS.find((p) => p.id === rule.actionType) || ACTION_PRESETS[0];
              const IconComp = preset.icon;

              return (
                <div
                  key={rule.id || idx}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    rule.isActive
                      ? 'border-slate-200 hover:border-slate-300'
                      : 'border-slate-200 opacity-60 bg-slate-50/70'
                  }`}
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Top Row: Preset Badge, Name, Priority */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                        <IconComp className="w-3.5 h-3.5 text-slate-600" />
                        <span>{preset.shortBadge}</span>
                      </span>

                      <span className="font-bold text-xs text-slate-900">{rule.name}</span>

                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        Priority {rule.actionPayload?.priority ?? 10}
                      </span>

                      {!rule.isActive && (
                        <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded">
                          DISABLED
                        </span>
                      )}
                    </div>

                    {/* Prominent Natural Language Summary */}
                    <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-slate-900 font-medium leading-relaxed">
                      {summaryText}
                    </div>

                    {/* Flow Badge Breakdown */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-bold text-amber-900 bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-300 font-mono">
                        IF
                      </span>
                      <span className="font-bold text-slate-800">
                        {optionGroups.find((g) => g.code === rule.conditionGroupCode)?.name || rule.conditionGroupCode}
                      </span>
                      <span className="font-mono text-slate-400">{rule.conditionOperator || 'IN'}</span>
                      <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {String(rule.conditionOptionValue)}
                      </span>

                      <RiArrowRightLine className="w-3.5 h-3.5 text-slate-400" />

                      <span className="font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                        THEN
                      </span>
                      <span className="font-semibold text-slate-800">{preset.label}</span>
                      {rule.targetGroupCode && (
                        <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {optionGroups.find((g) => g.code === rule.targetGroupCode)?.name || rule.targetGroupCode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(ruleIndex)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition cursor-pointer ${
                        rule.isActive
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {rule.isActive ? 'Turn Off' : 'Turn On'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenBuilder(ruleIndex)}
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                      title="Edit Rule"
                    >
                      <RiEditLine className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(ruleIndex)}
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                      title="Duplicate Rule"
                    >
                      <RiFileCopyLine className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(ruleIndex)}
                      className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                      title="Delete Rule"
                    >
                      <RiDeleteBin7Line className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 3 Bottom Navigation Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => {
                onNavigateToTab('OPTIONS');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              ← Back to Step 2: Groups & Choices
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Step 3 Summary:</span>
          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono text-[11px]">
            {rules.length} Rules Configured
          </span>
          <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
            {rules.filter((r) => r.isActive !== false).length} Active on Storefront
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => {
                onNavigateToTab('ARTWORK');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] font-bold text-xs px-4 py-2.5 rounded-lg border border-[#E3A008]/40 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <span>Next: 4. Artwork Upload & Design Matrix</span>
              <RiArrowRightLine className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. GUIDED RULE BUILDER MODAL (STEP-BY-STEP WORKFLOW)                   */}
      {/* ===================================================================== */}
      {isBuilderOpen && (
        <Modal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          maxWidth="5xl"
          title={
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-amber-500 text-slate-950 rounded-lg text-xs font-black font-mono">
                RULE
              </span>
              <span className="text-base font-black text-slate-900 font-display">
                {editingIndex !== null ? 'Edit Conditional Rule' : 'Create New Conditional Rule'}
              </span>
            </div>
          }
          subtitle="Follow the steps below to configure how option choices interact on the storefront."
        >
          <div className="space-y-6 text-xs">
            {/* Step Indicators Bar */}
            <div className="grid grid-cols-5 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {[
                { step: 1, label: '1. When' },
                { step: 2, label: '2. Condition' },
                { step: 3, label: '3. Action' },
                { step: 4, label: '4. Target' },
                { step: 5, label: '5. Preview & Save' },
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setActiveStep(s.step)}
                  className={`py-2 px-2 rounded-lg font-bold text-center transition cursor-pointer truncate ${
                    activeStep === s.step
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Error Callout */}
            {builderError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2.5">
                <RiErrorWarningLine className="w-5 h-5 shrink-0 text-rose-600" />
                <span className="font-semibold">{builderError}</span>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 1: WHEN CUSTOMER SELECTS (TRIGGER GROUP & CHOICES)        */}
            {/* ------------------------------------------------------------- */}
            {activeStep === 1 && (
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 1: When the customer selects...
                  </h4>
                  <p className="text-xs text-slate-500">
                    Select the option group that will trigger this rule when the customer interacts with it.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-800">
                    Controlling Option Group <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={draftTriggerGroup}
                    onChange={(e) => {
                      setDraftTriggerGroup(e.target.value);
                      setDraftTriggerValues([]);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-950"
                  >
                    {optionGroups.map((g) => (
                      <option key={g.code} value={g.code}>
                        {g.name} ({g.options.length} choices available)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Choices in this Trigger Group */}
                {currentTriggerGroupObj && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Select which choices trigger this rule <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDraftTriggerValues(currentTriggerGroupObj.options.map((o) => o.value))}
                          className="text-[11px] font-bold text-indigo-700 hover:text-indigo-950 underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setDraftTriggerValues([])}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {currentTriggerGroupObj.options.map((opt) => {
                        const isChecked = draftTriggerValues.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setDraftTriggerValues((prev) =>
                                isChecked ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                              );
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                              isChecked
                                ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-2xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{opt.label}</span>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                isChecked ? 'bg-amber-500 border-amber-600 text-slate-950' : 'border-slate-300'
                              }`}
                            >
                              {isChecked && <RiCheckLine className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 2: WHICH CONDITION APPLIES (OPERATOR)                     */}
            {/* ------------------------------------------------------------- */}
            {activeStep === 2 && (
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 2: Which condition applies?
                  </h4>
                  <p className="text-xs text-slate-500">
                    Specify how the customer selection matches the choices selected in Step 1.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CONDITION_OPERATORS.map((op) => {
                    const isSelected = draftTriggerOperator === op.value;
                    return (
                      <button
                        key={op.value}
                        type="button"
                        onClick={() => setDraftTriggerOperator(op.value)}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50 border-amber-400 shadow-2xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900">{op.label}</span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'bg-amber-500 border-amber-600 text-slate-950' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{op.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 3: WHAT SHOULD HAPPEN (ACTION SELECTION)                  */}
            {/* ------------------------------------------------------------- */}
            {activeStep === 3 && (
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 3: What should happen?
                  </h4>
                  <p className="text-xs text-slate-500">
                    Choose the effect applied to the product configuration when this condition is met.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ACTION_PRESETS.map((preset) => {
                    const isSelected = draftActionType === preset.id;
                    const IconComp = preset.icon;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setDraftActionType(preset.id);
                          if (preset.id === 'RESTRICT_OPTIONS' && draftAllowedValues.length === 0 && currentTargetGroupObj) {
                            setDraftAllowedValues(currentTargetGroupObj.options.slice(0, 2).map((o) => o.value));
                          }
                        }}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-3 transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-400 shadow-2xs ring-1 ring-amber-400'
                            : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-slate-700">
                              <IconComp className="w-4 h-4" />
                            </span>
                            <span className="font-bold text-xs text-slate-900">{preset.label}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-normal">{preset.description}</p>
                        </div>

                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 self-start">
                          {preset.tagline}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 4: WHICH GROUP OR CHOICE IS AFFECTED                      */}
            {/* ------------------------------------------------------------- */}
            {activeStep === 4 && (
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 4: Which group or choice is affected?
                  </h4>
                  <p className="text-xs text-slate-500">
                    Define the target options, allowed choices, or charge parameters for this action.
                  </p>
                </div>

                {/* Target Group Selector (for actions that need one) */}
                {currentActionPreset.needsTargetGroup && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Target Option Group <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={draftTargetGroup}
                      onChange={(e) => {
                        setDraftTargetGroup(e.target.value);
                        setDraftAllowedValues([]);
                        setDraftDefaultValue('');
                        setDraftTargetOption('');
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-950"
                    >
                      {optionGroups
                        .filter((g) => g.code !== draftTriggerGroup)
                        .map((g) => (
                          <option key={g.code} value={g.code}>
                            {g.name} ({g.options.length} choices)
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Specific Action Configs */}
                {/* 1. RESTRICT OPTIONS */}
                {draftActionType === 'RESTRICT_OPTIONS' && currentTargetGroupObj && (
                  <div className="space-y-2.5 p-4 bg-purple-50/50 border border-purple-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-950">
                        Check the ONLY choices allowed for '{currentTargetGroupObj.name}' <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-semibold text-purple-700">
                        All other choices will be disabled
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {currentTargetGroupObj.options.map((opt) => {
                        const isAllowed = draftAllowedValues.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setDraftAllowedValues((prev) =>
                                isAllowed ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                              );
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                              isAllowed
                                ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold'
                                : 'bg-white border-slate-200 text-slate-500 line-through'
                            }`}
                          >
                            <span className="truncate">{opt.label}</span>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                isAllowed ? 'bg-purple-600 border-purple-700 text-white' : 'border-slate-300'
                              }`}
                            >
                              {isAllowed && <RiCheckLine className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. HIDE / SHOW SCOPE */}
                {(draftActionType === 'HIDE' || draftActionType === 'SHOW') && currentTargetGroupObj && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-800">
                      Scope of {draftActionType === 'HIDE' ? 'Hiding' : 'Showing'}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDraftTargetOption('')}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          !draftTargetOption
                            ? 'bg-amber-50 border-amber-400 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="block font-bold">Entire Option Group</span>
                        <span className="text-[11px] text-slate-500">Hide/Show '{currentTargetGroupObj.name}' completely</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftTargetOption(currentTargetGroupObj.options[0]?.value || '')}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          draftTargetOption
                            ? 'bg-amber-50 border-amber-400 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="block font-bold">A Specific Choice Only</span>
                        <span className="text-[11px] text-slate-500">Keep group visible, toggle single choice</span>
                      </button>
                    </div>

                    {draftTargetOption && (
                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-bold text-slate-800">Select Choice to {draftActionType}</label>
                        <select
                          value={draftTargetOption}
                          onChange={(e) => setDraftTargetOption(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold"
                        >
                          {currentTargetGroupObj.options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. DISABLE / ENABLE SPECIFIC CHOICE */}
                {(draftActionType === 'DISABLE' || draftActionType === 'ENABLE') && currentTargetGroupObj && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-800">
                      Choice to {draftActionType === 'DISABLE' ? 'Disable' : 'Enable'}
                    </label>
                    <select
                      value={draftTargetOption || currentTargetGroupObj.options[0]?.value}
                      onChange={(e) => setDraftTargetOption(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900"
                    >
                      {currentTargetGroupObj.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>

                    {draftActionType === 'DISABLE' && (
                      <div className="space-y-1 pt-1">
                        <label className="text-xs font-bold text-slate-800">Reason Shown to Customer (Tooltip)</label>
                        <input
                          type="text"
                          value={draftDisabledReason}
                          onChange={(e) => setDraftDisabledReason(e.target.value)}
                          placeholder={`Not available when ${currentTriggerGroupObj?.name || 'this option'} is selected.`}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 4. SET DEFAULT */}
                {draftActionType === 'SET_DEFAULT' && currentTargetGroupObj && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Option to automatically pre-select for '{currentTargetGroupObj.name}'
                    </label>
                    <select
                      value={draftDefaultValue || currentTargetGroupObj.options[0]?.value}
                      onChange={(e) => setDraftDefaultValue(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900"
                    >
                      {currentTargetGroupObj.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} (Default)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 5. INVALID COMBINATION ERROR MESSAGE */}
                {draftActionType === 'INVALID_COMBINATION' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Customer Error Notice <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={draftErrorMessage}
                      onChange={(e) => setDraftErrorMessage(e.target.value)}
                      placeholder="e.g. This material cannot be printed double-sided. Please select single-sided or change the material."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900"
                    />
                  </div>
                )}

                {/* 6. CHARGES */}
                {draftActionType === 'APPLY_CHARGE' && (
                  <div className="space-y-4 p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Surcharge Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={chargeName}
                          onChange={(e) => setChargeName(e.target.value)}
                          placeholder="e.g. Heavy Material Handling Fee"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Amount (₹) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={chargeAmount}
                          onChange={(e) => setChargeAmount(e.target.value)}
                          placeholder="150"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Calculation Type</label>
                      <select
                        value={chargeType}
                        onChange={(e) => setChargeType(e.target.value as any)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900"
                      >
                        <option value="FIXED">₹ Fixed Amount (one-time fee)</option>
                        <option value="PER_UNIT">₹ Per Unit Rate (multiplies by quantity)</option>
                        <option value="PERCENTAGE">% Percentage of Base Price</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 7. ARTWORK SLOTS */}
                {(draftActionType === 'CONFIGURE_ARTWORK' || draftActionType === 'REQUIRE_ARTWORK_FILES') && (
                  <div className="space-y-4 p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">Upload Slots Required</label>
                        <select
                          value={slotCount}
                          onChange={(e) => {
                            const c = Number(e.target.value);
                            setSlotCount(c);
                            if (c === 2) setSlotLabels(['Front Side', 'Back Side']);
                            else if (c === 1) setSlotLabels(['Production Artwork']);
                            else setSlotLabels(Array.from({ length: c }, (_, i) => `Artwork File ${i + 1}`));
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n} File Slot{n > 1 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">Upload Obligation</label>
                        <select
                          value={artworkStatus}
                          onChange={(e) => setArtworkStatus(e.target.value as any)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                        >
                          <option value="REQUIRED">Mandatory (Customer must upload to order)</option>
                          <option value="OPTIONAL">Optional (Customer can upload or skip)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">Slot Names / Labels</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {slotLabels.map((lbl, i) => (
                          <input
                            key={i}
                            type="text"
                            value={lbl}
                            onChange={(e) => {
                              const copy = [...slotLabels];
                              copy[i] = e.target.value;
                              setSlotLabels(copy);
                            }}
                            placeholder={`Slot ${i + 1} Name`}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 5: PREVIEW, VALIDATION & SAVE                             */}
            {/* ------------------------------------------------------------- */}
            {activeStep === 5 && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Natural Language Summary Card */}
                <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-300 rounded-2xl shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold uppercase tracking-wider text-[11px]">
                    <RiSparklingFill className="w-4 h-4 text-amber-500" />
                    <span>Plain English Rule Summary</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 leading-relaxed font-sans">
                    {currentDraftSummary}
                  </p>
                </div>

                {/* Rule Name Field */}
                <div className="space-y-1.5 p-4 bg-white border border-slate-200 rounded-xl">
                  <label className="block text-xs font-bold text-slate-800">
                    Rule Name / Admin Identifier <span className="text-slate-400 font-normal">(optional, will auto-generate if empty)</span>
                  </label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder={currentDraftSummary.slice(0, 70)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium"
                  />
                </div>

                {/* Live Customer Preview Panel */}
                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <RiShieldCheckLine className="w-4 h-4 text-emerald-600" />
                    <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Live Customer Preview (What Customers Will Experience)
                    </h5>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 block">When trigger matches:</span>
                      <span className="text-slate-600">
                        Customer chooses <strong>{draftTriggerValues.join(', ') || 'any choice'}</strong> for <strong>{currentTriggerGroupObj?.name}</strong>.
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 block">Immediate Storefront Effect:</span>
                      {draftActionType === 'RESTRICT_OPTIONS' ? (
                        <span className="text-purple-900 font-medium">
                          Only {draftAllowedValues.join(', ') || 'selected choices'} stay enabled in {currentTargetGroupObj?.name}.
                        </span>
                      ) : draftActionType === 'HIDE' ? (
                        <span className="text-slate-700 font-medium">
                          {draftTargetOption ? `Choice '${draftTargetOption}'` : currentTargetGroupObj?.name} vanishes from view.
                        </span>
                      ) : draftActionType === 'DISABLE' ? (
                        <span className="text-amber-900 font-medium">
                          Choice '{draftTargetOption}' is greyed out with tooltip: "{draftDisabledReason || 'Unavailable'}".
                        </span>
                      ) : draftActionType === 'SET_DEFAULT' ? (
                        <span className="text-emerald-900 font-medium">
                          {currentTargetGroupObj?.name} switches automatically to '{draftDefaultValue || draftTargetOption}'.
                        </span>
                      ) : draftActionType === 'INVALID_COMBINATION' ? (
                        <span className="text-rose-900 font-medium">
                          Checkout button is disabled with error: "{draftErrorMessage || 'Prohibited selection'}".
                        </span>
                      ) : draftActionType === 'APPLY_CHARGE' ? (
                        <span className="text-blue-900 font-medium">
                          Total price increases by +₹{chargeAmount} ({chargeName || 'Surcharge'}).
                        </span>
                      ) : (
                        <span className="text-slate-700">Dynamic rule action applied.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Validation Warnings Box */}
                {validationWarnings.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <RiAlertLine className="w-4 h-4 text-amber-600" />
                      <span>Items Requiring Attention Before Saving</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-amber-800">
                      {validationWarnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* COLLAPSIBLE ADVANCED SETTINGS (Priority & Multi-Conditions)   */}
            {/* ------------------------------------------------------------- */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 transition cursor-pointer"
              >
                <span>Advanced Rules & Multi-Conditions</span>
                {showAdvanced ? <RiArrowUpSLine className="w-4 h-4" /> : <RiArrowDownSLine className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="p-4 space-y-4 border-t border-slate-200 animate-in fade-in duration-150">
                  {/* Priority Setting */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-xs font-bold text-slate-800">Rule Precedence / Priority</label>
                      <span className="text-[11px] text-slate-500">
                        Higher numbers evaluate first if another rule conflicts with this one.
                      </span>
                    </div>
                    <input
                      type="number"
                      value={draftPriority}
                      onChange={(e) => setDraftPriority(Number(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                    />
                  </div>

                  {/* Secondary Conditions Builder */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-bold text-slate-800">Compound Conditions (AND / OR)</span>
                        <span className="text-[11px] text-slate-500">
                          Add multiple conditions (e.g. IF Material is Cotton AND Size is Large)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={logicalOperator}
                          onChange={(e) => setLogicalOperator(e.target.value as any)}
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold font-mono"
                        >
                          <option value="AND">Match ALL (AND)</option>
                          <option value="OR">Match ANY (OR)</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setSecondaryConditions((prev) => [
                              ...prev,
                              {
                                id: `sec-${Date.now()}`,
                                groupCode: optionGroups[1]?.code || optionGroups[0]?.code || '',
                                operator: 'IN',
                                optionValues: [],
                              },
                            ]);
                          }}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer"
                        >
                          + Add Condition
                        </button>
                      </div>
                    </div>

                    {secondaryConditions.map((sc, i) => {
                      const scGrp = optionGroups.find((g) => g.code === sc.groupCode);
                      return (
                        <div key={sc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold font-mono text-amber-800">
                              Condition #{i + 2} ({logicalOperator})
                            </span>
                            <button
                              type="button"
                              onClick={() => setSecondaryConditions((prev) => prev.filter((item) => item.id !== sc.id))}
                              className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={sc.groupCode}
                              onChange={(e) => {
                                const newCode = e.target.value;
                                setSecondaryConditions((prev) =>
                                  prev.map((item) => (item.id === sc.id ? { ...item, groupCode: newCode, optionValues: [] } : item))
                                );
                              }}
                              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                            >
                              {optionGroups.map((g) => (
                                <option key={g.code} value={g.code}>
                                  {g.name}
                                </option>
                              ))}
                            </select>

                            <select
                              value={sc.operator}
                              onChange={(e) => {
                                const op = e.target.value;
                                setSecondaryConditions((prev) =>
                                  prev.map((item) => (item.id === sc.id ? { ...item, operator: op } : item))
                                );
                              }}
                              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                            >
                              <option value="IN">is any of</option>
                              <option value="EQUALS">is exactly</option>
                              <option value="NOT_EQUALS">is not</option>
                            </select>
                          </div>

                          {scGrp && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {scGrp.options.map((opt) => {
                                const isChecked = sc.optionValues.includes(opt.value);
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      setSecondaryConditions((prev) =>
                                        prev.map((item) => {
                                          if (item.id !== sc.id) return item;
                                          const nextVals = isChecked
                                            ? item.optionValues.filter((v) => v !== opt.value)
                                            : [...item.optionValues, opt.value];
                                          return { ...item, optionValues: nextVals };
                                        })
                                      );
                                    }}
                                    className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                                      isChecked
                                        ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold'
                                        : 'bg-white border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Modal Footer with Step Navigation & Save */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {activeStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveStep((prev) => prev - 1)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    Back
                  </button>
                )}

                {activeStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setActiveStep((prev) => prev + 1)}
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-950 hover:bg-slate-800 rounded-xl cursor-pointer"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveRule}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-black text-slate-950 bg-[#FFED00] hover:bg-[#F2E100] border border-amber-400 rounded-xl shadow-xs cursor-pointer active:scale-95 transition"
                  >
                    <RiCheckLine className="w-4 h-4" />
                    <span>{editingIndex !== null ? 'Save Changes' : 'Save Rule'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
