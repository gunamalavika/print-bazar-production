'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { FinanceMetrics } from './FinanceMetrics';
import { FinanceFilters } from './FinanceFilters';
import { FinanceColumn, FinanceColumnDefinitionDto } from './FinanceColumn';
import { FinanceCardDto } from './FinanceJobCard';
import { RecordManualPaymentModal } from './RecordManualPaymentModal';
import { InvoiceDrawer } from './InvoiceDrawer';
import { FinanceColumnEditModal } from './FinanceColumnEditModal';
import { FinanceColumnManagerModal } from './FinanceColumnManagerModal';
import {
  RiRefreshLine,
  RiCheckFill,
  RiAlertFill,
  RiAddLine,
  RiSettings4Line,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

const STORAGE_KEY_FINANCE_COLUMNS = 'pb_kanban_columns_finance';
const STORAGE_KEY_FINANCE_OVERRIDES = 'pb_kanban_finance_card_stages';

const DEFAULT_FINANCE_COLUMNS: FinanceColumnDefinitionDto[] = [
  {
    id: 'col-pending',
    key: 'PAYMENT_PENDING',
    name: '1. Payment Pending',
    description: 'Awaiting Gateway / UPI Clearance',
    color: '#F59E0B',
    type: 'SYSTEM',
  },
  {
    id: 'col-corporate',
    key: 'CORPORATE_CREDIT',
    name: '2. Corporate Credit',
    description: 'B2B Net-30 Invoiced Terms',
    color: '#8B5CF6',
    type: 'SYSTEM',
  },
  {
    id: 'col-settled',
    key: 'SETTLED',
    name: '3. Settled & Cleared',
    description: '100% Paid & Tax Invoice Generated',
    color: '#10B981',
    type: 'APPROVED',
  },
  {
    id: 'col-overdue',
    key: 'OVERDUE',
    name: '4. Overdue & Recovery',
    description: 'Past Due Date / Payment Follow-up',
    color: '#EF4444',
    type: 'HOLD',
  },
];

export function FinanceBoard() {
  const { user } = useAuth();

  // Columns State
  const [columns, setColumns] = useState<FinanceColumnDefinitionDto[]>(DEFAULT_FINANCE_COLUMNS);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<FinanceColumnDefinitionDto | null>(null);

  // Local Stage Overrides (orderId -> financeStatus)
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({});

  // Board Data
  const [rawCards, setRawCards] = useState<FinanceCardDto[]>([]);
  const [metrics, setMetrics] = useState({
    totalGrossBilling: 0,
    gstCollected: 0,
    settledAmount: 0,
    pendingAmount: 0,
    corporateCreditAmount: 0,
    overdueAmount: 0,
    collectionRate: 100,
    pendingCount: 0,
    corporateCount: 0,
    settledCount: 0,
    overdueCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [method, setMethod] = useState('ALL');
  const [priority, setPriority] = useState('ALL');

  // Drag and Drop State
  const [draggedCard, setDraggedCard] = useState<FinanceCardDto | null>(null);

  // Modals State
  const [payModalCard, setPayModalCard] = useState<FinanceCardDto | null>(null);
  const [invoiceCard, setInvoiceCard] = useState<FinanceCardDto | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Auto-polling toggle
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load custom columns and overrides from localStorage
  useEffect(() => {
    try {
      const savedCols = localStorage.getItem(STORAGE_KEY_FINANCE_COLUMNS);
      if (savedCols) {
        const parsed = JSON.parse(savedCols);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumns(parsed);
        }
      }

      const savedOverrides = localStorage.getItem(STORAGE_KEY_FINANCE_OVERRIDES);
      if (savedOverrides) {
        const parsed = JSON.parse(savedOverrides);
        if (parsed && typeof parsed === 'object') {
          setStageOverrides(parsed);
        }
      }
    } catch {}
  }, []);

  const saveColumnsState = (newCols: FinanceColumnDefinitionDto[]) => {
    setColumns(newCols);
    try {
      localStorage.setItem(STORAGE_KEY_FINANCE_COLUMNS, JSON.stringify(newCols));
    } catch {}
  };

  const updateStageOverride = (orderId: string, status: string) => {
    setStageOverrides((prev) => {
      const updated = { ...prev, [orderId]: status };
      try {
        localStorage.setItem(STORAGE_KEY_FINANCE_OVERRIDES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Column Management Handlers
  const handleSaveColumn = (columnData: FinanceColumnDefinitionDto) => {
    const existingIndex = columns.findIndex((c) => c.key === columnData.key);
    let updated: FinanceColumnDefinitionDto[];
    if (existingIndex >= 0) {
      updated = [...columns];
      updated[existingIndex] = columnData;
      showNotification('success', `Column "${columnData.name}" updated successfully.`);
    } else {
      updated = [...columns, columnData];
      showNotification('success', `Column "${columnData.name}" added successfully.`);
    }
    saveColumnsState(updated);
  };

  const handleDeleteColumn = (columnKey: string) => {
    const targetCol = columns.find((c) => c.key === columnKey);
    const updated = columns.filter((c) => c.key !== columnKey);
    saveColumnsState(updated);

    // Reassign jobs in deleted column to first remaining column
    const fallbackKey = updated[0]?.key || 'PAYMENT_PENDING';
    setStageOverrides((prev) => {
      let changed = false;
      const nextOverrides = { ...prev };
      Object.keys(nextOverrides).forEach((id) => {
        if (nextOverrides[id] === columnKey) {
          nextOverrides[id] = fallbackKey;
          changed = true;
        }
      });
      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEY_FINANCE_OVERRIDES, JSON.stringify(nextOverrides));
        } catch {}
      }
      return nextOverrides;
    });

    showNotification('success', `Column "${targetCol?.name || columnKey}" removed.`);
  };

  const handleReorderColumns = (newCols: FinanceColumnDefinitionDto[]) => {
    saveColumnsState(newCols);
    showNotification('success', 'Column order updated.');
  };

  const handleMoveColumn = (col: FinanceColumnDefinitionDto, direction: 'left' | 'right') => {
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
    saveColumnsState(DEFAULT_FINANCE_COLUMNS);
    showNotification('success', 'Reset to 4 default Finance columns.');
  };

  // Fetch Board Data from backend
  const loadBoardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await api.getFinanceBoard({
        search: search || undefined,
        paymentStatus: paymentStatus !== 'ALL' ? paymentStatus : undefined,
        method: method !== 'ALL' ? method : undefined,
      });

      setRawCards(data.cards || []);
      setMetrics(data.metrics || ({} as any));
      setErrorBanner(null);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to load live finance & payments telemetry.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, paymentStatus, method]);

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  // Polling every 15s
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadBoardData(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadBoardData]);

  const showNotification = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(null), 4000);
    } else {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(null), 6000);
    }
  };

  // Cards with overrides applied
  const cards = useMemo<FinanceCardDto[]>(() => {
    return rawCards.map((c) => {
      const override = stageOverrides[c.id];
      if (override) {
        return { ...c, financeStatus: override };
      }
      return c;
    });
  }, [rawCards, stageOverrides]);

  // Column stats for manager modal
  const cardStatsByColumn = useMemo(() => {
    const map: Record<string, { count: number; totalAmount: number }> = {};
    columns.forEach((col) => {
      const colCards = cards.filter((c) => c.financeStatus === col.key);
      map[col.key] = {
        count: colCards.length,
        totalAmount: colCards.reduce((acc, c) => acc + c.totalAmount, 0),
      };
    });
    return map;
  }, [columns, cards]);

  // Drag handlers
  const handleCardDragStart = (e: React.DragEvent, card: FinanceCardDto) => {
    setDraggedCard(card);
    e.dataTransfer.setData('text/plain', card.id);
  };

  const handleCardDragEnd = () => {
    setDraggedCard(null);
  };

  const handleDropJob = async (columnKey: string, card: FinanceCardDto) => {
    if (columnKey === 'SETTLED' && card.balanceAmount > 0) {
      setPayModalCard(card);
      return;
    }

    updateStageOverride(card.id, columnKey);
    showNotification('success', `Order #${card.orderNumber} moved to ${columnKey.replace(/_/g, ' ')}.`);
  };

  // Record Manual Payment
  const handleSubmitManualPayment = async (
    orderId: string,
    amount: number,
    payMethod: string,
    ref: string,
    notes?: string,
  ) => {
    try {
      await api.recordManualPayment({
        orderId,
        amount,
        method: payMethod,
        referenceNumber: ref,
        notes,
      });

      updateStageOverride(orderId, 'SETTLED');
      showNotification('success', `Payment of ₹${amount.toLocaleString()} recorded and settled!`);
      loadBoardData(true);
    } catch (err: any) {
      showNotification('error', `Payment Error: ${err?.message || 'Failed to record manual payment'}`);
    }
  };

  const handleRecordPayment = (card: FinanceCardDto) => {
    setPayModalCard(card);
  };

  const handleViewInvoice = (card: FinanceCardDto) => {
    setInvoiceCard(card);
    setIsInvoiceOpen(true);
  };

  const handleSendReminder = (card: FinanceCardDto) => {
    showNotification('success', `Payment reminder & Razorpay link dispatched to ${card.customerName}!`);
  };

  const handleResetFilters = () => {
    setSearch('');
    setPaymentStatus('ALL');
    setMethod('ALL');
    setPriority('ALL');
  };

  const hasActiveFilters = Boolean(search || paymentStatus !== 'ALL' || method !== 'ALL' || priority !== 'ALL');

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase font-bold text-slate-500 tracking-wider">
            <span>FINANCE & TREASURY</span>
            <span>•</span>
            <span className="text-slate-900">REVENUE & INVOICE RECONCILIATION</span>
            <span>•</span>
            <span className="text-slate-400 font-medium">{columns.length} Stages</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Finance & Accounts Operating Board
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Real-time merchant settlement, automated GST compliance, and B2B corporate credit balances
          </p>
        </div>

        {/* Live sync & actions */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto mt-2 sm:mt-0">
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
            onClick={() => loadBoardData()}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-1.5 h-9 bg-white flex-1 sm:flex-initial"
          >
            <RiRefreshLine className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Notification Banners */}
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

      {/* Live Financial Telemetry Strip */}
      <FinanceMetrics metrics={metrics} />

      {/* Filters Bar */}
      <FinanceFilters
        search={search}
        onSearchChange={setSearch}
        paymentStatus={paymentStatus}
        onPaymentStatusChange={setPaymentStatus}
        method={method}
        onMethodChange={setMethod}
        priority={priority}
        onPriorityChange={setPriority}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Kanban Board Columns Container */}
      <div className="flex gap-3.5 overflow-x-auto pb-4 pt-1 custom-scrollbar min-h-[560px] items-start">
        {columns.map((column, index) => {
          const columnCards = cards.filter((c) => c.financeStatus === column.key);
          return (
            <FinanceColumn
              key={column.id || column.key}
              column={column}
              cards={columnCards}
              onRecordPayment={handleRecordPayment}
              onViewInvoice={handleViewInvoice}
              onSendReminder={handleSendReminder}
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

      {/* Record Manual Payment Modal */}
      <RecordManualPaymentModal
        card={payModalCard}
        isOpen={Boolean(payModalCard)}
        onClose={() => setPayModalCard(null)}
        onSubmitPayment={handleSubmitManualPayment}
      />

      {/* Tax Invoice Drawer */}
      <InvoiceDrawer
        card={invoiceCard}
        isOpen={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false);
          setInvoiceCard(null);
        }}
      />

      {/* Column Manager Modal */}
      <FinanceColumnManagerModal
        isOpen={isManagerModalOpen}
        columns={columns}
        cardStats={cardStatsByColumn}
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

      {/* Column Add / Edit Modal */}
      <FinanceColumnEditModal
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
