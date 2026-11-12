'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight,
  Printer,
  FileText,
  FileCheck,
  Truck,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  XCircle,
  Lock,
  History,
  Eye,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  checkHasMovedToProduction,
  checkCanCancelOrder,
} from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button, StatusBadge } from '@/components/ui';

interface OrderStatusHistoryEntry {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  reason?: string | null;
  notes?: string | null;
  createdAt: string;
  changedBy?: {
    fullName?: string;
    role?: string;
  } | null;
}

interface OrderItemProduct {
  id: string;
  productId?: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice: number;
  specs?: any;
  specifications?: any;
  artworkVersions?: any[];
  designNotes?: string;
  product?: {
    id?: string;
    sku?: string;
    name?: string;
  };
}

interface OrderItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  dueAt?: string;
  status: string;
  customerStatus?: string;
  paymentStatus?: string;
  deliveryMethod?: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  customerNotes?: string;
  items?: OrderItemProduct[];
  statusHistory?: OrderStatusHistoryEntry[];
  jobCards?: Array<{ id: string; jobNumber: string; status: string; currentStation?: string }>;
  packages?: Array<{
    id: string;
    packageNumber: string;
    status: string;
    shipment?: {
      courierName?: string;
      awbNumber?: string;
      trackingUrl?: string;
      status?: string;
    } | null;
  }>;
  proofRequired?: boolean;
  trackingNumber?: string;
  canCancel?: boolean;
  hasMovedToProduction?: boolean;
}

const CANCELLATION_REASONS = [
  'Need to modify print specifications or quantity',
  'Need to upload a revised artwork file',
  'Ordered by mistake / duplicate order',
  'Delivery timeline no longer works',
  'Other reason',
];

function getStageProgressIndex(status: string): number {
  const st = (status || '').toUpperCase();
  if (['ORDER_CREATED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED'].includes(st)) return 0;
  if (
    [
      'ORDER_REVIEW',
      'ARTWORK_REVIEW',
      'DESIGN_REQUIRED',
      'CUSTOMER_APPROVAL_REQUIRED',
      'ARTWORK_APPROVED',
      'PRE_PRODUCTION_QC',
    ].includes(st)
  )
    return 1;
  if (['PRODUCTION_QUEUE', 'PRINTING', 'FINISHING'].includes(st)) return 2;
  if (['QUALITY_CHECK', 'PACKING', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY'].includes(st)) return 3;
  if (['DELIVERED', 'COMPLETED'].includes(st)) return 4;
  return 0;
}

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'PRE_PRODUCTION' | 'IN_PRODUCTION' | 'APPROVAL' | 'COMPLETED' | 'CANCELLED'
  >('ALL');

  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // Cancel Order Modal State
  const [cancelTargetOrder, setCancelTargetOrder] = useState<OrderItem | null>(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [customCancelNotes, setCustomCancelNotes] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login?returnTo=/account/orders');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomerOrders();
    }
  }, [isAuthenticated]);

  const fetchCustomerOrders = async () => {
    try {
      setLoading(true);
      const res: any = await api.getOrders({ limit: 100 });
      const rawList = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.orders)
        ? res.orders
        : [];

      const formatted: OrderItem[] = rawList.map((ord: any) => {
        const hasPendingProof =
          ord.status === 'CUSTOMER_APPROVAL_REQUIRED' ||
          ord.items?.some((i: any) =>
            i.artworkVersions?.some(
              (a: any) => a.status === 'PROOF_GENERATED' || a.status === 'PENDING_REVIEW'
            )
          );

        return {
          ...ord,
          id: ord.id,
          orderNumber: ord.orderNumber || ord.id,
          createdAt: ord.createdAt || new Date().toISOString(),
          dueAt: ord.dueAt,
          status: ord.status || 'ORDER_CREATED',
          customerStatus: ord.customerStatus || ord.status,
          paymentStatus: ord.paymentStatus || 'PENDING',
          deliveryMethod: ord.deliveryMethod || 'COURIER',
          totalAmount: Number(ord.totalAmount) || 0,
          paidAmount: Number(ord.paidAmount) || 0,
          balanceAmount: Number(ord.balanceAmount) || 0,
          items: ord.items || [],
          statusHistory: ord.statusHistory || [],
          jobCards: ord.jobCards || [],
          proofRequired: Boolean(hasPendingProof),
        };
      });

      setOrders(formatted);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleHistory = (orderId: string) => {
    setExpandedHistoryIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleOpenCancelModal = (order: OrderItem) => {
    setCancelTargetOrder(order);
    setSelectedCancelReason(CANCELLATION_REASONS[0]);
    setCustomCancelNotes('');
    setCancelError(null);
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancelTargetOrder) return;
    if (!checkCanCancelOrder(cancelTargetOrder)) {
      setCancelError('This order has already moved to production and cannot be cancelled.');
      return;
    }

    const finalReason =
      selectedCancelReason === 'Other reason'
        ? customCancelNotes.trim() || 'Customer requested cancellation before production'
        : customCancelNotes.trim()
        ? `${selectedCancelReason} — ${customCancelNotes.trim()}`
        : selectedCancelReason;

    try {
      setIsCancelling(true);
      setCancelError(null);
      const updated = await api.cancelOrder(cancelTargetOrder.id, finalReason);

      setOrders((prev) =>
        prev.map((o) =>
          o.id === cancelTargetOrder.id
            ? {
                ...o,
                status: 'CANCELLED',
                customerStatus: 'CANCELLED',
                canCancel: false,
                statusHistory: updated?.statusHistory || [
                  {
                    id: `hist-${Date.now()}`,
                    fromStatus: o.status,
                    toStatus: 'CANCELLED',
                    reason: `Cancelled by customer: ${finalReason}`,
                    createdAt: new Date().toISOString(),
                  },
                  ...(o.statusHistory || []),
                ],
              }
            : o
        )
      );

      setExpandedHistoryIds((prev) => ({ ...prev, [cancelTargetOrder.id]: true }));
      setBannerMessage({
        type: 'success',
        text: `Order #${cancelTargetOrder.orderNumber} has been cancelled successfully.`,
      });
      setCancelTargetOrder(null);
    } catch (err: any) {
      setCancelError(
        err?.message || 'Unable to cancel order. It may have already moved to production.'
      );
      await fetchCustomerOrders();
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReorder = (order: OrderItem, item?: OrderItemProduct) => {
    const mainItem = item || order.items?.[0];
    const qty = mainItem?.quantity || 500;
    const subtotal = Number(mainItem?.totalPrice || order.totalAmount || 1250);
    const tax = Math.round(subtotal * 0.18 * 100) / 100;
    const grandTotal = Math.round((subtotal + tax) * 100) / 100;
    const unitPrice =
      mainItem?.unitPrice || (qty > 0 ? Math.round((subtotal / qty) * 100) / 100 : 2.5);
    const specs = mainItem?.specifications || mainItem?.specs || {};

    setReorderingId(order.id);

    const cartItem = {
      productId: mainItem?.productId || mainItem?.product?.id || 'prod-visiting-cards',
      productName: mainItem?.productName || 'Commercial Print Job',
      sku: mainItem?.sku || mainItem?.product?.sku || 'PB-PRINT-01',
      quantity: qty,
      unitPrice,
      totalPrice: subtotal,
      subtotal,
      taxAmount: tax,
      grandTotal,
      paymentMode: 'FULL',
      advanceAmount: grandTotal,
      balanceAmount: 0,
      fieldValues: specs,
      specificationsSnapshot: specs,
      artworkFile: mainItem?.artworkVersions?.[0] || null,
      selectedDesignService: false,
      designNotes: mainItem?.designNotes || `Re-order from Order #${order.orderNumber}`,
      customerNotes: order.customerNotes || `Re-order of #${order.orderNumber}`,
      quote: {
        subtotal,
        totalTax: tax,
        estimatedShipping: 0,
        grandTotal,
        unitPrice,
      },
    };

    try {
      const existingRaw = localStorage.getItem('pb2_cart');
      const existingCart = existingRaw ? JSON.parse(existingRaw) : [];
      const filtered = Array.isArray(existingCart)
        ? existingCart.filter(
            (c: any) => c.productName !== cartItem.productName || c.sku !== cartItem.sku
          )
        : [];
      localStorage.setItem('pb2_cart', JSON.stringify([cartItem, ...filtered]));
    } catch {
      localStorage.setItem('pb2_cart', JSON.stringify([cartItem]));
    }

    sessionStorage.setItem('pb2_active_cart', JSON.stringify(cartItem));
    window.dispatchEvent(new Event('cart-updated'));
    router.push('/checkout');
  };

  const counts = useMemo(() => {
    const all = orders.length;
    const preProd = orders.filter((o) => checkCanCancelOrder(o)).length;
    const inProd = orders.filter(
      (o) =>
        checkHasMovedToProduction(o) &&
        !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes((o.status || '').toUpperCase())
    ).length;
    const approval = orders.filter(
      (o) => o.status === 'CUSTOMER_APPROVAL_REQUIRED' || o.proofRequired
    ).length;
    const completed = orders.filter((o) =>
      ['DELIVERED', 'COMPLETED'].includes((o.status || '').toUpperCase())
    ).length;
    const cancelled = orders.filter((o) => (o.status || '').toUpperCase() === 'CANCELLED').length;
    return { all, preProd, inProd, approval, completed, cancelled };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.status?.toLowerCase().includes(q) ||
        o.items?.some((i) => i.productName?.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      const st = (o.status || '').toUpperCase();
      if (statusFilter === 'PRE_PRODUCTION') return checkCanCancelOrder(o);
      if (statusFilter === 'IN_PRODUCTION') {
        return (
          checkHasMovedToProduction(o) && !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(st)
        );
      }
      if (statusFilter === 'APPROVAL') {
        return st === 'CUSTOMER_APPROVAL_REQUIRED' || Boolean(o.proofRequired);
      }
      if (statusFilter === 'COMPLETED') {
        return ['DELIVERED', 'COMPLETED'].includes(st);
      }
      if (statusFilter === 'CANCELLED') {
        return st === 'CANCELLED';
      }
      return true;
    });
  }, [orders, searchQuery, statusFilter]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8">
        <div className="h-8 w-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono font-bold text-slate-500">AUTHENTICATING...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-28 md:pb-24 w-full max-w-full overflow-x-hidden">
      {/* 1. Page Header */}
      <div className="bg-white border-b border-[#E5E5E5] blueprint-grid py-5 sm:py-7 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#737373] uppercase tracking-widest mb-1.5">
              <Link href="/account" className="hover:text-black transition-colors">
                My Account
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-[#737373]" />
              <span className="text-black font-semibold">Order History</span>
            </div>
            <h1 className="text-[20px] sm:text-[24px] font-semibold text-black tracking-tight font-sans flex items-center gap-2.5">
              <ShoppingBag className="w-6 h-6 text-[#854D0E]" />
              Order History & Production Tracking
            </h1>
            <p className="text-[13px] text-[#525252] mt-1">
              View complete order history, status timeline, invoices, and manage cancellations before orders move to production.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCustomerOrders}
              className="text-xs font-bold border-slate-200 hover:bg-slate-50"
            >
              Refresh History
            </Button>
            <Link href="/products">
              <Button
                variant="primary"
                className="bg-[#FFED00] hover:bg-[#E3A008] text-slate-950 font-bold shadow-sm flex items-center gap-2 text-xs"
              >
                <Printer className="w-4 h-4" />
                Configure New Print Job
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* Notification Banner */}
        {bannerMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
              bannerMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-bold">
              {bannerMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
              TOTAL ORDERS
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
              {counts.all}
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 block">
              PRE-PRODUCTION (CANCELLABLE)
            </span>
            <span className="text-2xl font-black text-emerald-700 font-mono mt-0.5 block">
              {counts.preProd}
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-[10px] font-mono uppercase font-bold text-blue-700 block">
              IN PRODUCTION (LOCKED)
            </span>
            <span className="text-2xl font-black text-blue-700 font-mono mt-0.5 block">
              {counts.inProd}
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
              COMPLETED / DELIVERED
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
              {counts.completed}
            </span>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Orders ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PRE_PRODUCTION')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'PRE_PRODUCTION'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pre-Production ({counts.preProd})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('IN_PRODUCTION')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'IN_PRODUCTION'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              In Production ({counts.inProd})
            </button>
            {counts.approval > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('APPROVAL')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'APPROVAL'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                Action Required ({counts.approval})
              </button>
            )}
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'COMPLETED'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Completed ({counts.completed})
            </button>
            {counts.cancelled > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('CANCELLED')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === 'CANCELLED'
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                Cancelled ({counts.cancelled})
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order # or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FFED00] focus:border-slate-400"
            />
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center">
            <div className="h-8 w-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-mono text-slate-500">
              FETCHING YOUR ORDER HISTORY & PRODUCTION STATUS...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-4 border border-amber-200">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No print orders found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your filters or search terms.'
                : 'You have not placed any commercial printing orders yet.'}
            </p>
            <Link href="/products">
              <Button
                variant="primary"
                className="bg-[#FFED00] hover:bg-[#E3A008] text-slate-950 font-bold text-xs"
              >
                Explore Printing Catalog
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const mainItem = order.items?.[0];
              const isCancelled = (order.status || '').toUpperCase() === 'CANCELLED';
              const isDelivered = ['DELIVERED', 'COMPLETED'].includes(
                (order.status || '').toUpperCase()
              );
              const movedToProd = checkHasMovedToProduction(order);
              const canCancel = checkCanCancelOrder(order);
              const isApprovalRequired =
                order.status === 'CUSTOMER_APPROVAL_REQUIRED' || order.proofRequired;
              const isHistoryExpanded = Boolean(expandedHistoryIds[order.id]);
              const stageIdx = getStageProgressIndex(order.status);

              const historyEntries: OrderStatusHistoryEntry[] =
                order.statusHistory && order.statusHistory.length > 0
                  ? order.statusHistory
                  : [
                      {
                        id: `init-${order.id}`,
                        toStatus: order.status || 'ORDER_CREATED',
                        reason: `Order placed (#${order.orderNumber})`,
                        createdAt: order.createdAt,
                      },
                    ];

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-xl border p-5 shadow-sm transition-all ${
                    isCancelled
                      ? 'border-red-200 bg-red-50/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar: Order Number, Date, Status, and Quick Links */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="font-mono font-black text-sm text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded border border-slate-200 transition-colors"
                      >
                        #{order.orderNumber}
                      </Link>
                      <StatusBadge status={order.status} />
                      <span className="text-xs text-slate-500 font-medium">
                        Placed on {formatDate(order.createdAt)}
                      </span>
                      {order.paymentStatus && (
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.paymentStatus === 'PARTIALLY_PAID'
                              ? 'bg-amber-100 text-amber-900'
                              : order.paymentStatus === 'CANCELLED'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {order.paymentStatus.replace(/_/g, ' ')}
                        </span>
                      )}
                      {order.deliveryMethod === 'STORE_PICKUP' ? (
                        <span className="text-[10px] font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Store Pickup
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Courier Delivery
                        </span>
                      )}
                      {order.packages?.[0]?.shipment?.courierName && (
                        <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-emerald-600" />
                          <span>
                            {order.packages[0].shipment.courierName}
                            {order.packages[0].shipment.awbNumber
                              ? ` • AWB: ${order.packages[0].shipment.awbNumber}`
                              : ''}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleHistory(order.id)}
                        className="h-8 px-3 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <History className="w-3.5 h-3.5 text-slate-600" />
                        <span>Order History ({historyEntries.length})</span>
                        {isHistoryExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <Link href={`/account/orders/${order.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-700" />
                          Details
                        </Button>
                      </Link>

                      {!isCancelled && (
                        <Link href={`/tracking/${order.orderNumber}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-bold border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                          >
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            Live Tracking
                          </Button>
                        </Link>
                      )}

                      <Link href={`/invoices/${order.orderNumber}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-bold text-slate-600 hover:text-slate-900"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          Invoice
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Order Items & Financial Summary */}
                  <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      {(order.items && order.items.length > 0
                        ? order.items
                        : [
                            {
                              id: 'default-item',
                              productName: 'Commercial Print Job',
                              quantity: 1,
                              totalPrice: order.totalAmount,
                            } as OrderItemProduct,
                          ]
                      ).map((item, idx) => {
                        const rawSpecs = item.specifications?.options || item.specifications || {};
                        return (
                          <div key={item.id || idx} className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                              <Printer className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-slate-900">
                                  {item.productName || 'Commercial Print Job'}
                                </h4>
                                <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Qty: {item.quantity?.toLocaleString() || 1} pcs
                                </span>
                              </div>
                              {rawSpecs && typeof rawSpecs === 'object' && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {Object.entries(rawSpecs).map(([k, v]) => {
                                    if (
                                      !v ||
                                      typeof v !== 'string' ||
                                      k.startsWith('_') ||
                                      [
                                        'workflowRoute',
                                        'artworkSource',
                                        'artworkRequirement',
                                        'referenceImageRequirement',
                                        'designServiceRequirement',
                                        'artworkUrl',
                                        'artworkStorageKey',
                                      ].includes(k)
                                    ) {
                                      return null;
                                    }
                                    return (
                                      <span
                                        key={k}
                                        className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/70"
                                      >
                                        <strong className="capitalize text-slate-900">
                                          {k.replace(/([A-Z])/g, ' $1')}:
                                        </strong>{' '}
                                        {String(v)}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Right side financials & primary actions */}
                    <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                          Total Amount
                        </span>
                        <span className="text-base font-black text-slate-900 font-mono">
                          {formatCurrency(order.totalAmount)}
                        </span>
                        {order.balanceAmount > 0 && !isCancelled && (
                          <span className="block text-[10px] font-mono text-amber-700 font-bold">
                            Balance Due: {formatCurrency(order.balanceAmount)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isApprovalRequired && !isCancelled && (
                          <Link href={`/tracking/${order.orderNumber}`}>
                            <Button
                              size="sm"
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs h-9 px-3.5 shadow-sm flex items-center gap-1.5"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              Approve Proof
                            </Button>
                          </Link>
                        )}

                        {/* CANCEL ORDER OPTION: Appears until moved to production */}
                        {canCancel && (
                          <Button
                            type="button"
                            variant="dangerOutline"
                            size="sm"
                            onClick={() => handleOpenCancelModal(order)}
                            className="h-9 px-3.5 text-xs font-bold flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancel Order
                          </Button>
                        )}

                        {/* LOCKED INDICATOR: Once moved to production, cannot cancel */}
                        {!isCancelled && !isDelivered && movedToProd && (
                          <span
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-mono font-semibold text-slate-600 select-none"
                            title="Order has moved to production and can no longer be cancelled"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            In Production (Cancel Locked)
                          </span>
                        )}

                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={reorderingId === order.id}
                          onClick={() => handleReorder(order, mainItem)}
                          className="bg-[#FFED00] hover:bg-[#E3A008] text-slate-950 font-bold text-xs h-9 px-3.5 shadow-sm flex items-center gap-1.5 transition-all"
                          title="Add exact specifications to cart and proceed to checkout"
                        >
                          <RotateCcw
                            className={`w-3.5 h-3.5 stroke-[2.5] ${
                              reorderingId === order.id ? 'animate-spin' : ''
                            }`}
                          />
                          <span>{reorderingId === order.id ? 'Loading...' : 'Re-Order'}</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Stage Progress Bar & Production Gate Status */}
                  {!isCancelled ? (
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
                        {[
                          '1. Order Placed',
                          '2. Artwork & Review',
                          '3. In Production',
                          '4. QC & Dispatch',
                          '5. Delivered',
                        ].map((stepLabel, idx) => {
                          const done = idx < stageIdx || isDelivered;
                          const active = idx === stageIdx && !isDelivered;
                          return (
                            <React.Fragment key={stepLabel}>
                              <span
                                className={`px-2 py-0.5 rounded ${
                                  active
                                    ? 'bg-slate-900 text-[#FFED00] font-bold'
                                    : done
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {stepLabel}
                              </span>
                              {idx < 4 && <span className="text-slate-300">→</span>}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      <div className="text-[11px] font-medium">
                        {canCancel ? (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Pre-production stage: Cancellation available until released to production
                          </span>
                        ) : !isDelivered ? (
                          <span className="text-slate-500 flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            Moved to factory production — cancellation is disabled
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-red-100 flex items-center justify-between text-xs text-red-700 bg-red-50/60 px-3 py-2 rounded-lg mt-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>
                          {historyEntries[0]?.reason || 'This order was cancelled prior to production.'}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-red-600">
                        {formatDate(historyEntries[0]?.createdAt || order.createdAt)}
                      </span>
                    </div>
                  )}

                  {/* Expandable Chronological Order History Timeline */}
                  {isHistoryExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50/70 rounded-xl p-4">
                      <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-slate-600" />
                        Order Activity & Status History
                      </h5>
                      <div className="space-y-3 relative pl-4 border-l-2 border-slate-200 ml-2">
                        {historyEntries.map((entry, idx) => (
                          <div key={entry.id || idx} className="relative text-xs">
                            <span
                              className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                entry.toStatus === 'CANCELLED'
                                  ? 'bg-red-600'
                                  : idx === 0
                                  ? 'bg-emerald-600'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <StatusBadge status={entry.toStatus} />
                                {entry.fromStatus && (
                                  <span className="text-[11px] font-mono text-slate-400">
                                    from {entry.fromStatus.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">
                                {new Date(entry.createdAt).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {entry.reason && (
                              <p className="text-slate-600 mt-1 text-xs">{entry.reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Order Confirmation Modal */}
      {cancelTargetOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cancel Order #{cancelTargetOrder.orderNumber}?
                  </h3>
                  <p className="text-xs text-slate-500">
                    This order has not yet moved to production and can be cancelled.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelTargetOrder(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Item:</span>
                <span className="font-bold text-slate-900">
                  {cancelTargetOrder.items?.[0]?.productName || 'Commercial Print Job'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Stage:</span>
                <span className="font-mono font-bold text-slate-800">
                  {cancelTargetOrder.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order Total:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(cancelTargetOrder.totalAmount)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Select Reason for Cancellation
              </label>
              <select
                value={selectedCancelReason}
                onChange={(e) => setSelectedCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
              >
                {CANCELLATION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <textarea
                rows={2}
                value={customCancelNotes}
                onChange={(e) => setCustomCancelNotes(e.target.value)}
                placeholder="Additional notes (optional)..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900 mt-2"
              />
            </div>

            {cancelError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCancelling}
                onClick={() => setCancelTargetOrder(null)}
              >
                Keep Order
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={isCancelling}
                onClick={handleConfirmCancelOrder}
                className="bg-red-600 hover:bg-red-700 text-white border-red-700 font-bold"
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
