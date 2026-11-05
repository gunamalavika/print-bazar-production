'use client';

import React, { useState, useEffect } from 'react';
import {
  RiScales3Line,
  RiAddLine,
  RiEditLine,
  RiDeleteBin7Line,
  RiRefreshLine,
  RiAlertLine,
  RiCheckboxCircleLine,
  RiTruckLine,
  RiExchangeLine,
  RiInformationLine,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui';
import { ShippingNavTabs } from '../components/ShippingNavTabs';

export default function ShippingRatesPage() {
  const [rateCards, setRateCards] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formZoneId, setFormZoneId] = useState('');
  const [formCarrierName, setFormCarrierName] = useState('Standard Courier Partner');
  const [formAdditionalWeightRate, setFormAdditionalWeightRate] = useState<number | string>(40);
  const [formMinWeight, setFormMinWeight] = useState<number | string>(0);
  const [formMaxWeight, setFormMaxWeight] = useState<number | string>(100000);
  const [formIsActive, setFormIsActive] = useState(true);

  // Slabs state in form
  const [slabs, setSlabs] = useState<Array<{ fromWeightGrams: number; toWeightGrams: number; baseRate: number }>>([
    { fromWeightGrams: 0, toWeightGrams: 500, baseRate: 50 },
    { fromWeightGrams: 501, toWeightGrams: 1000, baseRate: 80 },
    { fromWeightGrams: 1001, toWeightGrams: 2000, baseRate: 140 },
    { fromWeightGrams: 2001, toWeightGrams: 5000, baseRate: 250 },
  ]);

  const fetchZones = async () => {
    try {
      const res = await api.listShippingZones();
      if (Array.isArray(res)) setZones(res);
    } catch {}
  };

  const fetchRateCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listShippingRateCards();
      setRateCards(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load rate cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
    fetchRateCards();
  }, []);

  const openCreateModal = () => {
    setEditingCard(null);
    setFormName('Standard Surface Rate Card');
    setFormZoneId(zones[0]?.id || '');
    setFormCarrierName('Standard Logistics');
    setFormAdditionalWeightRate(40);
    setFormMinWeight(0);
    setFormMaxWeight(100000);
    setFormIsActive(true);
    setSlabs([
      { fromWeightGrams: 0, toWeightGrams: 500, baseRate: 50 },
      { fromWeightGrams: 501, toWeightGrams: 1000, baseRate: 80 },
      { fromWeightGrams: 1001, toWeightGrams: 2000, baseRate: 140 },
      { fromWeightGrams: 2001, toWeightGrams: 5000, baseRate: 250 },
    ]);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (card: any) => {
    setEditingCard(card);
    setFormName(card.name || '');
    setFormZoneId(card.zoneId || '');
    setFormCarrierName(card.carrierName || 'Standard Logistics');
    const excessRate = card.additionalWeightPerKg ?? card.additionalWeightRatePerKg;
    setFormAdditionalWeightRate(excessRate !== undefined ? Number(excessRate) : 40);
    setFormMinWeight(card.minWeightGrams || 0);
    setFormMaxWeight(card.maxWeightGrams || 100000);
    setFormIsActive(card.isActive !== false);

    if (Array.isArray(card.slabs) && card.slabs.length > 0) {
      setSlabs(
        card.slabs.map((s: any) => ({
          fromWeightGrams: s.fromWeightGrams ?? s.minWeightGrams ?? 0,
          toWeightGrams: s.toWeightGrams ?? s.maxWeightGrams ?? 500,
          baseRate: Number(s.baseRate ?? s.rate ?? 50),
        }))
      );
    } else {
      setSlabs([{ fromWeightGrams: 0, toWeightGrams: 500, baseRate: 50 }]);
    }

    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSlabChange = (index: number, field: string, val: number) => {
    setSlabs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleAddSlab = () => {
    const lastSlab = slabs[slabs.length - 1];
    const newFrom = lastSlab ? lastSlab.toWeightGrams + 1 : 0;
    const newTo = newFrom + 1000;
    const newRate = lastSlab ? lastSlab.baseRate + 50 : 50;
    setSlabs((prev) => [...prev, { fromWeightGrams: newFrom, toWeightGrams: newTo, baseRate: newRate }]);
  };

  const handleRemoveSlab = (index: number) => {
    if (slabs.length <= 1) return;
    setSlabs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setModalError(null);
    try {
      if (slabs.length === 0) {
        throw new Error('Please configure at least one weight slab');
      }

      const formattedSlabs = slabs.map((s: any, idx: number) => ({
        minWeightGrams: Number(s.fromWeightGrams ?? s.minWeightGrams ?? 0),
        maxWeightGrams: Number(s.toWeightGrams ?? s.maxWeightGrams ?? 0),
        rate: Number(s.baseRate ?? s.rate ?? 0),
        sortOrder: idx + 1,
      }));

      const payload = {
        name: formName.trim(),
        zoneId: formZoneId,
        minShippingCharge: formattedSlabs[0]?.rate ?? 40,
        additionalWeightPerKg: Number(formAdditionalWeightRate) || 0,
        isActive: formIsActive,
        slabs: formattedSlabs,
      };

      if (editingCard) {
        await api.updateShippingRateCard(editingCard.id, payload);
      } else {
        await api.createShippingRateCard(payload);
      }

      setIsModalOpen(false);
      fetchRateCards();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save rate card');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (card: any) => {
    if (!window.confirm(`Delete rate card "${card.name}"?`)) return;
    try {
      await api.deleteShippingRateCard(card.id);
      fetchRateCards();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete rate card');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weight Slabs & Rate Cards</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure tiered weight slabs (e.g. 0–500g, 501g–1kg, 1kg–2kg) and excess weight charges per kilogram.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRateCards}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RiRefreshLine className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <RiAddLine className="w-4 h-4" />
            Add Rate Card
          </button>
        </div>
      </div>

      <ShippingNavTabs />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiAlertLine className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchRateCards} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Rate Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading && rateCards.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">
            Loading shipping rate cards...
          </div>
        ) : rateCards.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">
            No rate cards found. Create your first zone rate card.
          </div>
        ) : (
          rateCards.map((card) => (
            <div key={card.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{card.name}</h3>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                      {card.zone?.zoneCode || 'ZONE'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Zone: <strong>{card.zone?.zoneName || card.zone?.name || 'Assigned Zone'}</strong> &bull; Carrier: {card.carrierName || 'Standard'}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(card)}
                    className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded transition"
                    title="Edit Rate Card"
                  >
                    <RiEditLine className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(card)}
                    className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                    title="Delete Rate Card"
                  >
                    <RiDeleteBin7Line className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Slabs Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">From Weight</th>
                      <th className="py-2 px-3">To Weight</th>
                      <th className="py-2 px-3 text-right">Base Shipping Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {card.slabs?.map((slab: any, idx: number) => {
                      const minW = slab.fromWeightGrams ?? slab.minWeightGrams ?? 0;
                      const maxW = slab.toWeightGrams ?? slab.maxWeightGrams ?? 0;
                      const rate = slab.baseRate ?? slab.rate ?? 0;
                      return (
                        <tr key={slab.id || idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-700">
                            {minW >= 1000 ? `${(minW / 1000).toFixed(1)} kg` : `${minW} g`}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {maxW >= 1000 ? `${(maxW / 1000).toFixed(1)} kg` : `${maxW} g`}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(rate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Excess Weight Rule */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="text-slate-600">
                  Excess Weight Beyond Last Slab:
                </div>
                <div className="font-mono font-bold text-slate-900">
                  +{formatCurrency(card.additionalWeightPerKg ?? card.additionalWeightRatePerKg ?? 0)} / kg
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Rate Card Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCard ? `Edit Rate Card: ${editingCard.name}` : 'Create Zone Rate Card & Weight Slabs'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {modalError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rate Card Title</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Carrier Name</label>
              <input
                type="text"
                required
                value={formCarrierName}
                onChange={(e) => setFormCarrierName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Delivery Zone</label>
              <select
                required
                value={formZoneId}
                onChange={(e) => setFormZoneId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.zoneCode} — {z.zoneName || z.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Excess Weight Rate (₹ / extra kg)</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={formAdditionalWeightRate}
                onChange={(e) => setFormAdditionalWeightRate(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          {/* Dynamic Weight Slabs Section */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">Weight Slabs (in Grams)</label>
              <button
                type="button"
                onClick={handleAddSlab}
                className="flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
              >
                <RiAddLine className="w-3.5 h-3.5" />
                Add Slab
              </button>
            </div>

            <div className="space-y-2">
              {slabs.map((slab, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 block mb-0.5">From (g)</span>
                    <input
                      type="number"
                      min="0"
                      value={slab.fromWeightGrams}
                      onChange={(e) => handleSlabChange(idx, 'fromWeightGrams', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 font-mono text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 block mb-0.5">To (g)</span>
                    <input
                      type="number"
                      min="1"
                      value={slab.toWeightGrams}
                      onChange={(e) => handleSlabChange(idx, 'toWeightGrams', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 font-mono text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 block mb-0.5">Base Rate (₹)</span>
                    <input
                      type="number"
                      min="0"
                      value={slab.baseRate}
                      onChange={(e) => handleSlabChange(idx, 'baseRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 font-mono text-xs border border-slate-300 rounded bg-white text-right"
                    />
                  </div>
                  {slabs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlab(idx)}
                      className="mt-4 p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      title="Remove Slab"
                    >
                      <RiDeleteBin7Line className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingCard ? 'Update Rate Card' : 'Create Rate Card'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

