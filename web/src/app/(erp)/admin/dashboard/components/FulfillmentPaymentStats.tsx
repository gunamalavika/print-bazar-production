'use client';

import React, { useMemo } from 'react';
import {
  RiTruckLine,
  RiStore2Line,
  RiBankCardLine,
  RiShieldCheckLine,
  RiCheckboxCircleFill,
  RiTimeLine,
  RiSpeedUpLine,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import { DashboardOrderSummary } from './OrderVolumeRevenueChart';

interface FulfillmentPaymentStatsProps {
  orders: DashboardOrderSummary[];
}

export function FulfillmentPaymentStats({ orders }: FulfillmentPaymentStatsProps) {
  const stats = useMemo(() => {
    const total = orders.length || 1;

    // Delivery method breakdown
    const courierCount = orders.filter((o) => o.deliveryMethod === 'COURIER').length;
    const pickupCount = orders.filter((o) => o.deliveryMethod === 'STORE_PICKUP').length;
    const otherCount = total - courierCount - pickupCount;

    // Payment status breakdown
    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
    const pendingOrders = orders.filter((o) => o.paymentStatus !== 'PAID');

    const paidRevenue = paidOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
    const pendingRevenue = pendingOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);

    // Priority breakdown
    const urgentCount = orders.filter((o) => o.priority === 'URGENT').length;
    const highCount = orders.filter((o) => o.priority === 'HIGH').length;
    const normalCount = orders.filter((o) => !o.priority || o.priority === 'NORMAL' || o.priority === 'LOW').length;

    return {
      total,
      courierCount,
      courierPct: (courierCount / total) * 100,
      pickupCount,
      pickupPct: (pickupCount / total) * 100,
      otherCount,
      paidCount: paidOrders.length,
      paidPct: (paidOrders.length / total) * 100,
      paidRevenue,
      pendingCount: pendingOrders.length,
      pendingPct: (pendingOrders.length / total) * 100,
      pendingRevenue,
      urgentCount,
      highCount,
      normalCount,
    };
  }, [orders]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
      {/* 1. Payment Settlement Health */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <RiBankCardLine className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] sm:text-sm font-bold text-slate-900 tracking-tight">
                Payment Settlement & Conversion
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Receivables clearance status
              </span>
            </div>
          </div>

          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            {stats.paidPct.toFixed(0)}% Cleared
          </span>
        </div>

        {/* Dual Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${stats.paidPct}%` }}
          />
          <div
            className="bg-amber-400 h-full transition-all duration-300"
            style={{ width: `${stats.pendingPct}%` }}
          />
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Paid */}
          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold">
              <RiCheckboxCircleFill className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Paid In Full</span>
            </div>
            <div className="font-mono text-base font-bold text-slate-900 mt-1 tabular-nums">
              {stats.paidCount} Orders
            </div>
            <div className="font-mono text-[11px] text-emerald-700 font-bold mt-0.5">
              {formatCurrency(stats.paidRevenue)}
            </div>
          </div>

          {/* Pending / COD */}
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-1.5 text-amber-900 text-[11px] font-bold">
              <RiTimeLine className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Pending / COD</span>
            </div>
            <div className="font-mono text-base font-bold text-slate-900 mt-1 tabular-nums">
              {stats.pendingCount} Orders
            </div>
            <div className="font-mono text-[11px] text-amber-800 font-bold mt-0.5">
              {formatCurrency(stats.pendingRevenue)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Delivery Channels & Priority Velocity */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <RiTruckLine className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] sm:text-sm font-bold text-slate-900 tracking-tight">
                Fulfillment Channels & Velocity
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Logistics routing & Priority mix
              </span>
            </div>
          </div>

          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
            {stats.total} Total
          </span>
        </div>

        {/* Dual Progress Bar for Logistics */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${stats.courierPct}%` }}
          />
          <div
            className="bg-purple-600 h-full transition-all duration-300"
            style={{ width: `${stats.pickupPct}%` }}
          />
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Courier Surface / Express */}
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-1.5 text-blue-800 text-[11px] font-bold">
              <RiTruckLine className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>Courier Delivery</span>
            </div>
            <div className="font-mono text-base font-bold text-slate-900 mt-1 tabular-nums">
              {stats.courierCount} Orders
            </div>
            <div className="font-mono text-[11px] text-blue-700 font-bold mt-0.5">
              {stats.courierPct.toFixed(0)}% of orders
            </div>
          </div>

          {/* Plant Counter / Walk-in */}
          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
            <div className="flex items-center gap-1.5 text-purple-800 text-[11px] font-bold">
              <RiStore2Line className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span>Store Pickup / Walk-in</span>
            </div>
            <div className="font-mono text-base font-bold text-slate-900 mt-1 tabular-nums">
              {stats.pickupCount} Orders
            </div>
            <div className="font-mono text-[11px] text-purple-700 font-bold mt-0.5">
              {stats.pickupPct.toFixed(0)}% of orders
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

