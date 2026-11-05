'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  RiSaveLine,
  RiSparklingFill,
  RiCloseLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiErrorWarningLine,
} from 'react-icons/ri';
import {
  api,
  DynamicProduct,
  ProductCategoryItem,
  ProductOptionGroup,
  ProductConfigurationRule,
  ProductImageItem,
  ProductOptionRequirement,
  ProductAdditionalPricingTier,
} from '@/lib/api';
import { StudioTabBasics } from './studio/StudioTabBasics';
import { StudioTabOptions } from './studio/StudioTabOptions';
import { StudioTabArtworkConditions } from './studio/StudioTabArtworkConditions';
import { StudioTabRules } from './studio/StudioTabRules';
import { StudioTabPricing, MatrixRowItem } from './studio/StudioTabPricing';
import { StudioTabReview, StudioTab } from './studio/StudioTabReview';
import { generateProductSku, getNextAvailableProductSku } from '@/lib/utils';

export interface ProductSetupStudioProps {
  initialProduct?: DynamicProduct | null;
  categories: ProductCategoryItem[];
  existingProducts?: DynamicProduct[];
  isNew?: boolean;
  onSaved?: (product: DynamicProduct) => void;
  onCancel?: () => void;
}

export function ProductSetupStudio({
  initialProduct,
  categories,
  existingProducts,
  isNew = false,
  onSaved,
  onCancel,
}: ProductSetupStudioProps) {
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = useState<StudioTab>('BASICS');

  // Dirty State Tracker (Unsaved Changes)
  const [isDirty, setIsDirty] = useState(false);
  const markDirty = useCallback(() => setIsDirty(true), []);

  // Saving State & Alerts
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 1. BASICS
  const [productId, setProductId] = useState<string>(initialProduct?.id || '');
  const [name, setName] = useState(initialProduct?.name || '');
  const [slug, setSlug] = useState(initialProduct?.slug || '');
  const [sku, setSku] = useState(
    initialProduct?.sku || (isNew ? getNextAvailableProductSku(existingProducts) : '')
  );

  // Auto-fetch verified unique SKU from database on mount for new products
  useEffect(() => {
    if (isNew && !initialProduct?.sku) {
      api.adminGetNextProductSku()
        .then((res) => {
          if (res?.sku) setSku(res.sku);
        })
        .catch(() => {
          // fallback already computed
        });
    }
  }, [isNew, initialProduct?.sku]);
  const [categoryId, setCategoryId] = useState(
    initialProduct?.categoryId || categories[0]?.id || ''
  );
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>(
    initialProduct?.status || 'DRAFT'
  );
  const [basePrice, setBasePrice] = useState<number | string>(initialProduct?.basePrice || 0);
  const [pricingModel, setPricingModel] = useState(initialProduct?.pricingModel || 'SINGLE_FIXED_QUANTITY');
  const [minQuantity, setMinQuantity] = useState<number>(initialProduct?.minQuantity || 100);
  const [quantityStep, setQuantityStep] = useState<number>(() => {
    if (initialProduct?.quantityStep !== undefined && initialProduct?.quantityStep !== null) {
      return Number(initialProduct.quantityStep);
    }
    return (initialProduct?.pricingModel || 'SINGLE_FIXED_QUANTITY') === 'BULK_RANGE' ? 0 : 100;
  });
  const [maxQuantity, setMaxQuantity] = useState<number>(initialProduct?.maxQuantity || 100000);
  const [productionDays, setProductionDays] = useState<number>(initialProduct?.productionDays || 2);
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [defaultSize, setDefaultSize] = useState(initialProduct?.defaultSize || '');
  const [isFeatured, setIsFeatured] = useState(initialProduct?.isFeatured || false);

  // Logistics & Enterprise Shipping Weights (Configured natively in Stage 5)
  const [unitWeightGrams, setUnitWeightGrams] = useState<number | string>(
    initialProduct?.unitWeightGrams ?? 2
  );
  const [packagingProfileId, setPackagingProfileId] = useState<string>(
    (initialProduct as any)?.packagingProfileId || ''
  );
  const [isShippable, setIsShippable] = useState<boolean>(
    (initialProduct as any)?.isShippable ?? true
  );
  const [bulkTierWeights, setBulkTierWeights] = useState<Array<{ minQty: number; maxQty?: number; unitWeightGrams: number }>>(
    (initialProduct as any)?.bulkTierWeights || []
  );
  const [shippingChargeType, setShippingChargeType] = useState(
    initialProduct?.shippingChargeType || 'DEFAULT'
  );
  const [courierCharge, setCourierCharge] = useState<number | string>(
    initialProduct?.courierCharge ?? 100
  );
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | string>(
    initialProduct?.freeShippingThreshold ?? 1000
  );
  const [allowCod, setAllowCod] = useState(initialProduct?.allowCod ?? true);
  const [codSurcharge, setCodSurcharge] = useState<number | string>(
    initialProduct?.codSurcharge ?? 50
  );

  // Media
  const [images, setImages] = useState<ProductImageItem[]>(initialProduct?.images || []);

  // 2. OPTION GROUPS
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>(
    initialProduct?.optionGroups && initialProduct.optionGroups.length > 0
      ? initialProduct.optionGroups
      : []
  );
  const [allowMultipleVariants, setAllowMultipleVariants] = useState<boolean>(
    initialProduct?.allowMultipleVariants ?? false
  );
  const [variantDimensions, setVariantDimensions] = useState<string[]>(
    initialProduct?.variantDimensions || []
  );

  // 3. CONDITIONAL RULES
  const [rules, setRules] = useState<ProductConfigurationRule[]>(
    initialProduct?.configurationRules || []
  );

  // 4. ARTWORK & DESIGN
  const [artworkRequirement, setArtworkRequirement] = useState<ProductOptionRequirement>(
    initialProduct?.artworkRequirement || 'OPTIONAL'
  );
  const [artworkFileFormats, setArtworkFileFormats] = useState<string[]>(
    initialProduct?.artworkFileFormats || ['PDF', 'AI', 'PSD', 'CDR', 'TIFF', 'PNG', 'JPG']
  );
  const [maxArtworkFileSizeMb, setMaxArtworkFileSizeMb] = useState<number>(
    initialProduct?.maxArtworkFileSizeMb || 50
  );
  const [minimumArtworkMegapixels, setMinimumArtworkMegapixels] = useState<number>(
    initialProduct?.minimumArtworkMegapixels || 1.5
  );
  const [designServiceRequirement, setDesignServiceRequirement] = useState<ProductOptionRequirement>(
    initialProduct?.designServiceRequirement || 'OPTIONAL'
  );
  const [designServiceFee, setDesignServiceFee] = useState<number | string>(
    initialProduct?.designServiceFee ?? (initialProduct?.designServicePrice || 150)
  );

  // 4b. PERSONALIZATION TEMPLATE (Keepsakes, Frames, Custom Gifts)
  const [personalizationTemplateId, setPersonalizationTemplateId] = useState<string | null>(
    initialProduct?.personalizationTemplateId || null
  );
  const [personalizationConfig, setPersonalizationConfig] = useState<any>(
    initialProduct?.personalizationConfig || null
  );

  // 5. NATIVE COMBINATION PRICING MATRIX
  const [matrixRows, setMatrixRows] = useState<MatrixRowItem[]>(() => {
    if (initialProduct?.pricingMatrices && initialProduct.pricingMatrices.length > 0) {
      return initialProduct.pricingMatrices.map((m: any) => ({
        id: m.id,
        minQty: m.minQty,
        maxQty: m.maxQty,
        unitPrice: m.unitPrice,
        attributeCombination: m.attributeCombination || {},
        isExcluded: Boolean(m.attributeCombination?.isExcluded || m.attributeCombination?.status === 'EXCLUDED'),
        status: m.attributeCombination?.isExcluded ? 'EXCLUDED' : 'ACTIVE',
        label: m.attributeCombination?.label,
        discountPercent: m.attributeCombination?.discountPercent,
      }));
    }
    return [];
  });

  // Load existing matrix if not populated
  useEffect(() => {
    if (productId && !isNew && matrixRows.length === 0) {
      api
        .adminGetPricingMatrix(productId)
        .then((rows) => {
          if (rows && rows.length > 0) {
            setMatrixRows(
              rows.map((m: any) => ({
                id: m.id,
                minQty: m.minQty,
                maxQty: m.maxQty,
                unitPrice: m.unitPrice,
                attributeCombination: m.attributeCombination || {},
                isExcluded: Boolean(
                  m.attributeCombination?.isExcluded || m.attributeCombination?.status === 'EXCLUDED'
                ),
                status: m.attributeCombination?.isExcluded ? 'EXCLUDED' : 'ACTIVE',
                label: m.attributeCombination?.label,
                discountPercent: m.attributeCombination?.discountPercent,
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [productId, isNew, matrixRows.length]);

  // 6. DYNAMIC GROUP-BASED ADDITIONAL PRICING
  const [additionalPricingRows, setAdditionalPricingRows] = useState<ProductAdditionalPricingTier[]>(
    initialProduct?.additionalPricings || []
  );

  // Load existing additional pricing if not populated
  useEffect(() => {
    if (productId && !isNew && additionalPricingRows.length === 0) {
      api
        .adminGetAdditionalPricing(productId)
        .then((tiers) => {
          if (tiers && tiers.length > 0) {
            setAdditionalPricingRows(tiers);
          }
        })
        .catch(() => {});
    }
  }, [productId, isNew, additionalPricingRows.length]);

  // Unsaved changes browser warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Cancel Handler
  const handleCancelClick = () => {
    if (isDirty && !confirm('You have unsaved changes. Discard and exit Product Setup Studio?')) {
      return;
    }
    if (onCancel) {
      onCancel();
    } else {
      router.push('/admin/products');
    }
  };

  // Save Product Handler
  const handleSaveProduct = async (intendedStatus: 'DRAFT' | 'PUBLISHED' = 'DRAFT') => {
    if (!name.trim()) {
      setActiveTab('BASICS');
      setSaveError('Product title is required.');
      return;
    }
    let finalSku = sku.trim();
    if (!finalSku) {
      finalSku = getNextAvailableProductSku(existingProducts);
      setSku(finalSku);
    }
    if (!slug.trim()) {
      setActiveTab('BASICS');
      setSaveError('Product URL slug is required.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      sku: finalSku,
      categoryId,
      status: intendedStatus,
      basePrice: Number(basePrice) || 0,
      pricingModel,
      minQuantity: Number(minQuantity) || 1,
      quantityStep: typeof quantityStep === 'number' ? quantityStep : (Number(quantityStep) >= 0 ? Number(quantityStep) : (pricingModel === 'BULK_RANGE' ? 0 : 100)),
      maxQuantity: Number(maxQuantity) || 100000,
      productionDays: Number(productionDays) || 2,
      description: description.trim(),
      defaultSize: defaultSize.trim() || undefined,
      isFeatured,

      // Logistics
      shippingChargeType,
      courierCharge: Number(courierCharge) || 0,
      freeShippingThreshold: Number(freeShippingThreshold) || 1000,
      allowCod,
      codSurcharge: Number(codSurcharge) || 50,

      // Media
      images: images.map((img, idx) => ({
        url: img.url,
        storageKey: img.storageKey,
        altText: img.altText || name,
        sortOrder: idx,
        isPrimary: img.isPrimary,
      })),

      // Variant Ordering
      allowMultipleVariants,
      variantDimensions,

      // Option Groups
      optionGroups: optionGroups.map((g, idx) => ({
        reusableGroupId: g.reusableGroupId || null,
        name: g.name.trim(),
        code: g.code.trim(),
        inputType: g.inputType || 'SELECT',
        selectionBehavior: g.selectionBehavior || 'SINGLE',
        description: g.description,
        isRequired: g.isRequired,
        isCustomerVisible: g.isCustomerVisible,
        enableAdditionalPricing: Boolean(g.enableAdditionalPricing),
        sortOrder: idx,
        isActive: g.isActive,
        options: g.options.map((opt, oIdx) => ({
          label: opt.label.trim(),
          value: opt.value.trim(),
          priceModifierType: opt.priceModifierType || 'FIXED',
          priceModifier: Number(opt.priceModifier) || 0,
          sortOrder: oIdx,
          isDefault: opt.isDefault,
          isActive: opt.isActive !== false,
          fileCount: opt.fileCount || 0,
          fileSlotLabels: opt.fileSlotLabels || [],
          minMegapixels: opt.minMegapixels,
        })),
      })),

      // Rules
      configurationRules: rules.map((r) => ({
        name: r.name,
        conditionGroupCode: r.conditionGroupCode,
        conditionOperator: r.conditionOperator || 'IN',
        conditionOptionValue: r.conditionOptionValue,
        actionType: r.actionType,
        targetGroupCode: r.targetGroupCode || null,
        targetOptionValue: r.targetOptionValue || null,
        actionPayload: r.actionPayload || null,
        isActive: r.isActive,
      })),

      // Artwork
      artworkRequirement,
      artworkFileFormats,
      maxArtworkFileSizeMb,
      minimumArtworkMegapixels,
      designServiceRequirement,
      designServiceFee: Number(designServiceFee) || 0,

      // Enterprise Shipping Weight Configuration
      unitWeightGrams: Number(unitWeightGrams) || 0,
      packagingProfileId: packagingProfileId || null,
      isShippable,
      bulkTierWeights: bulkTierWeights || [],

      // Personalization Template
      personalizationTemplateId: personalizationTemplateId || null,
      personalizationConfig: personalizationConfig || null,
    };

    try {
      let saved: DynamicProduct;
      if (isNew || !productId) {
        saved = await api.adminCreateProduct(payload);
        setProductId(saved.id);
      } else {
        saved = await api.adminUpdateProduct(productId, payload);
      }

      // Persist Combination Pricing Matrix if configured
      if (matrixRows.length > 0) {
        await api.adminSavePricingMatrix(saved.id, {
          rows: matrixRows.map((r) => ({
            minQty: Number(r.minQty) || 1,
            maxQty: Number(r.maxQty) || Number(r.minQty) || 1,
            unitPrice: Number(r.unitPrice) || 0,
            attributeCombination: r.attributeCombination,
            isExcluded: Boolean(r.isExcluded || r.status === 'EXCLUDED'),
            label: r.label,
            discountPercent: r.discountPercent,
          })),
        });
      }

      // Persist Group-Based Dynamic Additional Pricing
      if (additionalPricingRows.length > 0) {
        await api.adminSaveAdditionalPricing(saved.id, {
          tiers: additionalPricingRows.map((t) => ({
            groupCode: t.groupCode,
            optionValue: t.optionValue,
            minQty: Number(t.minQty) || 1,
            maxQty: Number(t.maxQty) || Number(t.minQty) || 1,
            unitPrice: Number(t.unitPrice) || 0,
            chargeBasis: t.chargeBasis || 'PER_UNIT',
            isExcluded: Boolean(t.isExcluded),
          })),
        });
      }

      setStatus(intendedStatus);
      setIsDirty(false);
      setSaveSuccess(
        `Product "${saved.name}" successfully saved as ${intendedStatus} with native pricing matrix.`
      );

      if (onSaved) {
        onSaved(saved);
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save product configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const TABS: { id: StudioTab; label: string; number: number }[] = [
    { id: 'BASICS', label: '1. Basic Details', number: 1 },
    { id: 'OPTIONS', label: '2. Groups & Choices', number: 2 },
    { id: 'RULES', label: '3. Option Dependencies & Rules', number: 3 },
    { id: 'ARTWORK', label: '4. Artwork Upload & Design Matrix', number: 4 },
    { id: 'PRICING', label: '5. Pricing', number: 5 },
    { id: 'REVIEW', label: '6. Review & Publish', number: 6 },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Full-Width Header Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancelClick}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Return to Catalogue"
            >
              <RiArrowLeftLine className="w-5 h-5" />
            </button>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {name ? name : isNew ? 'Create New Printing Product' : 'Product Setup Studio'}
            </h1>

            {sku && (
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                {sku}
              </span>
            )}

            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                status === 'PUBLISHED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}
            >
              {status}
            </span>

            {isDirty && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-8">
            Commercial print specifications, modular option groups, compatibility logic, and native combination matrix pricing.
          </p>
        </div>

        {/* Global Save Actions */}
        <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
          <button
            type="button"
            onClick={handleCancelClick}
            className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveProduct('DRAFT')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2 rounded-lg border border-slate-300 shadow-2xs transition active:scale-95 disabled:opacity-50"
          >
            <RiSaveLine className="w-4 h-4 text-slate-600" />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveProduct('PUBLISHED')}
            className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] font-bold text-xs px-4 py-2 rounded-lg border border-[#E3A008]/40 shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <RiSparklingFill className="w-4 h-4 text-amber-700" />
            <span>Publish Product</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {saveError && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <RiErrorWarningLine className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{saveError}</span>
          </div>
          <button type="button" onClick={() => setSaveError(null)} className="text-rose-500 hover:text-rose-800">
            <RiCloseLine className="w-4 h-4" />
          </button>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <RiCheckLine className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{saveSuccess}</span>
          </div>
          <button type="button" onClick={() => setSaveSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
            <RiCloseLine className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Studio Stage Tab Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-1.5 shadow-2xs flex overflow-x-auto gap-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center whitespace-nowrap ${
                isActive
                  ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Stage Body */}
      <div className="w-full">
        {activeTab === 'BASICS' && (
          <StudioTabBasics
            name={name}
            setName={setName}
            slug={slug}
            setSlug={setSlug}
            sku={sku}
            setSku={setSku}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            categories={categories}
            existingProducts={existingProducts}
            status={status}
            setStatus={setStatus}
            basePrice={basePrice}
            setBasePrice={setBasePrice}
            pricingModel={pricingModel}
            setPricingModel={setPricingModel}
            minQuantity={minQuantity}
            setMinQuantity={setMinQuantity}
            quantityStep={quantityStep}
            setQuantityStep={setQuantityStep}
            maxQuantity={maxQuantity}
            setMaxQuantity={setMaxQuantity}
            matrixRows={matrixRows}
            setMatrixRows={setMatrixRows}
            productionDays={productionDays}
            setProductionDays={setProductionDays}
            description={description}
            setDescription={setDescription}
            defaultSize={defaultSize}
            setDefaultSize={setDefaultSize}
            isFeatured={isFeatured}
            setIsFeatured={setIsFeatured}
            shippingChargeType={shippingChargeType}
            setShippingChargeType={(v: any) => setShippingChargeType(v)}
            courierCharge={courierCharge}
            setCourierCharge={setCourierCharge}
            freeShippingThreshold={freeShippingThreshold}
            setFreeShippingThreshold={setFreeShippingThreshold}
            allowCod={allowCod}
            setAllowCod={setAllowCod}
            codSurcharge={codSurcharge}
            setCodSurcharge={setCodSurcharge}
            images={images}
            setImages={setImages}
            isNew={isNew}
            productId={productId}
            artworkRequirement={artworkRequirement}
            setArtworkRequirement={setArtworkRequirement}
            artworkFileFormats={artworkFileFormats}
            setArtworkFileFormats={setArtworkFileFormats}
            maxArtworkFileSizeMb={maxArtworkFileSizeMb}
            setMaxArtworkFileSizeMb={setMaxArtworkFileSizeMb}
            minimumArtworkMegapixels={minimumArtworkMegapixels}
            setMinimumArtworkMegapixels={setMinimumArtworkMegapixels}
            designServiceRequirement={designServiceRequirement}
            setDesignServiceRequirement={setDesignServiceRequirement}
            designServiceFee={designServiceFee}
            setDesignServiceFee={setDesignServiceFee}
            onNavigateToTab={setActiveTab}
            onChange={markDirty}
          />
        )}

        {activeTab === 'OPTIONS' && (
          <StudioTabOptions
            productId={productId}
            optionGroups={optionGroups}
            setOptionGroups={setOptionGroups}
            allowMultipleVariants={allowMultipleVariants}
            setAllowMultipleVariants={setAllowMultipleVariants}
            variantDimensions={variantDimensions}
            setVariantDimensions={setVariantDimensions}
            matrixRows={matrixRows}
            setMatrixRows={setMatrixRows}
            basePrice={basePrice}
            minQuantity={minQuantity}
            pricingModel={pricingModel}
            rules={rules}
            defaultSize={defaultSize}
            personalizationTemplateId={personalizationTemplateId}
            setPersonalizationTemplateId={(val) => {
              setPersonalizationTemplateId(val);
              markDirty();
            }}
            personalizationConfig={personalizationConfig}
            setPersonalizationConfig={(val) => {
              setPersonalizationConfig(val);
              markDirty();
            }}
            onChange={markDirty}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'RULES' && (
          <StudioTabRules
            rules={rules}
            setRules={setRules}
            optionGroups={optionGroups}
            onNavigateToTab={setActiveTab}
            onChange={markDirty}
          />
        )}

        {activeTab === 'ARTWORK' && (
          <StudioTabArtworkConditions
            rules={rules}
            setRules={setRules}
            optionGroups={optionGroups}
            artworkRequirement={artworkRequirement}
            setArtworkRequirement={setArtworkRequirement}
            artworkFileFormats={artworkFileFormats}
            setArtworkFileFormats={setArtworkFileFormats}
            maxArtworkFileSizeMb={maxArtworkFileSizeMb}
            setMaxArtworkFileSizeMb={setMaxArtworkFileSizeMb}
            minimumArtworkMegapixels={minimumArtworkMegapixels}
            setMinimumArtworkMegapixels={setMinimumArtworkMegapixels}
            designServiceRequirement={designServiceRequirement}
            setDesignServiceRequirement={setDesignServiceRequirement}
            designServiceFee={designServiceFee}
            setDesignServiceFee={setDesignServiceFee}
            onNavigateToTab={setActiveTab}
            onChange={markDirty}
          />
        )}

        {activeTab === 'PRICING' && (
          <StudioTabPricing
            productId={productId}
            pricingModel={pricingModel}
            setPricingModel={setPricingModel}
            basePrice={basePrice}
            setBasePrice={setBasePrice}
            minQuantity={minQuantity}
            setMinQuantity={setMinQuantity}
            maxQuantity={maxQuantity}
            quantityStep={quantityStep}
            setQuantityStep={setQuantityStep}
            optionGroups={optionGroups}
            setOptionGroups={setOptionGroups}
            rules={rules}
            matrixRows={matrixRows}
            setMatrixRows={setMatrixRows}
            additionalPricingRows={additionalPricingRows}
            setAdditionalPricingRows={setAdditionalPricingRows}
            designServiceRequirement={designServiceRequirement}
            designServiceFee={designServiceFee}
            artworkRequirement={artworkRequirement}
            artworkFileFormats={artworkFileFormats}
            defaultSize={defaultSize}
            unitWeightGrams={unitWeightGrams}
            setUnitWeightGrams={setUnitWeightGrams}
            packagingProfileId={packagingProfileId}
            setPackagingProfileId={setPackagingProfileId}
            isShippable={isShippable}
            setIsShippable={setIsShippable}
            bulkTierWeights={bulkTierWeights}
            setBulkTierWeights={setBulkTierWeights}
            onNavigateToTab={setActiveTab}
            onChange={markDirty}
          />
        )}

        {activeTab === 'REVIEW' && (
          <StudioTabReview
            name={name}
            sku={sku}
            slug={slug}
            categoryId={categoryId}
            categories={categories}
            status={status}
            basePrice={basePrice}
            pricingModel={pricingModel}
            minQuantity={minQuantity}
            maxQuantity={maxQuantity}
            productionDays={productionDays}
            imagesCount={images.length}
            optionGroups={optionGroups}
            rules={rules}
            artworkRequirement={artworkRequirement}
            artworkFileFormats={artworkFileFormats}
            designServiceRequirement={designServiceRequirement}
            designServiceFee={designServiceFee}
            matrixRows={matrixRows}
            additionalPricingRows={additionalPricingRows}
            onNavigateToTab={setActiveTab}
            onSaveDraft={() => handleSaveProduct('DRAFT')}
            onPublish={() => handleSaveProduct('PUBLISHED')}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}
