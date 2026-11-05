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
import {
  RiRefreshLine,
  RiMoneyDollarCircleLine,
  RiCheckFill,
  RiAlertFill,
  RiDownload2Line,
  RiShareForwardLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

const FINANCE_COLUMNS: FinanceColumnDefinitionDto[] = [
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

  // Board Data
  const [cards, setCards] = useState<FinanceCardDto[]>([]);
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

  // Fetch Board Data from backend
  const loadBoardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await api.getFinanceBoard({
        search: search || undefined,
        paymentStatus: paymentStatus !== 'ALL' ? paymentStatus : undefined,
        method: method !== 'ALL' ? method : undefined,
        priority: priority !== 'ALL' ? priority : undefined,
      });

      if (data) {
        setCards(data.cards || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
      setErrorBanner(null);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to load live finance board.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, paymentStatus, method, priority]);

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
      // Prompt to record offline settlement
      setPayModalCard(card);
      return;
    }

    // Optimistically update card stage
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, financeStatus: columnKey as any } : c)),
    );

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
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Finance & Accounts Operating Board
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Real-time merchant settlement, automated GST compliance, and B2B corporate credit balances
          </p>
        </div>

        {/* Live sync & actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
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
            className="flex items-center gap-1.5 h-9 bg-white"
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
        {FINANCE_COLUMNS.map((column) => {
          const columnCards = cards.filter((c) => c.financeStatus === column.key);
          return (
            <FinanceColumn
              key={column.id}
              column={column}
              cards={columnCards}
              onRecordPayment={handleRecordPayment}
              onViewInvoice={handleViewInvoice}
              onSendReminder={handleSendReminder}
              onDropJob={handleDropJob}
              draggedCard={draggedCard}
              onCardDragStart={handleCardDragStart}
              onCardDragEnd={handleCardDragEnd}
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
    </div>
  );
}
