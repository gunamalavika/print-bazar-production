'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  RiPulseLine,
  RiUserFollowLine,
  RiPrinterLine,
  RiAlertLine,
  RiArrowRightLine,
  RiTimeLine,
  RiRefreshLine,
  RiSearchLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiFileTextLine,
  RiUserSharedLine,
  RiBuilding4Line,
  RiFlashlightLine,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { useSocket } from '@/lib/socket-context';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button, Badge, StatusBadge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';

export default function OperationsDashboardPage() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { isConnected, lastEvent, subscribeToOperations } = useSocket();
  const [metrics, setMetrics] = useState<any>(null);
  const [intakeOrders, setIntakeOrders] = useState<any[]>([]);
  const [unassignedDesign, setUnassignedDesign] = useState<any[]>([]);
  const [unassignedProduction, setUnassignedProduction] = useState<any[]>([]);
  const [blockedOrders, setBlockedOrders] = useState<any[]>([]);
  const [designers, setDesigners] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'intake' | 'design' | 'production' | 'blocked'>('intake');

  // Assignment Modal States
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [assignmentType, setAssignmentType] = useState<'DESIGN' | 'PRODUCTION' | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [assignmentReason, setAssignmentReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        dashboardData,
        intakeData,
        designData,
        prodData,
        blockedData,
        eligibleDesigners,
        eligibleOperators,
      ] = await Promise.all([
        api.getOperationsDashboard(),
        api.getOperationsIntakeOrders().catch(() => []),
        api.getOperationsUnassignedDesignOrders().catch(() => []),
        api.getOperationsUnassignedProductionOrders().catch(() => []),
        api.getOperationsBlockedOrders().catch(() => []),
        api.getEligibleDesigners().catch(() => []),
        api.getEligibleProductionOperators().catch(() => []),
      ]);

      const intakeList = Array.isArray(intakeData) ? intakeData : ((intakeData as any)?.data || (intakeData as any)?.orders || []);
      const designList = Array.isArray(designData) ? designData : ((designData as any)?.data || (designData as any)?.orders || []);
      const prodList = Array.isArray(prodData) ? prodData : ((prodData as any)?.data || (prodData as any)?.orders || []);
      const blockedList = Array.isArray(blockedData) ? blockedData : ((blockedData as any)?.data || (blockedData as any)?.orders || []);
      const designerList = Array.isArray(eligibleDesigners) ? eligibleDesigners : ((eligibleDesigners as any)?.data || []);
      const operatorList = Array.isArray(eligibleOperators) ? eligibleOperators : ((eligibleOperators as any)?.data || []);

      setMetrics(dashboardData);
      setIntakeOrders(intakeList);
      setUnassignedDesign(designList);
      setUnassignedProduction(prodList);
      setBlockedOrders(blockedList);
      setDesigners(designerList);
      setOperators(operatorList);
    } catch (err) {
      console.error('Failed to load operations dashboard telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    subscribeToOperations();
  }, [loadData, subscribeToOperations]);

  useEffect(() => {
    if (lastEvent) {
      loadData();
    }
  }, [lastEvent, loadData]);

  const handleOpenAssign = (order: any, type: 'DESIGN' | 'PRODUCTION') => {
    setSelectedOrder(order);
    setAssignmentType(type);
    setSelectedUserId('');
    setAssignmentReason('');
  };

  const handleExecuteAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedUserId || !assignmentType) return;

    setIsSubmitting(true);
    try {
      if (assignmentType === 'DESIGN') {
        await api.assignDesigner(selectedOrder.id, {
          designerId: selectedUserId,
          reason: assignmentReason || 'Assigned via Operations Command Dashboard',
        });
        setActionSuccessMessage(`Order #${selectedOrder.orderNumber} successfully assigned to Designer.`);
      } else {
        await api.assignProductionOperator(selectedOrder.id, {
          operatorId: selectedUserId,
          reason: assignmentReason || 'Assigned via Operations Command Dashboard',
        });
        setActionSuccessMessage(`Order #${selectedOrder.orderNumber} successfully assigned to Production Operator.`);
      }

      setSelectedOrder(null);
      setAssignmentType(null);
      await loadData();

      setTimeout(() => setActionSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Assignment failed:', err);
      alert(err.message || 'Failed to complete assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5 bg-white p-5 rounded-xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#FFED00] text-slate-950 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#E3A008]/40 shadow-xs">
              CENTRAL OPERATIONAL DISPATCH
            </span>
            <span className="text-[12px] font-mono text-slate-500 font-medium">
              PRINT BAZZAR 2.0 • OE SUITE
            </span>
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-black text-slate-900 tracking-tight leading-tight">
            Operational Command & Department Coordination
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Real-time shop-floor tracking, workload dispatch, cross-department bottleneck resolution, and SLA adherence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isConnected ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-mono font-bold text-emerald-700 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              LIVE SYNC
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-400"></span>
              CONNECTING
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            className="text-slate-700"
          >
            <RiRefreshLine className="h-4 w-4 mr-1.5" />
            <span>Refresh Telemetry</span>
          </Button>
          <Link href="/operations/orders">
            <Button variant="primary" size="sm">
              <span>All Operational Orders</span>
              <RiArrowRightLine className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-xs text-emerald-600 hover:text-emerald-900 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top 6 Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-mono uppercase font-semibold text-slate-500 block">TOTAL ACTIVE</span>
          <span className="text-[24px] font-black text-slate-900 mt-1 block tabular-nums">
            {metrics?.totalActiveOrders ?? (isLoading ? '...' : 0)}
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">Pipeline orders</span>
        </div>

        <div
          onClick={() => setActiveTab('design')}
          className={`border rounded-xl p-4 shadow-xs cursor-pointer transition-all ${
            metrics?.pendingDesignAssignment > 0
              ? 'bg-yellow-50/60 border-yellow-300 hover:border-yellow-400'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-[11px] font-mono uppercase font-semibold text-yellow-900 block flex items-center justify-between">
            <span>NEEDS DESIGNER</span>
            <RiUserFollowLine className="h-3.5 w-3.5 text-yellow-600" />
          </span>
          <span className="text-[24px] font-black text-yellow-950 mt-1 block tabular-nums">
            {metrics?.pendingDesignAssignment ?? (isLoading ? '...' : 0)}
          </span>
          <span className="text-[11px] text-yellow-700 font-medium mt-0.5 block">Unassigned design queue</span>
        </div>

        <div
          onClick={() => setActiveTab('production')}
          className={`border rounded-xl p-4 shadow-xs cursor-pointer transition-all ${
            metrics?.pendingProductionAssignment > 0
              ? 'bg-blue-50/60 border-blue-300 hover:border-blue-400'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-[11px] font-mono uppercase font-semibold text-blue-900 block flex items-center justify-between">
            <span>NEEDS OPERATOR</span>
            <RiPrinterLine className="h-3.5 w-3.5 text-blue-600" />
          </span>
          <span className="text-[24px] font-black text-blue-950 mt-1 block tabular-nums">
            {metrics?.pendingProductionAssignment ?? (isLoading ? '...' : 0)}
          </span>
          <span className="text-[11px] text-blue-700 font-medium mt-0.5 block">Unassigned press floor</span>
        </div>

        <div
          onClick={() => setActiveTab('blocked')}
          className={`border rounded-xl p-4 shadow-xs cursor-pointer transition-all ${
            metrics?.blockedOrders > 0
              ? 'bg-rose-50/60 border-rose-300 hover:border-rose-400'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-[11px] font-mono uppercase font-semibold text-rose-900 block flex items-center justify-between">
            <span>BLOCKED / HOLDS</span>
            <RiAlertLine className="h-3.5 w-3.5 text-rose-600" />
          </span>
          <span className="text-[24px] font-black text-rose-950 mt-1 block tabular-nums">
            {metrics?.blockedOrders ?? (isLoading ? '...' : 0)}
          </span>
          <span className="text-[11px] text-rose-700 font-medium mt-0.5 block">QC/Payment/File holds</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-mono uppercase font-semibold text-slate-500 block">IN PRODUCTION</span>
          <span className="text-[24px] font-black text-slate-900 mt-1 block tabular-nums">
            {metrics?.inProductionOrders ?? (isLoading ? '...' : 0)}
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">Active on machines</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-mono uppercase font-semibold text-slate-500 block">READY DISPATCH</span>
          <span className="text-[24px] font-black text-slate-900 mt-1 block tabular-nums">
            {metrics?.readyForDispatch ?? (isLoading ? '...' : 0)}
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">Awaiting courier pickup</span>
        </div>
      </div>

      {/* Actionable Dispatch Center Tabs */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('intake')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'intake'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 ring-1 ring-slate-900/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RiFlashlightLine className="h-4 w-4 text-emerald-600" />
            <span>New Order Intake</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 font-mono text-[10px] rounded-full font-bold">
              {intakeOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('design')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'design'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RiUserFollowLine className="h-4 w-4 text-yellow-600" />
            <span>Unassigned Design Queue</span>
            <span className="px-1.5 py-0.2 bg-yellow-100 text-yellow-900 font-mono text-[10px] rounded-full font-bold">
              {unassignedDesign.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('production')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'production'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RiPrinterLine className="h-4 w-4 text-blue-600" />
            <span>Unassigned Production Queue</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 font-mono text-[10px] rounded-full font-bold">
              {unassignedProduction.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'blocked'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RiAlertLine className="h-4 w-4 text-rose-600" />
            <span>Blocked Orders & Holds</span>
            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-900 font-mono text-[10px] rounded-full font-bold">
              {blockedOrders.length}
            </span>
          </button>
        </div>

        {/* Tab 0: New Order Intake Queue */}
        {activeTab === 'intake' && (
          <div className="p-5">
            {intakeOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RiCheckboxCircleLine className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-700">All incoming orders have been triaged and assigned.</p>
                <p className="text-slate-400 mt-0.5">New checkout transactions will appear here immediately in real-time.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] bg-slate-50/50">
                      <th className="py-3 px-3">ORDER #</th>
                      <th className="py-3 px-3">CUSTOMER</th>
                      <th className="py-3 px-3">ITEMS / PRODUCT</th>
                      <th className="py-3 px-3">PAYMENT STATUS</th>
                      <th className="py-3 px-3">PRIORITY</th>
                      <th className="py-3 px-3">ORDER DATE</th>
                      <th className="py-3 px-3 text-right">DISPATCH ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {intakeOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          <Link
                            href={`/operations/orders/${order.id}`}
                            className="hover:text-blue-600 hover:underline flex items-center gap-1.5"
                          >
                            <span>#{order.orderNumber}</span>
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{order.customer?.fullName || 'Walk-in Customer'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{order.customer?.phone || 'No phone'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-800 font-medium">
                            {order.items?.[0]?.productName || `${order.items?.length || 0} Item(s)`}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Qty: {order.items?.[0]?.quantity || 1} • {formatCurrency(Number(order.totalAmount || 0))}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              order.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : order.paymentStatus === 'PARTIALLY_PAID'
                                ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {order.paymentStatus || 'PENDING'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              order.priority === 'URGENT'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : order.priority === 'HIGH'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {order.priority || 'NORMAL'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => handleOpenAssign(order, 'DESIGN')}
                          >
                            <RiUserSharedLine className="h-3.5 w-3.5 mr-1" />
                            <span>Assign Designer</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => handleOpenAssign(order, 'PRODUCTION')}
                          >
                            <RiPrinterLine className="h-3.5 w-3.5 mr-1" />
                            <span>Assign Operator</span>
                          </Button>
                          <Link href={`/operations/orders/${order.id}`}>
                            <Button variant="outline" size="xs">
                              <span>Detail</span>
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Unassigned Design Queue */}
        {activeTab === 'design' && (
          <div className="p-5">
            {unassignedDesign.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RiCheckboxCircleLine className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-700">All design-required orders are currently assigned.</p>
                <p className="text-slate-400 mt-0.5">No pending prepress allocations in queue.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] bg-slate-50/50">
                      <th className="py-3 px-3">ORDER #</th>
                      <th className="py-3 px-3">CUSTOMER</th>
                      <th className="py-3 px-3">ITEMS / PRODUCT</th>
                      <th className="py-3 px-3">PRIORITY</th>
                      <th className="py-3 px-3">ORDER DATE</th>
                      <th className="py-3 px-3 text-right">DISPATCH ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unassignedDesign.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          <Link
                            href={`/operations/orders/${order.id}`}
                            className="hover:text-blue-600 hover:underline flex items-center gap-1.5"
                          >
                            <span>#{order.orderNumber}</span>
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{order.customer?.fullName || 'Walk-in Customer'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{order.customer?.phone || 'No phone'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-800 font-medium">
                            {order.items?.[0]?.productName || `${order.items?.length || 0} Item(s)`}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Qty: {order.items?.[0]?.quantity || 1} • {formatCurrency(Number(order.totalAmount || 0))}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              order.priority === 'URGENT'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : order.priority === 'HIGH'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {order.priority || 'NORMAL'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => handleOpenAssign(order, 'DESIGN')}
                          >
                            <RiUserSharedLine className="h-3.5 w-3.5 mr-1" />
                            <span>Assign Designer</span>
                          </Button>
                          <Link href={`/operations/orders/${order.id}`}>
                            <Button variant="outline" size="xs">
                              <span>Detail</span>
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Unassigned Production Queue */}
        {activeTab === 'production' && (
          <div className="p-5">
            {unassignedProduction.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RiCheckboxCircleLine className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-700">All approved production jobs are assigned to press operators.</p>
                <p className="text-slate-400 mt-0.5">Press floor allocation is up to date.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] bg-slate-50/50">
                      <th className="py-3 px-3">ORDER #</th>
                      <th className="py-3 px-3">CUSTOMER</th>
                      <th className="py-3 px-3">JOB CARD & MACHINE</th>
                      <th className="py-3 px-3">PRIORITY</th>
                      <th className="py-3 px-3">STAGE</th>
                      <th className="py-3 px-3 text-right">DISPATCH ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unassignedProduction.map((order) => {
                      const jc = order.jobCards?.[0];
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            <Link
                              href={`/operations/orders/${order.id}`}
                              className="hover:text-blue-600 hover:underline"
                            >
                              #{order.orderNumber}
                            </Link>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{order.customer?.fullName || 'Walk-in Customer'}</div>
                            <div className="text-[11px] text-slate-400">{order.items?.[0]?.productName}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono font-semibold text-slate-800">{jc?.jobNumber || 'Auto-Generating'}</div>
                            <div className="text-[11px] text-slate-500">{jc?.machine?.name || 'Unassigned Press'}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                order.priority === 'URGENT'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : order.priority === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {order.priority || 'NORMAL'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">
                            {order.status}
                          </td>
                          <td className="py-3 px-3 text-right space-x-2">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => handleOpenAssign(order, 'PRODUCTION')}
                            >
                              <RiUserSharedLine className="h-3.5 w-3.5 mr-1" />
                              <span>Assign Operator</span>
                            </Button>
                            <Link href={`/operations/orders/${order.id}`}>
                              <Button variant="outline" size="xs">
                                <span>Detail</span>
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Blocked Orders & Holds */}
        {activeTab === 'blocked' && (
          <div className="p-5">
            {blockedOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RiCheckboxCircleLine className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-700">Zero operational blocks detected.</p>
                <p className="text-slate-400 mt-0.5">All active pipeline orders are moving through department gates.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] bg-slate-50/50">
                      <th className="py-3 px-3">ORDER #</th>
                      <th className="py-3 px-3">CURRENT STAGE</th>
                      <th className="py-3 px-3">BLOCKER REASON</th>
                      <th className="py-3 px-3">RESOLVING DEPARTMENT</th>
                      <th className="py-3 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {blockedOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          <Link
                            href={`/operations/orders/${order.id}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            #{order.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                          {order.status}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
                            <RiAlertLine className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                            <span>{order.blockers?.[0]?.reason || 'Operational Hold'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-slate-100 text-slate-800 font-mono px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                            {order.blockers?.[0]?.department || 'OPERATIONS'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link href={`/operations/orders/${order.id}`}>
                            <Button variant="outline" size="xs">
                              <span>Inspect Block & Next Actions</span>
                              <RiArrowRightLine className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Staff Capacity & Workload Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Prepress Design Team */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RiUserFollowLine className="h-4 w-4 text-yellow-600" />
              <span>Prepress Design Roster & Workload</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">{designers.length} active staff</span>
          </div>
          <div className="space-y-2">
            {designers.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800">{d.fullName}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{d.email}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {d.activeLoad} active job(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Press Floor Operators */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RiPrinterLine className="h-4 w-4 text-blue-600" />
              <span>Production Operator Roster & Workload</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">{operators.length} active staff</span>
          </div>
          <div className="space-y-2">
            {operators.map((op) => (
              <div
                key={op.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800">{op.fullName}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{op.email}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {op.activeLoad} active job(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {selectedOrder && assignmentType && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => {
            setSelectedOrder(null);
            setAssignmentType(null);
          }}
          title={
            assignmentType === 'DESIGN'
              ? `Assign Designer to Order #${selectedOrder.orderNumber}`
              : `Assign Production Operator to Order #${selectedOrder.orderNumber}`
          }
          subtitle={`Customer: ${selectedOrder.customer?.fullName || 'Direct'} • Product: ${selectedOrder.items?.[0]?.productName || 'Print Job'}`}
          maxWidth="md"
        >
          <form onSubmit={handleExecuteAssignment} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                {assignmentType === 'DESIGN' ? 'Select Prepress Designer' : 'Select Production Operator'} *
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
              >
                <option value="">-- Choose Staff Member --</option>
                {(assignmentType === 'DESIGN' ? designers : operators).map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.fullName} ({staff.activeLoad} active jobs)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Assignment Note / Operational Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={assignmentReason}
                onChange={(e) => setAssignmentReason(e.target.value)}
                placeholder="e.g. Priority client requirement, assigned for Indigo 12000 setup..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOrder(null);
                  setAssignmentType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                disabled={!selectedUserId}
              >
                Confirm Assignment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
