'use client';

import React from 'react';
import {
  RiSearch2Line,
  RiFilter3Line,
  RiBankCardLine,
  RiFlagLine,
  RiTimeLine,
  RiRefreshLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

interface FinanceFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  paymentStatus: string;
  onPaymentStatusChange: (val: string) => void;
  method: string;
  onMethodChange: (val: string) => void;
  priority: string;
  onPriorityChange: (val: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export function FinanceFilters({
  search,
  onSearchChange,
  paymentStatus,
  onPaymentStatusChange,
  method,
  onMethodChange,
  priority,
  onPriorityChange,
  onReset,
  hasActiveFilters,
}: FinanceFiltersProps) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Order (PB-2026-0001), Invoice #, Txn ID, Customer, Company..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 transition font-sans"
          />
          <RiSearch2Line className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-mono"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Payment Status Filter */}
          <div className="relative min-w-[140px]">
            <select
              value={paymentStatus}
              onChange={(e) => onPaymentStatusChange(e.target.value)}
              className="w-full h-9 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium appearance-none focus:outline-none focus:border-slate-900 focus:bg-white transition"
            >
              <option value="ALL">All Payment States</option>
              <option value="PAID">Paid / Cleared</option>
              <option value="PENDING">Payment Pending</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
            </select>
            <RiBankCardLine className="h-3.5 w-3.5 text-blue-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Payment Method Filter */}
          <div className="relative min-w-[150px]">
            <select
              value={method}
              onChange={(e) => onMethodChange(e.target.value)}
              className="w-full h-9 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium appearance-none focus:outline-none focus:border-slate-900 focus:bg-white transition"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="RAZORPAY">Razorpay / UPI</option>
              <option value="BANK_TRANSFER_NEFT">NEFT / RTGS</option>
              <option value="CORPORATE_CREDIT">Corporate Credit Net-30</option>
              <option value="CASH_ON_COUNTER">Cash on Counter</option>
            </select>
            <RiFilter3Line className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Priority Filter */}
          <div className="relative min-w-[120px]">
            <select
              value={priority}
              onChange={(e) => onPriorityChange(e.target.value)}
              className="w-full h-9 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium appearance-none focus:outline-none focus:border-slate-900 focus:bg-white transition"
            >
              <option value="ALL">All Priorities</option>
              <option value="NORMAL">Normal Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent SLA</option>
              <option value="LOW">Low Priority</option>
            </select>
            <RiFlagLine className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-9 text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-200"
            >
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
