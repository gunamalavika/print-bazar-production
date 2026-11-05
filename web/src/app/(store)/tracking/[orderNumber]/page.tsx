'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
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
  { id: 'DISPATCH', label: 'Dispatch', description: 'Shipped via courier or ready for pickup.' },
  { id: 'DELIVERED', label: 'Delivered', description: 'Order successfully delivered to customer.' },
];

const ROUTE_B_MILESTONES: Milestone[] = [
  { id: 'CONFIRMED', label: 'Order Confirmed', description: 'Payment verified and design service queued.' },
  { id: 'DESIGN_IN_PROGRESS', label: 'Design In Progress', description: 'Design team creating print-ready artwork.' },
  { id: 'DESIGN_COMPLETED', label: 'Design Completed', description: 'Artwork completed and approved for production release.' },
  { id: 'PRODUCTION', label: 'Production', description: 'Press printing and finishing in progress.' },
  { id: 'QUALITY_CHECK', label: 'Quality Check', description: 'Physical final inspection of finished goods.' },
  { id: 'PACKING', label: 'Packing', description: 'Items boxed, weighed, and labeled.' },
  { id: 'DISPATCH', label: 'Dispatch', description: 'Shipped via courier or ready for pickup.' },
  { id: 'DELIVERED', label: 'Delivered', description: 'Order successfully delivered to customer.' },
];

export default function OrderTrackingPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<any>({
    id: 'ord-mock-01',
    orderNumber,
    currentStatus: 'CONFIRMED',
    workflowRoute: 'CUSTOMER_ARTWORK',
    totalAmount: 1475,
    paidAmount: 1475,
    paymentStatus: 'PAID',
    priority: 'HIGH',
    deliveryMethod: 'COURIER',
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

  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [proofApproved, setProofApproved] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      try {
        const data = await api.getOrder(orderNumber);
        if (data) {
          setOrder(data);
        }
      } catch (e) {
        console.warn('API lookup fallback for tracking', e);
      }
    }
    loadOrder();
  }, [orderNumber]);

  // Determine if Route B (Design Service) or Route A (Customer Artwork)
  const item = order.items?.[0];
  const isDesignRoute =
    order.workflowRoute === 'DESIGN_SERVICE' ||
    item?.artworkSource === 'DESIGN_TEAM' ||
    item?.specifications?.workflowRoute === 'DESIGN_SERVICE';

  const milestones = isDesignRoute ? ROUTE_B_MILESTONES : ROUTE_A_MILESTONES;

  const getActiveStep = () => {
    const status = (order.currentStatus || order.status || 'CONFIRMED').toUpperCase();

    if (isDesignRoute) {
      if (status === 'CONFIRMED' || status === 'PAYMENT_CONFIRMED' || status === 'DRAFT') return 0;
      if (status === 'DESIGN_REQUIRED' || status === 'DESIGN_IN_PROGRESS') return 1;
      if (status === 'ARTWORK_APPROVED' || status === 'CUSTOMER_APPROVAL_REQUIRED') return 2;
      if (status === 'PRODUCTION_QUEUE' || status === 'PRINTING' || status === 'FINISHING') return 3;
      if (status === 'FINAL_QC') return 4;
      if (status === 'PACKING' || status === 'PACKED') return 5;
      if (status === 'READY_FOR_DISPATCH' || status === 'OUT_FOR_DELIVERY') return 6;
      if (status === 'DELIVERED') return 7;
      return 1;
    } else {
      if (status === 'CONFIRMED' || status === 'PAYMENT_CONFIRMED' || status === 'DRAFT') return 0;
      if (status === 'CUSTOMER_APPROVAL_REQUIRED' || status === 'ARTWORK_APPROVED') return 1;
      if (status === 'PRODUCTION_QUEUE' || status === 'PRINTING' || status === 'FINISHING') return 2;
      if (status === 'FINAL_QC') return 3;
      if (status === 'PACKING' || status === 'PACKED') return 4;
      if (status === 'READY_FOR_DISPATCH' || status === 'OUT_FOR_DELIVERY') return 5;
      if (status === 'DELIVERED') return 6;
      return 1;
    }
  };

  const currentStep = proofApproved ? getActiveStep() + 1 : getActiveStep();

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
        currentStatus: 'ARTWORK_APPROVED',
      }));
    } catch {
      setProofApproved(true);
      setOrder((prev: any) => ({
        ...prev,
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
              <span>Order #{orderNumber}</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black text-[#FFED00]">
                {order.currentStatus || 'IN PROGRESS'}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <Link href={`/invoices/${orderNumber}`}>
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
          {/* Left Column: Milestone Stepper & Actions */}
          <div className="lg:col-span-8 space-y-6">
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
                  const isDone = idx < currentStep;
                  const isCurrent = idx === currentStep;

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

            {/* Proof Approval Gate (If Waiting) */}
            {order.currentStatus === 'CUSTOMER_APPROVAL_REQUIRED' && !proofApproved && (
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
                PRESS PLANT SUPPORT
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Need emergency changes or rush express priority? Reach our factory floor supervisor directly:
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
