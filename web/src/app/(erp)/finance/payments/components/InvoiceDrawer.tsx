'use client';

import React from 'react';
import {
  RiCloseLine,
  RiFileTextLine,
  RiDownload2Line,
  RiPrinterLine,
  RiCheckboxCircleFill,
  RiBuildingLine,
  RiBarcodeLine,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import { FinanceCardDto } from './FinanceJobCard';

interface InvoiceDrawerProps {
  card: FinanceCardDto | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceDrawer({ card, isOpen, onClose }: InvoiceDrawerProps) {
  if (!isOpen || !card) return null;

  const invoiceNo = card.invoiceNumber || `INV-2026-${card.orderNumber.replace(/[^0-9]/g, '')}`;
  const cgst = card.taxAmount / 2;
  const sgst = card.taxAmount / 2;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
              <RiFileTextLine className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <span className="font-mono font-bold text-amber-300 text-sm block">
                {invoiceNo}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Order #{card.orderNumber} • Section 31 CGST Compliant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
              title="Print Tax Invoice"
            >
              <RiPrinterLine className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <RiCloseLine className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-sans text-xs">
          {/* Company & Client Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
            <div>
              <h2 className="font-black text-slate-950 text-base tracking-tight">PRINT BAZZAR 2.0</h2>
              <span className="text-slate-500 block text-[11px]">Industrial Print & Packaging Hub</span>
              <span className="text-slate-500 font-mono block text-[10px]">GSTIN: 27AABCP1234F1Z5</span>
              <span className="text-slate-500 text-[10px]">Bhiwandi MIDC Complex, Mumbai 421302</span>
            </div>

            <div className="text-right font-mono">
              <span className="text-slate-400 uppercase font-bold text-[9px] block">INVOICE DATE</span>
              <span className="font-bold text-slate-900 text-[11px]">
                {new Date(card.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1">
                <RiCheckboxCircleFill className="h-3 w-3 text-emerald-600" />
                {card.paymentStatus === 'PAID' ? 'TAX INVOICE (PAID)' : 'TAX INVOICE (RECEIVABLE)'}
              </span>
            </div>
          </div>

          {/* Billed To */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block font-mono">
              BILLED TO / BUYER
            </span>
            <strong className="text-slate-900 text-[13px] block">
              {card.customerCompany || card.customerName}
            </strong>
            {card.customerEmail && <span className="text-slate-600 block">{card.customerEmail}</span>}
            {card.customerPhone && <span className="text-slate-600 font-mono block">PH: {card.customerPhone}</span>}
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase font-bold">
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5 text-center">HSN/SAC</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Taxable Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="p-2.5 font-bold text-slate-900">
                    {card.productName}
                    <span className="block text-[10px] text-slate-400 font-normal">Standard 4-Color Print Run</span>
                  </td>
                  <td className="p-2.5 text-center font-mono text-slate-500">4911</td>
                  <td className="p-2.5 text-center font-mono text-slate-900 font-bold">{card.quantity} pcs</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(card.subtotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Grand Total */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Print Goods Subtotal:</span>
              <span>{formatCurrency(card.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-800 font-semibold py-1 border-t border-slate-200/60">
              <span>Courier & Delivery Charges:</span>
              <span>{card.shippingAmount ? formatCurrency(card.shippingAmount) : 'FREE / Included'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CGST (9.0%):</span>
              <span>{formatCurrency(cgst)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>SGST (9.0%):</span>
              <span>{formatCurrency(sgst)}</span>
            </div>
            <div className="flex justify-between text-slate-950 font-bold text-sm pt-2 border-t border-slate-200">
              <span>Grand Total (INR):</span>
              <span>{formatCurrency(card.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-emerald-800 font-semibold text-[11px] pt-1">
              <span>Amount Paid:</span>
              <span>{formatCurrency(card.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-amber-900 font-bold text-[11px]">
              <span>Balance Due:</span>
              <span>{formatCurrency(card.balanceAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400">
            Authorized Digital Invoice • Print Bazzar ERP
          </span>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
