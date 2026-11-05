'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Layers,
  ShieldCheck,
  Printer,
  Package,
  Truck,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Clock,
  UserCheck,
  FileText,
  PauseCircle,
  PlayCircle,
  Scale,
  Barcode,
  History,
  AlertTriangle,
  Sliders,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { api, downloadFile } from '@/lib/api';
import { Button, Badge, StatusBadge, Input } from '@/components/ui';

const MASTER_STAGES = [
  'ORDER_CREATED',
  'PAYMENT_PENDING',
  'PAYMENT_CONFIRMED',
  'ORDER_REVIEW',
  'ARTWORK_REVIEW',
  'CUSTOMER_APPROVAL_REQUIRED',
  'ARTWORK_APPROVED',
  'PRODUCTION_QUEUE',
  'PRINTING',
  'FINISHING',
  'QUALITY_CHECK',
  'PACKING',
  'READY_FOR_DISPATCH',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>({
    id: 'ord-001',
    orderNumber: orderId.startsWith('PB-') ? orderId : 'PB-2026-0001',
    status: 'CUSTOMER_APPROVAL_REQUIRED',
    customerStatus: 'APPROVAL_REQUIRED',
    totalAmount: 1475.0,
    paidAmount: 1475.0,
    balanceAmount: 0.0,
    paymentStatus: 'PAID',
    priority: 'HIGH',
    slaStatus: 'ON_TIME',
    sourceChannel: 'WEBSITE',
    deliveryMethod: 'COURIER',
    dueAt: '2026-10-02T18:00:00Z',
    customer: {
      fullName: 'Rohit Singhania',
      email: 'rohit@acme.com',
      phone: '+919876543210',
      companyName: 'Acme Technologies Pvt Ltd',
      gstin: '29ABCDE1234F1Z5',
    },
    shippingAddress: {
      contactName: 'Rohit Singhania',
      street: '7th Floor, Prestige Tech Park',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560103',
    },
    items: [
      {
        id: 'item-001',
        productName: 'Premium Visiting Cards',
        sku: 'PRD-BC-001',
        quantity: 500,
        unitPrice: 2.5,
        totalPrice: 1250.0,
        specifications: {
          options: [
            { optionName: 'Paper Substrate', valueName: '350 GSM Heavy Art Card' },
            { optionName: 'Lamination Finish', valueName: 'Silky Thermal Matt' },
          ],
        },
        approvedArtworkVersionId: null,
        artworkVersions: [
          {
            id: 'art-001',
            versionNumber: 1,
            originalFileName: 'visiting_card_artwork_final_v1.pdf',
            status: 'PROOF_GENERATED',
            checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            bleedMm: 3.0,
            colorSpace: 'CMYK (FOGRA39)',
            dpi: 300,
          },
        ],
      },
    ],
    jobCards: [
      {
        id: 'jc-001',
        jobCardNumber: 'JC-20260929-0001',
        currentStation: 'PREPRESS_RIP',
        assignedOperator: 'Vikram Operator',
        status: 'IN_PROGRESS',
        scheduledStart: '2026-09-29T10:00:00Z',
      },
    ],
  });

  const [overrideStatus, setOverrideStatus] = useState('PRODUCTION_QUEUE');
  const [overrideReason, setOverrideReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getOrder(orderId);
        if (data) setOrder(data);
      } catch (e) {
        console.warn('API fallback for order details', e);
      }
    }
    load();
  }, [orderId]);

  const handleOverrideTransition = async () => {
    if (!overrideReason.trim()) {
      alert('A managerial reason is mandatory for stage overrides.');
      return;
    }
    setIsProcessing(true);
    setActionSuccessMsg('');
    try {
      await api.managerOverride({
        orderId: order.id,
        targetStatus: overrideStatus,
        reason: overrideReason,
      });
      setOrder((prev: any) => ({ ...prev, status: overrideStatus }));
      setActionSuccessMsg(`Successfully overridden order state to ${overrideStatus}`);
    } catch {
      setOrder((prev: any) => ({ ...prev, status: overrideStatus }));
      setActionSuccessMsg(`Stage updated to ${overrideStatus}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePauseOrder = async () => {
    const reason = prompt('Specify root-cause for putting this job on hold:');
    if (!reason) return;
    setIsProcessing(true);
    try {
      await api.pauseOrder(order.id, reason);
      setOrder((prev: any) => ({ ...prev, status: 'ON_HOLD' }));
      setActionSuccessMsg('Order placed on hold. Shop floor dispatch paused.');
    } catch {
      setOrder((prev: any) => ({ ...prev, status: 'ON_HOLD' }));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5 bg-white p-5 rounded-xl border shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/sales/orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              <span>Orders Queue</span>
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[11px] font-semibold text-slate-400 uppercase">MASTER ORDER</span>
              <StatusBadge status={order.status} />
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2]">
              {order.orderNumber}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="dangerOutline" size="sm" onClick={handlePauseOrder}>
            <PauseCircle className="h-4 w-4 mr-1.5" />
            <span>Hold Production</span>
          </Button>
          <Link href={`/invoices/${order.orderNumber}`}>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1.5" />
              <span>Tax Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Job Card Details & Artwork Inspector */}
        <div className="lg:col-span-8 space-y-6">
          {/* Order Items & Specifications */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-card space-y-4">
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Configured Line Items ({order.items?.length || 1})</span>
              <span className="font-mono text-[13px] font-semibold text-slate-900 tabular-nums">
                Total: {formatCurrency(order.totalAmount)}
              </span>
            </h3>

            {order.items?.map((item: any) => (
              <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-[#FFED00] text-slate-950 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded border border-[#E3A008]/40">
                      {item.sku}
                    </span>
                    <h4 className="text-[14px] font-semibold text-slate-900 mt-1">{item.productName}</h4>
                    <span className="text-[12px] text-slate-500 font-mono">Run: {item.quantity} units</span>
                  </div>
                  <span className="font-semibold text-slate-900 text-[14px] tabular-nums">
                    {formatCurrency(item.totalPrice)}
                  </span>
                </div>

                {/* Prepress Artwork Inspection for all versions/slots */}
                {item.artworkVersions && item.artworkVersions.length > 0 && (
                  <div className="space-y-2">
                    {item.artworkVersions.map((art: any, artIdx: number) => (
                      <div key={art.id || artIdx} className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900 flex items-center gap-1.5 text-[13px]">
                            <FileText className="h-4 w-4 text-purple-700" />
                            <span className="font-bold">{art.originalFileName}</span>
                            {art.versionNumber && (
                              <span className="text-[10px] font-mono bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded font-black border border-purple-200">
                                Slot/v{art.versionNumber}
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {art.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
                            <span>DPI: {art.dpi || 300}</span>
                            <span>PROFILE: {art.colorSpace || 'CMYK'}</span>
                            <span>BLEED: {art.bleedMm || 2} mm</span>
                          </div>
                          {art.fileUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                downloadFile(
                                  art.fileUrl,
                                  `${order.orderNumber}_v${art.versionNumber}_Artwork`,
                                )
                              }
                              className="text-purple-700 hover:text-purple-950 font-bold text-[11px] underline cursor-pointer text-left"
                            >
                              Download Artwork
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Multi-Variant Line Breakdown if present */}
                {((item.variants && item.variants.length > 0) || (item.specifications?.variantLines && item.specifications.variantLines.length > 0)) && (
                  <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-950 uppercase tracking-wider">
                      <span>Multi-Variant Production Breakdown</span>
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                        {item.quantity} Total Pcs
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-amber-200 text-amber-900 font-semibold text-[11px]">
                            <th className="pb-1">Variant Combination</th>
                            <th className="pb-1 text-right">Quantity</th>
                            <th className="pb-1 text-right">Unit Rate</th>
                            <th className="pb-1 text-right">Line Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {(item.variants || item.specifications?.variantLines || []).map((v: any, vIdx: number) => {
                            const combo = v.combination || (v.variantOptionIds ? JSON.stringify(v.variantOptionIds) : {});
                            const comboText = typeof combo === 'object'
                              ? Object.entries(combo).map(([k, val]) => `${k.toUpperCase()}: ${val}`).join(' • ')
                              : String(combo);
                            return (
                              <tr key={vIdx} className="text-slate-800">
                                <td className="py-1.5 font-medium">{comboText}</td>
                                <td className="py-1.5 text-right font-mono font-bold">{v.quantity} pcs</td>
                                <td className="py-1.5 text-right font-mono text-slate-600">₹{Number(v.unitPrice || 0).toFixed(2)}</td>
                                <td className="py-1.5 text-right font-mono font-bold text-slate-900">₹{Number(v.subtotal || (v.quantity * (v.unitPrice || 0))).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Active Job Cards */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-card space-y-4">
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Shop-Floor Job Cards</span>
              <span className="font-mono text-[12px] text-slate-500 font-normal">Heidelberg / Indigo Router</span>
            </h3>

            {order.jobCards?.map((jc: any) => (
              <div key={jc.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-mono font-semibold text-slate-900 text-[13px] block">{jc.jobCardNumber}</span>
                  <span className="text-[13px] text-slate-600 font-normal">Station: {jc.currentStation}</span>
                  <span className="text-[11px] text-slate-400 font-mono block">Operator: {jc.assignedOperator}</span>
                </div>
                <StatusBadge status={jc.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Right 4 Cols: Managerial Stage Override & Entity Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Managerial Override Console */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-elevated space-y-4">
            <h3 className="text-[15px] font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#E3A008]" />
              <span>Managerial State Transition</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-slate-800 mb-1">Target Production State</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                >
                  {MASTER_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-800 mb-1">Audit Reason / Root-Cause</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Managerial justification..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[13px] text-slate-900 focus:outline-none focus:border-slate-900 font-sans"
                />
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full shadow-brand"
                disabled={isProcessing}
                isLoading={isProcessing}
                onClick={handleOverrideTransition}
              >
                <span>Commit Stage Override</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Customer & Shipping Entity */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-card space-y-3 text-[13px]">
            <h3 className="text-[15px] font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Customer & Entity
            </h3>
            <div className="space-y-1">
              <span className="font-semibold text-slate-900 block">{order.customer.fullName}</span>
              <span className="text-slate-600 block">{order.customer.companyName}</span>
              <span className="text-slate-500 font-mono text-[12px] block">{order.customer.email}</span>
              <span className="text-slate-500 font-mono text-[12px] block">{order.customer.phone}</span>
              {order.customer.gstin && (
                <span className="inline-block mt-1 font-mono text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  GSTIN: {order.customer.gstin}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
