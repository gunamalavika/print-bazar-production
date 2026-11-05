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
import { formatCurrency, getEstimatedDeliveryText } from '@/lib/utils';
import {
  RiUploadCloud2Line,
  RiCheckLine,
  RiAlertFill,
  RiCloseLine,
  RiAddLine,
  RiInformationLine,
  RiPaletteLine,
  RiShieldCheckLine,
  RiShoppingCart2Line,
  RiFlashlightLine,
  RiFileTextLine,
  RiDeleteBinLine,
  RiArrowRightLine,
  RiTruckLine,
  RiTimeLine,
  RiRulerLine,
  RiLockLine,
  RiMapPin2Line,
  RiCameraLine,
  RiCheckDoubleLine,
  RiFileList3Line,
  RiUpload2Line,
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

export type StepId = 'SPECIFICATIONS' | 'QUANTITY_ARTWORK' | 'REVIEW';

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

  // Synchronize variant lines if dimension groups populate
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

  // Handle artwork overrides and forced requirement from rules
  const { forcedArtworkRequired, artworkConfigOverrides } = useMemo(() => {
    const rules: ProductConfigurationRule[] = product.configurationRules || [];
    let forceArtwork = false;
    const overrides: Array<{
      artworkStatus?: 'REQUIRED' | 'OPTIONAL' | 'DISABLED';
      slotCount?: number;
      slotLabels?: string[];
      minMegapixels?: number;
      maxFileSizeMb?: number;
      designServicePolicy?: 'STANDARD' | 'REQUIRE_BRIEF' | 'SKIP_BRIEF';
    }> = [];

    for (const rule of rules) {
      if (!rule.isActive) continue;
      const conditionMet = matchesRuleCondition(rule, selectedOptions);
      if (conditionMet) {
        if (rule.actionType === 'REQUIRE_ARTWORK_FILES') {
          forceArtwork = true;
          if (rule.actionPayload && typeof rule.actionPayload === 'object') {
            overrides.push({ ...rule.actionPayload, artworkStatus: 'REQUIRED' });
          } else {
            overrides.push({ artworkStatus: 'REQUIRED' });
          }
        } else if (rule.actionType === 'CONFIGURE_ARTWORK') {
          if (rule.actionPayload && typeof rule.actionPayload === 'object') {
            overrides.push(rule.actionPayload);
          }
        }
      }
    }

    return {
      forcedArtworkRequired: forceArtwork,
      artworkConfigOverrides: overrides,
    };
  }, [product.configurationRules, selectedOptions]);

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
  const maxFileSizeMb = resolvedArtwork.maxArtworkFileSizeMb;
  const minMegapixels = resolvedArtwork.minimumArtworkMegapixels;
  const allowedFormats = resolvedArtwork.allowedFormats;
  const activeSlotConfigs = resolvedArtwork.slots;

  const [slotFiles, setSlotFiles] = useState<Record<string, FlowArtworkState>>({});
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>({});
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});

  // Active slot keys set for branch tracking
  const activeSlotKeys = useMemo(() => new Set(activeSlotConfigs.map((s) => s.slotKey)), [activeSlotConfigs]);

  // Only return files whose slots are actively configured; inactive branch files are omitted
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

  // File upload handler with resolution and size check
  const handleFileUpload = async (slotKey: string, file: File) => {
    setUploadingSlots((prev) => ({ ...prev, [slotKey]: true }));
    setSlotErrors((prev) => ({ ...prev, [slotKey]: '' }));

    const slotCfg = activeSlotConfigs.find((s) => s.slotKey === slotKey);
    const targetMinMP = slotCfg?.minMegapixels || minMegapixels;

    // Check file size
    const maxBytes = maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setSlotErrors((prev) => ({
        ...prev,
        [slotKey]: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${maxFileSizeMb}MB.`,
      }));
      setUploadingSlots((prev) => ({ ...prev, [slotKey]: false }));
      return;
    }

    // Client-side image resolution check if raster image
    const isImageFile = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(file.name);
    if (isImageFile && !/\.svg$/i.test(file.name)) {
      try {
        const imageRes = await new Promise<{ width: number; height: number; megapixels: number }>((resolve, reject) => {
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            const mp = Math.round(((w * h) / 1000000) * 100) / 100;
            resolve({ width: w, height: h, megapixels: mp });
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Invalid image. Could not read image dimensions.'));
          };
          img.src = objectUrl;
        });

        if (imageRes.megapixels < targetMinMP) {
          setSlotErrors((prev) => ({
            ...prev,
            [slotKey]: `Image resolution is ${imageRes.megapixels} MP (${imageRes.width}×${imageRes.height}px). Minimum ${targetMinMP} MP is recommended for crisp printing.`,
          }));
        }
      } catch (err: any) {
        console.warn('Image verification check:', err);
      }
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
  const designReq: ProductOptionRequirement = product.designServiceRequirement || 'DISABLED';
  const baselineDesignFee = Number((product as any).designServiceFee ?? (product as any).designServicePrice) || 0;
  const [wantsDesignService, setWantsDesignService] = useState<boolean>(() => designReq === 'REQUIRED');
  const [designNotes, setDesignNotes] = useState<string>('');

  useEffect(() => {
    if (designReq === 'REQUIRED') {
      setWantsDesignService(true);
    } else if (designReq === 'DISABLED') {
      setWantsDesignService(false);
    }
  }, [designReq]);

  // Sync wantsDesignService with rule policy or selected options
  useEffect(() => {
    if (resolvedArtwork.requireDesignBrief) {
      setWantsDesignService(true);
      return;
    }
    const designOpt =
      selectedOptions['design_service'] ??
      selectedOptions['design_required'] ??
      selectedOptions['design'];
    if (designOpt !== undefined) {
      const isYes =
        String(designOpt).toLowerCase() === 'yes' ||
        String(designOpt).toLowerCase() === 'true' ||
        String(designOpt).toLowerCase() === 'required';
      setWantsDesignService(isYes);
    }
  }, [resolvedArtwork.requireDesignBrief, selectedOptions]);

  // Delivery & Payment
  const [deliveryMethod, setDeliveryMethod] = useState<'COURIER' | 'STORE_PICKUP'>('COURIER');
  const [shippingPincode, setShippingPincode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pb2_user_pincode') || '';
    }
    return '';
  });
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'SPLIT_50'>('FULL');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);

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
          ].includes(k),
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
          ].includes(k),
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

  const minQty = Math.max(1, Number(product.minQuantity) || 1);
  const maxQty = Number(product.maxQuantity) || 100000;
  const rawStep = Number((product as any).quantityStep);
  const qtyStep = rawStep > 0 ? rawStep : minQty >= 100 ? 100 : minQty >= 50 ? 50 : 25;

  const [quantity, setQuantity] = useState<number>(() => {
    if (hasActiveCombinationTiers && validCombinationTiers.length > 0) {
      return validCombinationTiers[0].quantity;
    }
    if (initialQuantity && initialQuantity >= minQty) return initialQuantity;
    return minQty;
  });

  // Automatically update quantity when selected combination changes to one of its configured quantities
  useEffect(() => {
    if (hasActiveCombinationTiers && validCombinationTiers.length > 0) {
      if (!validCombinationTiers.some((t) => t.quantity === quantity)) {
        setQuantity(validCombinationTiers[0].quantity);
      }
    } else if (quantity < minQty) {
      setQuantity(minQty);
    }
  }, [hasActiveCombinationTiers, validCombinationTiers, quantity, minQty]);

  // ---------------------------------------------------------------------------
  // 5b. PERSONALIZATION TEMPLATE ENGINE (Keepsakes, Wedding Frames, Occasions)
  // ---------------------------------------------------------------------------
  const [personalizationTemplate, setPersonalizationTemplate] = useState<PersonalizationTemplate | null>(
    product.personalizationTemplate || null
  );
  const [personalizationSharedValues, setPersonalizationSharedValues] = useState<Record<string, any>>({});
  const [personalizationPerItemEntries, setPersonalizationPerItemEntries] = useState<
    Array<{ itemIndex: number; variantCombination?: any; values: Record<string, any> }>
  >([]);
  const [isBulkPasteModalOpen, setIsBulkPasteModalOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [bulkPasteErrors, setBulkPasteErrors] = useState<string[]>([]);

  // Load public template if product has templateId but not yet populated
  useEffect(() => {
    if (product.personalizationTemplateId && !personalizationTemplate) {
      api
        .getPublicPersonalizationTemplate(product.personalizationTemplateId)
        .then((tmpl) => {
          if (tmpl && tmpl.isActive) {
            setPersonalizationTemplate(tmpl);
          }
        })
        .catch(() => {});
    }
  }, [product.personalizationTemplateId, personalizationTemplate]);

  const effectiveQuantity = isMultiVariantEnabled ? totalVariantQuantity : quantity;

  // Auto-synchronize PER_ITEM roster rows whenever ordered quantity changes
  useEffect(() => {
    if (!personalizationTemplate) return;
    const perItemFields = personalizationTemplate.fields?.filter((f) => f.scope === 'PER_ITEM') || [];
    if (perItemFields.length === 0) return;

    setPersonalizationPerItemEntries((prev) => {
      const targetCount = Math.max(1, effectiveQuantity);
      const next = [...prev];
      if (next.length < targetCount) {
        for (let i = next.length; i < targetCount; i++) {
          const defaults: Record<string, any> = {};
          perItemFields.forEach((f) => {
            defaults[f.code] = f.defaultValue || '';
          });
          next.push({ itemIndex: i + 1, values: defaults });
        }
        return next;
      } else if (next.length > targetCount) {
        return next.slice(0, targetCount);
      }
      return prev;
    });
  }, [effectiveQuantity, personalizationTemplate]);

  // Bulk Paste / CSV Import Handler
  const handleApplyBulkPaste = () => {
    if (!personalizationTemplate) return;
    const perItemFields = personalizationTemplate.fields?.filter((f) => f.scope === 'PER_ITEM') || [];
    if (perItemFields.length === 0) return;

    const lines = bulkPasteText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const errors: string[] = [];
    if (lines.length !== effectiveQuantity) {
      errors.push(
        `Bulk roster count mismatch: You have ordered ${effectiveQuantity} items, but provided ${lines.length} lines. Please provide exactly ${effectiveQuantity} lines.`
      );
    }

    const newEntries: Array<{ itemIndex: number; values: Record<string, any> }> = [];
    lines.forEach((line, idx) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const rowValues: Record<string, any> = {};
      perItemFields.forEach((f, fIdx) => {
        rowValues[f.code] = (parts[fIdx] || '').trim();
      });
      newEntries.push({ itemIndex: idx + 1, values: rowValues });
    });

    if (errors.length > 0) {
      setBulkPasteErrors(errors);
      return;
    }

    setPersonalizationPerItemEntries(newEntries);
    setIsBulkPasteModalOpen(false);
    setBulkPasteText('');
    setBulkPasteErrors([]);
  };

  const quickPresets = useMemo(() => {
    const list = [
      minQty,
      minQty + 1 * qtyStep,
      minQty + 2 * qtyStep,
      minQty + 4 * qtyStep,
      minQty + 9 * qtyStep,
      minQty + 19 * qtyStep,
      minQty + 49 * qtyStep,
    ].filter((v, i, arr) => v <= maxQty && arr.indexOf(v) === i);
    return list.slice(0, 6);
  }, [minQty, maxQty, qtyStep]);

  // Reference Unit Price Calculation: Starting Reference Rate ÷ MOQ
  const referenceUnitPrice = useMemo(() => {
    const startingRate = Number(product.basePrice || 0);
    const mQty = Math.max(1, Number(product.minQuantity) || 1);
    return startingRate > 0 ? Math.round((startingRate / mQty) * 10000) / 10000 : 0;
  }, [product.basePrice, product.minQuantity]);

  // Option price modifiers fallback total (per-unit and fixed)
  const fallbackOptionModifiers = useMemo(() => {
    let perUnit = 0;
    let fixed = 0;
    for (const group of visibleGroups) {
      const selectedVal = selectedOptions[group.code];
      if (selectedVal === undefined || selectedVal === null) continue;
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
    return { perUnit, fixed };
  }, [visibleGroups, selectedOptions, referenceUnitPrice]);

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

  // Live monetary values
  const effectiveDesignFee = useMemo(() => {
    if (quote?.designServiceFee !== undefined && quote?.designServiceFee !== null) {
      return Number(quote.designServiceFee);
    }
    if (resolvedArtwork?.designFee !== undefined && resolvedArtwork?.designFee !== null) {
      return Number(resolvedArtwork.designFee);
    }
    return baselineDesignFee;
  }, [quote?.designServiceFee, resolvedArtwork?.designFee, baselineDesignFee]);

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

  const computedTax = useMemo(() => {
    return Number(quote?.totalTax || Math.round(computedSubtotal * 0.18 * 100) / 100);
  }, [quote?.totalTax, computedSubtotal]);

  const computedShipping = useMemo(() => {
    if (deliveryMethod === 'STORE_PICKUP') return 0;
    return Number(quote?.shippingAmount ?? quote?.estimatedShipping ?? 0);
  }, [deliveryMethod, quote?.shippingAmount, quote?.estimatedShipping]);

  const computedGrandTotal = useMemo(() => {
    return Number(quote?.grandTotal || Math.round((computedSubtotal + computedTax + computedShipping) * 100) / 100);
  }, [quote?.grandTotal, computedSubtotal, computedTax, computedShipping]);

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
  // 7. REAL-TIME VALIDATION ENGINE
  // ---------------------------------------------------------------------------
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    // 1. Prohibited / Invalid combination rules
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
          errors.push(`Minimum total volume across all combinations is ${minQty.toLocaleString()} pieces (currently ${totalVariantQuantity}).`);
        }
        if (totalVariantQuantity > maxQty) {
          errors.push(`Maximum total volume across all combinations is ${maxQty.toLocaleString()} pieces.`);
        }
        for (let i = 0; i < variantLines.length; i++) {
          const vl = variantLines[i];
          if (!vl.quantity || vl.quantity <= 0) {
            errors.push(`Variant line #${i + 1} must have a positive quantity.`);
          }
          for (const dim of dimensionGroups) {
            if (!vl.combination[dim.code]) {
              errors.push(`Variant line #${i + 1} is missing a selection for ${dim.name}.`);
            }
          }
        }
      }
    } else if (isExplicitlyExcluded) {
      errors.push('The selected specification combination is not supported for production.');
    } else if (isMissingMatrixCombo) {
      errors.push('This combination is currently unavailable. Please select another configuration.');
    } else if (hasActiveCombinationTiers) {
      if (!validCombinationTiers.some((t) => t.quantity === quantity)) {
        errors.push('Please select a valid quantity configured for this combination.');
      }
    } else {
      if (quantity < minQty) {
        errors.push(`Minimum production volume is ${minQty.toLocaleString()} units.`);
      }
      if (quantity > maxQty) {
        errors.push(`Maximum production volume is ${maxQty.toLocaleString()} units.`);
      }
    }
    if (artworkReq === 'REQUIRED') {
      for (const slot of activeSlotConfigs) {
        // If customer selected design service, only require artwork for slots customer is responsible for supplying
        const needsCustomerUpload = wantsDesignService
          ? slot.isRequired && slot.isCustomerSupplied !== false
          : slot.isRequired;
        if (needsCustomerUpload && !activeSlotFiles[slot.slotKey]) {
          errors.push(`Artwork upload required for: ${slot.label}`);
        }
      }
    }
    if (resolvedArtwork.requireDesignBrief && wantsDesignService && !designNotes.trim()) {
      errors.push('Design notes / content instructions are required for this service.');
    }

    // Authoritative Personalization Validation (Templates with PER_ORDER & PER_ITEM)
    if (personalizationTemplate && personalizationTemplate.isActive) {
      const sharedFields = personalizationTemplate.fields?.filter((f) => f.scope === 'PER_ORDER') || [];
      const perItemFields = personalizationTemplate.fields?.filter((f) => f.scope === 'PER_ITEM') || [];

      for (const sf of sharedFields) {
        const isReq =
          product.personalizationConfig?.fieldOverrides?.[sf.code]?.isRequired !== undefined
            ? Boolean(product.personalizationConfig.fieldOverrides[sf.code].isRequired)
            : sf.isRequired;
        const val = personalizationSharedValues[sf.code];
        const valStr = val !== undefined && val !== null ? String(val).trim() : '';
        if (isReq && !valStr) {
          errors.push(`Personalization required: ${sf.name}`);
        }
      }

      if (perItemFields.length > 0) {
        if (personalizationPerItemEntries.length !== effectiveQuantity) {
          errors.push(
            `Personalization requires ${effectiveQuantity} entries to match product quantity (currently ${personalizationPerItemEntries.length}).`
          );
        }
        for (let i = 0; i < personalizationPerItemEntries.length; i++) {
          const entry = personalizationPerItemEntries[i];
          const itemNum = i + 1;
          for (const pif of perItemFields) {
            const isReq =
              product.personalizationConfig?.fieldOverrides?.[pif.code]?.isRequired !== undefined
                ? Boolean(product.personalizationConfig.fieldOverrides[pif.code].isRequired)
                : pif.isRequired;
            const val = entry.values?.[pif.code];
            const valStr = val !== undefined && val !== null ? String(val).trim() : '';
            if (isReq && !valStr) {
              errors.push(`Item #${itemNum}: '${pif.name}' is required.`);
              break;
            }
          }
        }
      }
    }

    if (!termsAccepted) {
      errors.push('Please confirm and accept the Design Proof Approval Policy.');
    }
    return errors;
  }, [
    visibleGroups,
    groupStatusMap,
    selectedOptions,
    isExplicitlyExcluded,
    isMissingMatrixCombo,
    hasActiveCombinationTiers,
    validCombinationTiers,
    quantity,
    minQty,
    maxQty,
    artworkReq,
    wantsDesignService,
    activeSlotConfigs,
    activeSlotFiles,
    resolvedArtwork.requireDesignBrief,
    designNotes,
    personalizationTemplate,
    personalizationSharedValues,
    personalizationPerItemEntries,
    effectiveQuantity,
    product.personalizationConfig,
    termsAccepted,
  ]);

  const isValid = validationErrors.length === 0;

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
      personalization: personalizationTemplate && personalizationTemplate.isActive
        ? {
            templateId: personalizationTemplate.id,
            templateCode: personalizationTemplate.code,
            sharedValues: personalizationSharedValues,
            perItemEntries: personalizationPerItemEntries,
          }
        : null,
      quote: {
        ...(quote || {}),
        variantLines: isMultiVariantEnabled ? (quote?.variantLines || variantLines) : undefined,
        subtotal: computedSubtotal,
        totalTax: computedTax,
        shippingAmount: computedShipping,
        grandTotal: computedGrandTotal,
        paymentMode,
        advanceAmount: computedAdvanceAmount,
        balanceAmount: computedBalanceAmount,
        specificationsSnapshot: snapshot,
        personalization: personalizationTemplate && personalizationTemplate.isActive
          ? {
              templateId: personalizationTemplate.id,
              templateCode: personalizationTemplate.code,
              sharedValues: personalizationSharedValues,
              perItemEntries: personalizationPerItemEntries,
            }
          : null,
      },
    };
  };

  const handleAddToCartClick = async () => {
    if (!isValid || !onAddToCart) return;
    setIsSubmitting(true);
    try {
      await onAddToCart(buildResult());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNowClick = async () => {
    if (!isValid || !onBuyNow) return;
    setIsSubmitting(true);
    try {
      await onBuyNow(buildResult());
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 8. CONTINUOUS SINGLE-FLOW ORDERING INTERFACE
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* SECTION 1: SPECIFICATIONS & MATERIALS                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                Section 01
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Manufacturing Specs
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
              Select Specifications & Options
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose paper stocks, coating, finishes, and production parameters.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            {isMultiVariantEnabled
              ? `${visibleGroups.filter((g) => !effectiveVariantDimensions.includes(g.code)).length} Shared Options`
              : `${visibleGroups.length} Options`}
          </span>
        </div>

        <div className="space-y-6">
          {/* Reactive Rule Notices (Option auto-updates / sanitization) */}
          {ruleNotice && (
            <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl text-xs text-amber-950 flex items-start justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <RiInformationLine className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-950">Option Selection Updated</span>
                  <span className="text-[11px] text-amber-900 leading-relaxed">{ruleNotice}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRuleNotice(null)}
                className="text-amber-700 hover:text-amber-950 p-1 rounded-md transition"
                title="Dismiss notice"
              >
                <RiCloseLine className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Incompatible Combination Warning */}
          {invalidCombinations.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200/90 rounded-xl text-xs text-rose-950 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-rose-950">
                <RiAlertFill className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Incompatible Option Combination</span>
              </div>
              {invalidCombinations.map((inv, idx) => (
                <p key={idx} className="text-[11px] text-rose-900 pl-6">
                  • {inv.message}
                </p>
              ))}
            </div>
          )}

          {/* Standard Dimensions (if configured) */}
          {product.defaultSize && (
            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center flex-shrink-0 font-bold border border-amber-200/60 shadow-2xs">
                  <RiRulerLine className="h-4 w-4 text-[#E3A008]" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                    Finished Dimensions
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {product.defaultSize}
                  </span>
                </div>
              </div>
              <Badge variant="blue">Standard Format</Badge>
            </div>
          )}

          {/* Dynamic Option Groups with Conditional Rule Engine */}
          {visibleGroups
            .filter((group) => !isMultiVariantEnabled || !effectiveVariantDimensions.includes(group.code))
            .map((group) => {
              const status = groupStatusMap[group.code];
              // Map options according to conditional rules (filter hidden, mark disabled with reason)
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

          {isMultiVariantEnabled &&
            visibleGroups.filter((group) => !effectiveVariantDimensions.includes(group.code)).length === 0 && (
              <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-600 flex items-center gap-2.5">
                <RiInformationLine className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Product specifications ({dimensionGroups.map((g) => g.name).join(', ')}) are configured in the variant builder below.
                </span>
              </div>
            )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2: PRODUCTION RUN VOLUME                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-4">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                Section 02
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isMultiVariantEnabled ? 'Variant Matrix' : 'Batch Scale'}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
              {isMultiVariantEnabled ? 'Choose Sizes, Colors & Quantities' : 'Production Run Volume'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMultiVariantEnabled
                ? 'Configure mixed size, color, or style combinations with independent quantities in a single order.'
                : hasActiveCombinationTiers
                ? 'Select a configured quantity and verified rate for this exact specification.'
                : 'Select production run size. Higher quantities qualify for tier volume discounts.'}
            </p>
          </div>
          {isMultiVariantEnabled ? (
            <div className="flex flex-col items-end">
              <span className="text-xs font-mono font-bold bg-amber-100/90 text-amber-950 border border-amber-300 px-3 py-1 rounded-lg">
                Total: {totalVariantQuantity} pieces
              </span>
              {totalVariantQuantity < minQty && (
                <span className="text-[10px] font-bold text-rose-600 mt-1">
                  Min required: {minQty} pcs
                </span>
              )}
            </div>
          ) : hasActiveCombinationTiers ? (
            <span className="text-xs text-slate-500 font-mono">
              <strong className="text-slate-900">{validCombinationTiers.length}</strong> available tier(s)
            </span>
          ) : (
            <span className="text-xs text-slate-500 font-mono">
              Min: <strong className="text-slate-900">{minQty.toLocaleString()}</strong> pcs
            </span>
          )}
        </div>

        {isMultiVariantEnabled ? (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 w-10">#</th>
                    {dimensionGroups.map((dg) => (
                      <th key={dg.code} className="py-3 px-3">
                        {dg.name}
                      </th>
                    ))}
                    <th className="py-3 px-3 w-36 text-center">Quantity</th>
                    <th className="py-3 px-3 text-right">Unit Rate</th>
                    <th className="py-3 px-3 text-right">Subtotal</th>
                    <th className="py-3 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {variantLines.map((line, idx) => {
                    const lineQuote = quote?.variantLines?.[idx];
                    const unitPrice = lineQuote?.unitPrice ?? (line.quantity > 0 ? (lineQuote?.lineSubtotal ?? 0) / line.quantity : 0);
                    const subtotal = lineQuote?.lineSubtotal ?? (unitPrice * line.quantity);

                    return (
                      <tr key={line.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 font-mono text-slate-400 font-bold">{idx + 1}</td>
                        {dimensionGroups.map((dg) => {
                          const currentVal = line.combination[dg.code] || '';
                          const activeOptions = dg.options?.filter((o) => o.isActive !== false) || [];

                          return (
                            <td key={dg.code} className="py-2.5 px-3">
                              <select
                                value={currentVal}
                                onChange={(e) =>
                                  handleUpdateVariantLineCombination(line.id, dg.code, e.target.value)
                                }
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                              >
                                {activeOptions
                                  .filter((opt) => optionStatusMap[`${dg.code}:${opt.value}`]?.isVisible !== false)
                                  .map((opt) => {
                                    const optDisabled = optionStatusMap[`${dg.code}:${opt.value}`]?.isDisabled;
                                    return (
                                      <option key={opt.value} value={opt.value} disabled={optDisabled}>
                                        {opt.label} {opt.priceModifier ? `(+₹${opt.priceModifier})` : ''} {optDisabled ? ' (Unavailable)' : ''}
                                      </option>
                                    );
                                  })}
                              </select>
                            </td>
                          );
                        })}

                        {/* Quantity Stepper */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateVariantLineQuantity(line.id, line.quantity - 1)}
                              disabled={line.quantity <= 1}
                              className="px-2.5 py-1 hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) =>
                                handleUpdateVariantLineQuantity(line.id, parseInt(e.target.value) || 1)
                              }
                              className="w-14 text-center font-mono font-bold text-xs text-slate-900 border-x border-slate-200 py-1 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateVariantLineQuantity(line.id, line.quantity + 1)}
                              className="px-2.5 py-1 hover:bg-slate-100 text-slate-700 font-bold transition"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Unit Price */}
                        <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 font-medium">
                          {unitPrice > 0 ? `₹${Number(unitPrice).toFixed(2)}` : '—'}
                        </td>

                        {/* Subtotal */}
                        <td className="py-3 px-3 text-right font-mono text-xs font-bold text-slate-900">
                          {subtotal > 0 ? `₹${Number(subtotal).toFixed(2)}` : '—'}
                        </td>

                        {/* Action: Delete line */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariantLine(line.id)}
                            disabled={variantLines.length <= 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition"
                            title="Remove combination line"
                          >
                            <RiDeleteBinLine className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="block md:hidden space-y-3">
              {variantLines.map((line, idx) => {
                const lineQuote = quote?.variantLines?.[idx];
                const unitPrice = lineQuote?.unitPrice ?? (line.quantity > 0 ? (lineQuote?.lineSubtotal ?? 0) / line.quantity : 0);
                const subtotal = lineQuote?.lineSubtotal ?? (unitPrice * line.quantity);

                return (
                  <div
                    key={line.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-mono text-xs font-bold text-slate-700">
                        Variant #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantLine(line.id)}
                        disabled={variantLines.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20 cursor-pointer transition"
                        title="Remove combination line"
                      >
                        <RiDeleteBinLine className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {dimensionGroups.map((dg) => {
                        const currentVal = line.combination[dg.code] || '';
                        const activeOptions = dg.options?.filter((o) => o.isActive !== false) || [];

                        return (
                          <div key={dg.code} className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-600 uppercase">
                              {dg.name}
                            </label>
                            <select
                              value={currentVal}
                              onChange={(e) =>
                                handleUpdateVariantLineCombination(line.id, dg.code, e.target.value)
                              }
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                            >
                              {activeOptions
                                .filter((opt) => optionStatusMap[`${dg.code}:${opt.value}`]?.isVisible !== false)
                                .map((opt) => {
                                  const optDisabled = optionStatusMap[`${dg.code}:${opt.value}`]?.isDisabled;
                                  return (
                                    <option key={opt.value} value={opt.value} disabled={optDisabled}>
                                      {opt.label} {opt.priceModifier ? `(+₹${opt.priceModifier})` : ''} {optDisabled ? ' (Unavailable)' : ''}
                                    </option>
                                  );
                                })}
                            </select>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateVariantLineQuantity(line.id, line.quantity - 1)}
                          disabled={line.quantity <= 1}
                          className="px-3 py-1.5 hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-30"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            handleUpdateVariantLineQuantity(line.id, parseInt(e.target.value) || 1)
                          }
                          className="w-12 text-center font-mono font-bold text-xs text-slate-900 border-x border-slate-200 py-1.5 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateVariantLineQuantity(line.id, line.quantity + 1)}
                          className="px-3 py-1.5 hover:bg-slate-100 text-slate-700 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] font-mono text-slate-500">
                          {unitPrice > 0 ? `₹${Number(unitPrice).toFixed(2)}/pc` : '—'}
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-900">
                          {subtotal > 0 ? `₹${Number(subtotal).toFixed(2)}` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddVariantLine}
                className="inline-flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg border border-[#E3A008]/50 shadow-xs transition active:scale-95 cursor-pointer self-start"
              >
                <RiAddLine className="w-4 h-4" />
                <span>Add Another Variant</span>
              </button>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-600">
                  Total Order Quantity: <strong className="text-slate-900 text-sm font-bold">{totalVariantQuantity} pieces</strong>
                </span>
                {totalVariantQuantity < minQty && (
                  <span className="text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-bold">
                    Min required: {minQty} pcs
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : isExplicitlyExcluded ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
            <RiAlertFill className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Incompatible Option Combination</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                {matchingCombinationTiers.find((t) => t.isExcluded)?.exclusionReason ||
                  'This specific combination of options is not supported for manufacturing.'}
              </p>
            </div>
          </div>
        ) : isMissingMatrixCombo ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-3">
            <RiAlertFill className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">This combination is currently unavailable.</p>
              <p className="text-rose-800 text-[11px] mt-0.5">
                This combination is currently unavailable. Please select another configuration.
              </p>
            </div>
          </div>
        ) : hasActiveCombinationTiers ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Select from configured quantities for this combination:</span>
              <span className="text-[11px] font-mono text-slate-400">Total Price (excl. tax)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {validCombinationTiers.map((tier) => {
                const isSel = quantity === tier.quantity;
                return (
                  <button
                    key={tier.id || tier.quantity}
                    type="button"
                    onClick={() => setQuantity(tier.quantity)}
                    className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer relative ${
                      isSel
                        ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono font-black text-lg ${isSel ? 'text-white' : 'text-slate-900'}`}>
                        {tier.quantity.toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-mono font-bold uppercase ${isSel ? 'text-slate-400' : 'text-slate-400'}`}>
                        Pcs
                      </span>
                    </div>
                    <div className={`mt-1 text-sm font-bold ${isSel ? 'text-amber-400' : 'text-slate-900'}`}>
                      {formatCurrency(tier.totalPrice)}
                    </div>
                    <div className={`text-[11px] font-mono ${isSel ? 'text-slate-300' : 'text-slate-500'}`}>
                      ₹{tier.unitPrice.toFixed(2)}/pc
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Non-combination fallback: Stepper & quick presets */
          <>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Custom Run Volume</span>
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-amber-200">
                    Step: +{qtyStep.toLocaleString()}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Select quantity in exact increments of {qtyStep.toLocaleString()} units
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(minQty, q - qtyStep))}
                  disabled={quantity <= minQty}
                  className="h-10 w-10 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer text-lg"
                >
                  -
                </button>
                <input
                  type="number"
                  min={minQty}
                  max={maxQty}
                  step={qtyStep}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setQuantity(val);
                  }}
                  className="w-28 h-10 bg-white border border-slate-300 rounded-xl text-center font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + qtyStep))}
                  disabled={quantity >= maxQty}
                  className="h-10 w-10 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer text-lg"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {quickPresets.map((preset) => {
                const isSel = quantity === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(preset)}
                    className={`py-3 px-2 rounded-xl text-center border transition-all cursor-pointer ${
                      isSel
                        ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="font-mono font-black text-base">
                      {preset.toLocaleString()}
                    </div>
                    <div className="text-[10px] uppercase font-mono text-slate-400">
                      Units
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2b: PERSONALIZATION & INSCRIPTIONS (Keepsakes / Frames)    */}
      {/* ------------------------------------------------------------------ */}
      {personalizationTemplate && personalizationTemplate.isActive && (
        <div className="bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/30 border border-purple-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
          <div className="border-b border-purple-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase text-purple-600 tracking-wider">
                  Section 02b
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                  Custom Personalization
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5 flex items-center gap-2">
                <RiFileList3Line className="text-purple-600" />
                {personalizationTemplate.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {personalizationTemplate.description ||
                  'Enter shared occasion details and personalized recipient names for your order.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-purple-100 text-purple-900 border border-purple-200 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                {personalizationTemplate.fields.filter((f) => f.scope === 'PER_ITEM').length > 0
                  ? `${effectiveQuantity} Personalized Items`
                  : 'Shared Order Details'}
              </span>
            </div>
          </div>

          {/* Shared Fields (PER_ORDER) */}
          {personalizationTemplate.fields.filter((f) => f.scope === 'PER_ORDER').length > 0 && (
            <div className="space-y-4 p-5 bg-white rounded-xl border border-purple-100 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Shared Event & Commemoration Details (Entered Once)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personalizationTemplate.fields
                  .filter((f) => f.scope === 'PER_ORDER')
                  .map((field) => {
                    const isReq =
                      product.personalizationConfig?.fieldOverrides?.[field.code]?.isRequired !== undefined
                        ? Boolean(product.personalizationConfig.fieldOverrides[field.code].isRequired)
                        : field.isRequired;

                    return (
                      <div key={field.code} className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>{field.name}</span>
                          {isReq && <span className="text-rose-500 font-black">*</span>}
                        </label>

                        {field.inputType === 'TEXTAREA' ? (
                          <textarea
                            rows={2}
                            placeholder={field.placeholder || ''}
                            value={personalizationSharedValues[field.code] || ''}
                            onChange={(e) =>
                              setPersonalizationSharedValues({
                                ...personalizationSharedValues,
                                [field.code]: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                          />
                        ) : field.inputType === 'SELECT' && field.options && field.options.length > 0 ? (
                          <select
                            value={personalizationSharedValues[field.code] || ''}
                            onChange={(e) =>
                              setPersonalizationSharedValues({
                                ...personalizationSharedValues,
                                [field.code]: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                          >
                            <option value="">Select an option...</option>
                            {field.options.map((opt, oIdx) => (
                              <option key={oIdx} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={
                              field.inputType === 'NUMBER'
                                ? 'number'
                                : field.inputType === 'DATE'
                                ? 'date'
                                : 'text'
                            }
                            placeholder={field.placeholder || ''}
                            value={personalizationSharedValues[field.code] || ''}
                            onChange={(e) =>
                              setPersonalizationSharedValues({
                                ...personalizationSharedValues,
                                [field.code]: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                          />
                        )}

                        {field.helperText && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{field.helperText}</p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Per-Item Fields (PER_ITEM) */}
          {personalizationTemplate.fields.filter((f) => f.scope === 'PER_ITEM').length > 0 && (
            <div className="space-y-4 p-5 bg-white rounded-xl border border-purple-100 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Individual Item Personalization Roster ({effectiveQuantity} pieces)
                  </div>
                  <p className="text-xs text-slate-500">
                    Provide the unique name or inscription for each ordered item
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkPasteErrors([]);
                      setIsBulkPasteModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <RiUpload2Line className="w-4 h-4" />
                    <span>Bulk Paste / CSV Import</span>
                  </button>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-16 text-slate-500 font-bold uppercase tracking-wider">
                        Item #
                      </th>
                      {personalizationTemplate.fields
                        .filter((f) => f.scope === 'PER_ITEM')
                        .map((field) => {
                          const isReq =
                            product.personalizationConfig?.fieldOverrides?.[field.code]?.isRequired !== undefined
                              ? Boolean(product.personalizationConfig.fieldOverrides[field.code].isRequired)
                              : field.isRequired;

                          return (
                            <th key={field.code} className="py-2.5 px-3 font-bold text-slate-700">
                              <span>{field.name}</span>
                              {isReq && <span className="text-rose-500 ml-0.5">*</span>}
                            </th>
                          );
                        })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {personalizationPerItemEntries.map((row, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/20">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </td>
                        {personalizationTemplate.fields
                          .filter((f) => f.scope === 'PER_ITEM')
                          .map((field) => (
                            <td key={field.code} className="py-2 px-3">
                              <input
                                type={field.inputType === 'NUMBER' ? 'number' : 'text'}
                                placeholder={field.placeholder || `Enter ${field.name}`}
                                value={row.values?.[field.code] || ''}
                                onChange={(e) => {
                                  const next = [...personalizationPerItemEntries];
                                  next[idx] = {
                                    ...next[idx],
                                    values: {
                                      ...(next[idx]?.values || {}),
                                      [field.code]: e.target.value,
                                    },
                                  };
                                  setPersonalizationPerItemEntries(next);
                                }}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                              />
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BULK PASTE MODAL */}
      {isBulkPasteModalOpen && personalizationTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RiUpload2Line className="text-purple-600" />
                Bulk Paste Roster ({effectiveQuantity} pieces)
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <RiCloseLine size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Paste rows copied directly from Excel, Google Sheets, or CSV. Each line will populate one ordered piece.
              Expected columns:{' '}
              <strong className="text-purple-700">
                {personalizationTemplate.fields
                  .filter((f) => f.scope === 'PER_ITEM')
                  .map((f) => f.name)
                  .join(' , ')}
              </strong>
            </p>

            {bulkPasteErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-1">
                {bulkPasteErrors.map((err, i) => (
                  <div key={i} className="flex items-center gap-1.5 font-medium">
                    <RiAlertFill className="text-rose-600 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            <textarea
              rows={8}
              placeholder={`Uncle David & Family\nAunt Sarah\nGrandpa Arthur`}
              value={bulkPasteText}
              onChange={(e) => setBulkPasteText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:outline-none"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono font-medium text-slate-500">
                {bulkPasteText.split('\n').filter((l) => l.trim()).length} of {effectiveQuantity} lines entered
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkPasteModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkPaste}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30"
                >
                  Apply to {effectiveQuantity} Items
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 3: ARTWORK & PREPRESS SETUP                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-5">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                Section 03
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Prepress & Design
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
              Artwork Files & Prepress
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload print-ready files or request our professional design studio service.
            </p>
          </div>
          {artworkReq === 'DISABLED' ? (
            <Badge variant="zinc">No Artwork Required</Badge>
          ) : artworkReq === 'REQUIRED' ? (
            <Badge variant="yellow">Mandatory for Print</Badge>
          ) : (
            <Badge variant="zinc">Optional Upload</Badge>
          )}
        </div>

        {/* Artwork Disabled Notice */}
        {artworkReq === 'DISABLED' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 text-xs text-slate-600">
            <RiInformationLine className="h-5 w-5 text-slate-400 flex-shrink-0" />
            <span>
              Artwork file upload is not required for this product configuration. Production will proceed using standard automated typesetting.
            </span>
          </div>
        )}

        {/* Artwork File Upload Slots */}
        {artworkReq !== 'DISABLED' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Formats: <strong className="text-slate-800">{allowedFormats.join(', ')}</strong> • Max {maxFileSizeMb}MB • Min {minMegapixels} MP
              </span>
              <span className="font-mono font-bold text-slate-700">
                {activeSlotConfigs.length} {activeSlotConfigs.length === 1 ? 'Slot' : 'Slots'} Configured
              </span>
            </div>

            {/* Upload Slots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {activeSlotConfigs.map((slot) => {
                const uploaded = slotFiles[slot.slotKey];
                const isUploading = Boolean(uploadingSlots[slot.slotKey]);
                const errorMsg = slotErrors[slot.slotKey];

                return (
                  <div
                    key={slot.slotKey}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <RiCameraLine className="h-4 w-4 text-purple-600" />
                        <span>{slot.label}</span>
                        {slot.isRequired && (!wantsDesignService || slot.isCustomerSupplied !== false) && (
                          <span className="text-rose-500 font-black">*</span>
                        )}
                      </span>
                      {uploaded ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                          <RiCheckLine className="h-3 w-3 stroke-[3]" /> Uploaded
                        </span>
                      ) : wantsDesignService && slot.isCustomerSupplied === false ? (
                        <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                          Design Team Scope
                        </span>
                      ) : null}
                    </div>

                    {uploaded ? (
                      <div className="p-3 bg-white border border-purple-200 rounded-lg flex items-center justify-between">
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
                    ) : wantsDesignService && slot.isCustomerSupplied === false ? (
                      <div className="p-4 bg-purple-50/60 border border-purple-200/80 rounded-xl text-center space-y-1">
                        <RiPaletteLine className="h-6 w-6 text-purple-600 mx-auto" />
                        <div className="text-xs font-bold text-purple-900">
                          Artwork Created by PB Design Studio
                        </div>
                        <div className="text-[11px] text-purple-700">
                          Our prepress designers will compose the {slot.label} file according to your design brief and instructions.
                        </div>
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
                        className="border-2 border-dashed border-slate-300 hover:border-purple-500 bg-white hover:bg-purple-50/20 p-5 rounded-xl text-center block cursor-pointer transition-colors"
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
                          <div className="text-xs font-bold text-purple-700 animate-pulse">
                            Uploading & verifying resolution...
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <RiUploadCloud2Line className="h-6 w-6 text-slate-400 mx-auto" />
                            <div className="text-xs font-bold text-slate-800">
                              Click or drag {slot.label} file
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              PDF, AI, PSD, CDR, TIFF or High-Res Image
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

        {/* Design Studio Service Add-on */}
        {designReq !== 'DISABLED' && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RiPaletteLine className="h-5 w-5 text-amber-700" />
                  <div>
                    <span className="text-xs font-black uppercase text-amber-950 block">
                      Professional Design Studio Assistance
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Our prepress artists vectorize, layout, and prepare your print proof
                    </span>
                  </div>
                </div>
                {effectiveDesignFee > 0 && (
                  <span className="text-xs font-mono font-bold text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded">
                    +{formatCurrency(effectiveDesignFee)}
                  </span>
                )}
              </div>

              {designReq === 'OPTIONAL' && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={wantsDesignService}
                    onChange={(e) => setWantsDesignService(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-300 text-slate-900 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Yes, I want professional design assistance for this order
                  </span>
                </label>
              )}

              {wantsDesignService && (
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-slate-800 block mb-1">
                    Design Notes & Content Instructions {resolvedArtwork.requireDesignBrief ? '(Required)' : '(Optional)'}
                  </label>
                  <textarea
                    rows={2}
                    value={designNotes}
                    onChange={(e) => setDesignNotes(e.target.value)}
                    placeholder="Enter brand guidelines, text content, color codes, or instructions for our design team..."
                    className="w-full p-2.5 bg-white border border-amber-300/80 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 shadow-2xs"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 4: DELIVERY & FULFILLMENT                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-4">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                Section 04
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Logistics & SLA
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
              Delivery & Turnaround
            </h2>
          </div>

          {(() => {
            const delivery = getEstimatedDeliveryText(product.productionDays || 2);
            return (
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1.5">
                <RiTruckLine className="h-4 w-4 text-emerald-700" />
                <span>Est. Delivery: {delivery.deliveryRange}</span>
              </span>
            );
          })()}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setDeliveryMethod('COURIER')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              deliveryMethod === 'COURIER'
                ? 'border-slate-950 bg-slate-950 text-white shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
            }`}
          >
            <div className="font-bold text-xs">Doorstep Courier</div>
            <div className="text-[10px] opacity-75">Express dispatch direct to address</div>
          </button>

          <button
            type="button"
            onClick={() => setDeliveryMethod('STORE_PICKUP')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              deliveryMethod === 'STORE_PICKUP'
                ? 'border-slate-950 bg-slate-950 text-white shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
            }`}
          >
            <div className="font-bold text-xs">Store Pickup</div>
            <div className="text-[10px] opacity-75">Collect from central print hub (Free)</div>
          </button>
        </div>

        {deliveryMethod === 'COURIER' && (
          <div className="pt-2">
            <input
              type="text"
              maxLength={6}
              value={shippingPincode}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '');
                setShippingPincode(v);
                if (typeof window !== 'undefined') localStorage.setItem('pb2_user_pincode', v);
              }}
              placeholder="Enter 6-digit delivery pincode (e.g. 560001)..."
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-950"
            />
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 5: ORDER SUMMARY & AUTHORITATIVE PRICE BREAKDOWN           */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-elevated space-y-5">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                Section 05
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Order Review
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
              Live Price & Confirmation
            </h2>
          </div>
          {isCalculatingQuote && (
            <span className="text-[11px] font-mono text-amber-700 animate-pulse font-bold">
              Updating server quote...
            </span>
          )}
        </div>

        {/* Selected Specifications Chips */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
            Selected Configuration
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-900">
              Quantity: {quantity.toLocaleString()} pcs
            </span>
            {visibleGroups.map((g) => {
              const val = selectedOptions[g.code];
              const opt = g.options?.find((o) => String(o.value) === String(val));
              return (
                <span
                  key={g.id}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-800"
                >
                  <span className="text-slate-400 font-normal">{g.name}:</span> {opt ? opt.label : String(val || 'None')}
                </span>
              );
            })}
            {Object.keys(activeSlotFiles).length > 0 && (
              <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-md font-bold text-purple-900 flex items-center gap-1">
                <RiCheckLine className="h-3 w-3 stroke-[3]" /> {Object.keys(activeSlotFiles).length} Files Attached
              </span>
            )}
            {wantsDesignService && (
              <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md font-bold text-amber-900">
                Design Service
              </span>
            )}
            {Array.isArray(quote?.appliedCharges) && quote.appliedCharges.length > 0 && (
              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md font-bold text-emerald-900 flex items-center gap-1">
                🏷️ {quote.appliedCharges.length} Configured Fee(s)
              </span>
            )}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Base Production ({quantity.toLocaleString()} pcs)</span>
            <span className="font-mono font-bold text-slate-900">
              {formatCurrency(Number(quote?.baseSubtotal ?? (referenceUnitPrice * quantity)))}
            </span>
          </div>

          {Number(quote?.dynamicModifiersTotal || quote?.optionsCost || 0) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Material & Finish Upgrades</span>
              <span className="font-mono font-bold text-slate-900">
                +{formatCurrency(Number(quote?.dynamicModifiersTotal || quote?.optionsCost || 0))}
              </span>
            </div>
          )}

          {/* Generic Conditional Additional Charges */}
          {Array.isArray(quote?.appliedCharges) && quote.appliedCharges.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {quote.appliedCharges.map((ch: any, idx: number) => (
                <div
                  key={ch.chargeId || idx}
                  className="flex justify-between items-center text-emerald-950 font-bold bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200"
                >
                  <div>
                    <span className="text-xs flex items-center gap-1.5">
                      <span>🏷️</span>
                      <span>{ch.name || ch.chargeId}</span>
                      {ch.calculationType && ch.calculationType !== 'FIXED' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-200/60 text-emerald-900">
                          {ch.calculationType}
                        </span>
                      )}
                    </span>
                    {ch.description && (
                      <span className="text-[10px] text-emerald-800 font-medium block pl-5">
                        {ch.description}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-900">
                    +{formatCurrency(Number(ch.amount || 0))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {wantsDesignService && effectiveDesignFee > 0 && (
            <div className="flex justify-between text-amber-950 font-bold bg-amber-50/60 p-2 rounded-lg border border-amber-200">
              <span>Professional Design Studio Fee</span>
              <span className="font-mono">+{formatCurrency(effectiveDesignFee)}</span>
            </div>
          )}

          {Number(quote?.appliedOffer?.savingsAmount || quote?.discountAmount || 0) > 0 && (
            <div className="flex justify-between items-center text-emerald-900 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-300">
              <span>🎉 Volume Offer Savings ({quote?.appliedOffer?.discountPercent || quote?.discountPercent}% OFF)</span>
              <span className="font-mono text-emerald-700">
                -{formatCurrency(Number(quote?.appliedOffer?.savingsAmount || quote?.discountAmount))}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-600">
            <span>Pre-tax Subtotal</span>
            <span className="font-mono font-bold text-slate-900">{formatCurrency(computedSubtotal)}</span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>Estimated GST (18%)</span>
            <span className="font-mono font-bold text-slate-900">+{formatCurrency(computedTax)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span>Fulfillment ({deliveryMethod === 'STORE_PICKUP' ? 'Self Pickup' : 'Courier'})</span>
            <span className="font-mono font-bold text-slate-900">
              {deliveryMethod === 'STORE_PICKUP' ? (
                <span className="text-emerald-700">FREE</span>
              ) : computedShipping === 0 ? (
                <span className="text-emerald-700">FREE</span>
              ) : (
                `+${formatCurrency(computedShipping)}`
              )}
            </span>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                Total Order Value
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ₹{(computedGrandTotal / Math.max(1, quantity)).toFixed(2)} / unit all-inclusive
              </span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-slate-950 font-display">
              {formatCurrency(computedGrandTotal)}
            </span>
          </div>
        </div>

        {/* Payment Terms Selector: Full vs 50% Split */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <label className="text-xs font-black uppercase tracking-wider text-slate-900 block">
            Payment Terms
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMode('FULL')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                paymentMode === 'FULL'
                  ? 'border-slate-950 bg-slate-950 text-white shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
              }`}
            >
              <div className="text-xs font-bold">100% Full Settlement</div>
              <div className="text-base font-mono font-black mt-0.5">{formatCurrency(computedGrandTotal)}</div>
              <div className="text-[10px] opacity-75">Production queue priority</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('SPLIT_50')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                paymentMode === 'SPLIT_50'
                  ? 'border-slate-950 bg-slate-950 text-white shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
              }`}
            >
              <div className="text-xs font-bold">50% Advance Milestone</div>
              <div className="text-base font-mono font-black mt-0.5">{formatCurrency(computedAdvanceAmount)}</div>
              <div className="text-[10px] opacity-75">Balance before dispatch</div>
            </button>
          </div>
        </div>

        {/* Proof Approval Terms Checkbox */}
        <div className="pt-3 border-t border-slate-100">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded border-slate-300 text-slate-950 focus:ring-0 cursor-pointer"
            />
            <span>
              I have reviewed all specifications and agree to the{' '}
              <strong className="text-slate-900 underline">Design Proof Approval Policy</strong>.
              I understand that once sent to press, specifications cannot be modified.
            </span>
          </label>
        </div>

        {/* Real-time Validation Notices */}
        {!isValid && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-rose-800 flex items-center gap-1.5">
              <RiAlertFill className="h-4 w-4 flex-shrink-0" />
              <span>Please complete required items before ordering:</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-rose-700 pl-1">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        {!isPreviewMode && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={!isValid || isSubmitting}
              onClick={handleAddToCartClick}
              className="w-full"
            >
              <RiShoppingCart2Line className="h-4 w-4 mr-2" />
              <span>Add to Cart</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!isValid || isSubmitting}
              onClick={handleBuyNowClick}
              className="w-full"
            >
              <span>Proceed to Checkout</span>
              <RiArrowRightLine className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
