'use client';

import React from 'react';
import {
  RiPrinterLine,
  RiCheckboxCircleLine,
  RiBox3Line,
  RiTruckLine,
  RiAlertLine,
  RiTimeLine,
  RiFlashlightLine,
} from 'react-icons/ri';

interface ProductionMetricsProps {
  metrics: {
    activeJobs: number;
    printing: number;
    finishing: number;
    finalQc: number;
    packing: number;
    readyForDispatch: number;
    dispatched: number;
    onHold: number;
  };
  shiftInfo: {
    shiftName: string;
    liveStatus: string;
    activePressCount: number;
    operatorCount: number;
  };
}

export function ProductionMetrics({ metrics, shiftInfo }: ProductionMetricsProps) {
  return (
    <div className="space-y-3">
      {/* Live Manufacturing Velocity Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Active Jobs Total */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-500">ACTIVE SHOP JOBS</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-slate-900 font-mono leading-none">
              {metrics.activeJobs}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">In Pipeline</span>
          </div>
        </div>

        {/* Printing Running */}
        <div className="bg-amber-50/50 border border-amber-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-900">PRINTING</span>
            <RiPrinterLine className="h-4 w-4 text-[#E3A008]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-amber-950 font-mono leading-none">
              {metrics.printing}
            </span>
            <span className="text-[10px] text-amber-800 font-medium">Press Running</span>
          </div>
        </div>

        {/* Finishing Post-Press */}
        <div className="bg-purple-50/50 border border-purple-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-purple-900">FINISHING</span>
            <RiTimeLine className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-purple-950 font-mono leading-none">
              {metrics.finishing}
            </span>
            <span className="text-[10px] text-purple-800 font-medium">Post-Press</span>
          </div>
        </div>

        {/* Final QC Inspection */}
        <div className="bg-emerald-50/50 border border-emerald-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-900">FINAL QC</span>
            <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-emerald-950 font-mono leading-none">
              {metrics.finalQc}
            </span>
            <span className="text-[10px] text-emerald-800 font-medium">Gate Review</span>
          </div>
        </div>

        {/* Packing Station */}
        <div className="bg-cyan-50/50 border border-cyan-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-cyan-900">PACKING</span>
            <RiBox3Line className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-cyan-950 font-mono leading-none">
              {metrics.packing}
            </span>
            <span className="text-[10px] text-cyan-800 font-medium">Bundling</span>
          </div>
        </div>

        {/* Ready For Dispatch */}
        <div className="bg-orange-50/50 border border-orange-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-orange-900">STAGE DISPATCH</span>
            <RiTruckLine className="h-4 w-4 text-orange-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-orange-950 font-mono leading-none">
              {metrics.readyForDispatch}
            </span>
            <span className="text-[10px] text-orange-800 font-medium">Waybill Staged</span>
          </div>
        </div>

        {/* Holds / Exceptions */}
        <div
          className={`border rounded-xl p-3.5 shadow-xs flex flex-col justify-between transition-colors ${
            metrics.onHold > 0
              ? 'bg-rose-50/60 border-rose-300'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-mono uppercase font-bold ${
                metrics.onHold > 0 ? 'text-rose-900' : 'text-slate-500'
              }`}
            >
              HOLDS & ISSUES
            </span>
            <RiAlertLine
              className={`h-4 w-4 ${metrics.onHold > 0 ? 'text-rose-600' : 'text-slate-400'}`}
            />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-[22px] font-bold font-mono leading-none ${
                metrics.onHold > 0 ? 'text-rose-950' : 'text-slate-900'
              }`}
            >
              {metrics.onHold}
            </span>
            <span
              className={`text-[10px] font-medium ${
                metrics.onHold > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'
              }`}
            >
              {metrics.onHold > 0 ? 'Action Needed' : 'Zero Blocks'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
