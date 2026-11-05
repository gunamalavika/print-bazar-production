'use client';

import React, { useState } from 'react';
import {
  RiAlertFill,
  RiCloseLine,
  RiAlertLine,
  RiErrorWarningLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';
import { QCJobCardDto } from './QCJobCard';

const FINAL_QC_REASONS = [
  'Color Mismatch vs Signed Proof (Delta-E > 3.0)',
  'Surface Scratch / Ink Smudge',
  'Crooked Trim / Offset Die Cutting',
  'Lamination Delamination / Air Bubbles',
  'Physical Count Discrepancy',
  'Binding / Folding Alignment Defect',
];

interface QCHoldModalProps {
  card: QCJobCardDto | null;
  targetKey: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, notes?: string) => Promise<void>;
}

export function QCHoldModal({
  card,
  targetKey,
  isOpen,
  onClose,
  onSubmit,
}: QCHoldModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !card) return null;

  const presets = FINAL_QC_REASONS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedPreset || customNotes;
    if (!finalReason) {
      setError('Please select a reason preset or provide detailed technical notes.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(finalReason, customNotes || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to place order on hold.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <RiAlertLine className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-rose-950 uppercase tracking-tight">
                Flag Quality Defect & Hold
              </h3>
              <p className="text-[11px] text-rose-700 font-mono">
                Order #{card.orderNumber} • {card.productName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <RiErrorWarningLine className="h-4 w-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Primary Quality Reason:
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {presets.map((preset) => (
                <label
                  key={preset}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                    selectedPreset === preset
                      ? 'border-rose-500 bg-rose-50/70 text-rose-900 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="holdReasonPreset"
                    checked={selectedPreset === preset}
                    onChange={() => {
                      setSelectedPreset(preset);
                      setError(null);
                    }}
                    className="mt-0.5 accent-rose-600 h-3.5 w-3.5"
                  />
                  <span>{preset}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Technical Defect Description & Required Action:
            </label>
            <textarea
              rows={3}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Detail specific defect (e.g. Artwork is 72 DPI, customer proof revision sent, production held)..."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-1 focus:ring-rose-500 transition resize-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isSubmitting || (!selectedPreset && !customNotes)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg shadow-xs transition active:scale-95"
            >
              {isSubmitting ? 'Flagging Hold...' : 'Confirm Defect & Hold Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
