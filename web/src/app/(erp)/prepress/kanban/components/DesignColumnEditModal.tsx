'use client';

import React, { useState, useEffect } from 'react';
import {
  RiCloseLine,
  RiLayoutColumnLine,
  RiPaintBrushLine,
  RiCheckLine,
  RiDeleteBinLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

export interface PrepressColumnConfig {
  key: string;
  name: string;
  subtitle: string;
  color: string;
  description: string;
  isCustom?: boolean;
}

interface DesignColumnEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  column?: PrepressColumnConfig | null; // null if adding new column
  onSave: (columnData: PrepressColumnConfig) => void;
  onDelete?: (columnKey: string) => void;
}

const PRESET_COLORS = [
  '#0284C7', // Sky-600 (Artwork Check)
  '#F59E0B', // Amber-500 (Designing)
  '#8B5CF6', // Purple-500 (Waiting Approval)
  '#10B981', // Emerald-500 (Ready to Print)
  '#EC4899', // Pink-500
  '#6366F1', // Indigo-500
  '#06B6D4', // Cyan-500
  '#F97316', // Orange-500
  '#EF4444', // Red-500
  '#64748B', // Slate-500
  '#14B8A6', // Teal-500
  '#84CC16', // Lime-500
];

export function DesignColumnEditModal({
  isOpen,
  onClose,
  column,
  onSave,
  onDelete,
}: DesignColumnEditModalProps) {
  const isEditing = Boolean(column);

  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#8B5CF6');
  const [error, setError] = useState('');

  useEffect(() => {
    if (column) {
      setName(column.name || '');
      setSubtitle(column.subtitle || '');
      setDescription(column.description || '');
      setColor(column.color || '#8B5CF6');
    } else {
      setName('');
      setSubtitle('');
      setDescription('');
      setColor('#0284C7');
    }
    setError('');
  }, [column, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Column title is required.');
      return;
    }

    const key =
      column?.key ||
      `CUSTOM_${name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;

    onSave({
      key,
      name: name.trim(),
      subtitle: subtitle.trim() || 'Custom Workflow Stage',
      description: description.trim() || 'Jobs in custom prepress workflow station.',
      color,
      isCustom: column ? column.isCustom : true,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white shadow-xs"
              style={{ backgroundColor: color }}
            >
              <RiLayoutColumnLine className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {isEditing ? `Edit Column: ${column?.name}` : 'Add New Prepress Column'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {isEditing ? 'Update station label and appearance' : 'Create custom quality gate or workflow station'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition"
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Column Title */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Column Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Special Proofing, Bleed Correction..."
              className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white font-medium"
            />
          </div>

          {/* Subtitle / Tagline */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Subtitle / Step Description
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Client color confirmation on metallic sheet"
              className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white text-slate-700"
            />
          </div>

          {/* Detailed Instructions / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Detailed Description / Gate Policy
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Inspect RGB to CMYK gamut warning and verify proof signoff"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white text-slate-700 resize-none"
            />
          </div>

          {/* Accent Color Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Station Color Accent
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border flex items-center justify-center transition-all ${color.toLowerCase() === c.toLowerCase()
                      ? 'scale-110 ring-2 ring-slate-900 ring-offset-2 border-white'
                      : 'hover:scale-105 border-transparent opacity-85'
                    }`}
                  style={{ backgroundColor: c }}
                >
                  {color.toLowerCase() === c.toLowerCase() && (
                    <RiCheckLine className="h-3.5 w-3.5 text-white" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-mono text-slate-500">Custom Hex:</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-9 p-0.5 rounded border border-slate-200 cursor-pointer bg-white"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#0284C7"
                className="h-8 w-28 px-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            {isEditing && onDelete && column ? (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete column "${column.name}"?`)) {
                    onDelete(column.key);
                    onClose();
                  }
                }}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-xs flex items-center"
              >
                <RiDeleteBinLine className="h-3.5 w-3.5 mr-1 text-rose-500" />
                <span>Delete Column</span>
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" className="shadow-brand">
                <span>{isEditing ? 'Update Column' : 'Add Column'}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

