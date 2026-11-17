'use client';

import React from 'react';
import Link from 'next/link';
import {
  RiArrowRightLine,
  RiFileList3Line,
  RiUser3Line,
  RiCheckboxCircleFill,
  RiTimeLine,
  RiTruckLine,
  RiStore2Line,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import { DashboardOrderSummary } from './OrderVolumeRevenueChart';

interface RecentOrdersTableProps {
  orders: DashboardOrderSummary[];
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const recentList = orders.slice(0, 8);

  const getStageBadge = (status: string) => {
    switch (status) {
      case 'ORDER_CREATED':
      case 'PAYMENT_PENDING':
      case 'PAYMENT_CONFIRMED':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'DESIGN_REQUIRED':
      case 'ARTWORK_REVIEW':
      case 'ARTWORK_APPROVED':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'CUSTOMER_APPROVAL_REQUIRED':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'PRODUCTION_QUEUE':
      case 'PRINTING':
      case 'FINISHING':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'QUALITY_CHECK':
      case 'PACKING':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'READY_FOR_DISPATCH':
      case 'OUT_FOR_DELIVERY':
      case 'COMPLETED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-900 text-white">
            <RiFileList3Line className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[15px] sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Live Order Stream (Latest Records)</span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {orders.length} Total Master Records
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Omnichannel order intake from e-commerce portal and walk-in counter POS.
            </p>
          </div>
        </div>

        <Link
          href="/sales/orders"
          className="text-xs font-bold text-slate-800 hover:text-slate-950 inline-flex items-center gap-1 hover:underline"
        >
          <span>View All in Master Orders Stream</span>
          <RiArrowRightLine className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase font-bold">
              <th className="pb-2.5">Order Record</th>
              <th className="pb-2.5">Customer & Entity</th>
              <th className="pb-2.5">Product & Items</th>
              <th className="pb-2.5">Total Value</th>
              <th className="pb-2.5">Production Stage</th>
              <th className="pb-2.5">Delivery</th>
              <th className="pb-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {recentList.map((ord) => {
              const firstItem = ord.items?.[0];
              const isPaid = ord.paymentStatus === 'PAID';

              return (
                <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                  {/* Order Number & Timestamp */}
                  <td className="py-3">
                    <span className="font-mono font-bold text-slate-900 block">
                      #{ord.orderNumber}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                      {new Date(ord.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>

                  {/* Customer */}
                  <td className="py-3">
                    <span className="font-bold text-slate-900 block truncate max-w-[160px]">
                      {ord.customer?.fullName || 'Walk-in Customer'}
                    </span>
                    {ord.customer?.companyName && (
                      <span className="text-[10px] text-slate-500 block truncate max-w-[160px]">
                        {ord.customer.companyName}
                      </span>
                    )}
                  </td>

                  {/* Product */}
                  <td className="py-3">
                    <span className="font-bold text-slate-800 block truncate max-w-[180px]">
                      {firstItem?.productName || 'Custom Print Job'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {firstItem?.quantity ? `${firstItem.quantity.toLocaleString()} pcs` : 'Standard Run'}
                    </span>
                  </td>

                  {/* Amount & Payment Status */}
                  <td className="py-3 font-mono">
                    <span className="font-bold text-slate-900 block">
                      {formatCurrency(Number(ord.totalAmount) || 0)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.2 rounded border mt-0.5 ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {isPaid ? (
                        <>
                          <RiCheckboxCircleFill className="h-2.5 w-2.5 text-emerald-600" />
                          PAID
                        </>
                      ) : (
                        <>
                          <RiTimeLine className="h-2.5 w-2.5 text-amber-600" />
                          PENDING
                        </>
                      )}
                    </span>
                  </td>

                  {/* Stage Pill */}
                  <td className="py-3">
                    <span
                      className={`inline-block font-mono text-[10.5px] font-bold px-2.5 py-1 rounded-md border tracking-tight ${getStageBadge(
                        ord.status
                      )}`}
                    >
                      {ord.status.replace(/_/g, ' ')}
                    </span>
                  </td>

                  {/* Delivery */}
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-700">
                      {ord.deliveryMethod === 'STORE_PICKUP' ? (
                        <>
                          <RiStore2Line className="h-3.5 w-3.5 text-purple-600" />
                          <span>Pickup</span>
                        </>
                      ) : (
                        <>
                          <RiTruckLine className="h-3.5 w-3.5 text-blue-600" />
                          <span>Courier</span>
                        </>
                      )}
                    </span>
                  </td>

                  {/* Action Link */}
                  <td className="py-3 text-right">
                    <Link
                      href="/sales/orders"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-slate-950 font-bold bg-slate-100 hover:bg-slate-200 rounded-lg transition text-[11px]"
                    >
                      <span>Inspect</span>
                      <RiArrowRightLine className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

