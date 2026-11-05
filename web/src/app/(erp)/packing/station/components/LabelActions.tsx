'use client';

import React from 'react';
import {
  RiPrinterLine,
  RiRefreshLine,
  RiCheckboxCircleFill,
  RiArrowRightLine,
  RiTruckLine,
  RiCheckDoubleLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

interface LabelActionsProps {
  labelPrinted: boolean;
  printCount: number;
  onPrintLabel: () => void;
  onReprintLabel: () => void;
  onCompletePacking: () => void;
  isCompleting: boolean;
  canComplete: boolean;
  isCompleted: boolean;
  printerName: string;
}

export function LabelActions({
  labelPrinted,
  printCount,
  onPrintLabel,
  onReprintLabel,
  onCompletePacking,
  isCompleting,
  canComplete,
  isCompleted,
  printerName,
}: LabelActionsProps) {
  return (
    <div className="space-y-3">
      {/* Print Label Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrintLabel}
          disabled={isCompleted}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-[12px] py-2.5 rounded-xl shadow-xs transition active:scale-95"
        >
          <RiPrinterLine className="h-4 w-4 text-amber-300" />
          <span>{labelPrinted ? `PRINT LABEL (${printerName})` : `PRINT 4×6 LABEL (${printerName})`}</span>
        </button>

        {labelPrinted && (
          <button
            type="button"
            onClick={onReprintLabel}
            className="flex items-center gap-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 transition"
            title="Reprint Shipping Label (Audited)"
          >
            <RiRefreshLine className="h-3.5 w-3.5" />
            <span>Reprint ({printCount})</span>
          </button>
        )}
      </div>

      {labelPrinted && !isCompleted && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] font-medium flex items-center gap-2">
          <RiCheckboxCircleFill className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Shipping label printed. Ready to complete packing handoff.</span>
        </div>
      )}

      {/* Main Action: Complete Packing & Move to Dispatch */}
      <button
        type="button"
        disabled={!canComplete || isCompleting || isCompleted}
        onClick={onCompletePacking}
        className="w-full flex items-center justify-center gap-2 bg-[#FFED00] hover:bg-[#FDD835] disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-black text-[13px] py-3.5 rounded-xl shadow-sm border border-[#E3A008]/50 transition active:scale-[0.98]"
      >
        <RiTruckLine className="h-4 w-4" />
        <span>
          {isCompleted
            ? '✓ PACKING COMPLETED (MOVED TO DISPATCH)'
            : isCompleting
            ? 'FINALIZING PACKING & DISPATCH HANDOFF...'
            : 'COMPLETE PACKING & MOVE TO DISPATCH'}
        </span>
      </button>
    </div>
  );
}
