'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Layers,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Package,
  Plus,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { Button, Badge, StatusBadge, Input } from '@/components/ui';

const SAMPLE_ORDERS = [
  {
    id: 'ord-001',
    orderNumber: 'PB-2026-0001',
    customer: { fullName: 'Rohit Singhania', companyName: 'Acme Tech Pvt Ltd', phone: '+919876543210' },
    status: 'CUSTOMER_APPROVAL_REQUIRED',
    paymentStatus: 'PAID',
    priority: 'HIGH',
    slaStatus: 'ON_TIME',
    totalAmount: 1475.0,
    itemSummary: 'Premium Visiting Cards (500 units)',
    dueAt: 'In 2 days',
  },
  {
    id: 'ord-002',
    orderNumber: 'PB-2026-0002',
    customer: { fullName: 'Anand Kumar', companyName: 'Zenith Retail', phone: '+919822334455' },
    status: 'ARTWORK_APPROVED',
    paymentStatus: 'PAID',
    priority: 'URGENT',
    slaStatus: 'AT_RISK',
    totalAmount: 2500.0,
    itemSummary: 'Deluxe Roll-Up Banner Standee (2 units)',
    dueAt: 'In 8 hours',
  },
  {
    id: 'ord-003',
    orderNumber: 'PB-2026-0003',
    customer: { fullName: 'Deepa Menon', companyName: 'Menon Law Chambers', phone: '+919833445566' },
    status: 'PRINTING',
    paymentStatus: 'PAID',
    priority: 'NORMAL',
    slaStatus: 'ON_TIME',
    totalAmount: 890.0,
    itemSummary: 'Executive Letterheads (1000 units)',
    dueAt: 'In 1 day',
  },
  {
    id: 'ord-004',
    orderNumber: 'PB-2026-0004',
    customer: { fullName: 'Sanjay Gupta', companyName: 'Gupta Sweets & Bakers', phone: '+919844556677' },
    status: 'ON_HOLD',
    paymentStatus: 'PAID',
    priority: 'HIGH',
    slaStatus: 'DELAYED',
    totalAmount: 4200.0,
    itemSummary: 'Rigid Mithai Sweet Boxes (200 units)',
    dueAt: 'Overdue by 4 hours',
  },
];

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
  itemSummary: string;
  dueAt: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>(SAMPLE_ORDERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = (await api.listOrders()) as { data: SalesOrder[] };
        if (res?.data && res.data.length > 0) {
          setOrders(res.data);
        }
      } catch (e) {
        console.warn('API list fallback to active demo dataset', e);
      }
    }
    fetchOrders();
  }, []);

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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5 bg-white p-5 rounded-xl border shadow-xs">
        <div>
          <span className="text-[11px] font-mono uppercase font-semibold text-slate-400 block mb-1">
            MANUFACTURING QUEUE
          </span>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2]">
            Master Orders Stream
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Real-time shop floor order pipeline, stage progression, and SLA tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order ID, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-9 rounded-lg border border-slate-200 bg-white text-[13px] font-normal focus:border-slate-900 focus:outline-none w-64 shadow-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 shadow-xs focus:outline-none"
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

          <Link href="/sales/walk-in">
            <Button variant="primary" size="md" className="flex items-center gap-1.5 font-bold shadow-xs">
              <Plus className="h-4 w-4" />
              <span>New Walk-in Order</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Operational Master Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[12px] font-mono font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Order Record</th>
                <th className="py-3 px-4">Customer & Entity</th>
                <th className="py-3 px-4">Item Snapshot</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Production Stage</th>
                <th className="py-3 px-4">Priority & SLA</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-semibold text-slate-900 text-[13px] block">
                      {ord.orderNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">MASTER RECORD</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-900 block text-[13px]">{ord.customer?.fullName || 'Direct Customer'}</span>
                    {ord.customer?.companyName && (
                      <span className="text-[12px] text-slate-500 block">{ord.customer.companyName}</span>
                    )}
                    {ord.customer?.phone && (
                      <span className="text-[11px] font-mono text-slate-400">{ord.customer.phone}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <span className="text-[13px] font-normal text-slate-800 line-clamp-1">
                      {ord.itemSummary}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-semibold text-slate-900 text-[13px] block tabular-nums">
                      {formatCurrency(ord.totalAmount)}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-medium uppercase">
                      {ord.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={ord.status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <span
                        className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded uppercase ${
                          ord.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-800'
                            : ord.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ord.priority} PRIORITY
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono block">{ord.dueAt}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link href={`/sales/orders/${ord.orderNumber}`}>
                      <Button variant="primary" size="xs">
                        <span>Inspect</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
