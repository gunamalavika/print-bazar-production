'use client';

import React from 'react';
import {
  RiCheckboxCircleFill,
  RiTruckLine,
  RiStore2Line,
  RiTimeLine,
  RiBox3Line,
  RiSendPlaneLine,
} from 'react-icons/ri';

export interface PackingJobDto {
  id: string;
  orderNumber: string;
  status?: string;
  customer: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
  deliveryMethod: 'COURIER' | 'STORE_PICKUP';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  shippingAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    recipientName?: string;
    recipientPhone?: string;
  } | null;
  items: Array<{
    id: string;
    productName: string;
    sku?: string;
    quantity: number;
    specifications: Record<string, any>;
    artworkVersions?: any[];
  }>;
  packages: Array<{
    id: string;
    packageNumber: string;
    sequenceNumber: number;
    totalPackages: number;
    grossWeightGrams: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    barcode: string;
    status: string;
    cartonType?: string;
    shipment?: any;
  }>;
  qcChecklists: Array<{
    id: string;
    type: string;
    outcome: string;
    createdAt: string;
  }>;
  customerNotes?: string;
  createdAt: string;
  dueAt?: string;
}

interface PackingJobCardProps {
  job: PackingJobDto;
  isSelected: boolean;
  onSelect: (job: PackingJobDto) => void;
}

export function PackingJobCard({
  job,
  isSelected,
  onSelect,
}: PackingJobCardProps) {
  const item = job.items?.[0];
  const isDispatched =
    job.status === 'READY_FOR_DISPATCH' ||
    job.status === 'OUT_FOR_DELIVERY' ||
    job.status === 'DELIVERED';

  const trackingAwb =
    job.packages?.[0]?.shipment?.awbNumber ||
    job.packages?.[0]?.barcode ||
    null;

  const priorityColor = isDispatched
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : job.priority === 'URGENT'
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : job.priority === 'HIGH'
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div
      onClick={() => onSelect(job)}
      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 select-none relative flex flex-col justify-between gap-2 shadow-2xs ${
        isSelected
          ? isDispatched
            ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/80 shadow-xs'
            : 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/80 shadow-xs'
          : isDispatched
          ? 'border-emerald-200/90 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70'
      }`}
    >
      {/* Header: Order #, Status Badge & Priority */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs text-slate-900 tabular-nums">
            #{job.orderNumber}
          </span>
          {isDispatched ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-300 font-mono">
              <RiCheckboxCircleFill className="h-3 w-3 text-emerald-600" />
              Dispatched
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
              <RiCheckboxCircleFill className="h-3 w-3 text-emerald-600" />
              QC Passed
            </span>
          )}
        </div>

        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold border ${priorityColor}`}>
          {isDispatched ? 'RELEASED' : job.priority}
        </span>
      </div>

      {/* Customer & Product Information */}
      <div className="space-y-0.5">
        <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">
          {job.customer?.fullName || 'Customer'}
        </h4>
        <p className="text-[11px] text-slate-600 truncate">
          {item?.productName || 'Print Order'}
        </p>
      </div>

      {/* Dispatched Tracking Information if available */}
      {isDispatched && (
        <div className="p-1.5 bg-emerald-50/80 rounded-lg border border-emerald-100 flex items-center justify-between text-[10px] font-mono">
          <span className="text-emerald-900 font-bold truncate">
            {trackingAwb ? `TRK: ${trackingAwb}` : 'Manifest Handover'}
          </span>
          <span className="text-emerald-700 font-semibold shrink-0">
            {job.packages?.length || 1} {job.packages?.length === 1 ? 'Box' : 'Boxes'}
          </span>
        </div>
      )}

      {/* Footer: Run Quantity + Delivery Method + Time */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200">
            {item?.quantity?.toLocaleString() || 1} pcs
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase">
            {job.deliveryMethod === 'STORE_PICKUP' ? (
              <>
                <RiStore2Line className="h-3 w-3 text-purple-600" />
                Pickup
              </>
            ) : (
              <>
                <RiTruckLine className="h-3 w-3 text-blue-600" />
                Courier
              </>
            )}
          </span>
        </div>

        <span className="text-[10px] font-mono text-slate-400">
          {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
