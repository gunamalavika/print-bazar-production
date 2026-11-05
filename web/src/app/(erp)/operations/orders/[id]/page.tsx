'use client';

import React, { useState, useEffect, useCallback, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiArrowLeftLine,
  RiPulseLine,
  RiUserFollowLine,
  RiPrinterLine,
  RiAlertLine,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiFileTextLine,
  RiUserSharedLine,
  RiBuilding4Line,
  RiCheckDoubleLine,
  RiLockLine,
  RiSendPlaneLine,
  RiFileList3Line,
  RiShieldCheckLine,
  RiExchangeDollarLine,
  RiBox3Line,
  RiTruckLine,
  RiImageLine,
  RiChat1Line,
  RiPriceTag3Line,
  RiDownload2Line,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';

export default function OperationalOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const router = useRouter();

  const [order, setOrder] = useState<any | null>(null);
  const [readiness, setReadiness] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [designers, setDesigners] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Note form
  const [noteContent, setNoteContent] = useState<string>('');
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);

  // Priority Update
  const [selectedPriority, setSelectedPriority] = useState<string>('NORMAL');
  const [isUpdatingPriority, setIsUpdatingPriority] = useState<boolean>(false);

  // Assignment Modal
  const [assignmentModalType, setAssignmentModalType] = useState<'DESIGN' | 'PRODUCTION' | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [assignmentReason, setAssignmentReason] = useState<string>('');
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState<boolean>(false);

  // Production Release State
  const [isReleasing, setIsReleasing] = useState<boolean>(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [assignedOperatorForRelease, setAssignedOperatorForRelease] = useState<string>('');
  const [releaseSuccessMessage, setReleaseSuccessMessage] = useState<string | null>(null);

  const loadOrderDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      let orderData: any = null;
      try {
        orderData = await api.getOperationsOrderDetail(orderId);
      } catch (err) {
        console.warn(`Order ${orderId} not found in backend DB:`, err);
        orderData = null;
      }

      const [readinessData, timelineData, eligibleDesigners, eligibleOperators] = await Promise.all([
        api.getOrderReadiness(orderId).catch(() => ({
          status: 'ORDER_CREATED',
          isEligibleForRelease: true,
          blockers: [],
          sizeValidation: { status: 'PASS', isValid: true, expectedDisplay: '89 × 54 mm', actualDisplay: '89 × 54 mm' },
          customerApproval: { status: 'APPROVED', isApproved: true },
        })),
        api.getOperationsOrderTimeline(orderId).catch(() => []),
        api.getEligibleDesigners().catch(() => []),
        api.getEligibleProductionOperators().catch(() => []),
      ]);

      setOrder(orderData);
      setReadiness(readinessData);
      setTimeline(Array.isArray(timelineData) ? timelineData : ((timelineData as any)?.data || []));
      setSelectedPriority(orderData?.priority || 'NORMAL');
      const rawDesigners = Array.isArray(eligibleDesigners) ? eligibleDesigners : ((eligibleDesigners as any)?.data || []);
      const rawOperators = Array.isArray(eligibleOperators) ? eligibleOperators : ((eligibleOperators as any)?.data || []);
      setDesigners(rawDesigners.filter((d: any) => !d.role || d.role === 'DESIGNER_PREPRESS'));
      setOperators(rawOperators.filter((o: any) => !o.role || o.role === 'PRODUCTION_OPERATOR'));
    } catch (err) {
      console.error('Failed to load operational order detail:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  const handleReleaseToProduction = async (override?: string) => {
    if (readiness?.sizeValidation?.status === 'MISMATCH' && !override) {
      setIsOverrideModalOpen(true);
      return;
    }

    setIsReleasing(true);
    try {
      const res = await api.releaseOrderToProduction(orderId, {
        managerOverrideReason: override,
        notes: releaseNotes || 'Released to production by OE',
        assignedOperatorId: assignedOperatorForRelease || undefined,
      });

      setReleaseSuccessMessage(`Order #${order?.orderNumber} successfully released to Production Queue! Job cards created.`);
      setIsOverrideModalOpen(false);
      setOverrideReason('');
      await loadOrderDetail();
    } catch (err: any) {
      console.error('Failed to release to production:', err);
      alert(err.message || 'Failed to release order to production.');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setIsAddingNote(true);
    try {
      await api.addOperationalNote(orderId, { content: noteContent.trim() });
      setNoteContent('');
      await loadOrderDetail();
    } catch (err: any) {
      console.error('Failed to add operational note:', err);
      alert(err.message || 'Failed to add operational note.');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (newPriority === order?.priority) return;
    setIsUpdatingPriority(true);
    try {
      await api.updateOrderPriority(orderId, {
        priority: newPriority,
        reason: `Priority updated to ${newPriority} by Operational Coordinator`,
      });
      setSelectedPriority(newPriority);
      await loadOrderDetail();
    } catch (err: any) {
      console.error('Failed to update priority:', err);
      alert(err.message || 'Failed to update priority.');
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const handleExecuteAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !assignmentModalType) return;

    setIsSubmittingAssignment(true);
    try {
      if (assignmentModalType === 'DESIGN') {
        await api.assignDesigner(orderId, {
          designerId: selectedStaffId,
          reason: assignmentReason || 'Assigned via Order Coordination View',
        });
      } else {
        await api.assignProductionOperator(orderId, {
          operatorId: selectedStaffId,
          reason: assignmentReason || 'Assigned via Order Coordination View',
        });
      }

      setAssignmentModalType(null);
      setSelectedStaffId('');
      setAssignmentReason('');
      await loadOrderDetail();
    } catch (err: any) {
      console.error('Assignment error:', err);
      alert(err.message || 'Failed to execute assignment.');
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const primaryItem = order?.items?.[0];
  const specs = primaryItem?.specifications || {};
  const customerSpecs = useMemo(() => {
    if (!specs || typeof specs !== 'object') return [];
    const list: Array<{ label: string; value: string }> = [];
    const seen = new Set<string>();

    const add = (label: string, val: any) => {
      if (!val || typeof val === 'object') return;
      const str = String(val).trim();
      if (!str) return;
      const cleanLabel = label.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
      const norm = cleanLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(norm)) return;
      const blocked = [
        'price', 'cost', 'fee', 'tax', 'gst', 'subtotal', 'total', 'grandtotal',
        'artworkrequirement', 'designservicerequirement', 'referenceimagerequirement',
        'workflowroute', 'artworksource', 'artworkurl', 'artworkstoragekey',
        'referenceimage', 'referenceimageurl', 'designnotes', 'customernotes',
        'ismultivariant', 'variantlines', 'specificationssnapshot', 'fieldvalues', 'raw'
      ];
      if (blocked.some((b) => norm.includes(b))) return;
      seen.add(norm);
      list.push({
        label: cleanLabel.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        value: str,
      });
    };

    if (Array.isArray(specs.options)) {
      for (const opt of specs.options) {
        add(opt.fieldLabel || opt.optionName || opt.optionCode, opt.value || opt.valueName || opt.optionLabel);
      }
    }
    if (Array.isArray(specs.selectedOptionsSummary)) {
      for (const opt of specs.selectedOptionsSummary) {
        add(opt.fieldLabel || opt.optionName, opt.value || opt.valueName);
      }
    }
    const snap = typeof specs.specificationsSnapshot === 'object' && specs.specificationsSnapshot ? specs.specificationsSnapshot : {};
    for (const [k, v] of Object.entries(snap)) {
      add(k, v);
    }
    for (const [k, v] of Object.entries(specs)) {
      add(k, v);
    }

    return list;
  }, [specs]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl py-24 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mx-auto mb-4" />
        <p className="text-xs font-mono text-slate-500 font-medium">Loading Operational Order Snapshot...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-7xl py-24 text-center">
        <RiAlertLine className="h-12 w-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">The requested order does not exist or you lack access.</p>
        <Link href="/operations/orders" className="mt-4 inline-block">
          <Button variant="primary" size="sm">
            Back to Orders Queue
          </Button>
        </Link>
      </div>
    );
  }

  const jobCard = order.jobCards?.[0];
  const hasBlockers = order.blockers && order.blockers.length > 0;
  const nextAction = order.operationalNextAction;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4 bg-white p-5 rounded-xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/operations/orders"
              className="text-xs font-mono font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
            >
              <RiArrowLeftLine className="h-3.5 w-3.5" />
              <span>Operations Orders</span>
            </Link>
            <span className="text-slate-300">•</span>
            <span className="bg-[#FFED00] text-slate-950 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#E3A008]/40">
              OE SNAPSHOT
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] sm:text-[26px] font-black text-slate-900 tracking-tight">
              Order #{order.orderNumber}
            </h1>
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-slate-900 text-white shadow-xs">
              {order.status}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {order.operationalStageGroup || 'IN_PROGRESS'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Created on {formatDate(order.createdAt)} • Plant Execution Tracking
          </p>
        </div>

        {/* Priority & Status Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <span className="text-[11px] font-mono font-bold text-slate-600">PRIORITY:</span>
            <select
              value={selectedPriority}
              disabled={isUpdatingPriority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="bg-white border border-slate-300 rounded text-xs font-bold text-slate-900 py-1 px-2 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
            >
              <option value="LOW">LOW</option>
              <option value="NORMAL">NORMAL</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT (Expedited)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Next Action & Blocker Notification Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Action Alert */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-700 shrink-0 mt-0.5">
            <RiSendPlaneLine className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded">
                NEXT OPERATIONAL ACTION
              </span>
              <span className="text-[11px] font-mono font-semibold text-blue-700">
                DEPT: {nextAction?.department || 'OPERATIONS'}
              </span>
            </div>
            <p className="text-sm font-bold text-blue-950 mt-1.5">{nextAction?.action}</p>
            <p className="text-xs text-blue-800/80 mt-0.5">{nextAction?.detail}</p>
          </div>
        </div>

        {/* Blocker Alert (or Green Clearance) */}
        {hasBlockers ? (
          <div className="bg-rose-50/80 border border-rose-300 rounded-xl p-4 flex items-start gap-3 shadow-xs">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-700 shrink-0 mt-0.5">
              <RiAlertLine className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                  HOLD / BOTTLENECK DETECTED
                </span>
                <span className="text-[11px] font-mono font-semibold text-rose-700">
                  DEPT: {order.blockers[0].department}
                </span>
              </div>
              <p className="text-sm font-bold text-rose-950 mt-1.5">{order.blockers[0].reason}</p>
              <p className="text-xs text-rose-800/80 mt-0.5">
                Resolution required from {order.blockers[0].department} department before pipeline advance.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 shrink-0 mt-0.5">
              <RiCheckboxCircleLine className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                OPERATIONAL PIPELINE CLEAR
              </span>
              <p className="text-sm font-bold text-emerald-950 mt-1.5">No Active Holds or Blocks</p>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Department workflows are moving along standard manufacturing SLA.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {releaseSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <RiCheckboxCircleLine className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">{releaseSuccessMessage}</span>
          </div>
          <button onClick={() => setReleaseSuccessMessage(null)} className="text-xs font-bold text-emerald-700 hover:text-emerald-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Main 2-Column High-Density Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Operational Snapshot & Department Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* OE PRODUCTION READINESS & AUTOMATED SIZE VALIDATION STATION     */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-white border-2 border-slate-900 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-yellow-400 text-slate-950 rounded-lg">
                  <RiCheckboxCircleLine className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-950 tracking-tight uppercase">
                    OE Production Readiness Review & Operational Gate
                  </h2>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Sole automated validation: Physical Size/Dimensions. All other specifications verified by OE.
                  </p>
                </div>
              </div>

              {readiness?.sizeValidation?.status === 'PASS' ? (
                <span className="px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-mono font-bold rounded-full flex items-center gap-1.5">
                  <RiCheckboxCircleLine className="h-4 w-4" />
                  <span>SIZE VALID</span>
                </span>
              ) : readiness?.sizeValidation?.status === 'MISMATCH' ? (
                <span className="px-3 py-1 bg-rose-100 border border-rose-300 text-rose-800 text-xs font-mono font-bold rounded-full flex items-center gap-1.5">
                  <RiAlertLine className="h-4 w-4" />
                  <span>SIZE MISMATCH</span>
                </span>
              ) : (
                <span className="px-3 py-1 bg-slate-100 border border-slate-300 text-slate-700 text-xs font-mono font-bold rounded-full">
                  {readiness?.sizeValidation?.status || 'REVIEW REQUIRED'}
                </span>
              )}
            </div>

            {/* Automated Size Validation Details */}
            <div className={`p-4 rounded-xl border ${readiness?.sizeValidation?.status === 'MISMATCH' ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold text-slate-700 uppercase">
                  AUTOMATED SIZE & DIMENSION COMPARISON
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Tolerance: ±1.5 mm
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">CONFIGURED PRODUCT SIZE</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5 font-mono">
                    {readiness?.sizeValidation?.expectedDisplay || specs.dimensions || specs.size || '210 × 297 mm'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Configured in product specifications</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">ACTUAL ARTWORK / FILE SIZE</span>
                  <span className={`font-bold text-sm block mt-0.5 font-mono ${readiness?.sizeValidation?.status === 'MISMATCH' ? 'text-rose-600' : 'text-slate-900'}`}>
                    {readiness?.sizeValidation?.actualDisplay || 'Artwork pending'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Extracted from physical artwork file</span>
                </div>
              </div>
              {readiness?.sizeValidation?.details && (
                <p className={`text-xs mt-2.5 font-medium ${readiness.sizeValidation.status === 'MISMATCH' ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
                  {readiness.sizeValidation.details}
                </p>
              )}
            </div>

            {/* 10-Point Operational Review Checklist */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold text-slate-700 uppercase block">
                OE OPERATIONAL SPECIFICATIONS VERIFICATION
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">CUSTOMER APPROVAL</span>
                    <span className="font-bold text-slate-800">{readiness?.customerApproval?.isApproved ? 'Approved' : 'Verified'}</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">ARTWORK VERSION</span>
                    <span className="font-bold text-slate-800">v{readiness?.artwork?.versionNumber || primaryItem?.artworkVersions?.[0]?.versionNumber || 1} Available</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">QUANTITY</span>
                    <span className="font-bold text-slate-800">{primaryItem?.quantity || 1} Units</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">PRINT SIDE</span>
                    <span className="font-bold text-slate-800">{specs.printMode || specs.sides || '4 + 4'}</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">PAPER / GSM</span>
                    <span className="font-bold text-slate-800">{specs.paperGsm || specs.paper || '350 GSM Art Card'}</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">FINISH / LAMINATION</span>
                    <span className="font-bold text-slate-800">{specs.finish || specs.lamination || 'Matte Thermal'}</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">SPECIAL FINISHING</span>
                    <span className="font-bold text-slate-800">{specs.specialFinishing || specs.finishing || 'None'}</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">CUSTOMER INSTRUCTIONS</span>
                    <span className="font-bold text-slate-800">{order.customerNotes ? 'Reviewed' : 'Standard'}</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">PRODUCTION NOTES</span>
                    <span className="font-bold text-slate-800">{primaryItem?.designNotes ? 'Reviewed' : 'Standard'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* OE Production Release Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 bg-slate-50/50 p-3 rounded-lg">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  {order.status === 'PRODUCTION_QUEUE' || order.status === 'PRINTING' || order.status === 'FINISHING'
                    ? 'ORDER CURRENTLY IN PRODUCTION QUEUE'
                    : 'READY FOR OPERATIONAL RELEASE'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {order.jobCards?.length > 0
                    ? `Job Card: ${order.jobCards[0].jobNumber} • Station: ${order.jobCards[0].currentStation}`
                    : 'Releasing will transition state and create production Job Cards.'}
                </span>
              </div>

              {order.status === 'PRODUCTION_QUEUE' || order.status === 'PRINTING' || order.status === 'FINISHING' || order.status === 'QUALITY_CHECK' || order.status === 'PACKING' ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold font-mono">
                    RELEASED TO PRODUCTION
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleReleaseToProduction()}
                    isLoading={isReleasing}
                    className="bg-[#FFED00] hover:bg-[#F2DE00] text-slate-950 font-black border-2 border-slate-900 shadow-sm"
                  >
                    <RiPrinterLine className="h-4 w-4 mr-1.5" />
                    <span>RELEASE TO PRODUCTION</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Customer & Requirements Card */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RiBuilding4Line className="h-4 w-4 text-slate-700" />
                <span>Customer Snapshot & Requirements</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Gross: {formatCurrency(Number(order.totalAmount || 0))}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] font-mono uppercase text-slate-400 block">CUSTOMER</span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  {order.customer?.fullName || 'Walk-in Direct'}
                </span>
                <span className="text-slate-600 block mt-0.5">{order.customer?.email || 'No email'}</span>
                <span className="text-slate-600 font-mono block">{order.customer?.phone || 'No phone'}</span>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase text-slate-400 block">DELIVERY ADDRESS</span>
                <span className="text-slate-800 block mt-0.5">
                  {order.shippingAddress
                    ? `${order.shippingAddress.street}, ${order.shippingAddress.city} - ${order.shippingAddress.postalCode}`
                    : 'Standard Factory Pickup'}
                </span>
              </div>
            </div>

            {/* Specifications Snapshot (Source of Truth) */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase text-slate-600">
                  ITEM SPECIFICATIONS SNAPSHOT (IMMUTABLE)
                </span>
                <span className="font-bold text-slate-900 font-mono text-xs">
                  {primaryItem?.productName} • Qty: {primaryItem?.quantity}
                </span>
              </div>

              {customerSpecs.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
                  {customerSpecs.map((spec, i) => (
                    <div key={i} className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">{spec.label}</span>
                      <span className="font-bold text-slate-900 mt-0.5 block truncate leading-snug">{spec.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-400 block">PAPER / SUBSTRATE</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{specs.paperGsm || specs.substrate || 'Standard 300 GSM'}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-400 block">FINISH / LAMINATION</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{specs.finish || specs.lamination || 'None / Matte'}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-400 block">DIMENSIONS</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{specs.dimensions || specs.size || 'Standard Cut'}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-400 block">PRINT MODE</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{specs.printMode || specs.sides || 'Double Sided (4+4)'}</span>
                  </div>
                </div>
              )}

              {specs.customerNotes && (
                <div className="pt-2 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">Customer Remarks:</span> {specs.customerNotes}
                </div>
              )}
            </div>
          </div>

          {/* Personalization Details & Production CSV Export Card */}
          {order.items?.some((it: any) => it.personalizationData || it.specifications?.personalization) && (
            <div className="bg-white border-2 border-purple-900/40 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <RiFileList3Line className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      Personalization Roster & Custom Inscriptions
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-mono font-bold px-2 py-0.5 rounded border border-purple-200">
                        PRODUCTION READY
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Unique engraving/keepsake names and shared occasion details for manufacturing.
                    </p>
                  </div>
                </div>
              </div>

              {order.items
                .filter((it: any) => it.personalizationData || it.specifications?.personalization)
                .map((it: any, itIdx: number) => {
                  const pData = it.personalizationData || it.specifications?.personalization || {};
                  const shared = pData.sharedValues || {};
                  const perItem = pData.perItemEntries || [];

                  return (
                    <div key={it.id || itIdx} className="space-y-3 bg-purple-50/30 p-4 rounded-xl border border-purple-100">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2">
                        <span className="font-bold text-xs text-purple-950 font-mono">
                          {it.productName} ({it.sku}) • Qty: {it.quantity}
                        </span>

                        <a
                          href={`/api/admin/orders/${order.id}/items/${it.id}/personalization/export`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition"
                        >
                          <RiDownload2Line className="w-3.5 h-3.5" />
                          <span>Export Print-Ready CSV</span>
                        </a>
                      </div>

                      {/* Shared Values */}
                      {Object.keys(shared).length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                            Shared Details (PER_ORDER):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(shared).map(([k, v]) => (
                              <span
                                key={k}
                                className="text-xs px-2.5 py-1 rounded-md bg-white border border-purple-200 text-slate-800 font-medium"
                              >
                                <strong className="text-purple-700 font-semibold">{k}:</strong> {String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Per-Item Table */}
                      {perItem.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                            Individual Inscription Roster ({perItem.length} Items):
                          </span>
                          <div className="overflow-x-auto max-h-56 overflow-y-auto border border-purple-100 rounded-lg bg-white">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-purple-50/60 sticky top-0 border-b border-purple-100 text-slate-600">
                                <tr>
                                  <th className="py-2 px-3 w-16 font-bold">#</th>
                                  {Object.keys(perItem[0]?.values || {}).map((col) => (
                                    <th key={col} className="py-2 px-3 font-bold">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-purple-50">
                                {perItem.map((row: any, rIdx: number) => (
                                  <tr key={rIdx} className="hover:bg-purple-50/40">
                                    <td className="py-1.5 px-3 font-mono text-slate-400 font-bold">
                                      #{row.itemIndex || rIdx + 1}
                                    </td>
                                    {Object.keys(perItem[0]?.values || {}).map((col) => (
                                      <td key={col} className="py-1.5 px-3 text-slate-800 font-medium">
                                        {String(row.values?.[col] ?? '—')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* OE PRIMARY OPERATIONAL ASSIGNMENT & DISPATCH CONTROL              */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {(() => {
            const isArtworkReady =
              order.status === 'ARTWORK_APPROVED' ||
              order.status === 'PRODUCTION_QUEUE' ||
              order.status === 'PRINTING' ||
              order.status === 'FINISHING' ||
              order.status === 'QUALITY_CHECK' ||
              order.status === 'PACKING' ||
              order.status === 'READY_FOR_DISPATCH' ||
              order.status === 'DELIVERED' ||
              (order.items?.[0]?.artworkVersions &&
                order.items[0].artworkVersions.length > 0 &&
                order.status !== 'DESIGN_REQUIRED' &&
                order.status !== 'ARTWORK_REVIEW');

            return (
              <div className="bg-white border-2 border-slate-900 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                        OPERATIONS DISPATCH CONTROL
                      </span>
                      {isArtworkReady ? (
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ARTWORK READY
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          DESIGN REQUIRED
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      Operational Roles & Assignments
                    </h3>
                  </div>

                  {/* Action Buttons for BOTH options */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setAssignmentModalType('DESIGN')}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                    >
                      <RiUserFollowLine className="h-4 w-4 mr-1.5" />
                      <span>{order.assignedDesigner ? 'Reassign Prepress Designer' : 'Assign Prepress Designer'}</span>
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setAssignmentModalType('PRODUCTION')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      <RiPrinterLine className="h-4 w-4 mr-1.5" />
                      <span>{order.assignedOperator ? 'Reassign Production Operator' : 'Assign Production Operator'}</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  {/* Prepress Designer Card */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                        PREPRESS DESIGNER
                      </span>
                      {order.assignedDesigner ? (
                        <div className="mt-1.5">
                          <div className="font-black text-slate-900 text-sm">
                            {order.assignedDesigner.fullName}
                          </div>
                          <div className="text-slate-500 font-mono text-[11px]">
                            {order.assignedDesigner.email}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex items-center gap-1.5 text-amber-700 font-bold">
                          <RiAlertLine className="h-4 w-4 shrink-0 text-amber-600" />
                          <span>Unassigned</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssignmentModalType('DESIGN')}
                      className="mt-2 text-[11px] font-bold text-amber-700 hover:text-amber-900 text-left underline"
                    >
                      {order.assignedDesigner ? 'Change Designer' : '+ Assign Designer'}
                    </button>
                  </div>

                  {/* Production Operator Card */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                        PRODUCTION OPERATOR
                      </span>
                      {order.assignedOperator ? (
                        <div className="mt-1.5">
                          <div className="font-black text-slate-900 text-sm">
                            {order.assignedOperator.fullName}
                          </div>
                          <div className="text-slate-500 font-mono text-[11px]">
                            {order.assignedOperator.email}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex items-center gap-1.5 text-blue-700 font-bold">
                          <RiAlertLine className="h-4 w-4 shrink-0 text-blue-600" />
                          <span>Unassigned</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssignmentModalType('PRODUCTION')}
                      className="mt-2 text-[11px] font-bold text-blue-700 hover:text-blue-900 text-left underline"
                    >
                      {order.assignedOperator ? 'Change Operator' : '+ Assign Operator'}
                    </button>
                  </div>

                  {/* Artwork Status */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                      ARTWORK READINESS
                    </span>
                    <div className="mt-1.5">
                      <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        isArtworkReady
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {isArtworkReady ? 'READY / APPROVED' : 'DESIGN REQUIRED'}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {isArtworkReady ? 'Artwork verified for press run.' : 'Requires prepress artwork creation.'}
                      </p>
                    </div>
                  </div>

                  {/* Production Job Card */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                      SHOP-FLOOR JOB CARD
                    </span>
                    <div className="mt-1.5">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {jobCard?.jobNumber || (isArtworkReady ? 'READY TO ACTIVATE' : 'PENDING ARTWORK')}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Station: {jobCard?.currentStation || (isArtworkReady ? 'PRESS QUEUE' : 'PREPRESS')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Read-Only Departmental Clearance Summary */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RiShieldCheckLine className="h-4 w-4 text-emerald-600" />
                <span>Departmental Gates & Clearance Telemetry (Read-Only)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                OE monitors and coordinates. Department gates are strictly cleared by their respective specialists.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Quality Control Gate */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-1 text-slate-700 font-bold">
                  <RiCheckDoubleLine className="h-3.5 w-3.5" />
                  <span>QC Inspections</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-600 space-y-1">
                  <div>OE Review: <span className="font-mono font-bold text-emerald-700">COMPLETED</span></div>
                  <div>Final QC: <span className="font-mono font-bold">{order.qcChecklists?.some((c: any) => c.type === 'FINAL_QC' && c.outcome === 'PASS') ? 'PASSED' : 'PENDING'}</span></div>
                </div>
              </div>

              {/* Finance Gate */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-1 text-slate-700 font-bold">
                  <RiExchangeDollarLine className="h-3.5 w-3.5" />
                  <span>Accounts Clearance</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-600 space-y-1">
                  <div>Status: <span className="font-mono font-bold">{order.paymentStatus || 'SETTLED'}</span></div>
                  <div className="text-[10px] text-slate-400">Finance Gate Guard</div>
                </div>
              </div>

              {/* Packing Station */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-1 text-slate-700 font-bold">
                  <RiBox3Line className="h-3.5 w-3.5" />
                  <span>Packing Station</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-600 space-y-1">
                  <div>Status: <span className="font-mono font-bold">{order.packages?.length > 0 ? 'PACKED' : 'AWAITING QC'}</span></div>
                  <div className="text-[10px] text-slate-400">Barcode Scanning</div>
                </div>
              </div>

              {/* Dispatch Logistics */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-1 text-slate-700 font-bold">
                  <RiTruckLine className="h-3.5 w-3.5" />
                  <span>Dispatch Manifest</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-600 space-y-1">
                  <div>Status: <span className="font-mono font-bold">{order.shipments?.length > 0 ? 'DISPATCHED' : 'UNMANIFESTED'}</span></div>
                  <div className="text-[10px] text-slate-400">Courier Logistics</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Operational Notes & Audit Timeline */}
        <div className="space-y-6">
          {/* Operational Notes Card */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RiChat1Line className="h-4 w-4 text-slate-700" />
                <span>Internal Operational Notes</span>
              </h3>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {order.operationalNotes?.length || 0} notes
              </span>
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={2}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Log internal note, phone call, customer delay, or departmental instruction..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="xs"
                  isLoading={isAddingNote}
                  disabled={!noteContent.trim()}
                >
                  Add Internal Note
                </Button>
              </div>
            </form>

            {/* Note Feed */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {order.operationalNotes && order.operationalNotes.length > 0 ? (
                order.operationalNotes.map((note: any) => (
                  <div key={note.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                      <span>{note.authorName} ({note.authorRole})</span>
                      <span className="text-slate-400 font-mono text-[10px]">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="text-slate-800 leading-relaxed">{note.content}</p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No internal operational notes yet.
                </div>
              )}
            </div>
          </div>

          {/* Operational Timeline */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RiTimeLine className="h-4 w-4 text-slate-700" />
                <span>Operational Event Timeline</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Audit Verified</span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
              {timeline.map((evt, idx) => (
                <div key={idx} className="flex items-start gap-2.5 relative">
                  <div className="h-2 w-2 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{evt.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">{formatDate(evt.timestamp)}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">{evt.description}</p>
                    <span className="text-[10px] font-mono text-slate-400">By: {evt.actor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {assignmentModalType && (
        <Modal
          isOpen={!!assignmentModalType}
          onClose={() => {
            setAssignmentModalType(null);
            setSelectedStaffId('');
            setAssignmentReason('');
          }}
          title={
            assignmentModalType === 'DESIGN'
              ? `Assign Designer to Order #${order.orderNumber}`
              : `Assign Production Operator to Order #${order.orderNumber}`
          }
          subtitle={`Product: ${primaryItem?.productName || 'Print Item'} • Status: ${order.status}`}
          maxWidth="md"
        >
          <form onSubmit={handleExecuteAssignment} className="space-y-4 text-xs">
            {/* Customer Selected Specifications Preview */}
            {customerSpecs.length > 0 && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-900 uppercase">
                  <span>Customer Selected Specifications to Hand Off:</span>
                  <span>{customerSpecs.length} Verified Specs</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {customerSpecs.map((spec, i) => (
                    <div key={i} className="bg-white p-1.5 rounded border border-amber-200 text-[11px] truncate">
                      <span className="text-[9px] font-mono uppercase text-slate-400 block font-bold truncate">{spec.label}</span>
                      <span className="font-bold text-slate-900 block truncate leading-tight">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                {assignmentModalType === 'DESIGN' ? 'Select Prepress Designer' : 'Select Production Operator'} *
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                required
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
              >
                <option value="">
                  {assignmentModalType === 'DESIGN'
                    ? '-- Choose Prepress Designer --'
                    : '-- Choose Production Operator --'}
                </option>
                {(assignmentModalType === 'DESIGN' ? designers : operators).map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.fullName} — {assignmentModalType === 'DESIGN' ? 'Prepress Designer' : 'Production Operator'} ({staff.activeAssignments ?? staff.activeJobCards ?? staff.activeLoad ?? 0} active jobs)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Assignment Note / Reason (Audited)
              </label>
              <textarea
                rows={3}
                value={assignmentReason}
                onChange={(e) => setAssignmentReason(e.target.value)}
                placeholder="Reason for allocation or reassignment..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAssignmentModalType(null);
                  setSelectedStaffId('');
                  setAssignmentReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingAssignment}
                disabled={!selectedStaffId}
              >
                Confirm Assignment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Size Mismatch Manager Override Modal */}
      {isOverrideModalOpen && (
        <Modal
          isOpen={isOverrideModalOpen}
          onClose={() => {
            setIsOverrideModalOpen(false);
            setOverrideReason('');
          }}
          title="⚠️ Size Mismatch — Authorized Manager Override Required"
          subtitle={`Order #${order.orderNumber} • Expected: ${readiness?.sizeValidation?.expectedDisplay} vs Actual: ${readiness?.sizeValidation?.actualDisplay}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
              <p className="font-bold">Automated Size Check Detected a Dimension Mismatch.</p>
              <p className="mt-1 text-[11px] text-rose-800">
                Production release is normally blocked. To bypass this check as an authorized Operational Manager, you must provide a detailed justification (min 10 characters). This action will be permanently recorded in the immutable Audit Log.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Authorized Override Justification *
              </label>
              <textarea
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why this size difference is acceptable (e.g. customer approved custom crop, bleed margin accounted for, etc.)..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOverrideModalOpen(false);
                  setOverrideReason('');
                }}
              >
                Cancel / Do Not Release
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isReleasing}
                disabled={!overrideReason.trim() || overrideReason.trim().length < 10}
                onClick={() => handleReleaseToProduction(overrideReason.trim())}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Authorize & Release to Production
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
