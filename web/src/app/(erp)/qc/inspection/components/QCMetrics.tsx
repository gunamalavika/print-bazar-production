'use client';

import React from 'react';
import {
  RiShieldCheckLine,
  RiCheckboxCircleLine,
  RiAlertLine,
  RiTimeLine,
  RiPrinterLine,
  RiBox3Line,
  RiFlashlightLine,
  RiFileList3Line,
} from 'react-icons/ri';

interface QCMetricsProps {
  metrics: {
    totalActive: number;
    preQcQueue: number;
    inReview: number;
    finalQcQueue: number;
    passedToday: number;
    firstTimePassRate: number;
    holdsCount: number;
  };
}

export function QCMetrics({ metrics }: QCMetricsProps) {
  return (
    <div className="space-y-3">
      {/* Live Quality Assurance Velocity Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Active QA Orders */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-500">ACTIVE QC ORDERS</span>
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-slate-900 font-mono leading-none">
              {metrics.totalActive}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">In Inspection</span>
          </div>
        </div>

        {/* Pre-QC Artwork Gate */}
        <div className="bg-blue-50/50 border border-blue-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-blue-900">PRE-QC GATE</span>
            <RiFileList3Line className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-blue-950 font-mono leading-none">
              {metrics.preQcQueue}
            </span>
            <span className="text-[10px] text-blue-800 font-medium">12-Pt Pre-Press</span>
          </div>
        </div>

        {/* In Active Review */}
        <div className="bg-purple-50/50 border border-purple-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-purple-900">IN VERIFICATION</span>
            <RiTimeLine className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-purple-950 font-mono leading-none">
              {metrics.inReview}
            </span>
            <span className="text-[10px] text-purple-800 font-medium">Inspector Active</span>
          </div>
        </div>

        {/* Final Physical QC */}
        <div className="bg-amber-50/50 border border-amber-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-900">FINAL PHYSICAL QC</span>
            <RiPrinterLine className="h-4 w-4 text-[#E3A008]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-amber-950 font-mono leading-none">
              {metrics.finalQcQueue}
            </span>
            <span className="text-[10px] text-amber-800 font-medium">Post-Press Check</span>
          </div>
        </div>

        {/* Passed & Released to Production/Packing */}
        <div className="bg-emerald-50/50 border border-emerald-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-900">PASSED & RELEASED</span>
            <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-emerald-950 font-mono leading-none">
              {metrics.passedToday}
            </span>
            <span className="text-[10px] text-emerald-800 font-medium">100% Sign-Off</span>
          </div>
        </div>

        {/* First-Pass Yield (Quality Yield) */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-400">QUALITY YIELD</span>
            <RiFlashlightLine className="h-4 w-4 text-amber-300" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-amber-300 font-mono leading-none">
              {metrics.firstTimePassRate}%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">FTPR Target: 98%</span>
          </div>
        </div>

        {/* Holds & Technical Blocks */}
        <div
          className={`border rounded-xl p-3.5 shadow-xs flex flex-col justify-between transition-colors ${
            metrics.holdsCount > 0
              ? 'bg-rose-50/60 border-rose-300'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-mono uppercase font-bold ${
                metrics.holdsCount > 0 ? 'text-rose-900' : 'text-slate-500'
              }`}
            >
              HOLDS & DEFECTS
            </span>
            <RiAlertLine
              className={`h-4 w-4 ${metrics.holdsCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}
            />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-[22px] font-bold font-mono leading-none ${
                metrics.holdsCount > 0 ? 'text-rose-950' : 'text-slate-900'
              }`}
            >
              {metrics.holdsCount}
            </span>
            <span
              className={`text-[10px] font-medium ${
                metrics.holdsCount > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'
              }`}
            >
              {metrics.holdsCount > 0 ? 'Rework Required' : 'Zero Blocks'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
