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

      {/* 4x6 Realistic Industrial Shipping Label Mockup (Clean Customer & Order Details Format - No Barcode) */}
      <div className="border-2 border-slate-900 rounded-xl p-4 bg-white text-slate-950 font-mono text-[11px] space-y-3.5 shadow-xs">
        {/* Carrier Header & Parcel Weight */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2.5">
          <div>
            <div className="flex items-center gap-1.5">
              <RiTruckLine className="h-4 w-4 text-slate-900" />
              <span className="text-[14px] font-black tracking-tight block uppercase leading-none">
                {courier}
              </span>
            </div>
            <span className="text-[9px] text-slate-600 font-bold block mt-1 tracking-wider uppercase">
              Priority Parcel • Standard Delivery
            </span>
          </div>
          <div className="text-right">
            <span className="font-black text-[13px] block leading-none tabular-nums">
              WT: {currentWeight.toFixed(2)} KG
            </span>
            <span className="text-[9px] text-slate-500 uppercase font-bold block mt-1">
              BOX {currentSeq}/{totalCartons}
            </span>
          </div>
        </div>

        {/* Order Reference & Identifier Header */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">
              ORDER IDENTIFIER:
            </span>
            <span className="text-[13px] font-black tracking-wider text-slate-900">
              #{job.orderNumber}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">
              PARCEL SEQUENCE:
            </span>
            <span className="text-[12px] font-black text-slate-900">
              {currentSeq} of {totalCartons} Cartons
            </span>
          </div>
        </div>

        {/* Customer Details / Consignee (Deliver To) */}
        <div className="border-b-2 border-slate-900 pb-3 text-[11px] leading-snug space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[9px] text-slate-500 uppercase tracking-wider">
              SHIP TO / CUSTOMER DETAILS:
            </span>
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
              PIN: {addr?.postalCode || '400001'}
            </span>
          </div>
          <strong className="text-slate-950 font-black block text-[13px]">
            {job.customer?.fullName || 'Customer'}
          </strong>
          {addr ? (
            <div className="text-slate-800 text-[10.5px] space-y-0.5">
              <div>{addr.addressLine1}</div>
              {addr.addressLine2 && <div>{addr.addressLine2}</div>}
              <div className="font-bold text-slate-950">
                {addr.city}, {addr.state} - {addr.postalCode}
              </div>
              {job.customer?.phone && (
                <div className="font-mono font-bold mt-1 text-slate-900">
                  TEL: {job.customer.phone}
                </div>
              )}
              {job.customer?.email && (
                <div className="font-mono text-slate-600 text-[9.5px]">
                  EMAIL: {job.customer.email}
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-500 italic text-[10.5px] block bg-slate-50 p-2 rounded">
              Customer Store Pickup (Main Plant Counter Desk)
            </span>
          )}
        </div>

        {/* Order Details & Product Contents */}
        <div className="space-y-1 text-[10.5px]">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
            PACKAGE CONTENTS & ORDER DETAILS:
          </span>
          <div className="flex justify-between items-center font-bold text-slate-900">
            <span className="truncate max-w-[200px]">
              {item?.productName || 'Custom Print Job'}
            </span>
            <span className="text-slate-600 shrink-0">
              QTY: {item?.quantity || 1}
            </span>
          </div>
          {item?.sku && (
            <div className="text-[9.5px] text-slate-500 font-mono">
              SKU: {item.sku}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
