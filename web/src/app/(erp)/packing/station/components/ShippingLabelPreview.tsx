'use client';

import React from 'react';
import {
  RiPrinterLine,
  RiBarcodeLine,
  RiTruckLine,
  RiQrCodeLine,
} from 'react-icons/ri';
import { PackingJobDto } from './PackingJobCard';
import { PackagingCartonItem } from './CartonPackingForm';

interface ShippingLabelPreviewProps {
  job: PackingJobDto;
  cartons: PackagingCartonItem[];
  activeCartonIndex: number;
  onOpenPrintModal?: () => void;
}

export function ShippingLabelPreview({
  job,
  cartons,
  activeCartonIndex,
  onOpenPrintModal,
}: ShippingLabelPreviewProps) {
  const item = job.items?.[0];
  const activeCarton = cartons[activeCartonIndex] || cartons[0];
  const totalCartons = Math.max(1, cartons.length);
  const currentSeq = activeCarton ? activeCarton.sequenceNumber : 1;
  const currentWeight = activeCarton ? activeCarton.grossWeightKg : 1.48;

  const addr = job.shippingAddress;
  const courier = job.deliveryMethod === 'STORE_PICKUP' ? 'PRINT BAZZAR COUNTER PICKUP' : 'DELHIVERY SURFACE EXPEDITE';
  const awb = `AWB-${job.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}-${currentSeq}`;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <span className="text-[13px] font-bold text-slate-900 uppercase tracking-wide block">
            Shipping Label Preview
          </span>
          <span className="text-[10px] text-slate-400 font-mono block">
            4×6 INCH THERMAL DIRECT FORMAT
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPrintModal && (
            <button
              type="button"
              onClick={onOpenPrintModal}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              <RiPrinterLine className="h-3.5 w-3.5 text-slate-600" />
              <span>Full View</span>
            </button>
          )}
          <span className="bg-slate-900 text-amber-300 font-mono text-[10px] font-bold px-2 py-1 rounded">
            PARCEL {currentSeq} OF {totalCartons}
          </span>
        </div>
      </div>

      {/* 4x6 Realistic Industrial Shipping Label Mockup */}
      <div className="border-2 border-slate-900 rounded-xl p-3.5 bg-white text-slate-950 font-mono text-[11px] space-y-3 shadow-xs">
        {/* Carrier Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2">
          <div>
            <span className="text-[14px] font-black tracking-tight block uppercase leading-none">
              {courier}
            </span>
            <span className="text-[9px] text-slate-600 font-bold block mt-0.5">
              PREPAID PRIORITY B2B PARCEL
            </span>
          </div>
          <div className="text-right">
            <span className="font-black text-[13px] block leading-none tabular-nums">
              WT: {currentWeight.toFixed(2)} KG
            </span>
            <span className="text-[9px] text-slate-500 uppercase font-bold block mt-0.5">
              PLANT HUB #01
            </span>
          </div>
        </div>

        {/* High-Contrast Code128 Barcode Simulation */}
        <div className="py-2 text-center border-b-2 border-slate-900 bg-slate-50 rounded-lg p-2">
          <div className="h-10 bg-slate-950 rounded flex items-center justify-center text-white text-[10px] tracking-[6px] font-mono select-none">
            |||| || ||||| |||| |||||| || |||| ||||| ||||
          </div>
          <span className="text-[10px] font-black tracking-widest block mt-1 tabular-nums">
            {awb}
          </span>
        </div>

        {/* Deliver To / Ship To Information */}
        <div className="border-b-2 border-slate-900 pb-2 text-[11px] leading-snug space-y-0.5">
          <span className="font-bold text-[9px] text-slate-500 uppercase block tracking-wider">
            SHIP TO:
          </span>
          <strong className="text-slate-950 font-black block text-[12px]">
            {job.customer?.fullName || 'Customer'}
          </strong>
          {addr ? (
            <div className="text-slate-800 text-[10px]">
              <span>{addr.addressLine1}</span>
              {addr.addressLine2 && <span>, {addr.addressLine2}</span>}
              <br />
              <span className="font-bold">
                {addr.city}, {addr.state} - {addr.postalCode}
              </span>
              {job.customer?.phone && <span className="block font-mono mt-0.5">PH: {job.customer.phone}</span>}
            </div>
          ) : (
            <span className="text-slate-500 italic text-[10px]">
              Customer Store Pickup (Main Plant Counter)
            </span>
          )}
        </div>

        {/* Order Reference & Contents */}
        <div className="flex justify-between items-center text-[10px] font-bold">
          <span className="tabular-nums">ORDER: #{job.orderNumber}</span>
          <span className="truncate max-w-[140px]">{item?.productName || 'Print Product'}</span>
        </div>
      </div>
    </div>
  );
}
