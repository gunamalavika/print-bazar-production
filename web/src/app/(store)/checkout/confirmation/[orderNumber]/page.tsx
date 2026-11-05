'use client';

import Link from 'next/link';
import { use } from 'react';
import {
  CheckCircle2,
  FileText,
  Printer,
  Truck,
  ArrowRight,
  ShieldCheck,
  Clock,
  Layers,
  FileCheck,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const resolvedParams = use(params);
  const orderNumber = resolvedParams.orderNumber || 'PB-2026-0001';

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* 1. Header Banner */}
      <div className="bg-[#1A1A1A] text-white py-12 px-4 sm:px-8 border-b border-[#333]">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-[#FCDD55] text-brand-dark mb-4 border border-brand-dark shadow-yellow">
            <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
          </div>

          <div className="inline-flex items-center gap-2 bg-[#2a2a2a] text-[#FCDD55] px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider mb-2 border border-zinc-700">
            <span>MASTER RECORD LOCKED & CONFIRMED</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white">
            Order #{orderNumber}
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 mt-2 max-w-xl mx-auto">
            Payment verified. Your production order has been received and routed into our automated prepress queue.
          </p>
        </div>
      </div>

      {/* 2. Order Information Card */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white border border-brand-border rounded-[12px] p-6 sm:p-8 shadow-card">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-brand-border text-xs">
            <div>
              <span className="text-zinc-400 uppercase font-mono font-bold block text-[10px]">
                Order Status
              </span>
              <span className="font-mono font-extrabold text-brand-dark bg-[#FCDD55] px-2 py-0.5 rounded text-[11px] inline-block mt-1">
                PREPRESS QUEUE
              </span>
            </div>
            <div>
              <span className="text-zinc-400 uppercase font-mono font-bold block text-[10px]">
                Payment Status
              </span>
              <span className="font-mono font-extrabold text-green-700 bg-green-50 px-2 py-0.5 rounded text-[11px] inline-block mt-1">
                PAID IN FULL (RAZORPAY)
              </span>
            </div>
            <div>
              <span className="text-zinc-400 uppercase font-mono font-bold block text-[10px]">
                Target SLA
              </span>
              <span className="font-mono font-bold text-brand-dark block mt-1">
                48 Hours (On Schedule)
              </span>
            </div>
            <div>
              <span className="text-zinc-400 uppercase font-mono font-bold block text-[10px]">
                Total Amount Paid
              </span>
              <span className="font-mono font-black text-brand-dark text-base block mt-0.5">
                ₹1,262.00
              </span>
            </div>
          </div>

          {/* Master Timeline Preview */}
          <div className="py-6 border-b border-brand-border">
            <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider mb-4">
              Production Lifecycle Milestones
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-zinc-50 border border-brand-border rounded-[8px]">
                <div className="flex items-center gap-1.5 text-green-700 font-bold mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>01. Order Placed</span>
                </div>
                <p className="text-[11px] text-zinc-500">Master record initialized with payment lock.</p>
              </div>

              <div className="p-3 bg-yellow-50/50 border border-[#FCDD55] rounded-[8px]">
                <div className="flex items-center gap-1.5 text-brand-dark font-black mb-1">
                  <Clock className="h-4 w-4 text-[#FBBF24]" />
                  <span>02. Proof Review</span>
                </div>
                <p className="text-[11px] text-zinc-600">Digital soft-proof is being generated for your sign-off.</p>
              </div>

              <div className="p-3 bg-zinc-50 border border-brand-border rounded-[8px] opacity-60">
                <div className="flex items-center gap-1.5 text-zinc-500 font-bold mb-1">
                  <Printer className="h-4 w-4" />
                  <span>03. Press Run</span>
                </div>
                <p className="text-[11px] text-zinc-400">Heidelberg / HP Indigo automated Job Card release.</p>
              </div>

              <div className="p-3 bg-zinc-50 border border-brand-border rounded-[8px] opacity-60">
                <div className="flex items-center gap-1.5 text-zinc-500 font-bold mb-1">
                  <Truck className="h-4 w-4" />
                  <span>04. Dispatch</span>
                </div>
                <p className="text-[11px] text-zinc-400">Barcoded parcel packing & courier handover.</p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href={`/tracking/${orderNumber}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FCDD55] hover:bg-[#FBBF24] text-brand-dark font-black text-xs px-5 py-3 rounded-[8px] border border-brand-dark shadow-subtle transition active:scale-95"
              >
                <span>Track Master Order Timeline</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href={`/invoices/${orderNumber}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 text-brand-dark font-bold text-xs px-4 py-3 rounded-[8px] border border-brand-border transition"
              >
                <FileText className="h-4 w-4 text-zinc-500" />
                <span>Download Tax Invoice (GST)</span>
              </Link>
            </div>

            <Link
              href="/products"
              className="text-xs font-bold text-zinc-600 hover:text-brand-dark"
            >
              ← Order Another Product
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
