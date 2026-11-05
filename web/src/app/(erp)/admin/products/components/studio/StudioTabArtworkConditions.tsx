'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  RiFileTextLine,
  RiInformationLine,
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiSettings4Line,
  RiAddLine,
  RiDeleteBin7Line,
  RiSparklingFill,
  RiFilter3Line,
  RiArrowRightLine,
  RiShieldCheckLine,
  RiPaletteLine,
  RiUploadCloud2Line,
  RiEqualizerLine,
  RiRefreshLine,
} from 'react-icons/ri';
import { ProductConfigurationRule, ProductOptionGroup, ProductOptionRequirement } from '@/lib/api';
import { Modal } from '@/components/ui';
import { StudioTab } from './StudioTabReview';
import {
  ArtworkSlotConfig,
  normalizeKey,
  validateArtworkConditions,
  ArtworkConditionConflict,
} from '@/lib/artwork-rule-resolver';

export interface StudioTabArtworkConditionsProps {
  rules: ProductConfigurationRule[];
  setRules: React.Dispatch<React.SetStateAction<ProductConfigurationRule[]>>;
  optionGroups: ProductOptionGroup[];
  artworkRequirement?: ProductOptionRequirement;
  setArtworkRequirement?: (v: ProductOptionRequirement) => void;
  artworkFileFormats?: string[];
  setArtworkFileFormats?: (v: string[]) => void;
  maxArtworkFileSizeMb?: number;
  setMaxArtworkFileSizeMb?: (v: number) => void;
  minimumArtworkMegapixels?: number;
  setMinimumArtworkMegapixels?: (v: number) => void;
  designServiceRequirement?: ProductOptionRequirement;
  setDesignServiceRequirement?: (v: ProductOptionRequirement) => void;
  designServiceFee?: number | string;
  setDesignServiceFee?: (v: number | string) => void;
  onNavigateToTab?: (tab: StudioTab) => void;
  onChange?: () => void;
}

const ALL_FORMATS = ['PDF', 'AI', 'PSD', 'CDR', 'TIFF', 'PNG', 'JPG'];

export function StudioTabArtworkConditions({
  rules,
  setRules,
  optionGroups,
  artworkRequirement = 'OPTIONAL',
  setArtworkRequirement,
  artworkFileFormats = ['PDF', 'AI', 'PSD', 'CDR', 'TIFF', 'PNG', 'JPG'],
  setArtworkFileFormats,
  maxArtworkFileSizeMb = 50,
  setMaxArtworkFileSizeMb,
  minimumArtworkMegapixels = 1.5,
  setMinimumArtworkMegapixels,
  designServiceRequirement = 'DISABLED',
  setDesignServiceRequirement,
  designServiceFee = 150,
  setDesignServiceFee,
  onNavigateToTab,
  onChange,
}: StudioTabArtworkConditionsProps) {
  // ---------------------------------------------------------------------------
  // 1. CONDITION GROUP SELECTION
  // Identify which product-specific option groups influence artwork requirements
  // ---------------------------------------------------------------------------
  const [selectedGroupCodes, setSelectedGroupCodes] = useState<string[]>(() => {
    // Check if existing rules already reference specific controlling groups
    const referenced = new Set<string>();
    for (const r of rules) {
      const p = (r.actionPayload as any) || {};
      if (p.conditionCombination && typeof p.conditionCombination === 'object') {
        for (const k of Object.keys(p.conditionCombination)) {
          if (optionGroups.some((g) => g.code === k)) referenced.add(k);
        }
      } else if (
        r.actionType === 'REQUIRE_ARTWORK_FILES' ||
        r.actionType === 'CONFIGURE_ARTWORK' ||
        r.actionType === 'ARTWORK_CONDITIONS'
      ) {
        if (optionGroups.some((g) => g.code === r.conditionGroupCode)) {
          referenced.add(r.conditionGroupCode);
        }
      }
    }
    if (referenced.size > 0) return Array.from(referenced);

    // Heuristic: automatically select printing location & design service groups ONLY if explicitly present
    const auto: string[] = [];
    for (const g of optionGroups) {
      const c = g.code.toLowerCase();
      const n = g.name.toLowerCase();
      const isSideOrLocation =
        c.includes('location') ||
        c.includes('side') ||
        c.includes('print_side') ||
        c.includes('printing_side') ||
        c.includes('print_location') ||
        n.includes('location') ||
        n.includes('side');
      const isDesignOrArtwork =
        c.includes('design') ||
        n.includes('design') ||
        c.includes('artwork') ||
        n.includes('artwork');

      if (isSideOrLocation || isDesignOrArtwork) {
        if (!auto.includes(g.code)) auto.push(g.code);
      }
    }
    // If no design or artwork related groups exist, DO NOT select default groups
    return auto;
  });

  const controllingGroups = useMemo(() => {
    return optionGroups.filter((g) => selectedGroupCodes.includes(g.code) && g.isActive);
  }, [optionGroups, selectedGroupCodes]);

  const toggleConditionGroup = (code: string) => {
    setSelectedGroupCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // ---------------------------------------------------------------------------
  // 1.5. DESIGN PRICING & SUPPORTED SCOPES CONFIGURATION
  // Dynamically inspect product option groups to detect supported design scopes
  // ---------------------------------------------------------------------------
  const supportedScopes = useMemo(() => {
    // 1. Check if design_scope option group exists
    const scopeGroup = optionGroups.find((g) => g.code === 'design_scope');
    const activeScopeOpts = scopeGroup ? scopeGroup.options.filter((o) => o.isActive !== false) : [];
    if (scopeGroup && activeScopeOpts.length > 0) {
      return activeScopeOpts.map((opt) => ({
        code: opt.value,
        label: opt.label,
        groupCode: scopeGroup.code,
      }));
    }

    // 2. Check printing location group
    const locationGroup = optionGroups.find((g) => {
      const c = g.code.toLowerCase();
      return c.includes('location') || c.includes('side') || c.includes('print');
    });

    const activeLocOpts = locationGroup ? locationGroup.options.filter((o) => o.isActive !== false) : [];
    if (locationGroup && activeLocOpts.length > 0) {
      const list: Array<{ code: string; label: string; groupCode: string }> = [];
      const hasFront = activeLocOpts.some((o) => o.value.toLowerCase().includes('front'));
      const hasBack = activeLocOpts.some((o) => o.value.toLowerCase().includes('back'));
      const hasBoth = activeLocOpts.some((o) =>
        o.value.toLowerCase().includes('both') ||
        o.value.toLowerCase().includes('double') ||
        o.value.toLowerCase().includes('2')
      );

      if (hasFront) list.push({ code: 'front', label: 'Front Design', groupCode: locationGroup.code });
      if (hasBack) list.push({ code: 'back', label: 'Back Design', groupCode: locationGroup.code });
      if (hasBoth) list.push({ code: 'full', label: 'Full Design (Both Sides)', groupCode: locationGroup.code });

      if (list.length > 0) return list;
    }

    // Default standard scopes
    return [
      { code: 'front', label: 'Front Design', groupCode: 'standard' },
      { code: 'back', label: 'Back Design', groupCode: 'standard' },
      { code: 'full', label: 'Full Design (Both Sides)', groupCode: 'standard' },
    ];
  }, [optionGroups]);

  // Per-scope amounts state
  const [scopeAmounts, setScopeAmounts] = useState<Record<string, { enabled: boolean; amount: number | string }>>(() => {
    const init: Record<string, { enabled: boolean; amount: number | string }> = {
      front: { enabled: true, amount: 150 },
      back: { enabled: true, amount: 150 },
      full: { enabled: true, amount: Number(designServiceFee) || 250 },
    };

    // Populate from existing rules
    for (const r of rules) {
      const p = (r.actionPayload as any) || {};
      if (p.designScope && p.designFee !== undefined) {
        init[p.designScope] = {
          enabled: p.designFeeEnabled !== false,
          amount: Number(p.designFee),
        };
      }
    }
    return init;
  });

  const handleUpdateScopeAmount = (scopeCode: string, field: 'enabled' | 'amount', value: any) => {
    setScopeAmounts((prev) => ({
      ...prev,
      [scopeCode]: {
        ...(prev[scopeCode] || { enabled: true, amount: 150 }),
        [field]: value,
      },
    }));
    onChange?.();
  };

  // ---------------------------------------------------------------------------
  // 2. COMBINATION GENERATOR
  // Generate Cartesian product rows of the selected controlling groups
  // ---------------------------------------------------------------------------
  const combinations = useMemo(() => {
    if (controllingGroups.length === 0) return [];

    let current: Array<Record<string, string>> = [{}];
    for (const group of controllingGroups) {
      const next: Array<Record<string, string>> = [];
      const validOptions = group.options.filter((o) => o.isActive !== false);
      if (validOptions.length === 0) continue;

      for (const existing of current) {
        for (const opt of validOptions) {
          next.push({
            ...existing,
            [group.code]: opt.value,
          });
        }
      }
      current = next;
    }

    return current;
  }, [controllingGroups]);

  // ---------------------------------------------------------------------------
  // 3. COMBINATION ROW MATCHING & RULE FINDER
  // Find which rule corresponds to each generated combination
  // ---------------------------------------------------------------------------
  const getRuleForCombination = (combo: Record<string, string>): ProductConfigurationRule | null => {
    return (
      rules.find((r) => {
        if (!r.isActive) return false;
        const isArtRule =
          r.actionType === 'ARTWORK_CONDITIONS' ||
          r.actionType === 'REQUIRE_ARTWORK_FILES' ||
          r.actionType === 'CONFIGURE_ARTWORK';
        if (!isArtRule) return false;

        const payload = (r.actionPayload as any) || {};
        if (payload.conditionCombination && typeof payload.conditionCombination === 'object') {
          const ruleCombo = payload.conditionCombination;
          const ruleKeys = Object.keys(ruleCombo);
          if (ruleKeys.length !== Object.keys(combo).length) return false;
          return ruleKeys.every(
            (k) => normalizeKey(ruleCombo[k]) === normalizeKey(combo[k])
          );
        }

        // Single-group legacy match
        if (Object.keys(combo).length === 1 && combo[r.conditionGroupCode]) {
          return normalizeKey(combo[r.conditionGroupCode]) === normalizeKey(r.conditionOptionValue);
        }

        return false;
      }) || null
    );
  };

  // ---------------------------------------------------------------------------
  // 4. ROW EDIT MODAL STATE & ACTIONS
  // ---------------------------------------------------------------------------
  const [editingCombo, setEditingCombo] = useState<Record<string, string> | null>(null);
  const [rowStatus, setRowStatus] = useState<ProductOptionRequirement>('REQUIRED');
  const [rowSlotCount, setRowSlotCount] = useState<number>(1);
  const [rowSlotLabels, setRowSlotLabels] = useState<string[]>(['Front Side']);
  const [rowRequiredSlots, setRowRequiredSlots] = useState<string[]>([]);
  const [rowHiddenSlots, setRowHiddenSlots] = useState<string[]>([]);
  const [rowRequireDesignBrief, setRowRequireDesignBrief] = useState<boolean>(false);
  const [rowShowDesignBrief, setRowShowDesignBrief] = useState<boolean>(false);
  const [rowRequireReferenceImage, setRowRequireReferenceImage] = useState<boolean>(false);
  const [rowShowReferenceImage, setRowShowReferenceImage] = useState<boolean>(true);
  const [rowMaxFileSizeMb, setRowMaxFileSizeMb] = useState<number>(maxArtworkFileSizeMb);
  const [rowMinMegapixels, setRowMinMegapixels] = useState<number>(minimumArtworkMegapixels);
  const [rowFormats, setRowFormats] = useState<string[]>(artworkFileFormats);
  const [rowDesignFeeEnabled, setRowDesignFeeEnabled] = useState<boolean>(false);
  const [rowDesignFee, setRowDesignFee] = useState<number | string>(0);
  const [rowDesignScope, setRowDesignScope] = useState<string>('');
  const [rowCustomerSuppliedSides, setRowCustomerSuppliedSides] = useState<string[]>([]);
  const [rowFormError, setRowFormError] = useState<string | null>(null);

  const handleOpenEditModal = (combo: Record<string, string>) => {
    setEditingCombo(combo);
    setRowFormError(null);

    const existingRule = getRuleForCombination(combo);
    if (existingRule) {
      const p = (existingRule.actionPayload as any) || {};
      setRowStatus(p.artworkStatus || 'REQUIRED');
      const count = Number(p.slotCount) || (Array.isArray(p.slotLabels) ? p.slotLabels.length : 1);
      setRowSlotCount(count);
      const labels: string[] = Array.isArray(p.slotLabels)
        ? p.slotLabels
        : String(p.slotLabels || '').split(',').map((s) => s.trim()).filter(Boolean);
      setRowSlotLabels(
        labels.length > 0
          ? labels
          : count === 2
          ? ['Front Side', 'Back Side']
          : Array.from({ length: count }, (_, i) => `Artwork File ${i + 1}`)
      );
      setRowRequiredSlots(Array.isArray(p.requiredSlots) ? p.requiredSlots : []);
      setRowHiddenSlots(Array.isArray(p.hiddenSlots) ? p.hiddenSlots : []);
      setRowRequireDesignBrief(Boolean(p.requireDesignBrief));
      setRowShowDesignBrief(p.showDesignBrief !== false && (Boolean(p.requireDesignBrief) || Boolean(p.showDesignBrief)));
      setRowRequireReferenceImage(Boolean(p.requireReferenceImage));
      setRowShowReferenceImage(p.showReferenceImage !== false);
      setRowMaxFileSizeMb(Number(p.maxFileSizeMb) || maxArtworkFileSizeMb);
      setRowMinMegapixels(Number(p.minMegapixels) || minimumArtworkMegapixels);
      setRowFormats(
        Array.isArray(p.acceptedFormats)
          ? p.acceptedFormats
          : typeof p.acceptedFormats === 'string'
          ? p.acceptedFormats.split(',').map((s: string) => s.trim()).filter(Boolean)
          : artworkFileFormats
      );
      setRowDesignFeeEnabled(p.designFeeEnabled !== false && p.designFee !== undefined && Number(p.designFee) > 0);
      setRowDesignFee(p.designFee ?? 0);
      setRowDesignScope(p.designScope || '');
      setRowCustomerSuppliedSides(Array.isArray(p.customerSuppliedSides) ? p.customerSuppliedSides : []);
    } else {
      // Intelligently infer starter values based on combo values
      const comboVals = Object.values(combo).map((v) => v.toLowerCase());
      const hasBoth = comboVals.some((v) => v.includes('both') || v.includes('2') || v.includes('double'));
      const hasBackOnly = comboVals.some((v) => v.includes('back'));
      const hasDesignYes = comboVals.some((v) => v === 'yes' || v.includes('required') || v.includes('assist') || v.includes('full'));

      if (hasDesignYes) {
        setRowStatus('OPTIONAL');
        setRowSlotCount(0);
        setRowSlotLabels([]);
        setRowRequireDesignBrief(true);
        setRowShowDesignBrief(true);
        setRowRequireReferenceImage(false);
        setRowShowReferenceImage(true);
        setRowDesignFeeEnabled(true);
        if (hasBoth) {
          setRowDesignScope('full');
          setRowDesignFee(scopeAmounts['full']?.amount ?? 250);
        } else if (hasBackOnly) {
          setRowDesignScope('back');
          setRowDesignFee(scopeAmounts['back']?.amount ?? 150);
        } else {
          setRowDesignScope('front');
          setRowDesignFee(scopeAmounts['front']?.amount ?? 150);
        }
        setRowCustomerSuppliedSides([]);
      } else if (hasBoth) {
        setRowStatus('REQUIRED');
        setRowSlotCount(2);
        setRowSlotLabels(['Front Side', 'Back Side']);
        setRowRequireDesignBrief(false);
        setRowShowDesignBrief(false);
        setRowRequireReferenceImage(false);
        setRowShowReferenceImage(false);
        setRowDesignFeeEnabled(false);
        setRowDesignFee(0);
        setRowDesignScope('');
        setRowCustomerSuppliedSides(['Front Side', 'Back Side']);
      } else if (hasBackOnly) {
        setRowStatus('REQUIRED');
        setRowSlotCount(1);
        setRowSlotLabels(['Back Side']);
        setRowRequireDesignBrief(false);
        setRowShowDesignBrief(false);
        setRowRequireReferenceImage(false);
        setRowShowReferenceImage(false);
        setRowDesignFeeEnabled(false);
        setRowDesignFee(0);
        setRowDesignScope('');
        setRowCustomerSuppliedSides(['Back Side']);
      } else {
        setRowStatus('REQUIRED');
        setRowSlotCount(1);
        setRowSlotLabels(['Front Side']);
        setRowRequireDesignBrief(false);
        setRowShowDesignBrief(false);
        setRowRequireReferenceImage(false);
        setRowShowReferenceImage(false);
        setRowDesignFeeEnabled(false);
        setRowDesignFee(0);
        setRowDesignScope('');
        setRowCustomerSuppliedSides(['Front Side']);
      }

      setRowRequiredSlots([]);
      setRowHiddenSlots([]);
      setRowMaxFileSizeMb(maxArtworkFileSizeMb);
      setRowMinMegapixels(minimumArtworkMegapixels);
      setRowFormats(artworkFileFormats);
    }
  };

  const handleSaveRowModal = () => {
    if (!editingCombo) return;

    if (rowStatus === 'REQUIRED' && rowSlotCount <= 0) {
      setRowFormError('Artwork is marked REQUIRED, but 0 upload slots are configured.');
      return;
    }

    if (Number(rowDesignFee) < 0) {
      setRowFormError('Design service amount cannot be negative.');
      return;
    }

    const firstGroupCode = Object.keys(editingCombo)[0] || 'artwork';
    const firstGroupVal = editingCombo[firstGroupCode] || 'default';
    const comboTitle = Object.entries(editingCombo)
      .map(([k, v]) => `${k}:${v}`)
      .join(' | ');

    const newRule: ProductConfigurationRule = {
      id: `rule-art-${Date.now()}`,
      productId: '',
      name: `Artwork Condition [${comboTitle}]`,
      conditionGroupCode: firstGroupCode,
      conditionOperator: 'EQUALS',
      conditionOptionValue: firstGroupVal,
      actionType: 'ARTWORK_CONDITIONS',
      targetGroupCode: null,
      targetOptionValue: null,
      isActive: true,
      actionPayload: {
        conditionCombination: editingCombo,
        artworkStatus: rowStatus,
        slotCount: rowSlotCount,
        slotLabels: rowSlotLabels.slice(0, rowSlotCount),
        requiredSlots: rowRequiredSlots,
        hiddenSlots: rowHiddenSlots,
        requireDesignBrief: rowRequireDesignBrief,
        showDesignBrief: rowShowDesignBrief,
        requireReferenceImage: rowRequireReferenceImage,
        showReferenceImage: rowShowReferenceImage,
        maxFileSizeMb: rowMaxFileSizeMb,
        minMegapixels: rowMinMegapixels,
        acceptedFormats: rowFormats,
        designFee: rowDesignFeeEnabled ? Number(rowDesignFee) || 0 : 0,
        designFeeEnabled: rowDesignFeeEnabled,
        designScope: rowDesignScope || undefined,
        customerSuppliedSides: rowCustomerSuppliedSides,
      },
    };

    setRules((prev) => {
      // Remove any existing rule matching this exact combination
      const filtered = prev.filter((r) => {
        const p = (r.actionPayload as any) || {};
        if (p.conditionCombination && typeof p.conditionCombination === 'object') {
          const ruleCombo = p.conditionCombination;
          const ruleKeys = Object.keys(ruleCombo);
          if (ruleKeys.length !== Object.keys(editingCombo).length) return true;
          return !ruleKeys.every(
            (k) => normalizeKey(ruleCombo[k]) === normalizeKey(editingCombo[k])
          );
        }
        return true;
      });
      return [...filtered, newRule];
    });

    setEditingCombo(null);
    onChange?.();
  };

  // ---------------------------------------------------------------------------
  // 5. AUTO-APPLY STANDARD PRINTING PRESETS (SECTION 3.C)
  // Automatically configure all rows following the exact business rules:
  // - Design Required = No:
  //   * Front -> Front Side (Required)
  //   * Back -> Back Side (Required)
  //   * Both -> Front Side & Back Side (Required)
  // - Design Required = Yes:
  //   * Design brief required, no customer final artwork
  // ---------------------------------------------------------------------------
  const handleApplyStandardDefaults = () => {
    if (combinations.length === 0) {
      alert('Please select at least one artwork or design controlling group above (e.g. Printing Side, Design Required) before applying presets.');
      return;
    }

    const newRules: ProductConfigurationRule[] = [];

    for (let i = 0; i < combinations.length; i++) {
      const combo = combinations[i];
      const comboVals = Object.entries(combo).map(([k, v]) => ({
        groupCode: k.toLowerCase(),
        val: v.toLowerCase(),
        originalVal: v,
      }));

      const designEntry = comboVals.find(
        (e) => e.groupCode.includes('design') || e.val === 'yes' || e.val === 'no'
      );
      const isDesignYes = designEntry
        ? designEntry.val === 'yes' || designEntry.val.includes('required') || designEntry.val.includes('assist')
        : false;

      const locationEntry = comboVals.find(
        (e) =>
          e.groupCode.includes('location') ||
          e.groupCode.includes('side') ||
          e.groupCode.includes('print') ||
          e.val.includes('front') ||
          e.val.includes('back') ||
          e.val.includes('both')
      );

      const locVal = locationEntry ? locationEntry.val : '';

      let status: ProductOptionRequirement = 'REQUIRED';
      let slotCount = 1;
      let slotLabels = ['Front Side'];
      let reqBrief = false;
      let showBrief = false;
      let reqRef = false;
      let showRef = true;
      let fee = 0;
      let feeEnabled = false;
      let designScope = '';
      let customerSuppliedSides: string[] = [];

      if (isDesignYes) {
        // Design Required = Yes
        status = 'OPTIONAL';
        reqBrief = true;
        showBrief = true;
        reqRef = false;
        showRef = true;
        feeEnabled = true;

        if (locVal.includes('both') || locVal.includes('2') || locVal.includes('double')) {
          designScope = 'full';
          fee = Number(scopeAmounts['full']?.amount ?? designServiceFee ?? 250);
          slotCount = 0;
          slotLabels = [];
          customerSuppliedSides = [];
        } else if (locVal.includes('back')) {
          designScope = 'back';
          fee = Number(scopeAmounts['back']?.amount ?? 150);
          slotCount = 0;
          slotLabels = [];
          customerSuppliedSides = [];
        } else {
          designScope = 'front';
          fee = Number(scopeAmounts['front']?.amount ?? 150);
          slotCount = 0;
          slotLabels = [];
          customerSuppliedSides = [];
        }
      } else {
        // Design Required = No
        reqBrief = false;
        showBrief = false;
        reqRef = false;
        showRef = false;
        status = 'REQUIRED';
        fee = 0;
        feeEnabled = false;
        designScope = '';

        if (locVal.includes('both') || locVal.includes('2') || locVal.includes('double')) {
          slotCount = 2;
          slotLabels = ['Front Side', 'Back Side'];
          customerSuppliedSides = ['Front Side', 'Back Side'];
        } else if (locVal.includes('back')) {
          slotCount = 1;
          slotLabels = ['Back Side'];
          customerSuppliedSides = ['Back Side'];
        } else {
          slotCount = 1;
          slotLabels = ['Front Side'];
          customerSuppliedSides = ['Front Side'];
        }
      }

      const firstGroupCode = Object.keys(combo)[0] || 'artwork';
      const firstGroupVal = combo[firstGroupCode] || 'default';
      const comboTitle = Object.entries(combo)
        .map(([k, v]) => `${k}:${v}`)
        .join(' | ');

      newRules.push({
        id: `rule-std-art-${Date.now()}-${i}`,
        productId: '',
        name: `Artwork [${comboTitle}]`,
        conditionGroupCode: firstGroupCode,
        conditionOperator: 'EQUALS',
        conditionOptionValue: firstGroupVal,
        actionType: 'ARTWORK_CONDITIONS',
        targetGroupCode: null,
        targetOptionValue: null,
        isActive: true,
        actionPayload: {
          conditionCombination: combo,
          artworkStatus: status,
          slotCount,
          slotLabels,
          requiredSlots: [],
          hiddenSlots: [],
          requireDesignBrief: reqBrief,
          showDesignBrief: showBrief,
          requireReferenceImage: reqRef,
          showReferenceImage: showRef,
          maxFileSizeMb: maxArtworkFileSizeMb,
          minMegapixels: minimumArtworkMegapixels,
          acceptedFormats: artworkFileFormats,
          designFee: fee,
          designFeeEnabled: feeEnabled,
          designScope: designScope || undefined,
          customerSuppliedSides,
        },
      });
    }

    setRules((prev) => {
      // Keep non-artwork rules
      const nonArtwork = prev.filter(
        (r) =>
          r.actionType !== 'ARTWORK_CONDITIONS' &&
          r.actionType !== 'REQUIRE_ARTWORK_FILES' &&
          r.actionType !== 'CONFIGURE_ARTWORK'
      );
      return [...nonArtwork, ...newRules];
    });

    onChange?.();
  };

  // ---------------------------------------------------------------------------
  // 6. REAL-TIME DETERMINISTIC VALIDATION & CONFLICTS (SECTION 3.E)
  // ---------------------------------------------------------------------------
  const { errors: conflictErrors, warnings: conflictWarnings } = useMemo(() => {
    return validateArtworkConditions(rules, optionGroups);
  }, [rules, optionGroups]);

  // Check unconfigured combinations
  const unconfiguredCount = useMemo(() => {
    let unconfigured = 0;
    for (const combo of combinations) {
      if (!getRuleForCombination(combo)) unconfigured++;
    }
    return unconfigured;
  }, [combinations, rules]);

  return (
    <div className="w-full space-y-6">
      {/* Informational Header */}
      <div className="p-4 bg-indigo-50/80 border border-indigo-200/90 rounded-xl text-indigo-950 text-xs flex items-start gap-3 shadow-2xs">
        <RiInformationLine className="w-5 h-5 shrink-0 text-indigo-600 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded">
              Stage 4
            </span>
            <span className="font-bold text-sm">
              Artwork Upload & Design Matrix
            </span>
          </div>
          <p className="text-[11px] text-indigo-900/90 leading-relaxed">
            Configure customer upload requirements, print slots (e.g. Front Side, Back Side), allowed file extensions, max file sizes, and design service fees per option combination.
          </p>
        </div>
      </div>

      {/* 1. Condition Groups Selector */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <RiFilter3Line className="w-4 h-4 text-amber-600" />
              <span>A. Artwork Controlling Groups</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select which option groups determine customer artwork uploads and design briefs.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedGroupCodes.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedGroupCodes([])}
                className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
                title="Deselect all controlling groups"
              >
                Clear Selection
              </button>
            )}

            <button
              type="button"
              onClick={handleApplyStandardDefaults}
              className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] font-bold text-xs px-3.5 py-2 rounded-lg border border-[#E3A008]/40 shadow-2xs transition active:scale-95 shrink-0"
            >
              <RiSparklingFill className="w-3.5 h-3.5 text-amber-700" />
              <span>Apply Standard Print Presets</span>
            </button>
          </div>
        </div>

        {optionGroups.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
            No option groups found. Please configure groups in <strong>Step 2 — Groups & Combinations</strong> first.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5 pt-1">
            {optionGroups.map((group) => {
              const isSelected = selectedGroupCodes.includes(group.code);
              return (
                <button
                  key={group.id || group.code}
                  type="button"
                  onClick={() => toggleConditionGroup(group.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-amber-100/90 text-amber-950 border-amber-300 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  />
                  <span>{group.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">({group.code})</span>
                  {isSelected && <RiCheckLine className="w-3.5 h-3.5 text-amber-700 ml-0.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Conflict & Validation Alerts */}
      {conflictErrors.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-rose-900 text-xs shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <RiErrorWarningLine className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Artwork Configuration Conflicts Detected ({conflictErrors.length}):</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-rose-700">
            {conflictErrors.map((err, idx) => (
              <li key={idx}>
                <strong>{err.ruleName}:</strong> {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. Combination-Based Artwork Rule Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <RiEqualizerLine className="w-4 h-4 text-amber-600" />
              <span>B. Combination-Based Artwork Behavior Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact upload requirements and design fees generated for each customer combination.
              {unconfiguredCount > 0 && (
                <span className="ml-2 font-semibold text-amber-600">
                  ({unconfiguredCount} combination{unconfiguredCount > 1 ? 's' : ''} using default behavior)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span>Total combinations: {combinations.length}</span>
          </div>
        </div>

        {combinations.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <RiFilter3Line className="w-5 h-5" />
            </div>
            <div className="font-semibold text-slate-800 text-sm">No Artwork Controlling Groups Selected</div>
            <p className="text-slate-500 max-w-md mx-auto text-xs leading-relaxed">
              This product will use global artwork settings (Policy: <strong className="text-slate-700">{artworkRequirement}</strong>). If upload slots or design fees depend on specific choices (e.g., Printing Side, Design Required), select one or more groups in Section A above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  {controllingGroups.map((g) => (
                    <th key={g.code} className="p-3.5 whitespace-nowrap">
                      {g.name}
                    </th>
                  ))}
                  <th className="p-3.5">Artwork Policy</th>
                  <th className="p-3.5">Design Fee (₹)</th>
                  <th className="p-3.5">Upload Slots</th>
                  <th className="p-3.5">File Specs</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combinations.map((combo, idx) => {
                  const rule = getRuleForCombination(combo);
                  const payload = (rule?.actionPayload as any) || {};
                  const isConfigured = Boolean(rule);
                  const status = payload.artworkStatus || (isConfigured ? 'REQUIRED' : 'OPTIONAL');
                  const count = Number(payload.slotCount) ?? (isConfigured ? 1 : 1);
                  const labels: string[] = Array.isArray(payload.slotLabels)
                    ? payload.slotLabels
                    : ['Production Artwork File'];
                  const reqBrief = Boolean(payload.requireDesignBrief);
                  const showBrief = Boolean(payload.showDesignBrief);

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => handleOpenEditModal(combo)}
                    >
                      {/* Combination option values */}
                      {controllingGroups.map((g) => {
                        const val = combo[g.code];
                        const opt = g.options.find((o) => o.value === val);
                        return (
                          <td key={g.code} className="p-3.5 font-sans font-bold text-slate-900">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[11px]">
                              {opt?.label || val}
                            </span>
                          </td>
                        );
                      })}

                      {/* Artwork Policy */}
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            status === 'REQUIRED'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : status === 'OPTIONAL'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Design Fee */}
                      <td className="p-3.5">
                        {payload.designFeeEnabled && Number(payload.designFee) > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-950 border border-amber-300 text-[10px] font-bold">
                            <RiPaletteLine className="w-3 h-3 text-amber-700" />
                            ₹{Number(payload.designFee).toFixed(2)}
                            {payload.designScope ? ` (${payload.designScope})` : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No fee (₹0)</span>
                        )}
                      </td>

                      {/* Upload Slots */}
                      <td className="p-3.5">
                        {status === 'DISABLED' || count === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">No uploads required</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {labels.slice(0, count).map((lbl, lIdx) => (
                              <span
                                key={lIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-semibold"
                              >
                                <RiUploadCloud2Line className="w-3 h-3 text-blue-600" />
                                {lbl}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>


                      {/* File Specs */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-600">
                        {status !== 'DISABLED' ? (
                          <span>
                            {payload.minMegapixels || minimumArtworkMegapixels} MP /{' '}
                            {payload.maxFileSizeMb || maxArtworkFileSizeMb} MB
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(combo)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-[#FFED00] text-amber-950 font-bold text-xs border border-amber-300 transition-colors shadow-2xs flex items-center gap-1 ml-auto"
                        >
                          <RiSettings4Line className="w-3.5 h-3.5" />
                          <span>{isConfigured ? 'Edit' : 'Configure'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Step 4 Bottom Navigation Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => {
                onNavigateToTab('RULES');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              ← Back to Step 3: Option Dependencies & Rules
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Step 4 Summary:</span>
          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono text-[11px]">
            Policy: {artworkRequirement}
          </span>
          <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
            {designServiceRequirement === 'DISABLED' ? 'No Design Fee' : `Design Fee: ₹${designServiceFee}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => {
                onNavigateToTab('PRICING');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] font-bold text-xs px-4 py-2.5 rounded-lg border border-[#E3A008]/40 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <span>Next: 5. Pricing</span>
              <RiArrowRightLine className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Row Edit Modal */}
      {editingCombo && (
        <Modal
          isOpen={Boolean(editingCombo)}
          onClose={() => setEditingCombo(null)}
          title="Configure Combination Artwork Behavior"
          maxWidth="3xl"
        >
          <div className="space-y-5 p-1">
            {/* Selected Combination Summary */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">Combination:</span>
              {Object.entries(editingCombo).map(([k, v]) => {
                const grp = optionGroups.find((g) => g.code === k);
                const opt = grp?.options.find((o) => o.value === v);
                return (
                  <span
                    key={k}
                    className="px-2 py-0.5 rounded bg-white border border-slate-300 text-xs font-bold text-slate-900 shadow-2xs"
                  >
                    {grp?.name || k}: <em>{opt?.label || v}</em>
                  </span>
                );
              })}
            </div>

            {rowFormError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <RiErrorWarningLine className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{rowFormError}</span>
              </div>
            )}

            {/* Artwork Policy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Upload Policy
                </label>
                <select
                  value={rowStatus}
                  onChange={(e) => setRowStatus(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="REQUIRED">REQUIRED — Mandatory file upload before checkout</option>
                  <option value="OPTIONAL">OPTIONAL — Customer can upload now or email later</option>
                  <option value="DISABLED">DISABLED — No customer artwork files required</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Upload Slots
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={rowSlotCount}
                  onChange={(e) => {
                    const c = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setRowSlotCount(c);
                    setRowSlotLabels((prev) => {
                      const next = [...prev];
                      while (next.length < c) next.push(`Artwork File ${next.length + 1}`);
                      return next.slice(0, c);
                    });
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Dynamic Slot Labels */}
            {rowSlotCount > 0 && rowStatus !== 'DISABLED' && (
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Upload Slot Labels
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRowSlotCount(1);
                        setRowSlotLabels(['Front Side']);
                      }}
                      className="text-[10px] text-amber-700 hover:underline font-bold"
                    >
                      Single (Front)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRowSlotCount(2);
                        setRowSlotLabels(['Front Side', 'Back Side']);
                      }}
                      className="text-[10px] text-amber-700 hover:underline font-bold"
                    >
                      Two Sides (Front & Back)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: rowSlotCount }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400 w-5">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={rowSlotLabels[idx] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRowSlotLabels((prev) => {
                            const next = [...prev];
                            next[idx] = val;
                            return next;
                          });
                        }}
                        placeholder={`e.g. ${idx === 0 ? 'Front Side' : 'Back Side'}`}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Combination Design Pricing */}
            <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider block">
                Design Service Fee for this Combination
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer self-center">
                  <input
                    type="checkbox"
                    checked={rowDesignFeeEnabled}
                    onChange={(e) => setRowDesignFeeEnabled(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-amber-950">
                    Charge design service fee
                  </span>
                </label>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Design Service Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={!rowDesignFeeEnabled}
                    value={rowDesignFee}
                    onChange={(e) => setRowDesignFee(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Applicable Design Scope
                  </label>
                  <select
                    disabled={!rowDesignFeeEnabled}
                    value={rowDesignScope}
                    onChange={(e) => setRowDesignScope(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Auto / Standard</option>
                    {supportedScopes.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.label} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* File Specifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max File Size Limit (MB)
                </label>
                <input
                  type="number"
                  value={rowMaxFileSizeMb}
                  onChange={(e) => setRowMaxFileSizeMb(parseInt(e.target.value, 10) || 50)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimum Megapixels (MP)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={rowMinMegapixels}
                  onChange={(e) => setRowMinMegapixels(parseFloat(e.target.value) || 1.5)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Allowed Formats */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Permitted File Formats
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_FORMATS.map((fmt) => {
                  const isChecked = rowFormats.includes(fmt);
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => {
                        setRowFormats((prev) =>
                          prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]
                        );
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                        isChecked
                          ? 'bg-amber-100 text-amber-950 border-amber-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {fmt} {isChecked ? '✓' : '+'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingCombo(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveRowModal}
                className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] font-bold text-xs px-4 py-2 rounded-lg border border-[#E3A008]/40 shadow-xs transition active:scale-95"
              >
                <RiCheckLine className="w-4 h-4 text-slate-900" />
                <span>Save Artwork Behavior</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
