'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Package,
  FileText,
  Clock,
  Star,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui';

const STATS = [
  {
    icon: Package,
    value: '50,000+',
    label: 'Jobs Successfully Dispatched',
  },
  {
    icon: FileText,
    value: '1,200+',
    label: 'Commercial Substrate Configurations',
  },
  {
    icon: Clock,
    value: '99.4%',
    label: 'SLA On-Time Production Rate',
  },
  {
    icon: Star,
    value: '4.9 / 5',
    label: 'B2B Client Quality Rating',
  },
];

export function TrustSection() {
  return (
    <section id="why-us" className="bg-white py-14 lg:py-20 border-b border-slate-200 w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Why Businesses Trust Us */}
          <div className="lg:col-span-5 space-y-5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#E3A008] block">
              ENTERPRISE OPERATIONAL TRUST
            </span>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight font-display">
              Engineered for Quality, Speed and Industrial Scale.
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed max-w-md">
              We connect commercial enterprises, agency partners, and growing brands directly to calibrated press machinery with automated job cards, zero pricing drift, and guaranteed turnaround SLAs.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link href="/products">
                <Button variant="primary" size="md">
                  <span>Explore B2B Products</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link href="/account">
                <Button variant="outline" size="md">
                  <span>Corporate Accounts</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Center Column: 4 Clean Metrics */}
          <div className="lg:col-span-3 space-y-3">
            {STATS.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-400 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-900 flex-shrink-0">
                    <Icon className="h-4 w-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-900 font-display block leading-tight">
                      {stat.value}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block leading-tight mt-0.5">
                      {stat.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Printed Portfolio Visual */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-elevated bg-slate-50 p-3">
              <div className="rounded-xl overflow-hidden bg-white aspect-[4/3] relative">
                <img
                  src="/images/home/trust-magazine.jpg"
                  alt="Good Ideas Deserve Great Print - Quality Portfolio"
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
