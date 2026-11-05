'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  RiTableLine,
  RiAddLine,
  RiDeleteBin7Line,
  RiFilter3Line,
  RiSearch2Line,
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiRefreshLine,
  RiShieldCheckLine,
  RiArrowRightLine,
  RiEditLine,
  RiFileCopyLine,
  RiSparklingFill,
  RiPriceTag3Line,
  RiPaletteLine,
  RiSettings4Line,
  RiCheckboxCircleLine,
  RiAlertFill,
  RiEqualizerLine,
  RiStackLine,
  RiCheckDoubleLine,
  RiLockLine,
  RiScales3Line,
  RiTruckLine,
  RiBox3Line,
} from 'react-icons/ri';
import { ProductOptionGroup, ProductOption, ProductAdditionalPricingTier, api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { resolveArtworkConditions } from '@/lib/artwork-rule-resolver';
import { Modal } from '@/components/ui';
import { StudioTab } from './StudioTabReview';

export interface MatrixRowItem {
  id?: string;
  minQty: number;
  maxQty: number;
  unitPrice: number | string;
  attributeCombination: Record<string, any>;
  isExcluded?: boolean;
  status?: 'ACTIVE' | 'EXCLUDED';
  exclusionReason?: string;
  label?: string;
  discountPercent?: number;
}

export interface AddonQuantityTierItem {
  id: string; // e.g. "1-10" or "100"
  minQty: number;
  maxQty: number;
  label: string; // e.g. "1–10 pcs" or "100 pcs"
}

export function parseQuantityTier(input: string): AddonQuantityTierItem | null {
  const clean = input.trim();
  if (!clean) return null;

  // Range patterns: "1-10", "1 - 10", "1 to 10", "1..10"
  const rangeMatch = clean.match(/^(\d+)\s*(?:-|–|\.\.|to)\s*(\d+)$/i);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    if (min <= 0 || max <= 0 || min > max) return null;
    return {
      minQty: min,
      maxQty: max,
      id: min === max ? `${min}` : `${min}-${max}`,
      label: min === max ? `${min} pcs` : `${min}–${max} pcs`,
    };
  }

  // Single integer number: "100"
  const singleNum = parseInt(clean, 10);
  if (!isNaN(singleNum) && singleNum > 0) {
    return {
      minQty: singleNum,
      maxQty: singleNum,
      id: `${singleNum}`,
      label: `${singleNum} pcs`,
    };
  }

  return null;
}

export const DEFAULT_FIXED_TIERS: AddonQuantityTierItem[] = [
  { id: '100', minQty: 100, maxQty: 100, label: '100 pcs' },
  { id: '250', minQty: 250, maxQty: 250, label: '250 pcs' },
  { id: '500', minQty: 500, maxQty: 500, label: '500 pcs' },
  { id: '1000', minQty: 1000, maxQty: 1000, label: '1,000 pcs' },
];

export const DEFAULT_BULK_RANGE_TIERS: AddonQuantityTierItem[] = [
  { id: '1-10', minQty: 1, maxQty: 10, label: '1–10 pcs' },
  { id: '11-20', minQty: 11, maxQty: 20, label: '11–20 pcs' },
  { id: '21-50', minQty: 21, maxQty: 50, label: '21–50 pcs' },
  { id: '51-100', minQty: 51, maxQty: 100, label: '51–100 pcs' },
];

export interface StudioTabPricingProps {
  productId: string;
  pricingModel: string;
  setPricingModel?: (model: string) => void;
  basePrice: number | string;
  setBasePrice?: (val: number | string) => void;
  minQuantity: number;
  setMinQuantity?: (val: number) => void;
  maxQuantity?: number;
  quantityStep?: number;
  setQuantityStep?: (val: number) => void;
  optionGroups: ProductOptionGroup[];
  setOptionGroups?: React.Dispatch<React.SetStateAction<ProductOptionGroup[]>>;
  rules: any[];
  matrixRows: MatrixRowItem[];
  setMatrixRows: React.Dispatch<React.SetStateAction<MatrixRowItem[]>>;
  additionalPricingRows?: ProductAdditionalPricingTier[];
  setAdditionalPricingRows?: React.Dispatch<React.SetStateAction<ProductAdditionalPricingTier[]>>;

  // Step 3 Design Pricing & Artwork (read-only reference in Step 4)
  designServiceRequirement?: string;
  designServiceFee?: number | string;
  artworkRequirement?: string;
  artworkFileFormats?: string[];
  defaultSize?: string;

  // Shipping & Logistics Weight Configuration (Stage 5)
  unitWeightGrams?: number | string;
  setUnitWeightGrams?: (val: number | string) => void;
  packagingProfileId?: string;
  setPackagingProfileId?: (val: string) => void;
  isShippable?: boolean;
  setIsShippable?: (val: boolean) => void;
  bulkTierWeights?: Array<{ id?: string; minQty: number; maxQty?: number; totalProductWeightGrams?: number; unitWeightGrams: number }>;
  setBulkTierWeights?: React.Dispatch<React.SetStateAction<Array<{ id?: string; minQty: number; maxQty?: number; totalProductWeightGrams?: number; unitWeightGrams: number }>>>;

  onNavigateToTab?: (tab: StudioTab) => void;
  onChange?: () => void;
}

export type PricingMethodType = 'OPTION' | 'COMBINATION' | 'INCLUDED';

export interface SellableCombination {
  id: string; // normalized key: e.g. "paper:matte|printing_location:front"
  attributes: Record<string, string>;
  title: string;
  badges: Array<{ groupName: string; groupCode: string; optionLabel: string; value: string }>;
  pricesByQty: Record<number, number>; // { 100: 300, 250: 600, 500: 950 }
  isExcluded: boolean;
  exclusionReason?: string;
}

export function StudioTabPricing({
  productId,
  pricingModel,
  setPricingModel,
  basePrice,
  setBasePrice,
  minQuantity,
  setMinQuantity,
  maxQuantity,
  quantityStep,
  setQuantityStep,
  optionGroups,
  setOptionGroups,
  rules = [],
  matrixRows,
  setMatrixRows,
  additionalPricingRows = [],
  setAdditionalPricingRows,
  designServiceRequirement = 'OPTIONAL',
  designServiceFee = 150,
  artworkRequirement = 'OPTIONAL',
  artworkFileFormats = ['PDF', 'AI', 'PSD'],
  defaultSize,
  unitWeightGrams = 2,
  setUnitWeightGrams,
  packagingProfileId = '',
  setPackagingProfileId,
  isShippable = true,
  setIsShippable,
  bulkTierWeights = [],
  setBulkTierWeights,
  onNavigateToTab,
  onChange,
}: StudioTabPricingProps) {
  // Derived Reference Unit Price: Starting Reference Rate (₹) / Minimum Order Quantity = Reference Unit Price
  const startingReferenceRate = Number(basePrice) || 0;
  const moq = Math.max(1, Number(minQuantity) || 1);
  const referenceUnitPrice = Math.round((startingReferenceRate / moq) * 10000) / 10000;

  // Quantity increment / Price Increasing mode:
  // If OFF: only fixed predefined quantities (quantityStep === 0)
  // If ON: price increasing based on the step increment (quantityStep > 0)
  // For Bulk Quantity Range alone, keep this toggle OFF by default (quantityStep === 0)
  const isIncrementalMode =
    quantityStep !== undefined && quantityStep !== null
      ? Number(quantityStep) > 0
      : pricingModel !== 'BULK_RANGE';

  const handleToggleIncrementalMode = (enabled: boolean) => {
    if (!enabled) {
      setQuantityStep?.(0);
    } else {
      setQuantityStep?.(100);
    }
    onChange?.();
  };

  // View toggle: Combination Pricing Table vs Additional Pricing vs Option Surcharges
  const [activePricingView, setActivePricingView] = useState<'MATRIX' | 'ADDITIONAL_PRICING' | 'OPTIONS'>('MATRIX');

  // ---------------------------------------------------------------------------
  // 1. ACTIVE GROUP SELECTION (LEFT PANEL)
  // ---------------------------------------------------------------------------
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    optionGroups[0]?.id || ''
  );

  // Sync selected group if optionGroups changes
  useEffect(() => {
    if (optionGroups.length > 0 && !optionGroups.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(optionGroups[0].id);
    }
  }, [optionGroups, selectedGroupId]);

  const activeGroup = useMemo(() => {
    return optionGroups.find((g) => g.id === selectedGroupId) || optionGroups[0] || null;
  }, [optionGroups, selectedGroupId]);

  // ---------------------------------------------------------------------------
  // 1.5 DYNAMIC ADDITIONAL PRICING WORKSPACE STATE & HELPERS
  // ---------------------------------------------------------------------------
  const eligibleAdditionalGroups = useMemo(() => {
    return optionGroups.filter((g) => g.isActive !== false && Boolean(g.enableAdditionalPricing));
  }, [optionGroups]);

  const [selectedAddonGroupId, setSelectedAddonGroupId] = useState<string>(() => {
    return optionGroups.find((g) => g.isActive !== false && Boolean(g.enableAdditionalPricing))?.id || '';
  });

  useEffect(() => {
    if (eligibleAdditionalGroups.length > 0 && !eligibleAdditionalGroups.some((g) => g.id === selectedAddonGroupId)) {
      setSelectedAddonGroupId(eligibleAdditionalGroups[0].id);
    }
  }, [eligibleAdditionalGroups, selectedAddonGroupId]);

  const activeAddonGroup = useMemo(() => {
    return eligibleAdditionalGroups.find((g) => g.id === selectedAddonGroupId) || eligibleAdditionalGroups[0] || null;
  }, [eligibleAdditionalGroups, selectedAddonGroupId]);

  const visibleAddonGroupOptions = useMemo(() => {
    if (!activeAddonGroup) return [];
    return activeAddonGroup.options.filter((opt) => opt.isActive !== false);
  }, [activeAddonGroup]);

  // Canonical Mapping:
  // Option A: Single Fixed Quantity ('SINGLE_FIXED_QUANTITY') -> Quantity Range Brackets (1–10, 11–20, 21–50, 51–100)
  // Option B: Bulk Quantity Range ('BULK_RANGE') -> Discrete Fixed Quantity Tiers (100, 1,000, 25,000)
  const isRangeBracketMode = pricingModel === 'SINGLE_FIXED_QUANTITY';

  // Dynamic Quantity Tiers for Product Base Pricing & Additional Pricing
  const [addonQuantityTiers, setAddonQuantityTiers] = useState<AddonQuantityTierItem[]>(() => {
    const tierMap = new Map<string, AddonQuantityTierItem>();

    // 1. Scan from matrixRows (Base Tiers)
    if (matrixRows && matrixRows.length > 0) {
      for (const row of matrixRows) {
        const combo = (row.attributeCombination as any) || {};
        const isBase =
          combo.isBasePrice === true ||
          combo.type === 'BASE' ||
          Object.keys(combo).filter(
            (k) => !['label', 'rangeLabel', 'discountPercent', 'isBasePrice', 'type', 'price', 'totalPrice'].includes(k)
          ).length === 0;

        if (isBase && row.minQty > 0) {
          const max = row.maxQty && row.maxQty >= row.minQty ? row.maxQty : row.minQty;
          const isRange = row.minQty !== max;
          // Single Fixed Quantity mode accepts ranges; Bulk Quantity Range accepts discrete fixed quantities
          if (isRangeBracketMode ? isRange : !isRange) {
            const id = isRange ? `${row.minQty}-${max}` : `${row.minQty}`;
            const label = isRange ? `${row.minQty}–${max} pcs` : `${row.minQty.toLocaleString()} pcs`;
            if (!tierMap.has(id)) {
              tierMap.set(id, { id, minQty: row.minQty, maxQty: max, label });
            }
          }
        }
      }
    }

    // 2. Scan from additionalPricingRows
    if (additionalPricingRows && additionalPricingRows.length > 0) {
      for (const row of additionalPricingRows) {
        if (row.minQty > 0) {
          const max = row.maxQty && row.maxQty >= row.minQty ? row.maxQty : row.minQty;
          const isRange = row.minQty !== max;
          if (isRangeBracketMode ? isRange : !isRange) {
            const id = isRange ? `${row.minQty}-${max}` : `${row.minQty}`;
            const label = isRange ? `${row.minQty}–${max} pcs` : `${row.minQty.toLocaleString()} pcs`;
            if (!tierMap.has(id)) {
              tierMap.set(id, { id, minQty: row.minQty, maxQty: max, label });
            }
          }
        }
      }
    }

    if (tierMap.size > 0) {
      return Array.from(tierMap.values()).sort((a, b) => a.minQty - b.minQty);
    }

    return isRangeBracketMode ? DEFAULT_BULK_RANGE_TIERS : DEFAULT_FIXED_TIERS;
  });

  // Replicate Pricing Mode from Stage 1 into Stage 5 Quantity Tiers
  // When the mode changes, filter out obsolete non-matching tiers and prevent mixing (e.g. 10-20 with fixed batches)
  const prevPricingModelRef = useRef<string>(pricingModel);
  useEffect(() => {
    const wasRange = prevPricingModelRef.current === 'SINGLE_FIXED_QUANTITY';
    const isNowRange = pricingModel === 'SINGLE_FIXED_QUANTITY';
    prevPricingModelRef.current = pricingModel;

    if (wasRange !== isNowRange) {
      setAddonQuantityTiers((prev) => {
        const matching = prev.filter((tier) => {
          const isRange = tier.minQty !== tier.maxQty;
          return isNowRange ? isRange : !isRange;
        });

        if (matching.length > 0) {
          return matching.sort((a, b) => a.minQty - b.minQty);
        }

        return isNowRange ? DEFAULT_BULK_RANGE_TIERS : DEFAULT_FIXED_TIERS;
      });

      // Also clean up matrixRows base tiers that don't match the new mode so they don't corrupt the matrix
      setMatrixRows((prev) =>
        prev.filter((r) => {
          const combo = (r.attributeCombination as any) || {};
          const isBase =
            combo.isBasePrice === true ||
            combo.type === 'BASE' ||
            Object.keys(combo).filter(
              (k) => !['label', 'rangeLabel', 'discountPercent', 'isBasePrice', 'type', 'totalPrice', 'price'].includes(k)
            ).length === 0;

          if (isBase) {
            const isRange = Number(r.minQty) !== Number(r.maxQty);
            return isNowRange ? isRange : !isRange;
          }
          return true;
        })
      );

      // Clean up additionalPricingRows that don't match the new mode
      setAdditionalPricingRows?.((prev) =>
        prev.filter((r) => {
          const isRange = Number(r.minQty) !== Number(r.maxQty);
          return isNowRange ? isRange : !isRange;
        })
      );

      onChange?.();
    }
  }, [pricingModel, setMatrixRows, setAdditionalPricingRows, onChange]);

  // Modals for Quantity Tiers & Bulk Range Brackets
  const [isAddAddonTierModalOpen, setIsAddAddonTierModalOpen] = useState(false);
  const [addTierMode, setAddTierMode] = useState<'range' | 'single' | 'custom'>('single');
  const [rangeMinInput, setRangeMinInput] = useState<number | ''>(51);
  const [rangeMaxInput, setRangeMaxInput] = useState<number | ''>(100);
  const [rangeInitialRate, setRangeInitialRate] = useState<number | ''>('');
  const [singleQtyInput, setSingleQtyInput] = useState<number | ''>(100);
  const [singleInitialRate, setSingleInitialRate] = useState<number | ''>('');
  const [newAddonTierInput, setNewAddonTierInput] = useState('');
  const [addonTierError, setAddonTierError] = useState<string | null>(null);

  // Packaging Profiles & Shipping Weight State (Stage 5 Integration)
  const [packagingProfilesList, setPackagingProfilesList] = useState<any[]>([]);
  useEffect(() => {
    let isCancelled = false;
    api.listPackagingProfiles(true).then((res) => {
      if (!isCancelled && Array.isArray(res)) {
        setPackagingProfilesList(res);
      }
    }).catch(() => {});
    return () => { isCancelled = true; };
  }, []);

  const activePackagingProfile = useMemo(() => {
    if (packagingProfileId) {
      const match = packagingProfilesList.find((p) => p.id === packagingProfileId);
      if (match) return match;
    }
    return (
      packagingProfilesList.find((p) => p.isDefault) ||
      packagingProfilesList[0] || {
        id: 'pkg-small-carton',
        name: 'Small Carton (Default)',
        weightGrams: 200,
        lengthMm: 220,
        widthMm: 160,
        heightMm: 120,
      }
    );
  }, [packagingProfileId, packagingProfilesList]);

  const getBulkTierWeight = (tier: AddonQuantityTierItem): number | string => {
    const found = bulkTierWeights?.find((b: any) => Number(b.minQty) === tier.minQty);
    if (found && (found.totalProductWeightGrams !== undefined || found.unitWeightGrams !== undefined)) {
      return Number(found.totalProductWeightGrams ?? found.unitWeightGrams);
    }
    const baseRow = matrixRows?.find((r) => {
      const c = (r.attributeCombination as any) || {};
      return (c.isBasePrice === true || c.type === 'BASE') && r.minQty === tier.minQty;
    });
    const c = (baseRow?.attributeCombination as any) || {};
    if (c.totalProductWeightGrams !== undefined && Number(c.totalProductWeightGrams) > 0) {
      return Number(c.totalProductWeightGrams);
    }
    return '';
  };

  const handleBulkTierWeightChange = (tier: AddonQuantityTierItem, newWeight: number) => {
    if (isNaN(newWeight) || newWeight < 0) return;
    setBulkTierWeights?.((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex((b: any) => Number(b.minQty) === tier.minQty);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          id: tier.id,
          minQty: tier.minQty,
          maxQty: tier.maxQty,
          totalProductWeightGrams: newWeight,
          unitWeightGrams: newWeight,
        };
      } else {
        list.push({
          id: tier.id,
          minQty: tier.minQty,
          maxQty: tier.maxQty,
          totalProductWeightGrams: newWeight,
          unitWeightGrams: newWeight,
        });
      }
      return list;
    });

    setMatrixRows?.((prev) =>
      prev.map((r) => {
        const c = (r.attributeCombination as any) || {};
        if ((c.isBasePrice === true || c.type === 'BASE') && r.minQty === tier.minQty) {
          return {
            ...r,
            attributeCombination: {
              ...c,
              totalProductWeightGrams: newWeight,
            },
          };
        }
        return r;
      })
    );
    onChange?.();
  };

  const getBracketWeight = (minQ: number, maxQ?: number) => {
    const found = bulkTierWeights?.find((b: any) => b.minQty === minQ && (b.maxQty === maxQ || (!b.maxQty && !maxQ)));
    return found !== undefined && (found.totalProductWeightGrams !== undefined || found.unitWeightGrams !== undefined)
      ? Number(found.totalProductWeightGrams ?? found.unitWeightGrams)
      : Number(unitWeightGrams) || 2;
  };

  const handleBracketWeightChange = (tier: AddonQuantityTierItem, newWeight: number) => {
    if (isNaN(newWeight) || newWeight < 0) return;
    handleBulkTierWeightChange(tier, newWeight);
  };

  const [editingAddonTier, setEditingAddonTier] = useState<AddonQuantityTierItem | null>(null);
  const [editAddonTierInput, setEditAddonTierInput] = useState('');

  const openAddTierModal = () => {
    // Single Fixed Quantity uses range brackets; Bulk Quantity Range uses discrete single tiers
    const isRange = pricingModel === 'SINGLE_FIXED_QUANTITY';
    setAddTierMode(isRange ? 'range' : 'single');

    if (isRange) {
      const highestMax = addonQuantityTiers.reduce((max, t) => Math.max(max, t.maxQty), 0);
      const nextMin = highestMax > 0 ? highestMax + 1 : 1;
      const nextMax = nextMin === 1 ? 10 : nextMin + (nextMin <= 20 ? 9 : nextMin <= 50 ? 29 : 49);
      setRangeMinInput(nextMin);
      setRangeMaxInput(nextMax);
      setRangeInitialRate('');
    } else {
      const highestQty = addonQuantityTiers.reduce((max, t) => Math.max(max, t.maxQty), 0);
      setSingleQtyInput(highestQty > 0 ? highestQty + 100 : 100);
      setSingleInitialRate('');
    }

    setNewAddonTierInput('');
    setAddonTierError(null);
    setIsAddAddonTierModalOpen(true);
  };

  const handleAddAddonTier = () => {
    const isRange = pricingModel === 'SINGLE_FIXED_QUANTITY';
    let parsed: AddonQuantityTierItem | null = null;
    let initialRate: number | '' = '';

    if (!isRange) {
      // Bulk Quantity Range mode: accepts discrete single quantity (e.g. 100, 1000, 25000)
      const q = Number(singleQtyInput);
      if (!q || isNaN(q) || q <= 0) {
        setAddonTierError('Please enter a valid positive quantity number.');
        return;
      }
      parsed = { id: `${q}`, minQty: q, maxQty: q, label: `${q.toLocaleString()} pcs` };
      initialRate = singleInitialRate;
    } else {
      // Single Fixed Quantity mode: accepts range bracket (e.g. 1-10, 11-20, 21-50, 51-100)
      const min = Number(rangeMinInput);
      const max = Number(rangeMaxInput);
      if (!min || isNaN(min) || min <= 0) {
        setAddonTierError('Please enter a valid starting quantity (From > 0).');
        return;
      }
      if (!max || isNaN(max) || max <= min) {
        setAddonTierError('Ending quantity (To) must be strictly greater than starting quantity (From) for a range bracket.');
        return;
      }
      parsed = { id: `${min}-${max}`, minQty: min, maxQty: max, label: `${min}–${max} pcs` };
      initialRate = rangeInitialRate;
    }

    if (addonQuantityTiers.some((t) => t.id === parsed!.id)) {
      setAddonTierError(`Quantity tier "${parsed!.id}" already exists.`);
      return;
    }

    const newTier = parsed!;
    setAddonQuantityTiers((prev) => [...prev, newTier].sort((a, b) => a.minQty - b.minQty));

    // If initial unit rate was provided, immediately configure base tier price
    if (initialRate !== '' && Number(initialRate) > 0) {
      handleBaseTierPriceChange(newTier, Number(initialRate));
    }

    setNewAddonTierInput('');
    setAddonTierError(null);
    setIsAddAddonTierModalOpen(false);
    onChange?.();
  };

  const handleAutoGenerateBulkRanges = () => {
    const standardBulkRanges: AddonQuantityTierItem[] = [
      { id: '1-50', minQty: 1, maxQty: 50, label: '1–50 pcs' },
      { id: '51-100', minQty: 51, maxQty: 100, label: '51–100 pcs' },
      { id: '101-250', minQty: 101, maxQty: 250, label: '101–250 pcs' },
      { id: '251-500', minQty: 251, maxQty: 500, label: '251–500 pcs' },
      { id: '501-1000', minQty: 501, maxQty: 1000, label: '501–1,000 pcs' },
      { id: '1001-5000', minQty: 1001, maxQty: 5000, label: '1,001–5,000 pcs' },
    ];

    setAddonQuantityTiers((prev) => {
      const map = new Map<string, AddonQuantityTierItem>();
      for (const t of prev) {
        map.set(t.id, t);
      }
      for (const s of standardBulkRanges) {
        if (!map.has(s.id)) {
          map.set(s.id, s);
        }
      }
      return Array.from(map.values()).sort((a, b) => a.minQty - b.minQty);
    });
    onChange?.();
  };

  const handleRemoveAddonTier = (tier: AddonQuantityTierItem) => {
    if (addonQuantityTiers.length <= 1) {
      alert('At least one quantity tier must remain.');
      return;
    }
    setAddonQuantityTiers((prev) => prev.filter((t) => t.id !== tier.id));
    setAdditionalPricingRows?.((prev) =>
      prev.filter(
        (r) =>
          !(
            r.minQty === tier.minQty &&
            (r.maxQty === tier.maxQty || (!r.maxQty && tier.minQty === tier.maxQty))
          )
      )
    );
    // Also remove corresponding base tier from matrixRows
    setMatrixRows((prev) =>
      prev.filter((r) => {
        const combo = (r.attributeCombination as any) || {};
        const isBase =
          combo.isBasePrice === true ||
          combo.type === 'BASE' ||
          Object.keys(combo).filter(
            (k) => !['label', 'rangeLabel', 'discountPercent', 'isBasePrice', 'type'].includes(k)
          ).length === 0;

        if (
          isBase &&
          r.minQty === tier.minQty &&
          (r.maxQty === tier.maxQty || (!r.maxQty && tier.minQty === tier.maxQty))
        ) {
          return false;
        }
        return true;
      })
    );
    onChange?.();
  };

  const handleSaveEditAddonTier = () => {
    if (!editingAddonTier) return;
    const isRangeMode = pricingModel === 'SINGLE_FIXED_QUANTITY';
    const parsed = parseQuantityTier(editAddonTierInput);
    if (!parsed) {
      setAddonTierError(
        isRangeMode
          ? 'Enter a valid range bracket (e.g. 11-20 or 21-50).'
          : 'Enter a valid positive integer quantity (e.g. 100 or 1000).'
      );
      return;
    }
    const isRange = parsed.minQty !== parsed.maxQty;
    if (isRangeMode && !isRange) {
      setAddonTierError('Single Fixed Quantity mode is active. Please enter a range bracket (e.g. 11-20), not a single quantity.');
      return;
    }
    if (!isRangeMode && isRange) {
      setAddonTierError('Bulk Quantity Range mode is active. Please enter an exact single quantity (e.g. 100), not a range.');
      return;
    }
    if (parsed.id !== editingAddonTier.id && addonQuantityTiers.some((t) => t.id === parsed.id)) {
      setAddonTierError(`Quantity tier "${parsed.id}" already exists.`);
      return;
    }
    const oldTier = editingAddonTier;
    setAddonQuantityTiers((prev) =>
      prev.map((t) => (t.id === oldTier.id ? parsed : t)).sort((a, b) => a.minQty - b.minQty)
    );
    setAdditionalPricingRows?.((prev) =>
      prev.map((r) =>
        r.minQty === oldTier.minQty && (r.maxQty === oldTier.maxQty || (!r.maxQty && oldTier.minQty === oldTier.maxQty))
          ? { ...r, minQty: parsed.minQty, maxQty: parsed.maxQty }
          : r
      )
    );
    // Also update base tier row in matrixRows
    setMatrixRows((prev) =>
      prev.map((r) => {
        const combo = (r.attributeCombination as any) || {};
        const isBase =
          combo.isBasePrice === true ||
          combo.type === 'BASE' ||
          Object.keys(combo).filter(
            (k) => !['label', 'rangeLabel', 'discountPercent', 'isBasePrice', 'type'].includes(k)
          ).length === 0;

        if (
          isBase &&
          r.minQty === oldTier.minQty &&
          (r.maxQty === oldTier.maxQty || (!r.maxQty && oldTier.minQty === oldTier.maxQty))
        ) {
          return {
            ...r,
            minQty: parsed.minQty,
            maxQty: parsed.maxQty,
            label: parsed.label,
            attributeCombination: {
              ...combo,
              isBasePrice: true,
              type: 'BASE',
              label: parsed.label,
            },
          };
        }
        return r;
      })
    );
    setEditingAddonTier(null);
    setEditAddonTierInput('');
    setAddonTierError(null);
    onChange?.();
  };

  const handleSortAddonTiers = () => {
    setAddonQuantityTiers((prev) => [...prev].sort((a, b) => a.minQty - b.minQty));
  };

  // ---------------------------------------------------------------------------
  // 1.6 PRODUCT BASE PRICING BY QUANTITY HELPERS
  // ---------------------------------------------------------------------------
  const getBaseTierPrice = (tier: AddonQuantityTierItem): number | '' => {
    if (!matrixRows || matrixRows.length === 0) {
      if (tier.minQty === Number(minQuantity) && Number(basePrice) > 0) {
        return Math.round((Number(basePrice) / tier.minQty) * 10000) / 10000;
      }
      return '';
    }
    const match = matrixRows.find((r) => {
      const combo = (r.attributeCombination as any) || {};
      const isBase =
        combo.isBasePrice === true ||
        combo.type === 'BASE' ||
        Object.keys(combo).filter(
          (k) => !['label', 'rangeLabel', 'discountPercent', 'isBasePrice', 'type', 'totalPrice', 'price'].includes(k)
        ).length === 0;

      return (
        isBase &&
        r.minQty === tier.minQty &&
        (r.maxQty === tier.maxQty || (!r.maxQty && tier.minQty === tier.maxQty))
      );
    });

    if (match && match.unitPrice !== undefined && match.unitPrice !== null && match.unitPrice !== '') {
      return Number(match.unitPrice);
    }

    if (tier.minQty === Number(minQuantity) && Number(basePrice) > 0) {
      return Math.round((Number(basePrice) / tier.minQty) * 10000) / 10000;
    }

    return '';
  };

  const getBaseTierTotalPrice = (tier: AddonQuantityTierItem): number | '' => {
    if (!matrixRows || matrixRows.length === 0) {
      if (tier.minQty === Number(minQuantity) && Number(basePrice) > 0) {
        return Number(basePrice);
      }
      return '';
    }
    const match = matrixRows.find((r) => {
      const combo = (r.attributeCombination as any) || {};
      const isBase =
        combo.isBasePrice === true ||
        combo.type === 'BASE' ||
        Object.keys(combo).filter(
          (k) => !['label', 'rangeLabel', 'discountPercent', 'isBasePrice', 'type', 'totalPrice', 'price'].includes(k)
        ).length === 0;

      return (
        isBase &&
        r.minQty === tier.minQty &&
        (r.maxQty === tier.maxQty || (!r.maxQty && tier.minQty === tier.maxQty))
      );
    });

    if (match) {
      const combo = (match.attributeCombination as any) || {};
      const exactTotal = combo.totalPrice ?? combo.price;
      if (exactTotal !== undefined && exactTotal !== null && exactTotal !== '') {
        return Number(exactTotal);
      }
      if (match.unitPrice !== undefined && match.unitPrice !== null && match.unitPrice !== '') {
        return Math.round(Number(match.unitPrice) * tier.minQty * 100) / 100;
      }
    }

    if (tier.minQty === Number(minQuantity) && Number(basePrice) > 0) {
      return Number(basePrice);
    }

    return '';
  };

  const handleBaseTierTotalPriceChange = (tier: AddonQuantityTierItem, totalAmount: number) => {
    if (isNaN(totalAmount) || totalAmount < 0) return;
    const unitRate = tier.minQty > 0 ? Math.round((totalAmount / tier.minQty) * 10000) / 10000 : totalAmount;
    saveBaseTierPrice(tier, totalAmount, unitRate);
  };

  const handleBaseTierPriceChange = (tier: AddonQuantityTierItem, unitRate: number) => {
    if (isNaN(unitRate) || unitRate < 0) return;
    const totalAmount = Math.round(unitRate * tier.minQty * 100) / 100;
    saveBaseTierPrice(tier, totalAmount, unitRate);
  };

  const saveBaseTierPrice = (tier: AddonQuantityTierItem, totalAmount: number, unitRate: number) => {
    setMatrixRows((prev) => {
      const existingIdx = prev.findIndex((r) => {
        const combo = (r.attributeCombination as any) || {};
        const isBase =
          combo.isBasePrice === true ||
          combo.type === 'BASE' ||
          Object.keys(combo).filter(
            (k) => !['label', 'rangeLabel', 'discountPercent', 'isBasePrice', 'type', 'totalPrice', 'price'].includes(k)
          ).length === 0;

        return (
          isBase &&
          r.minQty === tier.minQty &&
          (r.maxQty === tier.maxQty || (!r.maxQty && tier.minQty === tier.maxQty))
        );
      });

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          unitPrice: unitRate,
          attributeCombination: {
            ...((copy[existingIdx].attributeCombination as any) || {}),
            isBasePrice: true,
            type: 'BASE',
            label: tier.label,
            totalPrice: totalAmount,
            price: totalAmount,
          },
          label: tier.label,
        };
        return copy;
      } else {
        const newBaseRow: MatrixRowItem = {
          minQty: tier.minQty,
          maxQty: tier.maxQty,
          unitPrice: unitRate,
          attributeCombination: {
            isBasePrice: true,
            type: 'BASE',
            label: tier.label,
            totalPrice: totalAmount,
            price: totalAmount,
          },
          status: 'ACTIVE',
          isExcluded: false,
          label: tier.label,
        };
        return [...prev, newBaseRow];
      }
    });

    // Sync basePrice and minQuantity for lowest tier (Total starting amount)
    const sorted = [...addonQuantityTiers].sort((a, b) => a.minQty - b.minQty);
    if (sorted[0]?.id === tier.id) {
      setBasePrice?.(totalAmount);
      setMinQuantity?.(tier.minQty);
    }

    onChange?.();
  };

  const getAddonTierPrice = (groupCode: string, optionValue: string, tier: AddonQuantityTierItem): number | '' => {
    if (!additionalPricingRows) return '';
    const match = additionalPricingRows.find(
      (r) =>
        r.groupCode === groupCode &&
        r.optionValue === optionValue &&
        r.minQty === tier.minQty &&
        (r.maxQty === tier.maxQty || (!r.maxQty && tier.minQty === tier.maxQty))
    );
    if (!match || match.unitPrice === undefined || match.unitPrice === null) return '';
    return Number(match.unitPrice);
  };

  const isAddonOptionExcluded = (groupCode: string, optionValue: string): boolean => {
    if (!additionalPricingRows) return false;
    const match = additionalPricingRows.find(
      (r) => r.groupCode === groupCode && r.optionValue === optionValue
    );
    return Boolean(match?.isExcluded);
  };

  const handleAddonTierPriceChange = (
    groupCode: string,
    optionValue: string,
    tier: AddonQuantityTierItem,
    newRate: number
  ) => {
    if (isNaN(newRate) || newRate < 0) return;
    setAdditionalPricingRows?.((prev) => {
      const existingIdx = prev.findIndex(
        (r) =>
          r.groupCode === groupCode &&
          r.optionValue === optionValue &&
          r.minQty === tier.minQty &&
          (r.maxQty === tier.maxQty || (!r.maxQty && tier.minQty === tier.maxQty))
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          unitPrice: newRate,
          chargeBasis: 'FLAT_PER_ORDER',
        };
        return copy;
      } else {
        const wasExcluded = prev.some((r) => r.groupCode === groupCode && r.optionValue === optionValue && r.isExcluded);
        const newRow: ProductAdditionalPricingTier = {
          productId,
          groupCode,
          optionValue,
          minQty: tier.minQty,
          maxQty: tier.maxQty,
          unitPrice: newRate,
          chargeBasis: 'FLAT_PER_ORDER',
          isExcluded: wasExcluded,
        };
        return [...prev, newRow];
      }
    });
    onChange?.();
  };

  const handleToggleAddonOptionExcluded = (groupCode: string, optionValue: string) => {
    setAdditionalPricingRows?.((prev) => {
      const match = prev.find((r) => r.groupCode === groupCode && r.optionValue === optionValue);
      const nextExcluded = !match?.isExcluded;

      const updated = prev.map((r) => {
        if (r.groupCode === groupCode && r.optionValue === optionValue) {
          return { ...r, isExcluded: nextExcluded };
        }
        return r;
      });

      if (!match) {
        for (const tier of addonQuantityTiers) {
          updated.push({
            productId,
            groupCode,
            optionValue,
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            unitPrice: 0,
            chargeBasis: 'PER_UNIT',
            isExcluded: true,
          });
        }
      }

      return updated;
    });
    onChange?.();
  };

  const handleRemoveGroupFromAddonPricing = (groupId: string) => {
    const target = optionGroups.find((g) => g.id === groupId);
    if (!target) return;
    if (
      confirm(
        `Remove option group "${target.name}" from additional pricing eligibility? Existing custom additional pricing tiers for this group will be detached.`
      )
    ) {
      setOptionGroups?.((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, enableAdditionalPricing: false } : g))
      );
      setAdditionalPricingRows?.((prev) => prev.filter((r) => r.groupCode !== target.code));
      onChange?.();
    }
  };

  // ---------------------------------------------------------------------------
  // 2. DETECT PRICING STATUS FOR EACH OPTION GROUP
  // ---------------------------------------------------------------------------
  const groupStatusMap = useMemo(() => {
    const map = new Map<
      string,
      {
        method: PricingMethodType | 'ERROR';
        label: string;
        badgeClass: string;
        description: string;
        nonZeroCount: number;
        hasError: boolean;
        errorMessage?: string;
      }
    >();

    for (const group of optionGroups) {
      const activeOptions = group.options.filter((o) => o.isActive !== false);

      // Check negative price modifiers
      const hasNegative = activeOptions.some((o) => Number(o.priceModifier) < 0);
      if (hasNegative) {
        map.set(group.id, {
          method: 'ERROR',
          label: 'Error: Negative Price',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
          description: 'Contains invalid negative charge',
          nonZeroCount: 0,
          hasError: true,
          errorMessage: 'Option charges must be non-negative (≥ ₹0).',
        });
        continue;
      }

      // Check if group is part of combination matrix
      const isPartofMatrix = matrixRows.some((r) => {
        const c = (r.attributeCombination as any) || {};
        return c[group.code] !== undefined;
      });

      if (isPartofMatrix) {
        map.set(group.id, {
          method: 'COMBINATION',
          label: 'Combination-Based',
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
          description: 'Priced in sellable combination matrix',
          nonZeroCount: 0,
          hasError: false,
        });
        continue;
      }

      // Check if any option has independent price modifier > 0
      const nonZeroOptions = activeOptions.filter((o) => Number(o.priceModifier) > 0);
      if (nonZeroOptions.length > 0) {
        map.set(group.id, {
          method: 'OPTION',
          label: 'Option-Based Pricing',
          badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
          description: `${nonZeroOptions.length} choice(s) with additive charges`,
          nonZeroCount: nonZeroOptions.length,
          hasError: false,
        });
        continue;
      }

      // Otherwise marked as included in base price
      map.set(group.id, {
        method: 'INCLUDED',
        label: 'Included in Base Price',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        description: '₹0 additional charge (covered in base)',
        nonZeroCount: 0,
        hasError: false,
      });
    }

    return map;
  }, [optionGroups, matrixRows]);

  // Method state for the currently active group
  const activeGroupStatus = activeGroup ? groupStatusMap.get(activeGroup.id) : null;
  const [activeMethodOverride, setActiveMethodOverride] = useState<PricingMethodType | null>(null);

  const currentMethod: PricingMethodType = useMemo(() => {
    if (activeMethodOverride) return activeMethodOverride;
    if (activeGroupStatus && activeGroupStatus.method !== 'ERROR') {
      return activeGroupStatus.method;
    }
    return 'INCLUDED';
  }, [activeMethodOverride, activeGroupStatus]);

  // Reset override when active group changes
  useEffect(() => {
    setActiveMethodOverride(null);
  }, [selectedGroupId]);

  // ---------------------------------------------------------------------------
  // 3. METHOD A: OPTION-BASED CHARGES DRAFT STATE & HANDLERS
  // ---------------------------------------------------------------------------
  const [optionChargesDraft, setOptionChargesDraft] = useState<Record<string, { amount: string; type: string }>>({});
  const [optionSuccessMsg, setOptionSuccessMsg] = useState<string | null>(null);

  // Initialize draft when activeGroup changes
  useEffect(() => {
    if (!activeGroup) return;
    const initialDraft: Record<string, { amount: string; type: string }> = {};
    for (const opt of activeGroup.options) {
      initialDraft[opt.id] = {
        amount: String(opt.priceModifier || 0),
        type: opt.priceModifierType || 'FIXED',
      };
    }
    setOptionChargesDraft(initialDraft);
    setOptionSuccessMsg(null);
  }, [activeGroup]);

  const handleOptionChargeChange = (optId: string, field: 'amount' | 'type', value: string) => {
    setOptionChargesDraft((prev) => ({
      ...prev,
      [optId]: {
        ...prev[optId],
        [field]: value,
      },
    }));
  };

  const handleSaveOptionCharges = () => {
    if (!activeGroup || !setOptionGroups) return;

    // Validate non-negative
    for (const opt of activeGroup.options) {
      const draft = optionChargesDraft[opt.id];
      const val = parseFloat(draft?.amount || '0');
      if (isNaN(val) || val < 0) {
        alert(`Option "${opt.label}" has an invalid amount. Charges must be non-negative.`);
        return;
      }
    }

    setOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id !== activeGroup.id) return g;
        return {
          ...g,
          options: g.options.map((opt) => {
            const draft = optionChargesDraft[opt.id];
            const numVal = parseFloat(draft?.amount || '0');
            return {
              ...opt,
              priceModifier: isNaN(numVal) ? 0 : numVal,
              priceModifierType: draft?.type || 'FIXED',
            };
          }),
        };
      })
    );

    // If this group was previously in matrixRows, clean it from matrixRows if user wants pure option-based
    const isInMatrix = matrixRows.some((r) => {
      const c = (r.attributeCombination as any) || {};
      return c[activeGroup.code] !== undefined;
    });

    if (isInMatrix) {
      // Clean this group from combination rows
      setMatrixRows((prev) => {
        return prev.map((r) => {
          const c = { ...(r.attributeCombination as any) || {} };
          delete c[activeGroup.code];
          return { ...r, attributeCombination: c };
        });
      });
    }

    setOptionSuccessMsg(`Option-based pricing saved successfully for "${activeGroup.name}".`);
    onChange?.();
    setTimeout(() => setOptionSuccessMsg(null), 3000);
  };

  // ---------------------------------------------------------------------------
  // 4. METHOD C: MARK INCLUDED IN BASE PRICE HANDLER
  // ---------------------------------------------------------------------------
  const handleMarkIncludedInBase = () => {
    if (!activeGroup || !setOptionGroups) return;

    setOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id !== activeGroup.id) return g;
        return {
          ...g,
          options: g.options.map((opt) => ({
            ...opt,
            priceModifier: 0,
            priceModifierType: 'FIXED',
          })),
        };
      })
    );

    // Clean this group from combination rows if present
    setMatrixRows((prev) => {
      return prev.map((r) => {
        const c = { ...(r.attributeCombination as any) || {} };
        delete c[activeGroup.code];
        return { ...r, attributeCombination: c };
      });
    });

    // Reset draft state
    const newDraft: Record<string, { amount: string; type: string }> = {};
    for (const opt of activeGroup.options) {
      newDraft[opt.id] = { amount: '0', type: 'FIXED' };
    }
    setOptionChargesDraft(newDraft);

    setActiveMethodOverride('INCLUDED');
    setOptionSuccessMsg(`Group "${activeGroup.name}" is now marked as included in the base printing price (₹0 add-on).`);
    onChange?.();
    setTimeout(() => setOptionSuccessMsg(null), 3500);
  };

  // ---------------------------------------------------------------------------
  // 5. METHOD B: COMBINATION-BASED PRICING MATRIX ENGINE
  // ---------------------------------------------------------------------------
  const [quantityColumns, setQuantityColumns] = useState<number[]>(() => {
    const isRangeMode = pricingModel === 'SINGLE_FIXED_QUANTITY';
    const set = new Set<number>();
    for (const r of matrixRows) {
      const isRange = Number(r.minQty) !== Number(r.maxQty);
      if (isRangeMode ? !isRange : isRange) continue;
      const q = Number(r.minQty);
      if (q > 0) set.add(q);
    }
    const arr = Array.from(set).sort((a, b) => a - b);
    return arr.length > 0 ? arr : [100, 250, 500, 1000];
  });

  useEffect(() => {
    const isRangeMode = pricingModel === 'SINGLE_FIXED_QUANTITY';
    setQuantityColumns((prev) => {
      const set = new Set(prev);
      let changed = false;
      for (const r of matrixRows) {
        const isRange = Number(r.minQty) !== Number(r.maxQty);
        if (isRangeMode ? !isRange : isRange) continue;
        const q = Number(r.minQty);
        if (q > 0 && !set.has(q)) {
          set.add(q);
          changed = true;
        }
      }
      return changed ? Array.from(set).sort((a, b) => a - b) : prev;
    });
  }, [matrixRows, pricingModel]);

  // Participating combination groups
  const [participatingGroupCodes, setParticipatingGroupCodes] = useState<string[]>(() => {
    const set = new Set<string>();
    for (const r of matrixRows) {
      const c = (r.attributeCombination as any) || {};
      for (const k of Object.keys(c)) {
        if (!['discountPercent', 'label', 'offerName', 'isExcluded', 'status', 'exclusionReason', 'type', 'isBasePrice', 'price', 'totalPrice', 'quantity'].includes(k)) {
          set.add(k);
        }
      }
    }
    if (set.size > 0) return Array.from(set);
    return optionGroups.map((g) => g.code);
  });

  useEffect(() => {
    if (participatingGroupCodes.length === 0 && optionGroups.length > 0) {
      setParticipatingGroupCodes(optionGroups.map((g) => g.code));
    }
  }, [optionGroups, participatingGroupCodes.length]);

  const toggleParticipatingGroup = (code: string) => {
    setParticipatingGroupCodes((prev) => {
      if (prev.includes(code)) {
        if (prev.length <= 1) {
          alert('At least one group must be selected for the combination table.');
          return prev;
        }
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
  };

  // Sellable combinations extraction
  const sellableCombinations: SellableCombination[] = useMemo(() => {
    const comboMap = new Map<
      string,
      {
        attributes: Record<string, string>;
        prices: Record<number, number>;
        isExcluded: boolean;
        exclusionReason?: string;
      }
    >();

    for (const row of matrixRows) {
      const c = (row.attributeCombination as any) || {};
      const keys = Object.keys(c)
        .filter(
          (k) =>
            ![
              'discountPercent',
              'label',
              'offerName',
              'isExcluded',
              'status',
              'exclusionReason',
              'type',
              'isBasePrice',
              'price',
              'totalPrice',
              'quantity',
            ].includes(k)
        )
        .sort();

      if (keys.length === 0) continue;
      const id = keys.map((k) => `${k}:${c[k]}`).join('|');

      if (!comboMap.has(id)) {
        const attrOnly: Record<string, string> = {};
        for (const k of keys) attrOnly[k] = String(c[k]);
        comboMap.set(id, {
          attributes: attrOnly,
          prices: {},
          isExcluded: Boolean(
            row.isExcluded || row.status === 'EXCLUDED' || c.isExcluded === true || c.status === 'EXCLUDED'
          ),
          exclusionReason: row.exclusionReason || c.exclusionReason,
        });
      }

      const qty = Number(row.minQty || c.quantity || 1);
      const rawPrice = c.price ?? c.totalPrice ?? Number(row.unitPrice || 0) * qty;
      if (qty > 0 && rawPrice !== undefined && rawPrice !== null) {
        comboMap.get(id)!.prices[qty] = Number(rawPrice);
      }
    }

    return Array.from(comboMap.entries()).map(([id, data]) => {
      const badges = Object.entries(data.attributes).map(([k, v]) => {
        const grp = optionGroups.find((g) => g.code === k);
        const opt = grp?.options.find((o) => o.value === v);
        return {
          groupName: grp?.name || k,
          groupCode: k,
          optionLabel: opt?.label || v,
          value: v,
        };
      });
      const title = badges.map((b) => b.optionLabel).join(' / ');

      return {
        id,
        attributes: data.attributes,
        title,
        badges,
        pricesByQty: data.prices,
        isExcluded: data.isExcluded,
        exclusionReason: data.exclusionReason,
      };
    });
  }, [matrixRows, optionGroups]);

  // Search & Filter
  const [comboSearchQuery, setComboSearchQuery] = useState('');
  const [comboFilter, setComboFilter] = useState<'ALL' | 'CONFIGURED' | 'MISSING'>('ALL');

  const filteredCombinations = useMemo(() => {
    return sellableCombinations.filter((combo) => {
      const hasAllPrices = quantityColumns.every(
        (q) => combo.pricesByQty[q] !== undefined && combo.pricesByQty[q] > 0
      );

      if (comboFilter === 'CONFIGURED' && !hasAllPrices) return false;
      if (comboFilter === 'MISSING' && hasAllPrices) return false;

      if (!comboSearchQuery.trim()) return true;
      const q = comboSearchQuery.toLowerCase();
      if (combo.title.toLowerCase().includes(q)) return true;
      if (
        combo.badges.some(
          (b) => b.optionLabel.toLowerCase().includes(q) || b.groupName.toLowerCase().includes(q)
        )
      ) {
        return true;
      }
      return false;
    });
  }, [sellableCombinations, quantityColumns, comboFilter, comboSearchQuery]);

  // ---------------------------------------------------------------------------
  // DIAGNOSTICS & SYSTEM AUDIT (Missing prices, overlapping tiers, duplicates)
  // ---------------------------------------------------------------------------
  const diagnostics = useMemo(() => {
    const list: Array<{ id: string; type: 'error' | 'warning' | 'info'; title: string; message: string }> = [];

    // 1. Missing Reference Base Price
    if (startingReferenceRate <= 0) {
      list.push({
        id: 'missing-base-rate',
        type: 'error',
        title: 'Starting Reference Rate is Missing or ₹0.00',
        message: 'A positive Starting Reference Rate is required to compute the Reference Unit Price.',
      });
    }

    // 2. Matrix Validation when in Manual Matrix Strategy
    if (pricingModel === 'MATRIX' || pricingModel === 'MANUAL') {
      if (sellableCombinations.length === 0) {
        list.push({
          id: 'missing-combinations',
          type: 'warning',
          title: 'No Sellable Combinations Configured',
          message: 'Manual pricing matrix is active, but no combinations are configured. Click "Add Combination" or "Generate Starter".',
        });
      }

      let missingCellCount = 0;
      for (const combo of sellableCombinations) {
        for (const q of quantityColumns) {
          const prc = combo.pricesByQty[q];
          if (prc === undefined || prc <= 0) {
            missingCellCount++;
          }
        }
      }
      if (missingCellCount > 0) {
        list.push({
          id: 'missing-prices',
          type: 'warning',
          title: `${missingCellCount} Missing or Zero Price Cell(s)`,
          message: 'Some combinations in the matrix have unconfigured or ₹0 rates. Unpriced combinations will be rejected during storefront quote and checkout.',
        });
      }
    }

    // 3. Overlapping or Inverted Quantity Ranges
    for (const r of matrixRows) {
      if (r.minQty > r.maxQty && r.maxQty > 0) {
        list.push({
          id: `invalid-range-${r.id}`,
          type: 'error',
          title: 'Invalid Quantity Range in Matrix',
          message: `Tier row has minQty (${r.minQty}) greater than maxQty (${r.maxQty}).`,
        });
        break;
      }
    }

    // 4. Potential Duplicate Charges
    // When an option group has independent surcharges AND is part of combination matrix
    for (const group of optionGroups) {
      const activeOpts = group.options.filter((o) => o.isActive !== false);
      const hasIndependentSurcharge = activeOpts.some((o) => Number(o.priceModifier) > 0);
      const isPartofMatrix = matrixRows.some((r) => {
        const c = (r.attributeCombination as any) || {};
        return c[group.code] !== undefined;
      });

      if (hasIndependentSurcharge && isPartofMatrix) {
        list.push({
          id: `duplicate-charge-${group.id}`,
          type: 'warning',
          title: `Potential Duplicate Charge: "${group.name}"`,
          message: `Option group "${group.name}" has independent option surcharges (+₹...) AND is configured inside Combination Matrix rows. Server pricing engine treats matrix combinations as authoritative and will suppress option surcharges to prevent double charging. Consider standardizing to either Method A (Option-based) or Method B (Combination-based).`,
        });
      }
    }

    // 5. Additional Pricing by Group & Quantity Diagnostics
    for (const group of eligibleAdditionalGroups) {
      const groupTiers = (additionalPricingRows || []).filter((r) => r.groupCode === group.code);
      if (groupTiers.length === 0) {
        list.push({
          id: `addon-missing-${group.id}`,
          type: 'warning',
          title: `Additional Pricing Not Configured: "${group.name}"`,
          message: `Option group "${group.name}" is marked eligible for additional pricing, but has no quantity tiers configured in "Additional Pricing by Group & Quantity". Switch views to configure tiers or disable eligibility in Step 2.`,
        });
      } else {
        const activeChoices = group.options.filter((o) => o.isActive !== false);
        let unpricedCount = 0;
        for (const opt of activeChoices) {
          const optTiers = groupTiers.filter((t) => t.optionValue === opt.value);
          const isExcluded = optTiers.some((t) => t.isExcluded);
          if (!isExcluded) {
            for (const tier of addonQuantityTiers) {
              const match = optTiers.find(
                (t) =>
                  t.minQty === tier.minQty &&
                  (t.maxQty === tier.maxQty || (!t.maxQty && tier.minQty === tier.maxQty))
              );
              if (!match || Number(match.unitPrice) <= 0) {
                unpricedCount++;
              }
            }
          }
        }
        if (unpricedCount > 0) {
          list.push({
            id: `addon-unpriced-${group.id}`,
            type: 'warning',
            title: `Unpriced Tier Choices in "${group.name}"`,
            message: `${unpricedCount} option choice tier(s) in "${group.name}" have ₹0.00 additional rates. Customers ordering this choice will receive ₹0 additional charge for those tiers unless priced.`,
          });
        }
      }
    }

    return list;
  }, [
    startingReferenceRate,
    pricingModel,
    sellableCombinations,
    quantityColumns,
    matrixRows,
    optionGroups,
    eligibleAdditionalGroups,
    additionalPricingRows,
    addonQuantityTiers,
  ]);

  // Inline Price Change
  const handleCellPriceChange = (combo: SellableCombination, qty: number, newPriceVal: number) => {
    if (isNaN(newPriceVal) || newPriceVal < 0) return;

    setMatrixRows((prev) => {
      const rowId = `row-${combo.id}-${qty}`;
      const existingIdx = prev.findIndex((r) => {
        const c = (r.attributeCombination as any) || {};
        const matchesCombo = Object.keys(combo.attributes).every(
          (k) => String(c[k]) === String(combo.attributes[k])
        );
        return matchesCombo && Number(r.minQty) === qty;
      });

      const updatedRow: MatrixRowItem = {
        id: existingIdx >= 0 ? prev[existingIdx].id || rowId : rowId,
        minQty: qty,
        maxQty: qty,
        unitPrice: qty > 0 ? newPriceVal / qty : newPriceVal,
        attributeCombination: {
          ...combo.attributes,
          price: newPriceVal,
          totalPrice: newPriceVal,
          quantity: qty,
          isExcluded: combo.isExcluded,
          status: combo.isExcluded ? 'EXCLUDED' : 'ACTIVE',
        },
        isExcluded: combo.isExcluded,
        status: combo.isExcluded ? 'EXCLUDED' : 'ACTIVE',
      };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = updatedRow;
        return copy;
      } else {
        return [...prev, updatedRow];
      }
    });

    setPricingModel?.('MATRIX');
    onChange?.();
  };

  // Add / Duplicate Combination Modal
  const [isAddComboModalOpen, setIsAddComboModalOpen] = useState(false);
  const [newComboSelections, setNewComboSelections] = useState<Record<string, string>>({});
  const [newComboPrices, setNewComboPrices] = useState<Record<number, string>>({});
  const [comboFormError, setComboFormError] = useState<string | null>(null);

  const handleOpenAddComboModal = () => {
    const initSel: Record<string, string> = {};
    const groupsToUse = optionGroups.filter((g) => participatingGroupCodes.includes(g.code));
    for (const g of groupsToUse) {
      const activeOpts = g.options.filter((o) => o.isActive !== false);
      initSel[g.code] = activeOpts[0]?.value || '';
    }
    const initPrices: Record<number, string> = {};
    for (const q of quantityColumns) {
      initPrices[q] = '';
    }
    setNewComboSelections(initSel);
    setNewComboPrices(initPrices);
    setComboFormError(null);
    setIsAddComboModalOpen(true);
  };

  const handleOpenDuplicateModal = (combo: SellableCombination) => {
    setNewComboSelections({ ...combo.attributes });
    const prices: Record<number, string> = {};
    for (const q of quantityColumns) {
      prices[q] = combo.pricesByQty[q] !== undefined ? String(combo.pricesByQty[q]) : '';
    }
    setNewComboPrices(prices);
    setComboFormError(null);
    setIsAddComboModalOpen(true);
  };

  const handleSaveNewCombination = () => {
    const groupsToUse = optionGroups.filter((g) => participatingGroupCodes.includes(g.code));
    for (const g of groupsToUse) {
      if (!newComboSelections[g.code]) {
        setComboFormError(`Please select an option value for "${g.name}".`);
        return;
      }
    }

    const sortedKeys = Object.keys(newComboSelections).sort();
    const newId = sortedKeys.map((k) => `${k}:${newComboSelections[k]}`).join('|');

    if (sellableCombinations.some((c) => c.id === newId)) {
      setComboFormError('This exact combination already exists in the matrix. Each combination must be unique.');
      return;
    }

    const newRows: MatrixRowItem[] = [];
    for (const q of quantityColumns) {
      const rawPrice = parseFloat(newComboPrices[q] || '0');
      const prc = isNaN(rawPrice) ? 0 : rawPrice;
      newRows.push({
        id: `row-${newId}-${q}-${Date.now()}`,
        minQty: q,
        maxQty: q,
        unitPrice: q > 0 ? prc / q : prc,
        attributeCombination: {
          ...newComboSelections,
          price: prc,
          totalPrice: prc,
          quantity: q,
          status: 'ACTIVE',
        },
        isExcluded: false,
        status: 'ACTIVE',
      });
    }

    setMatrixRows((prev) => [...prev, ...newRows]);
    setPricingModel?.('MATRIX');
    setIsAddComboModalOpen(false);
    onChange?.();
  };

  const handleDeleteCombination = (combo: SellableCombination) => {
    if (!confirm(`Are you sure you want to remove combination "${combo.title}" and its configured rates?`)) {
      return;
    }

    setMatrixRows((prev) => {
      return prev.filter((r) => {
        const c = (r.attributeCombination as any) || {};
        const matchesCombo = Object.keys(combo.attributes).every(
          (k) => String(c[k]) === String(combo.attributes[k])
        );
        return !matchesCombo;
      });
    });

    onChange?.();
  };

  // Add Quantity Tier Modal
  const [isAddQtyModalOpen, setIsAddQtyModalOpen] = useState(false);
  const [newTierQty, setNewTierQty] = useState('');
  const [tierError, setTierError] = useState<string | null>(null);

  const handleAddQuantityTier = () => {
    const q = parseInt(newTierQty, 10);
    if (isNaN(q) || q <= 0) {
      setTierError('Quantity must be a positive integer.');
      return;
    }
    if (quantityColumns.includes(q)) {
      setTierError(`Quantity tier ${q} already exists.`);
      return;
    }

    setQuantityColumns((prev) => [...prev, q].sort((a, b) => a - b));
    setIsAddQtyModalOpen(false);
    setNewTierQty('');
    setTierError(null);
  };

  const handleRemoveQuantityColumn = (q: number) => {
    if (quantityColumns.length <= 1) {
      alert('At least one quantity tier column is required.');
      return;
    }
    if (confirm(`Remove quantity tier ${q.toLocaleString()} pcs from the combination matrix?`)) {
      setQuantityColumns((prev) => prev.filter((item) => item !== q));
      setMatrixRows((prev) => prev.filter((r) => Number(r.minQty) !== q));
      onChange?.();
    }
  };

  // Generate Starter Matrix for participating groups (Auto-Config Rates)
  const handleGenerateStarterCombinations = (forceOverwrite = false) => {
    const groupsToUse = optionGroups.filter(
      (g) => participatingGroupCodes.includes(g.code) && g.options.some((o) => o.isActive !== false)
    );
    if (groupsToUse.length === 0) {
      alert('Please select at least one participating option group with active choices.');
      return;
    }

    let overwrite = forceOverwrite;
    if (!overwrite && sellableCombinations.length > 0) {
      overwrite = confirm('Auto-config combinations: Click OK to regenerate and update rates for all combinations, or Cancel to only add missing combinations.');
    }

    // Build combinations
    let combos: Array<Record<string, string>> = [{}];
    for (const grp of groupsToUse) {
      const activeOpts = grp.options.filter((o) => o.isActive !== false);
      const nextCombos: Array<Record<string, string>> = [];
      for (const cur of combos) {
        for (const opt of activeOpts.slice(0, 4)) {
          nextCombos.push({ ...cur, [grp.code]: opt.value });
        }
      }
      combos = nextCombos;
    }

    const newRows: MatrixRowItem[] = [];
    const refRate = referenceUnitPrice > 0 ? referenceUnitPrice : 2.5;

    for (const combo of combos) {
      const sortedKeys = Object.keys(combo).sort();
      const id = sortedKeys.map((k) => `${k}:${combo[k]}`).join('|');
      if (!overwrite && sellableCombinations.some((c) => c.id === id)) continue;

      for (const q of quantityColumns) {
        const factor = q >= 1000 ? 0.75 : q >= 500 ? 0.85 : q >= 250 ? 0.92 : 1.0;
        const unitPrc = Math.round(refRate * factor * 100) / 100;
        const totalPrc = Math.round(unitPrc * q * 100) / 100;

        newRows.push({
          id: `starter-${id}-${q}-${Date.now()}`,
          minQty: q,
          maxQty: q,
          unitPrice: unitPrc,
          attributeCombination: {
            ...combo,
            price: totalPrc,
            totalPrice: totalPrc,
            quantity: q,
            status: 'ACTIVE',
          },
          isExcluded: false,
          status: 'ACTIVE',
        });
      }
    }

    if (overwrite) {
      setMatrixRows(newRows);
    } else {
      setMatrixRows((prev) => [...prev, ...newRows]);
    }
    setPricingModel?.('MATRIX');
    onChange?.();
  };

  // ---------------------------------------------------------------------------
  // 7. RENDER WORKSPACE
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full space-y-6">
      {/* ================================================================== */}
      {/* SECTION 1: STUDIO HEADER                                            */}
      {/* ================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                Step 04
              </span>
              <span className="text-slate-300">•</span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight font-display">
                Product Base Pricing & Additional Group Pricing
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
              Configure product base prices based on quantity tiers, and define bulk additive amounts for eligible option groups and choices.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Design Pricing from Step 3 Notice */}
            <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-950 font-medium shrink-0">
              <RiPaletteLine className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-900">
                  Step 3 Design Rate
                </span>
                <span className="text-[11px] text-amber-800">
                  {designServiceRequirement === 'DISABLED'
                    ? 'Design Service Disabled'
                    : `₹${designServiceFee} (Scope active)`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 2: PRODUCT BASE PRICE BY QUANTITY                          */}
      {/* ================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card space-y-6">
        {/* Header & Guidance */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <RiPriceTag3Line className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-black text-slate-900 font-display">
                Product Base Price by Quantity
              </h3>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Core Printing Rates
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  isRangeBracketMode
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {isRangeBracketMode ? '📦 Single Fixed Quantity (Range Brackets)' : '📦 Bulk Quantity Range (Discrete Tiers)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Manually define the foundational product base price for each configured quantity tier or range bracket.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-mono text-slate-400 block">Pricing Formula:</span>
            <span className="text-xs font-mono font-bold text-slate-800">
              {isRangeBracketMode
                ? 'Order Qty × Tier Rate (₹/pc)'
                : 'Selected Batch Total (₹)'}
            </span>
          </div>
        </div>

        {/* Active Pricing Structure Banner */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isRangeBracketMode
              ? 'bg-amber-50/80 border-amber-300/80 text-amber-950'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                isRangeBracketMode
                  ? 'bg-[#FFED00] text-slate-900 border border-amber-400 shadow-2xs'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isRangeBracketMode ? (
                <RiStackLine className="w-4 h-4" />
              ) : (
                <RiPriceTag3Line className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="font-bold text-xs flex items-center gap-2">
                <span>
                  Stage 1 Pricing Structure:{' '}
                  <strong>
                    {isRangeBracketMode
                      ? 'Single Fixed Quantity'
                      : 'Bulk Quantity Range'}
                  </strong>
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/70 border border-slate-200">
                  {isRangeBracketMode
                    ? 'Quantity Range Brackets'
                    : 'Fixed Discrete Packages'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {isRangeBracketMode
                  ? 'Tiers represent wholesale range brackets (e.g. 1–10 pcs, 11–20 pcs, 21–50 pcs, 51–100 pcs). Orders multiply matched bracket rate by actual quantity.'
                  : 'Tiers represent fixed discrete package quantities (e.g. 100 pcs, 1,000 pcs, 25,000 pcs) with set batch total prices.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = isRangeBracketMode ? 'BULK_RANGE' : 'SINGLE_FIXED_QUANTITY';
              setPricingModel?.(next);
              if (next === 'SINGLE_FIXED_QUANTITY') {
                setQuantityStep?.(0);
              }
              onChange?.();
            }}
            className="shrink-0 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 transition cursor-pointer shadow-2xs"
          >
            Switch to {isRangeBracketMode ? 'Bulk Quantity Range' : 'Single Fixed Quantity'}
          </button>
        </div>

        {/* ======================================================== */}
        {/* 2.A: QUANTITY & PRICE INCREASING MODE TOGGLE             */}
        {/* ======================================================== */}
        <div className="p-4 bg-gradient-to-r from-slate-50 via-amber-50/20 to-slate-50 border border-slate-200/90 rounded-xl space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                  Price Increasing Mode
                </span>
                {isIncrementalMode ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                    <RiCheckboxCircleLine className="w-3.5 h-3.5 text-emerald-600" />
                    Price Increasing ON (Increment-Based)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-200 border border-slate-300 px-2.5 py-0.5 rounded-full">
                    <RiLockLine className="w-3.5 h-3.5 text-slate-500" />
                    Price Increasing OFF (Fixed Quantities Only)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isIncrementalMode
                  ? 'Incremental mode is ON. Storefront section "4. Quantity & Pricing" will show only the increment option (stepper & quick add). Fixed batch cards are hidden.'
                  : 'Incremental mode is OFF. Storefront section "4. Quantity & Pricing" will show only the predefined fixed quantity tier cards. Stepper is disabled.'}
              </p>
            </div>

            {/* The Switch Toggle */}
            <div className="flex items-center gap-3 shrink-0 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className={`text-xs font-bold ${!isIncrementalMode ? 'text-slate-900' : 'text-slate-400'}`}>
                Fixed Qty Only
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isIncrementalMode}
                onClick={() => handleToggleIncrementalMode(!isIncrementalMode)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isIncrementalMode ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isIncrementalMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-xs font-bold ${isIncrementalMode ? 'text-amber-600' : 'text-slate-400'}`}>
                Incremental
              </span>
            </div>
          </div>

          {/* If Incremental Mode is ON: Show step configurator & presets */}
          {isIncrementalMode ? (
            <div className="pt-2 border-t border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-700">Increment Step:</span>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    value={quantityStep || 100}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setQuantityStep?.(val);
                      onChange?.();
                    }}
                    className="w-24 px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                    units
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  {[25, 50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setQuantityStep?.(preset);
                        onChange?.();
                      }}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer transition ${
                        (quantityStep || 100) === preset
                          ? 'bg-amber-500 text-white font-bold shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono">
                Order steps: {moq}, {moq + (quantityStep || 100)}, {moq + 2 * (quantityStep || 100)}... up to {maxQuantity || 100000}
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 text-xs text-slate-600">
              <RiInformationLine className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Storefront will restrict customers strictly to the quantity tier cards defined below. Stepper and custom quantities will be hidden.
              </span>
            </div>
          )}
        </div>

        {/* Quantity Tiers Toolbar & Chips */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-bold text-slate-600 uppercase">
              Configured Quantity Tiers:
            </span>
            <div className="flex flex-wrap gap-1.5 items-center">
              {addonQuantityTiers.map((tier) => (
                <span
                  key={tier.id}
                  className="inline-flex items-center gap-1.5 bg-white border border-slate-300 text-slate-800 font-mono text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs"
                >
                  <span>{tier.label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAddonTier(tier);
                      setEditAddonTierInput(
                        tier.minQty === tier.maxQty ? String(tier.minQty) : `${tier.minQty}-${tier.maxQty}`
                      );
                      setAddonTierError(null);
                    }}
                    className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    title="Edit tier quantity"
                  >
                    <RiEditLine className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAddonTier(tier)}
                    className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                    title="Remove Tier"
                  >
                    <RiCloseLine className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <button
                type="button"
                onClick={openAddTierModal}
                className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Add a Quantity Tier or Bulk Range Bracket"
              >
                <RiAddLine className="w-3.5 h-3.5 text-slate-700" />
                <span>+ Add Tier</span>
              </button>

              {pricingModel === 'BULK_RANGE' ? (
                <button
                  type="button"
                  onClick={() => {
                    setAddonQuantityTiers([
                      { id: '1-10', minQty: 1, maxQty: 10, label: '1–10 pcs' },
                      { id: '11-20', minQty: 11, maxQty: 20, label: '11–20 pcs' },
                      { id: '21-50', minQty: 21, maxQty: 50, label: '21–50 pcs' },
                      { id: '51-100', minQty: 51, maxQty: 100, label: '51–100 pcs' },
                      { id: '101-250', minQty: 101, maxQty: 250, label: '101–250 pcs' },
                    ]);
                    onChange?.();
                  }}
                  className="px-2 py-1 text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[11px] font-bold rounded-lg transition cursor-pointer"
                  title="Reset to standard wholesale brackets (1-10, 11-20, 21-50, 51-100, 101-250)"
                >
                  Standard Bulk Ranges
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddonQuantityTiers([
                      { id: '100', minQty: 100, maxQty: 100, label: '100 pcs' },
                      { id: '250', minQty: 250, maxQty: 250, label: '250 pcs' },
                      { id: '500', minQty: 500, maxQty: 500, label: '500 pcs' },
                      { id: '1000', minQty: 1000, maxQty: 1000, label: '1,000 pcs' },
                    ]);
                    onChange?.();
                  }}
                  className="px-2 py-1 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-bold rounded-lg transition cursor-pointer"
                  title="Reset to standard batch quantities (100, 250, 500, 1000)"
                >
                  Standard Batches
                </button>
              )}

              <button
                type="button"
                onClick={handleSortAddonTiers}
                className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] font-semibold transition cursor-pointer"
                title="Sort tiers in ascending order"
              >
                Sort Ascending
              </button>
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            {addonQuantityTiers.length} tier{addonQuantityTiers.length !== 1 ? 's' : ''} configured
          </span>
        </div>

        {/* Base Pricing Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 font-mono">
                <th className="py-3 px-4 whitespace-nowrap min-w-[220px]">
                  Base Pricing Component
                </th>
                <th className="py-3 px-3.5 whitespace-nowrap min-w-[140px]">
                  Status
                </th>
                {addonQuantityTiers.map((tier) => {
                  const isRange = tier.minQty !== tier.maxQty;
                  return (
                    <th key={tier.id} className="py-3 px-3.5 text-right whitespace-nowrap min-w-[190px]">
                      <div className="flex flex-col items-end gap-1">
                        {isRange ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Bulk Range
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                            Fixed Qty
                          </span>
                        )}
                        <div className="font-bold text-slate-900 text-xs">{tier.label}</div>
                        <span className="text-[9px] font-normal text-slate-400 lowercase block font-sans">
                          {isRange ? `${tier.minQty} to ${tier.maxQty} pcs` : `Exactly ${tier.minQty} pcs`}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900">Standard Product Base Rate</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Foundational printing cost across quantity tiers
                  </div>
                </td>
                <td className="py-3 px-3.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Active Base Rate</span>
                  </span>
                </td>
                {addonQuantityTiers.map((tier) => {
                  const currentRate = getBaseTierPrice(tier);
                  const totalPrice = getBaseTierTotalPrice(tier);
                  const isRange = tier.minQty !== tier.maxQty;
                  const minCost = currentRate !== '' && Number(currentRate) > 0 ? Math.round(Number(currentRate) * tier.minQty * 100) / 100 : (totalPrice !== '' ? Number(totalPrice) : 0);
                  const maxCost = isRange && currentRate !== '' && Number(currentRate) > 0 ? Math.round(Number(currentRate) * tier.maxQty * 100) / 100 : minCost;

                  return (
                    <td key={tier.id} className="py-2.5 px-3.5 text-right">
                      {isRange ? (
                        <div className="inline-flex flex-col items-end gap-1">
                          {/* Range Tier: Primary Per-Piece Unit Rate */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-amber-900 font-mono font-black">
                              Rate:
                            </span>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={currentRate !== '' ? currentRate : ''}
                                onChange={(e) => {
                                  const parsed = parseFloat(e.target.value);
                                  handleBaseTierPriceChange(
                                    tier,
                                    isNaN(parsed) || e.target.value === '' ? 0 : parsed
                                  );
                                }}
                                placeholder="0.00"
                                className="w-24 pl-5 pr-2 py-1 bg-amber-50/70 border border-amber-300 rounded-lg text-right font-mono text-xs font-black text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                                title={`Per product price between ${tier.minQty} and ${tier.maxQty} pcs`}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono font-bold">/pc</span>
                          </div>

                          {/* Live Breakdown for Range */}
                          {currentRate !== '' && Number(currentRate) > 0 ? (
                            <div className="text-[10px] font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 mt-1 text-right leading-tight">
                              <div>
                                {tier.minQty} pc{tier.minQty > 1 ? 's' : ''} = <strong className="text-slate-900">₹{(Number(currentRate) * tier.minQty).toLocaleString()}</strong>
                              </div>
                              <div className="text-[9px] text-slate-400">
                                {tier.maxQty} pcs = ₹{(Number(currentRate) * tier.maxQty).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-mono mt-1">
                              Enter ₹/pc
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-end gap-1.5">
                          {/* Single Fixed Quantity Tier: Total & Unit Rate */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-mono font-bold">Total:</span>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={totalPrice !== '' ? totalPrice : ''}
                                onChange={(e) => {
                                  const parsed = parseFloat(e.target.value);
                                  handleBaseTierTotalPriceChange(
                                    tier,
                                    isNaN(parsed) || e.target.value === '' ? 0 : parsed
                                  );
                                }}
                                placeholder="0"
                                className="w-24 pl-5 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                                title={`Total amount for ${tier.minQty} units`}
                              />
                            </div>
                          </div>

                          {/* Per-Unit Rate Input */}
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <span>₹/pc:</span>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={currentRate !== '' ? currentRate : ''}
                                onChange={(e) => {
                                  const parsed = parseFloat(e.target.value);
                                  handleBaseTierPriceChange(
                                    tier,
                                    isNaN(parsed) || e.target.value === '' ? 0 : parsed
                                  );
                                }}
                                placeholder="0.00"
                                className="w-16 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-right font-mono text-[11px] text-slate-600 focus:outline-none focus:border-amber-500"
                                title="Per unit rate"
                              />
                            </div>
                          </div>

                          {/* MODEL B: Total Product Weight (g) for this Discrete Quantity Tier */}
                          <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-slate-100">
                            <span className="text-[10px] text-sky-800 font-mono font-bold whitespace-nowrap">Weight:</span>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={getBulkTierWeight(tier)}
                                onChange={(e) => {
                                  const parsed = parseFloat(e.target.value);
                                  handleBulkTierWeightChange(
                                    tier,
                                    isNaN(parsed) || e.target.value === '' ? 0 : parsed
                                  );
                                }}
                                placeholder="e.g. 200"
                                className="w-20 pl-2 pr-5 py-0.5 bg-sky-50/70 border border-sky-300 rounded text-right font-mono text-[11px] font-bold text-slate-900 focus:outline-none focus:border-sky-500 shadow-2xs"
                                title={`Total product weight for ${tier.label} (e.g. 200g for 100 pcs, 1,500g for 1,000 pcs)`}
                              />
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-semibold pointer-events-none">g</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Guidance Footer */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <RiShieldCheckLine className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Base rates defined per tier serve as the starting unit price in customer quotations before option add-ons and design fees.
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            Authoritative Pricing Matrix Tier
          </span>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 3: ADDITIONAL PRICING BY GROUP & QUANTITY                  */}
      {/* ================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card space-y-6">
          {/* Header & Guidance */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <RiStackLine className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900 font-display">
                  Additional Pricing by Group & Quantity
                </h3>
                <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  Flat Add-on per Order Matrix
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                Configure flat add-on additional charges (<strong>flat ₹ per order</strong>) for option choices belonging to eligible option groups. Input values represent the complete additional charge for the selected quantity tier.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-mono text-slate-400 block">Pricing Formula:</span>
              <span className="text-xs font-mono font-bold text-slate-800">
                Flat Add-on per Order
              </span>
            </div>
          </div>

          {/* Group Selector Bar */}
          {eligibleAdditionalGroups.length === 0 ? (
            <div className="p-8 bg-amber-50/70 border border-amber-200/90 rounded-xl text-center space-y-3">
              <RiInformationLine className="w-8 h-8 mx-auto text-amber-600" />
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-bold text-amber-950">
                  No Option Groups are Eligible for Additional Pricing
                </h4>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  To configure additional pricing for attributes like Paper Stock, Finishing, or Material, go to <strong>Step 2 (Groups & Combinations)</strong> or the <strong>Option Groups Library (/admin/option-groups)</strong> and enable <em>&quot;Enable Additional Pricing&quot;</em>.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Group Selection Tabs */}
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RiStackLine className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                      Select Eligible Option Group:
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {eligibleAdditionalGroups.length} eligible group{eligibleAdditionalGroups.length !== 1 ? 's' : ''} available
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {eligibleAdditionalGroups.map((g) => {
                    const isSel = activeAddonGroup?.id === g.id;
                    const choiceCount = g.options.filter((o) => o.isActive !== false).length;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedAddonGroupId(g.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                          isSel
                            ? 'bg-amber-100 text-amber-950 border-amber-300 shadow-2xs ring-2 ring-amber-400/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span>{g.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">({g.code})</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                          {choiceCount} choice{choiceCount !== 1 ? 's' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeAddonGroup && (
                <div className="space-y-4">
                  {/* Quantity Tiers Bar & Toolbar */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    {/* Quantity Tiers Chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-slate-600 uppercase">
                        Configured Quantity Tiers:
                      </span>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {addonQuantityTiers.map((tier) => (
                          <span
                            key={tier.id}
                            className="inline-flex items-center gap-1.5 bg-white border border-slate-300 text-slate-800 font-mono text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs"
                          >
                            <span>{tier.label}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddonTier(tier);
                                setEditAddonTierInput(tier.minQty === tier.maxQty ? String(tier.minQty) : `${tier.minQty}-${tier.maxQty}`);
                                setAddonTierError(null);
                              }}
                              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                              title="Edit tier quantity"
                            >
                              <RiEditLine className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAddonTier(tier)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                              title="Remove Tier"
                            >
                              <RiCloseLine className="w-3 h-3" />
                            </button>
                          </span>
                        ))}

                        <button
                          type="button"
                          onClick={openAddTierModal}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Add a Single Fixed Quantity or Bulk Range Bracket"
                        >
                          <RiAddLine className="w-3.5 h-3.5 text-slate-700" />
                          <span>+ Add Tier</span>
                        </button>


                        <button
                          type="button"
                          onClick={handleSortAddonTiers}
                          className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] font-semibold transition cursor-pointer"
                          title="Sort tiers in ascending order"
                        >
                          Sort Ascending
                        </button>
                      </div>
                    </div>

                    {/* Right side: Remove Group Action */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveGroupFromAddonPricing(activeAddonGroup.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer"
                        title="Disable additional pricing for this group on this product"
                      >
                        <RiDeleteBin7Line className="w-3.5 h-3.5" />
                        <span>Remove Group from Additional Pricing</span>
                      </button>
                    </div>
                  </div>

                  {/* Pricing Matrix Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 font-mono">
                          <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">
                            Option Choice ({activeAddonGroup.name})
                          </th>
                          <th className="py-3 px-3.5 whitespace-nowrap min-w-[140px]">
                            Pricing Status
                          </th>
                          {addonQuantityTiers.map((tier) => (
                            <th key={tier.id} className="py-3 px-3.5 text-right whitespace-nowrap min-w-[130px]">
                              <div>{tier.label}</div>
                              <span className="text-[9px] font-normal text-slate-400 lowercase block font-sans">
                                ₹ / order
                              </span>
                            </th>
                          ))}
                          <th className="py-3 px-3.5 text-center whitespace-nowrap">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {visibleAddonGroupOptions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={addonQuantityTiers.length + 3}
                              className="p-8 text-center text-slate-400 italic"
                            >
                              No active option choices configured in group &quot;{activeAddonGroup.name}&quot;. Configure choices in Step 2.
                            </td>
                          </tr>
                        ) : (
                          visibleAddonGroupOptions.map((opt) => {
                            const isExcluded = isAddonOptionExcluded(activeAddonGroup.code, opt.value);

                            return (
                              <tr
                                key={opt.id}
                                className={`transition-colors ${
                                  isExcluded
                                    ? 'bg-slate-50/70 text-slate-400'
                                    : 'hover:bg-slate-50/80 text-slate-900'
                                }`}
                              >
                                {/* Option Label & Code */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold ${isExcluded ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                      {opt.label}
                                    </span>
                                    {opt.isDefault && (
                                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                    /{opt.value}
                                  </div>
                                </td>

                                {/* Inclusion / Exclusion Toggle */}
                                <td className="py-3 px-3.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAddonOptionExcluded(activeAddonGroup.code, opt.value)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                                      isExcluded
                                        ? 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isExcluded ? 'bg-slate-400' : 'bg-emerald-500'
                                      }`}
                                    />
                                    <span>{isExcluded ? 'Excluded' : 'Active Rate'}</span>
                                  </button>
                                </td>

                                {/* Tier Price Inputs */}
                                {addonQuantityTiers.map((tier) => {
                                  const currentRate = getAddonTierPrice(activeAddonGroup.code, opt.value, tier);
                                  const numRate = typeof currentRate === 'number' ? currentRate : 0;
                                  const perPc = tier.minQty > 0 ? Math.round((numRate / tier.minQty) * 100) / 100 : 0;
                                  const isMissing = !isExcluded && (currentRate === '' || currentRate === 0);

                                  return (
                                    <td key={tier.id} className="py-2.5 px-3.5 text-right">
                                      <div className="inline-flex flex-col items-end">
                                        <div className="relative">
                                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">
                                            ₹
                                          </span>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            disabled={isExcluded}
                                            value={currentRate !== '' ? currentRate : ''}
                                            onChange={(e) => {
                                              const parsed = parseFloat(e.target.value);
                                              handleAddonTierPriceChange(
                                                activeAddonGroup.code,
                                                opt.value,
                                                tier,
                                                isNaN(parsed) ? 0 : parsed
                                              );
                                            }}
                                            className={`w-28 pl-6 pr-2 py-1 text-right font-mono text-xs font-bold rounded-lg border transition ${
                                              isExcluded
                                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                : isMissing
                                                ? 'bg-amber-50/50 border-amber-300 text-slate-900 focus:border-amber-500'
                                                : 'bg-white text-slate-900 border-slate-300 focus:border-slate-900 shadow-2xs'
                                            }`}
                                            placeholder="0.00"
                                          />
                                        </div>

                                        {/* Helper showing addition */}
                                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                                          {isMissing ? (
                                            <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                                              <RiInformationLine className="w-2.5 h-2.5" />
                                              <span>₹0 flat / order</span>
                                            </span>
                                          ) : (
                                            <span title={`Effective ~₹${perPc}/pc for ${tier.label}`}>
                                              +₹{numRate.toLocaleString()} flat / order (~₹{perPc}/pc)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}

                                {/* Actions */}
                                <td className="py-3 px-3.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAddonOptionExcluded(activeAddonGroup.code, opt.value)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer text-xs"
                                    title={isExcluded ? 'Include choice in additional pricing' : 'Exclude choice from additional pricing'}
                                  >
                                    {isExcluded ? 'Include' : 'Exclude'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Guidance Footer */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <RiCheckboxCircleLine className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Values configured here will be evaluated automatically during customer quote calculation (<code>POST /pricing/calculate-quote</code>).
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      Tier match: minQty ≤ Order Quantity ≤ maxQty
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: SHIPPING & LOGISTICS WEIGHT CONFIGURATION                      */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shrink-0 mt-0.5">
                <RiTruckLine className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Shipping & Logistics Weight Configuration
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700">
                    Stage 5 Core
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure physical product weight and tare packaging profile. Weight determines live shipping slabs and excess kg rates during customer checkout.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isShippable !== false}
                  onChange={(e) => setIsShippable?.(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                <span className="ml-2.5 text-xs font-semibold text-slate-700">
                  {isShippable !== false ? 'Shippable Physical Product' : 'Digital / In-store Only'}
                </span>
              </label>
            </div>
          </div>

          {isShippable === false ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 text-slate-600 text-xs">
              <RiInformationLine className="w-5 h-5 text-slate-400 shrink-0" />
              <span>
                Shipping calculation is disabled for this product. No shipping charge or weight slabs will be applied at checkout.
              </span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Packaging Profile & Master Attributes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <RiBox3Line className="w-4 h-4 text-sky-600" />
                      Default Packaging Profile (Tare Weight)
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">Added once per order</span>
                  </div>
                  <select
                    value={packagingProfileId || (activePackagingProfile?.id ?? '')}
                    onChange={(e) => setPackagingProfileId?.(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    {packagingProfilesList.length === 0 ? (
                      <option value="">Standard Carton Box (200g - 220×160×120mm)</option>
                    ) : (
                      packagingProfilesList.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} — {pkg.weightGrams}g ({pkg.lengthMm}×{pkg.widthMm}×{pkg.heightMm} mm)
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Tare packaging weight is added strictly <strong>once</strong> to the shipment's total weight. It is never multiplied by product order quantity.
                  </p>
                </div>

                <div className="p-4 bg-sky-50/40 border border-sky-100 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                    <RiScales3Line className="w-4 h-4 text-sky-600" />
                    Live Dimensional & Tare Specs
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-white p-2 rounded-lg border border-sky-100">
                      <div className="text-[10px] text-slate-400 font-medium">Box Tare Weight</div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {activePackagingProfile?.weightGrams ?? 200} grams ({(Number(activePackagingProfile?.weightGrams ?? 200) / 1000).toFixed(2)} kg)
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-sky-100">
                      <div className="text-[10px] text-slate-400 font-medium">Volumetric Weight (5000 Divisor)</div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {(((activePackagingProfile?.lengthMm ?? 220) / 10 * (activePackagingProfile?.widthMm ?? 160) / 10 * (activePackagingProfile?.heightMm ?? 120) / 10) / 5000).toFixed(2)} kg
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Billable weight = <code>max(Actual Weight + Box Tare, Volumetric Weight)</code>.
                  </p>
                </div>
              </div>

              {/* Model A vs Model B Weight Configuration */}
              {isRangeBracketMode ? (
                /* MODEL A: Single Fixed Quantity -> 1 single weight input with live automatic preview */
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          MODEL A: Single Fixed Quantity Weight Configuration
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Admin enters one product weight per printed piece. Total weight is automatically calculated as <code>Total Product Weight = Actual Order Quantity × Weight Per Piece</code>.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-2xs">
                      <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        Weight per Printed Piece:
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={unitWeightGrams !== undefined && unitWeightGrams !== '' ? unitWeightGrams : 2}
                          onChange={(e) => setUnitWeightGrams?.(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-20 px-2 py-1 text-xs font-bold text-slate-900 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none text-right pr-6"
                        />
                        <span className="absolute right-2 text-[10px] text-slate-400 font-semibold pointer-events-none">g</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-4">Sample Order Quantity</th>
                          <th className="py-2.5 px-4 text-right">Weight per Piece</th>
                          <th className="py-2.5 px-4 text-right">Total Product Weight</th>
                          <th className="py-2.5 px-4 text-right">Packaging Tare Box</th>
                          <th className="py-2.5 px-4 text-right bg-sky-50/50 text-sky-900 font-bold">Total Shipment Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[1, 5, 10, 20, 50, 100].map((sampleQty) => {
                          const perPieceGrams = Number(unitWeightGrams) || 2;
                          const netWeightGrams = Math.round(sampleQty * perPieceGrams * 100) / 100;
                          const tareGrams = Number(activePackagingProfile?.weightGrams ?? 200);
                          const totalWeightGrams = netWeightGrams + tareGrams;
                          return (
                            <tr key={`sample-qty-${sampleQty}`} className="hover:bg-slate-50/60 transition">
                              <td className="py-2.5 px-4 font-semibold text-slate-800">
                                {sampleQty} {sampleQty === 1 ? 'piece' : 'pieces'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                                {perPieceGrams} g
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                                {netWeightGrams} g ({sampleQty} × {perPieceGrams}g)
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                                + {tareGrams} g
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-sky-900 bg-sky-50/30">
                                {totalWeightGrams >= 1000 ? `${(totalWeightGrams / 1000).toFixed(3)} kg` : `${totalWeightGrams} g`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* MODEL B: Bulk Quantity Range -> Configured in Section 2 Table, Live Breakdown displayed here */
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          MODEL B: Bulk Quantity Range Weight Breakdown (Discrete Tiers)
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Total product weights are manually entered per discrete quantity tier in <strong>Section 2 (Product Base Price by Quantity table)</strong> above. These weights represent the complete batch and are <strong>never multiplied by quantity</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-4">Configured Quantity Tier</th>
                          <th className="py-2.5 px-4 text-right">Items in Tier</th>
                          <th className="py-2.5 px-4 text-right">Configured Product Weight</th>
                          <th className="py-2.5 px-4 text-right">Box Tare (Added Once)</th>
                          <th className="py-2.5 px-4 text-right bg-sky-50/50 text-sky-900 font-bold">Total Shipment Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {addonQuantityTiers.map((tier) => {
                          const configuredWeight = Number(getBulkTierWeight(tier)) || (tier.minQty * (Number(unitWeightGrams) || 2));
                          const tareGrams = Number(activePackagingProfile?.weightGrams ?? 200);
                          const totalWeightGrams = configuredWeight + tareGrams;
                          return (
                            <tr key={tier.id} className="hover:bg-slate-50/60 transition">
                              <td className="py-2.5 px-4 font-semibold text-slate-800">
                                {tier.label}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                                {tier.minQty} pcs
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                                {configuredWeight >= 1000 ? `${(configuredWeight / 1000).toFixed(2)} kg (${configuredWeight} g)` : `${configuredWeight} g`}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                                + {tareGrams} g
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-sky-900 bg-sky-50/30">
                                {totalWeightGrams >= 1000 ? `${(totalWeightGrams / 1000).toFixed(3)} kg` : `${totalWeightGrams} g`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bottom Shipping Notice */}
              <div className="p-3 bg-sky-50/60 border border-sky-200/70 rounded-xl flex items-center justify-between text-xs text-sky-800">
                <div className="flex items-center gap-2">
                  <RiCheckboxCircleLine className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    Shipping rates (Local, Regional, National, Remote) and Weight Slabs are centrally managed under <strong>Admin Sidebar &rarr; Shipping & Logistics</strong>.
                  </span>
                </div>
                <a
                  href="/admin/shipping/rates"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-700 hover:text-sky-900 font-semibold underline text-[11px] shrink-0"
                >
                  View Rate Cards &rarr;
                </a>
              </div>
            </div>
          )}
        </div>
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => {
                onNavigateToTab('ARTWORK');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              ← Back to Step 4: Artwork Upload & Design Matrix
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Step 5 Summary:</span>
          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono text-[11px]">
            Base Price: {formatCurrency(Number(basePrice))}
          </span>
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
            {matrixRows.length} Pricing Matrix Rows
          </span>
          {additionalPricingRows.length > 0 && (
            <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-mono text-[11px]">
              {additionalPricingRows.length} Add-on Rates
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => {
                onNavigateToTab('REVIEW');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] font-bold text-xs px-4 py-2.5 rounded-lg border border-[#E3A008]/40 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <span>Next: 6. Review & Publish</span>
              <RiArrowRightLine className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* MODALS: ADD COMBINATION & ADD QUANTITY TIER                        */}
      {/* ================================================================== */}
      {/* ================================================================== */}
      {/* MODALS: ADDITIONAL PRICING QUANTITY TIERS (ADD & EDIT)              */}
      {/* ================================================================== */}
      {/* Modal 3: Add Pricing Tier / Bulk Range Bracket */}
      {isAddAddonTierModalOpen && (
        <Modal
          isOpen={isAddAddonTierModalOpen}
          onClose={() => {
            setIsAddAddonTierModalOpen(false);
            setAddonTierError(null);
          }}
          title={pricingModel === 'BULK_RANGE' ? 'Add Bulk Quantity Range Bracket' : 'Add Fixed Quantity Tier'}
        >
          <div className="space-y-4">
            {/* Mode Banner Replicated from Stage 1 */}
            {pricingModel !== 'BULK_RANGE' ? (
              <div className="flex items-center justify-between p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 font-medium">
                <div className="flex items-center gap-2">
                  <RiStackLine className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Pricing Mode: <strong>Single Fixed Quantity</strong> (Replicated from Stage 1)</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold shrink-0">
                  Fixed Batch
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 font-medium">
                <div className="flex items-center gap-2">
                  <RiPriceTag3Line className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pricing Mode: <strong>Bulk Quantity Range</strong> (Replicated from Stage 1)</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold shrink-0">
                  Wholesale Bracket
                </span>
              </div>
            )}

            {addonTierError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-bold flex items-center gap-1.5">
                <RiAlertFill className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{addonTierError}</span>
              </div>
            )}

            {/* TAB 1: SINGLE FIXED QUANTITY */}
            {addTierMode === 'single' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Quantity (pieces) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={singleQtyInput}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setSingleQtyInput(isNaN(val) ? '' : val);
                      setAddonTierError(null);
                    }}
                    placeholder="e.g. 100"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Popular Quantities
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[50, 100, 200, 250, 500, 1000, 2500, 5000].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => {
                          setSingleQtyInput(qty);
                          setAddonTierError(null);
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg font-mono font-bold border transition cursor-pointer ${
                          singleQtyInput === qty
                            ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {qty} pcs
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Unit Rate */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Initial Unit Rate (₹ / pc) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={singleInitialRate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSingleInitialRate(isNaN(val) ? '' : val);
                      }}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BULK QUANTITY RANGE */}
            {addTierMode === 'range' && (
              <div className="space-y-4">
                {/* Range From & To */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      From (Min Qty) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={rangeMinInput}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setRangeMinInput(isNaN(val) ? '' : val);
                        setAddonTierError(null);
                      }}
                      placeholder="e.g. 51"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      To (Max Qty) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={rangeMaxInput}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setRangeMaxInput(isNaN(val) ? '' : val);
                        setAddonTierError(null);
                      }}
                      placeholder="e.g. 100"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Quick Presets for Ranges */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Popular Bulk Ranges
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { min: 1, max: 10, label: '1–10 pcs' },
                      { min: 11, max: 20, label: '11–20 pcs' },
                      { min: 21, max: 50, label: '21–50 pcs' },
                      { min: 51, max: 100, label: '51–100 pcs' },
                      { min: 101, max: 250, label: '101–250 pcs' },
                      { min: 251, max: 500, label: '251–500 pcs' },
                      { min: 501, max: 1000, label: '501–1,000 pcs' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setRangeMinInput(preset.min);
                          setRangeMaxInput(preset.max);
                          setAddonTierError(null);
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg font-mono font-bold border transition cursor-pointer ${
                          rangeMinInput === preset.min && rangeMaxInput === preset.max
                            ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Per-Piece Bulk Rate */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 block">
                      Per-Piece Unit Rate (₹ / pc) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Applied to every piece in this range
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rangeInitialRate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setRangeInitialRate(isNaN(val) ? '' : val);
                      }}
                      placeholder="e.g. 100 (or 90 for 11-20)"
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {rangeInitialRate !== '' && Number(rangeInitialRate) > 0 && rangeMinInput && rangeMaxInput && (
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs space-y-1 mt-2">
                      <div className="font-bold text-amber-950 flex items-center justify-between">
                        <span>Per-Piece Rate:</span>
                        <span className="font-mono text-sm">₹{Number(rangeInitialRate).toFixed(2)} / pc</span>
                      </div>
                      <div className="text-[11px] text-amber-800 font-mono leading-relaxed">
                        • {rangeMinInput} pc{Number(rangeMinInput) > 1 ? 's' : ''} = ₹{(Number(rangeInitialRate) * Number(rangeMinInput)).toLocaleString()}
                        {Number(rangeMaxInput) > Number(rangeMinInput) + 1 ? `, ${Number(rangeMinInput) + 1} pcs = ₹${(Number(rangeInitialRate) * (Number(rangeMinInput) + 1)).toLocaleString()}` : ''}
                        {' ... up to '}
                        {rangeMaxInput} pcs = ₹{(Number(rangeInitialRate) * Number(rangeMaxInput)).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Custom Input Helper */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                {pricingModel === 'BULK_RANGE'
                  ? 'Configuring wholesale range bracket (From–To pcs). Range brackets apply dynamically per unit ordered.'
                  : 'Configuring fixed batch package quantity. Customers can only order exact predefined counts.'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsAddAddonTierModalOpen(false);
                  setAddonTierError(null);
                }}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddAddonTier}
                className="px-4 py-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 text-xs font-black rounded-lg shadow-xs transition cursor-pointer"
              >
                Add Tier
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 4: Edit Additional Pricing Quantity Tier */}
      {editingAddonTier !== null && (
        <Modal
          isOpen={editingAddonTier !== null}
          onClose={() => {
            setEditingAddonTier(null);
            setAddonTierError(null);
          }}
          title={`Edit Quantity Tier (${editingAddonTier.label})`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Update the quantity threshold or range for this tier. Configured rates for this tier will be preserved.
            </p>

            {addonTierError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-bold flex items-center gap-1.5">
                <RiAlertFill className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{addonTierError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                {pricingModel === 'BULK_RANGE' ? 'Quantity Range Bracket (pieces)' : 'Fixed Quantity Number (pieces)'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editAddonTierInput}
                onChange={(e) => {
                  setEditAddonTierInput(e.target.value);
                  setAddonTierError(null);
                }}
                placeholder={pricingModel === 'BULK_RANGE' ? 'e.g. 11-20 or 21-50' : 'e.g. 250 or 500'}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                autoFocus
              />
              <span className="text-[11px] text-slate-500 block">
                {pricingModel === 'BULK_RANGE'
                  ? 'Bulk Quantity Range mode is active. Enter a range bracket (e.g. 11-20 or 21-50).'
                  : 'Single Fixed Quantity mode is active. Enter an exact positive number (e.g. 250). Range brackets like 10-20 are not allowed.'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditingAddonTier(null);
                  setAddonTierError(null);
                }}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditAddonTier}
                className="px-4 py-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 text-xs font-black rounded-lg shadow-xs transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
