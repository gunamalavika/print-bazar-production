'use client';

import React, { useState } from 'react';
import {
  RiCloseLine,
  RiFilePdfLine,
  RiDownload2Line,
  RiUser3Line,
  RiPhoneLine,
  RiMailLine,
  RiShieldCheckLine,
  RiAlertFill,
  RiCheckDoubleLine,
  RiExternalLinkLine,
  RiPaintBrushLine,
} from 'react-icons/ri';
import { DesignCardItem, DesignKanbanStage } from './DesignJobCard';
import { Button } from '@/components/ui';
import { resolveImageUrl } from '@/lib/api';

interface DesignJobInspectModalProps {
  isOpen: boolean;
  card: DesignCardItem | null;
  onClose: () => void;
  onUpdateStage: (card: DesignCardItem, targetStage: DesignKanbanStage, notes?: string) => Promise<void>;
}

export function DesignJobInspectModal({
  isOpen,
  card,
  onClose,
  onUpdateStage,
}: DesignJobInspectModalProps) {
  const [selectedStage, setSelectedStage] = useState<DesignKanbanStage | ''>('');
  const [prepressNotes, setPrepressNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !card) return null;

  const currentStage = card.stage;
  const activeTargetStage = selectedStage || currentStage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTargetStage) return;

    setIsSubmitting(true);
    try {
      await onUpdateStage(card, activeTargetStage, prepressNotes.trim() || undefined);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 font-mono">
                {card.orderNumber}
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                {card.stage.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {card.productName} • {card.quantity.toLocaleString()} units
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Information */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">
              {card.companyName ? `${card.companyName} (${card.customerName})` : card.customerName || 'Direct Customer'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Created: {new Date(card.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 flex-wrap">
            {card.customerPhone && (
              <span className="flex items-center gap-1 font-mono">
                <RiPhoneLine className="w-3.5 h-3.5 text-slate-400" />
                {card.customerPhone}
              </span>
            )}
            {card.customerEmail && (
              <span className="flex items-center gap-1 font-mono">
                <RiMailLine className="w-3.5 h-3.5 text-slate-400" />
                {card.customerEmail}
              </span>
            )}
          </div>
        </div>

        {/* Specifications Breakdown */}
        {card.specifications && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              Job Specifications
            </h4>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs grid grid-cols-2 gap-2">
              {card.specifications.selectedOptions && Array.isArray(card.specifications.selectedOptions) ? (
                card.specifications.selectedOptions.map((spec: any, idx: number) => (
                  <div key={idx} className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-400 block font-bold uppercase">
                      {spec.fieldLabel || spec.label}
                    </span>
                    <span className="font-bold text-slate-900 text-xs block mt-0.5">
                      {String(spec.value)}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  {card.specifications.dimensions && (
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-400 block font-bold uppercase">Dimensions</span>
                      <span className="font-bold text-slate-900 text-xs">{String(card.specifications.dimensions)}</span>
                    </div>
                  )}
                  {card.specifications.paperGsm && (
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-400 block font-bold uppercase">Substrate</span>
                      <span className="font-bold text-slate-900 text-xs">{String(card.specifications.paperGsm)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Customer Notes / Brief */}
        {card.customerNotes && (
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-1">
            <span className="font-bold text-amber-900 block font-mono uppercase text-[10.5px]">
              Customer Design Brief / Instructions:
            </span>
            <p className="text-amber-950 italic">{card.customerNotes}</p>
          </div>
        )}

        {/* OE Directives Warning if present */}
        {card.revisionDirectives && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 text-rose-900">
            <span className="font-bold text-rose-800 block font-mono uppercase text-[10.5px] flex items-center gap-1.5">
              <RiAlertFill className="w-4 h-4 text-rose-600" />
              Returned for Revisions by {card.returnedBy || 'Operations'}:
            </span>
            <p className="italic">{card.revisionDirectives}</p>
          </div>
        )}

        {/* Stage Change / Prepress Note Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-slate-200">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Advance or Change Kanban Stage:
            </label>
            <select
              value={selectedStage || card.stage}
              onChange={(e) => setSelectedStage(e.target.value as DesignKanbanStage)}
              className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
            >
              <option value="ARTWORK_CHECK">Stage 1: Artwork Check</option>
              <option value="DESIGNING">Stage 2: Designing</option>
              <option value="WAITING_FOR_APPROVAL">Stage 3: Waiting for Approval</option>
              <option value="READY_TO_PRINT">Stage 4: Ready to Print</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Prepress / Handover Notes (Optional):
            </label>
            <textarea
              rows={2}
              value={prepressNotes}
              onChange={(e) => setPrepressNotes(e.target.value)}
              placeholder="e.g., Bleed confirmed 3mm, color profile CMYK FOGRA39, customer proof approved via WhatsApp..."
              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="shadow-brand"
            >
              {isSubmitting ? 'Saving...' : 'Update Stage & Save Notes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

