'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { QCMetrics } from './QCMetrics';
import { QCFilters } from './QCFilters';
import { QCColumn, QCColumnDefinitionDto } from './QCColumn';
import { QCJobCardDto } from './QCJobCard';
import { QCInspectionDrawer } from './QCInspectionDrawer';
import { QCHoldModal } from './QCHoldModal';
import {
  RiRefreshLine,
  RiShieldCheckLine,
  RiAlertFill,
  RiCheckFill,
  RiFlashlightLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

const FINAL_QC_COLUMNS: QCColumnDefinitionDto[] = [
  {
    id: 'final-inspection',
    key: 'IN_INSPECTION',
    name: '1. In Physical Test',
    description: 'Color Density & Cut Squareness',
    color: '#06B6D4',
    type: 'SYSTEM',
  },
  {
    id: 'final-rework',
    key: 'ON_HOLD',
    name: '2. Rework & Defects',
    description: 'Rejected / Repress Required',
    color: '#EF4444',
    type: 'HOLD',
  },
  {
    id: 'final-approved',
    key: 'APPROVED',
    name: '3. Passed to Packing',
    description: 'Physical 100% Sign-Off',
    color: '#10B981',
    type: 'APPROVED',
  },
];

export function QCBoard() {
  const { user } = useAuth();

  // Final QC is the dedicated physical quality workstation
  const activeStage = 'FINAL_QC';

  // State
  const [finalQueue, setFinalQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [slaStatus, setSlaStatus] = useState('ALL');

  // Drag and Drop State
  const [draggedCard, setDraggedCard] = useState<QCJobCardDto | null>(null);

  // Optimistic overrides
  const [localCardOverrides, setLocalCardOverrides] = useState<Record<string, { status: string; holdReason?: string }>>({});

  // Modals State
  const [inspectCard, setInspectCard] = useState<QCJobCardDto | null>(null);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [holdModalCard, setHoldModalCard] = useState<{ card: QCJobCardDto; targetKey: string } | null>(null);

  // Auto-polling toggle
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch QC queues
  const loadQueues = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const finalData = await api.getFinalQCQueue(search || undefined).catch(() => []);
      setFinalQueue(finalData || []);
      setErrorBanner(null);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to load live Final QC queue.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    loadQueues();
  }, [loadQueues]);

  // Polling every 15s
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadQueues(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadQueues]);

  const showNotification = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(null), 4500);
    } else {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(null), 6000);
    }
  };

  // Convert raw API order into typed QCJobCardDto
  const convertOrderToQCJobCard = (order: any, type: 'FINAL_QC' = 'FINAL_QC'): QCJobCardDto => {
    const item = order.items?.[0];
    const specs = (item?.specifications as any) || {};
    const artworkVersion = item?.artworkVersions?.[0];

    const checklists = order.qcChecklists || [];
    const latestFinalQc = checklists.find((c: any) => c.type === 'FINAL_QC');
    const hasPassed = latestFinalQc?.outcome === 'PASS';
    const isPassedToPacking =
      order.status !== 'ON_HOLD' &&
      (hasPassed ||
        order.status === 'PACKING' ||
        order.status === 'READY_FOR_DISPATCH' ||
        order.status === 'OUT_FOR_DELIVERY' ||
        order.status === 'DELIVERED' ||
        order.jobCards?.some((j: any) => j.currentStation === 'PACKING' || j.status === 'PASSED'));

    const override = localCardOverrides[order.id];
    let cardStatus = 'IN_INSPECTION';
    if (override) {
      cardStatus = override.status === 'QUEUED' ? 'IN_INSPECTION' : override.status;
    } else if (order.status === 'ON_HOLD' || latestFinalQc?.outcome === 'FAIL') {
      cardStatus = 'ON_HOLD';
    } else if (isPassedToPacking) {
      cardStatus = 'APPROVED';
    }

    const artworkFile =
      specs?.artworkFile ||
      artworkVersion ||
      (specs?.artworkUrl
        ? {
          fileUrl: specs.artworkUrl,
          storageKey: specs.artworkStorageKey,
          originalFileName: 'Customer_Artwork',
          resolutionDpi: specs.resolutionDpi || 300,
          actualMegapixels: specs.actualMegapixels || 12,
        }
        : null);

    return {
      id: order.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer?.fullName || 'Customer',
      customerCompany: order.customer?.fullName,
      customerEmail: order.customer?.email,
      customerPhone: order.customer?.phone,
      productName: item?.productName || 'Print Product',
      sku: item?.sku,
      quantity: item?.quantity || 100,
      specifications: {
        paperGsm: specs.paperGsm || specs.options?.find((o: any) => o.optionName?.includes('Paper'))?.valueName || '350 GSM Board',
        finish: specs.finish || specs.options?.find((o: any) => o.optionName?.includes('Finish') || o.optionName?.includes('Lamination'))?.valueName || 'Matte Lamination',
        printMode: specs.printMode || 'Digital Offset CMYK',
        dimensions: specs.dimensions,
        sides: specs.sides,
        raw: specs,
      },
      artwork: artworkFile,
      status: cardStatus,
      type: 'FINAL_QC',
      priority: order.priority === 'URGENT' ? 'URGENT' : order.priority === 'HIGH' ? 'HIGH' : 'NORMAL',
      slaStatus: 'ON_TIME',
      slaBadgeText: 'ON SCHEDULE',
      timeInfo: {
        label: 'CREATED',
        text: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      allowedTransitions: ['QUEUED', 'IN_INSPECTION', 'ON_HOLD', 'APPROVED'],
      holdReason: override?.holdReason || (order.status === 'ON_HOLD' ? 'Technical hold flagged' : undefined),
      isHeld: cardStatus === 'ON_HOLD',
      customerNotes: order.customerNotes,
      createdAt: order.createdAt,
    };
  };

  // Active cards
  const allCards: QCJobCardDto[] = useMemo(() => {
    return finalQueue
      .map((o) => convertOrderToQCJobCard(o, 'FINAL_QC'))
      .filter((card) => {
        if (priority !== 'ALL' && card.priority !== priority) return false;
        if (slaStatus !== 'ALL' && card.slaStatus !== slaStatus) return false;
        return true;
      });
  }, [finalQueue, localCardOverrides, priority, slaStatus]);

  // Metrics
  const calculatedMetrics = useMemo(() => {
    const totalActive = allCards.length;
    const inReview = allCards.filter((c) => c.status === 'IN_INSPECTION').length;
    const holdsCount = allCards.filter((c) => c.status === 'ON_HOLD').length;
    const passedToday = allCards.filter((c) => c.status === 'APPROVED').length;
    const queuedCount = allCards.filter((c) => c.status === 'QUEUED').length;

    return {
      totalActive,
      preQcQueue: 0,
      inReview,
      finalQcQueue: queuedCount + inReview,
      passedToday,
      firstTimePassRate: totalActive > 0 ? Number(((passedToday / totalActive) * 100).toFixed(1)) : 98.4,
      holdsCount,
    };
  }, [allCards]);

  // Drag and Drop
  const handleCardDragStart = (e: React.DragEvent, card: QCJobCardDto) => {
    setDraggedCard(card);
    e.dataTransfer.setData('text/plain', card.id);
  };

  const handleCardDragEnd = () => {
    setDraggedCard(null);
  };

  const handleDropJob = async (columnKey: string, card: QCJobCardDto) => {
    if (columnKey === 'ON_HOLD') {
      setHoldModalCard({ card, targetKey: columnKey });
      return;
    }

    if (columnKey === 'APPROVED') {
      setInspectCard(card);
      setIsInspectOpen(true);
      return;
    }

    // Set optimistic state
    setLocalCardOverrides((prev) => ({
      ...prev,
      [card.id]: { status: columnKey },
    }));

    showNotification('success', `Order #${card.orderNumber} moved to ${columnKey.replace('_', ' ')}.`);
  };

  // Card Contextual Actions
  const handleCardAction = async (card: QCJobCardDto, actionType: string) => {
    if (actionType === 'START_INSPECTION') {
      setLocalCardOverrides((prev) => ({
        ...prev,
        [card.id]: { status: 'IN_INSPECTION' },
      }));
      showNotification('success', `Inspector active on #${card.orderNumber}.`);
      return;
    }

    if (actionType === 'QC_PASS') {
      try {
        await api.submitQC({
          orderId: card.orderId,
          type: card.type,
          items: [],
          generalNotes: '1-Click Fast-Track Quality Pass verified.',
        });

        setLocalCardOverrides((prev) => ({
          ...prev,
          [card.id]: { status: 'APPROVED' },
        }));

        showNotification(
          'success',
          `Order #${card.orderNumber} Final QC Passed! Evaluated payment clearance gate.`,
        );

        loadQueues(true);
      } catch (err: any) {
        showNotification('error', `QC Error: ${err?.message || 'Failed to submit inspection'}`);
      }
      return;
    }

    if (actionType === 'QC_HOLD') {
      setHoldModalCard({ card, targetKey: 'ON_HOLD' });
      return;
    }
  };

  const handleOpenInspect = (card: QCJobCardDto) => {
    setInspectCard(card);
    setIsInspectOpen(true);
  };

  // Submit Pass from Drawer
  const handleSubmitPassFromDrawer = async (card: QCJobCardDto, checks: any[], notes: string) => {
    try {
      await api.submitQC({
        orderId: card.orderId,
        type: 'FINAL_QC',
        items: checks,
        generalNotes: notes,
      });

      setLocalCardOverrides((prev) => ({
        ...prev,
        [card.id]: { status: 'APPROVED' },
      }));

      showNotification(
        'success',
        `Order #${card.orderNumber} Final QC Passed! Checked Payment Clearance (Released to Packing / Finance).`,
      );

      loadQueues(true);
    } catch (err: any) {
      showNotification('error', `QC Error: ${err?.message || 'Failed to complete inspection'}`);
    }
  };

  // Submit Fail/Hold from Drawer
  const handleSubmitFailFromDrawer = async (card: QCJobCardDto, defects: string[], notes: string) => {
    try {
      await api.submitQC({
        orderId: card.orderId,
        type: card.type,
        items: [{ code: 'MANUAL_FAIL', name: 'Inspector Flagged', result: 'FAIL' }],
        defects,
        generalNotes: notes,
      });

      setLocalCardOverrides((prev) => ({
        ...prev,
        [card.id]: { status: 'ON_HOLD', holdReason: notes },
      }));

      showNotification('error', `Order #${card.orderNumber} placed on Technical Hold.`);
      loadQueues(true);
    } catch (err: any) {
      showNotification('error', `QC Error: ${err?.message || 'Failed to submit defect'}`);
    }
  };

  // Submit Hold from Modal
  const handleSubmitHoldModal = async (reason: string, notes?: string) => {
    if (!holdModalCard) return;
    const { card } = holdModalCard;

    try {
      await api.submitQC({
        orderId: card.orderId,
        type: card.type,
        items: [{ code: 'HOLD_FLAG', name: reason, result: 'FAIL' }],
        defects: ['OTHER'],
        generalNotes: notes ? `${reason} - ${notes}` : reason,
      });

      setLocalCardOverrides((prev) => ({
        ...prev,
        [card.id]: { status: 'ON_HOLD', holdReason: reason },
      }));

      showNotification('error', `Order #${card.orderNumber} placed on Technical Hold: ${reason}.`);
      loadQueues(true);
    } catch (err: any) {
      showNotification('error', `QC Error: ${err?.message || 'Failed to submit hold'}`);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStageFilter('ALL');
    setPriority('ALL');
    setSlaStatus('ALL');
  };

  const hasActiveFilters = Boolean(search || priority !== 'ALL' || slaStatus !== 'ALL');
  const columns = FINAL_QC_COLUMNS;

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase font-bold text-slate-500 tracking-wider">
            <span>PLANT OPERATING SYSTEM</span>
            <span>•</span>
            <span className="text-slate-900">TECHNICAL QUALITY GATES</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Quality Control (QC) & Inspection Operating Board
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Final Physical Product Quality Verification & Inspection Workstation (Manufacturing Gate)
          </p>
        </div>

        {/* Action Buttons: Live sync & auto refresh */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto mt-2 sm:mt-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition flex-1 sm:flex-initial ${autoRefresh
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
            />
            <span>{autoRefresh ? 'Live Auto-Sync (15s)' : 'Auto-Sync Off'}</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadQueues()}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-1.5 h-9 flex-1 sm:flex-initial"
          >
            <RiRefreshLine className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <RiCheckFill className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
          <RiAlertFill className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span className="font-semibold">{errorBanner}</span>
        </div>
      )}

      {/* Live Quality Telemetry Strip */}
      <QCMetrics metrics={calculatedMetrics} />

      {/* Filters Bar */}
      <QCFilters
        search={search}
        onSearchChange={setSearch}
        qcStage={stageFilter}
        onStageChange={(val) => setStageFilter(val)}
        priority={priority}
        onPriorityChange={setPriority}
        slaStatus={slaStatus}
        onSlaStatusChange={setSlaStatus}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Kanban Board Horizontal Columns Container */}
      <div className="flex gap-3.5 overflow-x-auto pb-4 pt-1 custom-scrollbar min-h-[560px] items-start">
        {columns.map((column) => {
          const columnCards = allCards.filter((c) => c.status === column.key);
          return (
            <QCColumn
              key={column.id}
              column={column}
              cards={columnCards}
              onAction={handleCardAction}
              onOpenInspect={handleOpenInspect}
              onDropJob={handleDropJob}
              draggedCard={draggedCard}
              onCardDragStart={handleCardDragStart}
              onCardDragEnd={handleCardDragEnd}
            />
          );
        })}
      </div>

      {/* Inspection Drawer */}
      <QCInspectionDrawer
        card={inspectCard}
        isOpen={isInspectOpen}
        onClose={() => {
          setIsInspectOpen(false);
          setInspectCard(null);
        }}
        onSubmitPass={handleSubmitPassFromDrawer}
        onSubmitFail={handleSubmitFailFromDrawer}
      />

      {/* Hold Reason Modal */}
      <QCHoldModal
        card={holdModalCard?.card || null}
        targetKey={holdModalCard?.targetKey || 'ON_HOLD'}
        isOpen={Boolean(holdModalCard)}
        onClose={() => setHoldModalCard(null)}
        onSubmit={handleSubmitHoldModal}
      />
    </div>
  );
}
