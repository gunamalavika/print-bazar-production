'use client';

import React, { useState, useEffect } from 'react';
import {
  RiCloseLine,
  RiTruckLine,
  RiCheckboxCircleLine,
  RiAlertLine,
} from 'react-icons/ri';
import { PackingJobDto } from './PackingJobCard';
import { PackagingCartonItem } from './CartonPackingForm';

interface DispatchTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: PackingJobDto;
  cartons: PackagingCartonItem[];
  defaultCourier?: string;
  isSubmitting?: boolean;
  onConfirm: (trackingNumber: string, courierName: string) => Promise<void>;
}

const COMMON_COURIERS = [
  'Delhivery Surface Express',
  'BlueDart Priority Express',
  'DTDC Courier Express',
  'Professional Couriers',
  'Porter / Local Logistics',
  'Store Pickup Counter',
];

export function DispatchTrackingModal({
  isOpen,
  onClose,
  job,
  cartons,
  defaultCourier,
  isSubmitting = false,
  onConfirm,
}: DispatchTrackingModalProps) {
  const isPickup = job.deliveryMethod === 'STORE_PICKUP';
  const initialCourier =
    defaultCourier ||
    (isPickup ? 'Store Pickup Counter' : 'Delhivery Surface Express');

  const [courierName, setCourierName] = useState(initialCourier);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCourierName(initialCourier);
      setTrackingNumber('');
      setErrorMsg(null);
    }
  }, [isOpen, initialCourier]);

  if (!isOpen) return null;

  const totalWeight = cartons.reduce((acc, c) => acc + (c.grossWeightKg || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTracking = trackingNumber.trim();
    if (!cleanTracking) {
      setErrorMsg('Please enter the physical tracking / AWB number before moving to dispatch.');
      return;
    }
    setErrorMsg(null);
    await onConfirm(cleanTracking, courierName.trim() || initialCourier);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FFED00]/15 border border-[#FFED00]/30 rounded-xl text-[#FFED00]">
              <RiTruckLine className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Enter Tracking & Move to Dispatch
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Order #{job.orderNumber} • {job.customer?.fullName || 'Valued Customer'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
              <RiAlertLine className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Order Summary Strip */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">TOTAL CARTONS</span>
              <span className="font-bold text-slate-900">{cartons.length} Carton(s)</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">TOTAL WEIGHT</span>
              <span className="font-bold text-slate-900">{totalWeight.toFixed(2)} KG</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">DESTINATION</span>
              <span className="font-bold text-slate-900 truncate max-w-[120px] block">
                {job.shippingAddress?.city || (isPickup ? 'Store Counter' : 'National')}
              </span>
            </div>
          </div>

          {/* Courier Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Courier / Logistics Partner <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              <select
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
              >
                {COMMON_COURIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="Or enter custom courier partner"
                className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white text-[11px]"
              />
            </div>
          </div>

          {/* Tracking / AWB Number Input (Manual Entry) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              AWB / Tracking Number (Manual Entry) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={trackingNumber}
              onChange={(e) => {
                setTrackingNumber(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Scan or enter physical consignment tracking number"
              className="w-full h-11 px-3.5 text-sm font-mono font-bold bg-white text-slate-900 border-2 border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 shadow-2xs"
            />
            <p className="text-[11px] text-slate-500">
              Please manually enter or scan the tracking number from the physical courier consignment slip before dispatching.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !trackingNumber.trim()}
              className="px-5 py-2.5 bg-[#FFED00] hover:bg-[#FDD835] disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-black text-xs rounded-xl shadow-xs border border-[#E3A008]/50 transition active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <RiCheckboxCircleLine className="h-4 w-4" />
              <span>{isSubmitting ? 'Moving to Dispatch...' : 'Confirm & Move to Dispatch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

