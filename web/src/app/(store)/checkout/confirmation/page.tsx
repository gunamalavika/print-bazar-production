'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Printer,
  FileText,
  Truck,
  ArrowRight,
  ShieldCheck,
  Clock,
  Download,
  Building2,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('orderNumber') || 'PB-2026-0001';
  const paymentMode = searchParams.get('paymentMode') || 'FULL';
  const paid = searchParams.get('paid');
  const balance = searchParams.get('balance');

  const isSplit = paymentMode === 'SPLIT_50';

  return (
    <div className="min-h-screen bg-[#F8F8F8] py-6 sm:py-10 px-4 sm:px-6 lg:px-8 pb-28 md:pb-12 w-full max-w-full overflow-x-hidden">
      <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
        {/* Success Banner Card */}
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 sm:p-8 text-center shadow-xs space-y-4">
          <div className="h-14 w-14 sm:h-16 sm:w-16 bg-[#F0FDF4] text-[#166534] rounded-full flex items-center justify-center mx-auto border border-green-200 shadow-xs">
            <CheckCircle2 className="h-8 w-8 sm:h-9 sm:w-9 stroke-[2.5]" />
          </div>

          <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#166534] bg-[#F0FDF4] px-3 py-1 rounded-full border border-green-200">
            <span>
              {isSplit ? 'ORDER CONFIRMED & 50% ADVANCE RECEIVED' : 'ORDER CONFIRMED & PAYMENT VERIFIED'}
            </span>
          </div>

          <h1 className="text-[20px] sm:text-[26px] font-semibold text-black tracking-tight font-sans leading-tight">
            Your Print Job is Queued for Production!
          </h1>

          <p className="text-[13px] sm:text-[14px] text-[#525252] max-w-lg mx-auto leading-relaxed">
            Order Master Record <strong>#{orderNumber}</strong> has been generated and dispatched to our automated prepress RIP engines.
          </p>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold">ORDER NUMBER:</span>
              <span className="font-black text-slate-900 text-sm">{orderNumber}</span>
            </div>
            {isSplit && paid && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-amber-900 font-bold">
                <span>50% ADVANCE PAID:</span>
                <span>₹{Number(paid).toLocaleString('en-IN')}</span>
              </div>
            )}
            {isSplit && balance && (
              <div className="flex items-center justify-between text-slate-600">
                <span>BALANCE DUE ON DISPATCH:</span>
                <span className="font-bold text-slate-800">₹{Number(balance).toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps Lifecycle Pipeline */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-card space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display border-b border-slate-100 pb-3">
            What Happens Next? (Automated Shop-Floor Pipeline)
          </h3>

          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="h-7 w-7 rounded-full bg-[#FFED00] text-slate-950 flex items-center justify-center font-mono font-black text-xs flex-shrink-0 mt-0.5 border border-[#E3A008]/40">
                1
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Automated Prepress & Bleed Verification
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                  Our RIP software audits your artwork resolution, CMYK color space, and safety margins.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 mt-0.5 border border-slate-200">
                2
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Shop Floor Press Run & Finishing
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                  Job cards are routed to Heidelberg Speedmaster offset or HP Indigo digital work centers.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 mt-0.5 border border-slate-200">
                3
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Quality Control Audit & Express Dispatch
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                  Tolerance inspection, custom packaging, carton labeling, and courier handover.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href={`/tracking/${orderNumber}`}>
            <Button variant="primary" size="lg" className="shadow-brand">
              <Truck className="h-4 w-4 mr-2" />
              <span>Track Production Status</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>

          <Link href={`/invoices/${orderNumber}`}>
            <Button variant="outline" size="lg">
              <FileText className="h-4 w-4 mr-2" />
              <span>Download Tax Invoice (GST 18%)</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <span className="text-xs font-mono font-bold text-slate-500">Loading Order Confirmation...</span>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
