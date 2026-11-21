'use client';

import React from 'react';
import {
  RiCheckboxCircleFill,
  RiFileTextLine,
  RiUser3Line,
  RiMapPinLine,
  RiFileList3Line,
  RiSparklingLine,
  RiTruckLine,
  RiStore2Line,
} from 'react-icons/ri';
import { PackingJobDto } from './PackingJobCard';

interface JobDetailsPanelProps {
  job: PackingJobDto;
}

export function JobDetailsPanel({ job }: JobDetailsPanelProps) {
  const item = job.items?.[0];
  const specs = (item?.specifications as any) || {};

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3.5">
      {/* Top Header: Order Number + Product Title + Run Qty */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-black text-amber-950 bg-amber-100 border border-amber-300 text-sm px-2.5 py-1 rounded-lg">
            #{job.orderNumber}
          </span>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              {item?.productName || 'Print Product'}
            </h2>
            <span className="text-[11px] font-mono text-slate-400">SKU: {item?.sku || 'PRINT-SKU'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
            RUN: {item?.quantity?.toLocaleString() || 100} PCS
          </span>
          <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs">
            <RiCheckboxCircleFill className="h-3.5 w-3.5 text-emerald-600" />
            FINAL QC PASSED
          </span>
        </div>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-slate-400 text-[10px] font-bold uppercase block">Substrate / Paper</span>
          <span className="font-bold text-slate-900 truncate block">
            {specs.paperGsm || specs.options?.find((o: any) => o.optionName?.includes('Paper'))?.valueName || '350 GSM Art Board'}
          </span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-slate-400 text-[10px] font-bold uppercase block">Finishing & Coating</span>
          <span className="font-bold text-slate-900 truncate block">
            {specs.finish || specs.options?.find((o: any) => o.optionName?.includes('Finish') || o.optionName?.includes('Lamination'))?.valueName || 'Thermal Matte'}
          </span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-slate-400 text-[10px] font-bold uppercase block">Trim Dimensions</span>
          <span className="font-bold text-slate-900 font-mono block">
            {specs.dimensions || 'Standard SKU Size'}
          </span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-slate-400 text-[10px] font-bold uppercase block">Print Mode</span>
          <span className="font-bold text-slate-900 truncate block">
            {specs.printMode || 'Digital Offset 4+4 CMYK'}
          </span>
        </div>
      </div>

      {/* Delivery & Customer Info Strip */}
      <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-2">
        <div className="flex items-center gap-2 truncate">
          <RiUser3Line className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="font-bold text-slate-900">{job.customer?.fullName}</span>
          {job.customer?.phone && (
            <span className="text-slate-500 font-mono">({job.customer.phone})</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-400 uppercase font-bold text-[10px]">Method:</span>
          <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
            {job.deliveryMethod === 'STORE_PICKUP' ? 'STORE PICKUP (COUNTER)' : 'COURIER SURFACE'}
          </span>
        </div>
      </div>

      {job.customerNotes && (
        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px]">
          <span className="font-bold text-amber-900 uppercase block text-[10px]">Customer Packing Instructions:</span>
          <p className="text-amber-800 mt-0.5">{job.customerNotes}</p>
        </div>
      )}
    </div>
  );
}
