'use client';

import React from 'react';
import { DynamicField, DynamicFieldOption, resolveImageUrl } from '@/lib/api';
import { RiCheckLine, RiInformationLine } from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';

// Backward compatibility helper stubs (safe defaults without legacy hacks)
export function formatSlotLabel(rawLabel: string): { title: string; placeholder: string } {
  const clean = (rawLabel || '').trim();
  if (!clean) return { title: 'ARTWORK FILE', placeholder: 'Click or drag artwork file' };
  const words = clean.replace(/[_-]+/g, ' ').split(' ').filter(Boolean);
  const baseTitle = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return {
    title: baseTitle.toUpperCase(),
    placeholder: `Click or drag ${baseTitle} file`,
  };
}

export function isPrintingLocationField(_field?: any): boolean {
  return false;
}

export function isLetUsDesignField(_field?: any): boolean {
  return false;
}

export function isDoubleSideSelection(_val?: any, _opt?: any): boolean {
  return false;
}

export function isDesignServiceYes(_val?: any, _opt?: any): boolean {
  return false;
}

export function isDesignServiceNo(_val?: any, _opt?: any): boolean {
  return false;
}

export interface DynamicFieldRendererProps {
  field: DynamicField | any;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  disabledReason?: string;
  productId?: string;
  slotFiles?: Record<string, any>;
  onSlotFileUpload?: (slotKey: string, file: File) => Promise<void>;
  onSlotFileRemove?: (slotKey: string) => void;
  uploadingSlots?: Record<string, boolean>;
  slotErrors?: Record<string, string>;
  designNotes?: string;
  onDesignNotesChange?: (notes: string) => void;
  allFieldValues?: Record<string, any>;
  allFields?: any[];
}

export function DynamicFieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled = false,
  disabledReason,
}: DynamicFieldRendererProps) {
  const rawType = (field.inputType || field.type || 'SELECT').toUpperCase();
  const label = field.name || field.label || '';
  const description = field.description;
  const isRequired = Boolean(field.isRequired);
  const options: DynamicFieldOption[] = (field.options || []).map((o: any) => ({
    id: o.id || o.value,
    fieldId: o.groupId || o.fieldId || field.id,
    label: o.label || o.name || o.value,
    value: o.value || o.code || o.label,
    priceModifierType: o.priceModifierType || 'FIXED',
    priceModifier: o.priceModifier || 0,
    sortOrder: o.sortOrder || 0,
    isDefault: Boolean(o.isDefault),
    isActive: o.isActive !== false,
    fileCount: o.fileCount,
    fileSlotLabels: o.fileSlotLabels,
    minMegapixels: o.minMegapixels,
    imageUrl: o.imageUrl,
    includeImage: o.includeImage,
    isDisabled: Boolean(o.isDisabled),
    disabledReason: o.disabledReason,
  }));

  // Helper to render price modifier badge on option
  const renderPriceBadge = (opt: DynamicFieldOption, isSelected: boolean) => {
    const mod = Number(opt.priceModifier || 0);
    if (!mod || isNaN(mod) || mod === 0) return null;
    const sign = mod > 0 ? '+' : '';
    const formatted =
      opt.priceModifierType === 'PERCENTAGE'
        ? `${sign}${mod}%`
        : `${sign}${formatCurrency(mod)}${opt.priceModifierType === 'PER_UNIT' ? '/pc' : ''}`;

    return (
      <span
        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded transition-colors ${
          isSelected
            ? 'bg-[#FFED00] text-slate-950 font-black border border-[#E3A008]/50 shadow-2xs'
            : 'bg-amber-50 text-amber-900 border border-amber-200/80 group-hover:bg-amber-100/70'
        }`}
      >
        {formatted}
      </span>
    );
  };

  return (
    <div className={`space-y-2.5 ${disabled ? 'opacity-60' : ''}`}>
      {/* Group Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <label className="text-xs sm:text-[13px] font-bold text-slate-900 flex items-center gap-1.5 font-sans tracking-tight uppercase">
            <span>{label}</span>
            {isRequired ? (
              <span className="text-amber-600 font-bold text-xs" title="Required option">
                *
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400 font-normal lowercase">(optional)</span>
            )}
            {disabled && disabledReason && (
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 normal-case">
                {disabledReason}
              </span>
            )}
          </label>
          {description && (
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Control Rendering by InputType */}
      <div>
        {/* RADIO / Option Cards */}
        {rawType === 'RADIO' && (
          <div className={`grid gap-2 sm:gap-2.5 ${options.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : options.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {options.map((opt: any) => {
              const isSelected = String(value) === String(opt.value);
              const badge = renderPriceBadge(opt, isSelected);
              const isOptDisabled = Boolean(disabled || opt.isDisabled);

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isOptDisabled}
                  title={opt.disabledReason || (opt.isDisabled ? 'Not available with current selection' : undefined)}
                  onClick={() => !isOptDisabled && onChange(opt.value)}
                  className={`group w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-150 ${
                    opt.isDisabled
                      ? 'border-slate-200 bg-slate-50/70 text-slate-400 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'border-[#FFED00] bg-[#FFFEF0] ring-2 ring-[#FFED00] shadow-xs cursor-pointer'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-800 cursor-pointer'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className={`text-xs sm:text-[13px] block truncate transition-colors ${
                        opt.isDisabled
                          ? 'font-medium text-slate-400 line-through'
                          : isSelected
                          ? 'font-black text-slate-950'
                          : 'font-semibold text-slate-800'
                      }`}
                    >
                      {opt.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {opt.isDisabled ? (
                      <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold shrink-0">
                        Unavailable
                      </span>
                    ) : (
                      badge && <div className="flex-shrink-0">{badge}</div>
                    )}
                    {isSelected && !opt.isDisabled && (
                      <div className="h-5 w-5 rounded-md bg-[#FFED00] text-slate-950 flex items-center justify-center font-bold shadow-2xs border border-[#E3A008]/40 shrink-0">
                        <RiCheckLine className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* SELECT Dropdown */}
        {rawType === 'SELECT' && (
          <div className="relative">
            <select
              value={value ?? ''}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 transition shadow-2xs disabled:bg-slate-50 disabled:cursor-not-allowed appearance-none"
            >
              <option value="" disabled>
                Select {label}...
              </option>
              {options.map((opt: any) => {
                const mod = Number(opt.priceModifier || 0);
                const modText = mod !== 0 ? ` (${mod > 0 ? '+' : ''}${opt.priceModifierType === 'PERCENTAGE' ? `${mod}%` : formatCurrency(mod)})` : '';
                return (
                  <option key={opt.id} value={opt.value} disabled={opt.isDisabled}>
                    {opt.label}{opt.isDisabled ? ' — (Unavailable)' : ''}{modText}
                  </option>
                );
              })}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>
        )}

        {/* CHECKBOX Multi/Single Selection */}
        {rawType === 'CHECKBOX' && (
          <div className="space-y-2">
            {options.map((opt) => {
              const isChecked = Array.isArray(value)
                ? value.includes(opt.value)
                : String(value) === String(opt.value) || Boolean(value);

              const handleToggle = () => {
                if (Array.isArray(value)) {
                  if (isChecked) {
                    onChange(value.filter((v) => v !== opt.value));
                  } else {
                    onChange([...value, opt.value]);
                  }
                } else {
                  onChange(isChecked ? '' : opt.value);
                }
              };

              const badge = renderPriceBadge(opt, isChecked);

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  onClick={handleToggle}
                  className={`group w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                    isChecked
                      ? 'border-slate-950 bg-slate-950 text-white ring-1.5 ring-slate-950 shadow-xs'
                      : 'border-slate-200/90 bg-white hover:border-slate-400 hover:bg-slate-50/70 text-slate-800'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isChecked
                          ? 'border-[#FFED00] bg-[#FFED00] text-slate-950'
                          : 'border-slate-300 bg-white group-hover:border-slate-400'
                      }`}
                    >
                      {isChecked && <RiCheckLine className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs sm:text-[13px] block truncate transition-colors ${
                        isChecked ? 'font-black text-white' : 'font-semibold text-slate-800'
                      }`}
                    >
                      {opt.label}
                    </span>
                  </div>
                  {badge && <div className="flex-shrink-0">{badge}</div>}
                </button>
              );
            })}
          </div>
        )}

        {/* TOGGLE Switch */}
        {rawType === 'TOGGLE' && (
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-900 block">{label}</span>
              {options[0] && (
                <span className="text-[11px] text-slate-500">
                  {options[0].label} {Number(options[0].priceModifier || 0) > 0 && `(+${formatCurrency(Number(options[0].priceModifier))})`}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                const optVal = options[0]?.value || 'true';
                const isCurrentlyActive = String(value) === String(optVal) || value === true;
                onChange(isCurrentlyActive ? '' : optVal);
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                (String(value) === String(options[0]?.value || 'true') || value === true)
                  ? 'bg-slate-950'
                  : 'bg-slate-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  (String(value) === String(options[0]?.value || 'true') || value === true)
                    ? 'translate-x-5'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {/* TEXTAREA Multi-line Text Input */}
        {rawType === 'TEXTAREA' && (
          <div className="space-y-2">
            <textarea
              rows={3}
              value={value ?? ''}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Enter ${label}...`}
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 transition shadow-2xs resize-y disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
            {options.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Suggestions:</span>
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(opt.label || opt.value)}
                    className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md border border-slate-200 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DATE Picker */}
        {rawType === 'DATE' && (
          <input
            type="date"
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-950 transition shadow-2xs disabled:bg-slate-50 disabled:cursor-not-allowed"
          />
        )}

        {/* Standard Single-line inputs: TEXT, NUMBER, EMAIL, PHONE */}
        {(rawType === 'TEXT' || rawType === 'NUMBER' || rawType === 'EMAIL' || rawType === 'PHONE') && (
          <div className="space-y-2">
            <input
              type={
                rawType === 'NUMBER'
                  ? 'number'
                  : rawType === 'EMAIL'
                  ? 'email'
                  : rawType === 'PHONE'
                  ? 'tel'
                  : 'text'
              }
              value={value ?? ''}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Enter ${label}...`}
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-950 transition shadow-2xs disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
            {options.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Presets:</span>
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(opt.value || opt.label)}
                    className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md border border-slate-200 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
          <RiInformationLine className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
