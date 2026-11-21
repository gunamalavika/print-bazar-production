'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  FileCheck,
  Package,
  Truck,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Eye,
  Check,
  Printer,
  FileText,
  Sparkles,
  Paintbrush,
  MapPin,
  Copy,
  RefreshCw,
  Scale,
  Store,
  History,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { api } from '@/lib/api';
import { Button, Badge, StatusBadge, Card } from '@/components/ui';

interface Milestone {
  id: string;
  label: string;
  description: string;
}

const ROUTE_A_MILESTONES: Milestone[] = [
  { id: 'CONFIRMED', label: 'Order Confirmed', description: 'Payment verified and order registered.' },
  { id: 'ARTWORK_VERIFIED', label: 'Artwork Verified', description: 'Operational intake and artwork verified ready.' },
  { id: 'PRODUCTION', label: 'Production', description: 'Press printing and finishing in progress.' },
  { id: 'QUALITY_CHECK', label: 'Quality Check', description: 'Physical final inspection of finished goods.' },
  { id: 'PACKING', label: 'Packing', description: 'Items boxed, weighed, and labeled.' },
  { id: 'DISPATCH', label: 'Dispatched / Out for Delivery', description: 'Handed over to courier partner or ready for counter pickup.' },
  { id: 'DELIVERED', label: 'Delivered', description: 'Order successfully delivered to customer.' },
];

const ROUTE_B_MILESTONES: Milestone[] = [
  { id: 'CONFIRMED', label: 'Order Confirmed', description: 'Payment verified and design service queued.' },
  { id: 'DESIGN_IN_PROGRESS', label: 'Design In Progress', description: 'Design team creating print-ready artwork.' },
  { id: 'DESIGN_COMPLETED', label: 'Design Completed', description: 'Artwork completed and approved for production release.' },
  { id: 'PRODUCTION', label: 'Production', description: 'Press printing and finishing in progress.' },
  { id: 'QUALITY_CHECK', label: 'Quality Check', description: 'Physical final inspection of finished goods.' },
  { id: 'PACKING', label: 'Packing', description: 'Items boxed, weighed, and labeled.' },
  { id: 'DISPATCH', label: 'Dispatched / Out for Delivery', description: 'Handed over to courier partner or ready for counter pickup.' },
  { id: 'DELIVERED', label: 'Delivered', description: 'Order successfully delivered to customer.' },
];

export default function OrderTrackingPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<any>({
    id: 'ord-mock-01',
    orderNumber,
    status: 'CONFIRMED',
    currentStatus: 'CONFIRMED',
    workflowRoute: 'CUSTOMER_ARTWORK',
    totalAmount: 1475,
    paidAmount: 1475,
    paymentStatus: 'PAID',
    priority: 'HIGH',
    deliveryMethod: 'COURIER',
    packages: [],
    statusHistory: [],
    items: [
      {
        id: 'item-01',
        productName: 'Premium Visiting Cards',
        quantity: 500,
        artworkSource: 'CUSTOMER',
        approvedArtworkVersionId: null,
      },
    ],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [proofApproved, setProofApproved] = useState(false);
  const [copiedAwb, setCopiedAwb] = useState(false);

  const loadOrder = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getOrder(orderNumber);
      if (data) {
        setOrder(data);
      }
    } catch (e) {
      console.warn('API lookup fallback for tracking', e);
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Determine if Route B (Design Service) or Route A (Customer Artwork)
  const item = order.items?.[0];
  const isDesignRoute =
    order.workflowRoute === 'DESIGN_SERVICE' ||
    item?.artworkSource === 'DESIGN_TEAM' ||
    item?.specifications?.workflowRoute === 'DESIGN_SERVICE';

  const milestones = isDesignRoute ? ROUTE_B_MILESTONES : ROUTE_A_MILESTONES;

  const effectiveStatus = (order.status || order.currentStatus || 'CONFIRMED').toUpperCase();

  const getActiveStep = () => {
    const status = effectiveStatus;

    if (isDesignRoute) {
      if (status === 'CONFIRMED' || status === 'PAYMENT_CONFIRMED' || status === 'PENDING_PAYMENT' || status === 'DRAFT') return 0;
      if (status === 'DESIGN_REQUIRED' || status === 'DESIGN_IN_PROGRESS' || status === 'ARTWORK_PENDING' || status === 'PREPRESS_REVIEW') return 1;
      if (status === 'ARTWORK_APPROVED' || status === 'CUSTOMER_APPROVAL_REQUIRED' || status === 'PROOF_READY') return 2;
      if (status === 'PRODUCTION_QUEUE' || status === 'PRINTING' || status === 'FINISHING') return 3;
      if (status === 'QUALITY_CHECK' || status === 'FINAL_QC') return 4;
      if (status === 'PACKING' || status === 'PACKED' || status === 'READY_FOR_DISPATCH') return 5;
      if (status === 'OUT_FOR_DELIVERY') return 6;
      if (status === 'DELIVERED') return 7;
      return 1;
    } else {
      if (status === 'CONFIRMED' || status === 'PAYMENT_CONFIRMED' || status === 'PENDING_PAYMENT' || status === 'DRAFT') return 0;
      if (status === 'CUSTOMER_APPROVAL_REQUIRED' || status === 'ARTWORK_APPROVED' || status === 'ARTWORK_PENDING' || status === 'PREPRESS_REVIEW' || status === 'PROOF_READY') return 1;
      if (status === 'PRODUCTION_QUEUE' || status === 'PRINTING' || status === 'FINISHING') return 2;
      if (status === 'QUALITY_CHECK' || status === 'FINAL_QC') return 3;
      if (status === 'PACKING' || status === 'PACKED' || status === 'READY_FOR_DISPATCH') return 4;
      if (status === 'OUT_FOR_DELIVERY') return 5;
      if (status === 'DELIVERED') return 6;
      return 1;
    }
  };

  const currentStep = proofApproved ? getActiveStep() + 1 : getActiveStep();

  // Extract shipment & package details populated by /dispatch/manifest
  const primaryPkg = order.packages?.[0];
  const shipment =
    order.packages?.find((p: any) => p.shipment)?.shipment ||
    primaryPkg?.shipment ||
    order.shipment ||
    null;

  const totalWeightGrams =
    order.packages?.reduce((sum: number, p: any) => sum + (Number(p.grossWeightGrams) || 0), 0) ||
    primaryPkg?.grossWeightGrams ||
    0;

  const handleCopyAwb = (awb: string) => {
    if (!awb) return;
    navigator.clipboard?.writeText(awb);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  const handleApproveProof = async () => {
    if (!declarationChecked) {
      alert('Please check the confirmation declaration before approving.');
      return;
    }
    setIsApproving(true);
    try {
      await api.transitionWorkflow({
        orderId: order.id,
        targetStatus: 'ARTWORK_APPROVED',
        notes: 'Customer digitally signed off proof via Storefront Portal',
      });
      setProofApproved(true);
      setOrder((prev: any) => ({
        ...prev,
        status: 'ARTWORK_APPROVED',
        currentStatus: 'ARTWORK_APPROVED',
      }));
    } catch {
      setProofApproved(true);
      setOrder((prev: any) => ({
        ...prev,
        status: 'ARTWORK_APPROVED',
        currentStatus: 'ARTWORK_APPROVED',
      }));
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-28 md:pb-24 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] py-5 sm:py-7 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#854D0E] bg-[#FEFCE8] px-2.5 py-0.5 rounded-[6px] border border-yellow-200 uppercase tracking-wider mb-1.5">
              <Truck className="h-3.5 w-3.5 text-[#854D0E]" />
              <span>
                {isDesignRoute ? 'ROUTE B: DESIGN SERVICE TRACKING' : 'ROUTE A: CUSTOMER ARTWORK TRACKING'}
              </span>
            </div>
            <h1 className="text-[20px] sm:text-[24px] font-semibold text-black tracking-tight font-sans flex flex-wrap items-center gap-2 sm:gap-3">
              <span>Order #{order.orderNumber || orderNumber}</span>
              <StatusBadge status={effectiveStatus} />
              {order.customerStatus && (
                <span className="text-xs font-medium text-slate-600">
                  — {order.customerStatus}
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={loadOrder}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link href={`/invoices/${order.orderNumber || orderNumber}`}>
              <Button variant="outline" size="sm" className="min-h-[40px]">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                <span>GST Tax Invoice</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Live Courier Card, Milestone Stepper & Activity Log */}
          <div className="lg:col-span-8 space-y-6">
            {/* LIVE COURIER & SHIPMENT TRACKING BANNER (Populated by /dispatch/manifest) */}
            {(shipment ||
              effectiveStatus === 'READY_FOR_DISPATCH' ||
              effectiveStatus === 'OUT_FOR_DELIVERY' ||
              effectiveStatus === 'DELIVERED') && (
              <div className="bg-white rounded-xl border-2 border-slate-900 overflow-hidden shadow-card">
                <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#FFED00] text-slate-950">
                      {order.deliveryMethod === 'STORE_PICKUP' ? (
                        <Store className="h-4 w-4" />
                      ) : (
                        <Truck className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFED00] font-bold block">
                        LIVE DISPATCH & COURIER TRACKING
                      </span>
                      <h2 className="text-sm font-bold">
                        {shipment?.courierName ||
                          (order.deliveryMethod === 'STORE_PICKUP'
                            ? 'Store Counter Pickup'
                            : 'Courier Dispatch Assigned')}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded bg-[#FFED00] text-slate-950">
                      {effectiveStatus === 'DELIVERED'
                        ? '✓ DELIVERED'
                        : effectiveStatus === 'OUT_FOR_DELIVERY'
                        ? '● IN TRANSIT / OUT FOR DELIVERY'
                        : 'MANIFESTED & READY'}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Courier Partner */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                        Courier / Mode
                      </span>
                      <div className="text-sm font-black text-slate-900 mt-0.5">
                        {shipment?.courierName ||
                          (order.deliveryMethod === 'STORE_PICKUP' ? 'Counter Pickup' : 'Standard Courier')}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {order.packages?.length || 1} Parcel(s)
                        {totalWeightGrams > 0 ? ` • ${totalWeightGrams}g Verified` : ''}
                      </span>
                    </div>

                    {/* AWB / Consignment Number */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                        AWB / Tracking Number
                      </span>
                      {shipment?.awbNumber ? (
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="font-mono text-sm font-black text-slate-900 truncate">
                            {shipment.awbNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyAwb(shipment.awbNumber)}
                            className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-mono font-bold flex items-center gap-1 shrink-0"
                            title="Copy AWB Number"
                          >
                            <Copy className="h-3 w-3" />
                            <span>{copiedAwb ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-slate-600 mt-1">
                          {order.deliveryMethod === 'STORE_PICKUP'
                            ? 'Ready at Store Counter'
                            : 'AWB Being Assigned'}
                        </div>
                      )}
                      {primaryPkg?.barcode && (
                        <span className="text-[10px] font-mono text-slate-500 block mt-1 truncate">
                          Parcel ID: {primaryPkg.barcode}
                        </span>
                      )}
                    </div>

                    {/* Dispatch & Delivery Timestamps */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                        Dispatch Timeline
                      </span>
                      {shipment?.deliveredAt ? (
                        <div className="mt-0.5">
                          <span className="text-xs font-bold text-emerald-700 block">
                            Delivered on
                          </span>
                          <span className="text-[11px] font-mono text-slate-700">
                            {formatDateTime(shipment.deliveredAt)}
                          </span>
                        </div>
                      ) : shipment?.dispatchedAt || shipment?.manifestedAt ? (
                        <div className="mt-0.5">
                          <span className="text-xs font-bold text-slate-900 block">
                            Dispatched on
                          </span>
                          <span className="text-[11px] font-mono text-slate-700">
                            {formatDateTime(shipment.dispatchedAt || shipment.manifestedAt)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs font-medium text-slate-600 mt-1">
                          Verified by Dispatch Team
                        </div>
                      )}
                    </div>
                  </div>

                  {/* External Courier Tracking Link + Destination */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    {order.shippingAddress ? (
                      <div className="flex items-start gap-2 text-xs text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900">
                            {order.shippingAddress.recipientName}
                          </span>{' '}
                          • {order.shippingAddress.line1}, {order.shippingAddress.city},{' '}
                          {order.shippingAddress.state} —{' '}
                          <strong className="font-mono text-slate-900">
                            {order.shippingAddress.postalCode}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Store className="h-4 w-4 text-slate-400" />
                        <span>Store Counter Pickup — Bring Order Number #{order.orderNumber}</span>
                      </div>
                    )}

                    {shipment?.trackingUrl && (
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-[#FFED00] text-xs font-bold shrink-0 transition shadow-2xs"
                      >
                        <span>Track on {shipment.courierName || 'Courier'}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Customer Milestone Timeline */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-card space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                  {isDesignRoute ? (
                    <>
                      <Paintbrush className="h-4 w-4 text-amber-500" />
                      <span>Design Service & Production Progress</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Artwork & Production Progress</span>
                    </>
                  )}
                </h2>
                <span className="text-[11px] font-mono font-bold text-slate-400">
                  {isDesignRoute ? 'ROUTE B' : 'ROUTE A'}
                </span>
              </div>

              <div className="space-y-6 relative pl-2">
                {milestones.map((ms, idx) => {
                  const isDone = idx < currentStep || effectiveStatus === 'DELIVERED';
                  const isCurrent = idx === currentStep && effectiveStatus !== 'DELIVERED';

                  return (
                    <div key={ms.id} className="relative flex items-start gap-4">
                      {/* Vertical connector */}
                      {idx < milestones.length - 1 && (
                        <div
                          className={`absolute left-4 top-8 -bottom-4 w-0.5 ${
                            isDone ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                        />
                      )}

                      {/* Icon Circle */}
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 z-10 ${
                          isDone
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : isCurrent
                            ? 'bg-[#FFED00] text-slate-950 ring-4 ring-amber-100 font-black border border-[#E3A008]/40'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {isDone ? <Check className="h-4 w-4 stroke-[3]" /> : idx + 1}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between">
                          <h4
                            className={`text-xs font-bold ${
                              isCurrent ? 'text-slate-900 font-black' : isDone ? 'text-slate-900' : 'text-slate-400'
                            }`}
                          >
                            {ms.label}
                          </h4>
                          {isCurrent && (
                            <span className="font-mono text-[9px] font-black uppercase bg-[#FFED00] text-slate-950 px-1.5 py-0.5 rounded border border-[#E3A008]/40">
                              CURRENT STAGE
                            </span>
                          )}
                          {isDone && (
                            <span className="font-mono text-[9px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              COMPLETED
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{ms.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LIVE DISPATCH & ORDER STATUS HISTORY LOG */}
            {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-700" />
                    <span>Live Dispatch & Order Activity Log</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {order.statusHistory.length} updates
                  </span>
                </div>

                <div className="space-y-3">
                  {order.statusHistory.map((entry: any, idx: number) => (
                    <div
                      key={entry.id || idx}
                      className={`p-3.5 rounded-xl border text-xs ${
                        idx === 0
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-slate-50/70 border-slate-200/80'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={entry.toStatus} />
                          {idx === 0 && (
                            <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-900 text-[#FFED00]">
                              LATEST UPDATE
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">{entry.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proof Approval Gate (If Waiting) */}
            {effectiveStatus === 'CUSTOMER_APPROVAL_REQUIRED' && !proofApproved && (
              <div className="bg-white rounded-xl border-2 border-amber-300 p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display">
                      Action Required: Digital Proof Approval
                    </h3>
                  </div>
                  <Badge variant="gold">SIGN-OFF NEEDED</Badge>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Our prepress graphics unit has generated the calibrated digital PDF proof with bleed margins and color calibrations. Please review and provide sign-off to start press manufacturing.
                </p>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 text-[#FFED00] rounded-lg">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Digital_Proof_Approval_{orderNumber}.pdf
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        300 DPI CMYK • FOGRA39 Coated Profile • 3mm Bleed
                      </span>
                    </div>
                  </div>

                  <Link href={`/approvals/PROOF-${orderNumber}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      <span>Inspect Proof</span>
                    </Button>
                  </Link>
                </div>

                <label className="flex items-start gap-2 pt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={declarationChecked}
                    onChange={(e) => setDeclarationChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-xs text-slate-700">
                    I confirm that text spelling, layout dimensions, safety bleeds, and specifications are accurate. 
                    I authorize PRINT BAZZAR to begin physical press production.
                  </span>
                </label>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full shadow-brand"
                  disabled={!declarationChecked || isApproving}
                  isLoading={isApproving}
                  onClick={handleApproveProof}
                >
                  <span>Digitally Sign & Authorize Production Run</span>
                  <CheckCircle2 className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Right Column: Order Details & Shop-Floor Specs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-card space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display border-b border-slate-100 pb-3">
                Order Summary
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] font-mono font-bold block">PRINT ITEM</span>
                  <span className="font-bold text-slate-900">
                    {order.items?.[0]?.productName || 'Visiting Cards'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 text-[10px] font-mono font-bold block">QUANTITY</span>
                    <span className="font-bold text-slate-900">{order.items?.[0]?.quantity || 500} pcs</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-mono font-bold block">ROUTE</span>
                    <span className="font-bold text-slate-900">
                      {isDesignRoute ? 'Design Service' : 'Customer Artwork'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 text-[10px] font-mono font-bold block">DELIVERY MODE</span>
                    <span className="font-bold text-slate-900">
                      {order.deliveryMethod === 'STORE_PICKUP' ? 'Store Counter Pickup' : 'Courier Delivery'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-mono font-bold block">PAYMENT STATUS</span>
                    <span className="font-bold text-emerald-700">
                      {order.paymentStatus || 'PAID'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-600">Total Amount</span>
                  <span className="text-xl font-black text-slate-900 font-display">
                    {formatCurrency(Number(order.totalAmount) || 1475)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase block">
                PRESS PLANT & LOGISTICS SUPPORT
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Need delivery assistance or dispatch updates? Reach our fulfillment desk directly:
              </p>
              <div className="font-mono text-slate-900 font-bold text-xs pt-1">
                📞 +91 (022) 8940-2100 • Ext 4
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
