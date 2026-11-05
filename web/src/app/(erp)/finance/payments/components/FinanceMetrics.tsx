'use client';

import React from 'react';
import {
  RiMoneyDollarCircleLine,
  RiCheckboxCircleLine,
  RiAlertLine,
  RiTimeLine,
  RiBankCardLine,
  RiFlashlightLine,
  RiFileList3Line,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';

interface FinanceMetricsProps {
  metrics: {
    totalGrossBilling: number;
    gstCollected: number;
    settledAmount: number;
    pendingAmount: number;
    corporateCreditAmount: number;
    overdueAmount: number;
    collectionRate: number;
    pendingCount: number;
    corporateCount: number;
    settledCount: number;
    overdueCount: number;
  };
}

export function FinanceMetrics({ metrics }: FinanceMetricsProps) {
  return (
    <div className="space-y-3">
      {/* Live Financial Velocity & Treasury Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Invoiced Billing */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-500">TOTAL INVOICED</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 truncate">
            <span className="text-[20px] font-bold text-slate-900 font-mono leading-none truncate">
              {formatCurrency(metrics.totalGrossBilling)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">Gross Order Value</span>
        </div>

        {/* Payment Pending */}
        <div className="bg-amber-50/50 border border-amber-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-900">PAYMENT PENDING</span>
            <RiTimeLine className="h-4 w-4 text-[#E3A008]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 truncate">
            <span className="text-[20px] font-bold text-amber-950 font-mono leading-none truncate">
              {formatCurrency(metrics.pendingAmount)}
            </span>
          </div>
          <span className="text-[10px] text-amber-800 font-medium font-mono">{metrics.pendingCount} orders awaiting</span>
        </div>

        {/* Corporate Credit B2B Net-30 */}
        <div className="bg-purple-50/50 border border-purple-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-purple-900">CORPORATE CREDIT</span>
            <RiBankCardLine className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 truncate">
            <span className="text-[20px] font-bold text-purple-950 font-mono leading-none truncate">
              {formatCurrency(metrics.corporateCreditAmount)}
            </span>
          </div>
          <span className="text-[10px] text-purple-800 font-medium font-mono">{metrics.corporateCount} B2B Net-30</span>
        </div>

        {/* Settled & Captured */}
        <div className="bg-emerald-50/50 border border-emerald-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-900">SETTLED & CLEARED</span>
            <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 truncate">
            <span className="text-[20px] font-bold text-emerald-950 font-mono leading-none truncate">
              {formatCurrency(metrics.settledAmount)}
            </span>
          </div>
          <span className="text-[10px] text-emerald-800 font-medium font-mono">{metrics.settledCount} 100% Captured</span>
        </div>

        {/* Output GST (18%) */}
        <div className="bg-blue-50/50 border border-blue-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-blue-900">GST LIABILITY (18%)</span>
            <RiFileList3Line className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 truncate">
            <span className="text-[20px] font-bold text-blue-950 font-mono leading-none truncate">
              {formatCurrency(metrics.gstCollected)}
            </span>
          </div>
          <span className="text-[10px] text-blue-800 font-medium font-mono">GSTR-1 Output Tax</span>
        </div>

        {/* Collection Efficiency */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-400">COLLECTION YIELD</span>
            <RiFlashlightLine className="h-4 w-4 text-amber-300" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[20px] font-bold text-amber-300 font-mono leading-none">
              {metrics.collectionRate}%
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium font-mono">Target: 98%</span>
        </div>

        {/* Overdue / Recovery */}
        <div
          className={`border rounded-xl p-3.5 shadow-xs flex flex-col justify-between transition-colors ${
            metrics.overdueAmount > 0
              ? 'bg-rose-50/60 border-rose-300'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-mono uppercase font-bold ${
                metrics.overdueAmount > 0 ? 'text-rose-900' : 'text-slate-500'
              }`}
            >
              OVERDUE CREDIT
            </span>
            <RiAlertLine
              className={`h-4 w-4 ${metrics.overdueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}
            />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 truncate">
            <span
              className={`text-[20px] font-bold font-mono leading-none truncate ${
                metrics.overdueAmount > 0 ? 'text-rose-950' : 'text-slate-900'
              }`}
            >
              {formatCurrency(metrics.overdueAmount)}
            </span>
          </div>
          <span
            className={`text-[10px] font-medium font-mono ${
              metrics.overdueAmount > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'
            }`}
          >
            {metrics.overdueAmount > 0 ? `${metrics.overdueCount} Past Due` : 'Zero Overdue'}
          </span>
        </div>
      </div>
    </div>
  );
}
