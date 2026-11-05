'use client';

import React, { useState, useEffect } from 'react';
import {
  RiMapPinRangeLine,
  RiAddLine,
  RiEditLine,
  RiDeleteBin7Line,
  RiRefreshLine,
  RiCheckLine,
  RiCloseLine,
  RiAlertLine,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiCoinsLine,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui';
import { ShippingNavTabs } from '../components/ShippingNavTabs';

export default function ShippingZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [formZoneCode, setFormZoneCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEstimatedDays, setFormEstimatedDays] = useState('2-4 Days');
  const [formBaseSurcharge, setFormBaseSurcharge] = useState<number | string>(0);
  const [formCodAllowed, setFormCodAllowed] = useState(true);
  const [formCodFee, setFormCodFee] = useState<number | string>(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchZones = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listShippingZones();
      setZones(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const openCreateModal = () => {
    setEditingZone(null);
    setFormZoneCode('');
    setFormName('');
    setFormDescription('');
    setFormEstimatedDays('2-4 Days');
    setFormBaseSurcharge(0);
    setFormCodAllowed(true);
    setFormCodFee(0);
    setFormIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (zone: any) => {
    setEditingZone(zone);
    setFormZoneCode(zone.zoneCode || '');
    setFormName(zone.name || '');
    setFormDescription(zone.description || '');
    setFormEstimatedDays(zone.estimatedDeliveryDays || '2-4 Days');
    setFormBaseSurcharge(zone.baseSurcharge !== undefined ? Number(zone.baseSurcharge) : 0);
    setFormCodAllowed(zone.codAllowed !== false);
    setFormCodFee(zone.codFee !== undefined ? Number(zone.codFee) : 0);
    setFormIsActive(zone.isActive !== false);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setModalError(null);
    try {
      const payload = {
        zoneCode: formZoneCode.toUpperCase().trim(),
        name: formName.trim(),
        description: formDescription.trim(),
        estimatedDeliveryDays: formEstimatedDays.trim(),
        baseSurcharge: Number(formBaseSurcharge) || 0,
        codAllowed: formCodAllowed,
        codFee: Number(formCodFee) || 0,
        isActive: formIsActive,
      };

      if (editingZone) {
        await api.updateShippingZone(editingZone.id, payload);
      } else {
        await api.createShippingZone(payload);
      }

      setIsModalOpen(false);
      fetchZones();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save zone');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (zone: any) => {
    if (!window.confirm(`Are you sure you want to delete zone "${zone.name}" (${zone.zoneCode})?`)) {
      return;
    }
    try {
      await api.deleteShippingZone(zone.id);
      fetchZones();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete zone. It may have linked pincodes or rate cards.');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery Zones</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic logistics zones (Local, Regional, National, Remote) with distinct transit times and surcharges.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchZones}
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
            Add Delivery Zone
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
          <button onClick={fetchZones} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Zones Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Zone Code</th>
                <th className="py-3 px-4">Zone Name & Details</th>
                <th className="py-3 px-4">Estimated Transit</th>
                <th className="py-3 px-4 text-right">Zone Surcharge</th>
                <th className="py-3 px-4 text-center">COD Support</th>
                <th className="py-3 px-4 text-center">Pincodes Linked</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && zones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading delivery zones...
                  </td>
                </tr>
              ) : zones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No delivery zones configured yet.
                  </td>
                </tr>
              ) : (
                zones.map((zone, idx) => (
                  <tr key={zone.id || `zone-${idx}`} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {zone.zoneCode || zone.pincodePrefix || `ZONE-${idx + 1}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{zone.name || zone.zoneName || 'Delivery Zone'}</div>
                      {zone.description && (
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{zone.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <RiTimeLine className="w-3.5 h-3.5 text-slate-400" />
                        <span>{zone.estimatedDeliveryDays || '2-4 Days'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                      {zone.baseSurcharge > 0 ? (
                        <span className="text-amber-600">+{formatCurrency(zone.baseSurcharge)}</span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {zone.codAllowed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          Allowed {zone.codFee > 0 ? `(+${formatCurrency(zone.codFee)})` : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                          Prepaid Only
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      {zone._count?.pincodes ?? zone.pincodes?.length ?? 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {zone.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(zone)}
                          className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded transition"
                          title="Edit Zone"
                        >
                          <RiEditLine className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(zone)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="Delete Zone"
                        >
                          <RiDeleteBin7Line className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingZone ? `Edit Zone: ${editingZone.name}` : 'Create Delivery Zone'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {modalError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Zone Code (Unique)</label>
              <input
                type="text"
                required
                disabled={Boolean(editingZone)}
                placeholder="e.g. LOCAL, REGIONAL, REMOTE"
                value={formZoneCode}
                onChange={(e) => setFormZoneCode(e.target.value)}
                className="w-full px-3 py-2 font-mono uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Zone Display Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Local City Intra-State"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Same city same state deliveries with fast turnaround"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estimated Transit Time</label>
              <input
                type="text"
                required
                placeholder="e.g. 1-2 Days"
                value={formEstimatedDays}
                onChange={(e) => setFormEstimatedDays(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Base Surcharge (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formBaseSurcharge}
                onChange={(e) => setFormBaseSurcharge(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formCodAllowed}
                  onChange={(e) => setFormCodAllowed(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>Allow Cash on Delivery</span>
              </label>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">COD Fee (₹)</label>
              <input
                type="number"
                min="0"
                disabled={!formCodAllowed}
                value={formCodFee}
                onChange={(e) => setFormCodFee(e.target.value)}
                className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>Zone is Active and Serviceable</span>
            </label>
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
              {isSaving ? 'Saving...' : editingZone ? 'Update Zone' : 'Create Zone'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

