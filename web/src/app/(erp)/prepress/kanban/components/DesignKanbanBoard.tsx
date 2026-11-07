'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { DesignKanbanMetrics } from './DesignKanbanMetrics';
import { DesignKanbanFilters } from './DesignKanbanFilters';
import { DesignKanbanColumn } from './DesignKanbanColumn';
import { DesignCardItem, DesignKanbanStage } from './DesignJobCard';
import { DesignJobInspectModal } from './DesignJobInspectModal';
import {
  RiRefreshLine,
  RiFileList3Line,
  RiAlertFill,
  RiCheckFill,
  RiPaintBrushLine,
  RiFileSearchLine,
  RiTimeLine,
  RiPrinterLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

interface ColumnConfig {
  key: DesignKanbanStage;
  name: string;
  subtitle: string;
  color: string;
  description: string;
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  {
    key: 'ARTWORK_CHECK',
    name: 'Artwork Check',
    subtitle: 'File Verification & Preflight Audit',
    color: '#0284C7', // Sky-600
    description: 'Initial intake, bleed audit, resolution check, defect detection.',
  },
  {
    key: 'DESIGNING',
    name: 'Designing',
    subtitle: 'Active Design Studio & Layout',
    color: '#F59E0B', // Amber-500
    description: 'Assigned designer layout drafting & personalized artwork generation.',
  },
  {
    key: 'WAITING_FOR_APPROVAL',
    name: 'Waiting for Approval',
    subtitle: 'Proof Sign-Off & Customer Review',
    color: '#8B5CF6', // Purple-500
    description: 'Proof sent to customer or waiting for OE confirmation.',
  },
  {
    key: 'READY_TO_PRINT',
    name: 'Ready to Print',
    subtitle: 'Proof Approved & Press Ready',
    color: '#10B981', // Emerald-500
    description: 'Approved artwork locked & passed to machine production queue.',
  },
];

// Helper to determine initial kanban stage from order data
function deduceKanbanStage(order: any): DesignKanbanStage {
  const status = String(order.status || '').toUpperCase();
  const allItemVersions = (order.items || []).flatMap((it: any) => it.artworkVersions || []);
  const hasApprovedProof =
    order.approvedArtworkVersionId ||
    order.approvedArtworkVersion ||
    allItemVersions.some((v: any) => v.isApproved || v.status === 'PROOF_APPROVED');

  if (hasApprovedProof || status === 'ARTWORK_APPROVED' || order.isPassedToProduction) {
    return 'READY_TO_PRINT';
  }

  if (status === 'CUSTOMER_APPROVAL_REQUIRED') {
    return 'WAITING_FOR_APPROVAL';
  }

  // If order was returned for revisions or is active in design
  if (
    status === 'DESIGN_REQUIRED' ||
    order.assignedDesignerId ||
    (order.items || []).some((it: any) => (it.specifications as any)?.artworkSource === 'DESIGN_TEAM')
  ) {
    return 'DESIGNING';
  }

  return 'ARTWORK_CHECK';
}

export function DesignKanbanBoard() {
  const { user } = useAuth();

  // Raw queue items from backend
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  // Local stage override map (orderId -> stage)
  const [stageOverrides, setStageOverrides] = useState<Record<string, DesignKanbanStage>>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [designerFilter, setDesignerFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Drag-and-drop state
  const [draggedCard, setDraggedCard] = useState<DesignCardItem | null>(null);

  // Inspect Modal State
  const [inspectModalCard, setInspectModalCard] = useState<DesignCardItem | null>(null);

  const showNotification = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(null), 4000);
    } else {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(null), 6000);
    }
  };

  // Fetch Design Queue from backend
  const loadQueue = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await api.getDesignQueue(search || undefined, 'all', 'all');
      setRawOrders(Array.isArray(data) ? data : []);
      setErrorBanner(null);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to load design queue stream.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Polling every 15 seconds for live sync
  useEffect(() => {
    const timer = setInterval(() => {
      loadQueue(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [loadQueue]);

  // Transform raw orders into standardized DesignCardItem objects
  const allCards = useMemo<DesignCardItem[]>(() => {
    return rawOrders.map((o) => {
      const item = o.items?.[0] || {};
      const specs = (item.specifications as any) || {};
      const deduced = stageOverrides[o.id] || deduceKanbanStage(o);

      const customerPhone =
        o.customer?.phone ||
        specs.customerPhone ||
        specs.phone ||
        specs.contactPhone ||
        undefined;

      const priority: 'URGENT' | 'HIGH' | 'STANDARD' =
        specs.priority === 'URGENT' || specs.rushOrder || o.priority === 'URGENT'
          ? 'URGENT'
          : specs.priority === 'HIGH' || o.priority === 'HIGH'
          ? 'HIGH'
          : 'STANDARD';

      const artworkUrl =
        o.artworkUrl ||
        item.artworkUrl ||
        specs.artworkUrl ||
        specs.artworkFile?.fileUrl ||
        item.latestArtworkVersion?.fileUrl ||
        null;

      const artworkFileName =
        specs.artworkFile?.originalFileName ||
        specs.artworkFile?.fileName ||
        item.latestArtworkVersion?.originalFileName ||
        (artworkUrl ? 'Customer_Artwork.pdf' : undefined);

      return {
        id: o.id,
        orderId: o.id,
        orderNumber: o.orderNumber,
        stage: deduced,
        currentStatus: o.currentStatus || o.status,
        customerName: o.customer?.fullName || o.customerName || 'Direct Customer',
        companyName: o.customer?.companyName || o.companyName || undefined,
        customerPhone,
        customerEmail: o.customer?.email || undefined,
        productName: item.productName || o.productName || 'Custom Print Job',
        quantity: item.quantity || o.quantity || 1,
        priority,
        specifications: specs,
        customerNotes: o.customerNotes || item.designNotes || specs.designNotes || null,
        designNotes: item.designNotes || specs.designNotes || null,
        revisionDirectives: o.revisionDirectives || null,
        returnedBy: o.returnedBy || null,
        returnedAt: o.returnedAt || null,
        assignedDesignerId: o.assignedDesignerId || null,
        assignedDesignerName: o.assignedDesignerName || o.assignedDesigner?.fullName || null,
        assignedDesigner: o.assignedDesigner || null,
        artworkUrl,
        artworkFileName,
        artworkFile: specs.artworkFile || null,
        latestArtworkVersion: item.latestArtworkVersion || null,
        approvedArtworkVersion: o.approvedArtworkVersion || null,
        createdAt: o.createdAt,
        dueAt: o.dueAt || undefined,
      };
    });
  }, [rawOrders, stageOverrides]);

  // Extract available designers for filter
  const availableDesigners = useMemo(() => {
    const map = new Map<string, string>();
    allCards.forEach((c) => {
      if (c.assignedDesignerId && c.assignedDesignerName) {
        map.set(c.assignedDesignerId, c.assignedDesignerName);
      }
    });
    return Array.from(map.entries()).map(([id, fullName]) => ({ id, fullName }));
  }, [allCards]);

  // Apply Search & Dropdown Filters
  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      // Stage Filter
      if (stageFilter !== 'ALL' && card.stage !== stageFilter) {
        return false;
      }

      // Designer Filter
      if (designerFilter === 'UNASSIGNED') {
        if (card.assignedDesignerId) return false;
      } else if (designerFilter !== 'ALL') {
        if (card.assignedDesignerId !== designerFilter) return false;
      }

      // Priority Filter
      if (priorityFilter !== 'ALL' && card.priority !== priorityFilter) {
        return false;
      }

      // Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchOrder = card.orderNumber.toLowerCase().includes(q);
        const matchCustomer =
          (card.customerName && card.customerName.toLowerCase().includes(q)) ||
          (card.companyName && card.companyName.toLowerCase().includes(q));
        const matchProduct = card.productName.toLowerCase().includes(q);
        if (!matchOrder && !matchCustomer && !matchProduct) return false;
      }

      return true;
    });
  }, [allCards, stageFilter, designerFilter, priorityFilter, search]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    return {
      totalActive: allCards.length,
      artworkCheck: allCards.filter((c) => c.stage === 'ARTWORK_CHECK').length,
      designing: allCards.filter((c) => c.stage === 'DESIGNING').length,
      waitingApproval: allCards.filter((c) => c.stage === 'WAITING_FOR_APPROVAL').length,
      readyToPrint: allCards.filter((c) => c.stage === 'READY_TO_PRINT').length,
      revisions: allCards.filter((c) => Boolean(c.revisionDirectives)).length,
    };
  }, [allCards]);

  // Perform backend transition with rollback
  const handleTransitionStage = async (
    card: DesignCardItem,
    targetStage: DesignKanbanStage,
    notes?: string,
  ) => {
    const previousStage = card.stage;
    // Optimistic Update
    setStageOverrides((prev) => ({ ...prev, [card.orderId]: targetStage }));

    try {
      await api.updateDesignKanbanStage(card.orderId, {
        stage: targetStage,
        notes,
      });

      showNotification('success', `Job ${card.orderNumber} advanced to ${targetStage.replace(/_/g, ' ')}.`);
      await loadQueue(true);
    } catch (err: any) {
      // Rollback on error
      setStageOverrides((prev) => ({ ...prev, [card.orderId]: previousStage }));
      showNotification('error', err?.message || 'Failed to update stage transition.');
      await loadQueue(true);
    }
  };

  // Drag Drop Handlers
  const handleCardDragStart = (e: React.DragEvent, card: DesignCardItem) => {
    setDraggedCard(card);
    e.dataTransfer.setData('text/plain', card.id);
  };

  const handleCardDragEnd = () => {
    setDraggedCard(null);
  };

  const handleDropJob = async (targetColumnKey: DesignKanbanStage, card: DesignCardItem) => {
    if (card.stage === targetColumnKey) return;
    await handleTransitionStage(card, targetColumnKey);
  };

  const hasActiveFilters =
    search !== '' ||
    stageFilter !== 'ALL' ||
    designerFilter !== 'ALL' ||
    priorityFilter !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setStageFilter('ALL');
    setDesignerFilter('ALL');
    setPriorityFilter('ALL');
  };

  return (
    <div className="mx-auto max-w-[1920px] space-y-5 select-none pb-12">
      {/* 1. Header & Live Telemetry Bar (Exact Match with /production/queue) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4 bg-white p-5 rounded-2xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              PREPRESS & DESIGN STUDIO
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>DESIGN PIPELINE ACTIVE</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 font-medium">
              • 4 Quality Gates
            </span>
          </div>

          <h1 className="text-[22px] sm:text-[26px] font-bold text-slate-900 tracking-tight leading-tight">
            Design Department Process Kanban
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Artwork Check • Designing • Waiting for Approval • Ready to Print Gate Handover
          </p>
        </div>

        {/* Top Control Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/prepress/artwork">
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-slate-700 bg-white"
            >
              <RiFileList3Line className="h-3.5 w-3.5 mr-1 text-slate-500" />
              <span>Prepress Table View</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadQueue()}
            disabled={isRefreshing}
            className="text-xs bg-white text-slate-700"
          >
            <RiRefreshLine
              className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? 'animate-spin text-[#E3A008]' : ''}`}
            />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Notification Toasts */}
      {errorBanner && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in slide-in-from-top-2">
          <RiAlertFill className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 font-medium">{errorBanner}</div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-400 hover:text-rose-700 font-mono">
            ✕
          </button>
        </div>
      )}

      {successBanner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-medium animate-in fade-in slide-in-from-top-2">
          <RiCheckFill className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* 2. Top Design Department Metrics (Exact Match with /production/queue) */}
      <DesignKanbanMetrics metrics={metrics} />

      {/* 3. Search & Filter Bar (Exact Match with /production/queue) */}
      <DesignKanbanFilters
        search={search}
        onSearchChange={setSearch}
        stageFilter={stageFilter}
        onStageChange={setStageFilter}
        designerFilter={designerFilter}
        onDesignerChange={setDesignerFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        availableDesigners={availableDesigners}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        totalCount={allCards.length}
        filteredCount={filteredCards.length}
      />

      {/* 4. Horizontal Kanban Board Canvas (Exact Match with /production/queue) */}
      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs font-mono text-slate-500">
          <div className="h-8 w-8 border-2 border-[#FFED00] border-t-slate-900 rounded-full animate-spin mb-3" />
          <span>INITIALIZING DESIGN DEPARTMENT KANBAN PIPELINE...</span>
        </div>
      ) : (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex items-start gap-4 min-w-max pr-6">
            {KANBAN_COLUMNS.map((col) => {
              const columnCards = filteredCards.filter((card) => card.stage === col.key);
              return (
                <DesignKanbanColumn
                  key={col.key}
                  column={col}
                  cards={columnCards}
                  userRole={user?.role}
                  onAdvanceStage={handleTransitionStage}
                  onInspect={(card) => setInspectModalCard(card)}
                  onDropJob={handleDropJob}
                  draggedCard={draggedCard}
                  onCardDragStart={handleCardDragStart}
                  onCardDragEnd={handleCardDragEnd}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Detailed Inspect Proofs & Stage Modal */}
      <DesignJobInspectModal
        isOpen={Boolean(inspectModalCard)}
        card={inspectModalCard}
        onClose={() => setInspectModalCard(null)}
        onUpdateStage={handleTransitionStage}
      />
    </div>
  );
}

