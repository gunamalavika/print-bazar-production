'use client';

import React, { useState } from 'react';
import {
  RiCloseLine,
  RiAlertLine,
  RiAlertFill,
} from 'react-icons/ri';
import { Button } from '@/components/ui';
import { KanbanCardDto } from '@/lib/api';

interface HoldReasonModalProps {
  isOpen: boolean;
  card: KanbanCardDto | null;
  targetColumnName: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

const COMMON_HOLD_REASONS = [
  'Substrate stock out (Raw paper / greyboard shortage)',
  'HP Indigo maintenance / printhead calibration required',
  'Lamination film / thermal foil replenishment',
  'Artwork resolution / customer bleed adjustment required',
  'Color calibration variance / delta-E out of tolerance',
  'Die-cutting blade repair / registration realignment',
];

export function HoldReasonModal({
  isOpen,
  card,
  targetColumnName,
  onClose,
  onSubmit,
}: HoldReasonModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !card) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a specific hold reason (minimum 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(reason.trim());
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to place job on hold.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/80">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
              <RiAlertFill className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Hold / Block Exception</h3>
              <p className="text-[11px] text-rose-700 font-mono">
                Moving {card.orderNumber} to {targetColumnName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-rose-200/50 transition"
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

          {/* Job summary pill */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">JOB:</span>
              <span className="text-slate-900 font-bold">{card.orderNumber} ({card.jobNumber})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">PRODUCT:</span>
              <span className="text-slate-900 truncate max-w-[200px]">{card.productName} ({card.quantity} pcs)</span>
            </div>
          </div>

          {/* Quick Preset Reasons */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Preset Hold Reason:
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              {COMMON_HOLD_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`w-full text-left p-2 rounded-lg text-[11px] border transition flex items-center justify-between ${
                    reason === preset
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <span className="truncate">{preset}</span>
                  {reason === preset && <span className="text-[10px] text-rose-700 font-mono font-bold">SELECTED</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Reason Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Detailed Reason / Incident Notes *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the specific issue requiring manufacturing hold..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-900 focus:bg-white text-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="submit"
              isLoading={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <span>Confirm & Place on Hold</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
