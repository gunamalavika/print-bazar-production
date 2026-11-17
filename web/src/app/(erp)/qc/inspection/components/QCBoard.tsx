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
import { QCColumnEditModal } from './QCColumnEditModal';
import { QCColumnManagerModal } from './QCColumnManagerModal';
import {
  RiRefreshLine,
  RiAlertFill,
  RiCheckFill,
  RiAddLine,
  RiSettings4Line,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

const STORAGE_KEY_QC_COLUMNS = 'pb_kanban_columns_qc';
const STORAGE_KEY_QC_OVERRIDES = 'pb_kanban_qc_card_stages';

const FINAL_QC_COLUMNS: QCColumnDefinitionDto[] = [
  {
    id: 'final-inspection',
    key: 'IN_INSPECTION',
    name: '1. In Physical Test',
    description: 'Color Density & Cut Squareness',
    color: '#06B6D4',
    type: 'SYSTEM',
    isCustom: false,
  },
  {
    id: 'final-rework',
    key: 'ON_HOLD',
    name: '2. Rework & Defects',
    description: 'Rejected / Repress Required',
    color: '#EF4444',
    type: 'HOLD',
    isCustom: false,
  },
  {
    id: 'final-approved',
    key: 'APPROVED',
    name: '3. Passed to Packing',
    description: 'Physical 100% Sign-Off',
    color: '#10B981',
    type: 'APPROVED',
    isCustom: false,
  },
];

export function QCBoard() {
  const { user } = useAuth();

  // Final QC is the dedicated physical quality workstation
  const activeStage = 'FINAL_QC';

  // Dynamic Columns State
  const [columns, setColumns] = useState<QCColumnDefinitionDto[]>(FINAL_QC_COLUMNS);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<QCColumnDefinitionDto | null>(null);

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

  // Load columns and overrides from localStorage
  useEffect(() => {
    try {
      const savedCols = localStorage.getItem(STORAGE_KEY_QC_COLUMNS);
      if (savedCols) {
        const parsed = JSON.parse(savedCols);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumns(parsed);
        }
      }

      const savedOverrides = localStorage.getItem(STORAGE_KEY_QC_OVERRIDES);
      if (savedOverrides) {
        const parsed = JSON.parse(savedOverrides);
        if (parsed && typeof parsed === 'object') {
          setLocalCardOverrides(parsed);
        }
      }
    } catch {}
  }, []);

  const saveColumnsState = (newCols: QCColumnDefinitionDto[]) => {
    setColumns(newCols);
    try {
      localStorage.setItem(STORAGE_KEY_QC_COLUMNS, JSON.stringify(newCols));
    } catch {}
  };

  const updateCardOverride = (orderId: string, override: { status: string; holdReason?: string }) => {
    setLocalCardOverrides((prev) => {
      const updated = { ...prev, [orderId]: override };
      try {
        localStorage.setItem(STORAGE_KEY_QC_OVERRIDES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Column Management Handlers
  const handleSaveColumn = (columnData: QCColumnDefinitionDto) => {
    const existingIndex = columns.findIndex((c) => c.key === columnData.key);
    let updated: QCColumnDefinitionDto[];
    if (existingIndex >= 0) {
      updated = [...columns];
      updated[existingIndex] = columnData;
      showNotification('success', `Station "${columnData.name}" updated successfully.`);
    } else {
      updated = [...columns, columnData];
      showNotification('success', `Station "${columnData.name}" created successfully.`);
    }
    saveColumnsState(updated);
  };

  const handleDeleteColumn = (columnKey: string) => {
    const targetCol = columns.find((c) => c.key === columnKey);
    const updated = columns.filter((c) => c.key !== columnKey);
    saveColumnsState(updated);

    // Reassign jobs in deleted column to first remaining column
    const fallbackKey = updated[0]?.key || 'IN_INSPECTION';
    setLocalCardOverrides((prev) => {
      let changed = false;
      const nextOverrides = { ...prev };
      Object.keys(nextOverrides).forEach((id) => {
        if (nextOverrides[id]?.status === columnKey) {
          nextOverrides[id] = { ...nextOverrides[id], status: fallbackKey };
          changed = true;
        }
      });
      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEY_QC_OVERRIDES, JSON.stringify(nextOverrides));
        } catch {}
      }
      return nextOverrides;
    });

    showNotification('success', `Station "${targetCol?.name || columnKey}" removed.`);
  };

  const handleReorderColumns = (newCols: QCColumnDefinitionDto[]) => {
    saveColumnsState(newCols);
    showNotification('success', 'Station layout updated.');
  };

  const handleMoveColumn = (col: QCColumnDefinitionDto, direction: 'left' | 'right') => {
    const index = columns.findIndex((c) => c.key === col.key);
    if (index === -1) return;
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= columns.length) return;

    const copy = [...columns];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    saveColumnsState(copy);
  };

  const handleResetDefaults = () => {
    saveColumnsState(FINAL_QC_COLUMNS);
    showNotification('success', 'Reset to 3 standard QC stations.');
  };

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
      setTimeout(() => setSuccessBanner(null), 4000);
    } else {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(null), 6000);
    }
  };

  // Convert raw order to QC Job Card
  const convertOrderToQCJobCard = (order: any, type: 'PRE_QC' | 'FINAL_QC'): QCJobCardDto => {
    const item = order.items?.[0] || {};
    const specs = (item.specifications as any) || {};

    const override = localCardOverrides[order.id];
    let cardStatus = override?.status;

    if (!cardStatus) {
      if (order.status === 'QUALITY_CHECK') {
        cardStatus = 'IN_INSPECTION';
      } else if (order.status === 'ON_HOLD') {
        cardStatus = 'ON_HOLD';
      } else if (
        order.status === 'READY_FOR_PACKING' ||
        order.status === 'DISPATCH_QUEUE' ||
        order.status === 'DISPATCHED'
      ) {
        cardStatus = 'APPROVED';
      } else {
        cardStatus = 'IN_INSPECTION';
      }
    }

    const artworkFile =
      order.approvedArtworkVersion?.fileUrl
        ? {
          fileUrl: order.approvedArtworkVersion.fileUrl,
          storageKey: order.approvedArtworkVersion.storageKey,
          originalFileName: order.approvedArtworkVersion.originalFileName || 'Approved_Artwork.pdf',
          resolutionDpi: specs.resolutionDpi || 300,
          actualMegapixels: specs.actualMegapixels || 16,
        }
        : (item?.latestArtworkVersion?.fileUrl
        ? {
          fileUrl: item.latestArtworkVersion.fileUrl,
          storageKey: item.latestArtworkVersion.storageKey,
          originalFileName: item.latestArtworkVersion.originalFileName || 'Latest_Artwork.pdf',
          resolutionDpi: specs.resolutionDpi || 300,
          actualMegapixels: specs.actualMegapixels || 16,
        }
        : (specs?.artworkUrl
        ? {
          fileUrl: specs.artworkUrl,
          storageKey: specs.artworkStorageKey,
          originalFileName: 'Customer_Artwork',
          resolutionDpi: specs.resolutionDpi || 300,
          actualMegapixels: specs.actualMegapixels || 12,
        }
        : null));

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

  // Card counts by column
  const cardCountsByColumn = useMemo(() => {
    const map: Record<string, number> = {};
    columns.forEach((c) => {
      map[c.key] = allCards.filter((card) => card.status === c.key).length;
    });
    return map;
  }, [columns, allCards]);

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
    updateCardOverride(card.id, { status: columnKey });
    showNotification('success', `Order #${card.orderNumber} moved to ${columnKey.replace('_', ' ')}.`);
  };

  // Card Contextual Actions
  const handleCardAction = async (card: QCJobCardDto, actionType: string) => {
    if (actionType === 'START_INSPECTION') {
      setInspectCard(card);
      setIsInspectOpen(true);
    } else if (actionType === 'QUICK_PASS') {
      try {
        await api.submitQC({
          orderId: card.orderId,
          type: card.type,
          items: [{ code: 'OVERALL_PASS', name: 'Overall Quality Pass', result: 'PASS' }],
          defects: [],
          generalNotes: 'Passed via QC One-Click Sign-off',
        });
        updateCardOverride(card.id, { status: 'APPROVED' });
        showNotification('success', `Order #${card.orderNumber} Quality Approved and Released to Packing!`);
        loadQueues(true);
      } catch (err: any) {
        showNotification('error', `QC Release Error: ${err?.message || 'Failed to release order'}`);
      }
    } else if (actionType === 'FLAG_HOLD') {
      setHoldModalCard({ card, targetKey: 'ON_HOLD' });
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
        type: card.type,
        items: checks,
        defects: [],
        generalNotes: notes || 'Physical Verification Complete - Pass',
      });

      updateCardOverride(card.id, { status: 'APPROVED' });
      showNotification('success', `Order #${card.orderNumber} Certified & Transferred to Shipping.`);
      loadQueues(true);
    } catch (err: any) {
      showNotification('error', `QC Error: ${err?.message || 'Failed to complete inspection'}`);
    }
  };

  // Submit Fail from Drawer
  const handleSubmitFailFromDrawer = async (card: QCJobCardDto, defects: string[], notes: string) => {
    try {
      await api.submitQC({
        orderId: card.orderId,
        type: card.type,
        items: [{ code: 'DEFECT_FOUND', name: 'QC Fail', result: 'FAIL' }],
        defects,
        generalNotes: notes,
      });

      updateCardOverride(card.id, { status: 'ON_HOLD', holdReason: notes });
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

      updateCardOverride(card.id, { status: 'ON_HOLD', holdReason: reason });
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

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase font-bold text-slate-500 tracking-wider">
            <span>PLANT OPERATING SYSTEM</span>
            <span>•</span>
            <span className="text-slate-900">TECHNICAL QUALITY GATES</span>
            <span>•</span>
            <span className="text-slate-400 font-medium">{columns.length} Stations</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Quality Control (QC) & Inspection Operating Board
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Final Physical Product Quality Verification & Inspection Workstation (Manufacturing Gate)
          </p>
        </div>

        {/* Action Buttons: Live sync, Add, Manage & auto refresh */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto mt-2 sm:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsManagerModalOpen(true)}
            className="text-xs text-slate-700 bg-white"
          >
            <RiSettings4Line className="h-3.5 w-3.5 mr-1 text-slate-500" />
            <span>Manage Stations</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingColumn(null);
              setIsEditModalOpen(true);
            }}
            className="shadow-brand text-xs"
          >
            <RiAddLine className="h-4 w-4 mr-1" />
            <span>Add Station</span>
          </Button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition flex-1 sm:flex-initial ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
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
        {columns.map((column, index) => {
          const columnCards = allCards.filter((c) => c.status === column.key);
          return (
            <QCColumn
              key={column.id || column.key}
              column={column}
              cards={columnCards}
              onAction={handleCardAction}
              onOpenInspect={handleOpenInspect}
              onDropJob={handleDropJob}
              draggedCard={draggedCard}
              onCardDragStart={handleCardDragStart}
              onCardDragEnd={handleCardDragEnd}
              onEditColumn={(c) => {
                setEditingColumn(c);
                setIsEditModalOpen(true);
              }}
              onDeleteColumn={(c) => handleDeleteColumn(c.key)}
              onMoveColumn={handleMoveColumn}
              canMoveLeft={index > 0}
              canMoveRight={index < columns.length - 1}
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

      {/* Station Manager Modal */}
      <QCColumnManagerModal
        isOpen={isManagerModalOpen}
        columns={columns}
        cardCounts={cardCountsByColumn}
        onClose={() => setIsManagerModalOpen(false)}
        onReorder={handleReorderColumns}
        onEditColumn={(col) => {
          setEditingColumn(col);
          setIsEditModalOpen(true);
        }}
        onDeleteColumn={handleDeleteColumn}
        onAddNewColumn={() => {
          setEditingColumn(null);
          setIsEditModalOpen(true);
        }}
        onResetDefaults={handleResetDefaults}
      />

      {/* Station Add / Edit Modal */}
      <QCColumnEditModal
        isOpen={isEditModalOpen}
        column={editingColumn}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingColumn(null);
        }}
        onSave={handleSaveColumn}
        onDelete={handleDeleteColumn}
      />
    </div>
  );
}
