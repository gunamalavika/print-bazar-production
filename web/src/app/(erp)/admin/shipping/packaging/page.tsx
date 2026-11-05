'use client';

import React, { useState, useEffect } from 'react';
import {
  RiBox3Line,
  RiAddLine,
  RiEditLine,
  RiDeleteBin7Line,
  RiRefreshLine,
  RiAlertLine,
  RiScales3Line,
  RiCheckboxCircleLine,
  RiStarLine,
  RiStarFill,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui';
import { ShippingNavTabs } from '../components/ShippingNavTabs';

export default function ShippingPackagingPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formWeightGrams, setFormWeightGrams] = useState<number | string>(200);
  const [formLengthMm, setFormLengthMm] = useState<number | string>(220);
  const [formWidthMm, setFormWidthMm] = useState<number | string>(160);
  const [formHeightMm, setFormHeightMm] = useState<number | string>(120);
  const [formMaxCapacityGrams, setFormMaxCapacityGrams] = useState<number | string>(5000);
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listPackagingProfiles(false);
      setProfiles(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load packaging profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const openCreateModal = () => {
    setEditingProfile(null);
    setFormName('');
    setFormCode('');
    setFormWeightGrams(200);
    setFormLengthMm(220);
    setFormWidthMm(160);
    setFormHeightMm(120);
    setFormMaxCapacityGrams(5000);
    setFormIsDefault(false);
    setFormIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: any) => {
    setEditingProfile(pkg);
    setFormName(pkg.name || '');
    setFormCode(pkg.code || '');
    setFormWeightGrams(pkg.weightGrams ?? 200);
    setFormLengthMm(pkg.lengthMm ?? 220);
    setFormWidthMm(pkg.widthMm ?? 160);
    setFormHeightMm(pkg.heightMm ?? 120);
    setFormMaxCapacityGrams(pkg.maxWeightCapacityGrams ?? 5000);
    setFormIsDefault(pkg.isDefault || false);
    setFormIsActive(pkg.isActive !== false);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setModalError(null);
    try {
      const payload = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase() || undefined,
        weightGrams: Number(formWeightGrams) || 0,
        lengthMm: Number(formLengthMm) || 0,
        widthMm: Number(formWidthMm) || 0,
        heightMm: Number(formHeightMm) || 0,
        maxWeightCapacityGrams: Number(formMaxCapacityGrams) || 0,
        isDefault: formIsDefault,
        isActive: formIsActive,
      };

      if (editingProfile) {
        await api.updatePackagingProfile(editingProfile.id, payload);
      } else {
        await api.createPackagingProfile(payload);
      }

      setIsModalOpen(false);
      fetchProfiles();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save packaging profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (pkg: any) => {
    if (!window.confirm(`Delete packaging profile "${pkg.name}"?`)) return;
    try {
      await api.deletePackagingProfile(pkg.id);
      fetchProfiles();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete packaging profile');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Packaging Profiles</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Carton boxes, mailer envelopes, and rigid tubes. Tare packaging weight is added strictly once per shipment (never multiplied by product quantity).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProfiles}
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
            Add Packaging Profile
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
          <button onClick={fetchProfiles} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Grid of Packaging Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading && profiles.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">
            Loading packaging profiles...
          </div>
        ) : profiles.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">
            No packaging profiles found. Create your first carton or envelope profile.
          </div>
        ) : (
          profiles.map((pkg) => {
            const volKg = (
              ((Number(pkg.lengthMm || 0) / 10) *
                (Number(pkg.widthMm || 0) / 10) *
                (Number(pkg.heightMm || 0) / 10)) /
              5000
            ).toFixed(2);

            return (
              <div
                key={pkg.id}
                className={`bg-white border rounded-xl p-5 shadow-2xs space-y-4 relative ${
                  pkg.isDefault ? 'border-sky-300 ring-1 ring-sky-300/50' : 'border-slate-200'
                }`}
              >
                {pkg.isDefault && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    <RiStarFill className="w-3 h-3 text-sky-600" /> Default
                  </span>
                )}

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <RiBox3Line className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{pkg.name}</h3>
                    {pkg.code && (
                      <span className="font-mono text-[10px] text-slate-500">{pkg.code}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Tare Weight</div>
                    <div className="font-mono font-bold text-slate-800 mt-0.5">
                      {pkg.weightGrams} g ({((Number(pkg.weightGrams) || 0) / 1000).toFixed(2)} kg)
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Volumetric (5000)</div>
                    <div className="font-mono font-bold text-indigo-700 mt-0.5">{volKg} kg</div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Dimensions:</span>
                    <span className="font-mono font-semibold">
                      {pkg.lengthMm} &times; {pkg.widthMm} &times; {pkg.heightMm} mm
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Max Capacity:</span>
                    <span className="font-mono font-semibold">
                      {((Number(pkg.maxWeightCapacityGrams) || 0) / 1000).toFixed(1)} kg
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pkg.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {pkg.isActive ? 'Active' : 'Disabled'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(pkg)}
                      className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded transition cursor-pointer"
                      title="Edit"
                    >
                      <RiEditLine className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg)}
                      className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      title="Delete"
                    >
                      <RiDeleteBin7Line className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProfile ? `Edit Packaging: ${editingProfile.name}` : 'Create Packaging Profile'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {modalError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Profile Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Medium Carton Box"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Code / SKU (Optional)</label>
              <input
                type="text"
                placeholder="e.g. BOX-M-02"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="w-full px-3 py-2 font-mono uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tare Box Weight (grams)</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={formWeightGrams}
                onChange={(e) => setFormWeightGrams(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Max Weight Capacity (grams)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formMaxCapacityGrams}
                onChange={(e) => setFormMaxCapacityGrams(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Dimensions (Length &times; Width &times; Height in mm)</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="Length (mm)"
                value={formLengthMm}
                onChange={(e) => setFormLengthMm(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
              <input
                type="number"
                placeholder="Width (mm)"
                value={formWidthMm}
                onChange={(e) => setFormWidthMm(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
              <input
                type="number"
                placeholder="Height (mm)"
                value={formHeightMm}
                onChange={(e) => setFormHeightMm(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>Set as Default Packaging</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>Profile is Active</span>
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
              {isSaving ? 'Saving...' : editingProfile ? 'Update Profile' : 'Create Profile'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

