'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiShoppingCart2Line,
  RiUploadCloud2Line,
  RiCustomerService2Line,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiInformationLine,
  RiShieldCheckLine,
  RiTruckLine,
  RiAwardLine,
  RiTimeLine,
  RiBox3Line,
  RiStarFill,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiArrowRightLine,
  RiShoppingBag3Line,
  RiGiftLine,
  RiSparklingFill,
  RiPaletteLine,
  RiEyeLine,
  RiMagicLine,
  RiFileList3Line,
  RiGroupLine,
  RiFileList2Line,
  RiCalendarEventLine,
  RiErrorWarningLine,
  RiAddLine,
  RiSubtractLine,
  RiLockLine,
  RiArrowUpCircleLine,
  RiLoader4Line,
} from 'react-icons/ri';
import {
  api,
  DynamicProduct,
  ProductOptionGroup,
  ProductAdditionalPricingTier,
  PersonalizationTemplate,
  PersonalizationPayload,
  PersonalizationItemEntry,
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { CartDrawer, CartDrawerItem } from '@/components/cart/CartDrawer';
import { CustomerAuthModal } from '@/components/auth/CustomerAuthModal';
import { useAuth } from '@/lib/auth-context';
import { resolveArtworkConditions } from '@/lib/artwork-rule-resolver';

interface PresetDimension {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
}

const DEFAULT_PRESET_DIMENSIONS: PresetDimension[] = [
  { id: 'jewellery', name: 'Jewellery', length: 100, width: 100, height: 40 },
  { id: 'a5', name: 'A5 Presentation', length: 220, width: 160, height: 60 },
  { id: 'apparel', name: 'Apparel', length: 300, width: 220, height: 80 },
  { id: 'perfume', name: 'Perfume', length: 120, width: 120, height: 140 },
  { id: 'custom', name: 'Custom Size', length: 220, width: 160, height: 60 },
];

/**
 * Resolves the active additional pricing tier charge for a given option group, option value, and order quantity.
 */
function getOptionAdditionalTierCharge(
  additionalPricings: ProductAdditionalPricingTier[] | undefined,
  groupCode: string,
  optionValue: string,
  quantity: number
): { unitPrice: number; chargeBasis: string; isExcluded: boolean } | null {
  if (!quantity || quantity < 1) return null;
  if (!additionalPricings || additionalPricings.length === 0) return null;
  const norm = (v: string | undefined | null) => String(v || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const target = norm(optionValue);

  const groupRows = additionalPricings.filter(
    (ap) =>
      ap.groupCode === groupCode &&
      (ap.optionValue === optionValue ||
       norm(ap.optionValue) === target ||
       String(ap.optionValue).toLowerCase().trim() === String(optionValue).toLowerCase().trim())
  );
  if (groupRows.length === 0) return null;

  // Exact tier match where minQty <= quantity <= maxQty
  let match = groupRows.find((ap) => {
    const minQ = Number(ap.minQty) || 0;
    const maxQ = ap.maxQty !== undefined && ap.maxQty !== null && Number(ap.maxQty) >= minQ ? Number(ap.maxQty) : minQ;
    return quantity >= minQ && (maxQ > minQ ? quantity <= maxQ : (ap.maxQty ? quantity <= ap.maxQty : true));
  });

  if (!match) {
    const sorted = [...groupRows].sort((a, b) => Number(a.minQty) - Number(b.minQty));
    const highest = sorted[sorted.length - 1];
    const lowest = sorted[0];
    if (quantity >= Number(highest.minQty)) {
      match = highest;
    } else if (quantity <= Number(lowest.minQty)) {
      match = lowest;
    }
  }

  if (match) {
    return {
      unitPrice: Number(match.unitPrice) || 0,
      chargeBasis: match.chargeBasis || 'PER_UNIT',
      isExcluded: Boolean(match.isExcluded),
    };
  }
  return null;
}

// Fallback options for common option groups when DB options are not yet seeded
const FALLBACK_GROUP_OPTIONS: Record<string, Array<{ id: string; title: string; subtitle?: string; isExcluded?: boolean }>> = {
  box_style: [
    { id: 'lid_base', title: 'Lid & Base', subtitle: '(2-Piece)' },
    { id: 'neck_shoulder', title: 'Neck & Shoulder', subtitle: '(3-Piece)' },
    { id: 'book_style', title: 'Book-Style', subtitle: '(Magnetic Flap)' },
    { id: 'drawer', title: 'Slide-Out Drawer', subtitle: '(Matchbox)' },
  ],
  board_thickness: [
    { id: '1000gsm', title: '1000 GSM', subtitle: '(1.5 mm)' },
    { id: '1200gsm', title: '1200 GSM', subtitle: '(2.0 mm)' },
    { id: '1500gsm', title: '1500 GSM', subtitle: '(2.5 mm)' },
    { id: '1800gsm', title: '1800 GSM', subtitle: '(3.0 mm)' },
  ],
  outer_wrap: [
    { id: 'coated_art', title: 'Coated Art Paper', subtitle: '(157 GSM)' },
    { id: 'wibalin_linen', title: 'Wibalin Linen', subtitle: '(Textured)' },
    { id: 'kraft_paper', title: 'Kraft Paper', subtitle: '(Natural)' },
    { id: 'pearl_metallic', title: 'Pearl Metallic', subtitle: '(Shimmer)' },
    { id: 'soft_touch', title: 'Soft Touch', subtitle: '(Luxury Matte)' },
  ],
  standee_size: [
    { id: '2.5x6', title: '2.5 × 6 Feet', subtitle: '(Standard Exhibition)' },
    { id: '2x5', title: '2.0 × 5 Feet', subtitle: '(Compact Retail)' },
    { id: '3x6', title: '3.0 × 6 Feet', subtitle: '(Wide Backdrop)' },
  ],
  media_type: [
    { id: 'star_flex', title: 'Star Flex (Matte)', subtitle: '(Anti-Glare Fabric)' },
    { id: 'grey_back', title: 'Grey Back Poly', subtitle: '(100% Non-Curl Opaque)' },
    { id: 'backlit_satin', title: 'Satin High-Gloss', subtitle: '(Vibrant Photo Media)' },
  ],
  paper_type: [
    { id: '350_matte', title: '350 GSM Matte', subtitle: '(Smooth Calendered)' },
    { id: '350_gloss', title: '350 GSM Gloss', subtitle: '(High Sheen Finish)' },
    { id: '400_velvet', title: '400 GSM Velvet Card', subtitle: '(Ultra-Thick Luxury)' },
  ],
  finishing: [
    { id: 'none', title: 'None' },
    { id: 'hot_foil', title: 'Hot Foil Stamping', subtitle: '(Gold / Silver)' },
    { id: 'embossing', title: 'Embossing', subtitle: '(3D Raised)' },
    { id: 'spot_uv', title: 'Spot Gloss UV', subtitle: '(High-Luster Accent)' },
    { id: 'matte_lam', title: 'Matte Lamination', subtitle: '(Velvet Touch)' },
    { id: 'gloss_lam', title: 'Gloss Lamination', subtitle: '(Crystal Clear)' },
  ],
  cutting_style: [
    { id: 'square_cut', title: 'Standard Square Cut', subtitle: '(90° Crisp Corners)' },
    { id: 'round_corners', title: 'Die-Cut Rounded', subtitle: '(6mm Radius Corners)' },
  ],
  insert: [
    { id: 'none', title: 'None' },
    { id: 'foam', title: 'Foam Insert', subtitle: '(High Density)' },
    { id: 'velvet_foam', title: 'Velvet Foam', subtitle: '(Luxury Flocked)' },
    { id: 'cardboard_divider', title: 'Cardboard Divider', subtitle: '(Die-Cut Partitions)' },
  ],
};

interface DynamicProductViewProps {
  product: DynamicProduct;
}

export function DynamicProductView({ product }: DynamicProductViewProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Check if product specifically has dimensional input fields configured in DB or is custom rigid box
  const hasDimensionalInputs = useMemo(() => {
    const rawCodes = (product.optionGroups || []).map((g) => (g.code || '').toLowerCase());
    return (
      rawCodes.includes('box_length_mm') ||
      rawCodes.includes('length_mm') ||
      rawCodes.includes('dimensions_mm') ||
      product.slug === 'custom-rigid-box'
    );
  }, [product.optionGroups, product.slug]);

  // Curated Images: only use pink rigid box showcase for custom-rigid-box
  const galleryImages = useMemo(() => {
    if (product.images && product.images.length > 0) {
      return product.images.map((img) => ({
        url: img.url,
        alt: img.altText || product.name,
      }));
    }

    if (product.slug === 'custom-rigid-box') {
      return [
        {
          url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1000&q=85',
          alt: 'Custom Luxury Rigid Box - Angled View with Gold Interior',
        },
        {
          url: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=1000&q=85',
          alt: 'Custom Rigid Box - Open Lid View with Gold Foil Monogram',
        },
        {
          url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=85',
          alt: 'Custom Rigid Box - Closed Box with Luxury Ribbon Accent',
        },
        {
          url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=85',
          alt: 'Custom Rigid Box - Matchbox Slide Out Drawer Style',
        },
        {
          url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=1000&q=85',
          alt: 'Custom Rigid Box - Hot Foil Stamped Logo Close-Up',
        },
      ];
    }

    return [
      {
        url: product.category?.image || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1000&q=85',
        alt: product.name,
      },
    ];
  }, [product.images, product.name, product.slug, product.category]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDesignerModalOpen, setIsDesignerModalOpen] = useState(false);

  // -------------------------------------------------------------
  // 1. OPTION GROUPS RESOLUTION (Strictly Connected Groups Only)
  // -------------------------------------------------------------
  const effectiveOptionGroups = useMemo(() => {
    const raw = product.optionGroups && product.optionGroups.length > 0 ? product.optionGroups : [];

    // Filter out internal dimension fields if handled by dimensional calculator
    const filtered = raw.filter(
      (g) => !['box_length_mm', 'box_width_mm', 'box_height_mm', 'length_mm', 'width_mm', 'height_mm'].includes(g.code)
    );

    // If product has option groups configured in DB, sort and return ONLY those!
    if (filtered.length > 0) {
      return [...filtered].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }

    // ONLY for custom-rigid-box showcase product if DB groups are empty
    if (product.slug === 'custom-rigid-box') {
      return [
        {
          id: 'box_style',
          name: 'Box Style',
          code: 'box_style',
          inputType: 'SELECT',
          description: 'Select structural architecture',
          isRequired: true,
          isCustomerVisible: true,
          sortOrder: 1,
          isActive: true,
          options: FALLBACK_GROUP_OPTIONS.box_style.map((o) => ({
            id: o.id,
            groupId: 'box_style',
            label: o.title,
            value: o.id,
            priceModifierType: 'FIXED',
            priceModifier: 0,
            sortOrder: 1,
            isDefault: o.id === 'lid_base',
            isActive: true,
          })),
        },
        {
          id: 'board_thickness',
          name: 'Board Thickness',
          code: 'board_thickness',
          inputType: 'SELECT',
          description: 'Rigid greyboard core density',
          isRequired: true,
          isCustomerVisible: true,
          sortOrder: 2,
          isActive: true,
          options: FALLBACK_GROUP_OPTIONS.board_thickness.map((o) => ({
            id: o.id,
            groupId: 'board_thickness',
            label: o.title,
            value: o.id,
            priceModifierType: 'FIXED',
            priceModifier: 0,
            sortOrder: 1,
            isDefault: o.id === '1000gsm',
            isActive: true,
          })),
        },
        {
          id: 'outer_wrap',
          name: 'Outer Wrap Material',
          code: 'outer_wrap',
          inputType: 'SELECT',
          description: 'Exterior specialty paper wrap',
          isRequired: true,
          isCustomerVisible: true,
          sortOrder: 3,
          isActive: true,
          options: FALLBACK_GROUP_OPTIONS.outer_wrap.map((o) => ({
            id: o.id,
            groupId: 'outer_wrap',
            label: o.title,
            value: o.id,
            priceModifierType: 'FIXED',
            priceModifier: 0,
            sortOrder: 1,
            isDefault: o.id === 'coated_art',
            isActive: true,
          })),
        },
        {
          id: 'finishing',
          name: 'Finishing Options',
          code: 'finishing',
          inputType: 'SELECT',
          description: 'Foil stamping, lamination & embossing',
          isRequired: false,
          isCustomerVisible: true,
          sortOrder: 4,
          isActive: true,
          options: FALLBACK_GROUP_OPTIONS.finishing.map((o) => ({
            id: o.id,
            groupId: 'finishing',
            label: o.title,
            value: o.id,
            priceModifierType: 'FIXED',
            priceModifier: 0,
            sortOrder: 1,
            isDefault: o.id === 'none',
            isActive: true,
          })),
        },
      ] as ProductOptionGroup[];
    }

    // STRICT: No unwanted options! Only return connected option groups.
    return [];
  }, [product.optionGroups, product.slug]);

  // Selections state (single values or multi-select arrays)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const group of effectiveOptionGroups) {
      if (group.inputType === 'MULTI_SELECT' || group.selectionBehavior === 'MULTIPLE') {
        const defaults = (group.options || []).filter((o) => o.isDefault).map((o) => o.value);
        initial[group.code] = defaults;
      } else if (group.options && group.options.length > 0) {
        const def = group.options.find((o) => o.isDefault) || group.options[0];
        initial[group.code] = def.value;
      } else {
        const fallbacks = FALLBACK_GROUP_OPTIONS[group.code];
        if (fallbacks && fallbacks.length > 0) {
          initial[group.code] = fallbacks[0].id;
        }
      }
    }
    return initial;
  });

  // -------------------------------------------------------------
  // 2. PERSONALIZATION TEMPLATE ENGINE (/admin/personalization-templates)
  // -------------------------------------------------------------
  const [personalizationTemplate, setPersonalizationTemplate] = useState<PersonalizationTemplate | null>(
    product.personalizationTemplate || null
  );
  const [isLoadingPersonalization, setIsLoadingPersonalization] = useState(false);

  useEffect(() => {
    if (product.personalizationTemplate) {
      setPersonalizationTemplate(product.personalizationTemplate);
      return;
    }
    if (product.personalizationTemplateId && !personalizationTemplate) {
      setIsLoadingPersonalization(true);
      api
        .getPublicPersonalizationTemplate(product.personalizationTemplateId)
        .then((tmpl) => setPersonalizationTemplate(tmpl))
        .catch(() => {})
        .finally(() => setIsLoadingPersonalization(false));
    }
  }, [product.personalizationTemplate, product.personalizationTemplateId, personalizationTemplate]);

  // Personalization Shared & Itemized Values
  const [personalizationSharedValues, setPersonalizationSharedValues] = useState<Record<string, any>>({});
  const [personalizationItemValues, setPersonalizationItemValues] = useState<Array<Record<string, any>>>([]);
  const [isBulkPasteModalOpen, setIsBulkPasteModalOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [showAllPersonalizationItems, setShowAllPersonalizationItems] = useState(false);
  const [personalizationErrors, setPersonalizationErrors] = useState<Record<string, string>>({});

  // Dimensional State
  const [length, setLength] = useState(220);
  const [width, setWidth] = useState(160);
  const [height, setHeight] = useState(60);
  const [selectedPreset, setSelectedPreset] = useState('a5');

  const volume = useMemo(() => {
    return Math.max(0, length * width * height);
  }, [length, width, height]);

  // Quantity & Pricing Tiers
  const minQty = Math.max(1, Number(product.minQuantity) || 1);
  const maxQty = Math.max(minQty, Number(product.maxQuantity) || 100000);
  const baseRate = Math.max(1, Number(product.basePrice) || 500);

  // Option A: Single Fixed Quantity -> Quantity Range Brackets (1–10, 11–20, 21–50, 51–100 pcs)
  // Option B: Bulk Quantity Range -> Discrete Fixed Quantity Tiers (100, 1,000, 25,000 pcs)
  const isRangeBracketMode = product.pricingModel === 'SINGLE_FIXED_QUANTITY';
  const isIncrementalMode =
    isRangeBracketMode ||
    (product.quantityStep !== undefined && product.quantityStep !== null
      ? Number(product.quantityStep) > 0
      : false);
  const quantityStep = isIncrementalMode ? Math.max(1, Number(product.quantityStep) || (isRangeBracketMode ? 1 : 100)) : 0;

  const quantityTiers = useMemo(() => {
    // 1. Strict priority: Check base rate tiers configured in Stage 5 (Product Base Price by Quantity)
    const baseMatrices = (product.pricingMatrices || []).filter((m) => {
      const c = (m.attributeCombination as any) || {};
      const isBase =
        c.isBasePrice === true ||
        c.type === 'BASE' ||
        Object.keys(c).filter(
          (k) =>
            !['label', 'rangeLabel', 'discountPercent', 'isBasePrice', 'type', 'isExcluded', 'status', 'totalPrice', 'price'].includes(k)
        ).length === 0;
      if (!isBase || c.isExcluded || c.status === 'EXCLUDED') return false;

      const q = Number(m.minQty);
      const maxQ = m.maxQty && Number(m.maxQty) >= q ? Number(m.maxQty) : q;
      const isRange = maxQ > q;

      // Single Fixed Quantity mode: only include range brackets (1-10, 11-20, etc.)
      // Bulk Quantity Range mode: only include discrete single quantities (100, 1000, etc.)
      if (isRangeBracketMode ? !isRange : isRange) return false;

      return Number(m.unitPrice) > 0 || Number(c.totalPrice) > 0 || Number(c.price) > 0;
    });

    if (baseMatrices.length > 0) {
      const sorted = [...baseMatrices].sort((a, b) => Number(a.minQty) - Number(b.minQty));
      const tierList: Array<{
        quantity: number;
        minQty: number;
        maxQty: number;
        isRange: boolean;
        label: string;
        unitPrice: number;
        totalPrice: number;
        maxTotalPrice: number;
        isConfiguredFromMatrix: boolean;
      }> = [];

      for (const m of sorted) {
        const q = Number(m.minQty);
        const maxQ = m.maxQty && Number(m.maxQty) >= q ? Number(m.maxQty) : q;
        const isRange = maxQ > q;
        const c = (m.attributeCombination as any) || {};
        const exactTotal = c.totalPrice ?? c.price;
        const uPrice = Number(m.unitPrice) || (exactTotal && q > 0 ? Number(exactTotal) / q : 0);
        const tPrice =
          exactTotal !== undefined && exactTotal !== null && Number(exactTotal) > 0
            ? Number(exactTotal)
            : Math.round(uPrice * q);
        const maxTPrice = isRange ? Math.round(uPrice * maxQ) : tPrice;
        const label = c.label || m.label || (isRange ? `${q}–${maxQ} units` : `${q} units`);

        if (q > 0 && !tierList.some((t) => t.minQty === q && t.maxQty === maxQ)) {
          tierList.push({
            quantity: q,
            minQty: q,
            maxQty: maxQ,
            isRange,
            label,
            unitPrice: uPrice,
            totalPrice: tPrice,
            maxTotalPrice: maxTPrice,
            isConfiguredFromMatrix: true,
          });
        }
      }

      return tierList;
    }

    // 2. Secondary priority: Check any active pricing matrices from Stage 5 (Combination Matrix)
    if (product.pricingMatrices && product.pricingMatrices.length > 0) {
      const activeMatrices = product.pricingMatrices.filter((m) => {
        const c = (m.attributeCombination as any) || {};
        if (c.isExcluded || c.status === 'EXCLUDED' || Number(m.unitPrice) <= 0) return false;
        const q = Number(m.minQty);
        const maxQ = m.maxQty && Number(m.maxQty) >= q ? Number(m.maxQty) : q;
        const isRange = maxQ > q;
        if (isRangeBracketMode ? !isRange : isRange) return false;
        return true;
      });

      if (activeMatrices.length > 0) {
        const qtyMap = new Map<number, { minQty: number; maxQty: number; isRange: boolean; price: number; label?: string }>();
        for (const pm of activeMatrices) {
          const q = Number(pm.minQty);
          const maxQ = pm.maxQty && Number(pm.maxQty) >= q ? Number(pm.maxQty) : q;
          const isRange = maxQ > q;
          const price = Number(pm.unitPrice);
          if (q > 0 && (!qtyMap.has(q) || price < (qtyMap.get(q)?.price ?? Infinity))) {
            const c = (pm.attributeCombination as any) || {};
            qtyMap.set(q, { minQty: q, maxQty: maxQ, isRange, price, label: c.label || pm.label });
          }
        }

        const sortedQuantities = Array.from(qtyMap.keys()).sort((a, b) => a - b);
        return sortedQuantities.map((q) => {
          const item = qtyMap.get(q)!;
          const unitPrice = item.price || 1;
          return {
            quantity: q,
            minQty: item.minQty,
            maxQty: item.maxQty,
            isRange: item.isRange,
            label: item.label || (item.isRange ? `${item.minQty}–${item.maxQty} units` : `${q} units`),
            unitPrice,
            totalPrice: Math.round(unitPrice * q),
            maxTotalPrice: Math.round(unitPrice * item.maxQty),
            isConfiguredFromMatrix: true,
          };
        });
      }
    }

    // 3. Tertiary priority: Check configured tiers in additionalPricings from Stage 5
    if (product.additionalPricings && product.additionalPricings.length > 0) {
      const activeAddonTiers = product.additionalPricings.filter((t) => {
        const q = Number(t.minQty);
        const maxQ = t.maxQty && Number(t.maxQty) >= q ? Number(t.maxQty) : q;
        const isRange = maxQ > q;
        if (isRangeBracketMode ? !isRange : isRange) return false;
        return q > 0;
      });

      if (activeAddonTiers.length > 0) {
        const seen = new Set<string>();
        const list: Array<any> = [];
        const sorted = [...activeAddonTiers].sort((a, b) => Number(a.minQty) - Number(b.minQty));
        for (const t of sorted) {
          const q = Number(t.minQty);
          const maxQ = t.maxQty && Number(t.maxQty) >= q ? Number(t.maxQty) : q;
          const key = `${q}-${maxQ}`;
          if (!seen.has(key)) {
            seen.add(key);
            const isRange = maxQ > q;
            const refP = Number(product.basePrice) > 0 ? Number(product.basePrice) / (minQty || 1) : 1;
            list.push({
              quantity: q,
              minQty: q,
              maxQty: maxQ,
              isRange,
              label: isRange ? `${q}–${maxQ} units` : `${q} units`,
              unitPrice: refP,
              totalPrice: Math.round(refP * q),
              maxTotalPrice: Math.round(refP * maxQ),
              isConfiguredFromMatrix: true,
            });
          }
        }
        return list;
      }
    }

    // 4. Fallback ONLY when product has ZERO configured tiers anywhere in Stage 5:
    // Only display minQty — do NOT generate arbitrary unnecessary quantities (like minQty*2, minQty*3)!
    const officialBaseRate = Number(product.basePrice) || 500;
    const refUnitPrice = minQty > 0 ? officialBaseRate / minQty : officialBaseRate;
    const unitP = Math.round(refUnitPrice * 100) / 100;
    return [{
      quantity: minQty,
      minQty,
      maxQty: minQty,
      isRange: false,
      label: `${minQty} units`,
      unitPrice: unitP,
      totalPrice: Math.round(unitP * minQty),
      maxTotalPrice: Math.round(unitP * minQty),
      isConfiguredFromMatrix: false,
    }];
  }, [product.pricingMatrices, product.additionalPricings, product.pricingModel, product.basePrice, minQty]);

  const [selectedQuantity, setSelectedQuantity] = useState<number>(() => {
    return quantityTiers[0]?.quantity || minQty;
  });

  // -------------------------------------------------------------
  // VARIANT-WISE QUANTITY STATE & VALIDATION (selectionBehavior === 'VARIANT_WISE')
  // -------------------------------------------------------------
  const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({});

  const variantWiseGroups = useMemo(() => {
    return effectiveOptionGroups.filter((g) => g.selectionBehavior === 'VARIANT_WISE');
  }, [effectiveOptionGroups]);

  const hasVariantWiseGroups = variantWiseGroups.length > 0;

  const totalVariantAllocated = useMemo(() => {
    return Object.values(variantQuantities).reduce((acc, q) => acc + (Number(q) || 0), 0);
  }, [variantQuantities]);

  const isVariantAllocationValid = useMemo(() => {
    if (!hasVariantWiseGroups) return true;
    return variantWiseGroups.every((g) => {
      const groupSum = (g.options || []).reduce(
        (sum, opt) => sum + (Number(variantQuantities[opt.value]) || 0),
        0
      );
      return groupSum === selectedQuantity;
    });
  }, [hasVariantWiseGroups, variantWiseGroups, variantQuantities, selectedQuantity]);

  const variantLinesPayload = useMemo(() => {
    if (!hasVariantWiseGroups) return undefined;
    const lines: Array<{
      code: string;
      optionCode: string;
      qty: number;
      quantity: number;
      combination: Record<string, string>;
    }> = [];

    for (const group of variantWiseGroups) {
      for (const opt of group.options || []) {
        const q = Number(variantQuantities[opt.value]) || 0;
        if (q > 0) {
          lines.push({
            code: opt.value,
            optionCode: opt.value,
            qty: q,
            quantity: q,
            combination: { [group.code]: opt.value },
          });
        }
      }
    }
    return lines.length > 0 ? lines : undefined;
  }, [hasVariantWiseGroups, variantWiseGroups, variantQuantities]);

  // Dynamic Key Points / Highlights with fallback
  const displayedKeyPoints = useMemo(() => {
    if (Array.isArray(product.keyPoints) && product.keyPoints.length > 0) {
      const valid = product.keyPoints.filter((kp) => kp && kp.trim() !== '');
      if (valid.length > 0) return valid;
    }
    return [
      'Calibrated commercial-grade substrates & vibrant inks',
      'Multiple sizes, styles & customization formats',
      'Custom finishes: matte, gloss, UV, foil stamping',
      'Precision die-cut trims & reinforced hardware',
      'Low MOQ & progressive bulk discounts',
      'Free pre-flight artwork proofing by experts',
    ];
  }, [product.keyPoints]);

  // Identify active matched tier (handles range brackets like 51–100)
  const activeMatchedTier = useMemo(() => {
    return (
      quantityTiers.find((t) =>
        t.isRange
          ? selectedQuantity >= t.minQty && selectedQuantity <= t.maxQty
          : t.quantity === selectedQuantity
      ) ||
      quantityTiers.find((t) => t.quantity === selectedQuantity) ||
      quantityTiers[0]
    );
  }, [quantityTiers, selectedQuantity]);

  // Resolved weight for matched bulk range bracket
  const configuredBracketWeightGrams = useMemo(() => {
    if (!isRangeBracketMode) return null;
    const bulkWeights = Array.isArray((product as any).bulkTierWeights) ? (product as any).bulkTierWeights : [];
    if (bulkWeights.length === 0) return null;
    const match = bulkWeights.find((b: any) => {
      const minQ = Number(b.minQty || 0);
      const maxQ = b.maxQty ? Number(b.maxQty) : Infinity;
      return selectedQuantity >= minQ && selectedQuantity <= maxQ;
    });
    return match && Number(match.unitWeightGrams) > 0 ? Number(match.unitWeightGrams) : null;
  }, [isRangeBracketMode, product, selectedQuantity]);

  // Delivery & PIN Code State
  const [deliveryPincode, setDeliveryPincode] = useState<string>('');
  const [shippingQuote, setShippingQuote] = useState<any | null>(null);
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);
  const [pincodeMessage, setPincodeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Authoritative Weight Resolution for Storefront (Model A vs Model B)
  const storefrontWeightInfo = useMemo(() => {
    let productWeight = 0;
    const tareWeight = Number((product as any).packagingProfile?.weightGrams ?? 200);

    if (product.pricingModel === 'BULK_RANGE') {
      // MODEL B: BULK_QUANTITY_RANGE
      // Retrieve total weight associated with that discrete tier directly (never multiplied by qty)
      const bulkWeights = Array.isArray((product as any).bulkTierWeights) ? (product as any).bulkTierWeights : [];
      const exact = bulkWeights.find((b: any) => Number(b.minQty) === selectedQuantity);
      if (exact && (Number(exact.totalProductWeightGrams) > 0 || Number(exact.unitWeightGrams) > 0)) {
        productWeight = Number(exact.totalProductWeightGrams ?? exact.unitWeightGrams);
      } else {
        const sorted = [...bulkWeights].sort((a: any, b: any) => Number(a.minQty || 0) - Number(b.minQty || 0));
        const bracket = sorted.find((b: any) => {
          const minQ = Number(b.minQty || 0);
          const maxQ = b.maxQty ? Number(b.maxQty) : Infinity;
          return selectedQuantity >= minQ && selectedQuantity <= maxQ;
        }) || (sorted.length > 0 ? sorted[sorted.length - 1] : null);

        if (bracket && (Number(bracket.totalProductWeightGrams) > 0 || Number(bracket.unitWeightGrams) > 0)) {
          const baseW = Number(bracket.totalProductWeightGrams ?? bracket.unitWeightGrams);
          const baseQ = Math.max(1, Number(bracket.minQty || 1));
          productWeight = Math.round(selectedQuantity * (baseW / baseQ) * 100) / 100;
        } else {
          productWeight = Math.round(selectedQuantity * (Number(product.unitWeightGrams) || 2.0) * 100) / 100;
        }
      }
    } else {
      // MODEL A: SINGLE_FIXED_QUANTITY
      // Total Product Weight = Actual Order Quantity × Weight Per Piece
      const perPiece = Number(product.unitWeightGrams) > 0 ? Number(product.unitWeightGrams) : 2.0;
      productWeight = Math.round(selectedQuantity * perPiece * 100) / 100;
    }

    const netProductWeight = shippingQuote?.productWeightGrams ?? productWeight;
    const actualPackagingWeight = shippingQuote?.packaging?.weightGrams ?? tareWeight;
    const totalShipmentWeight = shippingQuote?.actualWeightGrams ?? Math.round((netProductWeight + actualPackagingWeight) * 100) / 100;
    const billableWeight = shippingQuote?.billableWeightGrams ?? totalShipmentWeight;

    return {
      productWeightGrams: netProductWeight,
      packagingWeightGrams: actualPackagingWeight,
      actualWeightGrams: totalShipmentWeight,
      billableWeightGrams: billableWeight,
    };
  }, [product, selectedQuantity, shippingQuote]);

  // Strict enforcement: If incremental mode is OFF, ensure selectedQuantity snaps to a valid fixed tier or range
  useEffect(() => {
    if (!isIncrementalMode && quantityTiers.length > 0) {
      const isMatchingTier = quantityTiers.some((t) =>
        t.isRange ? selectedQuantity >= t.minQty && selectedQuantity <= t.maxQty : t.quantity === selectedQuantity
      );
      if (!isMatchingTier) {
        setSelectedQuantity(quantityTiers[0].quantity);
      }
    }
  }, [isIncrementalMode, quantityTiers, selectedQuantity]);

  const handleDecrementQty = () => {
    if (!isIncrementalMode) return;
    setSelectedQuantity((prev) => Math.max(minQty, prev - quantityStep));
  };

  const handleIncrementQty = () => {
    if (!isIncrementalMode) return;
    setSelectedQuantity((prev) => Math.min(maxQty, prev + quantityStep));
  };

  const handleDirectQuantityChange = (val: number) => {
    if (!isIncrementalMode) return;
    const clamped = Math.max(minQty, Math.min(maxQty, val));
    setSelectedQuantity(clamped);
  };

  // Ensure personalizationItemValues matches selectedQuantity
  useEffect(() => {
    setPersonalizationItemValues((prev) => {
      const next = [...prev];
      while (next.length < selectedQuantity) {
        next.push({});
      }
      return next.slice(0, selectedQuantity);
    });
  }, [selectedQuantity]);

  // Artwork Upload State (Synced with Cart Drawer)
  const [uploadedArtwork, setUploadedArtwork] = useState<{
    fileUrl: string;
    originalFileName: string;
    fileSize: number;
    mimeType?: string;
    storageKey?: string;
  } | null>(null);

  // Authoritative Pricing State (Strict Stage 5 Initial Values)
  const [serverUnitPrice, setServerUnitPrice] = useState<number>(() => {
    const s = quantityTiers[0]?.totalPrice || baseRate;
    return quantityTiers[0]?.unitPrice || (minQty > 0 ? s / minQty : baseRate);
  });
  const [serverSubtotal, setServerSubtotal] = useState<number>(() => {
    return quantityTiers[0]?.totalPrice || baseRate;
  });
  const [serverTax, setServerTax] = useState<number>(() => {
    const s = quantityTiers[0]?.totalPrice || baseRate;
    return Math.round(s * 0.18 * 100) / 100;
  });
  const [serverGrandTotal, setServerGrandTotal] = useState<number>(() => {
    const s = quantityTiers[0]?.totalPrice || baseRate;
    const t = Math.round(s * 0.18 * 100) / 100;
    return Math.round((s + t) * 100) / 100;
  });
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);

  // Cart Drawer & Auth Modals
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [activeCartItem, setActiveCartItem] = useState<CartDrawerItem | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Resolve Artwork Matrix configuration dynamically from Product Setup Studio
  const resolvedArtwork = useMemo(() => {
    return resolveArtworkConditions(
      product.configurationRules || [],
      selectedOptions,
      {
        artworkRequirement: product.artworkRequirement || undefined,
        artworkFileFormats: product.artworkFileFormats,
        maxArtworkFileSizeMb: product.maxArtworkFileSizeMb,
        minimumArtworkMegapixels: product.minimumArtworkMegapixels ?? undefined,
        designServiceRequirement: product.designServiceRequirement,
        designServiceFee: (product as any).designServiceFee ?? (product as any).designServicePrice,
      },
      product.optionGroups || []
    );
  }, [product, selectedOptions]);

// Helper to detect if user selections, configuration rules, or product settings mandate design service
function detectIsDesignServiceSelected(
  selectedOptions: Record<string, any>,
  optionGroups: ProductOptionGroup[],
  resolvedArtwork: { designFee?: number; designServiceRequirement?: string; artworkStatus?: string },
  productDesignReq?: string
): boolean {
  // Check user selections
  for (const [key, val] of Object.entries(selectedOptions || {})) {
    if (val === undefined || val === null) continue;
    const normKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normKey.includes('design') || normKey.includes('artworkservice') || normKey.includes('hireservice')) {
      const strVal = String(val).toLowerCase().trim();
      if (strVal === 'no' || strVal === 'false' || strVal === 'none' || strVal.includes('upload') || strVal.includes('own_file')) {
        return false;
      }
      if (strVal === 'yes' || strVal === 'true' || strVal === 'required' || strVal.includes('hire') || strVal.includes('assist') || strVal.includes('need') || strVal.includes('yes_please')) {
        return true;
      }
    }
  }

  // Check group names/codes
  for (const grp of optionGroups || []) {
    const normName = String(grp.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normCode = String(grp.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      normName.includes('design') ||
      normCode.includes('design') ||
      normName.includes('artwork') ||
      normCode.includes('artwork') ||
      normName.includes('designer')
    ) {
      const val = selectedOptions[grp.code] ?? selectedOptions[grp.id];
      if (val !== undefined && val !== null) {
        const opt = grp.options?.find((o) => o.value === val || (o as any).id === val);
        const rawVal = opt?.label || opt?.value || val;
        const strVal = String(rawVal).toLowerCase().trim();
        if (
          strVal === 'no' ||
          strVal === 'false' ||
          strVal === 'none' ||
          strVal.includes('upload') ||
          strVal.includes('own_file') ||
          strVal.includes('self') ||
          strVal.includes('provide_own') ||
          strVal.includes('skip')
        ) {
          return false;
        }
        if (
          strVal === 'yes' ||
          strVal === 'true' ||
          strVal === 'required' ||
          strVal.includes('hire') ||
          strVal.includes('assist') ||
          strVal.includes('need') ||
          strVal.includes('yes_please')
        ) {
          return true;
        }
      }
    }
  }

  // Check rule outcome or product requirement
  if (resolvedArtwork.designServiceRequirement === 'REQUIRED' || productDesignReq === 'REQUIRED') {
    return true;
  }
  if (resolvedArtwork.designFee !== undefined && Number(resolvedArtwork.designFee) > 0 && resolvedArtwork.artworkStatus === 'DISABLED') {
    return true;
  }

  return false;
}

  // Real-time authoritative computation of active design fee and production totals
  const isDesignServiceSelected = useMemo(() => {
    return detectIsDesignServiceSelected(
      selectedOptions,
      effectiveOptionGroups,
      resolvedArtwork,
      product.designServiceRequirement
    );
  }, [selectedOptions, effectiveOptionGroups, resolvedArtwork, product.designServiceRequirement]);

  const activeDesignFee = useMemo(() => {
    if (!isDesignServiceSelected) return 0;
    return (
      resolvedArtwork.designFee !== undefined && Number(resolvedArtwork.designFee) > 0
        ? Number(resolvedArtwork.designFee)
        : Number((product as any).designServiceFee ?? (product as any).designServicePrice) > 0
        ? Number((product as any).designServiceFee ?? (product as any).designServicePrice)
        : 150
    );
  }, [isDesignServiceSelected, resolvedArtwork.designFee, product]);

  const rawArtworkPrice = Number(product.artworkPrice) || 0;

  // Base print subtotal (print items only, excluding design and artwork fees)
  const basePrintSubtotal = serverSubtotal;

  // Effective production subtotal including design service fee and artwork fee
  const effectiveSubtotal = Math.round((basePrintSubtotal + activeDesignFee + rawArtworkPrice) * 100) / 100;
  const effectiveTax = Math.round(effectiveSubtotal * 0.18 * 100) / 100;
  const effectiveGrandTotal = Math.round((effectiveSubtotal + effectiveTax) * 100) / 100;

  // Server Quote Recalculation
  useEffect(() => {
    let isCancelled = false;

    // Immediately synchronize with the exact matched Stage 5 tier and client-side option modifiers (zero stale lag!)
    const matched =
      quantityTiers.find((t) =>
        t.isRange
          ? selectedQuantity >= t.minQty && selectedQuantity <= t.maxQty
          : t.quantity === selectedQuantity
      ) || quantityTiers[0];

    // Calculate option price modifiers across all selected options (including Additional Pricing Tiers)
    let optionsUnitModifier = 0;
    let bulkAddonTotal = 0;
    for (const group of effectiveOptionGroups) {
      const selectedVal = selectedOptions[group.code];
      if (!selectedVal) continue;
      const valList = Array.isArray(selectedVal) ? selectedVal : [selectedVal];
      for (const v of valList) {
        const addonCharge = getOptionAdditionalTierCharge(
          product.additionalPricings,
          group.code,
          String(v),
          selectedQuantity
        );

        if (addonCharge && !addonCharge.isExcluded) {
          if (addonCharge.chargeBasis === 'PERCENTAGE') {
            const baseU = matched?.unitPrice || 0;
            optionsUnitModifier += (baseU * (addonCharge.unitPrice / 100));
          } else {
            // Model 3: Additional Cost = Configured Flat Add-on Amount for the Matched Quantity Tier (Flat per order)
            bulkAddonTotal += addonCharge.unitPrice;
          }
        } else {
          const opt = group.options?.find((o) => o.value === v);
          if (opt && opt.priceModifier) {
            const modNum = Number(opt.priceModifier) || 0;
            if (opt.priceModifierType === 'PERCENTAGE') {
              const baseU = matched?.unitPrice || 0;
              optionsUnitModifier += (baseU * (modNum / 100));
            } else {
              optionsUnitModifier += modNum;
            }
          }
        }
      }
    }

    const effectiveBaseUnit = Math.max(0, (matched?.unitPrice || 0) + optionsUnitModifier);
    const syncSubtotal =
      matched && !matched.isRange && selectedQuantity === matched.quantity && optionsUnitModifier === 0 && bulkAddonTotal === 0
        ? matched.totalPrice
        : Math.round(((effectiveBaseUnit * selectedQuantity) + bulkAddonTotal) * 100) / 100;
    const syncUnitPrice =
      selectedQuantity > 0 ? Math.round((syncSubtotal / selectedQuantity) * 10000) / 10000 : effectiveBaseUnit;
    const syncTax = Math.round(syncSubtotal * 0.18 * 100) / 100;
    const syncGrandTotal = Math.round((syncSubtotal + syncTax) * 100) / 100;

    setServerUnitPrice(syncUnitPrice);
    setServerSubtotal(syncSubtotal);
    setServerTax(syncTax);
    setServerGrandTotal(syncGrandTotal);

    async function fetchServerQuote() {
      setIsCalculatingPrice(true);
      try {
        const payloadFields: Record<string, any> = { ...selectedOptions };
        if (hasDimensionalInputs) {
          payloadFields.length_mm = length;
          payloadFields.width_mm = width;
          payloadFields.height_mm = height;
        }

        const isDesignWanted = detectIsDesignServiceSelected(
          selectedOptions,
          effectiveOptionGroups,
          resolvedArtwork,
          product.designServiceRequirement
        );

        const optPayload = Object.entries(selectedOptions)
          .filter(([_, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => ({
            optionCode: k,
            valueCode: Array.isArray(v) ? v.join(',') : String(v),
          }));

        const quote = await api.calculateQuote({
          productId: product.id,
          quantity: selectedQuantity,
          options: optPayload,
          fieldValues: payloadFields,
          variantLines: variantLinesPayload,
          hasDesignService: isDesignWanted,
          shippingPincode: deliveryPincode && deliveryPincode.trim().length === 6 ? deliveryPincode.trim() : undefined,
        });

        if (!isCancelled && quote) {
          const uPrice = quote.unitPrice ?? syncUnitPrice;
          // Production subtotal reflects authoritative unit price including option & additional pricing
          const sTotal = Math.round(uPrice * selectedQuantity * 100) / 100;
          const tax = Math.round(sTotal * 0.18 * 100) / 100;
          const shipAmt = quote.estimatedShipping !== undefined ? Number(quote.estimatedShipping) : (Number(quote.shipping?.finalShippingAmount) || 0);
          const gTotal = Math.round((sTotal + tax + shipAmt) * 100) / 100;

          setServerUnitPrice(uPrice);
          setServerSubtotal(sTotal);
          setServerTax(tax);
          setServerGrandTotal(gTotal);
          if (quote.shipping) {
            setShippingQuote(quote.shipping);
          }
        }
      } catch (err) {
        // Fallback already synchronized from Stage 5 tier and additional pricings above
      } finally {
        if (!isCancelled) {
          setIsCalculatingPrice(false);
        }
      }
    }

    fetchServerQuote();

    return () => {
      isCancelled = true;
    };
  }, [
    product.id,
    selectedQuantity,
    selectedOptions,
    deliveryPincode,
    length,
    width,
    height,
    hasDimensionalInputs,
    quantityTiers,
    effectiveOptionGroups,
    resolvedArtwork,
    product.designServiceRequirement,
    product.additionalPricings,
    variantLinesPayload,
  ]);

  // Dimension Handlers
  const handleSelectPreset = (preset: PresetDimension) => {
    setSelectedPreset(preset.id);
    if (preset.id !== 'custom') {
      setLength(preset.length);
      setWidth(preset.width);
      setHeight(preset.height);
    }
  };

  const handleCustomDimensionChange = (type: 'L' | 'W' | 'H', val: number) => {
    setSelectedPreset('custom');
    if (type === 'L') setLength(val);
    if (type === 'W') setWidth(val);
    if (type === 'H') setHeight(val);
  };

  // Bulk Paste Handler for Per-Item Personalization
  const handleApplyBulkPaste = () => {
    if (!bulkPasteText.trim() || !personalizationTemplate) return;
    const lines = bulkPasteText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const perItemFields = personalizationTemplate.fields.filter((f) => f.scope === 'PER_ITEM');
    if (perItemFields.length === 0) return;

    const updated = [...personalizationItemValues];
    lines.forEach((line, lineIdx) => {
      if (lineIdx < selectedQuantity) {
        if (!updated[lineIdx]) updated[lineIdx] = {};
        // If multiple per-item fields, split by comma or tab
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        perItemFields.forEach((f, fIdx) => {
          if (parts[fIdx] !== undefined) {
            updated[lineIdx][f.code] = parts[fIdx].trim();
          } else if (fIdx === 0) {
            updated[lineIdx][f.code] = line.trim();
          }
        });
      }
    });

    setPersonalizationItemValues(updated);
    setIsBulkPasteModalOpen(false);
    setBulkPasteText('');
  };

  // Validation Before Add to Cart
  const validatePersonalization = (): boolean => {
    if (!personalizationTemplate || !personalizationTemplate.isActive) return true;
    const errors: Record<string, string> = {};

    // Validate PER_ORDER shared fields
    const sharedFields = personalizationTemplate.fields.filter((f) => f.scope === 'PER_ORDER');
    for (const f of sharedFields) {
      if (f.isRequired && !personalizationSharedValues[f.code]) {
        errors[f.code] = `${f.name} is required.`;
      }
    }

    // Validate PER_ITEM fields
    const perItemFields = personalizationTemplate.fields.filter((f) => f.scope === 'PER_ITEM');
    for (const f of perItemFields) {
      if (f.isRequired) {
        for (let i = 0; i < selectedQuantity; i++) {
          const val = personalizationItemValues[i]?.[f.code];
          if (!val || String(val).trim() === '') {
            errors[`item_${i}_${f.code}`] = `${f.name} is required for item #${i + 1}.`;
            break; // Stop at first missing item error for this field
          }
        }
      }
    }

    setPersonalizationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Build the Authoritative Cart Item
  const buildCurrentCartItem = (): CartDrawerItem => {
    const matched =
      quantityTiers.find((t) =>
        t.isRange
          ? selectedQuantity >= t.minQty && selectedQuantity <= t.maxQty
          : t.quantity === selectedQuantity
      ) || quantityTiers[0];

    const finalSubtotal =
      serverSubtotal > 0
        ? serverSubtotal
        : matched
        ? (matched.isRange || selectedQuantity !== matched.quantity
            ? Math.round(matched.unitPrice * selectedQuantity)
            : matched.totalPrice)
        : baseRate;

    const finalUnitPrice =
      serverUnitPrice > 0
        ? serverUnitPrice
        : selectedQuantity > 0
        ? Math.round((finalSubtotal / selectedQuantity) * 10000) / 10000
        : matched?.unitPrice || 0;

    const finalTax =
      serverTax > 0 ? serverTax : Math.round(finalSubtotal * 0.18 * 100) / 100;

    const finalGrandTotal =
      serverGrandTotal > 0
        ? serverGrandTotal
        : Math.round((finalSubtotal + finalTax) * 100) / 100;

    const specificationsSnapshot: Record<string, any> = {
      quantity: selectedQuantity,
      ...selectedOptions,
    };

    if (hasDimensionalInputs) {
      specificationsSnapshot.length = length;
      specificationsSnapshot.width = width;
      specificationsSnapshot.height = height;
      specificationsSnapshot.dimensions = `${length} × ${width} × ${height} mm`;
      specificationsSnapshot.volumeMm3 = volume;
    }

    const selectedOptionsSummary: Array<{ fieldLabel: string; value: string }> = [
      {
        fieldLabel: 'Order Quantity',
        value: `${selectedQuantity.toLocaleString()} units`,
      },
    ];

    if (hasDimensionalInputs) {
      selectedOptionsSummary.push({
        fieldLabel: 'Dimensions',
        value: `${length} × ${width} × ${height} mm`,
      });
    }

    for (const group of effectiveOptionGroups) {
      if (group.selectionBehavior === 'VARIANT_WISE') {
        const allocatedForGroup = (group.options || [])
          .map((o) => {
            const q = Number(variantQuantities[o.value]) || 0;
            return q > 0 ? `${o.label} (${q})` : null;
          })
          .filter(Boolean);

        if (allocatedForGroup.length > 0) {
          selectedOptionsSummary.push({
            fieldLabel: group.name,
            value: allocatedForGroup.join(', '),
          });
        }
      } else {
        const selectedVal = selectedOptions[group.code];
        if (Array.isArray(selectedVal)) {
          selectedOptionsSummary.push({
            fieldLabel: group.name,
            value: selectedVal.join(', '),
          });
        } else {
          const optMatch = group.options?.find((o) => o.value === selectedVal);
          const fallbackMatch = FALLBACK_GROUP_OPTIONS[group.code]?.find((o) => o.id === selectedVal);
          const displayLabel = optMatch?.label || fallbackMatch?.title || selectedVal;

          if (displayLabel) {
            selectedOptionsSummary.push({
              fieldLabel: group.name,
              value: displayLabel,
            });
          }
        }
      }
    }

    // Attach Personalization Payload if template active
    let personalizationPayload: PersonalizationPayload | null = null;
    if (personalizationTemplate && personalizationTemplate.isActive) {
      personalizationPayload = {
        templateId: personalizationTemplate.id,
        templateCode: personalizationTemplate.code,
        sharedValues: personalizationSharedValues,
        perItemEntries: Array.from({ length: selectedQuantity }, (_, idx) => ({
          itemIndex: idx + 1,
          values: personalizationItemValues[idx] || {},
        })),
      };

      // Add summary line
      selectedOptionsSummary.push({
        fieldLabel: 'Personalization',
        value: `${personalizationTemplate.name} (${selectedQuantity} units personalized)`,
      });
    }

    const hasDesignService = detectIsDesignServiceSelected(
      selectedOptions,
      effectiveOptionGroups,
      resolvedArtwork,
      product.designServiceRequirement
    );

    const isDesignApplicable =
      hasDesignService ||
      (resolvedArtwork.designFee !== undefined && Number(resolvedArtwork.designFee) > 0) ||
      resolvedArtwork.designServiceRequirement === 'REQUIRED' ||
      product.designServiceRequirement === 'REQUIRED';

    const rawDesignFee = isDesignApplicable
      ? (resolvedArtwork.designFee !== undefined && Number(resolvedArtwork.designFee) > 0
          ? Number(resolvedArtwork.designFee)
          : Number((product as any).designServiceFee ?? (product as any).designServicePrice) > 0
          ? Number((product as any).designServiceFee ?? (product as any).designServicePrice)
          : 150)
      : 0;

    const rawArtworkPrice = Number(product.artworkPrice) || 0;
    const activeDesignFee = hasDesignService ? rawDesignFee : 0;

    const computedSubtotal = Math.round((finalSubtotal + activeDesignFee + rawArtworkPrice) * 100) / 100;
    const computedTax = Math.round(computedSubtotal * 0.18 * 100) / 100;
    const finalShippingFee = Number(shippingQuote?.finalShippingAmount) || 0;
    const computedGrandTotal = Math.round((computedSubtotal + computedTax + finalShippingFee) * 100) / 100;

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: selectedQuantity,
      unitPrice: finalUnitPrice,
      totalPrice: finalSubtotal,
      subtotal: computedSubtotal,
      taxAmount: computedTax,
      grandTotal: computedGrandTotal,
      shippingFee: finalShippingFee,
      shippingSnapshot: shippingQuote ? {
        ...shippingQuote,
        productWeightGrams: storefrontWeightInfo.productWeightGrams,
        packagingWeightGrams: storefrontWeightInfo.packagingWeightGrams,
        actualWeightGrams: storefrontWeightInfo.actualWeightGrams,
        billableWeightGrams: storefrontWeightInfo.billableWeightGrams,
      } : {
        productWeightGrams: storefrontWeightInfo.productWeightGrams,
        packagingWeightGrams: storefrontWeightInfo.packagingWeightGrams,
        actualWeightGrams: storefrontWeightInfo.actualWeightGrams,
        billableWeightGrams: storefrontWeightInfo.billableWeightGrams,
        finalShippingAmount: finalShippingFee,
      },
      hasDesignService,
      designServiceFee: activeDesignFee,
      artworkFee: rawArtworkPrice,
      specificationsSnapshot: {
        ...specificationsSnapshot,
        variantLines: variantLinesPayload,
      },
      variantLines: variantLinesPayload,
      selectedOptionsSummary,
      artworkConfig: {
        status: resolvedArtwork.artworkStatus,
        allowedFormats: resolvedArtwork.allowedFormats,
        maxFileSizeMb: resolvedArtwork.maxArtworkFileSizeMb,
        minimumMegapixels: resolvedArtwork.minimumArtworkMegapixels,
        slots: resolvedArtwork.slots,
        requireDesignBrief: resolvedArtwork.requireDesignBrief,
        showDesignBrief: resolvedArtwork.showDesignBrief,
        requireReferenceImage: resolvedArtwork.requireReferenceImage,
        matchedRuleName: resolvedArtwork.matchedRuleName,
        designServiceRequirement:
          hasDesignService
            ? 'REQUIRED'
            : (resolvedArtwork.designServiceRequirement && resolvedArtwork.designServiceRequirement !== 'DISABLED'
                ? resolvedArtwork.designServiceRequirement
                : product.designServiceRequirement === 'REQUIRED'
                ? 'REQUIRED'
                : 'DISABLED'),
        designServiceFee: isDesignApplicable ? rawDesignFee : 0,
        artworkPrice: rawArtworkPrice,
      },
      artworkFile: uploadedArtwork,
      personalization: personalizationPayload,
      paymentMode: 'FULL',
    };
  };

  // Add to Cart
  const handleAddToCart = () => {
    if (!isVariantAllocationValid) {
      return;
    }
    if (!validatePersonalization()) {
      return;
    }

    const item = buildCurrentCartItem();

    try {
      const raw = localStorage.getItem('pb2_cart');
      let cart = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cart)) cart = [];

      const existingIndex = cart.findIndex(
        (it: any) => it.sku === item.sku || it.productId === item.productId
      );
      if (existingIndex >= 0) {
        cart[existingIndex] = item;
      } else {
        cart.push(item);
      }
      localStorage.setItem('pb2_cart', JSON.stringify(cart));
      sessionStorage.setItem('pb2_active_cart', JSON.stringify(item));
      window.dispatchEvent(new Event('cart-updated'));
    } catch (e) {
      console.warn('Storage error on Add to Cart', e);
    }

    setActiveCartItem(item);
    setIsCartDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-white pb-28 sm:pb-24">
      {/* ======================================================== */}
      {/* BREADCRUMBS                                              */}
      {/* ======================================================== */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium tracking-tight">
          <Link href="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <span className="text-slate-400">&gt;</span>
          <Link href="/products" className="hover:text-black transition-colors">
            Products
          </Link>
          <span className="text-slate-400">&gt;</span>
          <Link
            href={`/products?category=${product.category?.slug || 'all'}`}
            className="hover:text-black transition-colors"
          >
            {product.category?.name || 'All Products'}
          </Link>
          <span className="text-slate-400">&gt;</span>
          <span className="text-slate-900 font-semibold truncate">{product.name}</span>
        </nav>
      </div>

      {/* ======================================================== */}
      {/* MAIN TWO-COLUMN LAYOUT                                   */}
      {/* ======================================================== */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ====================================================== */}
          {/* LEFT COLUMN: GALLERY & PRODUCT HIGHLIGHTS (~5 Cols)     */}
          {/* ====================================================== */}
          <div className="lg:col-span-5 space-y-8">
            {/* Main Product Showcase Box */}
            <div className="relative rounded-2xl overflow-hidden bg-[#EAE8E4] border border-slate-200/90 shadow-sm aspect-square flex items-center justify-center group">
              <div className="absolute top-4 left-4 z-10 bg-[#FFED00] text-black text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-md shadow-xs border border-amber-300">
                PREMIUM QUALITY
              </div>

              <img
                src={galleryImages[activeImageIdx]?.url || galleryImages[0]?.url}
                alt={galleryImages[activeImageIdx]?.alt || product.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
              />

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-all cursor-pointer"
                    aria-label="Previous image"
                  >
                    <RiArrowLeftSLine className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIdx((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-all cursor-pointer"
                    aria-label="Next image"
                  >
                    <RiArrowRightSLine className="w-5 h-5" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="absolute bottom-4 right-4 z-10 bg-white/95 hover:bg-white text-slate-900 text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {hasDimensionalInputs ? (
                  <>
                    <RiBox3Line className="w-4 h-4 text-amber-500" />
                    <span>View 3D</span>
                  </>
                ) : (
                  <>
                    <RiEyeLine className="w-4 h-4 text-amber-500" />
                    <span>Inspect Specs</span>
                  </>
                )}
              </button>
            </div>

            {/* Thumbnails Row */}
            {galleryImages.length > 1 && (
              <div className="grid grid-cols-5 gap-3">
                {galleryImages.slice(0, 5).map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer bg-slate-100 ${
                      activeImageIdx === idx
                        ? 'border-[#FFED00] shadow-sm scale-98'
                        : 'border-slate-200/80 hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Feature Highlights Block */}
            <div className="space-y-4 pt-2">
              <div>
                <h3 className="text-base font-bold text-slate-950 font-display">
                  {product.category?.name || 'Commercial Quality'}. Elevated.
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {product.description?.slice(0, 95) ||
                    'High-precision commercial print crafted for brands that value detail, quality and impact.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <RiBox3Line className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Premium Materials</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Certified commercial substrates & archival inks
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <RiPaletteLine className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Customisation</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Multiple sizes, custom finishes & add-ons
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <RiTimeLine className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Fast Turnaround</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {product.productionDays || 3} working days production SLA
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <RiCustomerService2Line className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Expert Support</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Design & pre-flight consultation
                  </p>
                </div>
              </div>
            </div>

            {/* Need Help Designing Banner */}
            <div className="relative rounded-2xl p-6 bg-slate-50 border border-slate-200/90 overflow-hidden flex items-center justify-between">
              <div className="space-y-2 z-10 max-w-[65%]">
                <h3 className="text-sm font-black text-slate-950 font-display">
                  Need Help Designing?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our print & packaging experts are here to help you find the perfect solution for your brand.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsDesignerModalOpen(true)}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg border border-amber-300 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Contact Designer</span>
                    <RiArrowRightLine className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                </div>
              </div>

              <div className="w-28 h-28 flex-shrink-0 relative opacity-95">
                <img
                  src={galleryImages[0]?.url}
                  alt="Packaging Support"
                  className="w-full h-full object-cover rounded-xl shadow-xs"
                />
              </div>
            </div>

            {/* Product Highlights Section */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider text-[11px]">
                Product Highlights
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 text-center">
                  <div className="rounded-xl overflow-hidden aspect-square border border-slate-200">
                    <img
                      src={galleryImages[1]?.url || galleryImages[0]?.url}
                      alt="Premium Branding"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Premium Branding
                  </span>
                </div>

                <div className="space-y-1.5 text-center">
                  <div className="rounded-xl overflow-hidden aspect-square border border-slate-200">
                    <img
                      src={galleryImages[2]?.url || galleryImages[0]?.url}
                      alt="Luxury Presentation"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Luxury Presentation
                  </span>
                </div>

                <div className="space-y-1.5 text-center">
                  <div className="rounded-xl overflow-hidden aspect-square border border-slate-200">
                    <img
                      src={galleryImages[3]?.url || galleryImages[0]?.url}
                      alt="High Precision"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 block">
                    High Precision
                  </span>
                </div>
              </div>
            </div>

            {/* Ideal For Section */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider text-[11px]">
                Ideal For
              </h3>
              <div className="grid grid-cols-5 gap-2 text-center">
                <div className="space-y-1 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                    <RiShoppingBag3Line className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium leading-tight">
                    Retail Products
                  </span>
                </div>

                <div className="space-y-1 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                    <RiGiftLine className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium leading-tight">
                    Brand Presentation
                  </span>
                </div>

                <div className="space-y-1 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                    <RiSparklingFill className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium leading-tight">
                    Expos & Events
                  </span>
                </div>

                <div className="space-y-1 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                    <RiAwardLine className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium leading-tight">
                    Corporate Identity
                  </span>
                </div>

                <div className="space-y-1 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                    <RiBox3Line className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium leading-tight">
                    Marketing Growth
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ====================================================== */}
          {/* RIGHT COLUMN: CONFIGURATION ENGINE (~7 Cols)           */}
          {/* ====================================================== */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header Title & Badges */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-[#FFED00] text-black text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-300">
                  {product.category?.name?.toUpperCase() || 'COMMERCIAL PRINT'}
                </span>
                <span className="text-xs font-mono font-medium text-slate-400">
                  SKU: {product.sku || 'PRD-PRINT-001'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-display">
                {product.name}
              </h1>

              {/* Rating & Stock */}
              <div className="flex items-center gap-3 pt-0.5 text-xs">
                <div className="flex items-center gap-1 text-amber-500 font-semibold">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <RiStarFill key={star} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-slate-800 ml-1 font-bold">4.8</span>
                  <span className="text-slate-400">(124 reviews)</span>
                </div>

                <span className="text-slate-300">•</span>

                <div className="flex items-center gap-1 text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>In Stock</span>
                </div>
              </div>

              {/* Starting Price from Stage 5 Pricing */}
              <div className="flex items-baseline gap-2 pt-1 pb-0.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Starting from
                </span>
                <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono">
                  {formatCurrency(Number(product.basePrice) || (quantityTiers[0]?.totalPrice ?? 0))}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  (₹{((Number(product.basePrice) || (quantityTiers[0]?.totalPrice ?? 0)) / minQty).toFixed(2)}/unit for {minQty} pcs)
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                {product.description ||
                  'High-precision commercial print manufactured on calibrated Heidelberg and HP Indigo presses.'}
              </p>
            </div>

            {/* Checklist: Dynamic Key Points in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 py-1">
              {displayedKeyPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <RiCheckLine className="w-4 h-4 text-amber-500 stroke-[2] flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{point}</span>
                </div>
              ))}
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-1">
                <RiTruckLine className="w-4 h-4 text-slate-700 mx-auto" />
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Production Time
                </span>
                <span className="text-xs font-bold text-slate-900 block">
                  {product.productionDays || 3} working days
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-1">
                <RiBox3Line className="w-4 h-4 text-slate-700 mx-auto" />
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">MOQ</span>
                <span className="text-xs font-bold text-slate-900 block">{minQty} units</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-1">
                <RiCustomerService2Line className="w-4 h-4 text-slate-700 mx-auto" />
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Free Design Support
                </span>
                <span className="text-xs font-bold text-slate-900 block">Our team will help you</span>
              </div>
            </div>

            {/* Dynamic Step Indicator Bar */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px] font-medium overflow-x-auto no-scrollbar gap-2">
              {hasDimensionalInputs && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-5 h-5 rounded-full bg-[#FFED00] text-black font-bold flex items-center justify-center text-[10px] shadow-2xs">
                    1
                  </span>
                  <span className="font-bold text-slate-900">Dimensions</span>
                </div>
              )}

              {effectiveOptionGroups.length > 0 && (
                <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-[#FFED00] text-black font-bold flex items-center justify-center text-[10px] shadow-2xs">
                    {hasDimensionalInputs ? 2 : 1}
                  </span>
                  <span className="font-bold text-slate-900">Specifications</span>
                  <span className="text-slate-400 hidden sm:inline">({effectiveOptionGroups.length} options)</span>
                </div>
              )}

              {personalizationTemplate && personalizationTemplate.isActive && (
                <div className="flex items-center gap-1.5 flex-shrink-0 text-purple-700 font-bold">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] shadow-2xs">
                    {(hasDimensionalInputs ? 1 : 0) + (effectiveOptionGroups.length > 0 ? 1 : 0) + 1}
                  </span>
                  <span>Personalization</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-500">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                  {(hasDimensionalInputs ? 1 : 0) + (effectiveOptionGroups.length > 0 ? 1 : 0) + (personalizationTemplate?.isActive ? 1 : 0) + 1}
                </span>
                <span>Quantity & Pricing</span>
              </div>
            </div>

            {/* ====================================================== */}
            {/* DIMENSIONS (MM) (When Product has Dimensional Inputs)  */}
            {/* ====================================================== */}
            {hasDimensionalInputs && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>1. Dimensions (mm)</span>
                    <RiInformationLine className="w-3.5 h-3.5 text-slate-400" />
                  </label>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-900">
                      Volume: {volume.toLocaleString()} mm³
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      ({length} × {width} × {height})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Length (L)</span>
                    <input
                      type="number"
                      min="50"
                      max="600"
                      value={length}
                      onChange={(e) => handleCustomDimensionChange('L', parseInt(e.target.value) || 0)}
                      className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Width (W)</span>
                    <input
                      type="number"
                      min="50"
                      max="600"
                      value={width}
                      onChange={(e) => handleCustomDimensionChange('W', parseInt(e.target.value) || 0)}
                      className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Height (H)</span>
                    <input
                      type="number"
                      min="20"
                      max="300"
                      value={height}
                      onChange={(e) => handleCustomDimensionChange('H', parseInt(e.target.value) || 0)}
                      className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {DEFAULT_PRESET_DIMENSIONS.map((preset) => {
                    const isSelected = selectedPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`px-3 py-1 text-xs rounded-lg transition-colors cursor-pointer font-medium ${
                          isSelected
                            ? 'bg-[#FFED00] text-black font-bold border border-amber-300 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ====================================================== */}
            {/* DYNAMIC OPTION GROUPS (From /admin/option-groups)       */}
            {/* ====================================================== */}
            {effectiveOptionGroups.map((group, groupIdx) => {
              const isMulti = group.inputType === 'MULTI_SELECT' || group.selectionBehavior === 'MULTIPLE';
              const isInputText = ['TEXT', 'TEXTAREA', 'NUMBER', 'DATE'].includes((group.inputType || '').toUpperCase());

              const options =
                group.options && group.options.length > 0
                  ? group.options.map((o) => {
                      let modifierText = '';
                      const addonCharge = getOptionAdditionalTierCharge(
                        product.additionalPricings,
                        group.code,
                        o.value,
                        selectedQuantity
                      );

                      if (addonCharge && !addonCharge.isExcluded && addonCharge.unitPrice > 0) {
                        if (addonCharge.chargeBasis === 'PERCENTAGE') {
                          modifierText = `+${addonCharge.unitPrice}%`;
                        } else {
                          modifierText = `+₹${addonCharge.unitPrice % 1 === 0 ? addonCharge.unitPrice : addonCharge.unitPrice.toFixed(2)}`;
                        }
                      } else {
                        const numMod = Number(o.priceModifier);
                        if (numMod > 0) {
                          modifierText = o.priceModifierType === 'PERCENTAGE' ? `+${numMod}%` : `+₹${numMod.toFixed(0)}`;
                        }
                      }

                      return {
                        id: o.value,
                        title: o.label,
                        subtitle: modifierText || undefined,
                        isExcluded: addonCharge?.isExcluded,
                      };
                    })
                  : FALLBACK_GROUP_OPTIONS[group.code] || [];

              const currentVal = selectedOptions[group.code];

              const groupStepNum = (hasDimensionalInputs ? 1 : 0) + groupIdx + 1;

              // Handle Direct Text / Number / Date Input Groups
              if (isInputText) {
                return (
                  <div key={group.id || group.code} className="space-y-2">
                    <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>{groupStepNum}. {group.name}</span>
                        {group.isRequired && <span className="text-rose-500 font-bold">*</span>}
                      </span>
                      {group.description && <span className="text-[10px] text-slate-400 font-normal">{group.description}</span>}
                    </label>

                    {group.inputType === 'TEXTAREA' ? (
                      <textarea
                        rows={2}
                        value={currentVal || ''}
                        onChange={(e) => setSelectedOptions((prev) => ({ ...prev, [group.code]: e.target.value }))}
                        placeholder={group.description || `Enter ${group.name}...`}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      />
                    ) : (
                      <input
                        type={group.inputType === 'NUMBER' ? 'number' : group.inputType === 'DATE' ? 'date' : 'text'}
                        value={currentVal || ''}
                        onChange={(e) => setSelectedOptions((prev) => ({ ...prev, [group.code]: e.target.value }))}
                        placeholder={group.description || `Enter ${group.name}...`}
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      />
                    )}
                  </div>
                );
              }

              // ======================================================
              // VARIANT-WISE QUANTITY GRID (Wrapped Box Model with Inline Boxes)
              // ======================================================
              if (group.selectionBehavior === 'VARIANT_WISE') {
                const groupSum = (group.options || []).reduce(
                  (sum, o) => sum + (Number(variantQuantities[o.value]) || 0),
                  0
                );
                const isValid = groupSum === selectedQuantity;

                return (
                  <div key={group.id || group.code} className="space-y-1.5">
                    {/* Wrap the variant options in a border container */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      {/* Header of the box */}
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-800 text-sm">
                            {groupStepNum}. {group.name}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 uppercase tracking-wider">
                            Variant-Wise
                          </span>
                        </div>
                        {/* Dynamic Badge */}
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            isValid
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {isValid ? `${groupSum} / ${selectedQuantity} Allocated` : 'Mismatch'}
                        </span>
                      </div>

                      {/* Inline Boxes for Variant Values */}
                      <div className="p-3 bg-white">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {(group.options && group.options.length > 0 ? group.options : []).map((opt) => {
                            const currentQty = Number(variantQuantities[opt.value]) || 0;

                            // Check price modifier
                            let modifierText = '';
                            const addonCharge = getOptionAdditionalTierCharge(
                              product.additionalPricings,
                              group.code,
                              opt.value,
                              selectedQuantity
                            );
                            if (addonCharge && !addonCharge.isExcluded && addonCharge.unitPrice > 0) {
                              modifierText =
                                addonCharge.chargeBasis === 'PERCENTAGE'
                                  ? `+${addonCharge.unitPrice}%`
                                  : `+₹${addonCharge.unitPrice % 1 === 0 ? addonCharge.unitPrice : addonCharge.unitPrice.toFixed(2)}`;
                            } else {
                              const numMod = Number(opt.priceModifier);
                              if (numMod > 0) {
                                modifierText =
                                  opt.priceModifierType === 'PERCENTAGE'
                                    ? `+${numMod}%`
                                    : `+₹${numMod.toFixed(0)}`;
                              }
                            }

                            const handleDecrement = () => {
                              setVariantQuantities((prev) => ({
                                ...prev,
                                [opt.value]: Math.max(0, currentQty - 1),
                              }));
                            };

                            const handleIncrement = () => {
                              setVariantQuantities((prev) => ({
                                ...prev,
                                [opt.value]: currentQty + 1,
                              }));
                            };

                            const handleDirectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setVariantQuantities((prev) => ({
                                ...prev,
                                [opt.value]: val,
                              }));
                            };

                            const isSelected = currentQty > 0;

                            return (
                              <div
                                key={opt.id || opt.value}
                                className={`p-3 rounded-xl border transition-all flex flex-col justify-between items-center text-center ${
                                  isSelected
                                    ? 'border-2 border-slate-900 bg-amber-50/20 shadow-xs'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <div className="mb-2 w-full">
                                  <span className="text-xs font-bold text-gray-800 block truncate">
                                    {opt.label || (opt as any).name}
                                  </span>
                                  {modifierText && (
                                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                      {modifierText}
                                    </span>
                                  )}
                                </div>

                                {/* Stepper Controls inside each inline box */}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={handleDecrement}
                                    disabled={currentQty <= 0}
                                    aria-label={`Decrease ${opt.label} quantity`}
                                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    value={currentQty}
                                    onChange={handleDirectChange}
                                    className="w-10 text-center font-bold text-xs border-none bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-gray-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleIncrement}
                                    aria-label={`Increase ${opt.label} quantity`}
                                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-700 font-bold cursor-pointer text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Summary footer showing allocated count only */}
                      <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-200 text-xs text-gray-600">
                        <span>
                          Total {group.name} Allocated: <strong className="text-gray-900 font-bold">{groupSum}</strong> of <strong className="text-gray-900 font-bold">{selectedQuantity}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Error Message Placement */}
                    {!isValid && (
                      <p className="text-red-500 text-sm mt-2 font-medium">
                        Please adjust quantities to match the total order quantity of {selectedQuantity}. (Variant quantities ({groupSum}) do not match total order quantity ({selectedQuantity}).)
                      </p>
                    )}
                  </div>
                );
              }

              // Standard Visual Card Selectors
              return (
                <div key={group.id || group.code} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>
                        {groupStepNum}. {group.name}
                      </span>
                      {isMulti && <span className="text-[10px] text-amber-600 font-medium">(Select Multiple)</span>}
                      <RiInformationLine className="w-3.5 h-3.5 text-slate-400" />
                    </label>
                  </div>

                  <div
                    className={`grid gap-2.5 ${
                      options.length <= 4
                        ? 'grid-cols-2 sm:grid-cols-4'
                        : options.length <= 5
                        ? 'grid-cols-2 sm:grid-cols-5'
                        : 'grid-cols-3 sm:grid-cols-6'
                    }`}
                  >
                    {options.map((opt, optIdx) => {
                      const isSelected = isMulti
                        ? Array.isArray(currentVal) && currentVal.includes(opt.id)
                        : (currentVal || options[0]?.id) === opt.id;

                      const handleCardClick = () => {
                        if (isMulti) {
                          const currentArr = Array.isArray(currentVal) ? [...currentVal] : [];
                          const nextArr = isSelected
                            ? currentArr.filter((item) => item !== opt.id)
                            : [...currentArr, opt.id];
                          setSelectedOptions((prev) => ({
                            ...prev,
                            [group.code]: nextArr,
                          }));
                        } else {
                          setSelectedOptions((prev) => ({
                            ...prev,
                            [group.code]: opt.id,
                          }));
                        }
                      };

                      return (
                        <button
                          key={`${group.code}-${opt.id || optIdx}`}
                          type="button"
                          disabled={opt.isExcluded}
                          onClick={handleCardClick}
                          className={`relative p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            opt.isExcluded
                              ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                              : isSelected
                              ? 'border-2 border-[#FFED00] bg-amber-50/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          {isSelected && !opt.isExcluded && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#FFED00] text-black flex items-center justify-center">
                              <RiCheckLine className="w-3 h-3 stroke-[2.5]" />
                            </div>
                          )}
                          <span className="text-xs font-bold text-slate-900 block">
                            {opt.title}
                          </span>
                          {opt.isExcluded ? (
                            <span className="text-[10px] text-rose-500 block mt-0.5 font-medium">
                              Unavailable
                            </span>
                          ) : opt.subtitle ? (
                            <span className="text-[11px] text-amber-700 font-bold block mt-0.5 font-mono">
                              {opt.subtitle}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* ====================================================== */}
            {/* PERSONALIZATION SECTION (/admin/personalization-templates) */}
            {/* ====================================================== */}
            {personalizationTemplate && personalizationTemplate.isActive && (
              <div className="p-5 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/20 border border-purple-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-purple-700 text-xs font-black uppercase tracking-wider">
                      <RiMagicLine className="w-4 h-4" />
                      <span>Custom Personalization</span>
                    </div>
                    <h3 className="text-sm font-black text-slate-950 font-display">
                      {personalizationTemplate.name}
                    </h3>
                  </div>

                  <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full border border-purple-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                    <span>
                      {personalizationTemplate.fields.some((f) => f.scope === 'PER_ITEM')
                        ? `${selectedQuantity} Items Configured`
                        : 'Order Level'}
                    </span>
                  </span>
                </div>

                {personalizationTemplate.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {personalizationTemplate.description}
                  </p>
                )}

                {/* 1. Shared Event Details (PER_ORDER) */}
                {personalizationTemplate.fields.filter((f) => f.scope === 'PER_ORDER').length > 0 && (
                  <div className="space-y-3 p-4 bg-white rounded-xl border border-purple-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 block">
                      Shared Event & Commemoration Details
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {personalizationTemplate.fields
                        .filter((f) => f.scope === 'PER_ORDER')
                        .map((field) => {
                          const err = personalizationErrors[field.code];
                          return (
                            <div key={field.code} className="space-y-1">
                              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <span>{field.name}</span>
                                  {field.isRequired && <span className="text-rose-500 font-bold">*</span>}
                                </span>
                              </label>

                              {field.inputType === 'SELECT' && field.options && field.options.length > 0 ? (
                                <select
                                  value={personalizationSharedValues[field.code] || ''}
                                  onChange={(e) => {
                                    setPersonalizationSharedValues((prev) => ({
                                      ...prev,
                                      [field.code]: e.target.value,
                                    }));
                                    if (personalizationErrors[field.code]) {
                                      setPersonalizationErrors((prev) => {
                                        const cp = { ...prev };
                                        delete cp[field.code];
                                        return cp;
                                      });
                                    }
                                  }}
                                  className={`w-full h-9 px-3 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white ${
                                    err ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                                  }`}
                                >
                                  <option value="">Select {field.name}...</option>
                                  {field.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              ) : field.inputType === 'TEXTAREA' ? (
                                <textarea
                                  rows={2}
                                  placeholder={field.placeholder || ''}
                                  value={personalizationSharedValues[field.code] || ''}
                                  onChange={(e) => {
                                    setPersonalizationSharedValues((prev) => ({
                                      ...prev,
                                      [field.code]: e.target.value,
                                    }));
                                    if (personalizationErrors[field.code]) {
                                      setPersonalizationErrors((prev) => {
                                        const cp = { ...prev };
                                        delete cp[field.code];
                                        return cp;
                                      });
                                    }
                                  }}
                                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white ${
                                    err ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                                  }`}
                                />
                              ) : (
                                <input
                                  type={field.inputType === 'DATE' ? 'date' : field.inputType === 'NUMBER' ? 'number' : 'text'}
                                  placeholder={field.placeholder || ''}
                                  value={personalizationSharedValues[field.code] || ''}
                                  onChange={(e) => {
                                    setPersonalizationSharedValues((prev) => ({
                                      ...prev,
                                      [field.code]: e.target.value,
                                    }));
                                    if (personalizationErrors[field.code]) {
                                      setPersonalizationErrors((prev) => {
                                        const cp = { ...prev };
                                        delete cp[field.code];
                                        return cp;
                                      });
                                    }
                                  }}
                                  className={`w-full h-9 px-3 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white ${
                                    err ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                                  }`}
                                />
                              )}
                              {err && <p className="text-[10px] text-rose-500 font-semibold">{err}</p>}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* 2. Itemized Recipient Details (PER_ITEM) */}
                {personalizationTemplate.fields.filter((f) => f.scope === 'PER_ITEM').length > 0 && (
                  <div className="space-y-3 p-4 bg-white rounded-xl border border-purple-100">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                        Individual Names / Line Items ({selectedQuantity} Units)
                      </span>

                      <button
                        type="button"
                        onClick={() => setIsBulkPasteModalOpen(true)}
                        className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md border border-purple-200 transition-colors"
                      >
                        <RiFileList3Line className="w-3.5 h-3.5" />
                        <span>Bulk Paste Names</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {Array.from({ length: selectedQuantity })
                        .slice(0, showAllPersonalizationItems || selectedQuantity <= 5 ? selectedQuantity : 5)
                        .map((_, itemIdx) => {
                          const perItemFields = personalizationTemplate.fields.filter((f) => f.scope === 'PER_ITEM');
                          return (
                            <div
                              key={itemIdx}
                              className="p-2.5 bg-slate-50/70 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center gap-2"
                            >
                              <span className="text-[11px] font-mono font-bold text-slate-500 sm:w-16 flex-shrink-0">
                                #{itemIdx + 1}
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                                {perItemFields.map((field) => {
                                  const errKey = `item_${itemIdx}_${field.code}`;
                                  const err = personalizationErrors[errKey];
                                  return (
                                    <div key={field.code} className="space-y-0.5">
                                      <input
                                        type="text"
                                        placeholder={`${field.name}${field.isRequired ? ' *' : ''}`}
                                        value={personalizationItemValues[itemIdx]?.[field.code] || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setPersonalizationItemValues((prev) => {
                                            const next = [...prev];
                                            if (!next[itemIdx]) next[itemIdx] = {};
                                            next[itemIdx][field.code] = val;
                                            return next;
                                          });
                                          if (personalizationErrors[errKey]) {
                                            setPersonalizationErrors((prev) => {
                                              const cp = { ...prev };
                                              delete cp[errKey];
                                              return cp;
                                            });
                                          }
                                        }}
                                        className={`w-full h-8 px-2.5 text-xs bg-white border rounded-md focus:outline-none focus:border-purple-500 ${
                                          err ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                                        }`}
                                      />
                                      {err && <p className="text-[9px] text-rose-500 font-medium">{err}</p>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                      {selectedQuantity > 5 && (
                        <button
                          type="button"
                          onClick={() => setShowAllPersonalizationItems(!showAllPersonalizationItems)}
                          className="w-full py-2 text-xs font-bold text-purple-700 hover:text-purple-900 border border-purple-200 rounded-lg bg-purple-50/50 hover:bg-purple-100/50 transition-colors cursor-pointer"
                        >
                          {showAllPersonalizationItems
                            ? 'Collapse to 5 items'
                            : `View & edit all ${selectedQuantity} items`}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====================================================== */}
            {/* QUANTITY & PRICING                                     */}
            {/* ====================================================== */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>
                      {(hasDimensionalInputs ? 1 : 0) +
                        effectiveOptionGroups.length +
                        (personalizationTemplate?.isActive ? 1 : 0) +
                        1}
                      . Quantity & Pricing
                    </span>
                    <RiInformationLine className="w-3.5 h-3.5 text-slate-400" />
                  </label>

                  {isIncrementalMode ? (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/90 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                      <RiArrowUpCircleLine className="w-3 h-3 text-amber-600" />
                      Step: +{quantityStep} units
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                      <RiLockLine className="w-3 h-3 text-slate-500" />
                      Fixed Quantities Only
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedQuantity(quantityTiers[0]?.quantity || minQty);
                  }}
                  className="text-xs text-slate-500 hover:text-black hover:underline cursor-pointer"
                >
                  Reset Quantity
                </button>
              </div>

              {/* ============================================================ */}
              {/* CONDITIONAL RENDERING BASED ON INCREMENTAL MODE (STAGE 5)    */}
              {/* If Incremental ON: Show ONLY the increment option (stepper)  */}
              {/* If Incremental OFF: Show ONLY fixed quantity tier cards grid */}
              {/* ============================================================ */}
              {isIncrementalMode ? (
                /* ONLY INCREMENT OPTION */
                <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                          Select Order Quantity
                        </span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <RiArrowUpCircleLine className="w-3 h-3 text-amber-600" />
                          Step: +{quantityStep} units
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        Adjust order quantity in increments of {quantityStep} units (Min: {minQty} • Max: {maxQty.toLocaleString()})
                      </span>
                    </div>

                    {/* Stepper Controls */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={handleDecrementQty}
                        disabled={selectedQuantity <= minQty}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-800 font-bold transition shadow-2xs cursor-pointer active:scale-95"
                        title={`Decrease by ${quantityStep}`}
                      >
                        <RiSubtractLine className="w-4 h-4" />
                      </button>

                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={minQty}
                          max={maxQty}
                          step={quantityStep}
                          value={selectedQuantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                              handleDirectQuantityChange(val);
                            }
                          }}
                          className="w-28 h-10 px-3 text-center text-sm font-black font-mono bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <span className="absolute right-2 text-[10px] font-bold text-slate-400 pointer-events-none uppercase">
                          pcs
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleIncrementQty}
                        disabled={selectedQuantity >= maxQty}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-800 font-bold transition shadow-2xs cursor-pointer active:scale-95"
                        title={`Increase by ${quantityStep}`}
                      >
                        <RiAddLine className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Step Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-500">Quick add:</span>
                    {[quantityStep, quantityStep * 2, quantityStep * 5, quantityStep * 10]
                      .filter((stepAdd) => selectedQuantity + stepAdd <= maxQty)
                      .map((stepAdd) => (
                        <button
                          key={stepAdd}
                          type="button"
                          onClick={() => handleDirectQuantityChange(selectedQuantity + stepAdd)}
                          className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900 transition shadow-2xs cursor-pointer"
                        >
                          +{stepAdd} units
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => handleDirectQuantityChange(minQty)}
                      className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer ml-auto"
                    >
                      Min ({minQty})
                    </button>
                  </div>

                  {/* Live Rate Breakdown Banner inside Increment Box */}
                  <div className="p-3 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                        Base Order Rate ({selectedQuantity.toLocaleString()} units)
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-base font-black text-slate-950 font-mono">
                          {formatCurrency(Math.round((activeMatchedTier?.unitPrice || 0) * selectedQuantity * 100) / 100)}
                        </span>
                        <span className="text-xs text-slate-600 font-mono">
                          (₹{(activeMatchedTier?.unitPrice || 0).toFixed(2)} / unit base)
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-md inline-flex items-center gap-1 font-mono">
                      Base Tier Rate
                    </span>
                  </div>

                  {/* Active Bulk Range Alert Banner if applicable */}
                  {(activeMatchedTier?.isRange || isRangeBracketMode) && (
                    <div className="p-2.5 bg-amber-50/90 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-950 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <RiSparklingFill className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold">Bulk Range Applied: </span>
                          <span>
                            Ordering <strong>{selectedQuantity} units</strong> qualifies for the{' '}
                            <strong className="font-mono">{activeMatchedTier?.minQty}–{activeMatchedTier?.maxQty} pcs</strong> rate (
                            <strong className="font-mono">₹{(activeMatchedTier?.unitPrice || 0).toFixed(2)} / unit</strong>
                            ). Total: <strong className="font-mono">{formatCurrency(Math.round(selectedQuantity * (activeMatchedTier?.unitPrice || 0) * 100) / 100)}</strong>.
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {configuredBracketWeightGrams !== null && (
                          <span className="font-mono font-bold text-slate-700 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-300">
                            Weight: {configuredBracketWeightGrams >= 1000 ? `${(configuredBracketWeightGrams / 1000).toFixed(2)} kg` : `${configuredBracketWeightGrams} g`}/pc
                          </span>
                        )}
                        <span className="font-mono font-bold text-amber-800 text-[11px] bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300 shrink-0">
                          ₹{(activeMatchedTier?.unitPrice || 0).toFixed(2)}/pc Active
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ONLY FIXED QUANTITY CARDS GRID */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {quantityTiers.map((tier, idx) => {
                      const isSelected = tier.isRange
                        ? selectedQuantity >= tier.minQty && selectedQuantity <= tier.maxQty
                        : selectedQuantity === tier.quantity;

                      return (
                        <button
                          key={`qty-tier-${tier.minQty}-${tier.maxQty}-${idx}`}
                          type="button"
                          onClick={() => {
                            setSelectedQuantity(tier.quantity);
                          }}
                          className={`relative p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'border-2 border-[#FFED00] bg-amber-50/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#FFED00] text-black flex items-center justify-center">
                              <RiCheckLine className="w-3 h-3 stroke-[2.5]" />
                            </div>
                          )}

                          {tier.isRange && (
                            <span className="inline-block px-1.5 py-0.2 mb-1 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Bulk Range
                            </span>
                          )}

                          <span className="text-xs font-bold text-slate-800 block">
                            {tier.isRange ? `${tier.minQty}–${tier.maxQty} units` : `${tier.quantity} units`}
                          </span>

                          <span className="text-sm font-black text-slate-950 font-mono block mt-0.5">
                            {tier.isRange
                              ? `From ${formatCurrency(tier.totalPrice)}`
                              : formatCurrency(tier.totalPrice)}
                          </span>

                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                            ₹{tier.unitPrice.toFixed(2)} / unit
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {activeMatchedTier?.isRange && (
                    <div className="p-2.5 bg-amber-50/90 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-950">
                      <div className="flex items-center gap-2">
                        <RiSparklingFill className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold">Bulk Range Applied: </span>
                          <span>
                            Ordering <strong>{selectedQuantity} units</strong> qualifies for the{' '}
                            <strong className="font-mono">{activeMatchedTier.minQty}–{activeMatchedTier.maxQty} pcs</strong> rate (
                            <strong className="font-mono">₹{activeMatchedTier.unitPrice.toFixed(2)} / unit</strong>
                            ). Base Price = <strong className="font-mono">{selectedQuantity} × ₹{activeMatchedTier.unitPrice.toFixed(2)} = {formatCurrency(Math.round(selectedQuantity * activeMatchedTier.unitPrice * 100) / 100)}</strong>.
                          </span>
                        </div>
                      </div>
                      <span className="hidden sm:inline-block font-mono font-bold text-amber-800 text-[11px] bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300 shrink-0">
                        ₹{activeMatchedTier.unitPrice.toFixed(2)}/pc Base
                      </span>
                    </div>
                  )}

                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <RiLockLine className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      This product is available exclusively in the <strong>predefined fixed quantities</strong> shown above. Custom quantity increments are disabled.
                    </span>
                  </div>
                </div>
              )}

              <div className="p-2.5 bg-emerald-50 border border-emerald-200/90 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
                <RiCheckboxCircleLine className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Higher quantity gives you lower per unit cost and better savings.</span>
              </div>
            </div>

            {/* Validation Error Banner */}
            {Object.keys(personalizationErrors).length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-semibold">
                <RiErrorWarningLine className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Please complete the required personalization fields highlighted above.</span>
              </div>
            )}

            {/* ====================================================== */}
            {/* AUTHORITATIVE PRICING SUMMARY CARD (STAGE 5 DRIVEN)    */}
            {/* ====================================================== */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                      Authoritative Quotation
                    </span>
                    {isCalculatingPrice ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300">
                        <RiLoader4Line className="w-3 h-3 animate-spin" />
                        Calculating...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <RiCheckboxCircleLine className="w-3 h-3" />
                        Stage 5 Verified
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 font-mono">
                    {selectedQuantity} units × ₹{serverUnitPrice.toFixed(2)} / unit
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-black font-mono text-white">
                    {formatCurrency(effectiveSubtotal)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Subtotal (Excl. Tax)
                  </div>
                </div>
              </div>

              {/* Price Details Bar */}
              <div className="pt-2.5 border-t border-slate-800 space-y-1.5">
                {activeDesignFee > 0 && (
                  <div className="flex items-center justify-between text-xs text-amber-300 font-mono">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <RiSparklingFill className="w-3.5 h-3.5 text-amber-400" />
                      Design Assistance Fee:
                    </span>
                    <span className="font-bold">+{formatCurrency(activeDesignFee)}</span>
                  </div>
                )}
                {shippingQuote && (
                  <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <RiTruckLine className="w-3.5 h-3.5" />
                      Shipping ({shippingQuote.zoneCode || 'Standard'}):
                    </span>
                    <span className="font-bold">
                      {shippingQuote.isFreeShippingApplied ? (
                        <span className="text-emerald-400">FREE</span>
                      ) : Number(shippingQuote.finalShippingAmount) > 0 ? (
                        `+${formatCurrency(shippingQuote.finalShippingAmount)}`
                      ) : (
                        <span className="text-amber-300">Pending PIN</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-300 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Estimated GST (18%):</span>
                    <span className="font-mono text-slate-200">+{formatCurrency(effectiveTax)}</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span className="text-slate-300">Total Payable:</span>
                    <span className="font-mono text-amber-400 font-black text-base">{formatCurrency(effectiveGrandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Pincode & Authoritative Weight Box */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <RiTruckLine className="w-4 h-4 text-sky-600" />
                  Estimated Weight & Shipping
                </span>
                {shippingQuote?.estimatedDeliveryDays && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    ETA: {shippingQuote.estimatedDeliveryDays}
                  </span>
                )}
              </div>

              {/* Weight Breakdown Summary */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Estimated Product Weight:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {storefrontWeightInfo.productWeightGrams >= 1000
                      ? `${(storefrontWeightInfo.productWeightGrams / 1000).toFixed(2)} kg`
                      : `${storefrontWeightInfo.productWeightGrams} g`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Packaging Box (Tare):</span>
                  <span className="font-mono">
                    +{storefrontWeightInfo.packagingWeightGrams} g
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                  <span>Estimated Shipment Weight:</span>
                  <span className="font-mono text-sky-700">
                    {storefrontWeightInfo.actualWeightGrams >= 1000
                      ? `${(storefrontWeightInfo.actualWeightGrams / 1000).toFixed(2)} kg`
                      : `${storefrontWeightInfo.actualWeightGrams} g`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit PIN code..."
                    value={deliveryPincode}
                    onChange={(e) => setDeliveryPincode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-1.5 font-mono text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={deliveryPincode.length !== 6 || isCalculatingPrice}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition disabled:opacity-40 cursor-pointer"
                >
                  Check
                </button>
              </div>

              {shippingQuote && deliveryPincode.length === 6 ? (
                <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <RiCheckboxCircleLine className="w-3.5 h-3.5 text-emerald-600" />
                    Serviceable ({shippingQuote.zoneCode} Zone)
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {shippingQuote.isFreeShippingApplied
                      ? 'FREE Delivery'
                      : Number(shippingQuote.finalShippingAmount) > 0
                      ? formatCurrency(shippingQuote.finalShippingAmount)
                      : 'Pending Quote'}
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="italic">Delivery Pincode:</span>
                  <span className="font-semibold text-amber-600">Enter PIN to calculate</span>
                </div>
              )}
            </div>

            {/* ====================================================== */}
            {/* PRIMARY & SECONDARY CTA BUTTONS                        */}
            {/* ====================================================== */}
            <div className="space-y-3 pt-1">
              {!isVariantAllocationValid && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-2 shadow-2xs">
                  <RiErrorWarningLine className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-red-800">Variant Quantity Mismatch</p>
                    <p className="text-[11px] text-red-700 leading-tight">
                      Please adjust variant quantities to match the total order quantity of {selectedQuantity}.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isCalculatingPrice || !isVariantAllocationValid}
                className={`w-full h-12 font-bold text-sm rounded-xl border border-black/10 shadow-xs flex items-center justify-center gap-2 transition-transform active:scale-[0.99] ${
                  !isVariantAllocationValid
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#FFED00] hover:bg-[#F2E100] text-black cursor-pointer'
                }`}
              >
                <RiShoppingCart2Line className="w-5 h-5" />
                <span>{!isVariantAllocationValid ? 'Adjust Variants to Proceed' : 'Add to Cart'}</span>
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => setIsDesignerModalOpen(true)}
                  className="w-full h-11 px-4 bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold rounded-xl border border-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <RiCustomerService2Line className="w-4 h-4 text-slate-700" />
                  <span>No Design? Contact Designer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM TRUST FOOTER STRIP                                */}
      {/* ======================================================== */}
      <div className="border-t border-slate-200 bg-slate-50/70 py-6 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                <RiShieldCheckLine className="w-5 h-5 text-slate-800" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Secure Payments</span>
                <span className="text-[11px] text-slate-500">100% secure & encrypted</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                <RiAwardLine className="w-5 h-5 text-slate-800" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Professional Production</span>
                <span className="text-[11px] text-slate-500">Advanced printing technology</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                <RiCheckboxCircleLine className="w-5 h-5 text-slate-800" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Quality Assurance</span>
                <span className="text-[11px] text-slate-500">Strict quality checks</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                <RiTruckLine className="w-5 h-5 text-slate-800" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">On-Time Delivery</span>
                <span className="text-[11px] text-slate-500">Across India</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CART SIDE DRAWER                                         */}
      {/* ======================================================== */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        activeItem={activeCartItem}
        onUpdateItem={(updated) => {
          setActiveCartItem((prev) => {
            if (!prev) return updated;
            if (
              prev.hasDesignService === updated.hasDesignService &&
              prev.subtotal === updated.subtotal &&
              prev.grandTotal === updated.grandTotal &&
              prev.quantity === updated.quantity &&
              prev.designServiceFee === updated.designServiceFee &&
              prev.artworkFile?.fileUrl === updated.artworkFile?.fileUrl &&
              JSON.stringify(prev.artworkFiles || {}) === JSON.stringify(updated.artworkFiles || {})
            ) {
              return prev;
            }
            return updated;
          });
        }}
        onProceedToCheckout={(finalItem?: CartDrawerItem) => {
          const itemToPersist = finalItem || activeCartItem;
          if (itemToPersist) {
            setActiveCartItem(itemToPersist);
            sessionStorage.setItem('pb2_active_cart', JSON.stringify(itemToPersist));
          }
          if (user) {
            router.push('/checkout');
          } else {
            setIsAuthModalOpen(true);
          }
        }}
      />

      {/* Checkout Authentication Gate Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          setIsCartDrawerOpen(false);
          router.push('/checkout');
        }}
        zIndex="z-[200]"
      />

      {/* Bulk Paste Modal for Per-Item Personalization */}
      {isBulkPasteModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RiFileList3Line className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Bulk Paste Recipient Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-600">
                Paste one line per item (up to {selectedQuantity} items). If multiple fields, separate by comma or tab from Excel/Sheets.
              </p>
              <textarea
                rows={8}
                value={bulkPasteText}
                onChange={(e) => setBulkPasteText(e.target.value)}
                placeholder="Rahul Verma&#10;Priya Sharma&#10;Amit Patel"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-purple-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkPasteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkPaste}
                disabled={!bulkPasteText.trim()}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Apply Names ({bulkPasteText.split('\n').filter((l) => l.trim()).length} parsed)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D / High-Res Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RiBox3Line className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Technical Preview: {product.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-square bg-gradient-to-b from-slate-100 to-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-center space-y-3 relative overflow-hidden">
              <img
                src={galleryImages[0]?.url}
                alt="Product Preview"
                className="w-56 h-56 object-contain drop-shadow-2xl transition-transform hover:scale-105"
              />
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-slate-800">
                  SKU: {product.sku} • {product.category?.name || 'Commercial Quality'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Calibrated on Heidelberg & HP Indigo Press Plant • ISO 12647-2 Ready
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(false)}
              className="w-full h-10 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Designer Support Helpline Modal */}
      {isDesignerModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RiCustomerService2Line className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Print & Packaging Specialist</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDesignerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Need custom die-lines, structural inserts, or artwork layout assistance for{' '}
              <strong>{product.name}</strong>? Our specialists are available for consultation.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <p className="font-semibold text-slate-800">Direct Desk Helpline:</p>
              <p className="text-amber-800 font-mono font-bold">+91 (022) 2840-2100</p>
              <p className="text-slate-500 text-[11px]">Email: support@printbazzar.in (Mon-Sat 9AM-8PM IST)</p>
            </div>

            <button
              type="button"
              onClick={() => setIsDesignerModalOpen(false)}
              className="w-full h-10 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg transition-colors border border-amber-300"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STICKY BOTTOM DYNAMIC PRICING & ACTION BAR               */}
      {/* ======================================================== */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
          {/* Left: Product & Active Selections Summary */}
          <div className="min-w-0 flex items-center gap-3">
            {galleryImages[0]?.url && (
              <div className="w-11 h-11 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 hidden sm:block relative">
                <img
                  src={galleryImages[0].url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  {product.name}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                  {selectedQuantity} {selectedQuantity === 1 ? 'unit' : 'units'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate">
                <span className="font-mono">₹{serverUnitPrice.toFixed(2)}/unit</span>
                {activeDesignFee > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
                    <RiSparklingFill className="w-2.5 h-2.5 text-amber-600" />
                    +₹{activeDesignFee.toFixed(2)} Design
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    Customer Files
                  </span>
                )}
                <span className="text-slate-300">•</span>
                {shippingQuote?.isFreeShippingApplied ? (
                  <span className="text-emerald-700 font-semibold">Free Delivery</span>
                ) : shippingQuote && Number(shippingQuote.finalShippingAmount) > 0 ? (
                  <span className="text-slate-700 font-mono font-semibold">+{formatCurrency(shippingQuote.finalShippingAmount)} Delivery</span>
                ) : deliveryPincode.length === 6 ? (
                  <span className="text-sky-700 font-semibold">Standard Delivery</span>
                ) : (
                  <span className="text-slate-500">Shipping at Checkout</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Dynamic Price & Add to Cart Action */}
          <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right">
              <div className="flex items-baseline gap-1.5 justify-end">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-semibold">
                  Total (Incl. GST):
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-950">
                  {formatCurrency(effectiveGrandTotal)}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Subtotal: {formatCurrency(effectiveSubtotal)} • GST (18%): {formatCurrency(effectiveTax)}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isCalculatingPrice || !isVariantAllocationValid}
              className={`h-11 sm:h-12 px-5 sm:px-7 font-bold text-xs sm:text-sm rounded-xl border border-black/10 shadow-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shrink-0 ${
                !isVariantAllocationValid
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#FFED00] hover:bg-[#F2E100] text-black cursor-pointer'
              }`}
            >
              <RiShoppingCart2Line className="w-4 h-4" />
              <span>{!isVariantAllocationValid ? 'Distribute Qty' : 'Add to Cart'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
