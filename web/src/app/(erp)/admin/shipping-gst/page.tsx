'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Percent,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  MapPin,
  ShieldCheck,
  Scale,
  Layers,
  Calculator,
  Package,
  Sparkles,
} from 'lucide-react';
import {
  RiTruckLine,
  RiPercentLine,
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiAlertLine,
  RiSearch2Line,
  RiScalesLine,
  RiStackLine,
  RiMapPinLine,
  RiCalculatorLine,
  RiCheckLine,
  RiShoppingBag3Line,
} from 'react-icons/ri';
import {
  api,
  ShippingGstSettings,
  ShippingZone,
  ShippingTaxCalculationResult,
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button, Modal } from '@/components/ui';

type ActiveTab = 'global' | 'location' | 'products' | 'calculator';

export interface QuantityCourierSlab {
  minQty: number;
  maxQty?: number;
  charge: number;
}

interface ProductShippingItem {
  id: string;
  categoryId?: string;
  name: string;
  slug: string;
  sku: string;
  categoryName: string;
  basePrice: number;
  shippingChargeType: 'DEFAULT' | 'FIXED' | 'FREE' | 'QUANTITY_BASED' | 'WEIGHT_BASED';
  unitWeightGrams: number;
  courierCharge: number;
  perAdditionalQtyRate: number;
  freeShippingThreshold: number;
  quantityStep: number;
  quantityCourierSlabs?: QuantityCourierSlab[];
}

export default function AdminShippingGstPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('global');

  // Loading & Global Status
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Core & Courier Global Settings Form State
  const [baseShippingFee, setBaseShippingFee] = useState<number | ''>(150);
  const [gstRate, setGstRate] = useState<number | ''>(18);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | ''>(2000);
  const [isFreeShippingEnabled, setIsFreeShippingEnabled] = useState(true);

  // Weight-wise Settings
  const [enableWeightCharges, setEnableWeightCharges] = useState(true);
  const [baseWeightKg, setBaseWeightKg] = useState<number | ''>(1.0);
  const [weightRatePerKg, setWeightRatePerKg] = useState<number | ''>(50.0);

  // Quantity-wise Settings
  const [enableQuantityCharges, setEnableQuantityCharges] = useState(true);
  const [quantityStep, setQuantityStep] = useState<number | ''>(500);
  const [quantitySurchargePerStep, setQuantitySurchargePerStep] = useState<number | ''>(30.0);

  // Regional Pincode Zones State
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [modalZoneName, setModalZoneName] = useState('');
  const [modalPincodePrefix, setModalPincodePrefix] = useState('');
  const [modalShippingCharge, setModalShippingCharge] = useState<number | ''>('');
  const [modalIsActive, setModalIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSavingZone, setIsSavingZone] = useState(false);

  // Delete Confirmation State
  const [zoneToDelete, setZoneToDelete] = useState<ShippingZone | null>(null);
  const [isDeletingZone, setIsDeletingZone] = useState(false);

  // Category-Level Courier Configuration State
  const [productShippingList, setProductShippingList] = useState<ProductShippingItem[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Category Courier Modal State
  const [isBatchCategoryModalOpen, setIsBatchCategoryModalOpen] = useState(false);
  const [batchTargetCategoryId, setBatchTargetCategoryId] = useState('');
  const [batchShippingType, setBatchShippingType] = useState<
    'DEFAULT' | 'FIXED' | 'FREE' | 'QUANTITY_BASED' | 'WEIGHT_BASED'
  >('DEFAULT');
  const [batchCourierCharge, setBatchCourierCharge] = useState<number | ''>(100);
  const [batchQuantitySlabs, setBatchQuantitySlabs] = useState<QuantityCourierSlab[]>([
    { minQty: 100, charge: 50 },
    { minQty: 250, charge: 80 },
    { minQty: 500, charge: 120 },
    { minQty: 1000, charge: 200 },
  ]);
  const [isSavingBatchCategory, setIsSavingBatchCategory] = useState(false);
  const [batchModalError, setBatchModalError] = useState<string | null>(null);

  // Live Calculator Simulator State
  const [simSubtotal, setSimSubtotal] = useState<number | ''>(1500);
  const [simPincode, setSimPincode] = useState('400001');
  const [simQuantity, setSimQuantity] = useState<number | ''>(500);
  const [simWeightKg, setSimWeightKg] = useState<number | ''>(1.25);
  const [simResult, setSimResult] = useState<ShippingTaxCalculationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load All Data
  const loadAllData = async () => {
    setIsLoading(true);
    setSettingsError(null);
    try {
      const [settingsRes, zonesRes, productsRes] = await Promise.all([
        api.getShippingGstSettings(),
        api.listShippingZones(),
        api.listProductShippingSettings().catch(() => []),
      ]);

      if (settingsRes) {
        setBaseShippingFee(settingsRes.baseShippingFee);
        setGstRate(settingsRes.gstRate);
        setFreeShippingThreshold(settingsRes.freeShippingThreshold);
        setIsFreeShippingEnabled(settingsRes.isFreeShippingEnabled);
        setEnableWeightCharges(settingsRes.enableWeightCharges ?? true);
        setBaseWeightKg(settingsRes.baseWeightKg ?? 1.0);
        setWeightRatePerKg(settingsRes.weightRatePerKg ?? 50.0);
        setEnableQuantityCharges(settingsRes.enableQuantityCharges ?? true);
        setQuantityStep(settingsRes.quantityStep ?? 500);
        setQuantitySurchargePerStep(settingsRes.quantitySurchargePerStep ?? 30.0);
      }

      setZones(zonesRes || []);
      setProductShippingList(productsRes || []);
    } catch (err: any) {
      console.error('Failed to load Shipping & GST data:', err);
      setSettingsError(err?.message || 'Failed to load settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Save Global Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);

    const baseFeeNum = Number(baseShippingFee);
    const gstRateNum = Number(gstRate);
    const thresholdNum = Number(freeShippingThreshold);
    const baseWeightNum = Number(baseWeightKg);
    const weightRateNum = Number(weightRatePerKg);
    const qStepNum = Number(quantityStep);
    const qSurchargeNum = Number(quantitySurchargePerStep);

    if (isNaN(baseFeeNum) || baseFeeNum < 0) {
      setSettingsError('Default Base Shipping Fee must be a valid non-negative number.');
      return;
    }
    if (isNaN(gstRateNum) || gstRateNum < 0 || gstRateNum > 100) {
      setSettingsError('GST Tax Rate must be between 0% and 100%.');
      return;
    }
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      setSettingsError('Free Shipping Threshold must be a non-negative amount.');
      return;
    }

    setIsSavingSettings(true);
    try {
      const updated = await api.updateShippingGstSettings({
        baseShippingFee: baseFeeNum,
        gstRate: gstRateNum,
        freeShippingThreshold: thresholdNum,
        isFreeShippingEnabled,
        enableWeightCharges,
        baseWeightKg: baseWeightNum,
        weightRatePerKg: weightRateNum,
        enableQuantityCharges,
        quantityStep: qStepNum,
        quantitySurchargePerStep: qSurchargeNum,
      });

      setBaseShippingFee(updated.baseShippingFee);
      setGstRate(updated.gstRate);
      setFreeShippingThreshold(updated.freeShippingThreshold);
      setIsFreeShippingEnabled(updated.isFreeShippingEnabled);
      setEnableWeightCharges(updated.enableWeightCharges ?? true);
      setBaseWeightKg(updated.baseWeightKg ?? 1.0);
      setWeightRatePerKg(updated.weightRatePerKg ?? 50.0);
      setEnableQuantityCharges(updated.enableQuantityCharges ?? true);
      setQuantityStep(updated.quantityStep ?? 500);
      setQuantitySurchargePerStep(updated.quantitySurchargePerStep ?? 30.0);

      setSettingsSuccess('Courier charges and GST settings saved successfully & applied to checkout pricing engine.');
      setTimeout(() => setSettingsSuccess(null), 4000);
    } catch (err: any) {
      setSettingsError(err?.message || 'Failed to save settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Open Add Zone Modal
  const handleOpenAddZone = () => {
    setEditingZoneId(null);
    setModalZoneName('');
    setModalPincodePrefix('');
    setModalShippingCharge('');
    setModalIsActive(true);
    setModalError(null);
    setIsZoneModalOpen(true);
  };

  // Open Edit Zone Modal
  const handleOpenEditZone = (zone: ShippingZone) => {
    setEditingZoneId(zone.id);
    setModalZoneName(zone.zoneName);
    setModalPincodePrefix(zone.pincodePrefix);
    setModalShippingCharge(zone.shippingCharge);
    setModalIsActive(zone.isActive);
    setModalError(null);
    setIsZoneModalOpen(true);
  };

  // Save Zone
  const handleSaveZoneModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalZoneName.trim()) {
      setModalError('Region/Zone name is required.');
      return;
    }

    const cleanPrefix = modalPincodePrefix.trim();
    if (!cleanPrefix || !/^[0-9]{1,6}$/.test(cleanPrefix)) {
      setModalError('Pincode or prefix must be 1 to 6 numeric digits (e.g. 56 or 560001).');
      return;
    }

    const chargeNum = Number(modalShippingCharge);
    if (isNaN(chargeNum) || chargeNum < 0) {
      setModalError('Shipping charge must be a non-negative amount.');
      return;
    }

    const duplicate = zones.find(
      (z) => z.pincodePrefix === cleanPrefix && z.id !== editingZoneId,
    );
    if (duplicate) {
      setModalError(`A zone for pincode prefix '${cleanPrefix}' already exists (${duplicate.zoneName}).`);
      return;
    }

    setIsSavingZone(true);
    try {
      if (editingZoneId) {
        const updated = await api.updateShippingZone(editingZoneId, {
          zoneName: modalZoneName.trim(),
          pincodePrefix: cleanPrefix,
          shippingCharge: chargeNum,
          isActive: modalIsActive,
        });
        setZones((prev) => prev.map((z) => (z.id === editingZoneId ? updated : z)));
      } else {
        const created = await api.createShippingZone({
          zoneName: modalZoneName.trim(),
          pincodePrefix: cleanPrefix,
          shippingCharge: chargeNum,
          isActive: modalIsActive,
        });
        setZones((prev) => [created, ...prev]);
      }
      setIsZoneModalOpen(false);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save shipping zone.');
    } finally {
      setIsSavingZone(false);
    }
  };

  // Delete Zone
  const handleDeleteZone = async () => {
    if (!zoneToDelete) return;
    setIsDeletingZone(true);
    try {
      await api.deleteShippingZone(zoneToDelete.id);
      setZones((prev) => prev.filter((z) => z.id !== zoneToDelete.id));
      setZoneToDelete(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete shipping zone.');
    } finally {
      setIsDeletingZone(false);
    }
  };

  // Aggregated Category-Level Courier List
  const categoryShippingList = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        productCount: number;
        shippingChargeType: 'DEFAULT' | 'FIXED' | 'FREE' | 'QUANTITY_BASED' | 'WEIGHT_BASED';
        courierCharge: number;
        quantityCourierSlabs: QuantityCourierSlab[];
      }
    >();

    for (const p of productShippingList) {
      const catId = p.categoryId || 'uncategorized';
      const catName = p.categoryName || 'General';
      const existing = map.get(catId);
      if (!existing) {
        map.set(catId, {
          id: catId,
          name: catName,
          productCount: 1,
          shippingChargeType: p.shippingChargeType || 'DEFAULT',
          courierCharge: p.courierCharge || 0,
          quantityCourierSlabs: p.quantityCourierSlabs || [],
        });
      } else {
        existing.productCount += 1;
        if (
          existing.shippingChargeType === 'DEFAULT' &&
          p.shippingChargeType &&
          p.shippingChargeType !== 'DEFAULT'
        ) {
          existing.shippingChargeType = p.shippingChargeType;
          existing.courierCharge = p.courierCharge || 0;
          existing.quantityCourierSlabs = p.quantityCourierSlabs || [];
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [productShippingList]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return categoryShippingList;
    const q = categorySearchQuery.toLowerCase();
    return categoryShippingList.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [categoryShippingList, categorySearchQuery]);

  // Quantity Slab manipulation helpers
  const handleAddSlab = () => {
    setBatchQuantitySlabs((prev) => {
      const last = prev[prev.length - 1];
      const nextMin = last ? (last.maxQty ? last.maxQty + 1 : last.minQty + 250) : 100;
      const nextCharge = last ? Math.round(last.charge * 1.5) : 50;
      return [...prev, { minQty: nextMin, charge: nextCharge }];
    });
  };

  const handleRemoveSlab = (idx: number) => {
    setBatchQuantitySlabs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSlab = (
    idx: number,
    field: keyof QuantityCourierSlab,
    val: any,
  ) => {
    setBatchQuantitySlabs((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)),
    );
  };

  const handleAddQuickPreset = (minQty: number, charge: number) => {
    setBatchQuantitySlabs((prev) => {
      if (prev.some((s) => s.minQty === minQty)) return prev;
      return [...prev, { minQty, charge }].sort((a, b) => a.minQty - b.minQty);
    });
  };

  // Open Category Courier Configure Modal
  const handleOpenConfigureCategory = (cat: typeof categoryShippingList[0]) => {
    setBatchTargetCategoryId(cat.id === 'uncategorized' ? '' : cat.id);
    setBatchShippingType(
      cat.shippingChargeType === 'DEFAULT' ? 'QUANTITY_BASED' : cat.shippingChargeType,
    );
    setBatchCourierCharge(cat.courierCharge || 100);
    setBatchQuantitySlabs(
      cat.quantityCourierSlabs && cat.quantityCourierSlabs.length > 0
        ? cat.quantityCourierSlabs.map((s) => ({ ...s }))
        : [
            { minQty: 100, charge: 50 },
            { minQty: 250, charge: 80 },
            { minQty: 500, charge: 120 },
            { minQty: 1000, charge: 200 },
          ],
    );
    setBatchModalError(null);
    setIsBatchCategoryModalOpen(true);
  };

  // Reset Category back to Global Default Policy
  const handleResetCategoryToDefault = async (cat: typeof categoryShippingList[0]) => {
    if (cat.id === 'uncategorized') return;
    if (
      !confirm(
        `Reset all products in "${cat.name}" category to inherit the Global Store Courier Policy?`,
      )
    )
      return;

    try {
      await api.batchUpdateCategoryShippingSettings({
        categoryId: cat.id,
        shippingChargeType: 'DEFAULT',
        courierCharge: 0,
        quantityCourierSlabs: [],
      });

      setProductShippingList((prev) =>
        prev.map((item) =>
          item.categoryId === cat.id
            ? {
                ...item,
                shippingChargeType: 'DEFAULT',
                courierCharge: 0,
                quantityCourierSlabs: [],
              }
            : item,
        ),
      );
      setSettingsSuccess(`Category "${cat.name}" reset to Global Default Courier Policy.`);
      setTimeout(() => setSettingsSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to reset category courier settings.');
    }
  };

  // Category Courier Settings Save
  const handleSaveBatchCategoryShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchModalError(null);

    if (!batchTargetCategoryId) {
      setBatchModalError('Please select a target category.');
      return;
    }

    const targetCategory = categoryShippingList.find((c) => c.id === batchTargetCategoryId);

    setIsSavingBatchCategory(true);
    try {
      const payload = {
        categoryId: batchTargetCategoryId,
        shippingChargeType: batchShippingType,
        courierCharge: Number(batchCourierCharge) || 0,
        quantityCourierSlabs: batchQuantitySlabs,
      };

      const res = await api.batchUpdateCategoryShippingSettings(payload);

      setProductShippingList((prev) =>
        prev.map((item) => {
          if (item.categoryId === batchTargetCategoryId) {
            return {
              ...item,
              shippingChargeType: batchShippingType,
              courierCharge: Number(batchCourierCharge) || 0,
              quantityCourierSlabs: batchQuantitySlabs,
            };
          }
          return item;
        }),
      );

      setIsBatchCategoryModalOpen(false);
      setSettingsSuccess(
        `Courier rules successfully applied to category '${
          targetCategory?.name || batchTargetCategoryId
        }' (${res.updatedCount} products updated).`,
      );
      setTimeout(() => setSettingsSuccess(null), 4000);
    } catch (err: any) {
      setBatchModalError(err?.message || 'Failed to update category courier settings.');
    } finally {
      setIsSavingBatchCategory(false);
    }
  };

  // Run Live Calculator Simulation
  const handleRunSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSimulating(true);
    try {
      const res = await api.calculateShippingAndTax({
        subtotal: Number(simSubtotal) || 0,
        postalCode: simPincode,
        deliveryMethod: 'COURIER',
        totalQuantity: Number(simQuantity) || 500,
        totalWeightKg: Number(simWeightKg) || 1.25,
      });
      setSimResult(res);
    } catch (err: any) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'calculator' && !simResult) {
      handleRunSimulation();
    }
  }, [activeTab]);

  // Filtered Zones List
  const filteredZones = zones.filter((z) => {
    if (!zoneSearchQuery.trim()) return true;
    const q = zoneSearchQuery.toLowerCase();
    return (
      z.zoneName.toLowerCase().includes(q) ||
      z.pincodePrefix.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            <span>COMMERCIAL ADMINISTRATION</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">COURIER CHARGES & GST ENGINE</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Courier & Delivery Charges Configuration
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Configure baseline delivery rates, GST tax rules, and location-based courier charges alongside product-level settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSavingSettings || isLoading}
            isLoading={isSavingSettings}
            variant="primary"
            size="md"
            className="shadow-sm font-semibold text-[13px]"
          >
            <Save className="h-4 w-4 mr-1.5" />
            <span>SAVE ALL RULES</span>
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {settingsSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[13px] font-medium rounded-lg flex items-center gap-2 shadow-xs transition-all">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{settingsSuccess}</span>
        </div>
      )}

      {settingsError && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-800 text-[13px] font-medium rounded-lg flex items-center gap-2 shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{settingsError}</span>
        </div>
      )}

      {/* 2. Top Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('global')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'global'
              ? 'border-slate-900 text-slate-900 font-bold bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Global Courier & GST</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('location')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'location'
              ? 'border-slate-900 text-slate-900 font-bold bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Location-Based Zones</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-mono text-slate-600">
            {zones.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'products'
              ? 'border-slate-900 text-slate-900 font-bold bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Category Courier Rules</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-mono text-slate-600">
            {categoryShippingList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'calculator'
              ? 'border-slate-900 text-slate-900 font-bold bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Calculator className="h-4 w-4" />
          <span>Live Calculator Simulator</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: GLOBAL COURIER & GST RULES */}
      {/* ============================================================ */}
      {activeTab === 'global' && (
        <div className="space-y-6 max-w-3xl">
          {/* Core Baseline Parameters */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-200">
                    <Truck className="h-4 w-4 text-slate-700" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">
                      Standard Courier & Tax Parameters
                    </h2>
                    <p className="text-[12px] text-slate-500">
                      Baseline delivery fee and Goods & Services Tax (GST) rate.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  CORE POLICY
                </span>
              </div>

              <div className="space-y-4">
                {/* Base Shipping Fee */}
                <div>
                  <label className="text-[13px] font-semibold text-slate-800 block mb-1">
                    Default Base Delivery Charge (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-semibold">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={baseShippingFee}
                      onChange={(e) => setBaseShippingFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="e.g. 150"
                      className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Standard fallback courier charge applied for non-zoned locations and orders within base weight.
                  </p>
                </div>

                {/* GST Tax Rate */}
                <div>
                  <label className="text-[13px] font-semibold text-slate-800 block mb-1">
                    GST Tax Rate (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      value={gstRate}
                      onChange={(e) => setGstRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="e.g. 18"
                      className="w-full h-10 px-3 pr-8 bg-white border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-semibold">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Standard GST rate (e.g. 18% = 9% CGST + 9% SGST intra-state, 18% IGST inter-state).
                  </p>
                </div>

                {/* Free Shipping Threshold */}
                <div>
                  <label className="text-[13px] font-semibold text-slate-800 block mb-1">
                    Free Delivery Threshold (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-semibold">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={freeShippingThreshold}
                      onChange={(e) => setFreeShippingThreshold(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="e.g. 2000"
                      className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Cart value required to unlock 100% free delivery across standard shipments.
                  </p>
                </div>

                {/* Toggle Free Shipping */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isFreeShippingEnabled}
                      onChange={(e) => setIsFreeShippingEnabled(e.target.checked)}
                      className="h-4 w-4 mt-0.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                    />
                    <div>
                      <span className="text-[13px] font-bold text-slate-900 block">
                        Enable Automatic Free Shipping Threshold
                      </span>
                      <span className="text-[12px] text-slate-500 block mt-0.5">
                        When enabled, courier charges automatically zero out at checkout when order reaches {formatCurrency(Number(freeShippingThreshold || 0))}.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: LOCATION-BASED PINCODE ZONES */}
      {/* ============================================================ */}
      {activeTab === 'location' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Regional Pincode Zone Rates</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                    {zones.length} {zones.length === 1 ? 'Zone' : 'Zones'}
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Location-based courier fees for delivery pincodes and regional hubs. Longest matching prefix takes precedence.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search filter */}
              <div className="relative w-60">
                <RiSearch2Line className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={zoneSearchQuery}
                  onChange={(e) => setZoneSearchQuery(e.target.value)}
                  placeholder="Search zone or prefix..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleOpenAddZone}
                className="gap-1.5 font-bold text-xs"
              >
                <RiAddLine className="h-4 w-4" />
                <span>Add Shipping Zone</span>
              </Button>
            </div>
          </div>

          {/* Zones Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-mono font-semibold">
                <tr>
                  <th className="py-3 px-4">Zone / Region Name</th>
                  <th className="py-3 px-4">Pincode Prefix / Code</th>
                  <th className="py-3 px-4">Location Shipping Charge</th>
                  <th className="py-3 px-4">Matching Rule</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                      Loading shipping zones catalog...
                    </td>
                  </tr>
                ) : filteredZones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">
                          No regional shipping zones found
                        </span>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Deliveries fallback to the default base courier charge ({formatCurrency(Number(baseShippingFee || 0))}).
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleOpenAddZone}
                          className="mt-2"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          <span>Add First Zone</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredZones.map((zone) => {
                    const isExact = zone.pincodePrefix.length === 6;

                    return (
                      <tr key={zone.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{zone.zoneName}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 border border-slate-200">
                            {zone.pincodePrefix}
                            {!isExact && <span className="text-slate-400 font-normal">***</span>}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {zone.shippingCharge === 0 ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              FREE (₹0)
                            </span>
                          ) : (
                            <span>{formatCurrency(zone.shippingCharge)}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {isExact ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                              Exact 6-Digit Match
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                              {zone.pincodePrefix.length}-Digit Prefix Match
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {zone.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              Disabled
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditZone(zone)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit shipping zone"
                            >
                              <RiEditLine className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setZoneToDelete(zone)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete shipping zone"
                            >
                              <RiDeleteBinLine className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: CATEGORY COURIER CONFIGURATION RULES */}
      {/* ============================================================ */}
      {activeTab === 'products' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Category Courier Rules</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                  Configured by Category
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Courier rules and quantity slabs are configured per category. All products in a category inherit these delivery settings.
              </p>
            </div>

            {/* Filter and Action Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search Bar */}
              <div className="relative w-56 sm:w-64">
                <RiSearch2Line className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              {/* Configure Category Courier Button */}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  if (categoryShippingList.length > 0) {
                    handleOpenConfigureCategory(categoryShippingList[0]);
                  }
                }}
                className="h-9 px-3 gap-1.5 font-bold shadow-xs text-xs"
              >
                <RiStackLine className="h-4 w-4" />
                <span>Configure Category</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-mono font-semibold">
                <tr>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Courier Mode</th>
                  <th className="py-3 px-4">Custom Fee / Quantity Slabs</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-mono text-xs">
                      Loading categories...
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500 text-xs">
                      No categories found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => {
                    const slabs = cat.quantityCourierSlabs || [];

                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-purple-600 shrink-0" />
                            <span className="font-bold text-sm text-slate-900">{cat.name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-medium">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {cat.productCount} product{cat.productCount === 1 ? '' : 's'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              cat.shippingChargeType === 'FREE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : cat.shippingChargeType === 'FIXED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : cat.shippingChargeType === 'QUANTITY_BASED'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {cat.shippingChargeType || 'DEFAULT'}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-900">
                          {cat.shippingChargeType === 'FREE' ? (
                            <span className="text-emerald-700 font-bold">₹0 (Free Delivery)</span>
                          ) : cat.shippingChargeType === 'FIXED' ? (
                            <span className="font-bold">{formatCurrency(cat.courierCharge || 100)}</span>
                          ) : cat.shippingChargeType === 'QUANTITY_BASED' ? (
                            slabs.length > 0 ? (
                              <div className="flex flex-wrap gap-1 items-center">
                                {slabs.slice(0, 4).map((slab, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-800 border border-purple-200"
                                  >
                                    {slab.minQty} pcs: ₹{slab.charge}
                                  </span>
                                ))}
                                {slabs.length > 4 && (
                                  <span className="text-[10px] text-purple-600 font-mono font-semibold">
                                    +{slabs.length - 4} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-700 font-medium text-xs">
                                No slabs configured
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 font-normal">Inherits Global Store Policy</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenConfigureCategory(cat)}
                              className="text-xs gap-1 font-semibold hover:border-purple-300 hover:text-purple-700"
                            >
                              <RiEditLine className="h-3.5 w-3.5" />
                              <span>Configure</span>
                            </Button>
                            {cat.shippingChargeType !== 'DEFAULT' && (
                              <button
                                type="button"
                                onClick={() => handleResetCategoryToDefault(cat)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                                title="Reset to Global Default Policy"
                              >
                                <RiDeleteBinLine className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: LIVE CALCULATOR SIMULATOR */}
      {/* ============================================================ */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Inputs Column */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Calculator className="h-4 w-4 text-indigo-600" />
                <span>Live Courier & Tax Simulation</span>
              </h2>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Simulate any cart subtotal, delivery pincode, total quantity, and package weight to test rules.
              </p>
            </div>

            <form onSubmit={handleRunSimulation} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Cart Merchandise Subtotal (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={simSubtotal}
                  onChange={(e) => setSimSubtotal(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 1500"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Delivery Postal Code / PIN
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={simPincode}
                  onChange={(e) => setSimPincode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 400001 or 560001"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Order Quantity (Pcs)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={simQuantity}
                    onChange={(e) => setSimQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    placeholder="e.g. 500"
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Gross Weight (Kg)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.05"
                    value={simWeightKg}
                    onChange={(e) => setSimWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="e.g. 1.25"
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSimulating}
                isLoading={isSimulating}
                className="w-full mt-2 font-bold"
              >
                <span>Calculate Authoritative Quote</span>
              </Button>
            </form>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Simulation Breakdown Results</span>
              </span>
              {simResult?.isFreeShippingApplied && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ✓ Free Delivery Qualified
                </span>
              )}
            </h2>

            {simResult ? (
              <div className="space-y-4 text-xs">
                {/* Metric Strip */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Location Base Charge</span>
                    <span className="font-mono font-bold text-base text-slate-900 block mt-0.5">
                      {formatCurrency(simResult.locationCharge ?? simResult.baseShippingFee)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {simResult.matchedZone ? simResult.matchedZone.zoneName : 'Default Fallback'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Weight Surcharge</span>
                    <span className="font-mono font-bold text-base text-indigo-700 block mt-0.5">
                      {formatCurrency(simResult.weightCharge ?? 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {simResult.totalWeightKg} kg total
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Quantity Surcharge</span>
                    <span className="font-mono font-bold text-base text-amber-700 block mt-0.5">
                      {formatCurrency(simResult.quantityCharge ?? 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {simResult.totalQuantity} units
                    </span>
                  </div>
                </div>

                {/* Calculation Explainer */}
                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 text-indigo-950 font-mono text-[11px]">
                  <strong>Calculation Formula:</strong> {simResult.calculationBasis || 'Location Base + Surcharges'}
                </div>

                {/* Breakdown Summary */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2 font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Merchandise Subtotal:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(simResult.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Courier & Delivery Charge (Pre-tax):</span>
                    <span className={`font-bold ${simResult.shippingFee === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {simResult.shippingFee === 0 ? 'FREE (₹0.00)' : formatCurrency(simResult.shippingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST ({simResult.gstRatePercent}%):</span>
                    <span className="font-bold text-slate-900">{formatCurrency(simResult.gstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-200">
                    <span>Grand Total Payable:</span>
                    <span>{formatCurrency(simResult.grandTotal)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 font-mono text-xs">
                Click &ldquo;Calculate Authoritative Quote&rdquo; to simulate pricing.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD / EDIT ZONE MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isZoneModalOpen}
        onClose={() => setIsZoneModalOpen(false)}
        title={editingZoneId ? 'Edit Regional Shipping Zone' : 'Add Regional Shipping Zone'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveZoneModal} className="space-y-4 pt-2">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg flex items-center gap-2">
              <RiAlertLine className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-1">
              Zone / Region Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={modalZoneName}
              onChange={(e) => setModalZoneName(e.target.value)}
              placeholder="e.g. Mumbai Metropolitan Region, Karnataka Hub"
              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-1">
              Pincode or Pincode Prefix <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={modalPincodePrefix}
              onChange={(e) => setModalPincodePrefix(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 400 (prefix) or 560001 (exact)"
              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Enter 1–6 numeric digits. Prefix matching will apply to all matching delivery postal codes.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-1">
              Location Courier Charge (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-semibold">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={modalShippingCharge}
                onChange={(e) => setModalShippingCharge(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="e.g. 80"
                className="w-full h-9 pl-7 pr-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Enter 0 for free delivery in this specific regional zone.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={modalIsActive}
                onChange={(e) => setModalIsActive(e.target.checked)}
                className="h-4 w-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
              />
              <span className="text-xs font-semibold text-slate-800">Zone is Active</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsZoneModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingZone}
              isLoading={isSavingZone}
            >
              <span>{editingZoneId ? 'Save Changes' : 'Create Zone'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* CATEGORY COURIER CONFIGURATION MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isBatchCategoryModalOpen}
        onClose={() => setIsBatchCategoryModalOpen(false)}
        title="Configure Category Courier Rules"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveBatchCategoryShipping} className="space-y-4 pt-2">
          {batchModalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg flex items-center gap-2">
              <RiAlertLine className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{batchModalError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Category Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Target Category <span className="text-red-500">*</span>
              </label>
              <select
                value={batchTargetCategoryId}
                onChange={(e) => setBatchTargetCategoryId(e.target.value)}
                required
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
              >
                <option value="">-- Choose Category to Configure --</option>
                {categoryShippingList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.productCount} products)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Applied to all products in this category.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Courier Calculation Mode
              </label>
              <select
                value={batchShippingType}
                onChange={(e) => setBatchShippingType(e.target.value as any)}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
              >
                <option value="QUANTITY_BASED">QUANTITY_BASED (Multiple Quantity Slabs)</option>
                <option value="DEFAULT">DEFAULT (Store Global Policy)</option>
                <option value="FIXED">FIXED (Flat Rate Per Order)</option>
                <option value="FREE">FREE (Always Free Delivery)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Select delivery pricing policy.
              </p>
            </div>
          </div>

          {batchShippingType === 'FIXED' && (
            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Flat Courier Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={batchCourierCharge}
                onChange={(e) =>
                  setBatchCourierCharge(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                placeholder="e.g. 100"
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          )}

          {batchShippingType === 'QUANTITY_BASED' && (
            <div className="space-y-3">
              {/* Multiple Quantity Slabs */}
              <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <RiStackLine className="h-4 w-4 text-purple-600" />
                      <span>Category Quantity Slabs (e.g. 100 pcs = ₹50)</span>
                    </span>
                    <span className="text-[11px] text-purple-700 block">
                      These milestones will be assigned to all products in this category.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSlab}
                    className="h-7 text-[11px] px-2 bg-white text-purple-800 border-purple-300 font-bold hover:bg-purple-50"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    <span>Add Slab</span>
                  </Button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] font-mono text-purple-700 font-bold uppercase">
                    Quick Add:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddQuickPreset(100, 50)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-purple-900 border border-purple-300 hover:bg-purple-100 transition-colors shadow-2xs"
                  >
                    + 100 qty (₹50)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuickPreset(250, 80)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-purple-900 border border-purple-300 hover:bg-purple-100 transition-colors shadow-2xs"
                  >
                    + 250 qty (₹80)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuickPreset(500, 120)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-purple-900 border border-purple-300 hover:bg-purple-100 transition-colors shadow-2xs"
                  >
                    + 500 qty (₹120)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuickPreset(1000, 200)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-purple-900 border border-purple-300 hover:bg-purple-100 transition-colors shadow-2xs"
                  >
                    + 1000 qty (₹200)
                  </button>
                </div>

                {/* Slabs List */}
                <div className="space-y-2 mt-2">
                  {batchQuantitySlabs.length === 0 ? (
                    <div className="p-3 bg-white rounded-lg border border-purple-100 text-center text-xs text-purple-700">
                      No custom quantity slabs added yet. Click &ldquo;Add Slab&rdquo; or use quick presets above.
                    </div>
                  ) : (
                    batchQuantitySlabs.map((slab, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-purple-200 text-xs shadow-2xs"
                      >
                        <div className="flex-1">
                          <span className="text-[10px] text-slate-500 font-medium block mb-1">
                            Min Qty
                          </span>
                          <input
                            type="number"
                            min="1"
                            value={slab.minQty}
                            onChange={(e) =>
                              handleUpdateSlab(
                                idx,
                                'minQty',
                                parseInt(e.target.value, 10) || 0,
                              )
                            }
                            className="w-full h-8 px-2.5 font-mono font-bold text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:border-purple-600"
                          />
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] text-slate-500 font-medium block mb-1">
                            Courier Charge (₹)
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={slab.charge}
                            onChange={(e) =>
                              handleUpdateSlab(
                                idx,
                                'charge',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-full h-8 px-2.5 font-mono font-bold text-purple-950 border border-slate-200 rounded-md bg-purple-50/50 focus:outline-none focus:border-purple-600"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSlab(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 mt-4 rounded-md hover:bg-red-50 transition-colors"
                          title="Remove slab"
                        >
                          <RiDeleteBinLine className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBatchCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingBatchCategory}
              isLoading={isSavingBatchCategory}
            >
              <span>Apply Courier Settings to Category</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!zoneToDelete}
        onClose={() => setZoneToDelete(null)}
        title="Confirm Zone Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete the shipping zone <strong>&ldquo;{zoneToDelete?.zoneName}&rdquo;</strong> (Pincode prefix: <strong>{zoneToDelete?.pincodePrefix}</strong>)?
          </p>
          <p className="text-[11px] text-slate-500">
            Deliveries to this prefix will revert to using the default base shipping fee ({formatCurrency(Number(baseShippingFee || 0))}).
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoneToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isDeletingZone}
              isLoading={isDeletingZone}
              onClick={handleDeleteZone}
            >
              <span>Delete Zone</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
