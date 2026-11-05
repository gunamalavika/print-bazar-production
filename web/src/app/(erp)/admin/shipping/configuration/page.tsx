'use client';

import React, { useState, useEffect } from 'react';
import {
  RiSettings4Line,
  RiSaveLine,
  RiRefreshLine,
  RiCheckboxCircleLine,
  RiAlertLine,
  RiMapPinLine,
  RiScales3Line,
  RiGiftLine,
  RiMoneyDollarCircleLine,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { ShippingNavTabs } from '../components/ShippingNavTabs';

export default function ShippingConfigurationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    originAddressLine1: 'Warehouse 4, Industrial Focal Point',
    originAddressLine2: 'Phase 7, Mohali',
    originCity: 'SAS Nagar',
    originState: 'Punjab',
    originPincode: '160055',
    originCountry: 'IN',
    defaultWeightUnit: 'g',
    defaultDimensionUnit: 'mm',
    volumetricDivisor: 5000,
    enableVolumetricWeight: true,
    freeShippingThreshold: 999,
    enableFreeShipping: true,
    shippingTaxRatePercent: 18,
    isTaxable: true,
    maxShipmentWeightKg: 100,
    roundWeightUpToNearestGrams: 50,
  });

  const fetchConfig = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.getShippingConfig();
      if (res && res.id) {
        setFormData({
          originAddressLine1: res.originAddressLine1 || '',
          originAddressLine2: res.originAddressLine2 || '',
          originCity: res.originCity || '',
          originState: res.originState || '',
          originPincode: res.originPincode || '',
          originCountry: res.originCountry || 'IN',
          defaultWeightUnit: res.defaultWeightUnit || 'g',
          defaultDimensionUnit: res.defaultDimensionUnit || 'mm',
          volumetricDivisor: res.volumetricDivisor || 5000,
          enableVolumetricWeight: res.enableVolumetricWeight !== false,
          freeShippingThreshold: res.freeShippingThreshold !== undefined ? Number(res.freeShippingThreshold) : 999,
          enableFreeShipping: res.enableFreeShipping !== false,
          shippingTaxRatePercent: res.shippingTaxRatePercent !== undefined ? Number(res.shippingTaxRatePercent) : 18,
          isTaxable: res.isTaxable !== false,
          maxShipmentWeightKg: res.maxShipmentWeightKg !== undefined ? Number(res.maxShipmentWeightKg) : 100,
          roundWeightUpToNearestGrams: res.roundWeightUpToNearestGrams !== undefined ? Number(res.roundWeightUpToNearestGrams) : 50,
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to load shipping configuration' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.updateShippingConfig(formData);
      setMessage({ type: 'success', text: 'Shipping configuration saved successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Global Shipping Configuration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized origin address, volumetric weight formulas, tax rates, and free shipping eligibility thresholds.
          </p>
        </div>
        <button
          onClick={fetchConfig}
          disabled={loading || saving}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition w-fit"
        >
          <RiRefreshLine className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Reset Form
        </button>
      </div>

      <ShippingNavTabs />

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <RiCheckboxCircleLine className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <RiAlertLine className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Origin Dispatch Hub */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <RiMapPinLine className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Origin Dispatch Address (Default Hub)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Address Line 1</label>
              <input
                type="text"
                name="originAddressLine1"
                value={formData.originAddressLine1}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Address Line 2 (Optional)</label>
              <input
                type="text"
                name="originAddressLine2"
                value={formData.originAddressLine2}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Origin City</label>
              <input
                type="text"
                name="originCity"
                value={formData.originCity}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Origin State</label>
              <input
                type="text"
                name="originState"
                value={formData.originState}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Origin PIN Code (6 digits)</label>
              <input
                type="text"
                maxLength={6}
                name="originPincode"
                value={formData.originPincode}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Origin Country Code</label>
              <input
                type="text"
                maxLength={2}
                name="originCountry"
                value={formData.originCountry}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 uppercase font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Weights & Volumetric Specs */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <RiScales3Line className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Weight & Volumetric Calculation Rules</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Volumetric Divisor</label>
              <input
                type="number"
                name="volumetricDivisor"
                value={formData.volumetricDivisor}
                onChange={handleChange}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Standard courier divisor (typically 5000 cm³/kg)</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Weight Rounding Step (grams)</label>
              <input
                type="number"
                name="roundWeightUpToNearestGrams"
                value={formData.roundWeightUpToNearestGrams}
                onChange={handleChange}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Round up to nearest interval (e.g. 50g)</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Max Shipment Weight (kg)</label>
              <input
                type="number"
                name="maxShipmentWeightKg"
                value={formData.maxShipmentWeightKg}
                onChange={handleChange}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Orders exceeding this cap require special freight quote</p>
            </div>
          </div>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                name="enableVolumetricWeight"
                checked={formData.enableVolumetricWeight}
                onChange={handleChange}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>Enable Volumetric Weight Comparison (Billable Weight = max(Actual + Packaging, Volumetric))</span>
            </label>
          </div>
        </div>

        {/* Free Shipping & Tax Settings */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <RiGiftLine className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Free Shipping & GST Configuration</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Free Shipping Promotion</span>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="enableFreeShipping"
                    checked={formData.enableFreeShipping}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Order Subtotal Threshold for Free Shipping (₹)
                </label>
                <input
                  type="number"
                  name="freeShippingThreshold"
                  value={formData.freeShippingThreshold}
                  onChange={handleChange}
                  disabled={!formData.enableFreeShipping}
                  className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Orders with subtotal ≥ this amount qualify for ₹0 shipping fee automatically.
                </p>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Logistics GST (Goods & Services Tax)</span>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isTaxable"
                    checked={formData.isTaxable}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Shipping GST Rate (%)
                </label>
                <input
                  type="number"
                  name="shippingTaxRatePercent"
                  value={formData.shippingTaxRatePercent}
                  onChange={handleChange}
                  disabled={!formData.isTaxable}
                  className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Indian logistics GST rate (standard 18%). Calculated on net shipping charge.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <RiSaveLine className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Shipping Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}

