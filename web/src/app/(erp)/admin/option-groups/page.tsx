'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { api, ReusableOptionGroup } from '@/lib/api';
import {
  RiApps2Line,
  RiAddLine,
  RiSearch2Line,
  RiDeleteBin7Line,
  RiArrowUpLine,
  RiArrowDownLine,
  RiCheckLine,
  RiCloseLine,
  RiEditLine,
  RiFileCopyLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiFileTextLine,
  RiRefreshLine,
  RiInputMethodLine,
  RiSettings4Line,
  RiListCheck2,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiScissorsCutLine,
  RiCalendarEventLine,
  RiPaletteLine,
  RiStackLine,
  RiBox3Line,
  RiExpandDiagonalLine,
  RiDropLine,
  RiStarLine,
  RiContrastDropLine,
  RiCompass3Line,
  RiBookOpenLine,
  RiHashtag,
  RiListSettingsLine,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';

const isTextInputType = (type?: string) =>
  ['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'EMAIL', 'PHONE'].includes((type || '').toUpperCase());

// Icon resolver for horizontal selector cards and editor header
const getGroupIcon = (name: string, code: string, inputType?: string) => {
  const n = (name + ' ' + code).toLowerCase();
  if (n.includes('cut') || n.includes('trim') || n.includes('die') || n.includes('edge')) return RiScissorsCutLine;
  if (n.includes('date') || n.includes('time') || inputType === 'DATE') return RiCalendarEventLine;
  if (n.includes('design') || n.includes('artwork') || n.includes('proof')) return RiPaletteLine;
  if (n.includes('laminat') || n.includes('coat') || n.includes('layer')) return RiStackLine;
  if (n.includes('material') || n.includes('paper') || n.includes('stock') || n.includes('substrate')) return RiBox3Line;
  if (n.includes('size') || n.includes('dimension') || n.includes('width') || n.includes('height')) return RiExpandDiagonalLine;
  if (n.includes('print') || n.includes('location') || n.includes('side') || n.includes('ink')) return RiDropLine;
  if (n.includes('finish') || n.includes('foil') || n.includes('uv') || n.includes('spot')) return RiStarLine;
  if (n.includes('color') || n.includes('colour')) return RiContrastDropLine;
  if (n.includes('orient') || n.includes('direction')) return RiCompass3Line;
  if (n.includes('bind') || n.includes('book') || n.includes('fold')) return RiBookOpenLine;
  if (n.includes('text') || inputType === 'TEXT' || inputType === 'TEXTAREA') return RiInputMethodLine;
  if (n.includes('number') || n.includes('qty') || inputType === 'NUMBER') return RiHashtag;
  return RiListSettingsLine;
};

interface OptionValueItem {
  id?: string;
  label: string;
  value: string;
  priceModifier?: number;
  isDefault?: boolean;
}

type EditorTab = 'settings' | 'values';

export default function OptionGroupsLibraryPage() {
  const [groups, setGroups] = useState<ReusableOptionGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('settings');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State for Selected / New Group
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formInputType, setFormInputType] = useState('SELECT');
  const [formSelectionBehavior, setFormSelectionBehavior] = useState<'SINGLE' | 'MULTIPLE' | 'VARIANT_WISE' | string>('SINGLE');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formEnableAdditionalPricing, setFormEnableAdditionalPricing] = useState(false);
  const [formOptions, setFormOptions] = useState<OptionValueItem[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Modals
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const [isAddValueModalOpen, setIsAddValueModalOpen] = useState(false);
  const [editingValueIdx, setEditingValueIdx] = useState<number | null>(null);
  const [valFormLabel, setValFormLabel] = useState('');
  const [valFormValue, setValFormValue] = useState('');
  const [valFormPriceModifier, setValFormPriceModifier] = useState<number>(0);
  const [valFormIsDefault, setValFormIsDefault] = useState(false);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<ReusableOptionGroup | null>(null);

  // Horizontal Scroll Ref
  const selectorRef = useRef<HTMLDivElement>(null);

  // Fetch groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async (selectId?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.adminListReusableGroups();
      setGroups(data);
      if (data.length > 0) {
        const target = selectId ? data.find((g) => g.id === selectId) : data[0];
        selectGroup(target || data[0]);
      } else {
        setSelectedGroupId(null);
        resetForm();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch reusable option groups.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectGroup = (group: ReusableOptionGroup) => {
    setIsCreatingNew(false);
    setSelectedGroupId(group.id);
    setFormName(group.name);
    setFormCode(group.code);
    setFormInputType(group.inputType || 'SELECT');
    setFormSelectionBehavior(group.selectionBehavior || 'SINGLE');
    setFormDescription(group.description || '');
    setFormIsActive(group.isActive);
    setFormEnableAdditionalPricing(Boolean(group.enableAdditionalPricing));

    const opts: OptionValueItem[] = Array.isArray(group.defaultOptions)
      ? group.defaultOptions.map((o: any, idx: number) => ({
          id: o.id || `opt-${idx}`,
          label: o.label || '',
          value: o.value || '',
          priceModifier: typeof o.priceModifier === 'number' ? o.priceModifier : 0,
          isDefault: Boolean(o.isDefault),
        }))
      : [];
    setFormOptions(opts);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const resetForm = () => {
    setFormName('');
    setFormCode('');
    setFormInputType('SELECT');
    setFormSelectionBehavior('SINGLE');
    setFormDescription('');
    setFormIsActive(true);
    setFormEnableAdditionalPricing(false);
    setFormOptions([]);
  };

  const handleStartCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedGroupId(null);
    resetForm();
    setErrorMsg(null);
    setSuccessMsg(null);
    setActiveTab('settings');
  };

  // Filtered groups by search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) => g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  // Currently selected group object
  const currentGroup = useMemo(() => {
    if (isCreatingNew) return null;
    return groups.find((g) => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId, isCreatingNew]);

  // Horizontal scroll helpers
  const handleScrollLeft = () => {
    if (selectorRef.current) {
      selectorRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (selectorRef.current) {
      selectorRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  // Auto-slugify code when creating new
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormName(val);
    if (isCreatingNew) {
      const autoCode = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setFormCode(autoCode);
    }
  };

  // Save Group (Create or Update)
  const handleSaveGroup = async () => {
    if (!formName.trim()) {
      setErrorMsg('Group name is required.');
      return;
    }
    if (!formCode.trim()) {
      setErrorMsg('Group unique code identifier is required.');
      return;
    }

    // Check for duplicate value codes
    const valCodes = formOptions.map((o) => o.value);
    const dupes = valCodes.filter((v, i) => valCodes.indexOf(v) !== i);
    if (dupes.length > 0) {
      setErrorMsg(`Duplicate option value code detected: '${dupes[0]}'. Each value must have a unique code.`);
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      name: formName.trim(),
      code: formCode.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
      inputType: formInputType,
      selectionBehavior: formSelectionBehavior,
      description: formDescription.trim() || null,
      isActive: formIsActive,
      enableAdditionalPricing: formEnableAdditionalPricing,
      defaultOptions: formOptions.map((opt, idx) => ({
        label: opt.label.trim(),
        value: opt.value.trim(),
        priceModifier: typeof opt.priceModifier === 'number' ? opt.priceModifier : 0,
        isDefault: Boolean(opt.isDefault),
        sortOrder: idx,
      })),
    };

    try {
      if (isCreatingNew) {
        const created = await api.adminCreateReusableGroup(payload);
        setSuccessMsg(`Option group '${created.name}' created successfully with ${payload.defaultOptions.length} values.`);
        await loadGroups(created.id);
      } else if (selectedGroupId) {
        const updated = await api.adminUpdateReusableGroup(selectedGroupId, payload);
        const countText = (updated as any).affectedProductsCount ? ` (${(updated as any).affectedProductsCount} products updated)` : '';
        setSuccessMsg(`Option group '${updated.name}' updated and synchronized${countText}.`);
        await loadGroups(updated.id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save option group.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Group
  const handleDeleteGroup = async () => {
    if (!deleteConfirmGroup) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await api.adminDeleteReusableGroup(deleteConfirmGroup.id);
      setSuccessMsg(`Group '${deleteConfirmGroup.name}' removed from library.`);
      setDeleteConfirmGroup(null);
      await loadGroups();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete group.');
    } finally {
      setIsSaving(false);
    }
  };

  // Value Items Operations
  const handleOpenAddValueModal = (editIdx?: number) => {
    if (editIdx !== undefined) {
      setEditingValueIdx(editIdx);
      const opt = formOptions[editIdx];
      setValFormLabel(opt.label);
      setValFormValue(opt.value);
      setValFormPriceModifier(opt.priceModifier ?? 0);
      setValFormIsDefault(Boolean(opt.isDefault));
    } else {
      setEditingValueIdx(null);
      setValFormLabel('');
      setValFormValue('');
      setValFormPriceModifier(0);
      setValFormIsDefault(formOptions.length === 0);
    }
    setIsAddValueModalOpen(true);
  };

  const handleSaveSingleValue = () => {
    if (!valFormLabel.trim()) return;
    const finalVal = valFormValue.trim()
      ? valFormValue.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_')
      : valFormLabel.toLowerCase().replace(/[^a-z0-9_]+/g, '_');

    const newOpt: OptionValueItem = {
      label: valFormLabel.trim(),
      value: finalVal,
      priceModifier: Number(valFormPriceModifier) || 0,
      isDefault: valFormIsDefault,
    };

    if (editingValueIdx !== null) {
      setFormOptions((prev) => {
        const copy = [...prev];
        if (newOpt.isDefault) {
          copy.forEach((o) => (o.isDefault = false));
        }
        copy[editingValueIdx] = newOpt;
        return copy;
      });
    } else {
      setFormOptions((prev) => {
        let copy = [...prev];
        if (newOpt.isDefault) {
          copy = copy.map((o) => ({ ...o, isDefault: false }));
        }
        return [...copy, newOpt];
      });
    }

    setIsAddValueModalOpen(false);
  };

  const handleDeleteValue = (index: number) => {
    setFormOptions((prev) => {
      const copy = prev.filter((_, idx) => idx !== index);
      if (copy.length > 0 && !copy.some((o) => o.isDefault)) {
        copy[0].isDefault = true;
      }
      return copy;
    });
  };

  const handleMoveValue = (index: number, direction: 'UP' | 'DOWN') => {
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === formOptions.length - 1) return;
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    setFormOptions((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleSetDefaultValue = (index: number) => {
    setFormOptions((prev) =>
      prev.map((opt, idx) => ({
        ...opt,
        isDefault: idx === index,
      }))
    );
  };

  // Bulk Values Parse & Add
  const handleBulkAddValues = () => {
    if (!bulkInputText.trim()) return;

    const lines = bulkInputText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsed: OptionValueItem[] = lines.map((line, idx) => {
      const parts = line.split(',').map((p) => p.trim());
      const label = parts[0] || `Option ${idx + 1}`;
      const val = parts[1]
        ? parts[1].toLowerCase().replace(/[^a-z0-9_]+/g, '_')
        : label.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      const price = parts[2] ? parseFloat(parts[2]) || 0 : 0;

      return {
        label,
        value: val,
        priceModifier: price,
        isDefault: formOptions.length === 0 && idx === 0,
      };
    });

    setFormOptions((prev) => [...prev, ...parsed]);
    setBulkInputText('');
    setIsBulkModalOpen(false);
  };

  // Active representative icon for the editor
  const RepresentativeIcon = getGroupIcon(formName, formCode, formInputType);

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. COMPACT PAGE HEADER                                   */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-transparent pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-300/80 flex items-center justify-center text-amber-600 shadow-2xs flex-shrink-0">
            <RiApps2Line className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
              Option Groups Library
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage reusable option groups for product configuration.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative w-64">
            <RiSearch2Line className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search option groups..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs transition-all"
            />
          </div>

          {/* Create Option Group Button */}
          <button
            type="button"
            onClick={handleStartCreateNew}
            className="h-9 px-4 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs border border-[#E3A008]/40 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <RiAddLine className="w-4 h-4 stroke-[1.5]" />
            <span>Create Option Group</span>
          </button>
        </div>
      </div>

      {/* Global Alert Messages */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <RiErrorWarningLine className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer">
            <RiCloseLine className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <RiCheckboxCircleLine className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
            <RiCloseLine className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. HORIZONTAL OPTION-GROUP SELECTOR                     */}
      {/* ======================================================== */}
      <div className="relative flex items-center gap-2">
        {/* Left Scroll Navigation Arrow */}
        <button
          type="button"
          onClick={handleScrollLeft}
          className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer flex-shrink-0"
          title="Scroll left"
        >
          <RiArrowLeftSLine className="w-4 h-4" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={selectorRef}
          className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading ? (
            <div className="py-6 px-4 text-xs text-slate-400 flex items-center gap-2">
              <RiRefreshLine className="w-4 h-4 animate-spin text-amber-500" />
              <span>Loading option groups...</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-6 px-4 text-xs text-slate-400">
              No option groups found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isSelected = selectedGroupId === group.id && !isCreatingNew;
              const GroupCardIcon = getGroupIcon(group.name, group.code, group.inputType);

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => selectGroup(group)}
                  className={`flex-shrink-0 w-[128px] h-[106px] p-3.5 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#FFFDE6] border-2 border-[#FFED00] shadow-xs ring-1 ring-amber-300/40'
                      : 'bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                  }`}
                >
                  {/* Top: Representative Icon */}
                  <div className="text-slate-800">
                    <GroupCardIcon className="w-5 h-5 text-slate-800" />
                  </div>

                  {/* Middle: Group Name */}
                  <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 pr-1">
                    {group.name}
                  </div>

                  {/* Bottom: Small Status Indicator Dot */}
                  <div className="flex items-center">
                    <span
                      className={`w-2 h-2 rounded-full inline-block ${
                        group.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={group.isActive ? 'Active' : 'Inactive'}
                    />
                  </div>
                </button>
              );
            })
          )}

          {/* Special "New Group" card if currently creating */}
          {isCreatingNew && (
            <div className="flex-shrink-0 w-[128px] h-[106px] p-3.5 rounded-2xl bg-[#FFFDE6] border-2 border-[#FFED00] shadow-xs flex flex-col justify-between">
              <div className="text-amber-600">
                <RiAddLine className="w-5 h-5" />
              </div>
              <div className="font-bold text-slate-900 text-xs leading-snug">
                {formName || 'New Group'}
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
            </div>
          )}
        </div>

        {/* Right Scroll Navigation Arrow */}
        <button
          type="button"
          onClick={handleScrollRight}
          className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer flex-shrink-0"
          title="Scroll right"
        >
          <RiArrowRightSLine className="w-4 h-4" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3. SELECTED GROUP EDITOR                                */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
        {/* Editor Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            {/* Group Icon in Yellow Box */}
            <div className="w-12 h-12 bg-[#FFED00] text-black rounded-xl flex items-center justify-center border border-amber-300/80 shadow-2xs flex-shrink-0">
              <RepresentativeIcon className="w-6 h-6 text-black" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isCreatingNew ? (formName || 'New Option Group') : (formName || 'Option Group')}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                    formIsActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {formIsActive && <RiCheckLine className="w-3.5 h-3.5 stroke-[2]" />}
                  {formIsActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Code: {formCode || '—'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {!isCreatingNew && currentGroup && (
              <button
                type="button"
                onClick={() => setDeleteConfirmGroup(currentGroup)}
                className="h-9 px-3.5 bg-rose-50/80 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-rose-200 transition-colors cursor-pointer"
                title="Delete this option group"
              >
                <RiDeleteBin7Line className="w-4 h-4" />
                <span>Delete Group</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveGroup}
              disabled={isSaving}
              className="h-9 px-4 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg flex items-center gap-1.5 border border-[#E3A008]/40 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RiCheckLine className="w-4 h-4 stroke-[2]" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. EDITOR TABS                                           */}
        {/* ======================================================== */}
        <div className="flex items-center gap-1 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-3 sm:px-4 text-xs flex items-center gap-2 cursor-pointer transition-colors relative ${
              activeTab === 'settings'
                ? 'font-bold text-slate-900 border-b-2 border-[#FFED00]'
                : 'font-medium text-slate-500 hover:text-slate-800'
            }`}
          >
            <RiSettings4Line className={`w-4 h-4 ${activeTab === 'settings' ? 'text-slate-900' : 'text-slate-400'}`} />
            <span>Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('values')}
            className={`pb-3 px-3 sm:px-4 text-xs flex items-center gap-2 cursor-pointer transition-colors relative ${
              activeTab === 'values'
                ? 'font-bold text-slate-900 border-b-2 border-[#FFED00]'
                : 'font-medium text-slate-500 hover:text-slate-800'
            }`}
          >
            <RiListCheck2 className={`w-4 h-4 ${activeTab === 'values' ? 'text-slate-900' : 'text-slate-400'}`} />
            <span>Option Values</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {formOptions.length}
            </span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: SETTINGS (Two-Column Layout)                     */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
            {/* Left Column: Basic Information (8 Cols) */}
            <div className="lg:col-span-8 space-y-5">
              <h3 className="text-sm font-bold text-slate-900">Basic Information</h3>

              {/* Group Name & Unique Code Identifier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Group Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={handleNameChange}
                    placeholder="e.g. Cutting Edge, Material, Size"
                    className="w-full h-10 px-3.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Unique Code Identifier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, '_'))}
                    placeholder="e.g. cutting_edge, material, size"
                    className="w-full h-10 px-3.5 text-xs font-mono bg-slate-50/70 text-slate-900 border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Input Type & Selection Behavior */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Input Type</label>
                  <select
                    value={formInputType}
                    onChange={(e) => setFormInputType(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs cursor-pointer"
                  >
                    <optgroup label="Choice & Selection Controls">
                      <option value="SELECT">Dropdown Select (SELECT)</option>
                      <option value="RADIO">Radio Buttons (RADIO)</option>
                      <option value="CHECKBOX">Checkboxes (CHECKBOX)</option>
                      <option value="TOGGLE">Toggle Switch (TOGGLE)</option>
                    </optgroup>
                    <optgroup label="Text & Freeform Inputs">
                      <option value="TEXT">Single-Line Text Input (TEXT)</option>
                      <option value="TEXTAREA">Multi-Line Text Area (TEXTAREA)</option>
                      <option value="NUMBER">Numeric Input (NUMBER)</option>
                      <option value="DATE">Date Picker (DATE)</option>
                      <option value="EMAIL">Email Address (EMAIL)</option>
                      <option value="PHONE">Phone Number (PHONE)</option>
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Selection Behavior</label>
                  <select
                    value={formSelectionBehavior}
                    onChange={(e) => setFormSelectionBehavior(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs cursor-pointer"
                  >
                    <option value="SINGLE">Single Selection (SINGLE)</option>
                    <option value="MULTIPLE">Multiple Selection (MULTIPLE)</option>
                    <option value="VARIANT_WISE">Variant Dimension (VARIANT_WISE)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">Description</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Standard cutting options for print products."
                  className="w-full p-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs resize-none"
                />
              </div>
            </div>

            {/* Right Column: Status & Visibility (4 Cols) */}
            <div className="lg:col-span-4 space-y-6 pt-1 lg:pl-4 lg:border-l lg:border-slate-100">
              {/* Status Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Status & Visibility</h3>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Active</div>
                    <div className="text-[11px] text-slate-500">Group can be used in products</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: OPTION VALUES                                     */}
        {/* ======================================================== */}
        {activeTab === 'values' && (
          <div className="space-y-5 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isTextInputType(formInputType)
                    ? `Preset Suggestion Chips (${formOptions.length})`
                    : `Option Values (${formOptions.length})`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTextInputType(formInputType)
                    ? 'Optional quick-fill suggestion chips for customers when typing custom input.'
                    : 'Configure the preset choices available for customer selection.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
                >
                  <RiFileCopyLine className="w-3.5 h-3.5" />
                  <span>Bulk Add Values</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAddValueModal()}
                  className="h-8 px-3.5 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg flex items-center gap-1.5 border border-[#E3A008]/40 shadow-2xs transition-colors cursor-pointer"
                >
                  <RiAddLine className="w-4 h-4 stroke-[2]" />
                  <span>Add Value</span>
                </button>
              </div>
            </div>

            {/* Values Table */}
            {formOptions.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50/50">
                <RiListSettingsLine className="w-8 h-8 mx-auto text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {isTextInputType(formInputType)
                      ? 'Freeform Input Mode (No suggestions added)'
                      : 'No option values added yet'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-md mx-auto">
                    {isTextInputType(formInputType)
                      ? 'Customers can type custom text directly in the storefront order form. You can optionally add quick-fill suggestion chips.'
                      : 'Click Add Value or Bulk Add to configure the choices for this group.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAddValueModal()}
                  className="h-8 px-3.5 bg-[#FFED00] text-black text-xs font-bold rounded-lg border border-amber-300 shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <RiAddLine className="w-3.5 h-3.5 stroke-[2]" /> Add First Value
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Order</th>
                      <th className="py-2.5 px-3">Option Label</th>
                      <th className="py-2.5 px-3">Value Code</th>
                      {formEnableAdditionalPricing && (
                        <th className="py-2.5 px-3 w-28">Price Add-on</th>
                      )}
                      <th className="py-2.5 px-3 text-center w-20">Default</th>
                      <th className="py-2.5 px-3 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formOptions.map((opt, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        {/* Order Buttons */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveValue(idx, 'UP')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              <RiArrowUpLine className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveValue(idx, 'DOWN')}
                              disabled={idx === formOptions.length - 1}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              <RiArrowDownLine className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Label */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {opt.label}
                        </td>

                        {/* Value Code */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {opt.value}
                        </td>

                        {/* Price Modifier */}
                        {formEnableAdditionalPricing && (
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                            {Number(opt.priceModifier || 0) > 0 ? (
                              <span className="text-emerald-700 font-bold">
                                +{formatCurrency(Number(opt.priceModifier))}
                              </span>
                            ) : (
                              <span className="text-slate-400">₹0.00</span>
                            )}
                          </td>
                        )}

                        {/* Default Radio */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="radio"
                            name="group_default_option"
                            checked={Boolean(opt.isDefault)}
                            onChange={() => handleSetDefaultValue(idx)}
                            className="w-4 h-4 text-black focus:ring-black cursor-pointer accent-amber-500"
                            title="Set as default selection"
                          />
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenAddValueModal(idx)}
                              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                              title="Edit Value"
                            >
                              <RiEditLine className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteValue(idx)}
                              className="p-1.5 hover:bg-rose-100 text-rose-600 rounded transition-colors cursor-pointer"
                              title="Delete Value"
                            >
                              <RiDeleteBin7Line className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT SINGLE OPTION VALUE                  */}
      {/* ======================================================== */}
      {isAddValueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingValueIdx !== null ? 'Edit Option Value' : 'Add New Option Value'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddValueModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Option Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={valFormLabel}
                  onChange={(e) => {
                    const l = e.target.value;
                    setValFormLabel(l);
                    if (editingValueIdx === null) {
                      setValFormValue(l.toLowerCase().replace(/[^a-z0-9_]+/g, '_'));
                    }
                  }}
                  placeholder="e.g. 300 GSM Velvet Card, Gloss UV"
                  className="w-full h-9 px-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">Value Code Identifier</label>
                <input
                  type="text"
                  value={valFormValue}
                  onChange={(e) => setValFormValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, '_'))}
                  placeholder="e.g. 300_gsm_velvet_card"
                  className="w-full h-9 px-3 text-xs font-mono bg-slate-50 text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {formEnableAdditionalPricing && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Price Adjustment (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valFormPriceModifier || ''}
                    onChange={(e) => setValFormPriceModifier(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full h-9 px-3 text-xs font-mono bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-slate-500">Base surcharge added when customer selects this value.</p>
                </div>
              )}

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={valFormIsDefault}
                    onChange={(e) => setValFormIsDefault(e.target.checked)}
                    className="w-4 h-4 text-black rounded focus:ring-black accent-amber-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Set as default selected value
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddValueModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSingleValue}
                className="px-4 py-2 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg border border-amber-300 cursor-pointer shadow-2xs"
              >
                {editingValueIdx !== null ? 'Update Value' : 'Add Value'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: BULK VALUES PASTE                               */}
      {/* ======================================================== */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bulk Add Option Values</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste multiple options at once (one per line).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
                <span className="font-bold">Supported Line Formats:</span>
                <code className="block bg-amber-100/70 p-1 rounded font-mono text-[11px]">
                  Option Label, value_code, price_addon
                </code>
                <span className="text-[11px] text-amber-800 block">
                  Example:<br />
                  130 GSM Gloss Art, 130_gsm, 0<br />
                  170 GSM Matte Art, 170_gsm, 25<br />
                  250 GSM Premium Card, 250_gsm, 50
                </span>
              </div>

              <textarea
                rows={6}
                value={bulkInputText}
                onChange={(e) => setBulkInputText(e.target.value)}
                placeholder="130 GSM Gloss Art&#10;170 GSM Matte Art&#10;250 GSM Premium Card"
                className="w-full p-3 text-xs font-mono bg-slate-50 text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-mono">
                {bulkInputText.trim()
                  ? `${bulkInputText.trim().split('\n').filter((l) => l.trim()).length} lines detected`
                  : '0 lines'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkAddValues}
                  disabled={!bulkInputText.trim()}
                  className="px-4 py-2 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg border border-amber-300 disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  Import All Values
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION                             */}
      {/* ======================================================== */}
      {deleteConfirmGroup && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <RiDeleteBin7Line className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Option Group</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <span className="font-bold block">Notice:</span>
              <span>
                Deleting <strong className="font-bold">{deleteConfirmGroup.name}</strong> will remove it from the reusable library. Products with cloned copies will keep their current configuration.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmGroup(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={isSaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                {isSaving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
