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
  RiPaletteLine,
  RiUserSettingsLine,
  RiFilter3Line,
  RiShieldCheckLine,
  RiEyeLine,
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
  const [activePipelineOrders, setActivePipelineOrders] = useState<any[]>([]);
  const [intakeOrders, setIntakeOrders] = useState<any[]>([]);
  const [unassignedDesign, setUnassignedDesign] = useState<any[]>([]);
  const [unassignedProduction, setUnassignedProduction] = useState<any[]>([]);
  const [blockedOrders, setBlockedOrders] = useState<any[]>([]);
  const [designers, setDesigners] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'active' | 'intake' | 'design' | 'production' | 'blocked'>('active');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');

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
        ordersData,
      ] = await Promise.all([
        api.getOperationsDashboard(),
        api.getOperationsIntakeOrders().catch(() => []),
        api.getOperationsUnassignedDesignOrders().catch(() => []),
        api.getOperationsUnassignedProductionOrders().catch(() => []),
        api.getOperationsBlockedOrders().catch(() => []),
        api.getEligibleDesigners().catch(() => []),
        api.getEligibleProductionOperators().catch(() => []),
        api.getOperationsOrders({ limit: 100 }).catch(() => ({ orders: [] })),
      ]);

      const intakeList = Array.isArray(intakeData) ? intakeData : ((intakeData as any)?.data || (intakeData as any)?.orders || []);
      const designList = Array.isArray(designData) ? designData : ((designData as any)?.data || (designData as any)?.orders || []);
      const prodList = Array.isArray(prodData) ? prodData : ((prodData as any)?.data || (prodData as any)?.orders || []);
      const blockedList = Array.isArray(blockedData) ? blockedData : ((blockedData as any)?.data || (blockedData as any)?.orders || []);
      const designerList = Array.isArray(eligibleDesigners) ? eligibleDesigners : ((eligibleDesigners as any)?.data || []);
      const operatorList = Array.isArray(eligibleOperators) ? eligibleOperators : ((eligibleOperators as any)?.data || []);
      const pipelineList = Array.isArray(ordersData?.orders) ? ordersData.orders : Array.isArray(ordersData) ? ordersData : [];

      setMetrics(dashboardData);
      setActivePipelineOrders(pipelineList);
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

  // Helper to format Operator Working Status Badge
  const getOperatorStatusBadge = (order: any) => {
    const operator = order.assignedOperator || order.productionAssignment?.assignedUser;
    const status = String(order.status || '').toUpperCase();

    if (!operator) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span>UNASSIGNED</span>
        </span>
      );
    }

    if (status === 'PRINTING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-950 border border-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>PRINTING IN PROGRESS</span>
        </span>
      );
    }

    if (status === 'FINISHING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-950 border border-purple-300">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
          <span>POST-PRESS FINISHING</span>
        </span>
      );
    }

    if (status === 'QUALITY_CHECK') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-100 text-cyan-950 border border-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
          <span>FINAL QC GATE</span>
        </span>
      );
    }

    if (status === 'PACKING' || status === 'READY_FOR_DISPATCH' || status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-950 border border-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>PRESS RUN COMPLETED</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-950 border border-blue-300">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span>OPERATOR ACTIVE</span>
      </span>
    );
  };

  // Helper to format Designer Status Badge
  const getDesignerStatusBadge = (order: any) => {
    const designer = order.assignedDesigner || order.designAssignment?.assignedUser;
    const status = String(order.status || '').toUpperCase();

    if (!designer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span>NO DESIGNER</span>
        </span>
      );
    }

    if (status === 'CUSTOMER_APPROVAL_REQUIRED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-900 border border-purple-300">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          <span>PROOF REVIEW</span>
        </span>
      );
    }

    if (status === 'ARTWORK_APPROVED' || status === 'PRODUCTION_QUEUE' || status === 'PRINTING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>PROOF APPROVED</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>DESIGN IN PROGRESS</span>
      </span>
    );
  };

  // Helper to format Order Current Stage / State Badge & Progress Step
  const getOrderStageBadge = (order: any) => {
    const rawStatus = String(order.status || '').toUpperCase();

    let label = 'Processing';
    let step = '1/5 Intake';
    let badgeClass = 'bg-slate-100 text-slate-800 border-slate-300';
    let dotClass = 'bg-slate-400';
    let isPulse = false;

    if (rawStatus === 'INTAKE_PENDING' || rawStatus === 'PENDING' || rawStatus === 'ORDER_PLACED') {
      label = 'Order Intake';
      step = '1/5 Intake';
      badgeClass = 'bg-emerald-50 text-emerald-900 border-emerald-300';
      dotClass = 'bg-emerald-500';
      isPulse = true;
    } else if (rawStatus === 'DESIGN_PENDING' || rawStatus === 'DESIGN_REQUIRED' || rawStatus === 'DESIGN_IN_PROGRESS') {
      label = 'Prepress Designing';
      step = '2/5 Prepress';
      badgeClass = 'bg-amber-50 text-amber-950 border-amber-300';
      dotClass = 'bg-amber-500';
      isPulse = true;
    } else if (rawStatus === 'CUSTOMER_APPROVAL_REQUIRED' || rawStatus === 'ARTWORK_REVIEW') {
      label = 'Proof Review & Sign-Off';
      step = '2/5 Prepress';
      badgeClass = 'bg-purple-50 text-purple-950 border-purple-300';
      dotClass = 'bg-purple-500';
      isPulse = true;
    } else if (rawStatus === 'ARTWORK_APPROVED') {
      label = 'Artwork Ready for Press';
      step = '3/5 Queue';
      badgeClass = 'bg-emerald-50 text-emerald-950 border-emerald-300';
      dotClass = 'bg-emerald-500';
    } else if (rawStatus === 'PRODUCTION_QUEUE') {
      label = 'Production Floor Queue';
      step = '3/5 Floor';
      badgeClass = 'bg-blue-50 text-blue-950 border-blue-300';
      dotClass = 'bg-blue-500';
      isPulse = true;
    } else if (rawStatus === 'PRINTING') {
      label = 'Press Floor Printing';
      step = '3/5 Floor';
      badgeClass = 'bg-amber-100 text-amber-950 border-amber-400';
      dotClass = 'bg-amber-600';
      isPulse = true;
    } else if (rawStatus === 'FINISHING') {
      label = 'Post-Press Finishing';
      step = '3/5 Finishing';
      badgeClass = 'bg-purple-50 text-purple-950 border-purple-300';
      dotClass = 'bg-purple-600';
      isPulse = true;
    } else if (rawStatus === 'QUALITY_CHECK') {
      label = 'Final QC Inspection';
      step = '4/5 Quality Gate';
      badgeClass = 'bg-cyan-50 text-cyan-950 border-cyan-300';
      dotClass = 'bg-cyan-600';
      isPulse = true;
    } else if (rawStatus === 'PACKING') {
      label = 'Packing Station';
      step = '5/5 Packing';
      badgeClass = 'bg-emerald-50 text-emerald-950 border-emerald-300';
      dotClass = 'bg-emerald-600';
    } else if (rawStatus === 'READY_FOR_DISPATCH') {
      label = 'Ready for Courier Pickup';
      step = '5/5 Dispatch';
      badgeClass = 'bg-emerald-100 text-emerald-950 border-emerald-400';
      dotClass = 'bg-emerald-600';
    } else if (rawStatus === 'OUT_FOR_DELIVERY') {
      label = 'Out for Delivery';
      step = 'In Transit';
      badgeClass = 'bg-teal-50 text-teal-950 border-teal-300';
      dotClass = 'bg-teal-600';
      isPulse = true;
    } else if (rawStatus === 'DELIVERED') {
      label = 'Delivered & Settled';
      step = 'Completed';
      badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
      dotClass = 'bg-emerald-500';
    } else if (rawStatus === 'ON_HOLD' || rawStatus === 'BLOCKED') {
      label = 'Operational Block / Hold';
      step = 'On Hold';
      badgeClass = 'bg-rose-50 text-rose-950 border-rose-300';
      dotClass = 'bg-rose-500';
      isPulse = true;
    } else if (rawStatus === 'CANCELLED') {
      label = 'Order Cancelled';
      step = 'Cancelled';
      badgeClass = 'bg-slate-100 text-slate-600 border-slate-300';
      dotClass = 'bg-slate-400';
    }

    return (
      <div className="space-y-1">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-mono font-bold uppercase border shadow-2xs whitespace-nowrap ${badgeClass}`}
        >
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${dotClass} ${
              isPulse ? 'animate-pulse' : ''
            }`}
          />
          <span>{label}</span>
        </span>
        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
          <span>Stage:</span>
          <strong className="text-slate-700">{step}</strong>
          <span>•</span>
          <span className="text-[9px] uppercase text-slate-400">[{rawStatus}]</span>
        </div>
      </div>
    );
  };

  // Filter Active Pipeline Orders
  const filteredActiveOrders = activePipelineOrders.filter((o) => {
    if (selectedOperatorFilter !== 'ALL') {
      const opId = o.assignedOperator?.id || o.productionAssignment?.assignedUser?.id;
      if (selectedOperatorFilter === 'UNASSIGNED') {
        if (opId) return false;
      } else if (opId !== selectedOperatorFilter) {
        return false;
      }
    }

    if (selectedStageFilter !== 'ALL') {
      if (o.status !== selectedStageFilter) return false;
    }

    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase();
      const matchOrder = o.orderNumber?.toLowerCase().includes(q);
      const matchCustomer = o.customer?.fullName?.toLowerCase().includes(q) || o.customer?.companyName?.toLowerCase().includes(q);
      const matchProduct = o.items?.[0]?.productName?.toLowerCase().includes(q);
      const matchOp = (o.assignedOperator?.fullName || o.productionAssignment?.assignedUser?.fullName)?.toLowerCase().includes(q);
      const matchDes = (o.assignedDesigner?.fullName || o.designAssignment?.assignedUser?.fullName)?.toLowerCase().includes(q);
      if (!matchOrder && !matchCustomer && !matchProduct && !matchOp && !matchDes) return false;
    }

    return true;
  });

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

        <div className="flex items-center flex-wrap gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
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
            className="text-slate-700 flex-1 sm:flex-initial justify-center"
          >
            <RiRefreshLine className="h-4 w-4 mr-1.5" />
            <span>Refresh Telemetry</span>
          </Button>
          <Link href="/operations/orders" className="flex-1 sm:flex-initial">
            <Button variant="primary" size="sm" className="w-full justify-center">
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

        <div
          onClick={() => setActiveTab('active')}
          className={`border rounded-xl p-4 shadow-xs cursor-pointer transition-all ${
            activeTab === 'active'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-slate-50/50'
          }`}
        >
          <span className="text-[11px] font-mono uppercase font-semibold text-slate-600 block flex items-center justify-between">
            <span>IN PRODUCTION</span>
            <RiUserSettingsLine className="h-3.5 w-3.5 text-blue-600" />
          </span>
          <span className="text-[24px] font-black text-slate-900 mt-1 block tabular-nums">
            {metrics?.inProductionOrders ?? (isLoading ? '...' : 0)}
          </span>
          <span className="text-[11px] text-blue-600 font-medium mt-0.5 block flex items-center gap-1">
            <span>View Operator Status</span>
            <RiArrowRightLine className="h-3 w-3 inline" />
          </span>
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
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-2 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 ring-1 ring-slate-900/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RiUserSettingsLine className="h-4 w-4 text-blue-600" />
            <span>Active Operators & Pipeline</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 font-mono text-[10px] rounded-full font-bold">
              {activePipelineOrders.length}
            </span>
          </button>

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

        {/* Tab: Active Operators & Pipeline Tracking */}
        {activeTab === 'active' && (
          <div className="p-5 space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 w-full sm:w-auto sm:max-w-xs md:max-w-sm">
                  <RiFilter3Line className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={activeSearch}
                    onChange={(e) => setActiveSearch(e.target.value)}
                    placeholder="Search Order #, Operator, Customer, Product..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {activeSearch && (
                    <button
                      onClick={() => setActiveSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedOperatorFilter}
                    onChange={(e) => setSelectedOperatorFilter(e.target.value)}
                    className="w-full sm:w-auto px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ALL">All Operators ({operators.length})</option>
                    <option value="UNASSIGNED">Unassigned Operator</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.fullName} ({op.activeLoad || 0} jobs)
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedStageFilter}
                    onChange={(e) => setSelectedStageFilter(e.target.value)}
                    className="w-full sm:w-auto px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ALL">All Stages</option>
                    <option value="PRINTING">Printing Floor</option>
                    <option value="FINISHING">Post-Press Finishing</option>
                    <option value="QUALITY_CHECK">Quality Check</option>
                    <option value="PRODUCTION_QUEUE">Production Queue</option>
                    <option value="CUSTOMER_APPROVAL_REQUIRED">Proof Approval</option>
                    <option value="DESIGN_PENDING">Design Queue</option>
                    <option value="PACKING">Packing & Shipping</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-500 shrink-0 text-right sm:text-left">
                Showing <strong className="text-slate-900">{filteredActiveOrders.length}</strong> of {activePipelineOrders.length} orders
              </div>
            </div>

            {/* Table of Orders with Operator and Designer Status */}
            {filteredActiveOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RiUserSettingsLine className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-slate-700">No orders match the current operator or stage filter.</p>
                <p className="text-slate-400 mt-0.5">Try clearing the search query or selecting "All Operators".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] bg-slate-50/50">
                      <th className="py-3 px-3">ORDER #</th>
                      <th className="py-3 px-3">CUSTOMER</th>
                      <th className="py-3 px-3">PRODUCT & SPECS</th>
                      <th className="py-3 px-3">ASSIGNED OPERATOR</th>
                      <th className="py-3 px-3">OPERATOR STATUS</th>
                      <th className="py-3 px-3">ASSIGNED DESIGNER</th>
                      <th className="py-3 px-3">MACHINE & JOB</th>
                      <th className="py-3 px-3">CURRENT ORDER STATE</th>
                      <th className="py-3 px-3 text-right">DISPATCH ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredActiveOrders.map((order) => {
                      const operator = order.assignedOperator || order.productionAssignment?.assignedUser;
                      const designer = order.assignedDesigner || order.designAssignment?.assignedUser;
                      const jc = order.jobCards?.[0];

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            <Link
                              href={`/operations/orders/${order.id}`}
                              className="hover:text-blue-600 hover:underline flex items-center gap-1.5"
                            >
                              <span>#{order.orderNumber}</span>
                            </Link>
                            <span className="text-[10px] text-slate-400 font-mono font-normal block">
                              {formatDate(order.createdAt)}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">
                              {order.customer?.fullName || 'Walk-in Customer'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {order.customer?.phone || order.customer?.companyName || 'No phone'}
                            </div>
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
                            {operator ? (
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <RiPrinterLine className="h-3.5 w-3.5 text-blue-600" />
                                  <span>{operator.fullName}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">{operator.email}</div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenAssign(order, 'PRODUCTION')}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                              >
                                <RiUserSharedLine className="h-3 w-3" />
                                <span>Assign Operator</span>
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {getOperatorStatusBadge(order)}
                          </td>

                          <td className="py-3 px-3">
                            {designer ? (
                              <div>
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <RiPaletteLine className="h-3.5 w-3.5 text-yellow-600" />
                                  <span>{designer.fullName}</span>
                                </div>
                                <div className="mt-0.5">{getDesignerStatusBadge(order)}</div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">None required</span>
                            )}
                          </td>

                          <td className="py-3 px-3 font-mono">
                            {jc ? (
                              <div>
                                <div className="font-semibold text-slate-800">{jc.jobNumber}</div>
                                <div className="text-[11px] text-slate-500">{jc.machine?.name || 'Auto Floor'}</div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-sans">Pending Job Card</span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {getOrderStageBadge(order)}
                          </td>

                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => handleOpenAssign(order, 'PRODUCTION')}
                              title="Assign or reassign production operator"
                            >
                              <RiPrinterLine className="h-3.5 w-3.5 mr-1 text-blue-600" />
                              <span>{operator ? 'Reassign' : 'Assign Operator'}</span>
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
                      <th className="py-3 px-3">CURRENT ORDER STATE</th>
                      <th className="py-3 px-3">ASSIGNED OPERATOR</th>
                      <th className="py-3 px-3">OPERATOR STATUS</th>
                      <th className="py-3 px-3">PAYMENT STATUS</th>
                      <th className="py-3 px-3">PRIORITY</th>
                      <th className="py-3 px-3">ORDER DATE</th>
                      <th className="py-3 px-3 text-right">DISPATCH ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {intakeOrders.map((order) => {
                      const op = order.assignedOperator || order.productionAssignment?.assignedUser;
                      return (
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
                          {getOrderStageBadge(order)}
                        </td>
                        <td className="py-3 px-3">
                          {op ? (
                            <div className="font-semibold text-slate-800 flex items-center gap-1">
                              <RiPrinterLine className="h-3 w-3 text-blue-600" />
                              <span>{op.fullName}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {getOperatorStatusBadge(order)}
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
                    );
                  })}
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
                      <th className="py-3 px-3">CURRENT ORDER STATE</th>
                      <th className="py-3 px-3">DESIGN STATUS</th>
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
                          {getOrderStageBadge(order)}
                        </td>
                        <td className="py-3 px-3">
                          {getDesignerStatusBadge(order)}
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
                      <th className="py-3 px-3">OPERATOR STATUS</th>
                      <th className="py-3 px-3">CURRENT ORDER STATE</th>
                      <th className="py-3 px-3">PRIORITY</th>
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
                            {getOperatorStatusBadge(order)}
                          </td>
                          <td className="py-3 px-3">
                            {getOrderStageBadge(order)}
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
                        <td className="py-3 px-3">
                          {getOrderStageBadge(order)}
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
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {d.activeLoad} active job(s)
                  </span>
                  <button
                    onClick={() => {
                      setActiveSearch(d.fullName);
                      setActiveTab('active');
                    }}
                    className="text-[11px] font-semibold text-yellow-700 hover:text-yellow-900 hover:underline px-2 py-0.5 rounded bg-yellow-50 border border-yellow-200"
                  >
                    View Status →
                  </button>
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
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {op.activeLoad} active job(s)
                  </span>
                  <button
                    onClick={() => {
                      setSelectedOperatorFilter(op.id);
                      setActiveTab('active');
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline px-2 py-0.5 rounded bg-blue-50 border border-blue-200"
                  >
                    View Status →
                  </button>
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
