'use client';

import React, { useState } from 'react';
import {
  RiCloseLine,
  RiSettings4Line,
  RiArrowUpLine,
  RiArrowDownLine,
  RiArchiveLine,
  RiAlertLine,
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
}

export function BoardSettingsModal({
  isOpen,
  columns,
  onClose,
  onReorder,
  onArchiveColumn,
}: BoardSettingsModalProps) {
  const [localCols, setLocalCols] = useState<KanbanColumnDto[]>(columns);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setError(`Cannot archive column "${col.name}" because it contains ${col.cardCount} active jobs.`);
      return;
    }

    if (!confirm(`Are you sure you want to archive custom column "${col.name}"?`)) {
      return;
    }

    try {
      await onArchiveColumn(col.id);
      setLocalCols(localCols.filter((c) => c.id !== col.id));
      setSuccess(`Column "${col.name}" archived.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to archive column.');
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
              <p className="text-[11px] text-slate-500 font-mono">Reorder stations & manage custom workflow columns</p>
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

          <div className="text-xs text-slate-500">
            Use the arrows to adjust station sequence. System columns cannot be deleted to preserve core state transitions.
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {localCols.map((col, index) => (
              <div
                key={col.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: col.color || '#3B82F6' }}
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block truncate">{col.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {col.type} • {col.cardCount} active jobs
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveColumn(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                    title="Move station left"
                  >
                    <RiArrowUpLine className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveColumn(index, 'down')}
                    disabled={index === localCols.length - 1}
                    className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                    title="Move station right"
                  >
                    <RiArrowDownLine className="h-4 w-4" />
                  </button>

                  {col.type !== 'SYSTEM' && (
                    <button
                      type="button"
                      onClick={() => handleArchive(col)}
                      className="p-1 rounded hover:bg-rose-100 text-rose-600 ml-1"
                      title="Archive custom column"
                    >
                      <RiArchiveLine className="h-4 w-4" />
                    </button>
                  )}
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
            >
              <span>Save Column Order</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
