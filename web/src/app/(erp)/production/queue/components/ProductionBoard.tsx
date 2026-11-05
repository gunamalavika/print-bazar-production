'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  api,
  ProductionBoardResponseDto,
  KanbanColumnDto,
  KanbanCardDto,
} from '@/lib/api';
import { ProductionMetrics } from './ProductionMetrics';
import { ProductionFilters } from './ProductionFilters';
import { ProductionColumn } from './ProductionColumn';
import { AddColumnModal } from './AddColumnModal';
import { HoldReasonModal } from './HoldReasonModal';
import { ManagerOverrideModal } from './ManagerOverrideModal';
import { BoardSettingsModal } from './BoardSettingsModal';
import {
  RiRefreshLine,
  RiAddLine,
  RiSettings4Line,
  RiPrinterLine,
  RiAlertFill,
  RiCheckFill,
  RiFlashlightLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

export function ProductionBoard() {
  const { user } = useAuth();

  // Board Data State
  const [boardData, setBoardData] = useState<ProductionBoardResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [machineId, setMachineId] = useState('ALL');
  const [operatorId, setOperatorId] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [slaStatus, setSlaStatus] = useState('ALL');

  // Drag and Drop State
  const [draggedCard, setDraggedCard] = useState<KanbanCardDto | null>(null);

  // Modals State
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [holdModalCard, setHoldModalCard] = useState<{ card: KanbanCardDto; targetKey: string } | null>(null);
  const [overrideModalCard, setOverrideModalCard] = useState<{ card: KanbanCardDto; targetKey: string } | null>(null);

  // Auto-polling interval toggle
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch Board Data
  const loadBoard = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await api.getProductionBoard({
        search: search || undefined,
        machineId: machineId !== 'ALL' ? machineId : undefined,
        operatorId: operatorId !== 'ALL' ? operatorId : undefined,
        priority: priority !== 'ALL' ? priority : undefined,
        slaStatus: slaStatus !== 'ALL' ? slaStatus : undefined,
      });
      setBoardData(data);
      setErrorBanner(null);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to load shop floor production board.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, machineId, operatorId, priority, slaStatus]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Polling every 15 seconds for live shop-floor sync
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadBoard(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadBoard]);

  const showNotification = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(null), 4000);
    } else {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(null), 6000);
    }
  };

  // Drag Start / End
  const handleCardDragStart = (e: React.DragEvent, card: KanbanCardDto) => {
    setDraggedCard(card);
    e.dataTransfer.setData('text/plain', card.id);
  };

  const handleCardDragEnd = () => {
    setDraggedCard(null);
  };

  // Perform backend transition with validation and rollback
  const executeTransition = async (
    jobId: string,
    targetKey: string,
    reason?: string,
    managerOverrideReason?: string,
  ) => {
    try {
      await api.transitionProductionJob(jobId, {
        targetColumnKey: targetKey,
        reason,
        managerOverrideReason,
      });

      showNotification('success', `Job successfully advanced to ${targetKey.replace(/_/g, ' ')}.`);
      await loadBoard(true);
    } catch (err: any) {
      const errorMsg = err?.message || 'Invalid production transition.';
      showNotification('error', errorMsg);
      await loadBoard(true); // Re-fetch to ensure clean state rollback
    }
  };

  // Handle Drag Drop Target
  const handleDropJob = async (targetColumnKey: string, card: KanbanCardDto) => {
    // If dropping into same logical column, do nothing
    const currentColumn = boardData?.columns.find((c) => c.cards.some((cd) => cd.id === card.id));
    if (currentColumn?.key === targetColumnKey) return;

    // Check if transition is to a Hold column (requires reason)
    const isHoldTarget =
      targetColumnKey.includes('HOLD') ||
      targetColumnKey.includes('REWORK') ||
      targetColumnKey.includes('ISSUE');

    if (isHoldTarget) {
      setHoldModalCard({ card, targetKey: targetColumnKey });
      return;
    }

    // Check if out-of-sequence override (for Admin)
    const isStandardAllowed = card.allowedTransitions.includes(targetColumnKey);
    if (!isStandardAllowed && user?.role === 'ADMIN_MANAGER') {
      setOverrideModalCard({ card, targetKey: targetColumnKey });
      return;
    }

    // Standard valid transition
    await executeTransition(card.id, targetColumnKey);
  };

  // Handle Quick Actions directly from Cards
  const handleCardAction = async (card: KanbanCardDto, actionType: string) => {
    switch (actionType) {
      case 'START_PRINTING':
        await executeTransition(card.id, 'PRINTING');
        break;
      case 'COMPLETE_PRINTING':
        await executeTransition(card.id, 'FINISHING');
        break;
      case 'COMPLETE_FINISHING':
        await executeTransition(card.id, 'FINAL_QC');
        break;
      case 'QC_PASS':
        await executeTransition(card.id, 'PACKING');
        break;
      case 'QC_FAIL':
        setHoldModalCard({ card, targetKey: 'REWORK' });
        break;
      case 'COMPLETE_PACKING':
        await executeTransition(card.id, 'READY_FOR_DISPATCH');
        break;
      case 'DISPATCH':
        await executeTransition(card.id, 'DISPATCHED');
        break;
      default:
        break;
    }
  };

  // Handle Add Custom Column
  const handleCreateColumn = async (data: any) => {
    await api.createProductionColumn(data);
    showNotification('success', `Created custom column "${data.name}".`);
    await loadBoard(true);
  };

  // Handle Column Reorder
  const handleReorderColumns = async (columnOrders: any[]) => {
    await api.reorderProductionColumns(columnOrders);
    showNotification('success', 'Column order updated.');
    await loadBoard(true);
  };

  // Handle Column Archive
  const handleArchiveColumn = async (id: string) => {
    await api.archiveProductionColumn(id);
    showNotification('success', 'Column archived.');
    await loadBoard(true);
  };

  const hasActiveFilters =
    search !== '' ||
    machineId !== 'ALL' ||
    operatorId !== 'ALL' ||
    priority !== 'ALL' ||
    slaStatus !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setMachineId('ALL');
    setOperatorId('ALL');
    setPriority('ALL');
    setSlaStatus('ALL');
  };

  const canManageBoard = user?.role === 'ADMIN_MANAGER';

  return (
    <div className="mx-auto max-w-[1920px] space-y-5 select-none pb-12">
      {/* 1. Header & Live Telemetry Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4 bg-white p-5 rounded-2xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              SHOP FLOOR PRODUCTION
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{boardData?.shiftInfo?.liveStatus || 'PRESS ONLINE'}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 font-medium">
              • {boardData?.shiftInfo?.shiftName || 'Shift A'}
            </span>
          </div>

          <h1 className="text-[22px] sm:text-[26px] font-bold text-slate-900 tracking-tight leading-tight">
            Production Kanban Operating Board
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Real-time manufacturing stream • Machine press execution • QC release • Station handover
          </p>
        </div>

        {/* Top Control Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {canManageBoard && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
                className="text-xs text-slate-700 bg-white"
              >
                <RiSettings4Line className="h-3.5 w-3.5 mr-1 text-slate-500" />
                <span>Board Settings</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddColumnOpen(true)}
                className="shadow-brand text-xs"
              >
                <RiAddLine className="h-4 w-4 mr-1" />
                <span>Add Column</span>
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadBoard()}
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

      {/* 2. Top Manufacturing Metrics */}
      {boardData && (
        <ProductionMetrics
          metrics={boardData.metrics}
          shiftInfo={boardData.shiftInfo}
        />
      )}

      {/* 3. Search & Filter Bar */}
      {boardData && (
        <ProductionFilters
          search={search}
          onSearchChange={setSearch}
          machineId={machineId}
          onMachineChange={setMachineId}
          operatorId={operatorId}
          onOperatorChange={setOperatorId}
          priority={priority}
          onPriorityChange={setPriority}
          slaStatus={slaStatus}
          onSlaStatusChange={setSlaStatus}
          availableMachines={boardData.availableMachines}
          availableOperators={boardData.availableOperators}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      )}

      {/* 4. Horizontal Kanban Board Canvas */}
      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs font-mono text-slate-500">
          <div className="h-8 w-8 border-2 border-[#FFED00] border-t-slate-900 rounded-full animate-spin mb-3" />
          <span>INITIALIZING SHOP FLOOR PRODUCTION KANBAN...</span>
        </div>
      ) : boardData ? (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex items-start gap-4 min-w-max pr-6">
            {boardData.columns
              .filter((column) => column.key !== 'READY_FOR_PRODUCTION')
              .map((column) => (
                <ProductionColumn
                  key={column.id}
                  column={column}
                  userRole={user?.role}
                  onAction={handleCardAction}
                  onDropJob={handleDropJob}
                  draggedCard={draggedCard}
                  onCardDragStart={handleCardDragStart}
                  onCardDragEnd={handleCardDragEnd}
                />
              ))}
          </div>
        </div>
      ) : null}

      {/* 5. Modals */}
      <AddColumnModal
        isOpen={isAddColumnOpen}
        onClose={() => setIsAddColumnOpen(false)}
        onSubmit={handleCreateColumn}
      />

      {holdModalCard && (
        <HoldReasonModal
          isOpen={!!holdModalCard}
          card={holdModalCard.card}
          targetColumnName={holdModalCard.targetKey}
          onClose={() => setHoldModalCard(null)}
          onSubmit={async (reason) => {
            await executeTransition(holdModalCard.card.id, holdModalCard.targetKey, reason);
          }}
        />
      )}

      {overrideModalCard && (
        <ManagerOverrideModal
          isOpen={!!overrideModalCard}
          card={overrideModalCard.card}
          targetColumnName={overrideModalCard.targetKey}
          onClose={() => setOverrideModalCard(null)}
          onSubmit={async (reason) => {
            await executeTransition(
              overrideModalCard.card.id,
              overrideModalCard.targetKey,
              undefined,
              reason,
            );
          }}
        />
      )}

      {boardData && (
        <BoardSettingsModal
          isOpen={isSettingsOpen}
          columns={boardData.columns.filter((c) => c.key !== 'READY_FOR_PRODUCTION')}
          onClose={() => setIsSettingsOpen(false)}
          onReorder={handleReorderColumns}
          onArchiveColumn={handleArchiveColumn}
        />
      )}
    </div>
  );
}
