'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, SlidersHorizontal, UploadCloud, Eye, Printer, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui';

const STEPS = [
  {
    number: '01',
    title: 'Configure Specs',
    desc: 'Select size, substrate GSM, lamination & finish options',
    icon: SlidersHorizontal,
  },
  {
    number: '02',
    title: 'Upload Artwork',
    desc: 'Instant DPI, bleed & preflight resolution check',
    icon: UploadCloud,
  },
  {
    number: '03',
    title: 'Proof Approval',
    desc: 'Digital color-calibrated proof verification',
    icon: Eye,
  },
  {
    number: '04',
    title: 'Shop-Floor Run',
    desc: 'Heidelberg & HP Indigo press production run',
    icon: Printer,
  },
  {
    number: '05',
    title: 'QC & Dispatch',
    desc: 'Tolerance audit, custom packing & express tracking',
    icon: PackageCheck,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#F8FAFC] py-14 lg:py-20 border-b border-slate-200 w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Industrial Printing Press Visual */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-elevated bg-white p-3">
              <div className="rounded-xl overflow-hidden bg-slate-100 aspect-[4/3] relative">
                <img
                  src="/images/home/press-machine.jpg"
                  alt="Industrial Heidelberg & HP Indigo Press Operations"
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-lg border border-slate-700/60 text-xs">
                  <div className="flex items-center justify-between font-mono font-bold text-[11px] text-[#FFED00]">
                    <span>HEIDELBERG SPEEDMASTER XL 106</span>
                    <span>6-COLOR</span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1">
                    Continuous spectrophotometric in-line color measurement at 18,000 sheets/hour.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Process Narrative & 5-Step Stepper */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#E3A008] block">
                  MANUFACTURING WORKFLOW
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-display mt-1">
                  From Digital File to Finished Goods
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  A transparent 5-stage Customer-to-Production operating pipeline with live milestone tracking.
                </p>
              </div>

              <Link href="/products/premium-visiting-cards">
                <Button variant="primary" size="sm">
                  <span>Start a Job</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {/* 5-Step Horizontal / Responsive Process Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-900 hover:shadow-card transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Step Header */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-black text-slate-400">
                          {step.number}
                        </span>
                        <div className="h-7 w-7 rounded-lg bg-[#FFED00]/60 border border-[#E3A008]/40 flex items-center justify-center text-slate-950 shadow-xs">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                      </div>

                      {/* Title & Desc */}
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">
                        {step.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        {step.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Automated</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
