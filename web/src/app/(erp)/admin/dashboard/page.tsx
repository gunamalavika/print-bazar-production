'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  ShieldCheck,
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
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { useSocket } from '@/lib/socket-context';

interface DashboardMetricsState {
  ordersTodayCount: number;
  ordersTodayVolume: number;
  totalOrdersCount: number;
  activeProductionCount: number;
  printingCount: number;
  finishingCount: number;
  slaRiskCount: number;
  qcRejectionsCount: number;
  readyToDispatchCount: number;
  blockedOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    productName: string;
    quantity: number;
    reason: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    slaWarning?: string;
  }>;
  machines: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    hourlyCapacity: number;
    currentJob?: {
      jobNumber: string;
      productName: string;
      status: string;
    } | null;
  }>;
}

export default function AdminDashboardPage() {
  const { isConnected, lastEvent, subscribeToOperations } = useSocket();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<DashboardMetricsState>({
    ordersTodayCount: 0,
    ordersTodayVolume: 0,
    totalOrdersCount: 0,
    activeProductionCount: 0,
    printingCount: 0,
    finishingCount: 0,
    slaRiskCount: 0,
    qcRejectionsCount: 0,
    readyToDispatchCount: 0,
    blockedOrders: [],
    machines: [],
  });

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [oeMetrics, blockedData, boardData, ordersData] = await Promise.allSettled([
        api.getOperationsDashboard(),
        api.getOperationsBlockedOrders(),
        api.getProductionBoard(),
        api.getOrders({ limit: 100 }),
      ]);

      const oe = oeMetrics.status === 'fulfilled' ? oeMetrics.value : null;
      const blocked = blockedData.status === 'fulfilled' ? blockedData.value : null;
      const board = boardData.status === 'fulfilled' ? boardData.value : null;
      const ordersRes = ordersData.status === 'fulfilled' ? ordersData.value : null;

      // 1. Calculate orders today & today's gross revenue
      const ordersList = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayOrders = ordersList.filter((o: any) => new Date(o.createdAt) >= startOfToday);
      const ordersTodayCount = todayOrders.length;
      const ordersTodayVolume = todayOrders.reduce(
        (acc: number, o: any) => acc + (Number(o.totalAmount) || 0),
        0
      );
      const totalOrdersCount = ordersRes?.meta?.total ?? ordersList.length;

      // 2. Active Production & Operations Metrics
      const printingCount = board?.metrics?.printing ?? oe?.statusBreakdown?.PRINTING ?? 0;
      const finishingCount = board?.metrics?.finishing ?? oe?.statusBreakdown?.FINISHING ?? 0;
      const activeProductionCount =
        (oe?.productionPending ?? 0) > 0
          ? oe.productionPending
          : board?.metrics?.activeJobs ?? printingCount + finishingCount;

      const slaRiskCount = oe?.atRiskOverdue ?? 0;
      const qcRejectionsCount = oe?.qcPending ?? board?.metrics?.finalQc ?? 0;
      const readyToDispatchCount = oe?.dispatchReady ?? board?.metrics?.readyForDispatch ?? 0;

      // 3. Blocked Orders / Exceptions
      const rawBlocked: any = blocked;
      const rawBlockedList: any[] = Array.isArray(rawBlocked)
        ? rawBlocked
        : Array.isArray(rawBlocked?.data)
          ? rawBlocked.data
          : [];

      const mappedBlocked = rawBlockedList.map((o: any) => {
        const firstItem = o.items?.[0];
        const prodName = firstItem?.product?.name || firstItem?.productName || 'Commercial Job';
        const qty = firstItem?.quantity || o.totalQuantity || 1;
        const custName = o.customer?.fullName || o.customer?.companyName || 'Corporate Client';
        const blockersText =
          Array.isArray(o.blockers) && o.blockers.length > 0
            ? o.blockers.join(', ')
            : o.holdReason || 'Awaiting quality clearance / material verification';

        return {
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: custName,
          productName: prodName,
          quantity: qty,
          reason: blockersText,
          severity: (o.slaStatus === 'BREACHED' ? 'CRITICAL' : 'WARNING') as 'CRITICAL' | 'WARNING',
          slaWarning: o.slaStatus === 'AT_RISK' ? 'SLA Alert: Approaching target cutoff' : undefined,
        };
      });

      // 4. Dynamic Work Center Status
      const rawMachines = Array.isArray(board?.availableMachines) ? board.availableMachines : [];

      const allCards: any[] = [];
      if (Array.isArray(board?.columns)) {
        for (const col of board.columns) {
          if (Array.isArray(col.cards)) {
            allCards.push(...col.cards);
          }
        }
      }

      const mappedMachines = rawMachines.map((m: any) => {
        const activeCard = allCards.find(
          (c: any) => c.machine?.id === m.id || c.machine?.code === m.code
        );

        return {
          id: m.id,
          name: m.name,
          code: m.code,
          type: m.type,
          hourlyCapacity: m.hourlyCapacity || 1000,
          currentJob: activeCard
            ? {
                jobNumber: activeCard.jobNumber || 'JC-ACTIVE',
                productName: activeCard.productName || 'Production Run',
                status: activeCard.status || 'RUNNING',
              }
            : null,
        };
      });

      setData({
        ordersTodayCount,
        ordersTodayVolume,
        totalOrdersCount,
        activeProductionCount,
        printingCount,
        finishingCount,
        slaRiskCount,
        qcRejectionsCount,
        readyToDispatchCount,
        blockedOrders: mappedBlocked,
        machines: mappedMachines,
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

  const runningMachinesCount = data.machines.filter((m) => !!m.currentJob).length;

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      {/* 1. ERP Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 border-b border-slate-200/90 pb-4 sm:pb-5 bg-white p-4 sm:p-5 rounded-xl border shadow-xs">
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
            Operational Exceptions & Plant Intelligence
          </h1>
          <p className="text-[12.5px] sm:text-[14px] text-slate-500 mt-1 leading-normal line-clamp-2 sm:line-clamp-none">
            Real-time machine queues, overdue production jobs, and quality gates requiring managerial sign-off.
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

      {/* 3. Top 5 Manufacturing Health Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Orders Today */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-card">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase font-semibold text-slate-500 block truncate">
            ORDERS TODAY
          </span>
          <span className="text-[22px] sm:text-[28px] font-bold text-slate-900 mt-1 block tabular-nums leading-tight">
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
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-card">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase font-semibold text-slate-500 block truncate">
            ACTIVE PRODUCTION
          </span>
          <span className="text-[22px] sm:text-[28px] font-bold text-slate-900 mt-1 block tabular-nums leading-tight">
            {isLoading ? '—' : data.activeProductionCount}
          </span>
          <span className="text-[10.5px] sm:text-[11px] text-slate-500 font-mono mt-0.5 block truncate">
            {isLoading
              ? 'Syncing shop floor...'
              : data.activeProductionCount > 0
                ? `${data.printingCount} Print • ${data.finishingCount} Finish`
                : 'All Queues Current'}
          </span>
        </div>

        {/* Card 3: SLA Risk (<12H) */}
        <div
          className={`rounded-xl p-3 sm:p-4 shadow-card border ${
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
            className={`text-[22px] sm:text-[28px] font-bold mt-1 block tabular-nums leading-tight ${
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
            {isLoading ? 'Checking SLAs...' : data.slaRiskCount > 0 ? 'Approaching Cutoff' : 'Deliveries On Track'}
          </span>
        </div>

        {/* Card 4: QC Rejections / Pending Gates */}
        <div
          className={`rounded-xl p-3 sm:p-4 shadow-card border ${
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
            className={`text-[22px] sm:text-[28px] font-bold mt-1 block tabular-nums leading-tight ${
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
            {isLoading ? 'Auditing quality...' : data.qcRejectionsCount > 0 ? 'Sign-Off Needed' : 'No Active Defect'}
          </span>
        </div>

        {/* Card 5: Ready to Dispatch (Spans 2 columns on mobile for perfect balanced layout) */}
        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-card flex sm:block items-center justify-between">
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
          <span className="text-[22px] sm:text-[28px] font-bold text-slate-900 mt-0 sm:mt-1 block tabular-nums leading-tight">
            {isLoading ? '—' : data.readyToDispatchCount}
          </span>
        </div>
      </div>

      {/* 4. Exception Action Centers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Urgent Attention / On Hold Jobs */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-card space-y-3.5 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
            <h3 className="text-[14.5px] sm:text-[16px] font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-slate-800 shrink-0" />
              <span>Production Holds & Material Exceptions</span>
            </h3>
            {data.blockedOrders.length > 0 ? (
              <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                ACTION REQUIRED ({data.blockedOrders.length})
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                ALL QUEUES CLEAR
              </span>
            )}
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-8 text-center text-slate-400 text-[13px] flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />
                <span>Auditing live production holds...</span>
              </div>
            ) : data.blockedOrders.length > 0 ? (
              data.blockedOrders.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 sm:p-3.5 flex items-center justify-between transition-colors ${
                    item.severity === 'CRITICAL'
                      ? 'border-rose-200 bg-rose-50/30'
                      : 'border-amber-200 bg-amber-50/30'
                  }`}
                >
                  <div className="pr-2 sm:pr-3 min-w-0">
                    <span className="font-mono font-bold text-slate-900 text-xs sm:text-[13px] block truncate">
                      {item.orderNumber} • {item.productName}
                    </span>
                    <span className="text-xs sm:text-[13px] text-slate-700 font-medium block truncate">
                      {item.customerName} ({item.quantity} units)
                    </span>
                    <p
                      className={`text-[10.5px] sm:text-[11px] font-mono font-medium mt-0.5 truncate ${
                        item.severity === 'CRITICAL' ? 'text-rose-700' : 'text-amber-800'
                      }`}
                    >
                      Reason: {item.reason}
                    </p>
                    {item.slaWarning && (
                      <p className="text-[10px] font-mono text-amber-700 mt-0.5">
                        ⚠️ {item.slaWarning}
                      </p>
                    )}
                  </div>

                  <Link href={`/operations/orders/${item.id}`} className="shrink-0">
                    <Button variant={item.severity === 'CRITICAL' ? 'outline' : 'primary'} size="xs" className="text-xs font-semibold">
                      Inspect
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/20 p-5 sm:p-6 text-center">
                <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-[13.5px] sm:text-[14px] font-bold text-slate-900">Zero Active Production Holds</h4>
                <p className="text-[11.5px] sm:text-[12px] text-slate-500 max-w-md mx-auto mt-1 leading-normal">
                  All press jobs and finishing tickets are progressing normally across digital offset, wide-format, and packaging work centers with no material bottlenecks.
                </p>
                <div className="mt-3">
                  <Link href="/operations">
                    <Button variant="secondary" size="xs" className="text-xs font-semibold">
                      Open Operations Hub
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Machine Work Center Utilization */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-card space-y-3.5 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
            <h3 className="text-[14.5px] sm:text-[16px] font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-slate-800 shrink-0" />
              <span>Shop-Floor Work Center Status</span>
            </h3>
            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              {data.machines.length > 0
                ? runningMachinesCount > 0
                  ? `${runningMachinesCount} / ${data.machines.length} RUNNING`
                  : `${data.machines.length} ONLINE`
                : 'SYNCHRONIZING'}
            </span>
          </div>

          <div className="space-y-2.5 sm:space-y-3 text-[13px]">
            {isLoading ? (
              <div className="py-8 text-center text-slate-400 text-[13px] flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />
                <span>Polling press work centers...</span>
              </div>
            ) : data.machines.length > 0 ? (
              data.machines.map((machine) => (
                <div
                  key={machine.id}
                  className="rounded-lg border border-slate-200 p-3 flex items-center justify-between bg-slate-50/60"
                >
                  <div>
                    <span className="font-medium text-slate-900 block text-[13px]">{machine.name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {machine.currentJob
                        ? `Job ${machine.currentJob.jobNumber} (${machine.currentJob.productName})`
                        : `Capacity: ${machine.hourlyCapacity.toLocaleString('en-IN')} units/hr • Standby`}
                    </span>
                  </div>
                  {machine.currentJob ? (
                    <span className="bg-slate-900 text-[#FFED00] px-2 py-0.5 text-[10px] font-mono font-semibold rounded">
                      {machine.currentJob.status}
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-mono font-semibold rounded border border-emerald-200">
                      ONLINE
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-[13px]">
                No machine work centers configured.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
