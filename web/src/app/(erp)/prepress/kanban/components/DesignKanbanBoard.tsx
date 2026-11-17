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
  DesignColumnEditModal,
  PrepressColumnConfig,
} from './DesignColumnEditModal';
import { DesignColumnManagerModal } from './DesignColumnManagerModal';
import {
  RiRefreshLine,
  RiFileList3Line,
  RiAlertFill,
  RiCheckFill,
  RiAddLine,
  RiSettings4Line,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

const STORAGE_KEY_COLUMNS = 'pb_kanban_columns_prepress';
const STORAGE_KEY_OVERRIDES = 'pb_kanban_prepress_card_stages';

const DEFAULT_PREPRESS_COLUMNS: PrepressColumnConfig[] = [
  {
    key: 'ARTWORK_CHECK',
    name: 'Artwork Check',
    subtitle: 'File Verification & Preflight Audit',
    color: '#0284C7', // Sky-600
    description: 'Initial intake, bleed audit, resolution check, defect detection.',
    isCustom: false,
  },
  {
    key: 'DESIGNING',
    name: 'Designing',
    subtitle: 'Active Design Studio & Layout',
    color: '#F59E0B', // Amber-500
    description: 'Assigned designer layout drafting & personalized artwork generation.',
    isCustom: false,
  },
  {
    key: 'WAITING_FOR_APPROVAL',
    name: 'Waiting for Approval',
    subtitle: 'Proof Sign-Off & Customer Review',
    color: '#8B5CF6', // Purple-500
    description: 'Proof sent to customer or waiting for OE confirmation.',
    isCustom: false,
  },
  {
    key: 'READY_TO_PRINT',
    name: 'Ready to Print',
    subtitle: 'Proof Approved & Press Ready',
    color: '#10B981', // Emerald-500
    description: 'Approved artwork locked & passed to machine production queue.',
    isCustom: false,
  },
];

// Helper to determine initial kanban stage from order data
function deduceKanbanStage(order: any): DesignKanbanStage {
  const status = String(order.status || '').toUpperCase();

  // 1. Explicit Order Status mapping (highest fidelity)
  if (status === 'CUSTOMER_APPROVAL_REQUIRED') {
    return 'WAITING_FOR_APPROVAL';
  }

  if (
    status === 'ARTWORK_APPROVED' ||
    status === 'PRE_PRODUCTION_QC' ||
    status === 'PRODUCTION_QUEUE' ||
    status === 'PRINTING' ||
    status === 'FINISHING' ||
    status === 'QUALITY_CHECK' ||
    order.isPassedToProduction
  ) {
    return 'READY_TO_PRINT';
  }

  // 2. Secondary heuristics if status is generic or ambiguous
  const allItemVersions = (order.items || []).flatMap((it: any) => it.artworkVersions || []);
  const hasApprovedProof =
    order.approvedArtworkVersionId ||
    order.approvedArtworkVersion ||
    allItemVersions.some((v: any) => v.isApproved || v.status === 'PROOF_APPROVED');

  if (hasApprovedProof) {
    return 'READY_TO_PRINT';
  }

  // Candidate proofs/artworks submitted awaiting review
  const allVersions = order.allArtworkVersions || [];
  if (allItemVersions.length > 0 || allVersions.length > 0 || Boolean(order.latestArtworkVersion)) {
    return 'WAITING_FOR_APPROVAL';
  }

  // If order was returned for revisions with directives
  if (order.revisionDirectives) {
    return 'DESIGNING';
  }

  // Default: When OE assigns the design task to designer, keep in 1st Kanban column (ARTWORK_CHECK)
  return 'ARTWORK_CHECK';
}

export function DesignKanbanBoard() {
  const { user } = useAuth();

  // Raw queue items from backend
  const [rawOrders, setRawOrders] = useState<any[]>([]);

  // Columns Configuration
  const [columns, setColumns] = useState<PrepressColumnConfig[]>(DEFAULT_PREPRESS_COLUMNS);

  // Modals for Column Management
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<PrepressColumnConfig | null>(null);

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
  const draggedCardRef = React.useRef<DesignCardItem | null>(null);

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

  // Load custom columns and stage overrides from localStorage on mount
  useEffect(() => {
    try {
      const savedCols = localStorage.getItem(STORAGE_KEY_COLUMNS);
      if (savedCols) {
        const parsed = JSON.parse(savedCols);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumns(parsed);
        }
      }

      const savedOverrides = localStorage.getItem(STORAGE_KEY_OVERRIDES);
      if (savedOverrides) {
        const parsed = JSON.parse(savedOverrides);
        if (parsed && typeof parsed === 'object') {
          setStageOverrides(parsed);
        }
      }
    } catch { }
  }, []);

  const saveColumnsState = (newCols: PrepressColumnConfig[]) => {
    setColumns(newCols);
    try {
      localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(newCols));
    } catch { }
  };

  const updateStageOverride = (orderId: string, stage: DesignKanbanStage) => {
    setStageOverrides((prev) => {
      const updated = { ...prev, [orderId]: stage };
      try {
        localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  // Column Management Handlers
  const handleSaveColumn = (columnData: PrepressColumnConfig) => {
    const existingIndex = columns.findIndex((c) => c.key === columnData.key);
    let updated: PrepressColumnConfig[];
    if (existingIndex >= 0) {
      updated = [...columns];
      updated[existingIndex] = columnData;
      showNotification('success', `Column "${columnData.name}" updated successfully.`);
    } else {
      updated = [...columns, columnData];
      showNotification('success', `Column "${columnData.name}" created successfully.`);
    }
    saveColumnsState(updated);
  };

  const handleDeleteColumn = (columnKey: string) => {
    const targetCol = columns.find((c) => c.key === columnKey);
    const updated = columns.filter((c) => c.key !== columnKey);
    saveColumnsState(updated);

    // Reassign any jobs currently in deleted column to first remaining column or ARTWORK_CHECK
    const fallbackStage = updated[0]?.key || 'ARTWORK_CHECK';
    setStageOverrides((prev) => {
      let changed = false;
      const nextOverrides = { ...prev };
      Object.keys(nextOverrides).forEach((id) => {
        if (nextOverrides[id] === columnKey) {
          nextOverrides[id] = fallbackStage;
          changed = true;
        }
      });
      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(nextOverrides));
        } catch { }
      }
      return nextOverrides;
    });

    showNotification('success', `Column "${targetCol?.name || columnKey}" removed.`);
  };

  const handleReorderColumns = (newCols: PrepressColumnConfig[]) => {
    saveColumnsState(newCols);
    showNotification('success', 'Column order updated.');
  };

  const handleMoveColumn = (col: PrepressColumnConfig, direction: 'left' | 'right') => {
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
    saveColumnsState(DEFAULT_PREPRESS_COLUMNS);
    showNotification('success', 'Reset to 4 default Prepress quality gates.');
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

  // Column card counts map
  const cardCountsByColumn = useMemo(() => {
    const map: Record<string, number> = {};
    columns.forEach((c) => {
      map[c.key] = allCards.filter((card) => card.stage === c.key).length;
    });
    return map;
  }, [columns, allCards]);

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

  // Perform transition stage (backend call for core stages, localStorage for custom)
  const handleTransitionStage = async (
    card: DesignCardItem,
    targetStage: DesignKanbanStage,
    notes?: string,
  ) => {
    const previousStage = card.stage;
    updateStageOverride(card.orderId, targetStage);

    const isCoreStage = [
      'ARTWORK_CHECK',
      'DESIGNING',
      'WAITING_FOR_APPROVAL',
      'READY_TO_PRINT',
    ].includes(targetStage);

    if (isCoreStage) {
      try {
        await api.updateDesignKanbanStage(card.orderId, {
          stage: targetStage as any,
          notes,
        });
        showNotification('success', `Job ${card.orderNumber} advanced to ${targetStage.replace(/_/g, ' ')}.`);
        await loadQueue(true);
      } catch (err: any) {
        updateStageOverride(card.orderId, previousStage);
        showNotification('error', err?.message || 'Failed to update stage transition.');
        await loadQueue(true);
      }
    } else {
      showNotification('success', `Job ${card.orderNumber} moved to ${targetStage.replace(/_/g, ' ')}.`);
    }
  };

  // Drag Drop Handlers
  const handleCardDragStart = (e: React.DragEvent, card: DesignCardItem) => {
    draggedCardRef.current = card;
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ id: card.id, orderId: card.orderId, stage: card.stage })
    );
  };

  const handleCardDragEnd = () => {
    setTimeout(() => {
      draggedCardRef.current = null;
      setDraggedCard(null);
    }, 150);
  };

  const handleDropJob = async (
    targetColumnKey: DesignKanbanStage,
    cardOrId: DesignCardItem | string,
  ) => {
    let card: DesignCardItem | undefined;
    if (typeof cardOrId === 'string') {
      card = allCards.find((c) => c.id === cardOrId || c.orderId === cardOrId);
    } else {
      card = cardOrId;
    }
    if (!card && draggedCardRef.current) {
      card = draggedCardRef.current;
    }

    if (!card || card.stage === targetColumnKey) return;
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
      {/* 1. Header & Live Telemetry Bar */}
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
              • {columns.length} Quality Gates
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
            onClick={() => setIsManagerModalOpen(true)}
            className="text-xs text-slate-700 bg-white"
          >
            <RiSettings4Line className="h-3.5 w-3.5 mr-1 text-slate-500" />
            <span>Manage Columns</span>
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
            <span>Add Column</span>
          </Button>

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

      {/* 2. Top Design Department Metrics */}
      <DesignKanbanMetrics metrics={metrics} />

      {/* 3. Search & Filter Bar */}
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
        columns={columns}
      />

      {/* 4. Horizontal Kanban Board Canvas */}
      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs font-mono text-slate-500">
          <div className="h-8 w-8 border-2 border-[#FFED00] border-t-slate-900 rounded-full animate-spin mb-3" />
          <span>INITIALIZING DESIGN DEPARTMENT KANBAN PIPELINE...</span>
        </div>
      ) : (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex items-start gap-4 min-w-max pr-6">
            {columns.map((col, index) => {
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
        </div>
      )}

      {/* 5. Detailed Inspect Proofs & Stage Modal */}
      <DesignJobInspectModal
        isOpen={Boolean(inspectModalCard)}
        card={inspectModalCard}
        onClose={() => setInspectModalCard(null)}
        onUpdateStage={handleTransitionStage}
      />

      {/* 6. Column Manager Modal (Reorder, Delete, Add, Reset) */}
      <DesignColumnManagerModal
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

      {/* 7. Column Add / Edit Modal */}
      <DesignColumnEditModal
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
