'use client';

import React, { useState, useEffect } from 'react';
import { RiCloseLine, RiLayoutColumnLine, RiCheckLine, RiDeleteBinLine } from 'react-icons/ri';
import { Button } from '@/components/ui';
import { KanbanColumnDto } from '@/lib/api';

interface EditProductionColumnModalProps {
  isOpen: boolean;
  column: KanbanColumnDto | null;
  onClose: () => void;
  onSubmit: (id: string, data: { name: string; description?: string; color: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
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
  '#14B8A6', // Teal
];

export function EditProductionColumnModal({
  isOpen,
  column,
  onClose,
  onSubmit,
  onDelete,
}: EditProductionColumnModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (column) {
      setName(column.name || '');
      setDescription(column.description || '');
      setColor(column.color || '#3B82F6');
      setError('');
    }
  }, [column, isOpen]);

  if (!isOpen || !column) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Column name is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(column.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update column.');
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
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white shadow-xs"
              style={{ backgroundColor: color }}
            >
              <RiLayoutColumnLine className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Edit Column: {column.name}</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {column.type} Station • {column.cardCount} active jobs
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
              Column Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Printing, Lamination..."
              className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Station Description / Notes
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Heidelberg Offset Press Curing"
              className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white text-slate-700"
            />
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Accent Color
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border flex items-center justify-center transition-all ${
                    color.toLowerCase() === c.toLowerCase()
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
                placeholder="#3B82F6"
                className="h-8 w-28 px-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            {onDelete ? (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={async () => {
                  if (column.cardCount > 0) {
                    setError(`Cannot delete column "${column.name}" because it contains ${column.cardCount} active jobs.`);
                    return;
                  }
                  if (confirm(`Are you sure you want to delete column "${column.name}"?`)) {
                    await onDelete(column.id);
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
              <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting} className="shadow-brand">
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

