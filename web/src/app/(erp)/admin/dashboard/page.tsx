'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Cpu,
  Package,
  Layers,
  CheckCircle2,
  Printer,
  Sliders,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button, Badge, StatusBadge } from '@/components/ui';

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ERP Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5 bg-white p-5 rounded-xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#FFED00] text-slate-950 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-[#E3A008]/40 shadow-xs">
              EXECUTIVE TELEMETRY
            </span>
            <span className="text-[12px] font-mono text-slate-500 font-medium">
              SHOP-FLOOR OPERATING SYSTEM
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2]">
            Operational Exceptions & Plant Intelligence
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 mt-1 leading-normal">
            Real-time machine queues, overdue production jobs, and quality gates requiring managerial sign-off.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/sales/orders">
            <Button variant="primary" size="md">
              <span>Master Orders Stream</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 5 Manufacturing Health Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <span className="text-[11px] font-mono uppercase font-medium text-slate-500 block">ORDERS TODAY</span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-slate-900 mt-1 block tabular-nums leading-tight">24</span>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">₹58,400 Gross Volume</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <span className="text-[11px] font-mono uppercase font-medium text-slate-500 block">ACTIVE PRODUCTION</span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-slate-900 mt-1 block tabular-nums leading-tight">8</span>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">Indigo, Offset & Finishing</span>
        </div>

        <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 shadow-card">
          <span className="text-[11px] font-mono uppercase font-semibold text-amber-900 block">SLA RISK (&lt;12H)</span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-amber-950 mt-1 block tabular-nums leading-tight">1</span>
          <span className="text-[11px] text-amber-800 font-medium mt-0.5 block">Approaching Deadline</span>
        </div>

        <div className="bg-rose-50/70 border border-rose-300 rounded-xl p-4 shadow-card">
          <span className="text-[11px] font-mono uppercase font-semibold text-rose-900 block">QC REJECTIONS</span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-rose-950 mt-1 block tabular-nums leading-tight">1</span>
          <span className="text-[11px] text-rose-700 font-medium mt-0.5 block">Defect in Rework</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <span className="text-[11px] font-mono uppercase font-medium text-slate-500 block">READY TO DISPATCH</span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-slate-900 mt-1 block tabular-nums leading-tight">6</span>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">Manifests Prepared</span>
        </div>
      </div>

      {/* Exception Action Centers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Attention / On Hold Jobs */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-[16px] font-semibold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <span>Production Holds & Material Exceptions</span>
            </h3>
            <span className="text-[10px] font-mono font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
              ACTION REQUIRED
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-rose-200 bg-rose-50/30 p-3.5 flex items-center justify-between">
              <div>
                <span className="font-mono font-semibold text-slate-900 text-[13px] block">
                  PB-2026-0004 • Rigid Boxes
                </span>
                <span className="text-[13px] text-slate-700 font-medium">Gupta Sweets & Bakers (200 units)</span>
                <p className="text-[11px] text-rose-700 font-mono font-medium mt-0.5">
                  Reason: Substrate 800 GSM kappa board stock out at raw material store.
                </p>
              </div>

              <Link href="/sales/orders/PB-2026-0004">
                <Button variant="outline" size="xs">
                  Inspect
                </Button>
              </Link>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-3.5 flex items-center justify-between">
              <div>
                <span className="font-mono font-semibold text-slate-900 text-[13px] block">
                  PB-2026-0002 • Roll-Up Banner
                </span>
                <span className="text-[13px] text-slate-700 font-medium">Zenith Retail (2 units)</span>
                <p className="text-[11px] text-amber-800 font-mono font-medium mt-0.5">
                  SLA Warning: 8 hours remaining to cutoff. In Pre-Production QC queue.
                </p>
              </div>

              <Link href="/qc/inspection">
                <Button variant="primary" size="xs">
                  Run QC
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Machine Work Center Utilization */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-[16px] font-semibold text-slate-900 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-slate-800" />
              <span>Shop-Floor Work Center Status</span>
            </h3>
            <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              ALL STATIONS RUNNING
            </span>
          </div>

          <div className="space-y-3 text-[13px]">
            <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between bg-slate-50/60">
              <div>
                <span className="font-medium text-slate-900 block text-[13px]">HP Indigo 12000 Digital Press</span>
                <span className="text-slate-500 font-mono text-[11px]">Job JC-20260929-0001 (Visiting Cards)</span>
              </div>
              <span className="bg-slate-900 text-[#FFED00] px-2 py-0.5 text-[10px] font-mono font-semibold rounded">
                RUNNING
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between bg-slate-50/60">
              <div>
                <span className="font-medium text-slate-900 block text-[13px]">Roland TrueVIS VG3-640 Wide Format</span>
                <span className="text-slate-500 font-mono text-[11px]">Job JC-20260929-0002 (Roll-Up Standee)</span>
              </div>
              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 text-[10px] font-mono font-semibold rounded">
                QUEUED
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between bg-slate-50/60">
              <div>
                <span className="font-medium text-slate-900 block text-[13px]">Polar 115 High-Speed Guillotine</span>
                <span className="text-slate-500 font-mono text-[11px]">Job JC-20260929-0003 (Letterheads)</span>
              </div>
              <span className="bg-slate-900 text-[#FFED00] px-2 py-0.5 text-[10px] font-mono font-semibold rounded">
                FINISHING
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
