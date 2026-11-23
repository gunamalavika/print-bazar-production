'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  RiStore2Line,
  RiSearchLine,
  RiRefreshLine,
  RiCheckboxCircleLine,
  RiAlertLine,
  RiMoneyDollarCircleLine,
  RiHandCoinLine,
  RiCloseLine,
  RiCheckLine,
  RiPhoneLine,
  RiWhatsappLine,
  RiBox3Line,
  RiTimeLine,
  RiUserFollowLine,
  RiFileTextLine,
  RiShieldCheckLine,
  RiPrinterLine,
  RiScales3Line,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button, Input } from '@/components/ui';

interface StorageOrderDto {
  id: string;
  orderNumber: string;
  status: string;
  customerStatus: string;
  deliveryMethod: string;
  paymentStatus: string;
  subtotal: number | string;
  taxAmount: number | string;
  shippingAmount: number | string;
  totalAmount: number | string;
  paidAmount: number | string;
  balanceAmount: number | string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    companyName?: string;
  };
  shippingAddress?: any;
  items: Array<{
    id: string;
    productName: string;
    sku?: string;
    quantity: number;
    totalPrice: number | string;
    specifications: Record<string, any>;
    product?: {
      id: string;
      name: string;
      unitWeightGrams?: number;
    };
  }>;
  packages: Array<{
    id: string;
    packageNumber: string;
    sequenceNumber: number;
    barcode: string;
    grossWeightGrams: number;
    shipment?: any;
  }>;
  statusHistory?: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    reason?: string;
    createdAt: string;
    changedBy?: {
      fullName: string;
      role: string;
    };
  }>;
}

type StorageTab = 'ALL' | 'READY_IN_STORAGE' | 'PAYMENT_PENDING' | 'DELIVERED';

export default function OperationsStoragePage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<StorageOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StorageTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<StorageOrderDto | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER'>('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [collectorName, setCollectorName] = useState('');
  const [collectorPhone, setCollectorPhone] = useState('');
  const [idProofType, setIdProofType] = useState('COUNTER_VERIFIED');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  // Fetch store pickup queue
  const fetchStorageOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getDispatchQueue({ tab: 'STORE_PICKUP', limit: 100 });
      const list = res.orders || (Array.isArray(res) ? res : []);
      setOrders(list as StorageOrderDto[]);
    } catch (err: any) {
      console.error('Failed to load storage pickup queue:', err);
      setBanner({
        type: 'error',
        message: err?.message || 'Failed to load storage pickup queue',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStorageOrders();
  }, [fetchStorageOrders]);

  // Derived filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      const balance = Number(order.balanceAmount || 0);
      const isDelivered = order.status === 'DELIVERED';
      const isPendingPayment = balance > 0 || order.paymentStatus !== 'PAID';

      if (activeTab === 'READY_IN_STORAGE' && (isDelivered || order.status === 'CANCELLED')) {
        return false;
      }
      if (activeTab === 'PAYMENT_PENDING' && (!isPendingPayment || isDelivered)) {
        return false;
      }
      if (activeTab === 'DELIVERED' && !isDelivered) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = order.orderNumber?.toLowerCase().includes(q);
        const nameMatch = order.customer?.fullName?.toLowerCase().includes(q);
        const phoneMatch = order.customer?.phone?.includes(q);
        const companyMatch = order.customer?.companyName?.toLowerCase().includes(q);
        return numMatch || nameMatch || phoneMatch || companyMatch;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // Metric counts
  const metrics = useMemo(() => {
    let readyCount = 0;
    let pendingPaymentCount = 0;
    let deliveredCount = 0;

    orders.forEach((o) => {
      const balance = Number(o.balanceAmount || 0);
      const isDelivered = o.status === 'DELIVERED';
      if (isDelivered) {
        deliveredCount++;
      } else {
        readyCount++;
      }
      if (balance > 0 && !isDelivered) {
        pendingPaymentCount++;
      }
    });

    return {
      total: orders.length,
      ready: readyCount,
      pendingPayment: pendingPaymentCount,
      delivered: deliveredCount,
    };
  }, [orders]);

  // Open Payment modal
  const handleOpenPaymentModal = (order: StorageOrderDto) => {
    setSelectedOrder(order);
    const balance = Number(order.balanceAmount || 0);
    setPaymentAmount(balance > 0 ? balance : Number(order.totalAmount || 0));
    setPaymentMethod('UPI');
    setPaymentRef(`UPI-${Date.now().toString().slice(-6)}`);
    setPaymentNotes('Store Pickup counter balance settlement');
    setIsPaymentModalOpen(true);
  };

  // Submit manual payment
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    if (paymentAmount <= 0) {
      alert('Payment amount must be greater than 0');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await api.recordManualPayment({
        orderId: selectedOrder.id,
        amount: Number(paymentAmount),
        method: paymentMethod,
        referenceNumber: paymentRef.trim() || `COUNTER-${Date.now()}`,
        notes: paymentNotes.trim() || undefined,
      });

      setBanner({
        type: 'success',
        message: `Payment of ${formatCurrency(paymentAmount)} recorded successfully for Order #${selectedOrder.orderNumber}! Balance cleared.`,
      });
      setIsPaymentModalOpen(false);
      setSelectedOrder(null);
      fetchStorageOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open Handover modal
  const handleOpenHandoverModal = (order: StorageOrderDto) => {
    const balance = Number(order.balanceAmount || 0);
    if (balance > 0) {
      alert(`Cannot handover order #${order.orderNumber}: Outstanding balance of ${formatCurrency(balance)} must be settled first.`);
      return;
    }

    setSelectedOrder(order);
    setCollectorName(order.customer?.fullName || '');
    setCollectorPhone(order.customer?.phone || '');
    setIdProofType('COUNTER_VERIFIED');
    setIdProofNumber('');
    setHandoverNotes('Direct handover to customer at Factory Storage Counter');
    setIsHandoverModalOpen(true);
  };

  // Confirm Handover to Delivered
  const handleConfirmHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsSubmittingHandover(true);
    try {
      await api.confirmStorePickup({
        orderId: selectedOrder.id,
        collectorName: collectorName.trim() || selectedOrder.customer?.fullName || 'Customer',
        collectorPhone: collectorPhone.trim() || selectedOrder.customer?.phone || '',
        idProofType,
        idProofNumber: idProofNumber.trim() || undefined,
        notes: handoverNotes.trim() || undefined,
      });

      setBanner({
        type: 'success',
        message: `Order #${selectedOrder.orderNumber} successfully handed over and marked DELIVERED!`,
      });
      setIsHandoverModalOpen(false);
      setSelectedOrder(null);
      fetchStorageOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to complete store pickup handover');
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* 1. Header & Navigation Context */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <span>PLANT OS</span>
                <span>/</span>
                <span>OPERATIONS COMMAND</span>
                <span>/</span>
                <span className="text-amber-800 font-bold">PLANT PICKUP STORAGE</span>
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                  <RiStore2Line className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Factory Plant Pickup Storage Counter
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      OPERATIONAL MANAGER
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Storage depot for self-collection orders. Settle counter balances and handover to customer with live status updates.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchStorageOrders}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition"
              >
                <RiRefreshLine className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Queue</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner Alert */}
        {banner && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              banner.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              {banner.type === 'error' ? (
                <RiAlertLine className="h-4 w-4 text-rose-600 shrink-0" />
              ) : (
                <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
              <span>{banner.message}</span>
            </div>
            <button
              onClick={() => setBanner(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              <RiCloseLine className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Store Pickups */}
          <div
            onClick={() => setActiveTab('ALL')}
            className={`p-4 rounded-2xl border transition cursor-pointer select-none ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/30'
                : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider opacity-70">
                TOTAL STORE PICKUPS
              </span>
              <RiStore2Line className={`h-4 w-4 ${activeTab === 'ALL' ? 'text-amber-400' : 'text-slate-500'}`} />
            </div>
            <div className="text-2xl font-black mt-2 font-mono">
              {metrics.total}
            </div>
            <p className="text-[11px] opacity-75 mt-0.5 truncate">Factory self-collection orders</p>
          </div>

          {/* Card 2: Ready in Storage */}
          <div
            onClick={() => setActiveTab('READY_IN_STORAGE')}
            className={`p-4 rounded-2xl border transition cursor-pointer select-none ${
              activeTab === 'READY_IN_STORAGE'
                ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-600/30'
                : 'bg-purple-50/60 text-purple-950 border-purple-200 hover:border-purple-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider opacity-90">
                IN STORAGE COUNTER
              </span>
              <RiBox3Line className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black mt-2 font-mono text-purple-700">
              {metrics.ready}
            </div>
            <p className="text-[11px] text-purple-800/80 mt-0.5 truncate">Packed & ready for pickup</p>
          </div>

          {/* Card 3: Pending Balance */}
          <div
            onClick={() => setActiveTab('PAYMENT_PENDING')}
            className={`p-4 rounded-2xl border transition cursor-pointer select-none ${
              activeTab === 'PAYMENT_PENDING'
                ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-600/30'
                : 'bg-amber-50/60 text-amber-950 border-amber-200 hover:border-amber-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider opacity-90">
                PENDING BALANCE
              </span>
              <RiMoneyDollarCircleLine className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black mt-2 font-mono text-amber-700">
              {metrics.pendingPayment}
            </div>
            <p className="text-[11px] text-amber-800/80 mt-0.5 truncate">Collect counter balance</p>
          </div>

          {/* Card 4: Delivered */}
          <div
            onClick={() => setActiveTab('DELIVERED')}
            className={`p-4 rounded-2xl border transition cursor-pointer select-none ${
              activeTab === 'DELIVERED'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-600/30'
                : 'bg-emerald-50/60 text-emerald-950 border-emerald-200 hover:border-emerald-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider opacity-90">
                HANDED OVER (DELIVERED)
              </span>
              <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black mt-2 font-mono text-emerald-700">
              {metrics.delivered}
            </div>
            <p className="text-[11px] text-emerald-800/80 mt-0.5 truncate">Customer collected parcels</p>
          </div>
        </div>

        {/* 3. Search & Tab Filter Strip */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto text-xs">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Pickups ({metrics.total})
            </button>
            <button
              onClick={() => setActiveTab('READY_IN_STORAGE')}
              className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
                activeTab === 'READY_IN_STORAGE'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              In Storage ({metrics.ready})
            </button>
            <button
              onClick={() => setActiveTab('PAYMENT_PENDING')}
              className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
                activeTab === 'PAYMENT_PENDING'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Pending Balance ({metrics.pendingPayment})
            </button>
            <button
              onClick={() => setActiveTab('DELIVERED')}
              className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
                activeTab === 'DELIVERED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Delivered ({metrics.delivered})
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer, phone..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
            />
          </div>
        </div>

        {/* 4. Order Queue Stream */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <RiRefreshLine className="h-8 w-8 mx-auto mb-2 animate-spin text-amber-500" />
            <p className="text-xs font-bold text-slate-600">Loading Storage Pickup Orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-xs">
            <RiStore2Line className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No Store Pickup Orders Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? 'No orders match your search query.'
                : 'There are currently no store pickup orders in this status category.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.map((order) => {
              const item = order.items?.[0];
              const balance = Number(order.balanceAmount || 0);
              const isDelivered = order.status === 'DELIVERED';
              const isPendingPayment = balance > 0 || order.paymentStatus !== 'PAID';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 shadow-2xs transition-all space-y-4"
                >
                  {/* Top Row: Order # + Status Badges + Financial Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm text-slate-900">
                        #{order.orderNumber}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                        <RiStore2Line className="h-3 w-3" />
                        FACTORY PLANT PICKUP
                      </span>

                      {/* Weight Config Badge (0 KG specification) */}
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        <RiScales3Line className="h-3 w-3 text-slate-500" />
                        WEIGHT: 0 KG (0g/piece)
                      </span>

                      {isDelivered ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <RiCheckboxCircleLine className="h-3 w-3 text-emerald-600" />
                          HANDED OVER / DELIVERED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                          <RiBox3Line className="h-3 w-3 text-blue-600" />
                          STORED & READY FOR PICKUP
                        </span>
                      )}
                    </div>

                    {/* Financial Badge */}
                    <div className="flex items-center gap-2">
                      {isPendingPayment ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                          <RiAlertLine className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="text-xs font-bold">
                            PENDING BALANCE: {formatCurrency(balance)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            (Total: {formatCurrency(order.totalAmount)})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold font-mono">
                          <RiCheckboxCircleLine className="h-3.5 w-3.5 text-emerald-600" />
                          <span>PAID IN FULL ({formatCurrency(order.totalAmount)})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Customer Info + Product Specs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Customer Box */}
                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Customer & Collection Contact
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        {order.customer?.fullName || 'Customer'}
                      </div>
                      {order.customer?.companyName && (
                        <div className="text-slate-600 font-medium">
                          {order.customer.companyName}
                        </div>
                      )}
                      {order.customer?.phone && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {order.customer.phone}
                          </span>
                          <a
                            href={`tel:${order.customer.phone}`}
                            className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                            title="Call Customer"
                          >
                            <RiPhoneLine className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/${order.customer.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition"
                            title="WhatsApp Customer"
                          >
                            <RiWhatsappLine className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Product & Specifications Box */}
                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Print Job & Run Specifications
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        {item?.productName || 'Custom Print Job'}
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                        <span className="font-bold text-slate-900">Run: {item?.quantity?.toLocaleString() || 1} pcs</span>
                        <span>•</span>
                        <span>Shipping Fee: ₹0.00 (Self Pickup)</span>
                      </div>
                      {order.packages && order.packages.length > 0 && (
                        <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-bold">Stored Parcel(s):</span>
                          {order.packages.map((pkg, idx) => (
                            <span
                              key={pkg.id || idx}
                              className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-bold text-purple-900"
                            >
                              Parcel #{pkg.sequenceNumber || idx + 1}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Strip */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="text-[11px] text-slate-400 font-mono">
                      Created: {new Date(order.createdAt).toLocaleDateString()} at{' '}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* Action 1: Collect Pending Balance */}
                      {isPendingPayment && !isDelivered && (
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentModal(order)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition active:scale-95"
                        >
                          <RiHandCoinLine className="h-4 w-4" />
                          <span>Collect Balance ({formatCurrency(balance)})</span>
                        </button>
                      )}

                      {/* Action 2: Handover to Customer (Mark Delivered) */}
                      {!isDelivered ? (
                        <button
                          type="button"
                          disabled={isPendingPayment}
                          onClick={() => handleOpenHandoverModal(order)}
                          title={
                            isPendingPayment
                              ? `Cannot handover: Balance of ${formatCurrency(balance)} must be settled first.`
                              : 'Handover parcel to customer and mark DELIVERED'
                          }
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 font-black text-xs rounded-xl shadow-xs transition active:scale-95 ${
                            isPendingPayment
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                          }`}
                        >
                          <RiCheckboxCircleLine className="h-4 w-4" />
                          <span>Handover to Customer (Mark Delivered)</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600" />
                          <span>Completed & Handed Over</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL 1: COLLECT PENDING PAYMENT ────────────────────────────────────── */}
      {isPaymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiHandCoinLine className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Collect Counter Payment
                </h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                <div className="font-bold">
                  Order #{selectedOrder.orderNumber} — {selectedOrder.customer?.fullName}
                </div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span>Total Order Amount:</span>
                  <strong>{formatCurrency(selectedOrder.totalAmount)}</strong>
                </div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span>Already Paid:</span>
                  <strong>{formatCurrency(selectedOrder.paidAmount)}</strong>
                </div>
                <div className="flex justify-between text-xs font-bold text-amber-900 pt-1 border-t border-amber-200">
                  <span>Outstanding Balance:</span>
                  <strong>{formatCurrency(selectedOrder.balanceAmount)}</strong>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Settlement Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full h-10 px-3 font-mono font-bold text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['UPI', 'CASH', 'CARD', 'BANK_TRANSFER'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        paymentMethod === m
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Transaction / Reference ID
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UPI Ref / Cash Memo #"
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Counter Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Notes about payment collection..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-slate-950 font-black rounded-xl shadow-xs transition"
                >
                  {isSubmittingPayment ? 'Recording...' : `Confirm Payment (${formatCurrency(paymentAmount)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: CONFIRM HANDOVER & MARK DELIVERED ───────────────────────────── */}
      {isHandoverModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiCheckboxCircleLine className="h-5 w-5" />
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Confirm Handover to Customer
                </h3>
              </div>
              <button
                onClick={() => setIsHandoverModalOpen(false)}
                className="text-emerald-200 hover:text-white"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmHandover} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 space-y-1">
                <div className="font-bold text-xs">
                  Handing over Order #{selectedOrder.orderNumber}
                </div>
                <div className="text-[11px] text-emerald-800">
                  {selectedOrder.items?.[0]?.productName} — Run: {selectedOrder.items?.[0]?.quantity} pcs
                </div>
                <div className="font-bold text-emerald-900 pt-1">
                  ✓ Payment is 100% Cleared. Order is eligible for customer handover.
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Collector / Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Collector Phone Number
                </label>
                <input
                  type="text"
                  value={collectorPhone}
                  onChange={(e) => setCollectorPhone(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Identity Verification
                </label>
                <select
                  value={idProofType}
                  onChange={(e) => setIdProofType(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 font-medium"
                >
                  <option value="COUNTER_VERIFIED">Counter Physical Verification</option>
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="PAN_CARD">PAN Card</option>
                  <option value="COMPANY_ID">Company ID Card</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ID Number / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={idProofNumber}
                  onChange={(e) => setIdProofNumber(e.target.value)}
                  placeholder="Last 4 digits or ID number"
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Handover Notes
                </label>
                <textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Notes about physical handover..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsHandoverModalOpen(false)}
                >
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={isSubmittingHandover}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-xs transition"
                >
                  {isSubmittingHandover ? 'Delivering...' : 'Confirm Delivery & Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
