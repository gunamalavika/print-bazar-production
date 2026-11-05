'use client';

import React, { useState } from 'react';
import {
  RiCloseLine,
  RiAddLine,
  RiLayoutColumnLine,
  RiInformationLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    type: 'CUSTOM' | 'HOLD';
    color: string;
    mappedStation?: string;
  }) => Promise<void>;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#EC4899', // Pink
  '#EF4444', // Red
  '#64748B', // Slate
];

export function AddColumnModal({ isOpen, onClose, onSubmit }: AddColumnModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'CUSTOM' | 'HOLD'>('CUSTOM');
  const [color, setColor] = useState('#8B5CF6');
  const [mappedStation, setMappedStation] = useState('PRINTING');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Column name is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        color,
        mappedStation,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create column.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#FFED00] text-slate-950 flex items-center justify-center font-bold">
              <RiLayoutColumnLine className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Add Production Column</h3>
              <p className="text-[11px] text-slate-500 font-mono">Create dynamic shop-floor workflow column</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition"
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Column Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Awaiting Substrate, Heat Press Curing..."
              className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Waiting for 350 GSM Art Card delivery from supplier"
              className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white text-slate-700"
            />
          </div>

          {/* Column Type */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Column Behavior Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('CUSTOM')}
                className={`p-2.5 rounded-lg border text-left transition text-xs ${
                  type === 'CUSTOM'
                    ? 'border-slate-900 bg-amber-50/50 ring-1 ring-slate-900 font-bold text-slate-900'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                }`}
              >
                <div className="font-bold">Operational Station</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-normal">Active manufacturing queue</div>
              </button>

              <button
                type="button"
                onClick={() => setType('HOLD')}
                className={`p-2.5 rounded-lg border text-left transition text-xs ${
                  type === 'HOLD'
                    ? 'border-rose-900 bg-rose-50 ring-1 ring-rose-900 font-bold text-rose-900'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                }`}
              >
                <div className="font-bold text-rose-800">Hold / Block Exception</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-normal">Requires mandatory reason</div>
              </button>
            </div>
          </div>

          {/* Station Mapping */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Related Manufacturing Station
            </label>
            <select
              value={mappedStation}
              onChange={(e) => setMappedStation(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white font-medium"
            >
              <option value="PRINTING">Press Station (Printing)</option>
              <option value="FINISHING">Post-Press (Finishing & Binding)</option>
              <option value="FINAL_QC">Quality Engineering (Final QC)</option>
              <option value="PACKING">Packaging & Bundling Station</option>
              <option value="DISPATCH">Logistics & Courier Handover</option>
            </select>
          </div>

          {/* Color Accent Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
              Column Color Accent
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-110 border-slate-900 shadow-xs' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              <span>Create Column</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
