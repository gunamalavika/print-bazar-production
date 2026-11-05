'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  ArrowRight,
  Printer,
  FileText,
  FileCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api';
import { Button, Badge, StatusBadge } from '@/components/ui';

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
  status: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  customerNotes?: string;
  items?: OrderItemProduct[];
  proofRequired?: boolean;
  trackingNumber?: string;
}

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'APPROVAL' | 'COMPLETED'>('ALL');

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

  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const handleReorder = (order: OrderItem, item?: OrderItemProduct) => {
    const mainItem = item || order.items?.[0];
    const qty = mainItem?.quantity || 500;
    const subtotal = Number(mainItem?.totalPrice || order.totalAmount || 1250);
    const tax = Math.round(subtotal * 0.18 * 100) / 100;
    const grandTotal = Math.round((subtotal + tax) * 100) / 100;
    const unitPrice = (mainItem as any)?.unitPrice || (qty > 0 ? Math.round((subtotal / qty) * 100) / 100 : 2.5);
    const specs = (mainItem as any)?.specifications || (mainItem as any)?.specs || {};

    setReorderingId(order.id);

    const cartItem = {
      productId: (mainItem as any)?.productId || (mainItem as any)?.product?.id || 'prod-visiting-cards',
      productName: mainItem?.productName || 'Commercial Print Job',
      sku: (mainItem as any)?.sku || (mainItem as any)?.product?.sku || 'PB-PRINT-01',
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
      artworkFile: (mainItem as any)?.artworkVersions?.[0] || null,
      selectedDesignService: false,
      designNotes: (mainItem as any)?.designNotes || `Re-order from Order #${order.orderNumber}`,
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
        ? existingCart.filter((c: any) => c.productName !== cartItem.productName || c.sku !== cartItem.sku)
        : [];
      localStorage.setItem('pb2_cart', JSON.stringify([cartItem, ...filtered]));
    } catch {
      localStorage.setItem('pb2_cart', JSON.stringify([cartItem]));
    }

    sessionStorage.setItem('pb2_active_cart', JSON.stringify(cartItem));
    window.dispatchEvent(new Event('cart-updated'));

    // Automatically redirect to checkout page
    router.push('/checkout');
  };

  const fetchCustomerOrders = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/orders');
      if (res && Array.isArray(res)) {
        setOrders(res);
      } else if (res && res.orders) {
        setOrders(res.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8">
        <div className="h-8 w-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono font-bold text-slate-500">AUTHENTICATING...</span>
      </div>
    );
  }

  const filteredOrders = orders.filter((o) => {
    // Search query filter
    const matchesQuery =
      o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items?.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesQuery) return false;

    // Status tab filter
    if (statusFilter === 'APPROVAL') {
      return o.status === 'CUSTOMER_APPROVAL_REQUIRED' || o.proofRequired;
    }
    if (statusFilter === 'ACTIVE') {
      return !['DELIVERED', 'CANCELLED', 'COMPLETED'].includes(o.status);
    }
    if (statusFilter === 'COMPLETED') {
      return ['DELIVERED', 'COMPLETED'].includes(o.status);
    }
    return true;
  });

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
              <span className="text-black font-semibold">Print Orders</span>
            </div>
            <h1 className="text-[20px] sm:text-[24px] font-semibold text-black tracking-tight font-sans flex items-center gap-2.5">
              <ShoppingBag className="w-6 h-6 text-[#854D0E]" />
              Order History & Tracking
            </h1>
            <p className="text-[13px] text-[#525252] mt-1">
              Real-time production status, digital proofs, invoices, and dispatch tracking for all print jobs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/products">
              <Button variant="primary" className="bg-[#FFED00] hover:bg-[#E3A008] text-slate-950 font-bold shadow-sm flex items-center gap-2 text-xs">
                <Printer className="w-4 h-4" />
                Configure New Print Job
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
        {/* Filters & Search Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Orders ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'ACTIVE'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              In Production ({orders.filter((o) => !['DELIVERED', 'CANCELLED', 'COMPLETED'].includes(o.status)).length})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVAL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'APPROVAL'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Action Required ({orders.filter((o) => o.status === 'CUSTOMER_APPROVAL_REQUIRED' || o.proofRequired).length})
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'COMPLETED'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Completed ({orders.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status)).length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order # or item..."
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
            <p className="text-xs font-mono text-slate-500">FETCHING YOUR ORDERS & PRODUCTION STATUS...</p>
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
              <Button variant="primary" className="bg-[#FFED00] hover:bg-[#E3A008] text-slate-950 font-bold text-xs">
                Explore Printing Catalog
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const mainItem = order.items?.[0];
              const isApprovalRequired = order.status === 'CUSTOMER_APPROVAL_REQUIRED' || order.proofRequired;
              const isDelivered = ['DELIVERED', 'COMPLETED'].includes(order.status);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Placed on {formatDate(order.createdAt)}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/tracking/${order.orderNumber}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          Live Factory Tracking
                        </Button>
                      </Link>

                      <Link href={`/invoices`}>
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

                  {/* Order Items & Summary */}
                  <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {mainItem?.productName || 'Commercial Print Job'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Quantity: <span className="font-semibold text-slate-700">{mainItem?.quantity ? `${mainItem.quantity} pcs` : 'Standard Run'}</span>
                          {order.items && order.items.length > 1 && (
                            <span className="ml-2 text-slate-400">+{order.items.length - 1} more items</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right side financials & action */}
                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Total Amount</span>
                        <span className="text-sm font-black text-slate-900 font-mono">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isApprovalRequired && (
                          <Link href={`/approvals`}>
                            <Button
                              size="sm"
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs h-9 px-3.5 shadow-sm flex items-center gap-1.5"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              Approve Proof
                            </Button>
                          </Link>
                        )}

                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={reorderingId === order.id}
                          onClick={() => handleReorder(order, mainItem)}
                          className="bg-[#FFED00] hover:bg-[#E3A008] text-slate-950 font-bold text-xs h-9 px-3.5 shadow-sm flex items-center gap-1.5 transition-all"
                          title="Add exact specifications to cart and proceed to instant checkout"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 stroke-[2.5] ${reorderingId === order.id ? 'animate-spin' : ''}`} />
                          <span>{reorderingId === order.id ? 'Loading...' : 'Re-Order'}</span>
                        </Button>

                        {!isDelivered && !isApprovalRequired && (
                          <Link href={`/tracking/${order.orderNumber}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs h-9 px-3 flex items-center gap-1"
                            >
                              <span>Progress</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
