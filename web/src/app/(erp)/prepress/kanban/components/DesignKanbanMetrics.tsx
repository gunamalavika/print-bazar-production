'use client';

import React from 'react';
import {
  RiFileSearchLine,
  RiPaintBrushLine,
  RiTimeLine,
  RiPrinterLine,
  RiAlertLine,
  RiCheckboxCircleLine,
  RiFlashlightLine,
} from 'react-icons/ri';

interface DesignKanbanMetricsProps {
  metrics: {
    totalActive: number;
    artworkCheck: number;
    designing: number;
    waitingApproval: number;
    readyToPrint: number;
    revisions: number;
  };
  studioInfo?: {
    statusText: string;
    designerCount: number;
    activeStationCount: number;
  };
}

export function DesignKanbanMetrics({ metrics, studioInfo }: DesignKanbanMetricsProps) {
  return (
    <div className="space-y-3">
      {/* Live Prepress & Design Velocity Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Active Queue */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
              TOTAL DESIGN QUEUE
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-slate-900 font-mono leading-none">
              {metrics.totalActive}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">In Pipeline</span>
          </div>
        </div>

        {/* Artwork Check */}
        <div className="bg-sky-50/50 border border-sky-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-sky-900">
              ARTWORK CHECK
            </span>
            <RiFileSearchLine className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-sky-950 font-mono leading-none">
              {metrics.artworkCheck}
            </span>
            <span className="text-[10px] text-sky-800 font-medium">Preflight Audit</span>
          </div>
        </div>

        {/* Designing Studio */}
        <div className="bg-amber-50/50 border border-amber-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-900">
              DESIGNING
            </span>
            <RiPaintBrushLine className="h-4 w-4 text-[#E3A008]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-amber-950 font-mono leading-none">
              {metrics.designing}
            </span>
            <span className="text-[10px] text-amber-800 font-medium">Studio Active</span>
          </div>
        </div>

        {/* Waiting for Approval */}
        <div className="bg-purple-50/50 border border-purple-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-purple-900">
              APPROVAL
            </span>
            <RiTimeLine className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-purple-950 font-mono leading-none">
              {metrics.waitingApproval}
            </span>
            <span className="text-[10px] text-purple-800 font-medium">Proof Sign-Off</span>
          </div>
        </div>

        {/* Ready to Print */}
        <div className="bg-emerald-50/50 border border-emerald-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-900">
              READY TO PRINT
            </span>
            <RiPrinterLine className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-emerald-950 font-mono leading-none">
              {metrics.readyToPrint}
            </span>
            <span className="text-[10px] text-emerald-800 font-medium">Press Released</span>
          </div>
        </div>

        {/* Revisions & Directives */}
        <div className="bg-rose-50/50 border border-rose-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-rose-900">
              REVISIONS
            </span>
            <RiAlertLine className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-rose-950 font-mono leading-none">
              {metrics.revisions}
            </span>
            <span className="text-[10px] text-rose-800 font-medium">OE Directives</span>
          </div>
        </div>
      </div>
    </div>
  );
}

