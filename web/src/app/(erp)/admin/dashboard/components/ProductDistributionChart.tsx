'use client';

import React, { useState, useMemo } from 'react';
import {
  RiShoppingBag3Line,
  RiStackLine,
  RiPriceTag3Line,
  RiArrowRightLine,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import { DashboardOrderSummary } from './OrderVolumeRevenueChart';

interface ProductDistributionChartProps {
  orders: DashboardOrderSummary[];
}

type SortRankBy = 'orders' | 'units' | 'revenue';

export function ProductDistributionChart({ orders }: ProductDistributionChartProps) {
  const [rankBy, setRankBy] = useState<SortRankBy>('orders');

  const productStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        orderCount: number;
        totalUnits: number;
        revenue: number;
      }
    >();

    orders.forEach((o) => {
      const items = o.items || [];
      const orderAmount = Number(o.totalAmount) || 0;

      if (items.length === 0) {
        // Fallback for orders without explicit items array
        const key = 'Custom Commercial Print';
        const entry = map.get(key) || { name: key, orderCount: 0, totalUnits: 0, revenue: 0 };
        entry.orderCount += 1;
        entry.totalUnits += 100;
        entry.revenue += orderAmount;
        map.set(key, entry);
        return;
      }

      items.forEach((item) => {
        const key = item.productName || 'Print Product';
        const entry = map.get(key) || { name: key, orderCount: 0, totalUnits: 0, revenue: 0 };
        entry.orderCount += 1;
        entry.totalUnits += Number(item.quantity) || 100;
        entry.revenue += Number(item.totalPrice) || (orderAmount / items.length);
        map.set(key, entry);
      });
    });

    const list = Array.from(map.values());
    const totalOrderRuns = list.reduce((sum, p) => sum + p.orderCount, 0) || 1;
    const totalProductionUnits = list.reduce((sum, p) => sum + p.totalUnits, 0) || 1;
    const totalRevenue = list.reduce((sum, p) => sum + p.revenue, 0) || 1;

    list.sort((a, b) => {
      if (rankBy === 'orders') return b.orderCount - a.orderCount;
      if (rankBy === 'units') return b.totalUnits - a.totalUnits;
      return b.revenue - a.revenue;
    });

    return list.map((p) => ({
      ...p,
      orderPct: (p.orderCount / totalOrderRuns) * 100,
      unitsPct: (p.totalUnits / totalProductionUnits) * 100,
      revenuePct: (p.revenue / totalRevenue) * 100,
    }));
  }, [orders, rankBy]);

  const maxVal = useMemo(() => {
    if (productStats.length === 0) return 1;
    if (rankBy === 'orders') return Math.max(...productStats.map((p) => p.orderCount));
    if (rankBy === 'units') return Math.max(...productStats.map((p) => p.totalUnits));
    return Math.max(...productStats.map((p) => p.revenue));
  }, [productStats, rankBy]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <RiShoppingBag3Line className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[15px] sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Product Demand & Print Run Matrix</span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {productStats.length} SKUs Ordered
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Production run quantity and revenue contribution by product title.
            </p>
          </div>
        </div>

        {/* Sort Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRankBy('orders')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] ${
              rankBy === 'orders'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Orders
          </button>
          <button
            type="button"
            onClick={() => setRankBy('units')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] ${
              rankBy === 'units'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Units (Pcs)
          </button>
          <button
            type="button"
            onClick={() => setRankBy('revenue')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] ${
              rankBy === 'revenue'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Revenue (₹)
          </button>
        </div>
      </div>

      {/* Product Bars List */}
      <div className="space-y-3">
        {productStats.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
            <RiStackLine className="h-6 w-6 mx-auto mb-1 text-slate-300" />
            <span className="text-xs font-semibold text-slate-600 block">No Product Order History Yet</span>
          </div>
        ) : (
          productStats.map((prod, index) => {
            const currentVal =
              rankBy === 'orders'
                ? prod.orderCount
                : rankBy === 'units'
                ? prod.totalUnits
                : prod.revenue;
            const barWidth = Math.max(5, (currentVal / maxVal) * 100);

            return (
              <div
                key={prod.name}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-bold text-xs sm:text-[13px] text-slate-900">
                      {prod.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0 self-end sm:self-auto">
                    <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-[11px]">
                      {prod.orderCount} {prod.orderCount === 1 ? 'Order' : 'Orders'}
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-[11px]">
                      {prod.totalUnits.toLocaleString()} pcs
                    </span>
                    <span className="font-mono font-black text-slate-900 bg-[#FFED00]/30 border border-[#E3A008]/40 px-2 py-0.5 rounded text-[11px]">
                      {formatCurrency(prod.revenue)}
                    </span>
                  </div>
                </div>

                {/* Relative Bar */}
                <div className="w-full bg-slate-200/80 h-2 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all duration-300"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

