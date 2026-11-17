'use client';

import React, { useState, useEffect } from 'react';
import {
  RiCloseLine,
  RiSettings4Line,
  RiArrowUpLine,
  RiArrowDownLine,
  RiArchiveLine,
  RiDeleteBinLine,
  RiEditLine,
  RiAddLine,
  RiCheckLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';
import { KanbanColumnDto } from '@/lib/api';

interface BoardSettingsModalProps {
  isOpen: boolean;
  columns: KanbanColumnDto[];
  onClose: () => void;
  onReorder: (columnOrders: Array<{ id: string; sortOrder: number }>) => Promise<void>;
  onArchiveColumn: (id: string) => Promise<void>;
  onEditColumn?: (col: KanbanColumnDto) => void;
  onAddColumn?: () => void;
}

export function BoardSettingsModal({
  isOpen,
  columns,
  onClose,
  onReorder,
  onArchiveColumn,
  onEditColumn,
  onAddColumn,
}: BoardSettingsModalProps) {
  const [localCols, setLocalCols] = useState<KanbanColumnDto[]>(columns);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLocalCols(columns);
  }, [columns]);

  if (!isOpen) return null;

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= localCols.length) return;

    const copy = [...localCols];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setLocalCols(copy);
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = localCols.map((c, idx) => ({
        id: c.id,
        sortOrder: (idx + 1) * 10,
      }));
      await onReorder(payload);
      setSuccess('Column layout saved successfully.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save column order.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (col: KanbanColumnDto) => {
    if (col.cardCount > 0) {
      setError(`Cannot delete column "${col.name}" because it contains ${col.cardCount} active jobs. Move these jobs before deleting.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete column "${col.name}"?`)) {
      return;
    }

    try {
      await onArchiveColumn(col.id);
      setLocalCols(localCols.filter((c) => c.id !== col.id));
      setSuccess(`Column "${col.name}" deleted.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete column.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 text-[#FFED00] flex items-center justify-center font-bold">
              <RiSettings4Line className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Kanban Board Settings</h3>
              <p className="text-[11px] text-slate-500 font-mono">Reorder stations & manage workflow columns</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition"
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-1.5">
              <RiCheckLine className="h-4 w-4 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Active Stations ({localCols.length})
            </span>
            {onAddColumn && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={onAddColumn}
                className="text-xs text-slate-800 bg-amber-50 hover:bg-amber-100 border-amber-300 font-semibold"
              >
                <RiAddLine className="h-3.5 w-3.5 mr-1" />
                <span>Add Column</span>
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {localCols.map((col, index) => (
              <div
                key={col.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-slate-300 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div
                    className="h-3.5 w-3.5 rounded-full flex-shrink-0 shadow-xs"
                    style={{ backgroundColor: col.color || '#3B82F6' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 truncate">{col.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold uppercase">
                        {col.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block truncate">
                      {col.description || 'Station'} • {col.cardCount} active job{col.cardCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveColumn(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition"
                    title="Move station left"
                  >
                    <RiArrowUpLine className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveColumn(index, 'down')}
                    disabled={index === localCols.length - 1}
                    className="p-1.5 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition"
                    title="Move station right"
                  >
                    <RiArrowDownLine className="h-4 w-4" />
                  </button>

                  {onEditColumn && (
                    <button
                      type="button"
                      onClick={() => onEditColumn(col)}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition"
                      title="Edit station title & color"
                    >
                      <RiEditLine className="h-4 w-4 text-slate-600" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleArchive(col)}
                    className="p-1.5 rounded hover:bg-rose-100 text-rose-600 ml-1 transition"
                    title="Delete column"
                  >
                    <RiDeleteBinLine className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSaving}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={handleSaveOrder}
              isLoading={isSaving}
              className="shadow-brand"
            >
              <span>Save Column Order</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
