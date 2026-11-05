'use client';

import React, { useState, useEffect } from 'react';
import {
  RiCalculatorLine,
  RiCompass3Line,
  RiScales3Line,
  RiBox3Line,
  RiTruckLine,
  RiCheckboxCircleLine,
  RiAlertLine,
  RiShieldCheckLine,
  RiRefreshLine,
  RiInformationLine,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ShippingNavTabs } from '../components/ShippingNavTabs';

export default function ShippingCalculatorPage() {
  const [pincode, setPincode] = useState('110001');
  const [quantity, setQuantity] = useState<number>(1000);
  const [unitWeightGrams, setUnitWeightGrams] = useState<number>(2); // 2 grams per business card
  const [orderSubtotal, setOrderSubtotal] = useState<number>(450);
  const [selectedPackagingId, setSelectedPackagingId] = useState<string>('');

  const [packagingProfiles, setPackagingProfiles] = useState<any[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listPackagingProfiles(true).then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setPackagingProfiles(res);
        const def = res.find((p) => p.isDefault) || res[0];
        if (def) setSelectedPackagingId(def.id);
      }
    }).catch(() => {});
  }, []);

  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pincode || pincode.length !== 6) {
      setError('Please enter a valid 6-digit Indian PIN code');
      return;
    }

    setCalculating(true);
    setError(null);
    try {
      const res = await api.calculateShipping({
        destinationPincode: pincode.trim(),
        orderSubtotal: Number(orderSubtotal) || 0,
        items: [
          {
            quantity: Number(quantity) || 1,
            unitWeightGrams: Number(unitWeightGrams) || 2,
            packagingProfileId: selectedPackagingId || undefined,
          },
        ],
      });
      setCalcResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to calculate shipping rate');
      setCalcResult(null);
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    handleCalculate();
  }, [selectedPackagingId]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Diagnostic Shipping Calculator</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Test the live shipping calculation engine against any quantity, weight, tare packaging profile, and Indian 6-digit PIN code.
          </p>
        </div>
      </div>

      <ShippingNavTabs />

      {/* Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <RiCalculatorLine className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Shipment Parameters</h3>
          </div>

          <form onSubmit={handleCalculate} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Destination PIN Code (6 Digits)
              </label>
              <div className="relative">
                <RiCompass3Line className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 font-mono font-bold text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  placeholder="e.g. 110001"
                />
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                <span>Quick Test:</span>
                <button type="button" onClick={() => setPincode('160017')} className="underline hover:text-sky-600">160017 (Local)</button>
                <button type="button" onClick={() => setPincode('141001')} className="underline hover:text-sky-600">141001 (Reg.)</button>
                <button type="button" onClick={() => setPincode('400001')} className="underline hover:text-sky-600">400001 (Nat.)</button>
                <button type="button" onClick={() => setPincode('190001')} className="underline hover:text-sky-600">190001 (Remote)</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Order Quantity (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Weight per Unit (Grams)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={unitWeightGrams}
                  onChange={(e) => setUnitWeightGrams(parseFloat(e.target.value) || 0.01)}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Order Subtotal (₹) — For Free Shipping Test
              </label>
              <input
                type="number"
                min="0"
                value={orderSubtotal}
                onChange={(e) => setOrderSubtotal(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Free shipping triggers when subtotal &ge; configured threshold (default ₹999).
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Packaging Profile (Box Tare Weight)
              </label>
              <select
                value={selectedPackagingId}
                onChange={(e) => setSelectedPackagingId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                {packagingProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.weightGrams}g tare &bull; {p.lengthMm}&times;{p.widthMm}&times;{p.heightMm}mm)
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Packaging weight is added <strong>once</strong> to the shipment.
              </span>
            </div>

            <button
              type="submit"
              disabled={calculating}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RiRefreshLine className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
              {calculating ? 'Calculating Authoritative Rates...' : 'Calculate Shipping'}
            </button>
          </form>
        </div>

        {/* Breakdown Output Panel */}
        <div className="lg:col-span-7 space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <RiAlertLine className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {calcResult ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                      {calcResult.zoneCode} ZONE
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Destination: <strong>{calcResult.city || 'PIN'}, {calcResult.state || 'India'}</strong> ({calcResult.destinationPincode})
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Carrier Transit ETA: <strong className="text-slate-800">{calcResult.estimatedDeliveryDays || '2-4 Days'}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Shipping Fee</div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {calcResult.isFreeShipping ? (
                      <span className="text-emerald-600">FREE</span>
                    ) : (
                      formatCurrency(calcResult.finalShippingCharge)
                    )}
                  </div>
                  {calcResult.isFreeShipping && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      Free Shipping Qualified
                    </span>
                  )}
                </div>
              </div>

              {/* Weight Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-medium block">Net Product Weight</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {calcResult.breakdown?.netProductWeightGrams} g
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {quantity} &times; {unitWeightGrams}g
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-medium block">Packaging Tare</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {calcResult.breakdown?.packagingWeightGrams} g
                  </span>
                  <span className="text-[10px] text-slate-500 block">Added once</span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-medium block">Volumetric Weight</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm">
                    {calcResult.breakdown?.volumetricWeightGrams} g
                  </span>
                  <span className="text-[10px] text-slate-500 block">L&times;W&times;H / 5000</span>
                </div>

                <div className="p-2.5 bg-sky-50 rounded-lg border border-sky-200/80">
                  <span className="text-[10px] text-sky-700 font-medium block">Billable Weight</span>
                  <span className="font-mono font-bold text-sky-900 text-sm">
                    {calcResult.billableWeightGrams} g
                  </span>
                  <span className="text-[10px] text-sky-700 block">
                    {calcResult.billableWeightKg} kg
                  </span>
                </div>
              </div>

              {/* Cost Itemization Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 border-b border-slate-200 text-[11px] uppercase tracking-wide">
                  Authoritative Cost Itemization
                </div>
                <div className="divide-y divide-slate-100 p-1">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">Base Weight Slab</span>
                      <span className="text-slate-500 text-[11px] ml-2">
                        Matched Tier: 0 &ndash; {calcResult.matchedSlab?.toWeightGrams || 500}g
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      {formatCurrency(calcResult.breakdown?.baseSlabRate || 0)}
                    </span>
                  </div>

                  {calcResult.breakdown?.excessWeightCost > 0 && (
                    <div className="px-3 py-2 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">Excess Weight Charge</span>
                        <span className="text-slate-500 text-[11px] ml-2">
                          {calcResult.breakdown?.excessWeightGrams}g &times; rate card excess per kg
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        +{formatCurrency(calcResult.breakdown?.excessWeightCost)}
                      </span>
                    </div>
                  )}

                  {calcResult.breakdown?.zoneSurcharge > 0 && (
                    <div className="px-3 py-2 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">Special Zone Surcharge</span>
                        <span className="text-slate-500 text-[11px] ml-2">{calcResult.zoneName}</span>
                      </div>
                      <span className="font-mono font-bold text-amber-600">
                        +{formatCurrency(calcResult.breakdown?.zoneSurcharge)}
                      </span>
                    </div>
                  )}

                  {calcResult.isFreeShipping && (
                    <div className="px-3 py-2 flex items-center justify-between text-emerald-700 bg-emerald-50/50">
                      <div>
                        <span className="font-bold">Free Shipping Discount</span>
                        <span className="text-[11px] ml-2">(Subtotal &ge; Free Shipping Threshold)</span>
                      </div>
                      <span className="font-mono font-bold">
                        -{formatCurrency(calcResult.breakdown?.preDiscountShippingCharge || 0)}
                      </span>
                    </div>
                  )}

                  <div className="px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">Logistics GST (18%)</span>
                      <span className="text-slate-500 text-[11px] ml-2">Calculated on net logistics charge</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      {formatCurrency(calcResult.breakdown?.shippingTax || 0)}
                    </span>
                  </div>

                  <div className="px-3 py-2.5 flex items-center justify-between bg-slate-50/80 font-bold text-slate-900 border-t border-slate-200">
                    <span>Total Authoritative Shipping Cost</span>
                    <span className="font-mono text-sm text-sky-800">
                      {formatCurrency(calcResult.finalShippingCharge)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Serviceability info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <RiShieldCheckLine className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Serviceability: <strong>{calcResult.isServiceable ? 'Fully Serviceable' : 'Not Serviceable'}</strong>
                  </span>
                </div>
                <span>
                  Cash on Delivery: <strong>{calcResult.isCodAvailable ? 'Available' : 'Prepaid Only'}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs">
              Enter shipment parameters and click "Calculate Shipping" to view the authoritative rate breakdown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

