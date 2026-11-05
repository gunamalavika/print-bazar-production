'use client';

import React from 'react';
import {
  RiBox3Line,
  RiScales3Line,
  RiPrinterLine,
  RiRefreshLine,
  RiCheckboxCircleLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

interface PackingStationHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  scaleWeightKg: number | null;
  printerName: string;
}

export function PackingStationHeader({
  onRefresh,
  isLoading,
  scaleWeightKg,
  printerName,
}: PackingStationHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
          <span>PLANT OPERATING SYSTEM</span>
          <span>•</span>
          <span className="text-slate-900 font-bold">PACKAGING WORKSTATION #01</span>
        </div>
        <h1 className="text-[24px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-[1.2] mt-1">
          Packing & Parcel Station
        </h1>
        <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
          Carton verification, calibrated weight capture, and automated 4×6 thermal shipping label printing.
        </p>
      </div>

      {/* Hardware Status Indicators & Refresh */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Scale Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-[11px]">
          <RiScales3Line className="h-4 w-4 text-blue-600" />
          <div>
            <span className="text-slate-400 font-mono text-[9px] block uppercase font-bold">DIGITAL SCALE</span>
            <span className="font-mono font-bold text-slate-900">
              {scaleWeightKg !== null ? `${scaleWeightKg.toFixed(3)} KG` : 'Calibrated (Ready)'}
            </span>
          </div>
        </div>

        {/* Printer Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-[11px]">
          <RiPrinterLine className="h-4 w-4 text-[#E3A008]" />
          <div>
            <span className="text-slate-400 font-mono text-[9px] block uppercase font-bold">THERMAL PRINTER</span>
            <span className="font-bold text-slate-900">{printerName}</span>
          </div>
        </div>

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 h-9 bg-white shadow-2xs"
        >
          <RiRefreshLine className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="font-bold text-xs">Sync Queue</span>
        </Button>
      </div>
    </div>
  );
}
