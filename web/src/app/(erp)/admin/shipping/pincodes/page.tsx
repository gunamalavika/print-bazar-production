'use client';

import React, { useState, useEffect } from 'react';
import {
  RiCompass3Line,
  RiAddLine,
  RiDownload2Line,
  RiSearch2Line,
  RiFilter3Line,
  RiEditLine,
  RiDeleteBin7Line,
  RiRefreshLine,
  RiCheckLine,
  RiCloseLine,
  RiAlertLine,
  RiCheckboxCircleLine,
  RiArrowRightLine,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui';
import { ShippingNavTabs } from '../components/ShippingNavTabs';

export default function ShippingPincodesPage() {
  const [pincodes, setPincodes] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters
  const [search, setSearch] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [editingPincode, setEditingPincode] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Single Form State
  const [formPincode, setFormPincode] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formZoneId, setFormZoneId] = useState('');
  const [formCodAllowed, setFormCodAllowed] = useState(true);
  const [formServiceable, setFormServiceable] = useState(true);

  const fetchZones = async () => {
    try {
      const res = await api.listShippingZones();
      if (Array.isArray(res)) setZones(res);
    } catch {}
  };

  const fetchPincodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listShippingPincodes({
        search: search.trim() || undefined,
        zoneId: selectedZoneId || undefined,
        page,
        limit: 20,
      });

      if (res && Array.isArray((res as any).pincodes)) {
        setPincodes((res as any).pincodes);
        setTotalPages((res as any).pagination?.totalPages || 1);
        setTotalItems((res as any).pagination?.total || (res as any).pincodes.length);
      } else if (res && Array.isArray((res as any).items)) {
        setPincodes((res as any).items);
        setTotalPages((res as any).totalPages || 1);
        setTotalItems((res as any).total || (res as any).items.length);
      } else if (Array.isArray(res)) {
        setPincodes(res);
        setTotalPages(1);
        setTotalItems(res.length);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load pincodes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    fetchPincodes();
  }, [page, selectedZoneId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPincodes();
  };

  const openAddSingle = () => {
    setEditingPincode(null);
    setFormPincode('');
    setFormCity('');
    setFormState('');
    setFormZoneId(zones[0]?.id || '');
    setFormCodAllowed(true);
    setFormServiceable(true);
    setModalError(null);
    setIsSingleModalOpen(true);
  };

  const openEditSingle = (item: any) => {
    setEditingPincode(item);
    setFormPincode(item.pincode || '');
    setFormCity(item.city || '');
    setFormState(item.state || '');
    setFormZoneId(item.zoneId || '');
    setFormCodAllowed(item.isCodAvailable !== false);
    setFormServiceable(item.isServiceable !== false);
    setModalError(null);
    setIsSingleModalOpen(true);
  };

  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setModalError(null);
    try {
      const payload = {
        pincode: formPincode.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        zoneId: formZoneId,
        isCodAvailable: formCodAllowed,
        isServiceable: formServiceable,
      };

      if (editingPincode) {
        await api.updateShippingPincode(editingPincode.id, payload);
      } else {
        await api.createShippingPincode(payload);
      }

      setIsSingleModalOpen(false);
      fetchPincodes();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save pincode');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!window.confirm(`Delete PIN code ${item.pincode} (${item.city})?`)) return;
    try {
      await api.deleteShippingPincode(item.id);
      fetchPincodes();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete pincode');
    }
  };

  const handleExportCsv = () => {
    if (pincodes.length === 0) return;
    const header = 'PIN Code,City,State,Zone Code,Zone Name,COD Available,Serviceable\n';
    const rows = pincodes.map(
      (p) => `${p.pincode},"${p.city}","${p.state}",${p.zone?.zoneCode || ''},"${p.zone?.name || ''}",${p.isCodAvailable},${p.isServiceable}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipping-pincodes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PIN Code Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Indian 6-digit PIN code mappings to Delivery Zones (Local, Regional, National, Remote) and check COD serviceability.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <RiDownload2Line className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={openAddSingle}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <RiAddLine className="w-4 h-4" />
            Add PIN Code
          </button>
        </div>
      </div>

      <ShippingNavTabs />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <RiSearch2Line className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by 6-digit PIN, city name, or state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <RiFilter3Line className="w-4 h-4 text-slate-400" />
            <span className="font-semibold whitespace-nowrap">Filter Zone:</span>
          </div>
          <select
            value={selectedZoneId}
            onChange={(e) => {
              setSelectedZoneId(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="">All Zones ({totalItems})</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.zoneCode} — {z.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiAlertLine className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchPincodes} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Pincode Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">PIN Code</th>
                <th className="py-3 px-4">City / Hub</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Delivery Zone</th>
                <th className="py-3 px-4 text-center">COD</th>
                <th className="py-3 px-4 text-center">Serviceable</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && pincodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading postal PIN codes...
                  </td>
                </tr>
              ) : pincodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No matching PIN codes found.
                  </td>
                </tr>
              ) : (
                pincodes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-100">
                        {item.pincode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{item.city}</td>
                    <td className="py-3 px-4 text-slate-600">{item.state}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {item.zone?.zoneCode || 'NATIONAL'}
                      </span>
                      <span className="text-slate-500 text-[11px] ml-2">{item.zone?.name}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.isCodAvailable ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          YES
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                          NO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.isServiceable ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Blocked
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditSingle(item)}
                          className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded transition"
                          title="Edit"
                        >
                          <RiEditLine className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="Delete"
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

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing Page {page} of {totalPages} ({totalItems} total PIN codes)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Single Add / Edit Modal */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title={editingPincode ? `Edit PIN Code: ${editingPincode.pincode}` : 'Add New PIN Code'}
      >
        <form onSubmit={handleSaveSingle} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {modalError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">PIN Code (6 Digits)</label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="e.g. 110001"
              value={formPincode}
              onChange={(e) => setFormPincode(e.target.value)}
              className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City / Region</label>
              <input
                type="text"
                required
                placeholder="e.g. New Delhi"
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                required
                placeholder="e.g. Delhi"
                value={formState}
                onChange={(e) => setFormState(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mapped Delivery Zone</label>
            <select
              required
              value={formZoneId}
              onChange={(e) => setFormZoneId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.zoneCode} — {z.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formCodAllowed}
                onChange={(e) => setFormCodAllowed(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>COD Serviceable</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formServiceable}
                onChange={(e) => setFormServiceable(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>Pincode Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsSingleModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingPincode ? 'Update PIN' : 'Add PIN'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

