'use client';

import React, { useState, useEffect } from 'react';
import {
  RiMoneyDollarCircleLine,
  RiCloseLine,
  RiBankCardLine,
  RiErrorWarningLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { FinanceCardDto } from './FinanceJobCard';

interface RecordManualPaymentModalProps {
  card: FinanceCardDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitPayment: (orderId: string, amount: number, method: string, ref: string, notes?: string) => Promise<void>;
}

export function RecordManualPaymentModal({
  card,
  isOpen,
  onClose,
  onSubmitPayment,
}: RecordManualPaymentModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<string>('BANK_TRANSFER_NEFT');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (card) {
      setAmount(String(card.balanceAmount > 0 ? card.balanceAmount : card.totalAmount));
      setReferenceNumber(`UTR-${Date.now().toString().slice(-6)}`);
      setNotes('');
      setError(null);
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }
    if (!referenceNumber) {
      setError('Please enter a transaction / UTR / cheque reference number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitPayment(card.orderId, numAmount, method, referenceNumber, notes || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#FFED00] text-slate-950 border border-[#E3A008]/50 rounded-xl shadow-xs">
              <RiMoneyDollarCircleLine className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-950 uppercase tracking-tight">
                Record Payment / Bank Transfer
              </h3>
              <p className="text-[11px] text-amber-800 font-mono">
                Order #{card.orderNumber} • {card.customerName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
              <RiErrorWarningLine className="h-4 w-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Due Snapshot */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between font-mono">
            <span className="text-slate-500 font-semibold">Balance Due:</span>
            <span className="font-bold text-amber-900 text-sm">{formatCurrency(card.balanceAmount)}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Payment Amount (INR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-9 pl-7 pr-3 font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Payment Method *
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-9 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 focus:outline-none focus:border-slate-900 focus:bg-white"
            >
              <option value="BANK_TRANSFER_NEFT">NEFT / RTGS Direct Sweep</option>
              <option value="UPI">UPI Direct QR / VPA</option>
              <option value="CASH_ON_COUNTER">Cash on Counter Receipt</option>
              <option value="CORPORATE_CREDIT">Corporate Credit Terms (Net-30)</option>
              <option value="DEBIT_CARD">POS Card Terminal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Transaction / UTR Reference Number *
            </label>
            <input
              type="text"
              required
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UTR-9821048102 or Cheque #88102"
              className="w-full h-9 px-3 font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Accounts Notes & Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared via HDFC Bank Current A/c"
              className="w-full h-9 px-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#FFED00] hover:bg-[#FDD835] text-slate-950 font-bold text-xs rounded-lg shadow-xs border border-[#E3A008]/50 transition active:scale-95"
            >
              {isSubmitting ? 'Recording...' : 'Confirm & Settle Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
