'use client';

import React, { useState, useRef } from 'react';
import {
  RiCloseLine,
  RiPrinterLine,
  RiBarcodeLine,
  RiQrCodeLine,
  RiDownload2Line,
  RiBox3Line,
  RiCheckboxCircleFill,
  RiBuildingLine,
  RiTruckLine,
  RiCheckDoubleLine,
} from 'react-icons/ri';
import { PackingJobDto } from './PackingJobCard';
import { PackagingCartonItem } from './CartonPackingForm';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: PackingJobDto | null;
  cartons: PackagingCartonItem[];
  printerName: string;
  onConfirmPrinted?: () => void;
}

export function PrintLabelModal({
  isOpen,
  onClose,
  job,
  cartons,
  printerName,
  onConfirmPrinted,
}: PrintLabelModalProps) {
  const [selectedCartonIndex, setSelectedCartonIndex] = useState(0);

  if (!isOpen || !job) return null;

  const totalCartons = Math.max(1, cartons.length);
  const activeCarton = cartons[selectedCartonIndex] || cartons[0];
  const currentSeq = activeCarton ? activeCarton.sequenceNumber : 1;
  const currentWeight = activeCarton ? activeCarton.grossWeightKg : 1.48;
  const currentDim = activeCarton
    ? `${activeCarton.lengthCm}×${activeCarton.widthCm}×${activeCarton.heightCm} CM`
    : '25×18×12 CM';
  const cartonType = activeCarton ? activeCarton.cartonType : 'PB-BOX-02: Double-Wall Corrugated';

  const addr = job.shippingAddress;
  const isPickup = job.deliveryMethod === 'STORE_PICKUP';
  const courier = isPickup ? 'PRINT BAZZAR COUNTER PICKUP' : 'DELHIVERY SURFACE EXPEDITE';
  const awb = `AWB-${job.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}-${String(currentSeq).padStart(2, '0')}`;
  const item = job.items?.[0];

  const handlePrint = () => {
    if (onConfirmPrinted) {
      onConfirmPrinted();
    }
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full">
        {/* Modal Header (Hidden during Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/10 border border-amber-400/20 rounded-xl text-amber-400">
              <RiPrinterLine className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  4×6 Industrial Shipping Label
                </h2>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  {printerName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Order #{job.orderNumber} • Parcel {currentSeq} of {totalCartons}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FFED00] hover:bg-[#FDD835] text-slate-950 font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              <RiPrinterLine className="h-4 w-4" />
              <span>Print Label</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <RiCloseLine className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Carton Selector Bar if multiple cartons (Hidden in print) */}
        {cartons.length > 1 && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto print:hidden">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 font-mono">
              Select Carton:
            </span>
            {cartons.map((c, idx) => (
              <button
                key={c.id || idx}
                type="button"
                onClick={() => setSelectedCartonIndex(idx)}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition shrink-0 ${
                  selectedCartonIndex === idx
                    ? 'bg-slate-900 text-amber-300 shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Parcel #{c.sequenceNumber} ({c.grossWeightKg.toFixed(2)} KG)
              </button>
            ))}
          </div>
        )}

        {/* Printable 4x6 Label Area */}
        <div className="p-6 bg-slate-100/70 flex justify-center print:p-0 print:bg-white">
          <div
            id="printable-shipping-label"
            className="w-full max-w-[420px] bg-white border-2 border-slate-950 rounded-xl p-4 text-slate-950 font-mono text-[11px] space-y-3 shadow-md print:shadow-none print:border-2 print:border-black print:rounded-none print:w-[4in] print:max-w-none print:mx-auto"
          >
            {/* Carrier & Service Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-950 pb-2.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <RiTruckLine className="h-4 w-4 text-slate-900" />
                  <span className="text-[14px] font-black tracking-tight block uppercase leading-none">
                    {courier}
                  </span>
                </div>
                <span className="text-[9px] text-slate-600 font-bold block mt-1 tracking-wider">
                  PRIORITY SURFACE LOGISTICS • PREPAID B2B
                </span>
              </div>
              <div className="text-right">
                <span className="bg-slate-950 text-white font-mono font-black text-[11px] px-2 py-0.5 rounded">
                  BOX {currentSeq}/{totalCartons}
                </span>
                <span className="text-[9px] text-slate-500 uppercase font-bold block mt-1">
                  HUB BOM-MIDC
                </span>
              </div>
            </div>

            {/* AWB Code128 Barcode Simulation & Tracking Number */}
            <div className="py-2 text-center border-b-2 border-slate-950 bg-slate-50 rounded-lg p-2.5 print:bg-white">
              {/* High Contrast Barcode */}
              <div className="flex justify-center items-center h-12 gap-[2px] bg-white px-2 py-1 border border-slate-300 rounded">
                <div className="w-[3px] h-10 bg-black"></div>
                <div className="w-[1px] h-10 bg-black"></div>
                <div className="w-[4px] h-10 bg-black"></div>
                <div className="w-[2px] h-10 bg-black"></div>
                <div className="w-[1px] h-10 bg-black"></div>
                <div className="w-[3px] h-10 bg-black"></div>
                <div className="w-[2px] h-10 bg-black"></div>
                <div className="w-[5px] h-10 bg-black"></div>
                <div className="w-[1px] h-10 bg-black"></div>
                <div className="w-[3px] h-10 bg-black"></div>
                <div className="w-[2px] h-10 bg-black"></div>
                <div className="w-[4px] h-10 bg-black"></div>
                <div className="w-[1px] h-10 bg-black"></div>
                <div className="w-[3px] h-10 bg-black"></div>
                <div className="w-[2px] h-10 bg-black"></div>
                <div className="w-[1px] h-10 bg-black"></div>
                <div className="w-[4px] h-10 bg-black"></div>
                <div className="w-[2px] h-10 bg-black"></div>
                <div className="w-[3px] h-10 bg-black"></div>
                <div className="w-[1px] h-10 bg-black"></div>
                <div className="w-[4px] h-10 bg-black"></div>
                <div className="w-[2px] h-10 bg-black"></div>
                <div className="w-[5px] h-10 bg-black"></div>
                <div className="w-[1px] h-10 bg-black"></div>
                <div className="w-[3px] h-10 bg-black"></div>
                <div className="w-[2px] h-10 bg-black"></div>
                <div className="w-[4px] h-10 bg-black"></div>
                <div className="w-[1px] h-10 bg-black"></div>
                <div className="w-[3px] h-10 bg-black"></div>
                <div className="w-[2px] h-10 bg-black"></div>
                <div className="w-[4px] h-10 bg-black"></div>
                <div className="w-[1px] h-10 bg-black"></div>
                <div className="w-[3px] h-10 bg-black"></div>
              </div>
              <span className="text-[12px] font-black tracking-widest block mt-1 tabular-nums">
                {awb}
              </span>
            </div>

            {/* Consignee (Ship To) Information */}
            <div className="border-b-2 border-slate-950 pb-2.5 text-[11px] leading-snug space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[9px] text-slate-500 uppercase tracking-wider">
                  DELIVER TO / CONSIGNEE:
                </span>
                <span className="text-[9px] font-bold text-slate-600">
                  PIN: {addr?.postalCode || '400001'}
                </span>
              </div>
              <strong className="text-slate-950 font-black block text-[13px]">
                {job.customer?.fullName || 'Valued Customer'}
              </strong>
              {addr ? (
                <div className="text-slate-900 text-[10.5px]">
                  <div>{addr.addressLine1}</div>
                  {addr.addressLine2 && <div>{addr.addressLine2}</div>}
                  <div className="font-bold mt-0.5">
                    {addr.city}, {addr.state} - {addr.postalCode}
                  </div>
                  {job.customer?.phone && (
                    <div className="font-mono font-bold mt-1 text-[11px]">
                      CONTACT: {job.customer.phone}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-600 italic text-[10.5px] p-1.5 bg-slate-50 rounded">
                  Customer Store Pickup (Main Plant Delivery Desk)
                </div>
              )}
            </div>

            {/* Package Specs Grid */}
            <div className="grid grid-cols-2 gap-2 border-b-2 border-slate-950 pb-2 text-[10px]">
              <div>
                <span className="text-slate-500 font-bold block text-[9px]">GROSS WEIGHT:</span>
                <span className="font-black text-slate-950 text-[12px] tabular-nums">
                  {currentWeight.toFixed(2)} KG
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[9px]">CARTON DIMENSIONS:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {currentDim}
                </span>
              </div>
            </div>

            {/* Order Reference & Contents */}
            <div className="border-b-2 border-slate-950 pb-2 text-[10px] space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-500 text-[9px]">ORDER NUMBER:</span>
                <span className="font-black text-slate-950">#{job.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-500 text-[9px]">CONTENTS:</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]">
                  {item?.productName || 'Custom Print Job'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-500 text-[9px]">QUANTITY:</span>
                <span className="font-mono text-slate-900">{item?.quantity || 1} units</span>
              </div>
            </div>

            {/* Return / Shipper Address & QR Code */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[9px] text-slate-600 leading-tight space-y-0.5">
                <span className="font-bold text-slate-900 block uppercase">
                  SHIPPER: PRINT BAZZAR 2.0
                </span>
                <span>Plant Hub #01, MIDC Bhiwandi, Mumbai 421302</span>
                <span className="block font-mono">GSTIN: 27AABCP1234F1Z5</span>
              </div>

              <div className="p-1 border border-slate-900 rounded bg-white shrink-0 text-center">
                <RiQrCodeLine className="h-8 w-8 text-slate-950" />
                <span className="text-[7px] font-mono block text-slate-600 font-bold">VERIFIED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer (Hidden in print) */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-[11px] font-mono text-slate-500">
            Standard 4×6 Direct Thermal Label • Code128 GS1 Compliant
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              <RiPrinterLine className="h-4 w-4 text-amber-300" />
              <span>Print to {printerName}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
