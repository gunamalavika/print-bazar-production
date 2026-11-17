'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Package,
  Layers,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { useSocket } from '@/lib/socket-context';

import {
  OrderVolumeRevenueChart,
  DashboardOrderSummary,
} from './components/OrderVolumeRevenueChart';
import { OrderPipelineStageChart } from './components/OrderPipelineStageChart';
import { ProductDistributionChart } from './components/ProductDistributionChart';
import { FulfillmentPaymentStats } from './components/FulfillmentPaymentStats';
import { RecentOrdersTable } from './components/RecentOrdersTable';

interface DashboardMetricsState {
  ordersTodayCount: number;
  ordersTodayVolume: number;
  totalOrdersCount: number;
  totalSystemVolume: number;
  activeProductionCount: number;
  printingCount: number;
  finishingCount: number;
  slaRiskCount: number;
  qcRejectionsCount: number;
  readyToDispatchCount: number;
}

export default function AdminDashboardPage() {
  const { isConnected, lastEvent, subscribeToOperations } = useSocket();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [orders, setOrders] = useState<DashboardOrderSummary[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});

  const [data, setData] = useState<DashboardMetricsState>({
    ordersTodayCount: 0,
    ordersTodayVolume: 0,
    totalOrdersCount: 0,
    totalSystemVolume: 0,
    activeProductionCount: 0,
    printingCount: 0,
    finishingCount: 0,
    slaRiskCount: 0,
    qcRejectionsCount: 0,
    readyToDispatchCount: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [oeMetrics, boardData, ordersData] = await Promise.allSettled([
        api.getOperationsDashboard(),
        api.getProductionBoard(),
        api.getOrders({ limit: 100 }),
      ]);

      const oe = oeMetrics.status === 'fulfilled' ? oeMetrics.value : null;
      const board = boardData.status === 'fulfilled' ? boardData.value : null;
      const ordersRes = ordersData.status === 'fulfilled' ? ordersData.value : null;

      // 1. Process orders list
      const ordersList: DashboardOrderSummary[] = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
      setOrders(ordersList);

      if (oe?.statusBreakdown) {
        setStatusBreakdown(oe.statusBreakdown);
      }

      // 2. Calculate orders today & today's gross revenue
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayOrders = ordersList.filter((o) => new Date(o.createdAt) >= startOfToday);
      const ordersTodayCount = todayOrders.length;
      const ordersTodayVolume = todayOrders.reduce(
        (acc: number, o) => acc + (Number(o.totalAmount) || 0),
        0
      );

      const totalOrdersCount = ordersRes?.meta?.total ?? ordersList.length;
      const totalSystemVolume = ordersList.reduce(
        (acc: number, o) => acc + (Number(o.totalAmount) || 0),
        0
      );

      // 3. Active Production & Operations Metrics
      const printingCount = board?.metrics?.printing ?? oe?.statusBreakdown?.PRINTING ?? 0;
      const finishingCount = board?.metrics?.finishing ?? oe?.statusBreakdown?.FINISHING ?? 0;
      const activeProductionCount =
        (oe?.productionPending ?? 0) > 0
          ? oe.productionPending
          : board?.metrics?.activeJobs ?? printingCount + finishingCount;

      const slaRiskCount = oe?.atRiskOverdue ?? 0;
      const qcRejectionsCount = oe?.qcPending ?? board?.metrics?.finalQc ?? 0;
      const readyToDispatchCount = oe?.dispatchReady ?? board?.metrics?.readyForDispatch ?? 0;

      setData({
        ordersTodayCount,
        ordersTodayVolume,
        totalOrdersCount,
        totalSystemVolume,
        activeProductionCount,
        printingCount,
        finishingCount,
        slaRiskCount,
        qcRejectionsCount,
        readyToDispatchCount,
      });
    } catch (err) {
      console.error('Failed to load dynamic admin dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    subscribeToOperations();
  }, [fetchDashboardData, subscribeToOperations]);

  useEffect(() => {
    if (lastEvent) {
      fetchDashboardData();
    }
  }, [lastEvent, fetchDashboardData]);

  // Executive summary derived statistics
  const avgOrderValue = useMemo(() => {
    if (!orders || orders.length === 0) return 0;
    const sum = orders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
    return sum / orders.length;
  }, [orders]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 px-2 sm:px-4 lg:px-6 pb-16">
      {/* 1. ERP Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 border-b border-slate-200/90 pb-4 sm:pb-5 bg-white p-4 sm:p-5 rounded-2xl border shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 flex-wrap">
            <span className="bg-[#FFED00] text-slate-950 text-[9.5px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#E3A008]/40 shadow-xs">
              EXECUTIVE TELEMETRY
            </span>
            <span className="text-[11px] sm:text-[12px] font-mono text-slate-500 font-medium">
              SHOP-FLOOR OPERATING SYSTEM
            </span>
            {isConnected && (
              <span className="inline-flex items-center gap-1 text-[9.5px] sm:text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <h1 className="text-[20px] xs:text-[22px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-tight">
            Executive Operations & Plant Telemetry
          </h1>
          <p className="text-[12.5px] sm:text-[14px] text-slate-500 mt-1 leading-normal line-clamp-2 sm:line-clamp-none">
            Real-time manufacturing indicators, production throughput, SLA deadlines, and order analytics.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto mt-1 sm:mt-0">
          <Button
            variant="outline"
            size="md"
            onClick={() => fetchDashboardData()}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 h-9 sm:h-10 px-3 text-xs sm:text-[13px] font-semibold shrink-0 cursor-pointer"
            title="Refresh plant telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin text-slate-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </Button>

          <Link href="/sales/orders" className="flex-1 sm:flex-initial">
            <Button variant="primary" size="md" className="w-full justify-center h-9 sm:h-10 px-3.5 text-xs sm:text-[13px] font-bold cursor-pointer">
              <span>Master Orders Stream</span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Top 5 Manufacturing Health Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Orders Today */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-card">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase font-semibold text-slate-500 block truncate">
            ORDERS TODAY
          </span>
          <span className="text-[22px] sm:text-[28px] font-bold text-slate-900 mt-1 block tabular-nums leading-tight font-mono">
            {isLoading ? '—' : data.ordersTodayCount}
          </span>
          <span className="text-[10.5px] sm:text-[11px] text-slate-500 font-mono mt-0.5 block truncate">
            {isLoading
              ? 'Loading revenue...'
              : data.ordersTodayCount > 0
                ? `${formatCurrency(data.ordersTodayVolume)} Gross Volume`
                : `${data.totalOrdersCount} Total In System`}
          </span>
        </div>

        {/* Card 2: Active Production */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-card">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase font-semibold text-slate-500 block truncate">
            ACTIVE PRODUCTION
          </span>
          <span className="text-[22px] sm:text-[28px] font-bold text-slate-900 mt-1 block tabular-nums leading-tight font-mono">
            {isLoading ? '—' : data.activeProductionCount}
          </span>
          <span className="text-[10.5px] sm:text-[11px] text-slate-500 font-mono mt-0.5 block truncate">
            {isLoading
              ? 'Syncing shop floor...'
              : data.activeProductionCount > 0
                ? `${data.printingCount} Printing • ${data.finishingCount} Finishing`
                : 'All Queues Current'}
          </span>
        </div>

        {/* Card 3: SLA Risk (<12H) */}
        <div
          className={`rounded-2xl p-3.5 sm:p-4 shadow-card border ${
            data.slaRiskCount > 0
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <span
            className={`text-[10px] sm:text-[11px] font-mono uppercase block truncate ${
              data.slaRiskCount > 0 ? 'font-semibold text-amber-900' : 'font-semibold text-slate-500'
            }`}
          >
            SLA RISK (&lt;12H)
          </span>
          <span
            className={`text-[22px] sm:text-[28px] font-bold mt-1 block tabular-nums leading-tight font-mono ${
              data.slaRiskCount > 0 ? 'text-amber-950' : 'text-slate-900'
            }`}
          >
            {isLoading ? '—' : data.slaRiskCount}
          </span>
          <span
            className={`text-[10.5px] sm:text-[11px] font-medium mt-0.5 block truncate ${
              data.slaRiskCount > 0 ? 'text-amber-800' : 'text-slate-500'
            }`}
          >
            {isLoading ? 'Checking SLAs...' : data.slaRiskCount > 0 ? 'Approaching Deadline' : 'All Deliveries On Track'}
          </span>
        </div>

        {/* Card 4: QC Rejections / Pending Gates */}
        <div
          className={`rounded-2xl p-3.5 sm:p-4 shadow-card border ${
            data.qcRejectionsCount > 0
              ? 'bg-rose-50/70 border-rose-300'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <span
            className={`text-[10px] sm:text-[11px] font-mono uppercase block truncate ${
              data.qcRejectionsCount > 0 ? 'font-semibold text-rose-900' : 'font-semibold text-slate-500'
            }`}
          >
            QC GATES & HOLDS
          </span>
          <span
            className={`text-[22px] sm:text-[28px] font-bold mt-1 block tabular-nums leading-tight font-mono ${
              data.qcRejectionsCount > 0 ? 'text-rose-950' : 'text-slate-900'
            }`}
          >
            {isLoading ? '—' : data.qcRejectionsCount}
          </span>
          <span
            className={`text-[10.5px] sm:text-[11px] font-medium mt-0.5 block truncate ${
              data.qcRejectionsCount > 0 ? 'text-rose-700' : 'text-slate-500'
            }`}
          >
            {isLoading ? 'Auditing quality...' : data.qcRejectionsCount > 0 ? 'Pending Final Sign-Off' : 'No Active Defect'}
          </span>
        </div>

        {/* Card 5: Ready to Dispatch */}
        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-card flex sm:block items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-mono uppercase font-semibold text-slate-500 block">
              READY TO DISPATCH
            </span>
            <span className="text-[10.5px] sm:text-[11px] text-slate-500 font-mono mt-0.5 block">
              {isLoading
                ? 'Checking manifests...'
                : data.readyToDispatchCount > 0
                  ? `${data.readyToDispatchCount} Manifests Prepared`
                  : 'Awaiting Pack Station'}
            </span>
          </div>
          <span className="text-[22px] sm:text-[28px] font-bold text-slate-900 mt-0 sm:mt-1 block tabular-nums leading-tight font-mono">
            {isLoading ? '—' : data.readyToDispatchCount}
          </span>
        </div>
      </div>

      {/* 3. Executive Overall Cumulative Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-[#FFED00]" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
              Cumulative System Gross Sales
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-[#FFED00]">
              {formatCurrency(data.totalSystemVolume)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
              Total Order Volume Captured
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
              {data.totalOrdersCount} Master Records
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
              Average Order Value (AOV)
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-300">
              {formatCurrency(avgOrderValue)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Chart Section 1: Order Inflow & Gross Revenue Trajectory */}
      <OrderVolumeRevenueChart orders={orders} isLoading={isLoading} />

      {/* 5. Chart Section 2: Manufacturing Pipeline Stage Breakdown */}
      <OrderPipelineStageChart orders={orders} statusBreakdown={statusBreakdown} />

      {/* 6. Chart Section 3: Dual Columns - Product Matrix & Logistics/Settlement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Product Demand Matrix (7 cols) */}
        <div className="lg:col-span-7">
          <ProductDistributionChart orders={orders} />
        </div>

        {/* Fulfillment & Settlement Stats (5 cols) */}
        <div className="lg:col-span-5">
          <FulfillmentPaymentStats orders={orders} />
        </div>
      </div>

      {/* 7. Live Recent Orders Table Stream */}
      <RecentOrdersTable orders={orders} />
    </div>
  );
}
