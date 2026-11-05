'use client';

import React, { useState } from 'react';
import {
  RiCloseLine,
  RiShieldUserLine,
  RiAlertFill,
} from 'react-icons/ri';
import { Button } from '@/components/ui';
import { KanbanCardDto } from '@/lib/api';

interface ManagerOverrideModalProps {
  isOpen: boolean;
  card: KanbanCardDto | null;
  targetColumnName: string;
  onClose: () => void;
  onSubmit: (overrideReason: string) => Promise<void>;
}

export function ManagerOverrideModal({
  isOpen,
  card,
  targetColumnName,
  onClose,
  onSubmit,
}: ManagerOverrideModalProps) {
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !card) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim() || overrideReason.trim().length < 10) {
      setError('Manager override requires a structured reason of at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(overrideReason.trim());
      setOverrideReason('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Manager override failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-amber-200 flex items-center justify-between bg-amber-50/80">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#E3A008] text-slate-950 flex items-center justify-center font-bold">
              <RiShieldUserLine className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Manager Workflow Override</h3>
              <p className="text-[11px] text-amber-800 font-mono">
                Executive SLA & Sequence Bypass
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-amber-200/50 transition"
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
            <RiAlertFill className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              You are bypassing the normal production sequence for <strong>{card.orderNumber}</strong> to{' '}
              <strong>{targetColumnName}</strong>. This override will be permanently recorded in the immutable audit log.
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Override Reason Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Mandatory Override Justification (Min 10 chars) *
            </label>
            <textarea
              required
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Provide executive justification (e.g. VIP client express SLA fast-track authorized by Director)..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white text-slate-900 font-medium"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isSubmitting}
              className="shadow-brand"
            >
              <span>Execute Authorized Override</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
