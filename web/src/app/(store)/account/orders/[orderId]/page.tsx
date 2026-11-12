'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  Printer,
  FileText,
  ArrowLeft,
  AlertTriangle,
  CreditCard,
  XCircle,
  Lock,
  History,
  X,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  checkCanCancelOrder,
  checkHasMovedToProduction,
} from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { api, fetchApi } from '@/lib/api';
import { Button, StatusBadge } from '@/components/ui';

const CANCELLATION_REASONS = [
  'Need to modify print specifications or quantity',
  'Need to upload a revised artwork file',
  'Ordered by mistake / duplicate order',
  'Delivery timeline no longer works',
  'Other reason',
];

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [customCancelNotes, setCustomCancelNotes] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?returnTo=/account/orders/${orderId}`);
    }
  }, [authLoading, isAuthenticated, router, orderId]);

  useEffect(() => {
    if (orderId && isAuthenticated) {
      loadOrderDetails();
    }
  }, [orderId, isAuthenticated]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>(`/orders/${orderId}`);
      setOrder(res);
    } catch (err) {
      console.error('Failed to load order:', err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!order) return;
    if (!checkCanCancelOrder(order)) {
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
      const updated = await api.cancelOrder(order.id, finalReason);
      setOrder((prev: any) => ({
        ...prev,
        ...updated,
        status: 'CANCELLED',
        customerStatus: 'CANCELLED',
        canCancel: false,
      }));
      setShowCancelModal(false);
    } catch (err: any) {
      setCancelError(
        err?.message || 'Unable to cancel order. It may have already moved to production.'
      );
      await loadOrderDetails();
    } finally {
      setIsCancelling(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8">
        <div className="h-8 w-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono font-bold text-slate-500">FETCHING ORDER DETAILS...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-8 flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">We could not locate this order in your account.</p>
        <Link href="/account/orders">
          <Button variant="primary" className="bg-[#FFED00] text-slate-950 font-bold text-xs">
            Back to Order History
          </Button>
        </Link>
      </div>
    );
  }

  const isCancelled = (order.status || '').toUpperCase() === 'CANCELLED';
  const isDelivered = ['DELIVERED', 'COMPLETED'].includes((order.status || '').toUpperCase());
  const movedToProd = checkHasMovedToProduction(order);
  const canCancel = checkCanCancelOrder(order);

  const historyEntries =
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
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* 1. Header */}
      <div className="bg-white border-b border-slate-200 blueprint-grid py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Order History
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                #{order.orderNumber}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Placed on {formatDate(order.createdAt)} • Omnichannel Print Job
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canCancel && (
              <Button
                type="button"
                variant="dangerOutline"
                onClick={() => {
                  setCancelError(null);
                  setShowCancelModal(true);
                }}
                className="border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Cancel Order
              </Button>
            )}

            {!isCancelled && !isDelivered && movedToProd && (
              <span
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-semibold text-slate-600"
                title="Order has moved to production and cannot be cancelled"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                In Production (Cancel Locked)
              </span>
            )}

            {!isCancelled && (
              <Link href={`/tracking/${order.orderNumber}`}>
                <Button
                  variant="primary"
                  className="bg-[#FFED00] hover:bg-[#E3A008] text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Clock className="w-4 h-4" />
                  Live Factory Tracker
                </Button>
              </Link>
            )}

            <Link href={`/invoices/${order.orderNumber}`}>
              <Button
                variant="outline"
                className="border-slate-200 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                Tax Invoice
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Order Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Items & Order History Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ordered Print Items */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Printer className="w-4 h-4 text-[#E3A008]" />
              Ordered Print Items
            </h3>

            <div className="space-y-4">
              {order.items?.map((item: any) => {
                const rawSpecs = item.specifications?.options || item.specifications || {};
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.productName}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Quantity: <span className="font-bold text-slate-900">{item.quantity} units</span>
                      </p>
                      {rawSpecs && typeof rawSpecs === 'object' && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {Object.entries(rawSpecs).map(([key, val]) => {
                            if (
                              !val ||
                              typeof val !== 'string' ||
                              key.startsWith('_') ||
                              ['workflowRoute', 'artworkSource', 'artworkUrl', 'artworkStorageKey'].includes(key)
                            ) {
                              return null;
                            }
                            return (
                              <span
                                key={key}
                                className="inline-block text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono"
                              >
                                {key}: <strong className="text-slate-800">{String(val)}</strong>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono text-slate-400 block">Item Total</span>
                      <span className="text-sm font-bold font-mono text-slate-900">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Status History Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Order Status History
            </h3>

            <div className="space-y-4 relative pl-4 border-l-2 border-slate-200 ml-2">
              {historyEntries.map((entry: any, idx: number) => (
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
                  {entry.reason && <p className="text-slate-600 mt-1">{entry.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Financial Summary & Cancellation Policy */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Financial Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(order.subtotal || order.totalAmount)}
                </span>
              </div>
              {order.taxAmount !== undefined && (
                <div className="flex justify-between text-slate-600">
                  <span>GST / Tax</span>
                  <span className="font-mono">{formatCurrency(order.taxAmount)}</span>
                </div>
              )}
              {order.shippingAmount !== undefined && Number(order.shippingAmount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span className="font-mono">{formatCurrency(order.shippingAmount)}</span>
                </div>
              )}
              <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total Amount</span>
                <span className="font-mono">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                <span>Paid Amount</span>
                <span className="font-mono font-bold">
                  {formatCurrency(order.paidAmount ?? order.totalAmount)}
                </span>
              </div>
              {order.balanceAmount > 0 && !isCancelled && (
                <div className="flex justify-between text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 font-bold">
                  <span>Balance Outstanding</span>
                  <span className="font-mono">{formatCurrency(order.balanceAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cancellation Policy Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              {canCancel ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Lock className="w-4 h-4 text-slate-500" />
              )}
              Cancellation Eligibility
            </h4>
            {isCancelled ? (
              <p className="text-xs text-red-700 leading-relaxed">
                This order has been cancelled and will not be produced.
              </p>
            ) : canCancel ? (
              <>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your order has not yet moved to production. You can cancel this order now before the factory press queue starts.
                </p>
                <Button
                  type="button"
                  variant="dangerOutline"
                  size="sm"
                  onClick={() => {
                    setCancelError(null);
                    setShowCancelModal(true);
                  }}
                  className="w-full justify-center border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs mt-1"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Cancel Order Now
                </Button>
              </>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                This order has already moved to production (or been completed) and can no longer be cancelled.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cancel Order #{order.orderNumber}?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Orders can only be cancelled before moving to production.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
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
                onClick={() => setShowCancelModal(false)}
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
