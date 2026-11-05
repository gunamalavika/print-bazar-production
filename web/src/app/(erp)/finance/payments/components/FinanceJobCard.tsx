'use client';

import React from 'react';
import Link from 'next/link';
import {
  RiDragMove2Fill,
  RiBankCardLine,
  RiUser3Line,
  RiTimeLine,
  RiAlertFill,
  RiCheckFill,
  RiFileTextLine,
  RiMoneyDollarCircleLine,
  RiShareForwardLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';

export interface FinanceCardDto {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerCompany?: string;
  customerEmail?: string;
  customerPhone?: string;
  productName: string;
  quantity: number;
  subtotal: number;
  shippingAmount?: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  financeStatus: 'PAYMENT_PENDING' | 'CORPORATE_CREDIT' | 'SETTLED' | 'OVERDUE';
  finalQcPassed?: boolean;
  packingBlocked?: boolean;
  paymentMethod: string;
  transactionId?: string;
  invoiceNumber?: string;
  invoicePdfUrl?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  slaStatus: string;
  createdAt: string;
  dueAt?: string;
}

interface FinanceJobCardProps {
  card: FinanceCardDto;
  onRecordPayment: (card: FinanceCardDto) => void;
  onViewInvoice: (card: FinanceCardDto) => void;
  onSendReminder: (card: FinanceCardDto) => void;
  onDragStart: (e: React.DragEvent, card: FinanceCardDto) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export function FinanceJobCard({
  card,
  onRecordPayment,
  onViewInvoice,
  onSendReminder,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: FinanceJobCardProps) {
  const priorityColor =
    card.priority === 'URGENT'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : card.priority === 'HIGH'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  const isPaid = card.financeStatus === 'SETTLED' || card.balanceAmount <= 0;
  const isCorporate = card.financeStatus === 'CORPORATE_CREDIT';
  const isOverdue = card.financeStatus === 'OVERDUE';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onDragEnd={onDragEnd}
      className={`bg-white border rounded-xl p-3.5 shadow-xs transition-all select-none group relative flex flex-col justify-between gap-2.5 ${
        isDragging
          ? 'opacity-40 border-slate-400 scale-[0.98]'
          : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
      } ${
        isOverdue
          ? 'ring-1 ring-rose-400 bg-rose-50/20'
          : isCorporate
          ? 'bg-purple-50/10 border-purple-200'
          : isPaid
          ? 'border-emerald-200 bg-emerald-50/10'
          : ''
      }`}
    >
      {/* Top Row: Order Number, Invoice #, Priority & Drag Handle */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[13px] font-bold text-slate-900 truncate">
              #{card.orderNumber}
            </span>
            {card.invoiceNumber ? (
              <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {card.invoiceNumber}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                PRO-FORMA
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
            {card.customerCompany || card.customerName}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold border ${priorityColor}`}>
            {card.priority}
          </span>

          <div
            className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-grab active:cursor-grabbing transition"
            title="Drag across finance stages"
          >
            <RiDragMove2Fill className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Operational Quality & Clearance Gate Status */}
      {card.finalQcPassed && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
            <RiCheckFill className="h-3 w-3 text-emerald-600" />
            FINAL QC PASSED
          </span>

          {card.balanceAmount > 0 ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 font-mono">
              <RiAlertFill className="h-3 w-3 text-amber-600" />
              PACKING BLOCKED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-mono">
              RELEASED TO PACKING
            </span>
          )}
        </div>
      )}

      {/* Product & Run Quantity */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-xs font-semibold text-slate-900 line-clamp-1">
          {card.productName}
        </span>
        <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded flex-shrink-0 border border-slate-200/80">
          {card.quantity.toLocaleString()} pcs
        </span>
      </div>

      {/* Financial Breakdown Snapshot */}
      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Grand Total:</span>
          <span className="font-mono font-bold text-slate-950 text-xs">
            {formatCurrency(card.totalAmount)}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-200/60 font-mono">
          <span>Paid: {formatCurrency(card.paidAmount)}</span>
          <span className={card.balanceAmount > 0 ? 'text-amber-800 font-bold' : 'text-emerald-700 font-bold'}>
            Due: {formatCurrency(card.balanceAmount)}
          </span>
        </div>
      </div>

      {/* Payment Method Badge & Time Row */}
      <div className="flex items-center justify-between text-[11px] pt-0.5">
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[150px]">
          {card.paymentMethod.replace(/_/g, ' ')}
        </span>

        <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
          <RiTimeLine className="h-3 w-3" />
          <span>
            {new Date(card.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => onViewInvoice(card)}
          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 py-1 px-1.5 rounded hover:bg-slate-100 transition"
        >
          <RiFileTextLine className="h-3.5 w-3.5 text-slate-400" />
          <span>Tax Invoice</span>
        </button>

        <div className="flex items-center gap-1">
          {card.balanceAmount > 0 ? (
            <>
              <button
                type="button"
                onClick={() => onSendReminder(card)}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200"
                title="Send Payment Reminder & Link"
              >
                <RiShareForwardLine className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onRecordPayment(card)}
                className="inline-flex items-center gap-1 bg-[#FFED00] hover:bg-[#FDD835] text-slate-950 font-bold text-[11px] px-2.5 py-1 rounded-md border border-[#E3A008]/50 shadow-2xs transition active:scale-95"
                title={card.finalQcPassed ? 'Settling full payment automatically releases order to Packing Station' : 'Record payment'}
              >
                <RiMoneyDollarCircleLine className="h-3.5 w-3.5" />
                <span>{card.finalQcPassed ? 'Clear & Release' : 'Pay ₹'}</span>
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
              <RiCheckFill className="h-3 w-3 text-emerald-600" />
              CLEARED
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
