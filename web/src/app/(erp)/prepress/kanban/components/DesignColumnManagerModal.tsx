'use client';

import React from 'react';
import {
  RiCloseLine,
  RiSettings4Line,
  RiArrowUpLine,
  RiArrowDownLine,
  RiDeleteBinLine,
  RiEditLine,
  RiAddLine,
  RiRestartLine,
  RiInformationLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';
import { PrepressColumnConfig } from './DesignColumnEditModal';

interface DesignColumnManagerModalProps {
  isOpen: boolean;
  columns: PrepressColumnConfig[];
  cardCounts: Record<string, number>;
  onClose: () => void;
  onReorder: (newColumns: PrepressColumnConfig[]) => void;
  onEditColumn: (column: PrepressColumnConfig) => void;
  onDeleteColumn: (columnKey: string) => void;
  onAddNewColumn: () => void;
  onResetDefaults: () => void;
}

export function DesignColumnManagerModal({
  isOpen,
  columns,
  cardCounts,
  onClose,
  onReorder,
  onEditColumn,
  onDeleteColumn,
  onAddNewColumn,
  onResetDefaults,
}: DesignColumnManagerModalProps) {
  if (!isOpen) return null;

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= columns.length) return;

    const copy = [...columns];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    onReorder(copy);
  };

  const handleDelete = (col: PrepressColumnConfig) => {
    const count = cardCounts[col.key] || 0;
    if (count > 0) {
      const confirmMove = confirm(
        `Column "${col.name}" has ${count} active job(s). Deleting it will safely reassign those jobs to "Artwork Check". Do you wish to proceed?`
      );
      if (!confirmMove) return;
    } else {
      if (!confirm(`Are you sure you want to delete column "${col.name}"?`)) return;
    }
    onDeleteColumn(col.key);
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
              <h3 className="font-bold text-sm text-slate-900">Manage Prepress Columns</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Add, edit, reorder & delete Kanban quality stages
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

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Active Prepress Pipeline Columns ({columns.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onAddNewColumn}
              className="text-xs text-slate-800 bg-amber-50 hover:bg-amber-100 border-amber-300 font-semibold"
            >
              <RiAddLine className="h-3.5 w-3.5 mr-1" />
              <span>Add Column</span>
            </Button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {columns.map((col, index) => {
              const count = cardCounts[col.key] || 0;
              return (
                <div
                  key={col.key}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className="h-3.5 w-3.5 rounded-full flex-shrink-0 shadow-xs"
                      style={{ backgroundColor: col.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{col.name}</span>
                        {col.isCustom && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200 font-bold">
                            CUSTOM
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {col.subtitle || col.description} • {count} active job{count === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => moveColumn(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition"
                      title="Move column left / up"
                    >
                      <RiArrowUpLine className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => moveColumn(index, 'down')}
                      disabled={index === columns.length - 1}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition"
                      title="Move column right / down"
                    >
                      <RiArrowDownLine className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditColumn(col)}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition"
                      title="Edit column name & color"
                    >
                      <RiEditLine className="h-4 w-4 text-slate-600" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(col)}
                      className="p-1.5 rounded hover:bg-rose-100 text-rose-600 transition"
                      title={col.isCustom ? 'Delete custom column' : 'Delete column'}
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset Prepress Kanban to the 4 default quality gates?')) {
                  onResetDefaults();
                }
              }}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:underline"
            >
              <RiRestartLine className="h-3.5 w-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <Button variant="primary" size="sm" type="button" onClick={onClose} className="shadow-brand">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

