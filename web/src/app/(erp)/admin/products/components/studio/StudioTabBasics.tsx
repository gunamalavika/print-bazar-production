'use client';

import React, { useRef, useState, useMemo } from 'react';
import {
  RiImage2Line,
  RiDeleteBin7Line,
  RiSparklingFill,
  RiCheckLine,
  RiUploadCloud2Line,
  RiInformationLine,
  RiStackLine,
  RiPriceTag3Line,
  RiRefreshLine,
  RiArrowRightLine,
  RiAddLine,
  RiEditLine,
  RiCloseLine,
  RiAlertLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiListCheck2,
} from 'react-icons/ri';
import { ProductCategoryItem, ProductImageItem, ProductOptionRequirement, api } from '@/lib/api';
import { generateProductSku, getNextAvailableProductSku } from '@/lib/utils';
import { StudioTab } from './StudioTabReview';
import { MatrixRowItem } from './StudioTabPricing';

export interface StudioTabBasicsProps {
  name: string;
  setName: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  sku: string;
  setSku: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  categories: ProductCategoryItem[];
  existingProducts?: Array<{ sku?: string }>;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  setStatus: (v: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => void;
  basePrice?: number | string;
  setBasePrice?: (v: number | string) => void;
  pricingModel?: string;
  setPricingModel?: (v: string) => void;
  minQuantity?: number;
  setMinQuantity?: (v: number) => void;
  quantityStep?: number;
  setQuantityStep?: (v: number) => void;
  maxQuantity?: number;
  setMaxQuantity?: (v: number) => void;
  productionDays: number;
  setProductionDays: (v: number) => void;
  description: string;
  setDescription: (v: string) => void;
  keyPoints?: string[];
  setKeyPoints?: React.Dispatch<React.SetStateAction<string[]>> | ((v: string[]) => void);
  defaultSize: string;
  setDefaultSize: (v: string) => void;
  isFeatured: boolean;
  setIsFeatured: (v: boolean) => void;

  // Tier Matrix Synchronization
  matrixRows?: MatrixRowItem[];
  setMatrixRows?: React.Dispatch<React.SetStateAction<MatrixRowItem[]>>;

  // Logistics
  shippingChargeType?: string;
  setShippingChargeType?: (v: string) => void;
  courierCharge?: number | string;
  setCourierCharge?: (v: number | string) => void;
  freeShippingThreshold?: number | string;
  setFreeShippingThreshold?: (v: number | string) => void;
  allowCod?: boolean;
  setAllowCod?: (v: boolean) => void;
  codSurcharge?: number | string;
  setCodSurcharge?: (v: number | string) => void;

  // Media
  images: ProductImageItem[];
  setImages: React.Dispatch<React.SetStateAction<ProductImageItem[]>>;
  isNew: boolean;
  productId: string;

  // Baseline Artwork & Design Policy (Contextually integrated)
  artworkRequirement?: ProductOptionRequirement;
  setArtworkRequirement?: React.Dispatch<React.SetStateAction<ProductOptionRequirement>> | ((v: any) => void);
  artworkFileFormats?: string[];
  setArtworkFileFormats?: React.Dispatch<React.SetStateAction<string[]>>;
  maxArtworkFileSizeMb?: number;
  setMaxArtworkFileSizeMb?: React.Dispatch<React.SetStateAction<number>> | ((v: any) => void);
  minimumArtworkMegapixels?: number;
  setMinimumArtworkMegapixels?: React.Dispatch<React.SetStateAction<number>> | ((v: any) => void);
  designServiceRequirement?: ProductOptionRequirement;
  setDesignServiceRequirement?: React.Dispatch<React.SetStateAction<ProductOptionRequirement>> | ((v: any) => void);
  designServiceFee?: number | string;
  setDesignServiceFee?: React.Dispatch<React.SetStateAction<number | string>> | ((v: any) => void);

  onNavigateToTab?: (tab: StudioTab) => void;
  onChange?: () => void;
}

export function StudioTabBasics({
  name,
  setName,
  slug,
  setSlug,
  sku,
  setSku,
  categoryId,
  setCategoryId,
  categories,
  existingProducts,
  status,
  setStatus,
  basePrice = 0,
  setBasePrice,
  pricingModel = 'SINGLE_FIXED_QUANTITY',
  setPricingModel,
  minQuantity = 1,
  setMinQuantity,
  quantityStep,
  setQuantityStep,
  maxQuantity = 100000,
  setMaxQuantity,
  productionDays,
  setProductionDays,
  description,
  setDescription,
  keyPoints = [],
  setKeyPoints,
  defaultSize,
  setDefaultSize,
  isFeatured,
  setIsFeatured,
  images,
  setImages,
  isNew,
  productId,
  matrixRows,
  setMatrixRows,
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
  designServiceFee = 0,
  setDesignServiceFee,
  onNavigateToTab,
  onChange,
}: StudioTabBasicsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  // Business Mapping:
  // Option A: Single Fixed Quantity -> Quantity Range Brackets (1–10, 11–20, 21–50, 51–100)
  // Option B: Bulk Quantity Range -> Discrete Fixed Tiers (100, 1,000, 25,000)
  const isRangeBracketMode = pricingModel === 'SINGLE_FIXED_QUANTITY' || pricingModel === 'RANGE_BRACKETS';

  // Input states for adding / editing tiers in Stage 1
  const [newRangeMin, setNewRangeMin] = useState<number | ''>('');
  const [newRangeMax, setNewRangeMax] = useState<number | ''>('');
  const [rangeError, setRangeError] = useState<string>('');
  const [newFixedQty, setNewFixedQty] = useState<number | ''>('');
  const [fixedError, setFixedError] = useState<string>('');

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editMin, setEditMin] = useState<number | ''>('');
  const [editMax, setEditMax] = useState<number | ''>('');
  const [editFixedQty, setEditFixedQty] = useState<number | ''>('');

  // Key Points input state
  const [newKeyPointInput, setNewKeyPointInput] = useState('');

  const handleAddKeyPoint = () => {
    const val = newKeyPointInput.trim();
    if (!val || !setKeyPoints) return;
    setKeyPoints([...keyPoints, val]);
    setNewKeyPointInput('');
    onChange?.();
  };

  // Extract active tiers from matrixRows (or defaults)
  const activeTiers = useMemo(() => {
    const list: Array<{ id: string; minQty: number; maxQty: number; isRange: boolean; label: string }> = [];
    if (matrixRows && matrixRows.length > 0) {
      for (const r of matrixRows) {
        const combo = (r.attributeCombination as any) || {};
        const isBase =
          combo.isBasePrice === true ||
          combo.type === 'BASE' ||
          Object.keys(combo).filter(
            (k) => !['label', 'rangeLabel', 'discountPercent', 'isBasePrice', 'type', 'price', 'totalPrice'].includes(k)
          ).length === 0;
        if (isBase && r.minQty > 0) {
          const max = r.maxQty && r.maxQty >= r.minQty ? r.maxQty : r.minQty;
          const isRange = r.minQty !== max;
          if (isRangeBracketMode ? isRange : !isRange) {
            const id = isRange ? `${r.minQty}-${max}` : `${r.minQty}`;
            if (!list.some((t) => t.id === id)) {
              list.push({
                id,
                minQty: r.minQty,
                maxQty: max,
                isRange,
                label: isRange ? `${r.minQty}–${max} pcs` : `${r.minQty.toLocaleString()} pcs`,
              });
            }
          }
        }
      }
    }
    if (list.length > 0) {
      return list.sort((a, b) => a.minQty - b.minQty);
    }
    return isRangeBracketMode
      ? [
          { id: '1-10', minQty: 1, maxQty: 10, isRange: true, label: '1–10 pcs' },
          { id: '11-20', minQty: 11, maxQty: 20, isRange: true, label: '11–20 pcs' },
          { id: '21-50', minQty: 21, maxQty: 50, isRange: true, label: '21–50 pcs' },
          { id: '51-100', minQty: 51, maxQty: 100, isRange: true, label: '51–100 pcs' },
        ]
      : [
          { id: '100', minQty: 100, maxQty: 100, isRange: false, label: '100 pcs' },
          { id: '1000', minQty: 1000, maxQty: 1000, isRange: false, label: '1,000 pcs' },
          { id: '25000', minQty: 25000, maxQty: 25000, isRange: false, label: '25,000 pcs' },
        ];
  }, [matrixRows, isRangeBracketMode]);

  const applyTiersToMatrix = (newTiers: Array<{ minQty: number; maxQty: number; label: string }>) => {
    if (!setMatrixRows) return;
    setMatrixRows((prev) => {
      const nonBase = (prev || []).filter((r) => {
        const combo = (r.attributeCombination as any) || {};
        const isBase =
          combo.isBasePrice === true ||
          combo.type === 'BASE' ||
          Object.keys(combo).filter(
            (k) => !['label', 'rangeLabel', 'discountPercent', 'isBasePrice', 'type', 'price', 'totalPrice'].includes(k)
          ).length === 0;
        return !isBase;
      });
      const newBaseRows = newTiers.map((t) => {
        const uPrice = Number(basePrice) > 0 ? Number(basePrice) / (t.minQty || 1) : 10;
        return {
          minQty: t.minQty,
          maxQty: t.maxQty,
          unitPrice: uPrice,
          label: t.label,
          attributeCombination: {
            type: 'BASE',
            isBasePrice: true,
            label: t.label,
            totalPrice: Math.round(uPrice * t.minQty),
            price: Math.round(uPrice * t.minQty),
          },
        };
      });
      return [...nonBase, ...newBaseRows];
    });
    if (newTiers.length > 0) {
      setMinQuantity?.(newTiers[0].minQty);
      setMaxQuantity?.(newTiers[newTiers.length - 1].maxQty);
    }
    onChange?.();
  };

  const handleAddRangeBracket = () => {
    setRangeError('');
    const min = Number(newRangeMin);
    const max = Number(newRangeMax);
    if (!min || !max || isNaN(min) || isNaN(max)) {
      setRangeError('Both minimum and maximum quantities are required.');
      return;
    }
    if (min <= 0 || max <= 0) {
      setRangeError('Quantities must be positive integers.');
      return;
    }
    if (min >= max) {
      setRangeError('Maximum quantity must be strictly greater than minimum quantity.');
      return;
    }
    const hasOverlap = activeTiers.some((t) => Math.max(min, t.minQty) <= Math.min(max, t.maxQty));
    if (hasOverlap) {
      setRangeError(`Range ${min}–${max} overlaps with an existing bracket.`);
      return;
    }
    const updated = [
      ...activeTiers,
      { id: `${min}-${max}`, minQty: min, maxQty: max, isRange: true, label: `${min}–${max} pcs` },
    ].sort((a, b) => a.minQty - b.minQty);
    applyTiersToMatrix(updated);
    setNewRangeMin('');
    setNewRangeMax('');
  };

  const handleAddFixedTier = () => {
    setFixedError('');
    const qty = Number(newFixedQty);
    if (!qty || isNaN(qty) || qty <= 0) {
      setFixedError('Please enter a valid positive integer quantity.');
      return;
    }
    if (activeTiers.some((t) => t.minQty === qty)) {
      setFixedError(`Fixed tier ${qty.toLocaleString()} pcs already exists.`);
      return;
    }
    const updated = [
      ...activeTiers,
      { id: `${qty}`, minQty: qty, maxQty: qty, isRange: false, label: `${qty.toLocaleString()} pcs` },
    ].sort((a, b) => a.minQty - b.minQty);
    applyTiersToMatrix(updated);
    setNewFixedQty('');
  };

  const handleRemoveTier = (tierId: string) => {
    if (activeTiers.length <= 1) {
      alert('At least one quantity tier or range bracket is required.');
      return;
    }
    const updated = activeTiers.filter((t) => t.id !== tierId);
    applyTiersToMatrix(updated);
  };

  const handleSaveEdit = (tierId: string) => {
    if (isRangeBracketMode) {
      const min = Number(editMin);
      const max = Number(editMax);
      if (!min || !max || isNaN(min) || isNaN(max) || min <= 0 || max <= min) {
        alert('Invalid range boundaries.');
        return;
      }
      const otherTiers = activeTiers.filter((t) => t.id !== tierId);
      const hasOverlap = otherTiers.some((t) => Math.max(min, t.minQty) <= Math.min(max, t.maxQty));
      if (hasOverlap) {
        alert(`Range ${min}–${max} overlaps with another bracket.`);
        return;
      }
      const updated = [
        ...otherTiers,
        { id: `${min}-${max}`, minQty: min, maxQty: max, isRange: true, label: `${min}–${max} pcs` },
      ].sort((a, b) => a.minQty - b.minQty);
      applyTiersToMatrix(updated);
      setEditingTierId(null);
    } else {
      const qty = Number(editFixedQty);
      if (!qty || isNaN(qty) || qty <= 0) {
        alert('Please enter a valid positive integer quantity.');
        return;
      }
      const otherTiers = activeTiers.filter((t) => t.id !== tierId);
      if (otherTiers.some((t) => t.minQty === qty)) {
        alert(`Fixed tier ${qty.toLocaleString()} pcs already exists.`);
        return;
      }
      const updated = [
        ...otherTiers,
        { id: `${qty}`, minQty: qty, maxQty: qty, isRange: false, label: `${qty.toLocaleString()} pcs` },
      ].sort((a, b) => a.minQty - b.minQty);
      applyTiersToMatrix(updated);
      setEditingTierId(null);
    }
  };

  // SKU Auto-generator state (Format: PB-100, PB-101...)
  const [isSkuManual, setIsSkuManual] = React.useState(Boolean(sku && !isNew));

  // Auto-generate SKU on initial render for new product if currently empty
  React.useEffect(() => {
    if (isNew && !sku) {
      api.adminGetNextProductSku()
        .then((res) => {
          if (res?.sku) setSku(res.sku);
        })
        .catch(() => {
          setSku(getNextAvailableProductSku(existingProducts));
        });
    }
  }, [isNew, existingProducts]);

  // Auto-slug generator on name changes (SKU is numeric PB-100 and independent of title words)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    onChange?.();
    if (isNew || !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
    }
    if ((isNew || !sku) && !sku) {
      setSku(getNextAvailableProductSku(existingProducts));
    }
  };

  const handleRegenerateSku = async () => {
    setIsSkuManual(false);
    try {
      const res = await api.adminGetNextProductSku();
      if (res?.sku) {
        setSku(res.sku);
        onChange?.();
        return;
      }
    } catch {
      // fallback
    }
    const digits = sku ? sku.replace(/\D/g, '') : '';
    const currentNum = digits ? parseInt(digits, 10) : 99;
    const nextNum = !isNaN(currentNum) && currentNum >= 100 ? currentNum + 1 : 100;
    const newSku = `PB-${nextNum}`;
    setSku(newSku);
    onChange?.();
  };

  const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setSku(val);
    setIsSkuManual(val.trim().length > 0);
    onChange?.();
  };

  const handleSkuBlur = () => {
    if (!sku.trim()) {
      setIsSkuManual(false);
      handleRegenerateSku();
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsUploading(true);
    try {
      if (productId && !isNew) {
        const uploaded = await api.adminUploadProductImage(productId, file);
        setImages((prev) => [...prev, uploaded]);
      } else {
        const uploaded = await api.uploadMedia(file);
        setImages((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            productId: productId || 'temp',
            url: uploaded.url,
            storageKey: uploaded.filename,
            altText: name || 'Product image',
            sortOrder: prev.length,
            isPrimary: prev.length === 0,
          },
        ]);
      }
      onChange?.();
    } catch (err: any) {
      alert(err?.message || 'Failed to upload product media');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetPrimary = (index: number) => {
    setImages((prev) =>
      prev.map((img, idx) => ({
        ...img,
        isPrimary: idx === index,
      }))
    );
    onChange?.();
  };

  const handleDeleteImage = (index: number) => {
    setImages((prev) => {
      const copy = prev.filter((_, idx) => idx !== index);
      if (copy.length > 0 && !copy.some((img) => img.isPrimary)) {
        copy[0].isPrimary = true;
      }
      return copy;
    });
    onChange?.();
  };

  return (
    <div className="space-y-6 w-full">
      {/* 1. Core Identification */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>Product Core Identification & Categorization</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Premium Business Cards"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              URL Slug <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                onChange?.();
              }}
              placeholder="e.g. premium-business-cards"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 shadow-2xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Product SKU <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleRegenerateSku}
                title="Auto-generate next unique SKU"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 transition cursor-pointer"
              >
                <RiSparklingFill className="w-3 h-3 text-amber-500" />
                <span>Generate Unique SKU</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={sku}
                onChange={handleSkuChange}
                onBlur={handleSkuBlur}
                placeholder="e.g. PB-100"
                className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-28 py-2 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-amber-500 shadow-2xs"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    !isSkuManual
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                  title={!isSkuManual ? 'Auto-generated Unique SKU' : 'Custom SKU'}
                >
                  {!isSkuManual ? 'AUTO UNIQUE' : 'CUSTOM'}
                </span>
                <button
                  type="button"
                  onClick={handleRegenerateSku}
                  title="Generate next unique SKU"
                  className="p-1 text-slate-400 hover:text-amber-600 rounded hover:bg-slate-100 transition cursor-pointer"
                >
                  <RiRefreshLine className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {!isSkuManual ? (
                <span className="text-emerald-700 font-medium">Auto-generated format (e.g. PB-100). Verified unique in database.</span>
              ) : (
                <span>
                  Custom SKU active.{' '}
                  <button
                    type="button"
                    onClick={handleRegenerateSku}
                    className="text-amber-700 underline font-semibold hover:text-amber-800 cursor-pointer"
                  >
                    Reset to auto-generated unique SKU
                  </button>
                </span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                const newCatId = e.target.value;
                setCategoryId(newCatId);
                onChange?.();
                if (!sku) {
                  const newSku = getNextAvailableProductSku(existingProducts);
                  setSku(newSku);
                }
              }}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catalogue Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                onChange?.();
              }}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
            >
              <option value="DRAFT">DRAFT (Hidden from storefront)</option>
              <option value="PUBLISHED">PUBLISHED (Live on storefront)</option>
              <option value="ARCHIVED">ARCHIVED (Discontinued)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Production SLA (Days)</label>
            <input
              type="number"
              value={productionDays}
              onChange={(e) => {
                setProductionDays(parseInt(e.target.value, 10) || 1);
                onChange?.();
              }}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 shadow-2xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Default Standard Size</label>
            <input
              type="text"
              value={defaultSize}
              onChange={(e) => {
                setDefaultSize(e.target.value);
                onChange?.();
              }}
              placeholder='e.g. 3.5" x 2" (89 x 51 mm)'
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                onChange?.();
              }}
              placeholder="Detailed commercial print specifications, finishes, and paper quality..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Key Points & Product Highlights */}
        <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center">
                <RiListCheck2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Key Highlights & Bullet Points (Storefront Checklist)</h4>
                <p className="text-[11px] text-slate-500">
                  Displayed as checkmark bullet points on the customer product page (/products/[id]).
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {keyPoints.length} point{keyPoints.length === 1 ? '' : 's'} configured
            </span>
          </div>

          {/* Quick Preset Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10.5px] font-semibold text-slate-400 mr-1">Quick Add:</span>
            {[
              'Calibrated commercial-grade substrates & vibrant inks',
              'Multiple sizes, styles & customization formats',
              'Custom finishes: matte, gloss, UV, foil stamping',
              'Precision die-cut trims & reinforced hardware',
              'Low MOQ & progressive bulk discounts',
              'Free pre-flight artwork proofing by experts',
            ].map((preset, pIdx) => {
              const alreadyHas = keyPoints.includes(preset);
              return (
                <button
                  key={pIdx}
                  type="button"
                  disabled={alreadyHas}
                  onClick={() => {
                    if (!alreadyHas && setKeyPoints) {
                      setKeyPoints([...keyPoints, preset]);
                      onChange?.();
                    }
                  }}
                  className={`text-[10.5px] px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
                    alreadyHas
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                      : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border-slate-200 hover:border-amber-300 cursor-pointer'
                  }`}
                >
                  <RiAddLine className="w-3 h-3 text-amber-600" />
                  <span>{preset.length > 32 ? preset.slice(0, 30) + '...' : preset}</span>
                </button>
              );
            })}
          </div>

          {/* Existing Key Points List */}
          {keyPoints.length > 0 ? (
            <div className="space-y-2 pt-1">
              {keyPoints.map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg group transition-colors"
                >
                  <span className="w-5 h-5 rounded bg-amber-400/20 text-amber-800 text-[10px] font-mono font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => {
                      if (setKeyPoints) {
                        const updated = [...keyPoints];
                        updated[idx] = e.target.value;
                        setKeyPoints(updated);
                        onChange?.();
                      }
                    }}
                    placeholder={`Key point #${idx + 1}...`}
                    className="flex-1 bg-white border border-slate-200 focus:border-amber-500 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none shadow-2xs"
                  />
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => {
                        if (idx > 0 && setKeyPoints) {
                          const updated = [...keyPoints];
                          const temp = updated[idx - 1];
                          updated[idx - 1] = updated[idx];
                          updated[idx] = temp;
                          setKeyPoints(updated);
                          onChange?.();
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move Up"
                    >
                      <RiArrowUpLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === keyPoints.length - 1}
                      onClick={() => {
                        if (idx < keyPoints.length - 1 && setKeyPoints) {
                          const updated = [...keyPoints];
                          const temp = updated[idx + 1];
                          updated[idx + 1] = updated[idx];
                          updated[idx] = temp;
                          setKeyPoints(updated);
                          onChange?.();
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move Down"
                    >
                      <RiArrowDownLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (setKeyPoints) {
                          const updated = keyPoints.filter((_, i) => i !== idx);
                          setKeyPoints(updated);
                          onChange?.();
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete point"
                    >
                      <RiDeleteBin7Line className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
              No custom key points yet. The storefront will display default commercial print quality highlights.
            </div>
          )}

          {/* Add New Key Point Input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newKeyPointInput}
              onChange={(e) => setNewKeyPointInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyPoint();
                }
              }}
              placeholder="Type a new key highlight and press Enter or click Add..."
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
            />
            <button
              type="button"
              onClick={handleAddKeyPoint}
              disabled={!newKeyPointInput.trim()}
              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <RiAddLine className="w-3.5 h-3.5" />
              <span>Add Point</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="featured_check"
            checked={isFeatured}
            onChange={(e) => {
              setIsFeatured(e.target.checked);
              onChange?.();
            }}
            className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-500 cursor-pointer"
          />
          <label htmlFor="featured_check" className="text-xs font-semibold text-slate-800 cursor-pointer">
            Feature this product on homepage & primary print catalogue banners
          </label>
        </div>
      </div>

      {/* 2. Quantity Tier Structure & Pricing Mode */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <RiPriceTag3Line className="w-4 h-4 text-amber-600" />
              <span>Quantity Tier Structure & Pricing Mode</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select how quantity tiers and customer pricing will operate for this product in Stage 5 (Pricing Matrix).
            </p>
          </div>
          <span className={`text-[11px] font-bold font-mono px-3 py-1 rounded-full border self-start sm:self-auto ${isRangeBracketMode
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-indigo-50 text-indigo-900 border-indigo-200'
            }`}>
            Active Mode: {isRangeBracketMode ? 'Single Fixed Quantity (Range Brackets)' : 'Bulk Quantity Range (Discrete Tiers)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Single Fixed Quantity -> Quantity Range Brackets */}
          <div
            onClick={() => {
              setPricingModel?.('SINGLE_FIXED_QUANTITY');
              onChange?.();
            }}
            className={`cursor-pointer rounded-xl border-2 p-4 transition-all relative flex items-center justify-between ${isRangeBracketMode
                ? 'border-amber-500 bg-amber-50/40 shadow-xs ring-1 ring-amber-400'
                : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${isRangeBracketMode
                    ? 'bg-[#FFED00] text-slate-900 border border-amber-400 shadow-2xs'
                    : 'bg-slate-100 text-slate-600'
                  }`}
              >
                <RiStackLine className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Single Fixed Quantity</h4>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Quantity Range Brackets (e.g. 1–10, 11–20, 21–50, 51–100 pcs)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Wholesale brackets with minimum &amp; maximum bounds. Quotation applies rate for matched bracket.
                </p>
              </div>
            </div>

            {isRangeBracketMode ? (
              <span className="flex items-center gap-1 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-2xs shrink-0">
                <RiCheckLine className="w-3.5 h-3.5 stroke-[3]" />
                Selected
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-400 hover:text-slate-600 shrink-0">
                Click to Select
              </span>
            )}
          </div>

          {/* Card 2: Bulk Quantity Range -> Discrete Fixed Quantity Tiers */}
          <div
            onClick={() => {
              setPricingModel?.('BULK_RANGE');
              onChange?.();
            }}
            className={`cursor-pointer rounded-xl border-2 p-4 transition-all relative flex items-center justify-between ${!isRangeBracketMode
                ? 'border-amber-500 bg-amber-50/40 shadow-xs ring-1 ring-amber-400'
                : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${!isRangeBracketMode
                    ? 'bg-[#FFED00] text-slate-900 border border-amber-400 shadow-2xs'
                    : 'bg-slate-100 text-slate-600'
                  }`}
              >
                <RiPriceTag3Line className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Bulk Quantity Range</h4>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                  Discrete Fixed Quantity Tiers (e.g. 100, 1,000, 25,000 pcs)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Predefined package quantities with set package total pricing. Customers choose from fixed cards.
                </p>
              </div>
            </div>

            {!isRangeBracketMode ? (
              <span className="flex items-center gap-1 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-2xs shrink-0">
                <RiCheckLine className="w-3.5 h-3.5 stroke-[3]" />
                Selected
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-400 hover:text-slate-600 shrink-0">
                Click to Select
              </span>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STAGE 1 QUANTITY TIER STRUCTURE CONFIGURATION (DIRECT TIER MANAGEMENT)    */}
        {/* ========================================================================= */}
        <div className="mt-6 pt-5 border-t border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {isRangeBracketMode
                    ? '1. Configured Quantity Range Brackets'
                    : '1. Configured Discrete Fixed Quantity Tiers'}
                </h4>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                  {activeTiers.length} {isRangeBracketMode ? 'Brackets' : 'Tiers'} Configured
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRangeBracketMode
                  ? 'Define continuous, non-overlapping minimum and maximum quantity ranges (e.g. 1–10, 11–20, 21–50, 51–100 pcs).'
                  : 'Define discrete fixed package quantities for customer batch selection (e.g. 100, 1,000, 25,000 pcs).'}
              </p>
            </div>
          </div>

          {/* Active Tiers Display & Management Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">{isRangeBracketMode ? 'Bracket Range' : 'Exact Quantity'}</th>
                    {isRangeBracketMode && <th className="py-2.5 px-4 text-center">Min Qty</th>}
                    {isRangeBracketMode && <th className="py-2.5 px-4 text-center">Max Qty</th>}
                    <th className="py-2.5 px-4 text-center">Coverage Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {activeTiers.map((tier, idx) => {
                    const isEditing = editingTierId === tier.id;
                    return (
                      <tr key={tier.id} className="hover:bg-amber-50/20 transition">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-400 text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          {isEditing ? (
                            isRangeBracketMode ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  value={editMin}
                                  onChange={(e) => setEditMin(parseInt(e.target.value) || '')}
                                  className="w-16 px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                                  placeholder="Min"
                                />
                                <span className="text-slate-400">–</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={editMax}
                                  onChange={(e) => setEditMax(parseInt(e.target.value) || '')}
                                  className="w-16 px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                                  placeholder="Max"
                                />
                                <span className="text-slate-500 font-mono text-[11px]">pcs</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  value={editFixedQty}
                                  onChange={(e) => setEditFixedQty(parseInt(e.target.value) || '')}
                                  className="w-24 px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                                  placeholder="Quantity"
                                />
                                <span className="text-slate-500 font-mono text-[11px]">pcs</span>
                              </div>
                            )
                          ) : (
                            <span className="font-bold text-slate-900 font-mono text-[13px]">
                              {tier.label}
                            </span>
                          )}
                        </td>

                        {isRangeBracketMode && (
                          <td className="py-2.5 px-4 text-center font-mono text-slate-700">
                            {tier.minQty.toLocaleString()} pcs
                          </td>
                        )}
                        {isRangeBracketMode && (
                          <td className="py-2.5 px-4 text-center font-mono text-slate-700">
                            {tier.maxQty.toLocaleString()} pcs
                          </td>
                        )}

                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                            <RiCheckLine className="w-3 h-3 text-emerald-600" />
                            Active
                          </span>
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(tier.id)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTierId(null)}
                                  className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTierId(tier.id);
                                    setEditMin(tier.minQty);
                                    setEditMax(tier.maxQty);
                                    setEditFixedQty(tier.minQty);
                                  }}
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                                  title="Edit Tier"
                                >
                                  <RiEditLine className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTier(tier.id)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                                  title="Remove Tier"
                                >
                                  <RiDeleteBin7Line className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Tier / Range Form Row */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              {isRangeBracketMode ? (
                /* Add Range Bracket Form */
                <div className="flex items-center gap-2 flex-wrap w-full">
                  <span className="font-bold text-slate-700 flex items-center gap-1 shrink-0">
                    <RiAddLine className="w-4 h-4 text-amber-600" />
                    <span>Add Range Bracket:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      placeholder="Min Qty"
                      value={newRangeMin}
                      onChange={(e) => setNewRangeMin(parseInt(e.target.value) || '')}
                      className="w-24 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="number"
                      min={1}
                      placeholder="Max Qty"
                      value={newRangeMax}
                      onChange={(e) => setNewRangeMax(parseInt(e.target.value) || '')}
                      className="w-24 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-slate-500 font-mono text-xs">pcs</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRangeBracket}
                    className="px-3 py-1.5 text-xs font-bold text-slate-900 bg-[#FFED00] hover:bg-[#F2E100] border border-amber-400 rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    + Add Range
                  </button>
                  {rangeError && (
                    <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 ml-2">
                      <RiAlertLine className="w-3.5 h-3.5" />
                      {rangeError}
                    </span>
                  )}
                </div>
              ) : (
                /* Add Fixed Quantity Tier Form */
                <div className="flex items-center gap-2 flex-wrap w-full">
                  <span className="font-bold text-slate-700 flex items-center gap-1 shrink-0">
                    <RiAddLine className="w-4 h-4 text-amber-600" />
                    <span>Add Fixed Tier:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g. 25000"
                      value={newFixedQty}
                      onChange={(e) => setNewFixedQty(parseInt(e.target.value) || '')}
                      className="w-32 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-slate-500 font-mono text-xs">pcs</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFixedTier}
                    className="px-3 py-1.5 text-xs font-bold text-slate-900 bg-[#FFED00] hover:bg-[#F2E100] border border-amber-400 rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    + Add Tier
                  </button>
                  {fixedError && (
                    <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 ml-2">
                      <RiAlertLine className="w-3.5 h-3.5" />
                      {fixedError}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Media Gallery */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <RiImage2Line className="w-4 h-4 text-amber-600" />
              <span>Product Gallery & Storefront Media ({images.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload crisp images showcasing printed samples, paper textures, and mockups.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadImage}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] font-bold text-xs px-3.5 py-2 rounded-lg border border-[#E3A008]/40 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RiUploadCloud2Line className="w-4 h-4" />
              <span>{isUploading ? 'Uploading...' : 'Upload Media'}</span>
            </button>
          </div>
        </div>

        {images.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
            No media uploaded yet. Click &quot;Upload Media&quot; to add storefront photos.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {images.map((img, idx) => (
              <div
                key={img.id || idx}
                className={`relative group rounded-xl border overflow-hidden bg-slate-50 ${img.isPrimary ? 'border-amber-500 ring-2 ring-amber-400' : 'border-slate-200'
                  }`}
              >
                <div className="aspect-square w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img src={img.url} alt={img.altText || name} className="w-full h-full object-cover" />
                </div>

                {img.isPrimary && (
                  <span className="absolute top-1.5 left-1.5 bg-amber-500 text-black text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow">
                    Primary
                  </span>
                )}

                <div className="p-2 bg-white flex items-center justify-between gap-1 text-[11px]">
                  {!img.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(idx)}
                      className="text-[10px] font-semibold text-slate-600 hover:text-amber-600"
                    >
                      Make Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(idx)}
                    className="text-rose-500 hover:text-rose-700 ml-auto p-1 rounded"
                    title="Delete image"
                  >
                    <RiDeleteBin7Line className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prominent Next Step Action Card immediately after Image Uploader */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#FFED00] border-2 border-amber-400 flex items-center justify-center font-black text-lg text-slate-900 shrink-0 shadow-2xs">
            1
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/70 border border-amber-300 px-2 py-0.5 rounded-full">
                Step 1 of 6 Completed
              </span>
              <span className="text-xs text-slate-500">General Info & Media Gallery</span>
            </div>
            <h4 className="text-base font-black text-slate-900 mt-1">
              Ready to configure option groups, sizes, papers & choices?
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              Proceed to Step 2 to configure product sizes, paper stocks, premium finishes, and customer selection groups.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!name.trim()) {
              alert('Please enter a Product Title before proceeding to Step 2.');
              return;
            }
            if (onNavigateToTab) {
              onNavigateToTab('OPTIONS');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="flex items-center justify-center gap-2 bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] font-black text-sm px-6 py-3.5 rounded-xl border border-[#E3A008]/50 shadow-md transition active:scale-95 cursor-pointer shrink-0"
        >
          <span>Next: 2. Groups & Choices</span>
          <RiArrowRightLine className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
