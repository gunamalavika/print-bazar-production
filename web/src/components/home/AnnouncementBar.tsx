'use client';

import Link from 'next/link';
import { Globe, Truck, HelpCircle, PhoneCall, Sparkles } from 'lucide-react';

export function TopUtilityBar() {
  return (
    <div className="bg-slate-900 text-slate-200 px-4 sm:px-8 py-1.5 text-[11px] font-sans border-b border-slate-800">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
        {/* Left: Industrial Factory Status */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold tracking-wider text-[#FFED00] font-mono text-[10px]">
            <span className="h-2 w-2 rounded-full bg-[#FFED00] animate-pulse" />
            PRESS PLANT ONLINE
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-medium hidden sm:inline">
            Direct Industrial Print Manufacturing & Custom Packaging
          </span>
        </div>

        {/* Right: Quick Operational Links */}
        <div className="flex items-center gap-4 text-slate-300 text-[11px]">
          <Link
            href="/tracking/PB-2026-0001"
            className="hover:text-[#FFED00] transition flex items-center gap-1 font-medium"
          >
            <span>Live Order Tracking</span>
          </Link>
          <span className="text-slate-600">|</span>
          <a
            href="tel:+912289402100"
            className="hover:text-[#FFED00] transition flex items-center gap-1 font-medium"
          >
            <PhoneCall className="h-3 w-3 text-[#FFED00]" />
            <span>B2B Desk: +91 (022) 8940-2100</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function PromotionalStrip() {
  return (
    <div className="bg-slate-50 text-slate-800 text-center py-2 px-4 text-xs font-sans border-b border-slate-200">
      <div className="mx-auto max-w-7xl flex items-center justify-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 bg-[#FFED00] text-slate-950 font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-mono">
          <Sparkles className="h-3 w-3" />
          BULK SPECIAL
        </span>
        <span className="font-medium text-slate-700">
          Flat <strong>5% OFF</strong> on orders ₹10,000+ with code
        </span>
        <span className="bg-white text-slate-900 font-mono font-bold px-2 py-0.5 rounded border border-slate-300 text-[11px] shadow-xs">
          SAVE5
        </span>
        <span className="text-slate-300 mx-1 hidden sm:inline">|</span>
        <span className="text-slate-500 text-[11px] hidden sm:inline">
          High-Precision 2400 DPI Offset & Digital Printing • Zero Price Drift
        </span>
      </div>
    </div>
  );
}

