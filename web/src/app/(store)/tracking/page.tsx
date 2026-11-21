'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Search, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

export default function TrackingLandingPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const router = useRouter();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orderNumber.trim();
    if (trimmed) {
      router.push(`/tracking/${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <div className="min-h-[70vh] bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-8 rounded-2xl border border-neutral-200 shadow-sm text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-[#FFED00] flex items-center justify-center shadow-xs">
          <Truck className="w-7 h-7 text-black" />
        </div>
        
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
            Track Your Order
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-neutral-600">
            Enter your order number or tracking ID below to check live manufacturing and shipping progress.
          </p>
        </div>

        <form onSubmit={handleTrack} className="mt-6 space-y-4">
          <div className="relative">
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. PB-2026-0001"
              required
              className="w-full px-4 py-3 pl-10 text-sm bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-black placeholder:text-neutral-400 font-medium"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99]"
          >
            <span>Track Order</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-6 border-t border-neutral-100 grid grid-cols-2 gap-4 text-xs text-neutral-500 text-left">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
            <span>Live timeline from prepress to doorstep delivery</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
            <span>Real-time courier sync & delivery notifications</span>
          </div>
        </div>
      </div>
    </div>
  );
}
