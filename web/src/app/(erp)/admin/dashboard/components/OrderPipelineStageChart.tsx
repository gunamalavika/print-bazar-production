'use client';

import React, { useState, useMemo } from 'react';
import {
  RiPieChartLine,
  RiArrowRightLine,
  RiShieldCheckLine,
  RiTimeLine,
  RiPaletteLine,
  RiPrinterLine,
  RiBox3Line,
  RiTruckLine,
  RiAlertLine,
  RiFileList3Line,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import { DashboardOrderSummary } from './OrderVolumeRevenueChart';

interface OrderPipelineStageChartProps {
  orders: DashboardOrderSummary[];
  statusBreakdown?: Record<string, number>;
}

interface StageGroup {
  id: string;
  name: string;
  shortName: string;
  statuses: string[];
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const STAGE_GROUPS: StageGroup[] = [
  {
    id: 'intake',
    name: 'Order Intake & Review',
    shortName: 'Intake',
    statuses: ['ORDER_CREATED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'ORDER_REVIEW'],
    color: '#0284C7', // Sky-600
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    textColor: 'text-sky-700',
    icon: RiFileList3Line,
    description: 'Received customer orders undergoing intake & prepress triage',
  },
  {
    id: 'design',
    name: 'Prepress & Design Studio',
    shortName: 'Design',
    statuses: ['DESIGN_REQUIRED', 'ARTWORK_REVIEW', 'ARTWORK_APPROVED'],
    color: '#F59E0B', // Amber-500
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    icon: RiPaletteLine,
    description: 'File preflight, bleed checks, and custom artwork generation',
  },
  {
    id: 'approval',
    name: 'Customer Approval Gate',
    shortName: 'Customer Approval',
    statuses: ['CUSTOMER_APPROVAL_REQUIRED'],
    color: '#8B5CF6', // Violet-500
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-700',
    icon: RiTimeLine,
    description: 'Awaiting client digital proof sign-off before plate release',
  },
  {
    id: 'production',
    name: 'Press & Shop-Floor',
    shortName: 'Production',
    statuses: ['PRODUCTION_QUEUE', 'PRINTING', 'FINISHING'],
    color: '#10B981', // Emerald-500
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-800',
    icon: RiPrinterLine,
    description: 'Active on press, lamination, die-cutting, and bindery lines',
  },
  {
    id: 'packing',
    name: 'QC & Packaging Station',
    shortName: 'QC & Packing',
    statuses: ['QUALITY_CHECK', 'PACKING'],
    color: '#06B6D4', // Cyan-500
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    textColor: 'text-cyan-800',
    icon: RiBox3Line,
    description: 'Final quality inspection, carton weighing & thermal labeling',
  },
  {
    id: 'dispatch',
    name: 'Dispatch & Logistics',
    shortName: 'Dispatch',
    statuses: ['READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'COMPLETED'],
    color: '#6366F1', // Indigo-500
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-800',
    icon: RiTruckLine,
    description: 'Carrier manifested, out for courier delivery, or handed over',
  },
  {
    id: 'holds',
    name: 'Exceptions & Holds',
    shortName: 'On Hold',
    statuses: ['ON_HOLD', 'CANCELLED'],
    color: '#EF4444', // Red-500
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    icon: RiAlertLine,
    description: 'Blocked on artwork rejection, stock exception, or payment',
  },
];

export function OrderPipelineStageChart({
  orders,
  statusBreakdown,
}: OrderPipelineStageChartProps) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  // Group metrics by stage
  const stageStats = useMemo(() => {
    const totalOrdersCount = orders.length || 1;

    return STAGE_GROUPS.map((group) => {
      // Find all matching orders
      const matchingOrders = orders.filter((o) => group.statuses.includes(o.status));
      const count = matchingOrders.length;
      const revenue = matchingOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      const percentage = (count / totalOrdersCount) * 100;

      return {
        ...group,
        count,
        revenue,
        percentage,
        orders: matchingOrders,
      };
    }).filter((s) => s.count > 0 || ['intake', 'design', 'production', 'packing', 'dispatch'].includes(s.id));
  }, [orders]);

  const totalActivePipelineOrders = orders.length;
  const totalPipelineRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  // SVG Donut Math
  const radius = 64;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment stroke dashes
  let accumulatedOffset = 0;
  const donutSegments = stageStats.map((stage) => {
    const segmentLength = (stage.count / Math.max(1, totalActivePipelineOrders)) * circumference;
    const strokeDasharray = `${segmentLength} ${circumference - segmentLength}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += segmentLength;

    return {
      ...stage,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeStage = selectedStageId
    ? stageStats.find((s) => s.id === selectedStageId)
    : null;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
            <RiPieChartLine className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[15px] sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Order Manufacturing Pipeline Breakdown</span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                {totalActivePipelineOrders} Orders Active
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Live distribution of orders through pre-press, shop-floor press, finishing, and dispatch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500">
            Locked Value: <strong className="text-slate-900">{formatCurrency(totalPipelineRevenue)}</strong>
          </span>
        </div>
      </div>

      {/* Main Grid: Donut Wheel on Left + Stage List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left (5 cols on lg): Donut Visual with Center Badge */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
          <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
            <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 transform">
              {/* Background Ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />

              {/* Segments */}
              {donutSegments.map((seg) => {
                const isSelected = selectedStageId === seg.id;
                return (
                  <circle
                    key={seg.id}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="butt"
                    className="cursor-pointer transition-all duration-200 hover:opacity-90"
                    onClick={() => setSelectedStageId(selectedStageId === seg.id ? null : seg.id)}
                  />
                );
              })}
            </svg>

            {/* Inner Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                {activeStage ? activeStage.shortName : 'Total Orders'}
              </span>
              <span className="text-[26px] sm:text-[30px] font-black text-slate-900 font-mono tracking-tight leading-none mt-0.5">
                {activeStage ? activeStage.count : totalActivePipelineOrders}
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-600 mt-1 truncate max-w-[130px]">
                {activeStage
                  ? formatCurrency(activeStage.revenue)
                  : formatCurrency(totalPipelineRevenue)}
              </span>
            </div>
          </div>

          <span className="text-[10px] text-slate-400 font-mono mt-3 text-center">
            Click any segment or list card to isolate stage telemetry
          </span>
        </div>

        {/* Right (7 cols on lg): Stage Cards List with Progress Bars */}
        <div className="lg:col-span-7 space-y-2">
          {stageStats.map((stage) => {
            const Icon = stage.icon;
            const isSelected = selectedStageId === stage.id;

            return (
              <div
                key={stage.id}
                onClick={() => setSelectedStageId(selectedStageId === stage.id ? null : stage.id)}
                className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer select-none ${
                  isSelected
                    ? `${stage.bgColor} ${stage.borderColor} shadow-xs ring-1 ring-slate-900/10`
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <Icon className={`h-4 w-4 ${stage.textColor} shrink-0`} />
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                      {stage.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                      {stage.count} {stage.count === 1 ? 'Order' : 'Orders'}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {formatCurrency(stage.revenue)}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-400 w-9 text-right tabular-nums">
                      {stage.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(4, stage.percentage)}%`,
                      backgroundColor: stage.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

