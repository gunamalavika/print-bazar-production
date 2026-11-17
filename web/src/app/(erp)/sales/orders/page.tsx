'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowRight,
  Plus,
  RefreshCw,
  Package,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { Button, StatusBadge } from '@/components/ui';

interface SalesOrderCustomer {
  fullName?: string | null;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customer?: SalesOrderCustomer | null;
  status: string;
  paymentStatus: string;
  priority: string;
  slaStatus: string;
  totalAmount: number;
  dueAt?: string | null;
}

function formatOrderDate(dateVal?: string | null) {
  if (!dateVal) return 'Standard SLA';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const datePart = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart} • ${timePart}`;
  } catch {
    return String(dateVal);
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = (await api.listOrders()) as any;
      const rawList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const mappedOrders: SalesOrder[] = rawList.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customer: o.customer,
        status: o.status,
        paymentStatus: o.paymentStatus || 'PAID',
        priority: o.priority || 'NORMAL',
        slaStatus: o.slaStatus || 'ON_TIME',
        totalAmount: Number(o.totalAmount) || 0,
        dueAt: o.dueAt || o.targetCompletionDate || o.dueDate || o.createdAt,
      }));
      setOrders(mappedOrders);
    } catch (e) {
      console.error('Failed to fetch sales master orders stream:', e);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = orders.filter((o) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (o.orderNumber || '').toLowerCase().includes(query) ||
      (o.customer?.fullName || '').toLowerCase().includes(query) ||
      (o.customer?.companyName || '').toLowerCase().includes(query) ||
      (o.customer?.phone || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-3 sm:px-6 lg:px-8">
      {/* ─── TITLE & CONTROLS ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/90 pb-5 bg-white p-4 sm:p-5 rounded-xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              MANUFACTURING QUEUE
            </span>
            <span className="text-xs font-mono text-slate-400">
              {orders.length} Total Orders
            </span>
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-bold text-slate-900 tracking-tight leading-tight">
            Master Orders Stream
          </h1>
          <p className="text-[12.5px] sm:text-[13px] text-slate-500 mt-1">
            Real-time shop floor order pipeline, stage progression, and SLA tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64 min-w-[200px] flex-1 sm:flex-initial">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order ID, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-9.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white text-xs sm:text-[13px] focus:border-slate-900 focus:bg-white focus:outline-none w-full shadow-2xs transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto h-9.5 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-[13px] font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-slate-900 cursor-pointer"
          >
            <option value="ALL">All Stages ({orders.length})</option>
            <option value="CUSTOMER_APPROVAL_REQUIRED">Proof Approval Gate</option>
            <option value="PRODUCTION_QUEUE">Production Queue</option>
            <option value="PRINTING">Printing Active</option>
            <option value="QUALITY_CHECK">Final QC</option>
            <option value="PACKING">Packing</option>
            <option value="READY_FOR_DISPATCH">Ready to Dispatch</option>
            <option value="ON_HOLD">On Hold / Exceptions</option>
          </select>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={isLoading}
            className="h-9.5 px-3 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-slate-500' : 'text-slate-600'}`} />
          </Button>

          {/* New Walk-in Button */}
          <Link href="/sales/walk-in" className="w-full sm:w-auto">
            <Button variant="primary" size="sm" className="w-full h-9.5 justify-center flex items-center gap-1.5 font-bold shadow-2xs cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>New Walk-in Order</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── OPERATIONAL MASTER TABLE ───────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse min-w-[860px]">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-mono font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4 font-mono">Order Record</th>
                <th className="py-3 px-4 font-mono">Customer & Entity</th>
                <th className="py-3 px-4 font-mono">Total Amount</th>
                <th className="py-3 px-4 font-mono">Production Stage</th>
                <th className="py-3 px-4 font-mono">Priority & SLA</th>
                <th className="py-3 px-4 text-right font-mono pr-5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                      <span className="text-xs font-mono font-medium text-slate-500">Loading master orders stream...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700 text-sm">No orders found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {searchQuery || statusFilter !== 'ALL'
                          ? 'Try adjusting your search query or stage filter.'
                          : 'No orders have been recorded in the system yet.'}
                      </p>
                      {(searchQuery || statusFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                          className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. Order Record */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Link
                        href={`/sales/orders/${ord.orderNumber}`}
                        className="font-mono font-bold text-slate-900 hover:text-blue-600 hover:underline text-[13px] block leading-tight"
                      >
                        #{ord.orderNumber}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-mono tracking-tight uppercase">MASTER RECORD</span>
                    </td>

                    {/* 2. Customer & Entity */}
                    <td className="py-3.5 px-4 min-w-[200px] max-w-[280px]">
                      <span className="font-semibold text-slate-900 block text-[13px] leading-tight truncate" title={ord.customer?.fullName || 'Direct Customer'}>
                        {ord.customer?.fullName || 'Direct Customer'}
                      </span>
                      {ord.customer?.companyName && (
                        <span className="text-[11.5px] text-slate-500 block truncate leading-tight mt-0.5" title={ord.customer.companyName}>
                          {ord.customer.companyName}
                        </span>
                      )}
                      {ord.customer?.phone && (
                        <span className="text-[11px] font-mono text-slate-400 block leading-tight mt-0.5">
                          {ord.customer.phone}
                        </span>
                      )}
                    </td>

                    {/* 3. Total Amount */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 text-[13.5px] block tabular-nums leading-tight">
                        {formatCurrency(ord.totalAmount)}
                      </span>
                      <span className="inline-block text-[9.5px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold uppercase mt-0.5">
                        {ord.paymentStatus || 'PAID'}
                      </span>
                    </td>

                    {/* 4. Production Stage */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={ord.status} />
                    </td>

                    {/* 5. Priority & SLA */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span
                          className={`inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                            ord.priority === 'URGENT'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : ord.priority === 'HIGH'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {ord.priority} PRIORITY
                        </span>
                        <span className="text-[11.5px] text-slate-600 font-mono font-medium block">
                          {formatOrderDate(ord.dueAt)}
                        </span>
                      </div>
                    </td>

                    {/* 6. Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap pr-5">
                      <Link href={`/sales/orders/${ord.orderNumber}`}>
                        <Button variant="primary" size="xs" className="font-bold shadow-2xs cursor-pointer">
                          <span>Inspect</span>
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}