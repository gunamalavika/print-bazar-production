'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DynamicProduct,
  ProductOptionGroup,
  ProductOption,
  ProductConfigurationRule,
  PersonalizationTemplate,
  PersonalizationPayload,
  api,
  resolveImageUrl,
  ProductOptionRequirement,
} from '@/lib/api';
import { resolveArtworkConditions, matchesRuleCondition } from '@/lib/artwork-rule-resolver';
import { evaluateProductConfiguration } from '@/lib/product-rules-engine';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';
import { formatCurrency, getEstimatedDeliveryText, isVideoMedia } from '@/lib/utils';
import {
  RiUploadCloud2Line,
  RiCheckLine,
  RiAlertFill,
  RiCloseLine,
  RiAddLine,
  RiSubtractLine,
  RiArrowUpCircleLine,
  RiInformationLine,
  RiPaletteLine,
  RiShieldCheckLine,
  RiShoppingCart2Line,
  RiFlashlightLine,
  RiFileTextLine,
  RiDeleteBinLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiTruckLine,
  RiTimeLine,
  RiRulerLine,
  RiLockLine,
  RiMapPin2Line,
  RiCameraLine,
  RiCheckDoubleLine,
  RiFileList3Line,
  RiUpload2Line,
  RiSparklingFill,
  RiLightbulbLine,
  RiEdit2Line,
  RiCustomerService2Line,
  RiZoomInLine,
  RiPlayCircleLine,
  RiMovieLine,
  RiLoader4Line,
} from 'react-icons/ri';
import { Button, Badge, Modal } from '@/components/ui';

export interface FlowArtworkState {
  fileUrl: string;
  storageKey?: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  actualMegapixels?: number | null;
  requiredMegapixels?: number;
  qualityStatus?: 'PASSED' | 'WARNING' | 'NOT_APPLICABLE';
  warningMessage?: string | null;
  warningAccepted?: boolean;
}

export interface FlowReferenceImageState {
  fileUrl: string;
  storageKey?: string;
  originalFileName: string;
  fileSize?: number;
}

export interface ProductConfigurationResult {
  product: DynamicProduct;
  quantity: number;
  fieldValues: Record<string, any>;
  variantLines?: Array<{
    combination: Record<string, string>;
    quantity: number;
    unitPrice?: number;
    lineSubtotal?: number;
  }>;
  hasArtwork: boolean;
  artworkFile: FlowArtworkState | null;
  artworkFiles?: Record<string, FlowArtworkState>;
  hasReferenceImage: boolean;
  referenceImage: FlowReferenceImageState | null;
  hasDesignService: boolean;
  designNotes: string;
  deliveryMethod: 'COURIER' | 'STORE_PICKUP';
  shippingPincode?: string;
  paymentMethod: 'ONLINE';
  paymentMode: 'FULL' | 'SPLIT_50';
  advanceAmount: number;
  balanceAmount: number;
  subtotal: number;
  grandTotal: number;
  personalization?: PersonalizationPayload | null;
  quote: any;
}

export interface LivePricingSummary {
  grandTotal: number;
  subtotal: number;
  unitPrice: number;
  quantity: number;
  totalTax: number;
  shippingAmount: number;
  isCalculating: boolean;
  appliedOffer?: any;
  quote?: any;
}

export type StepId = 'CUSTOMIZE' | 'ARTWORK' | 'REVIEW';

export interface ProductConfigurationFlowProps {
  product: DynamicProduct;
  initialQuantity?: number;
  initialFieldValues?: Record<string, any>;
  isPreviewMode?: boolean;
  onPriceChange?: (summary: LivePricingSummary) => void;
  onAddToCart?: (result: ProductConfigurationResult) => void | Promise<void>;
  onBuyNow?: (result: ProductConfigurationResult) => void | Promise<void>;
}

export function ProductConfigurationFlow({
  product,
  initialQuantity,
  initialFieldValues,
  isPreviewMode = false,
  onPriceChange,
  onAddToCart,
  onBuyNow,
}: ProductConfigurationFlowProps) {
  // ---------------------------------------------------------------------------
  // WORKFLOW STEP STATE (Step 1 -> Step 2 -> Step 3)
  // ---------------------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState<StepId>('CUSTOMIZE');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isGuidelinesModalOpen, setIsGuidelinesModalOpen] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [step1Attempted, setStep1Attempted] = useState<boolean>(false);
  const [step2Attempted, setStep2Attempted] = useState<boolean>(false);
  const [step3Attempted, setStep3Attempted] = useState<boolean>(false);

  // Artwork selection path (Option A: UPLOAD, Option B: DESIGN_ASSISTANCE, Option C: NO_ARTWORK)
  const [artworkChoice, setArtworkChoice] = useState<'UPLOAD' | 'DESIGN_ASSISTANCE' | 'NO_ARTWORK'>('UPLOAD');

  // ---------------------------------------------------------------------------
  // 1. EXTRACT OPTION GROUPS (Dynamic Setup Studio Architecture)
  // ---------------------------------------------------------------------------
  const rawGroups: ProductOptionGroup[] = useMemo(() => {
    if (product.optionGroups && product.optionGroups.length > 0) {
      return [...product.optionGroups].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    // Backward compatibility for legacy product structure
    if (product.fields && product.fields.length > 0) {
      return product.fields.map((f: any) => ({
        id: f.id,
        productId: product.id,
        name: f.label || f.name,
        code: f.key || f.code,
        inputType: f.type || 'SELECT',
        description: f.description,
        isRequired: Boolean(f.isRequired),
        isCustomerVisible: f.isCustomerVisible !== false,
        sortOrder: f.sortOrder || 0,
        isActive: true,
        options: (f.options || []).map((o: any) => ({
          id: o.id,
          groupId: f.id,
          label: o.label || o.name,
          value: o.value || o.code,
          priceModifierType: o.priceModifierType || 'FIXED',
          priceModifier: o.priceModifier || 0,
          sortOrder: o.sortOrder || 0,
          isDefault: Boolean(o.isDefault),
          isActive: o.isActive !== false,
          fileCount: o.fileCount,
          fileSlotLabels: o.fileSlotLabels,
          minMegapixels: o.minMegapixels,
        })),
      }));
    }
    return [];
  }, [product.optionGroups, product.fields, product.id]);

  // Selections state (groupCode -> selected option value)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = { ...(initialFieldValues || {}) };
    for (const group of rawGroups) {
      if (initial[group.code] === undefined && group.options && group.options.length > 0) {
        const defaultOpt = group.options.find((o) => o.isDefault && o.isActive) || group.options[0];
        if (defaultOpt) {
          initial[group.code] = defaultOpt.value;
        }
      }
    }
    return initial;
  });

  // Ensure defaults populated on initial load or group change
  useEffect(() => {
    setSelectedOptions((prev) => {
      let changed = false;
      const updated = { ...prev };
      for (const group of rawGroups) {
        if (updated[group.code] === undefined && group.options && group.options.length > 0) {
          const defaultOpt = group.options.find((o) => o.isDefault && o.isActive) || group.options[0];
          if (defaultOpt) {
            updated[group.code] = defaultOpt.value;
            changed = true;
          }
        }
      }
      return changed ? updated : prev;
    });
  }, [rawGroups]);

  // ---------------------------------------------------------------------------
  // MULTI-VARIANT ORDERING ARCHITECTURE
  // ---------------------------------------------------------------------------
  const explicitDimensions = Array.isArray(product.variantDimensions) ? product.variantDimensions : [];
  const variantWiseGroupCodes = useMemo(
    () => rawGroups.filter((g) => g.selectionBehavior === 'VARIANT_WISE').map((g) => g.code),
    [rawGroups]
  );

  const effectiveVariantDimensions = useMemo(() => {
    if (explicitDimensions.length > 0) return explicitDimensions;
    if (variantWiseGroupCodes.length > 0) return variantWiseGroupCodes;
    return [];
  }, [explicitDimensions, variantWiseGroupCodes]);

  const isMultiVariantEnabled = Boolean(
    (product.allowMultipleVariants || variantWiseGroupCodes.length > 0) &&
    effectiveVariantDimensions.length > 0
  );

  const dimensionGroups = useMemo(() => {
    if (!isMultiVariantEnabled || effectiveVariantDimensions.length === 0) return [];
    return rawGroups.filter((g) => effectiveVariantDimensions.includes(g.code));
  }, [rawGroups, isMultiVariantEnabled, effectiveVariantDimensions]);

  const sharedGroups = useMemo(() => {
    if (!isMultiVariantEnabled || effectiveVariantDimensions.length === 0) return rawGroups;
    return rawGroups.filter((g) => !effectiveVariantDimensions.includes(g.code));
  }, [rawGroups, isMultiVariantEnabled, effectiveVariantDimensions]);

  interface VariantLineState {
    id: string;
    combination: Record<string, string>;
    quantity: number;
  }

  const [variantLines, setVariantLines] = useState<VariantLineState[]>(() => {
    if (!isMultiVariantEnabled || dimensionGroups.length === 0) return [];
    const initialCombo: Record<string, string> = {};
    for (const dg of dimensionGroups) {
      const def = dg.options?.find((o) => o.isDefault && o.isActive !== false) || dg.options?.[0];
      if (def) {
        initialCombo[dg.code] = def.value;
      }
    }
    return [
      {
        id: `vl-${Date.now()}-1`,
        combination: initialCombo,
        quantity: Math.max(1, Number(product.minQuantity) || 1),
      },
    ];
  });

  const totalVariantQuantity = useMemo(() => {
    if (!isMultiVariantEnabled) return 0;
    return variantLines.reduce((acc, line) => acc + (Number(line.quantity) || 0), 0);
  }, [isMultiVariantEnabled, variantLines]);

  useEffect(() => {
    if (isMultiVariantEnabled && dimensionGroups.length > 0) {
      setVariantLines((prev) => {
        if (prev.length > 0) return prev;
        const initialCombo: Record<string, string> = {};
        for (const dg of dimensionGroups) {
          const def = dg.options?.find((o) => o.isDefault && o.isActive !== false) || dg.options?.[0];
          if (def) {
            initialCombo[dg.code] = def.value;
          }
        }
        return [
          {
            id: `vl-${Date.now()}-1`,
            combination: initialCombo,
            quantity: Math.max(1, Number(product.minQuantity) || 1),
          },
        ];
      });
    }
  }, [isMultiVariantEnabled, dimensionGroups, product.minQuantity]);

  const handleAddVariantLine = () => {
    const newCombo: Record<string, string> = {};
    for (const dg of dimensionGroups) {
      const def = dg.options?.find((o) => o.isDefault && o.isActive !== false) || dg.options?.[0];
      if (def) {
        newCombo[dg.code] = def.value;
      }
    }
    setVariantLines((prev) => [
      ...prev,
      {
        id: `vl-${Date.now()}-${prev.length + 1}`,
        combination: newCombo,
        quantity: 1,
      },
    ]);
  };

  const handleRemoveVariantLine = (id: string) => {
    if (variantLines.length <= 1) return;
    setVariantLines((prev) => prev.filter((vl) => vl.id !== id));
  };

  const handleUpdateVariantLineCombination = (id: string, groupCode: string, value: string) => {
    setVariantLines((prev) =>
      prev.map((vl) =>
        vl.id === id
          ? { ...vl, combination: { ...vl.combination, [groupCode]: value } }
          : vl
      )
    );
  };

  const handleUpdateVariantLineQuantity = (id: string, newQty: number) => {
    const validQty = Math.max(1, Math.floor(newQty) || 1);
    setVariantLines((prev) =>
      prev.map((vl) => (vl.id === id ? { ...vl, quantity: validQty } : vl))
    );
  };

  // ---------------------------------------------------------------------------
  // 2. REAL-TIME CONDITIONAL RULES EVALUATION ENGINE
  // ---------------------------------------------------------------------------
  const [ruleNotice, setRuleNotice] = useState<string | null>(null);

  const evaluatedConfig = useMemo(() => {
    return evaluateProductConfiguration(
      rawGroups as any,
      product.configurationRules || [],
      selectedOptions
    );
  }, [product.configurationRules, rawGroups, selectedOptions]);

  const {
    visibleGroupCodes,
    groupStatus: groupStatusMap,
    optionStatus: optionStatusMap,
    invalidCombinations,
    sanitizedSelections,
    changedSelections,
    activeCharges,
  } = evaluatedConfig;

  // Resolve customer-visible option groups
  const visibleGroups = useMemo(() => {
    return rawGroups.filter((g) => visibleGroupCodes.includes(g.code));
  }, [rawGroups, visibleGroupCodes]);

  // Synchronize sanitized selections when an option becomes incompatible with controlling selections
  useEffect(() => {
    if (changedSelections && changedSelections.length > 0) {
      setSelectedOptions((prev) => ({
        ...prev,
        ...sanitizedSelections,
      }));
      const reasons = changedSelections.map((c) => c.reason).filter(Boolean);
      if (reasons.length > 0) {
        setRuleNotice(reasons.join(' • '));
      }
    }
  }, [changedSelections, sanitizedSelections]);

  const handleOptionChange = (groupCode: string, val: any) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupCode]: val,
    }));
  };

  // ---------------------------------------------------------------------------
  // 3. ARTWORK & DYNAMIC MULTI-SLOT RESOLUTION ENGINE
  // ---------------------------------------------------------------------------
  const resolvedArtwork = useMemo(() => {
    return resolveArtworkConditions(
      product.configurationRules || [],
      selectedOptions,
      {
        artworkRequirement: product.artworkRequirement,
        maxArtworkFileSizeMb: product.maxArtworkFileSizeMb ?? undefined,
        minimumArtworkMegapixels: product.minimumArtworkMegapixels ?? undefined,
        artworkFileFormats: product.artworkFileFormats,
        designServiceRequirement: product.designServiceRequirement,
      },
      rawGroups
    );
  }, [product, selectedOptions, rawGroups]);

  const artworkReq = resolvedArtwork.artworkStatus;
  const maxFileSizeMb = resolvedArtwork.maxArtworkFileSizeMb || 50;
  const minMegapixels = resolvedArtwork.minimumArtworkMegapixels || 2;
  const allowedFormats = resolvedArtwork.allowedFormats || ['PDF', 'PNG', 'JPG', 'AI', 'PSD'];
  const activeSlotConfigs = resolvedArtwork.slots || [];

  const [slotFiles, setSlotFiles] = useState<Record<string, FlowArtworkState>>({});
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>({});
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});

  // Active slot keys set for branch tracking
  const activeSlotKeys = useMemo(() => new Set(activeSlotConfigs.map((s) => s.slotKey)), [activeSlotConfigs]);

  // Only return files whose slots are actively configured
  const activeSlotFiles = useMemo(() => {
    const res: Record<string, FlowArtworkState> = {};
    for (const [k, v] of Object.entries(slotFiles)) {
      if (activeSlotKeys.has(k)) {
        res[k] = v;
      }
    }
    return res;
  }, [activeSlotKeys, slotFiles]);

  // Prune inactive branch files from state whenever branch changes
  useEffect(() => {
    setSlotFiles((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (!activeSlotKeys.has(key)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activeSlotKeys]);

  // File upload handler
  const handleFileUpload = async (slotKey: string, file: File) => {
    setUploadingSlots((prev) => ({ ...prev, [slotKey]: true }));
    setSlotErrors((prev) => ({ ...prev, [slotKey]: '' }));

    const slotCfg = activeSlotConfigs.find((s) => s.slotKey === slotKey);
    const targetMinMP = slotCfg?.minMegapixels || minMegapixels;

    const maxBytes = maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setSlotErrors((prev) => ({
        ...prev,
        [slotKey]: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${maxFileSizeMb}MB.`,
      }));
      setUploadingSlots((prev) => ({ ...prev, [slotKey]: false }));
      return;
    }

    try {
      const res = await api.uploadArtwork(file, product.id, targetMinMP);
      const state: FlowArtworkState = {
        fileUrl: res.fileUrl,
        storageKey: res.storageKey,
        originalFileName: res.originalFileName,
        fileSize: res.fileSize,
        mimeType: res.mimeType,
        width: res.width,
        height: res.height,
        actualMegapixels: res.actualMegapixels,
        requiredMegapixels: targetMinMP,
        qualityStatus: res.qualityStatus,
        warningMessage: res.warningMessage,
        warningAccepted: res.qualityStatus === 'PASSED',
      };
      setSlotFiles((prev) => ({ ...prev, [slotKey]: state }));
    } catch (err: any) {
      setSlotErrors((prev) => ({
        ...prev,
        [slotKey]: err?.message || 'Failed to upload artwork file',
      }));
    } finally {
      setUploadingSlots((prev) => ({ ...prev, [slotKey]: false }));
    }
  };

  const handleFileRemove = (slotKey: string) => {
    setSlotFiles((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
    setSlotErrors((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // 4. DESIGN ASSISTANCE STATE
  // ---------------------------------------------------------------------------
  const designReq: ProductOptionRequirement = product.designServiceRequirement || 'OPTIONAL';
  const baselineDesignFee = Number((product as any).designServiceFee ?? (product as any).designServicePrice) || 250;
  const [wantsDesignService, setWantsDesignService] = useState<boolean>(() => designReq === 'REQUIRED');
  const [designNotes, setDesignNotes] = useState<string>('');

  useEffect(() => {
    if (designReq === 'REQUIRED') {
      setWantsDesignService(true);
      setArtworkChoice('DESIGN_ASSISTANCE');
    } else if (artworkChoice === 'DESIGN_ASSISTANCE') {
      setWantsDesignService(true);
    } else {
      setWantsDesignService(false);
    }
  }, [designReq, artworkChoice]);

  // Delivery & Payment
  const [deliveryMethod, setDeliveryMethod] = useState<'COURIER' | 'STORE_PICKUP'>('COURIER');
  const [shippingPincode, setShippingPincode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pb2_user_pincode') || '';
    }
    return '';
  });
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'SPLIT_50'>('FULL');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);

  // ---------------------------------------------------------------------------
  // 5. PRODUCTION QUANTITY ENGINE (Dynamic Combination Pricing Support)
  // ---------------------------------------------------------------------------
  const isCombinationPricing = useMemo(() => {
    if (product.pricingModel === 'BASE_ONLY') return false;
    if (!product.pricingMatrices || product.pricingMatrices.length === 0) return false;
    return product.pricingMatrices.some((m: any) => {
      const c = m.attributeCombination || {};
      const keys = Object.keys(c).filter(
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
      );
      return keys.length > 0;
    });
  }, [product.pricingModel, product.pricingMatrices]);

  const matchingCombinationTiers = useMemo(() => {
    if (!isCombinationPricing || !product.pricingMatrices) return [];

    const matching = product.pricingMatrices.filter((m: any) => {
      const c = m.attributeCombination || {};
      const keys = Object.keys(c).filter(
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
      );
      if (keys.length === 0) return false;
      return keys.every((k) => String(selectedOptions[k]) === String(c[k]));
    });

    return matching
      .map((m: any) => {
        const c = m.attributeCombination || {};
        const qty = Number(m.minQty || c.quantity || 1);
        const totalPrice = Number(c.price ?? c.totalPrice ?? Number(m.unitPrice || 0) * qty);
        const unitPrice = qty > 0 ? totalPrice / qty : Number(m.unitPrice || 0);
        const isExcluded = Boolean(c.isExcluded || c.status === 'EXCLUDED');
        return {
          id: m.id,
          quantity: qty,
          totalPrice,
          unitPrice,
          isExcluded,
          exclusionReason: c.exclusionReason,
        };
      })
      .filter((t) => t.isExcluded || t.totalPrice > 0 || t.unitPrice > 0)
      .sort((a, b) => a.quantity - b.quantity);
  }, [isCombinationPricing, product.pricingMatrices, selectedOptions]);

  const validCombinationTiers = useMemo(() => {
    return matchingCombinationTiers.filter((t) => !t.isExcluded && t.totalPrice > 0);
  }, [matchingCombinationTiers]);

  const hasActiveCombinationTiers = isCombinationPricing && validCombinationTiers.length > 0;
  const isExplicitlyExcluded = isCombinationPricing && matchingCombinationTiers.some((t) => t.isExcluded);
  const isMissingMatrixCombo = isCombinationPricing && product.pricingModel === 'MATRIX' && validCombinationTiers.length === 0;

  const minQty = Math.max(1, Number(product.minQuantity) || 100);
  const maxQty = Number(product.maxQuantity) || 100000;
  const rawStep = Number((product as any).quantityStep);
  const isIncrementalMode =
    (product as any).quantityStep !== undefined && (product as any).quantityStep !== null
      ? rawStep > 0
      : false;
  const qtyStep = isIncrementalMode ? Math.max(1, rawStep) : (minQty >= 100 ? 100 : minQty >= 50 ? 50 : 25);

  // Exact quantity presets configured on Stage 5 (Pricing Matrix / Base / Additional Pricing)
  const configuredPricingTiers = useMemo(() => {
    const isBulk = product.pricingModel === 'BULK_RANGE';
    const tierMap = new Map<number, { quantity: number; unitPrice: number; totalPrice: number; label?: string }>();

    // 1. Base pricing matrices configured in Stage 5
    if (product.pricingMatrices && product.pricingMatrices.length > 0) {
      for (const m of product.pricingMatrices) {
        const c = (m.attributeCombination as any) || {};
        const isBase =
          c.isBasePrice === true ||
          c.type === 'BASE' ||
          Object.keys(c).filter(
            (k) =>
              !['label', 'rangeLabel', 'discountPercent', 'isBasePrice', 'type', 'isExcluded', 'status', 'totalPrice', 'price'].includes(k)
          ).length === 0;

        if (isBase && !c.isExcluded && c.status !== 'EXCLUDED') {
          const q = Number(m.minQty);
          const maxQ = m.maxQty && Number(m.maxQty) >= q ? Number(m.maxQty) : q;
          const isRange = maxQ > q;
          if (isBulk ? !isRange : isRange) continue;

          const exactTotal = c.totalPrice ?? c.price;
          const uPrice = Number(m.unitPrice) || (exactTotal && q > 0 ? Number(exactTotal) / q : 0);
          const tPrice =
            exactTotal !== undefined && exactTotal !== null && Number(exactTotal) > 0
              ? Number(exactTotal)
              : Math.round(uPrice * q);

          if (q > 0 && (!tierMap.has(q) || uPrice < (tierMap.get(q)?.unitPrice ?? Infinity))) {
            tierMap.set(q, { quantity: q, unitPrice: uPrice, totalPrice: tPrice, label: c.label || m.label });
          }
        }
      }
    }

    // 2. Additional pricing tiers configured in Stage 5
    if (tierMap.size === 0 && product.additionalPricings && product.additionalPricings.length > 0) {
      for (const t of product.additionalPricings) {
        const q = Number(t.minQty);
        const maxQ = t.maxQty && Number(t.maxQty) >= q ? Number(t.maxQty) : q;
        const isRange = maxQ > q;
        if (isBulk ? !isRange : isRange) continue;

        if (q > 0 && !tierMap.has(q)) {
          const startingRate = Number(product.basePrice || 330);
          const mQty = Math.max(1, Number(product.minQuantity) || 100);
          const uPrice = startingRate > 0 ? startingRate / mQty : 3.3;
          tierMap.set(q, { quantity: q, unitPrice: uPrice, totalPrice: Math.round(uPrice * q) });
        }
      }
    }

    if (tierMap.size > 0) {
      return Array.from(tierMap.values()).sort((a, b) => a.quantity - b.quantity);
    }

    // 3. Fallback: only minQty if zero tiers configured on Stage 5 (NO unnecessary fake multiples!)
    const startingRate = Number(product.basePrice || 330);
    const mQty = Math.max(1, Number(product.minQuantity) || 100);
    const uPrice = startingRate > 0 ? startingRate / mQty : 3.3;
    return [{ quantity: mQty, unitPrice: uPrice, totalPrice: startingRate }];
  }, [product.pricingMatrices, product.additionalPricings, product.pricingModel, product.basePrice, product.minQuantity]);

  const [quantity, setQuantity] = useState<number>(() => {
    if (hasActiveCombinationTiers && validCombinationTiers.length > 0) {
      return validCombinationTiers[0].quantity;
    }
    if (configuredPricingTiers.length > 0) {
      return configuredPricingTiers[0].quantity;
    }
    if (initialQuantity && initialQuantity >= minQty) return initialQuantity;
    return minQty;
  });

  useEffect(() => {
    if (hasActiveCombinationTiers && validCombinationTiers.length > 0) {
      if (!validCombinationTiers.some((t) => t.quantity === quantity)) {
        setQuantity(validCombinationTiers[0].quantity);
      }
    } else if (configuredPricingTiers.length > 0) {
      if (!configuredPricingTiers.some((t) => t.quantity === quantity)) {
        setQuantity(configuredPricingTiers[0].quantity);
      }
    } else if (quantity < minQty) {
      setQuantity(minQty);
    }
  }, [hasActiveCombinationTiers, validCombinationTiers, configuredPricingTiers, quantity, minQty]);

  // Reference Unit Price Calculation
  const referenceUnitPrice = useMemo(() => {
    const startingRate = Number(product.basePrice || 330);
    const mQty = Math.max(1, Number(product.minQuantity) || 100);
    return startingRate > 0 ? Math.round((startingRate / mQty) * 10000) / 10000 : 3.3;
  }, [product.basePrice, product.minQuantity]);

  // Option price modifiers fallback total
  const fallbackOptionModifiers = useMemo(() => {
    let perUnit = 0;
    let fixed = 0;
    const effQty = isMultiVariantEnabled ? Math.max(1, totalVariantQuantity) : (Number(quantity) || minQty);

    for (const group of visibleGroups) {
      const selectedVal = selectedOptions[group.code];
      if (selectedVal === undefined || selectedVal === null) continue;

      let matchedAddonTier: any = null;
      if (product.additionalPricings && product.additionalPricings.length > 0) {
        const valStr = String(selectedVal).toLowerCase().trim();
        const groupRows = product.additionalPricings.filter(
          (ap) =>
            ap.groupCode === group.code &&
            String(ap.optionValue).toLowerCase().trim() === valStr &&
            !ap.isExcluded
        );
        matchedAddonTier = groupRows.find((ap) => {
          const minQ = Number(ap.minQty) || 0;
          const maxQ = ap.maxQty !== undefined && ap.maxQty !== null && Number(ap.maxQty) >= minQ ? Number(ap.maxQty) : minQ;
          return effQty >= minQ && (maxQ > minQ ? effQty <= maxQ : (ap.maxQty ? effQty <= ap.maxQty : true));
        });
        if (!matchedAddonTier && groupRows.length > 0) {
          const sorted = [...groupRows].sort((a, b) => Number(a.minQty) - Number(b.minQty));
          matchedAddonTier = effQty >= Number(sorted[sorted.length - 1].minQty) ? sorted[sorted.length - 1] : sorted[0];
        }
      }

      if (matchedAddonTier && Number(matchedAddonTier.unitPrice) > 0) {
        perUnit += Number(matchedAddonTier.unitPrice);
      } else {
        const opt = group.options?.find((o) => String(o.value) === String(selectedVal));
        if (!opt) continue;
        const mod = Number(opt.priceModifier || 0);
        if (mod <= 0) continue;
        if (opt.priceModifierType === 'PERCENTAGE') {
          perUnit += (referenceUnitPrice * mod) / 100;
        } else {
          perUnit += mod;
        }
      }
    }
    return { perUnit, fixed };
  }, [visibleGroups, selectedOptions, referenceUnitPrice, product.additionalPricings, quantity, isMultiVariantEnabled, totalVariantQuantity, minQty]);

  // ---------------------------------------------------------------------------
  // 6. LIVE AUTHORITATIVE QUOTE ENGINE
  // ---------------------------------------------------------------------------
  const [quote, setQuote] = useState<any>(null);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let isCurrent = true;
    const fetchQuote = async () => {
      setIsCalculatingQuote(true);
      setQuoteError(null);
      try {
        const optionPayload = Object.entries(selectedOptions).map(([optionCode, valueCode]) => ({
          optionCode,
          valueCode: String(valueCode),
        }));

        const effectiveQty = isMultiVariantEnabled ? Math.max(1, totalVariantQuantity) : (Number(quantity) || minQty);

        const q = await api.calculateQuote({
          productId: product.id,
          quantity: effectiveQty,
          options: optionPayload,
          fieldValues: selectedOptions,
          variantLines: isMultiVariantEnabled
            ? variantLines.map((vl) => ({
                combination: vl.combination,
                quantity: Number(vl.quantity) || 1,
              }))
            : undefined,
          hasArtwork: Object.keys(activeSlotFiles).length > 0,
          hasDesignService: wantsDesignService,
          deliveryMethod,
          shippingPincode:
            deliveryMethod === 'COURIER' && shippingPincode.trim().length >= 3
              ? shippingPincode.trim()
              : undefined,
          paymentMethod: 'ONLINE',
          isCod: false,
        });

        if (isCurrent) {
          setQuote(q);
        }
      } catch (err: any) {
        if (isCurrent) {
          setQuoteError(err?.message || 'Unable to calculate server quote');
        }
      } finally {
        if (isCurrent) {
          setIsCalculatingQuote(false);
        }
      }
    };

    const timer = setTimeout(fetchQuote, 150);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [
    product.id,
    quantity,
    minQty,
    selectedOptions,
    isMultiVariantEnabled,
    totalVariantQuantity,
    variantLines,
    activeSlotFiles,
    wantsDesignService,
    deliveryMethod,
    shippingPincode,
  ]);

  const effectiveDesignFee = useMemo(() => {
    if (!wantsDesignService) return 0;
    if (quote?.designServiceFee !== undefined && quote?.designServiceFee !== null) {
      return Number(quote.designServiceFee);
    }
    if (resolvedArtwork?.designFee !== undefined && resolvedArtwork?.designFee !== null) {
      return Number(resolvedArtwork.designFee);
    }
    return baselineDesignFee;
  }, [wantsDesignService, quote?.designServiceFee, resolvedArtwork?.designFee, baselineDesignFee]);

  const computedSubtotal = useMemo(() => {
    if (quote?.subtotal !== undefined && quote?.subtotal !== null) {
      return Number(quote.subtotal);
    }
    if (hasActiveCombinationTiers) {
      const matched = validCombinationTiers.find((t) => t.quantity === quantity);
      if (matched) return matched.totalPrice;
    }
    const baseTotal = (referenceUnitPrice + fallbackOptionModifiers.perUnit) * quantity + fallbackOptionModifiers.fixed;
    return Math.round(baseTotal * 100) / 100;
  }, [quote?.subtotal, hasActiveCombinationTiers, validCombinationTiers, quantity, referenceUnitPrice, fallbackOptionModifiers]);

  const computedShipping = useMemo(() => {
    if (deliveryMethod === 'STORE_PICKUP') return 0;
    return Number(quote?.shippingAmount ?? quote?.estimatedShipping ?? 50);
  }, [deliveryMethod, quote?.shippingAmount, quote?.estimatedShipping]);

  const computedTax = useMemo(() => {
    return Number(
      quote?.totalTax ||
      Math.round((computedSubtotal + effectiveDesignFee + computedShipping) * 0.18 * 100) / 100
    );
  }, [quote?.totalTax, computedSubtotal, effectiveDesignFee, computedShipping]);

  const computedGrandTotal = useMemo(() => {
    return Number(
      quote?.grandTotal ||
      Math.round((computedSubtotal + effectiveDesignFee + computedShipping + computedTax) * 100) / 100
    );
  }, [quote?.grandTotal, computedSubtotal, computedTax, computedShipping, effectiveDesignFee]);

  const computedAdvanceAmount = useMemo(() => {
    if (paymentMode === 'SPLIT_50') {
      return Math.round(computedGrandTotal * 0.5 * 100) / 100;
    }
    return computedGrandTotal;
  }, [paymentMode, computedGrandTotal]);

  const computedBalanceAmount = useMemo(() => {
    if (paymentMode === 'SPLIT_50') {
      return Math.round((computedGrandTotal - computedAdvanceAmount) * 100) / 100;
    }
    return 0;
  }, [paymentMode, computedGrandTotal, computedAdvanceAmount]);

  // Broadcast live dynamic pricing updates to parent page
  useEffect(() => {
    if (!onPriceChange) return;
    const unitPrice = quantity > 0 ? computedSubtotal / quantity : referenceUnitPrice;
    onPriceChange({
      grandTotal: computedGrandTotal,
      subtotal: computedSubtotal,
      unitPrice: quote?.unitPrice ? Number(quote.unitPrice) : unitPrice,
      quantity,
      totalTax: computedTax,
      shippingAmount: computedShipping,
      isCalculating: isCalculatingQuote,
      appliedOffer: quote?.appliedOffer,
      quote,
    });
  }, [
    computedGrandTotal,
    computedSubtotal,
    computedTax,
    computedShipping,
    quantity,
    isCalculatingQuote,
    quote,
    referenceUnitPrice,
    onPriceChange,
  ]);

  // ---------------------------------------------------------------------------
  // 7. STEP-SPECIFIC VALIDATION ENGINES
  // ---------------------------------------------------------------------------
  // Step 1: Customize Product Validation
  const step1ValidationErrors = useMemo(() => {
    const errors: string[] = [];
    for (const inv of invalidCombinations) {
      errors.push(inv.message);
    }
    for (const g of visibleGroups) {
      if (groupStatusMap[g.code]?.isRequired && !selectedOptions[g.code]) {
        errors.push(`Please select an option for: ${g.name}`);
      }
      const selectedVal = selectedOptions[g.code];
      if (selectedVal) {
        const optKey = `${g.code}:${selectedVal}`;
        if (optionStatusMap[optKey]?.isDisabled) {
          errors.push(`Selected option for ${g.name} (${selectedVal}) is not available with current selections.`);
        }
      }
    }
    if (isMultiVariantEnabled) {
      if (!variantLines || variantLines.length === 0) {
        errors.push('At least one variant combination line must be configured.');
      } else {
        if (totalVariantQuantity < minQty) {
          errors.push(`Minimum total volume across all combinations is ${minQty.toLocaleString()} pieces.`);
        }
      }
    } else if (isExplicitlyExcluded) {
      errors.push('The selected specification combination is not supported for production.');
    } else if (isMissingMatrixCombo) {
      errors.push('This combination is currently unavailable. Please select another configuration.');
    } else {
      if (quantity < minQty) {
        errors.push(`Minimum production volume is ${minQty.toLocaleString()} units.`);
      }
    }
    return errors;
  }, [
    invalidCombinations,
    visibleGroups,
    groupStatusMap,
    selectedOptions,
    optionStatusMap,
    isMultiVariantEnabled,
    variantLines,
    totalVariantQuantity,
    minQty,
    isExplicitlyExcluded,
    isMissingMatrixCombo,
    quantity,
  ]);

  // Step 2: Artwork & Design Validation
  const step2ValidationErrors = useMemo(() => {
    const errors: string[] = [];
    if (artworkChoice === 'UPLOAD') {
      if (artworkReq === 'REQUIRED') {
        for (const slot of activeSlotConfigs) {
          if (slot.isRequired && !activeSlotFiles[slot.slotKey]) {
            errors.push(`Artwork upload required for: ${slot.label}`);
          }
        }
        if (activeSlotConfigs.length === 0 && Object.keys(activeSlotFiles).length === 0) {
          errors.push('Please upload your artwork file or select design assistance.');
        }
      }
    } else if (artworkChoice === 'DESIGN_ASSISTANCE') {
      if (resolvedArtwork.requireDesignBrief && !designNotes.trim()) {
        errors.push('Design notes / instructions are required when requesting design assistance.');
      }
    } else if (artworkChoice === 'NO_ARTWORK') {
      if (artworkReq === 'REQUIRED') {
        errors.push('Artwork is mandatory for this custom print specification. Please upload artwork or request design assistance.');
      }
    }
    return errors;
  }, [artworkChoice, artworkReq, activeSlotConfigs, activeSlotFiles, resolvedArtwork.requireDesignBrief, designNotes]);

  // Step 3 / Total Validation
  const validationErrors = useMemo(() => {
    return [...step1ValidationErrors, ...step2ValidationErrors];
  }, [step1ValidationErrors, step2ValidationErrors]);

  const isStep1Valid = step1ValidationErrors.length === 0;
  const isStep2Valid = step2ValidationErrors.length === 0;
  const isValid = isStep1Valid && isStep2Valid;

  // Step Progression Handlers
  const handleContinueToArtwork = () => {
    setStep1Attempted(true);
    if (isStep1Valid) {
      setCurrentStep('ARTWORK');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleContinueToReview = () => {
    setStep2Attempted(true);
    if (isStep2Valid) {
      setCurrentStep('REVIEW');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Build snapshot for cart & checkout
  const buildResult = (): ProductConfigurationResult => {
    const snapshot: Record<string, any> = {};
    for (const g of visibleGroups) {
      const val = selectedOptions[g.code];
      const opt = g.options?.find((o) => String(o.value) === String(val));
      snapshot[g.code] = {
        label: g.name,
        value: val,
        displayValue: opt ? opt.label : String(val),
        priceModifier: opt ? Number(opt.priceModifier || 0) : 0,
      };
    }

    const primaryFile = Object.values(activeSlotFiles)[0] || null;
    const finalQuantity = isMultiVariantEnabled ? totalVariantQuantity : quantity;

    return {
      product,
      quantity: finalQuantity,
      fieldValues: selectedOptions,
      variantLines: isMultiVariantEnabled
        ? variantLines.map((vl, idx) => ({
            combination: vl.combination,
            quantity: Number(vl.quantity) || 1,
            unitPrice: quote?.variantLines?.[idx]?.unitPrice,
            lineSubtotal: quote?.variantLines?.[idx]?.lineSubtotal,
          }))
        : undefined,
      hasArtwork: Object.keys(activeSlotFiles).length > 0,
      artworkFile: primaryFile,
      artworkFiles: activeSlotFiles,
      hasReferenceImage: false,
      referenceImage: null,
      hasDesignService: wantsDesignService,
      designNotes,
      deliveryMethod,
      shippingPincode: deliveryMethod === 'COURIER' && shippingPincode.trim() ? shippingPincode.trim() : undefined,
      paymentMethod: 'ONLINE',
      paymentMode,
      advanceAmount: computedAdvanceAmount,
      balanceAmount: computedBalanceAmount,
      subtotal: computedSubtotal,
      grandTotal: computedGrandTotal,
      personalization: null,
      quote: {
        ...(quote || {}),
        subtotal: computedSubtotal,
        totalTax: computedTax,
        shippingAmount: computedShipping,
        grandTotal: computedGrandTotal,
        paymentMode,
        advanceAmount: computedAdvanceAmount,
        balanceAmount: computedBalanceAmount,
        specificationsSnapshot: snapshot,
      },
    };
  };

  const handleAddToCartClick = async () => {
    setStep3Attempted(true);
    if (!isValid || !onAddToCart) return;
    setIsSubmitting(true);
    try {
      await onAddToCart(buildResult());
      setIsSuccessModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNowClick = async () => {
    setStep3Attempted(true);
    if (!isValid || !onBuyNow) return;
    setIsSubmitting(true);
    try {
      await onBuyNow(buildResult());
    } finally {
      setIsSubmitting(false);
    }
  };

  const images = product.images && product.images.length > 0 ? product.images : [];
  const currentImage = images[activeImageIndex] || {
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80',
    altText: product.name,
  };

  // ---------------------------------------------------------------------------
  // 8. THREE-COLUMN GUIDED LAYOUT INTERFACE
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full space-y-8">
      {/* 3-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* ================================================================= */}
        {/* LEFT COLUMN: Gallery & Design Tips (lg:col-span-4)                */}
        {/* ================================================================= */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
          {/* Main Media Preview Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="relative h-64 sm:h-72 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-2 group">
              {isVideoMedia(currentImage.url) ? (
                <video
                  src={resolveImageUrl(currentImage.url)}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              ) : (
                <img
                  src={resolveImageUrl(currentImage.url)}
                  alt={currentImage.altText || product.name}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80';
                  }}
                />
              )}

              {/* Zoom Lightbox Action Icon */}
              <button
                type="button"
                onClick={() => setIsGuidelinesModalOpen(true)}
                className="absolute bottom-3 right-3 h-8 w-8 bg-white/90 hover:bg-white text-slate-800 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
                title="View full resolution and design tips"
              >
                <RiZoomInLine className="h-4 w-4" />
              </button>

              {isVideoMedia(currentImage.url) && (
                <span className="absolute top-3 right-3 bg-indigo-900/90 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-indigo-500/40 shadow-sm flex items-center gap-1.5 pointer-events-none">
                  <RiMovieLine className="h-3.5 w-3.5 text-[#FFED00]" />
                  <span>DEMO VIDEO</span>
                </span>
              )}
            </div>

            {/* Thumbnails Row */}
            {images.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                {images.map((img, idx) => {
                  const isVid = isVideoMedia(img.url);
                  return (
                    <button
                      key={img.id || idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative h-14 w-18 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all bg-slate-900 cursor-pointer ${
                        activeImageIndex === idx
                          ? 'border-[#FFED00] ring-2 ring-[#FFED00] shadow-xs'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {isVid ? (
                        <div className="relative h-full w-full bg-slate-950 flex items-center justify-center">
                          <video src={resolveImageUrl(img.url)} className="h-full w-full object-cover opacity-60 pointer-events-none" />
                          <RiPlayCircleLine className="h-4 w-4 text-white absolute inset-auto z-10" />
                        </div>
                      ) : (
                        <img src={resolveImageUrl(img.url)} alt={img.altText || ''} className="h-full w-full object-cover" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Design Tips Guidance Box (Yellow Palette matching Reference UI) */}
          <div className="bg-[#FEFCE8] border border-[#FEF08A] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-[#FFED00] flex items-center justify-center text-slate-950 font-bold border border-[#E3A008]/40 shadow-2xs">
                <RiLightbulbLine className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 font-sans">
                Design Tips
              </h4>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed pl-1">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Use high-resolution files (300 DPI) for optimal sharpness.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Prefer PDF, PNG or JPG format with CMYK color mode.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Keep important text within safe margins (3mm inside trim).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>We'll check your design before printing and share proof.</span>
              </li>
            </ul>

            <div className="pt-2 border-t border-amber-200/60">
              <button
                type="button"
                onClick={() => setIsGuidelinesModalOpen(true)}
                className="text-xs font-bold text-slate-900 hover:text-amber-900 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View complete design guidelines</span>
                <RiArrowRightLine className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CENTER COLUMN: 3-Step Guided Customization (lg:col-span-5)        */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* 4 Feature USP Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 shadow-2xs">
              <span className="text-sm block">📦</span>
              <span className="text-[11px] font-bold block mt-0.5 text-slate-900">Premium Quality</span>
              <span className="text-[9px] text-slate-500 block">Print & Paper</span>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 shadow-2xs">
              <span className="text-sm block">🎨</span>
              <span className="text-[11px] font-bold block mt-0.5 text-slate-900">Free Design Support</span>
              <span className="text-[9px] text-slate-500 block">(If Needed)</span>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 shadow-2xs">
              <span className="text-sm block">🚚</span>
              <span className="text-[11px] font-bold block mt-0.5 text-slate-900">Fast Turnaround</span>
              <span className="text-[9px] text-slate-500 block">2–7 Days</span>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 shadow-2xs">
              <span className="text-sm block">🛡️</span>
              <span className="text-[11px] font-bold block mt-0.5 text-slate-900">Secure Payment</span>
              <span className="text-[9px] text-slate-500 block">UPI, Cards, Net Banking</span>
            </div>
          </div>

          {/* Connected 3-Step Progress Indicator */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between relative">
              {/* Step 1 Item */}
              <button
                type="button"
                onClick={() => setCurrentStep('CUSTOMIZE')}
                className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
              >
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-xs transition-colors shrink-0 ${
                    currentStep === 'CUSTOMIZE'
                      ? 'bg-[#FFED00] text-slate-950 ring-4 ring-[#FFED00]/30 shadow-xs'
                      : isStep1Valid
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-500 border border-slate-300'
                  }`}
                >
                  {isStep1Valid && currentStep !== 'CUSTOMIZE' ? (
                    <RiCheckLine className="h-4 w-4 stroke-[3]" />
                  ) : (
                    '1'
                  )}
                </div>
                <div className="hidden sm:block">
                  <span className="text-xs font-bold text-slate-900 block group-hover:text-amber-600 transition-colors">
                    Customize Product
                  </span>
                  <span className="text-[10px] text-slate-400 block">Select your specifications</span>
                </div>
              </button>

              {/* Connecting Line 1 -> 2 */}
              <div className="flex-1 mx-3 h-0.5 bg-slate-200 relative">
                <div
                  className={`h-full transition-all duration-300 ${
                    currentStep === 'ARTWORK' || currentStep === 'REVIEW'
                      ? 'bg-[#FFED00] w-full'
                      : 'w-0'
                  }`}
                />
              </div>

              {/* Step 2 Item */}
              <button
                type="button"
                onClick={() => {
                  if (isStep1Valid) setCurrentStep('ARTWORK');
                }}
                disabled={!isStep1Valid}
                className={`flex items-center gap-2.5 text-left group focus:outline-none ${
                  isStep1Valid ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-xs transition-colors shrink-0 ${
                    currentStep === 'ARTWORK'
                      ? 'bg-[#FFED00] text-slate-950 ring-4 ring-[#FFED00]/30 shadow-xs'
                      : isStep2Valid && (currentStep === 'REVIEW' || step2Attempted)
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-500 border border-slate-300'
                  }`}
                >
                  {isStep2Valid && currentStep === 'REVIEW' ? (
                    <RiCheckLine className="h-4 w-4 stroke-[3]" />
                  ) : (
                    '2'
                  )}
                </div>
                <div className="hidden sm:block">
                  <span className="text-xs font-bold text-slate-900 block group-hover:text-amber-600 transition-colors">
                    Artwork & Design
                  </span>
                  <span className="text-[10px] text-slate-400 block">Upload or request design</span>
                </div>
              </button>

              {/* Connecting Line 2 -> 3 */}
              <div className="flex-1 mx-3 h-0.5 bg-slate-200 relative">
                <div
                  className={`h-full transition-all duration-300 ${
                    currentStep === 'REVIEW' ? 'bg-[#FFED00] w-full' : 'w-0'
                  }`}
                />
              </div>

              {/* Step 3 Item */}
              <button
                type="button"
                onClick={() => {
                  if (isStep1Valid && isStep2Valid) setCurrentStep('REVIEW');
                }}
                disabled={!isStep1Valid || !isStep2Valid}
                className={`flex items-center gap-2.5 text-left group focus:outline-none ${
                  isStep1Valid && isStep2Valid ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-xs transition-colors shrink-0 ${
                    currentStep === 'REVIEW'
                      ? 'bg-[#FFED00] text-slate-950 ring-4 ring-[#FFED00]/30 shadow-xs'
                      : 'bg-slate-100 text-slate-500 border border-slate-300'
                  }`}
                >
                  3
                </div>
                <div className="hidden sm:block">
                  <span className="text-xs font-bold text-slate-900 block group-hover:text-amber-600 transition-colors">
                    Review & Add to Cart
                  </span>
                  <span className="text-[10px] text-slate-400 block">Confirm and place order</span>
                </div>
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* STEP 1: CUSTOMIZE PRODUCT PANEL                                 */}
          {/* =============================================================== */}
          {currentStep === 'CUSTOMIZE' && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6 animate-fadeIn">
              {/* Step 1 Header */}
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#FFED00] text-slate-950 flex items-center justify-center font-black text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight font-display">
                      Step 1: Customize Product
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose your specifications to get the best price.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  {visibleGroups.length} Options
                </span>
              </div>

              {/* Dynamic Option Groups */}
              <div className="space-y-6">
                {visibleGroups
                  .filter((group) => !isMultiVariantEnabled || !effectiveVariantDimensions.includes(group.code))
                  .map((group) => {
                    const status = groupStatusMap[group.code];
                    const processedOptions = (group.options || [])
                      .filter((opt) => {
                        const optKey = `${group.code}:${opt.value}`;
                        return optionStatusMap[optKey]?.isVisible !== false;
                      })
                      .map((opt) => {
                        const optKey = `${group.code}:${opt.value}`;
                        const optStatus = optionStatusMap[optKey];
                        return {
                          ...opt,
                          isDisabled: optStatus?.isDisabled || false,
                          disabledReason: optStatus?.disabledReason,
                        };
                      });

                    return (
                      <div key={group.id} className="pb-5 border-b border-slate-100 last:border-0 last:pb-0">
                        <DynamicFieldRenderer
                          field={{
                            ...group,
                            isRequired: status?.isRequired ?? group.isRequired,
                            options: processedOptions,
                          }}
                          value={selectedOptions[group.code]}
                          onChange={(val) => handleOptionChange(group.code, val)}
                          disabled={status?.isDisabled}
                          disabledReason={status?.disabledReason}
                        />
                      </div>
                    );
                  })}
              </div>

              {/* Production Run Quantity Tiers */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div>
                    <label className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase">
                      Quantity
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      More quantity, better price per unit.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isIncrementalMode ? (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-mono">
                        <RiArrowUpCircleLine className="w-3 h-3 text-amber-600" />
                        Step: +{qtyStep} pcs
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-mono">
                        <RiLockLine className="w-3 h-3 text-slate-500" />
                        Fixed Quantities
                      </span>
                    )}
                    <span className="text-xs font-mono font-bold text-slate-600">
                      Selected: <strong className="text-slate-950 font-black">{quantity.toLocaleString()} pcs</strong>
                    </span>
                  </div>
                </div>

                {isIncrementalMode ? (
                  /* Incremental Stepper & Quick Add */
                  <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block font-mono">
                          Adjust Quantity
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Step increment of {qtyStep} pcs (Min: {minQty} • Max: {maxQty.toLocaleString()})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuantity((prev) => Math.max(minQty, prev - qtyStep))}
                          disabled={quantity <= minQty}
                          className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-800 font-bold transition shadow-2xs cursor-pointer active:scale-95"
                          title={`Decrease by ${qtyStep}`}
                        >
                          <RiSubtractLine className="w-4 h-4" />
                        </button>

                        <div className="relative flex items-center">
                          <input
                            type="number"
                            min={minQty}
                            max={maxQty}
                            step={qtyStep}
                            value={quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                setQuantity(Math.max(minQty, Math.min(maxQty, val)));
                              }
                            }}
                            className="w-24 h-9 px-2 text-center text-xs font-bold font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setQuantity((prev) => Math.min(maxQty, prev + qtyStep))}
                          disabled={quantity >= maxQty}
                          className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-800 font-bold transition shadow-2xs cursor-pointer active:scale-95"
                          title={`Increase by ${qtyStep}`}
                        >
                          <RiAddLine className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Add Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500">Quick add:</span>
                      {[qtyStep, qtyStep * 2, qtyStep * 5]
                        .filter((s) => quantity + s <= maxQty)
                        .map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setQuantity((prev) => Math.min(maxQty, prev + s))}
                            className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-300 transition cursor-pointer"
                          >
                            +{s} pcs
                          </button>
                        ))}
                      <button
                        type="button"
                        onClick={() => setQuantity(minQty)}
                        className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer ml-auto"
                      >
                        Reset ({minQty})
                      </button>
                    </div>
                  </div>
                ) : hasActiveCombinationTiers ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    {validCombinationTiers.map((tier, idx) => {
                      const isSel = quantity === tier.quantity;
                      const isMostPopular = idx === 0;
                      const baseTier = validCombinationTiers[0];
                      const discountPct =
                        baseTier && baseTier.unitPrice > 0
                          ? Math.max(0, Math.round(((baseTier.unitPrice - tier.unitPrice) / baseTier.unitPrice) * 100))
                          : 0;

                      return (
                        <button
                          key={tier.id || tier.quantity}
                          type="button"
                          onClick={() => setQuantity(tier.quantity)}
                          className={`p-3 rounded-xl text-left border transition-all cursor-pointer relative ${
                            isSel
                              ? 'border-[#FFED00] bg-[#FFFEF0] ring-2 ring-[#FFED00] shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-sm text-slate-950">
                              {tier.quantity.toLocaleString()} pcs
                            </span>
                            {isSel && (
                              <div className="h-4 w-4 rounded-md bg-[#FFED00] text-slate-950 flex items-center justify-center font-bold text-[10px]">
                                <RiCheckLine className="h-3 w-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          {isMostPopular ? (
                            <span className="inline-block mt-1 text-[9px] font-bold bg-[#FFED00] text-slate-950 px-1.5 py-0.5 rounded">
                              Most Popular
                            </span>
                          ) : discountPct > 0 ? (
                            <span className="inline-block mt-1 text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                              Save {discountPct}%
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {configuredPricingTiers.map((tier, idx) => {
                      const isSel = quantity === tier.quantity;
                      return (
                        <button
                          key={tier.quantity}
                          type="button"
                          onClick={() => setQuantity(tier.quantity)}
                          className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                            isSel
                              ? 'border-[#FFED00] bg-[#FFFEF0] ring-2 ring-[#FFED00] shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-sm text-slate-950">
                              {tier.quantity.toLocaleString()} pcs
                            </span>
                            {isSel && (
                              <div className="h-4 w-4 rounded-md bg-[#FFED00] text-slate-950 flex items-center justify-center font-bold text-[10px]">
                                <RiCheckLine className="h-3 w-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          {idx === 0 && (
                            <span className="inline-block mt-1 text-[9px] font-bold bg-[#FFED00] text-slate-950 px-1.5 py-0.5 rounded">
                              Most Popular
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Validation errors for Step 1 */}
              {step1Attempted && !isStep1Valid && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-rose-800 flex items-center gap-1.5">
                    <RiAlertFill className="h-4 w-4 flex-shrink-0" />
                    <span>Please complete required specifications:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-rose-700 pl-1">
                    {step1ValidationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Step 1 Primary CTA Button */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleContinueToArtwork}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 border border-[#E3A008]/50 shadow-sm transition-transform active:scale-[0.99] cursor-pointer"
                >
                  <span>Continue to Artwork</span>
                  <RiArrowRightLine className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* STEP 2: ARTWORK & DESIGN PANEL                                  */}
          {/* =============================================================== */}
          {currentStep === 'ARTWORK' && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6 animate-fadeIn">
              {/* Step 2 Header */}
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#FFED00] text-slate-950 flex items-center justify-center font-black text-sm">
                    2
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight font-display">
                      Step 2: Artwork & Design
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload your print-ready files or request our design team to create it for you.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Clear Artwork Options: A, B, C */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option A */}
                <button
                  type="button"
                  onClick={() => {
                    setArtworkChoice('UPLOAD');
                    setWantsDesignService(false);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    artworkChoice === 'UPLOAD'
                      ? 'border-[#FFED00] bg-[#FFFEF0] ring-2 ring-[#FFED00] shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-950 block">
                      Option A
                    </span>
                    {artworkChoice === 'UPLOAD' && (
                      <div className="h-4 w-4 rounded-md bg-[#FFED00] text-slate-950 flex items-center justify-center font-bold text-[10px]">
                        <RiCheckLine className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 text-xs mt-1">Upload My Artwork</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">I have print-ready design files</div>
                </button>

                {/* Option B */}
                <button
                  type="button"
                  onClick={() => {
                    setArtworkChoice('DESIGN_ASSISTANCE');
                    setWantsDesignService(true);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    artworkChoice === 'DESIGN_ASSISTANCE'
                      ? 'border-[#FFED00] bg-[#FFFEF0] ring-2 ring-[#FFED00] shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-950 block">
                      Option B
                    </span>
                    {artworkChoice === 'DESIGN_ASSISTANCE' && (
                      <div className="h-4 w-4 rounded-md bg-[#FFED00] text-slate-950 flex items-center justify-center font-bold text-[10px]">
                        <RiCheckLine className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 text-xs mt-1">Design Assistance</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">+₹{baselineDesignFee} professional prepress</div>
                </button>

                {/* Option C */}
                <button
                  type="button"
                  onClick={() => {
                    setArtworkChoice('NO_ARTWORK');
                    setWantsDesignService(false);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    artworkChoice === 'NO_ARTWORK'
                      ? 'border-[#FFED00] bg-[#FFFEF0] ring-2 ring-[#FFED00] shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-950 block">
                      Option C
                    </span>
                    {artworkChoice === 'NO_ARTWORK' && (
                      <div className="h-4 w-4 rounded-md bg-[#FFED00] text-slate-950 flex items-center justify-center font-bold text-[10px]">
                        <RiCheckLine className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 text-xs mt-1">Send Artwork Later</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Supply via email / WhatsApp</div>
                </button>
              </div>

              {/* Option A Sub-panel: Multi-Slot File Dropzone */}
              {artworkChoice === 'UPLOAD' && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Supported: <strong className="text-slate-900 font-bold">{allowedFormats.join(', ')}</strong> • Max {maxFileSizeMb}MB • Min {minMegapixels} MP
                    </span>
                    <span className="font-mono text-slate-600">
                      {Object.keys(activeSlotFiles).length} of {activeSlotConfigs.length || 1} file(s) attached
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {(activeSlotConfigs.length > 0 ? activeSlotConfigs : [{ slotKey: 'default_artwork', label: 'Primary Artwork', isRequired: true }]).map((slot) => {
                      const uploaded = slotFiles[slot.slotKey];
                      const isUploading = Boolean(uploadingSlots[slot.slotKey]);
                      const errorMsg = slotErrors[slot.slotKey];

                      return (
                        <div key={slot.slotKey} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <RiCameraLine className="h-4 w-4 text-amber-600" />
                              <span>{slot.label}</span>
                              {slot.isRequired && <span className="text-rose-500 font-black">*</span>}
                            </span>
                            {uploaded && (
                              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                                <RiCheckLine className="h-3 w-3 stroke-[3]" /> Uploaded
                              </span>
                            )}
                          </div>

                          {uploaded ? (
                            <div className="p-3 bg-white border border-emerald-200 rounded-lg flex items-center justify-between">
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {uploaded.originalFileName}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">
                                  {(uploaded.fileSize / (1024 * 1024)).toFixed(2)} MB • {uploaded.actualMegapixels ? `${uploaded.actualMegapixels} MP` : 'Print Ready'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleFileRemove(slot.slotKey)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 cursor-pointer"
                                title="Remove file"
                              >
                                <RiDeleteBinLine className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <label
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const f = e.dataTransfer.files?.[0];
                                if (f) handleFileUpload(slot.slotKey, f);
                              }}
                              className="border-2 border-dashed border-slate-300 hover:border-amber-400 bg-white hover:bg-amber-50/20 p-5 rounded-xl text-center block cursor-pointer transition-colors"
                            >
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleFileUpload(slot.slotKey, f);
                                  e.target.value = '';
                                }}
                              />
                              {isUploading ? (
                                <div className="text-xs font-bold text-amber-700 animate-pulse flex items-center justify-center gap-1.5">
                                  <RiLoader4Line className="h-4 w-4 animate-spin" />
                                  <span>Uploading & verifying resolution...</span>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <RiUploadCloud2Line className="h-6 w-6 text-slate-400 mx-auto" />
                                  <div className="text-xs font-bold text-slate-800">
                                    Click or drag {slot.label} file
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    PDF, AI, PSD, PNG or high-res JPG
                                  </div>
                                </div>
                              )}
                            </label>
                          )}

                          {errorMsg && (
                            <p className="text-[11px] text-rose-600 font-medium">
                              {errorMsg}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Option B Sub-panel: Design Assistance Request */}
              {artworkChoice === 'DESIGN_ASSISTANCE' && (
                <div className="p-4 bg-[#FEFCE8] border border-[#FEF08A] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RiPaletteLine className="h-5 w-5 text-amber-800" />
                      <div>
                        <span className="text-xs font-black uppercase text-slate-900 block">
                          Print Bazzar Design Studio (+₹{baselineDesignFee})
                        </span>
                        <span className="text-[11px] text-slate-600">
                          Our graphic artists will compose and format your layout with 2 free revisions.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-900 block">
                      Design Brief & Instructions <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={designNotes}
                      onChange={(e) => setDesignNotes(e.target.value)}
                      placeholder="Enter company name, tagline, contact details, preferred colors, fonts, or branding guidelines..."
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
                    />
                  </div>
                </div>
              )}

              {/* Option C Sub-panel: Supply Later notice */}
              {artworkChoice === 'NO_ARTWORK' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <RiInformationLine className="h-4 w-4 text-amber-600" />
                    <span>Artwork Status: Pending Customer Supply</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    You can place your order now and submit your artwork later referencing your Master Order ID via our upload portal, email, or WhatsApp.
                  </p>
                </div>
              )}

              {/* Validation errors for Step 2 */}
              {step2Attempted && !isStep2Valid && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-rose-800 flex items-center gap-1.5">
                    <RiAlertFill className="h-4 w-4 flex-shrink-0" />
                    <span>Please resolve artwork requirement:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-rose-700 pl-1">
                    {step2ValidationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons for Step 2 */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep('CUSTOMIZE')}
                  className="py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RiArrowLeftLine className="h-4 w-4" />
                  <span>Back to Customize</span>
                </button>

                <button
                  type="button"
                  onClick={handleContinueToReview}
                  className="py-3 px-4 rounded-xl bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-black text-xs tracking-wide flex items-center justify-center gap-1.5 border border-[#E3A008]/50 shadow-sm transition cursor-pointer"
                >
                  <span>Continue to Review</span>
                  <RiArrowRightLine className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* STEP 3: REVIEW & ADD TO CART PANEL                              */}
          {/* =============================================================== */}
          {currentStep === 'REVIEW' && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6 animate-fadeIn">
              {/* Step 3 Header */}
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#FFED00] text-slate-950 flex items-center justify-center font-black text-sm">
                    3
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight font-display">
                      Step 3: Review & Add to Cart
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verify your configuration and artwork before adding to cart.
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Specifications Summary with Edit Links */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-900">
                    Configured Specifications
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('CUSTOMIZE')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RiEdit2Line className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Quantity</span>
                    <span className="font-bold text-slate-900 font-mono">{quantity.toLocaleString()} pcs</span>
                  </div>
                  {visibleGroups.map((g) => {
                    const val = selectedOptions[g.code];
                    const opt = g.options?.find((o) => String(o.value) === String(val));
                    return (
                      <div key={g.id} className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase truncate">{g.name}</span>
                        <span className="font-bold text-slate-900 truncate block">{opt ? opt.label : String(val || '—')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Artwork Summary with Edit Link */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-900">
                    Artwork & Prepress
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('ARTWORK')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RiEdit2Line className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                  {artworkChoice === 'UPLOAD' && Object.keys(activeSlotFiles).length > 0 ? (
                    <div className="space-y-1.5">
                      {Object.entries(activeSlotFiles).map(([slotKey, file]) => (
                        <div key={slotKey} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <RiCheckLine className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                            <span>{file.originalFileName}</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {(file.fileSize / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : artworkChoice === 'DESIGN_ASSISTANCE' ? (
                    <div className="space-y-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <RiPaletteLine className="h-4 w-4 text-amber-600" />
                        <span>Professional Design Assistance (+₹{baselineDesignFee})</span>
                      </span>
                      {designNotes && (
                        <p className="text-[11px] text-slate-600 italic mt-1 line-clamp-2">
                          "{designNotes}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-600 font-medium">
                      Artwork Pending (Will supply file after order placement)
                    </div>
                  )}
                </div>
              </div>

              {/* Logistics & Delivery Selection */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3">
                <span className="text-xs font-black uppercase text-slate-900 block">
                  Delivery & Turnaround
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('COURIER')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                      deliveryMethod === 'COURIER'
                        ? 'border-slate-900 bg-white font-bold ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <span>Doorstep Courier</span>
                    <span className="block text-[10px] font-mono text-slate-400">₹{computedShipping}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('STORE_PICKUP')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                      deliveryMethod === 'STORE_PICKUP'
                        ? 'border-slate-900 bg-white font-bold ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <span>Store Pickup</span>
                    <span className="block text-[10px] font-mono text-emerald-600 font-bold">FREE</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons for Step 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('ARTWORK')}
                  className="py-3.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RiArrowLeftLine className="h-4 w-4" />
                  <span>Back to Artwork</span>
                </button>

                <button
                  type="button"
                  disabled={!isValid || isSubmitting}
                  onClick={handleAddToCartClick}
                  className="py-3.5 px-6 rounded-xl bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-black text-xs tracking-wide flex items-center justify-center gap-2 border border-[#E3A008]/50 shadow-sm transition-transform active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RiShoppingCart2Line className="h-4 w-4" />
                  <span>{isSubmitting ? 'Adding to Cart...' : 'Add to Cart'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: Persistent Order Summary (lg:col-span-3)           */}
        {/* ================================================================= */}
        <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-24">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-5">
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight font-sans">
              Your Order Summary
            </h3>

            {/* Product Snapshot */}
            <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
              <div className="h-16 w-16 rounded-xl bg-slate-950 flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center p-1">
                <img
                  src={resolveImageUrl(currentImage.url)}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 truncate">{product.name}</h4>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5 line-clamp-2">
                  {quantity.toLocaleString()} pcs • {visibleGroups.map((g) => {
                    const opt = g.options?.find((o) => String(o.value) === String(selectedOptions[g.code]));
                    return opt?.label || selectedOptions[g.code];
                  }).filter(Boolean).slice(0, 3).join(' • ')}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('CUSTOMIZE')}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 mt-1 block cursor-pointer"
                >
                  Edit Selections
                </button>
              </div>
            </div>

            {/* Selected Options List */}
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 uppercase text-[11px]">Selected Options</span>
                <button
                  type="button"
                  onClick={() => setCurrentStep('CUSTOMIZE')}
                  className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                {visibleGroups.map((g) => {
                  const val = selectedOptions[g.code];
                  const opt = g.options?.find((o) => String(o.value) === String(val));
                  return (
                    <div key={g.id} className="flex justify-between items-baseline text-[11px]">
                      <span className="text-slate-500 truncate pr-2">{g.name}</span>
                      <span className="font-bold text-slate-900 text-right truncate">
                        {opt ? opt.label : String(val || '—')}
                      </span>
                    </div>
                  );
                })}
                <div className="flex justify-between items-baseline text-[11px]">
                  <span className="text-slate-500">Quantity</span>
                  <span className="font-mono font-bold text-slate-900">{quantity.toLocaleString()}</span>
                </div>
                {wantsDesignService && (
                  <div className="flex justify-between items-baseline text-[11px]">
                    <span className="text-slate-500">Design Service</span>
                    <span className="font-bold text-amber-800">Assistance Requested</span>
                  </div>
                )}
              </div>
            </div>

            {/* Live Authoritative Price Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(computedSubtotal)}</span>
              </div>
              {effectiveDesignFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Design Service</span>
                  <span className="font-mono font-bold text-slate-900">+{formatCurrency(effectiveDesignFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Courier & Delivery</span>
                <span className="font-mono font-bold text-slate-900">
                  {computedShipping === 0 ? <span className="text-emerald-700">FREE</span> : `+${formatCurrency(computedShipping)}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (18% on Goods & Courier)</span>
                <span className="font-mono font-bold text-slate-900">+{formatCurrency(computedTax)}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                    Total
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Inclusive of all taxes
                  </span>
                </div>
                <span className="text-2xl font-black text-slate-950 font-display">
                  {formatCurrency(computedGrandTotal)}
                </span>
              </div>
            </div>

            {/* Dispatch SLA Badge */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-xs text-emerald-900 flex items-center gap-2.5">
              <RiTruckLine className="h-4 w-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold block">Dispatch in 3–5 business days</span>
                <span className="text-[10px] text-emerald-700 block">After design approval</span>
              </div>
            </div>

            {/* Design Support Callout */}
            <div className="p-3 bg-[#FEFCE8] border border-[#FEF08A] rounded-xl text-xs text-amber-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <RiCustomerService2Line className="h-4 w-4 text-amber-800 shrink-0" />
                <span>Need help with design?</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-snug">
                Our team can design it for you.
              </p>
              <button
                type="button"
                onClick={() => {
                  setArtworkChoice('DESIGN_ASSISTANCE');
                  setWantsDesignService(true);
                  setCurrentStep('ARTWORK');
                }}
                className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1 pt-0.5 cursor-pointer"
              >
                <span>Request Design Support</span>
                <RiArrowRightLine className="h-3 w-3" />
              </button>
            </div>

            {/* Synchronized Right-Column CTA Button */}
            <div className="pt-1">
              {currentStep === 'CUSTOMIZE' ? (
                <button
                  type="button"
                  onClick={handleContinueToArtwork}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <span>Continue to Artwork</span>
                  <RiArrowRightLine className="h-3.5 w-3.5 text-[#FFED00]" />
                </button>
              ) : currentStep === 'ARTWORK' ? (
                <button
                  type="button"
                  onClick={handleContinueToReview}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <span>Continue to Review</span>
                  <RiArrowRightLine className="h-3.5 w-3.5 text-[#FFED00]" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!isValid || isSubmitting}
                  onClick={handleAddToCartClick}
                  className="w-full py-3 px-4 rounded-xl bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-black text-xs flex items-center justify-center gap-2 border border-[#E3A008]/50 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RiShoppingCart2Line className="h-4 w-4" />
                  <span>{isSubmitting ? 'Adding to Cart...' : 'Add to Cart'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SUCCESS MODAL: Item Added to Cart                                    */}
      {/* =================================================================== */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <RiCheckLine className="h-8 w-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Item Added to Cart!</h3>
              <p className="text-xs text-slate-500 mt-1">
                {quantity.toLocaleString()} pcs of {product.name} have been configured and added.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Continue Shopping
              </button>
              <a
                href="/cart"
                className="py-2.5 px-4 rounded-xl bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-black text-xs border border-[#E3A008]/40 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RiShoppingCart2Line className="h-4 w-4" />
                <span>View Cart</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* DESIGN GUIDELINES MODAL                                             */}
      {/* =================================================================== */}
      {isGuidelinesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RiLightbulbLine className="text-amber-500 h-5 w-5" />
                <span>Prepress & Artwork Specifications</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsGuidelinesModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <RiCloseLine size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Standard Cut & Bleed</span>
                <p>Allow 3.0mm bleed on all sides. Keep all text, logos, and critical design elements at least 3.0mm inside the trim line.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Color Palette & Profiles</span>
                <p>Files must be prepared in CMYK color space. RGB or Pantone colors will be converted with standard ISO 12647-2 profiles.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Resolution & Outlines</span>
                <p>Raster images should be 300 DPI or higher at 100% print scale. Convert all fonts to curves/outlines before saving as PDF.</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsGuidelinesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-950 text-white font-bold text-xs"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* BOTTOM BRAND FOOTER BANNER                                          */}
      {/* =================================================================== */}
      <div className="bg-[#0F172A] text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <RiShieldCheckLine className="h-5 w-5 text-[#FFED00]" />
            <div>
              <span className="font-bold text-white block">Secure Payment</span>
              <span className="text-[10px] text-slate-400">UPI, Cards, Net Banking</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RiFlashlightLine className="h-5 w-5 text-[#FFED00]" />
            <div>
              <span className="font-bold text-white block">Fast Dispatch</span>
              <span className="text-[10px] text-slate-400">2–7 days turnaround</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RiSparklingFill className="h-5 w-5 text-[#FFED00]" />
            <div>
              <span className="font-bold text-white block">Quality Prints</span>
              <span className="text-[10px] text-slate-400">Checked before dispatch</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RiCustomerService2Line className="h-5 w-5 text-[#FFED00]" />
            <div>
              <span className="font-bold text-white block">Dedicated Support</span>
              <span className="text-[10px] text-slate-400">For all your printing needs</span>
            </div>
          </div>
        </div>

        <div className="italic font-display text-xl sm:text-2xl text-[#FFED00] tracking-wide shrink-0">
          Print it. Love it.
        </div>
      </div>
    </div>
  );
}
