'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiShoppingBag3Line,
  RiRefreshLine,
  RiCheckDoubleLine,
  RiFileTextLine,
  RiMapPin2Line,
  RiArrowRightLine,
  RiPrinterLine,
  RiTimeLine,
  RiExternalLinkLine,
  RiShieldCheckLine,
  RiLogoutBoxRLine,
  RiSparklingFill,
  RiAlertFill,
  RiBuilding4Line,
  RiUser3Line,
  RiMailLine,
  RiPhoneLine,
  RiSearchLine,
  RiEyeLine,
  RiTruckLine,
  RiAddLine,
  RiStore2Line,
  RiCheckLine,
  RiHandCoinLine,
  RiFlashlightLine,
  RiCloseLine,
  RiFileList3Line,
} from 'react-icons/ri';
import {
  formatCurrency,
  formatDate,
  checkCanCancelOrder,
  checkHasMovedToProduction,
} from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button, Badge, StatusBadge, Modal } from '@/components/ui';

interface CustomerOrderItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  dueAt?: string;
  status: string;
  customerStatus?: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  deliveryMethod?: string;
  customerNotes?: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku?: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    specifications?: any;
    designNotes?: string;
    artworkVersions?: any[];
    product?: {
      id: string;
      slug: string;
      name: string;
      basePrice?: number;
    };
  }>;
  proofRequired?: boolean;
  canCancel?: boolean;
  hasMovedToProduction?: boolean;
  statusHistory?: any[];
  jobCards?: any[];
}

const STANDARD_PRESETS = [50, 100, 250, 500, 1000, 2500, 5000];

export default function CustomerAccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout, getRoleDestination } = useAuth();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'orders' | 'approvals' | 'invoices' | 'profile'>('orders');

  // Orders State
  const [orders, setOrders] = useState<CustomerOrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'APPROVAL' | 'DELIVERED'>('ALL');

  // Quick Reorder Modal State
  const [reorderItem, setReorderItem] = useState<{
    order: CustomerOrderItem;
    item: CustomerOrderItem['items'][0];
  } | null>(null);
  const [reorderQuantity, setReorderQuantity] = useState<number>(500);
  const [reorderPaymentMode, setReorderPaymentMode] = useState<'FULL' | 'SPLIT_50'>('FULL');
  const [reorderDeliveryMethod, setReorderDeliveryMethod] = useState<'STORE_PICKUP' | 'COURIER'>('STORE_PICKUP');
  const [isReordering, setIsReordering] = useState<boolean>(false);
  const [reorderSuccessMsg, setReorderSuccessMsg] = useState<string | null>(null);
  const [reorderQuote, setReorderQuote] = useState<any>(null);
  const [isCalculatingReorder, setIsCalculatingReorder] = useState<boolean>(false);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login?returnTo=/account');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch Customer Orders
  const fetchOrders = async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingOrders(true);
      const res = await api.getOrders();
      const rawList = Array.isArray(res) ? res : (res?.data || (res as any)?.orders || []);

      if (rawList && rawList.length > 0) {
        const formatted: CustomerOrderItem[] = rawList.map((ord: any) => {
          const hasPendingProof =
            ord.status === 'CUSTOMER_APPROVAL_REQUIRED' ||
            ord.items?.some((i: any) =>
              i.artworkVersions?.some(
                (a: any) => a.status === 'PROOF_GENERATED' || a.status === 'PENDING_REVIEW'
              )
            );

          return {
            id: ord.id,
            orderNumber: ord.orderNumber || ord.id,
            createdAt: ord.createdAt || new Date().toISOString(),
            dueAt: ord.dueAt,
            status: ord.status || 'ORDER_CREATED',
            customerStatus: ord.customerStatus || ord.status,
            totalAmount: Number(ord.totalAmount) || 0,
            paidAmount: Number(ord.paidAmount) || 0,
            balanceAmount: Number(ord.balanceAmount) || 0,
            paymentStatus: ord.paymentStatus || 'PENDING',
            deliveryMethod: ord.deliveryMethod || 'STORE_PICKUP',
            customerNotes: ord.customerNotes,
            items: ord.items || [],
            proofRequired: Boolean(hasPendingProof),
            canCancel: ord.canCancel,
            hasMovedToProduction: ord.hasMovedToProduction,
            statusHistory: ord.statusHistory || [],
            jobCards: ord.jobCards || [],
          };
        });
        setOrders(formatted);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn('Could not load orders from server:', err);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  // Telemetry Calculations
  const stats = useMemo(() => {
    const totalOrdersCount = orders.length;
    const activeCount = orders.filter(
      (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
    ).length;
    const pendingProofsCount = orders.filter((o) => o.proofRequired).length;
    const totalSpend = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      totalOrdersCount,
      activeCount,
      pendingProofsCount,
      totalSpend,
    };
  }, [orders]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        !orderSearch ||
        o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.items.some((i) => i.productName.toLowerCase().includes(orderSearch.toLowerCase())) ||
        (o.customerNotes && o.customerNotes.toLowerCase().includes(orderSearch.toLowerCase()));

      let matchStatus = true;
      if (statusFilter === 'ACTIVE') {
        matchStatus = o.status !== 'DELIVERED' && o.status !== 'CANCELLED';
      } else if (statusFilter === 'APPROVAL') {
        matchStatus = Boolean(o.proofRequired);
      } else if (statusFilter === 'DELIVERED') {
        matchStatus = o.status === 'DELIVERED';
      }

      return matchSearch && matchStatus;
    });
  }, [orders, orderSearch, statusFilter]);

  // Automatic 1-Click Reorder to Cart & Checkout
  const handleDirectReorderCheckout = (
    order: CustomerOrderItem,
    item: CustomerOrderItem['items'][0],
    customQty?: number
  ) => {
    const qty = customQty || item.quantity || 500;
    const subtotal = item.unitPrice ? item.unitPrice * qty : Number(item.totalPrice || order.totalAmount || 1250);
    const tax = Math.round(subtotal * 0.18 * 100) / 100;
    const grandTotal = Math.round((subtotal + tax) * 100) / 100;
    const unitPrice = item.unitPrice || (qty > 0 ? Math.round((subtotal / qty) * 100) / 100 : 2.5);
    const specs = item.specifications || {};

    const cartItem = {
      productId: item.productId || item.product?.id || 'prod-visiting-cards',
      productName: item.productName || 'Commercial Print Job',
      sku: item.sku || 'PB-PRINT-01',
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
      artworkFile: item.artworkVersions?.[0] || null,
      selectedDesignService: false,
      designNotes: item.designNotes || `Re-order from Order #${order.orderNumber}`,
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

    router.push('/checkout');
  };

  // Open Quick Reorder Modal
  const handleOpenReorder = (order: CustomerOrderItem, item: CustomerOrderItem['items'][0]) => {
    setReorderItem({ order, item });
    const initialQty = item.quantity || 500;
    setReorderQuantity(initialQty);
    setReorderPaymentMode('FULL');
    setReorderDeliveryMethod((order.deliveryMethod as any) || 'STORE_PICKUP');
    setReorderSuccessMsg(null);
  };

  // Reorder Live Quote Calculation
  useEffect(() => {
    if (!reorderItem) return;
    let isCurrent = true;
    const fetchQuote = async () => {
      setIsCalculatingReorder(true);
      try {
        const prodId = reorderItem.item.productId || reorderItem.item.product?.id || 'prod-visiting-cards';
        const q = await api.calculateQuote({
          productId: prodId,
          quantity: reorderQuantity,
          fieldValues: reorderItem.item.specifications || {},
          hasArtwork: true,
          hasDesignService: false,
        });
        if (isCurrent) setReorderQuote(q);
      } catch (e) {
        console.warn('Reorder quote fallback:', e);
      } finally {
        if (isCurrent) setIsCalculatingReorder(false);
      }
    };
    const timer = setTimeout(fetchQuote, 100);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [reorderItem, reorderQuantity]);

  // Computed Reorder Amounts
  const reorderSubtotal = Number(
    reorderQuote?.subtotal || (Number(reorderItem?.item.unitPrice || 2.5) * reorderQuantity)
  );
  const reorderTax = Number(
    reorderQuote?.totalTax || Math.round(reorderSubtotal * 0.18 * 100) / 100
  );
  const reorderGrandTotal = Number(
    reorderQuote?.grandTotal || Math.round((reorderSubtotal + reorderTax) * 100) / 100
  );
  const reorderPayNow = reorderPaymentMode === 'SPLIT_50' ? Math.round(reorderGrandTotal * 0.5 * 100) / 100 : reorderGrandTotal;

  // Submit Quick Reorder Action
  const handleConfirmReorder = async () => {
    if (!reorderItem) return;
    setIsReordering(true);
    try {
      const payload = {
        sourceChannel: 'WEBSITE',
        deliveryMethod: reorderDeliveryMethod,
        paymentMode: reorderPaymentMode,
        paidAmount: reorderPayNow,
        customerDetails: {
          fullName: user?.fullName || 'Customer',
          email: user?.email || 'customer@printbazzar.local',
          phone: user?.phone || '+919876543210',
          companyName: (user as any)?.companyName || undefined,
        },
        items: [
          {
            productId: reorderItem.item.productId || reorderItem.item.product?.id || 'prod-visiting-cards',
            productName: reorderItem.item.productName,
            sku: reorderItem.item.sku,
            quantity: reorderQuantity,
            specifications: {
              ...(reorderItem.item.specifications || {}),
              quantity: reorderQuantity,
              isReorderOf: reorderItem.order.orderNumber,
            },
          },
        ],
      };

      const res: any = await api.createOrder(payload);
      setReorderSuccessMsg(
        `Reorder placed successfully! Order #${res?.orderNumber || 'PB-2026-REORDER'} released to production.`
      );
      fetchOrders();
    } catch (err: any) {
      alert(`Reorder could not be placed: ${err?.message || 'Server error'}`);
    } finally {
      setIsReordering(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8">
        <div className="h-8 w-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono font-bold text-slate-500">LOADING CUSTOMER ACCOUNT...</span>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const userInitials = (user?.fullName || 'User')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'CU';

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-28 md:pb-24 w-full max-w-full overflow-x-hidden">
      {/* ------------------------------------------------------------- */}
      {/* 1. CUSTOMER PROFILE HERO HEADER                               */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white text-black py-5 sm:py-7 px-4 sm:px-8 border-b border-[#E5E5E5]">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          {/* User Details */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-[#FFED00] text-black flex items-center justify-center font-bold text-lg sm:text-xl border border-neutral-300 shadow-xs flex-shrink-0">
              {userInitials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[20px] sm:text-[24px] font-semibold text-black tracking-tight font-sans">
                  {user?.fullName}
                </h1>
                <span className="bg-[#F0FDF4] text-[#166534] text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
                  <RiShieldCheckLine className="h-3 w-3 text-[#166534]" />
                  <span>VERIFIED B2B CUSTOMER</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#737373] font-mono mt-1">
                <span className="flex items-center gap-1">
                  <RiMailLine className="h-3.5 w-3.5 text-[#737373]" />
                  <span>{user?.email}</span>
                </span>
                {user?.phone && (
                  <span className="flex items-center gap-1">
                    <RiPhoneLine className="h-3.5 w-3.5 text-[#737373]" />
                    <span>{user.phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 w-full md:w-auto">
            {user?.role && user.role !== 'CUSTOMER' && (
              <Link href={getRoleDestination(user.role)} className="flex-1 sm:flex-initial">
                <Button variant="outline" size="sm" className="w-full justify-center flex items-center gap-1.5 font-medium min-h-[36px]">
                  <span>ERP Console</span>
                  <RiExternalLinkLine className="h-3.5 w-3.5 shrink-0" />
                </Button>
              </Link>
            )}

            <Link href="/products" className="flex-1 sm:flex-initial">
              <Button variant="primary" size="sm" className="w-full justify-center font-medium text-black flex items-center gap-1.5 shadow-xs min-h-[36px]">
                <RiAddLine className="h-4 w-4 shrink-0" />
                <span>Configure Job</span>
              </Button>
            </Link>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-[#B91C1C] hover:bg-[#FEF2F2] flex items-center justify-center gap-1 font-medium min-h-[36px] flex-1 sm:flex-initial"
            >
              <RiLogoutBoxRLine className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CUSTOMER METRICS TELEMETRY STRIP                          */}
      {/* ------------------------------------------------------------- */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Orders */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                TOTAL ORDERS
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
                {stats.totalOrdersCount}
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <RiShoppingBag3Line className="h-5 w-5" />
            </div>
          </div>

          {/* In Active Production */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                IN ACTIVE PRODUCTION
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
                {stats.activeCount}
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-[#E3A008] flex items-center justify-center">
              <RiFlashlightLine className="h-5 w-5" />
            </div>
          </div>

          {/* Pending Proof Approvals */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                PROOF SIGN-OFFS
              </span>
              <span className="text-2xl font-black text-amber-600 font-mono mt-0.5 block">
                {stats.pendingProofsCount}
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <RiCheckDoubleLine className="h-5 w-5" />
            </div>
          </div>

          {/* Lifetime Commercial Value */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[#FFED00] block">
                LIFETIME SPEND
              </span>
              <span className="text-2xl font-black text-white font-mono mt-0.5 block">
                {formatCurrency(stats.totalSpend)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/10 text-[#FFED00] flex items-center justify-center">
              <RiHandCoinLine className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. WORKSPACE TABS & CONTENT                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1 border-b border-slate-200 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white shadow-xs font-black'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <RiShoppingBag3Line className="h-4 w-4 shrink-0 text-[#FFED00]" />
            <span>My Orders Master</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'approvals'
                ? 'bg-slate-900 text-white shadow-xs font-black'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <RiCheckDoubleLine className="h-4 w-4 shrink-0 text-[#E3A008]" />
            <span>Proof Approvals</span>
            {stats.pendingProofsCount > 0 ? (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 animate-pulse">
                {stats.pendingProofsCount}
              </span>
            ) : (
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  activeTab === 'approvals' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                0
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-slate-900 text-white shadow-xs font-black'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <RiFileTextLine className="h-4 w-4 shrink-0 text-slate-400" />
            <span>GST Tax Invoices</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-slate-900 text-white shadow-xs font-black'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <RiBuilding4Line className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Company Profile & Addresses</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: MY ORDERS (FULL LIST & 1-CLICK EASY REORDER)       */}
        {/* ========================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative w-full sm:w-80">
                <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by Order #, product name, specs..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-2 px-2 sm:mx-0 sm:px-0">
                {[
                  { id: 'ALL', label: `All (${orders.length})` },
                  { id: 'ACTIVE', label: `In Production (${stats.activeCount})` },
                  { id: 'APPROVAL', label: `Needs Sign-off (${stats.pendingProofsCount})` },
                  { id: 'DELIVERED', label: 'Delivered' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders List Container */}
            <div className="space-y-4">
              {loadingOrders ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center shadow-card">
                  <div className="h-8 w-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Synchronizing live orders with plant ERP...
                  </span>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3 shadow-card">
                  <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                    <RiShoppingBag3Line className="h-7 w-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">No Orders Matching Filter</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    No active commercial print orders found matching your search term.
                  </p>
                  <div className="pt-2">
                    <Link href="/products">
                      <Button variant="primary" size="md" className="font-bold text-slate-950">
                        <RiAddLine className="h-4 w-4 mr-1.5" />
                        <span>Configure New Print Order</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                filteredOrders.map((ord) => {
                  const firstItem = ord.items[0];
                  const specs = firstItem?.specifications || {};

                  return (
                    <div
                      key={ord.id}
                      className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-card hover:border-slate-300 transition-all space-y-4"
                    >
                      {/* Top Row: Order Identifier, Date & Stage Badges */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Link
                            href={`/tracking/${ord.orderNumber}`}
                            className="font-mono text-sm font-black text-slate-900 hover:text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <span>#{ord.orderNumber}</span>
                            <RiExternalLinkLine className="h-3.5 w-3.5 text-slate-400" />
                          </Link>

                          <StatusBadge status={ord.status} />

                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            Placed: {formatDate(ord.createdAt)}
                          </span>

                          {ord.deliveryMethod === 'STORE_PICKUP' ? (
                            <span className="text-[10px] font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Factory Counter Pickup
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Express Courier Dispatch
                            </span>
                          )}
                        </div>

                        {/* Bill Amount & Payment Status */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className="text-sm sm:text-base font-black font-mono text-slate-950">
                            {formatCurrency(ord.totalAmount)}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                              ord.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.paymentStatus === 'PARTIALLY_PAID'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {ord.paymentStatus.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Items & Detailed Specs Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-8 space-y-2">
                          {ord.items.map((item, idx) => (
                            <div key={item.id || idx} className="space-y-1">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-slate-900">{item.productName}</h4>
                                <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.2 rounded border border-amber-200/70">
                                  {item.quantity.toLocaleString()} Units
                                </span>
                              </div>

                              {/* Structured Specs Badges */}
                              {item.specifications && typeof item.specifications === 'object' && (
                                <div className="flex flex-wrap gap-1.5 text-[11px] pt-1">
                                  {Object.entries(item.specifications).map(([k, v]) => {
                                    if (
                                      !v ||
                                      typeof v !== 'string' ||
                                      k === 'workflowRoute' ||
                                      k === 'quantity' ||
                                      k === 'deliveryMethod'
                                    )
                                      return null;
                                    return (
                                      <span
                                        key={k}
                                        className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200/60"
                                      >
                                        <strong className="capitalize text-slate-900 font-semibold">
                                          {k.replace(/([A-Z])/g, ' $1')}:
                                        </strong>{' '}
                                        {String(v)}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons Strip: Reorder, Track, Sign Proof, Invoice */}
                        <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col items-stretch sm:items-end gap-2 justify-end w-full">
                          {/* Easy 1-Click Reorder Button to Cart & Checkout */}
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => firstItem && handleDirectReorderCheckout(ord, firstItem)}
                            className="w-full sm:w-auto font-black flex items-center justify-center gap-1.5 shadow-xs bg-[#FFED00] hover:bg-[#E3A008] text-slate-950 py-2 sm:py-1.5"
                            title="Duplicate order to cart and proceed directly to checkout"
                          >
                            <RiRefreshLine className="h-4 w-4 stroke-[2] shrink-0" />
                            <span>Reorder to Checkout</span>
                          </Button>

                          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto justify-end">
                            {ord.proofRequired && (
                              <Link href={`/tracking/${ord.orderNumber}`} className="col-span-2 sm:col-span-1">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="w-full justify-center flex items-center gap-1 font-bold"
                                >
                                  <RiCheckDoubleLine className="h-4 w-4 shrink-0 text-[#E3A008]" />
                                  <span>Sign Proof</span>
                                </Button>
                              </Link>
                            )}

                            <Link href={`/tracking/${ord.orderNumber}`} className="flex-1 sm:flex-initial">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full justify-center flex items-center gap-1 font-bold"
                              >
                                <RiEyeLine className="h-3.5 w-3.5 shrink-0" />
                                <span>Track Live</span>
                              </Button>
                            </Link>

                            {checkCanCancelOrder(ord as any) && (
                              <Button
                                type="button"
                                variant="dangerOutline"
                                size="sm"
                                onClick={async () => {
                                  const reason = window.prompt(
                                    `Cancel Order #${ord.orderNumber}? Enter optional cancellation reason:`,
                                    'Requested cancellation before production'
                                  );
                                  if (reason === null) return;
                                  try {
                                    await api.cancelOrder(ord.id, reason || undefined);
                                    fetchOrders();
                                  } catch (err: any) {
                                    alert(err?.message || 'Could not cancel order');
                                  }
                                }}
                                className="flex-1 sm:flex-initial justify-center flex items-center gap-1 font-bold border-red-200 text-red-700 hover:bg-red-50"
                              >
                                <RiCloseLine className="h-4 w-4 shrink-0" />
                                <span>Cancel</span>
                              </Button>
                            )}

                            <Link href={`/invoices/${ord.orderNumber}`} className="flex-1 sm:flex-initial">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                title="View Tax Invoice"
                                className="w-full justify-center flex items-center gap-1 p-2 font-bold"
                              >
                                <RiFileTextLine className="h-4 w-4 shrink-0 text-slate-700" />
                                <span className="sm:hidden text-xs">Invoice</span>
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PROOF APPROVALS GATE                               */}
        {/* ========================================================= */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            {orders.filter((o) => o.proofRequired).length > 0 ? (
              orders
                .filter((o) => o.proofRequired)
                .map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl border-2 border-amber-300 p-6 shadow-card space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#FFED00] text-slate-950 font-mono text-xs font-black px-2.5 py-1 rounded">
                          #{ord.orderNumber}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {ord.items[0]?.productName || 'Custom Print Job'}
                        </h4>
                      </div>
                      <Badge variant="gold">ACTION REQUIRED BY CUSTOMER</Badge>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Prepress engineers have generated the 12-point calibration proof. Production is on hold
                      awaiting your verified authorization.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <Link href={`/tracking/${ord.orderNumber}`} className="w-full sm:w-auto">
                        <Button variant="primary" size="md" className="w-full justify-center font-bold flex items-center gap-1.5">
                          <RiCheckDoubleLine className="h-4 w-4 shrink-0 text-slate-950" />
                          <span>Inspect High-Res Proof & Sign-Off</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500 max-w-lg mx-auto space-y-3 shadow-card">
                <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <RiShieldCheckLine className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">All Artwork Proofs Authorized</h4>
                <p>You have zero pending artwork proofs requiring authorization at this time.</p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: TAX INVOICES (GST 18%)                              */}
        {/* ========================================================= */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 font-display">Tax Invoices (GST 18%)</h3>
                <p className="text-xs text-slate-500">Official GST-compliant tax invoices for your account filings</p>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                  <RiFileTextLine className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Invoices Yet</h4>
                <p>Tax invoices will automatically appear here once you place and complete your first print order.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <div key={ord.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <RiFileTextLine className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          INV-{ord.orderNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono block truncate">
                          Date: {formatDate(ord.createdAt)} • Amount: {formatCurrency(ord.totalAmount)}
                        </span>
                      </div>
                    </div>

                    <Link href={`/invoices/${ord.orderNumber}`} className="w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="w-full justify-center font-bold flex items-center gap-1.5">
                        <RiFileTextLine className="h-3.5 w-3.5 shrink-0" />
                        <span>View & Print Invoice</span>
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PROFILE & ADDRESSES                                */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full inline-block">
                PRIMARY BUSINESS PROFILE
              </span>
              <h4 className="text-sm font-bold text-slate-900">{user?.fullName || 'Registered Customer'}</h4>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div>
                  <strong>Registered Email:</strong> <span className="font-mono">{user?.email || '—'}</span>
                </div>
                <div>
                  <strong>Phone:</strong> <span className="font-mono">{user?.phone || 'Not provided'}</span>
                </div>
                <div>
                  <strong>Company:</strong> {(user as any)?.companyName || 'Individual Customer'}
                </div>
                <div>
                  <strong>GSTIN Tax ID:</strong>{' '}
                  <span className="font-mono">{(user as any)?.gstin || 'Consumer / Unregistered'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full inline-block">
                DEFAULT SHIPPING ADDRESS
              </span>
              <h4 className="text-sm font-bold text-slate-900">{user?.fullName || 'Shipping Location'}</h4>
              <p className="text-xs text-slate-500 leading-relaxed italic">
                No delivery address saved yet. Your shipping address is automatically saved during checkout for seamless future reorders.
              </p>
              <div className="pt-2 text-[11px] text-slate-400 font-mono">
                Verified delivery location • Fast-track courier dispatch active
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* QUICK 1-CLICK REORDER MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(reorderItem)}
        onClose={() => setReorderItem(null)}
        title="Quick 1-Click Job Reorder"
        subtitle={`Duplicate previous job specifications from Order #${reorderItem?.order.orderNumber}`}
        maxWidth="lg"
      >
        {reorderItem && (
          <div className="space-y-5 text-xs">
            {/* Success Message Banner if completed */}
            {reorderSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 space-y-3 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <RiCheckLine className="h-7 w-7 stroke-[3]" />
                </div>
                <h4 className="text-sm font-bold text-emerald-950">Reorder Submitted Successfully!</h4>
                <p className="text-xs leading-relaxed">{reorderSuccessMsg}</p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setReorderItem(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Item Details Card */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                    ORIGINAL PRODUCT SPECIFICATIONS
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {reorderItem.item.productName}
                  </div>
                  {reorderItem.item.specifications && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                      {Object.entries(reorderItem.item.specifications).map(([k, v]) => {
                        if (!v || typeof v !== 'string' || k === 'workflowRoute' || k === 'quantity') return null;
                        return (
                          <div key={k}>
                            <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                            <span className="font-semibold text-slate-900">{String(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Production Quantity Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 block">
                    Select Reorder Production Run Size
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {STANDARD_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setReorderQuantity(preset)}
                        className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                          reorderQuantity === preset
                            ? 'border-slate-900 bg-slate-900 text-[#FFED00] font-black shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold'
                        }`}
                      >
                        <div className="text-xs font-mono">{preset.toLocaleString()}</div>
                        <div className="text-[9px] uppercase font-mono opacity-80">Units</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fulfillment & Payment Settlement */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Fulfillment */}
                  <div>
                    <label className="text-xs font-bold text-slate-900 block mb-1">Handover Mode</label>
                    <select
                      value={reorderDeliveryMethod}
                      onChange={(e: any) => setReorderDeliveryMethod(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                    >
                      <option value="STORE_PICKUP">Factory Counter Pickup</option>
                      <option value="COURIER">Express Courier Dispatch</option>
                    </select>
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="text-xs font-bold text-slate-900 block mb-1">Payment Terms</label>
                    <select
                      value={reorderPaymentMode}
                      onChange={(e: any) => setReorderPaymentMode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                    >
                      <option value="FULL">100% Full Settlement ({formatCurrency(reorderGrandTotal)})</option>
                      <option value="SPLIT_50">50% Advance ({formatCurrency(reorderPayNow)})</option>
                    </select>
                  </div>
                </div>

                {/* Price Summary Banner */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-amber-900 block">
                      TOTAL REORDER VALUE (INCL. GST)
                    </span>
                    <span className="text-lg font-black text-slate-950 font-display">
                      {formatCurrency(reorderGrandTotal)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 block">Payable Now</span>
                    <span className="text-sm font-mono font-black text-emerald-700">
                      {formatCurrency(reorderPayNow)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <Link
                    href={`/products/${reorderItem.item.product?.slug || 'premium-visiting-cards'}?reorderQuantity=${reorderQuantity}`}
                  >
                    <Button type="button" variant="outline" size="md">
                      <span>Customize in Studio</span>
                    </Button>
                  </Link>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={() => setReorderItem(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={() =>
                        handleDirectReorderCheckout(reorderItem.order, reorderItem.item, reorderQuantity)
                      }
                      className="font-black flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#E3A008] text-slate-950"
                    >
                      <RiRefreshLine className="h-4 w-4" />
                      <span>Proceed to Checkout</span>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
