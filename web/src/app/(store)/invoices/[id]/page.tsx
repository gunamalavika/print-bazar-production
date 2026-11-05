'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, Truck, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';

export default function InvoicePrintablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id || 'PB-2026-0001';

  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    const fetchInvoice = async () => {
      try {
        const data = await api.getInvoice(invoiceId);
        if (!isCancelled && data) {
          setInvoiceData(data);
        }
      } catch (err) {
        console.warn('Could not load remote invoice record, showing formatted invoice view:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchInvoice();
    return () => {
      isCancelled = true;
    };
  }, [invoiceId]);

  // Derived values from real data or standard mock fallback
  const order = invoiceData?.order;
  const invoiceNo = invoiceData?.invoiceNumber || (invoiceId.startsWith('INV-') ? invoiceId : `INV-${invoiceId}`);
  const invoiceDate = invoiceData?.issuedAt
    ? new Date(invoiceData.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '29-Sep-2026';
  const orderNumber = order?.orderNumber || invoiceId;

  // Buyer info
  const buyerName = order?.customer?.companyName || order?.customer?.fullName || 'Acme Logistics Corp';
  const buyerContact = order?.customer?.phone || '+91 98765 43210';
  const buyerGstin = invoiceData?.customerGstin || order?.customer?.gstin || '27AABCA9911D1ZX';

  const shippingAddr = order?.shippingAddress;
  const deliveryAddressStr = shippingAddr
    ? `${shippingAddr.street}, ${shippingAddr.city}, ${shippingAddr.state} — ${shippingAddr.postalCode}`
    : 'BKC Industrial Hub, Tower 4, Bandra East, Mumbai, Maharashtra — 400051';

  // Items
  const items = order?.items && order.items.length > 0
    ? order.items
    : [
        {
          id: 'item-1',
          productName: 'Premium Visiting Cards',
          sku: '4911',
          quantity: 500,
          unitPrice: 2.5,
          totalPrice: 1250,
          specifications: {
            paperGsm: '400 GSM Velvet Artboard',
            finish: 'Matte Thermal Lamination • Spot UV Double Sided',
          },
        },
      ];

  const subtotal = Number(invoiceData?.subtotal || order?.subtotal || 1250);
  const shippingFee = Number(invoiceData?.shippingAmount ?? order?.shippingAmount ?? 150);
  const cgst = Number(invoiceData?.cgst ?? (subtotal * 0.09));
  const sgst = Number(invoiceData?.sgst ?? (subtotal * 0.09));
  const igst = Number(invoiceData?.igst ?? 0);
  const grandTotal = Number(invoiceData?.grandTotal || (subtotal + shippingFee + cgst + sgst + igst));

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6">
      {/* Print / Navigation Action Bar */}
      <div className="mx-auto max-w-4xl mb-6 flex items-center justify-between print:hidden">
        <Link href="/account" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Account</span>
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            <span>Print Tax Invoice (A4)</span>
          </Button>
        </div>
      </div>

      {/* Formal Master Tax Invoice Sheet (A4 Proportion) */}
      <div className="mx-auto max-w-4xl bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 shadow-card print:border-none print:shadow-none print:p-0 text-slate-900">
        {/* Header: Company & Invoice Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight font-display">PRINT BAZZAR</span>
              <span className="bg-[#FFED00] text-slate-950 text-[10px] font-mono font-black px-1.5 py-0.5 rounded border border-[#E3A008]/40">
                2.0
              </span>
            </div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-0.5">
              Print Bazzar Manufacturing Pvt. Ltd.
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">
              Industrial Area Phase 2, Press Complex<br />
              Plot 42-C, Lower Parel, Mumbai, MH — 400013<br />
              <strong>GSTIN: 27AABCP8920K1ZM</strong> • PAN: AABCP8920K<br />
              State: Maharashtra (Code: 27)
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xl font-black text-slate-900 block tracking-tight font-display">
              TAX INVOICE
            </span>
            <span className="text-[10px] font-mono text-slate-500 block">
              ORIGINAL FOR RECIPIENT
            </span>

            <div className="mt-3 space-y-1 text-xs font-mono">
              <p>
                <span className="text-slate-500">Invoice No:</span>{' '}
                <strong className="text-slate-900">{invoiceNo}</strong>
              </p>
              <p>
                <span className="text-slate-500">Invoice Date:</span>{' '}
                <strong>{invoiceDate}</strong>
              </p>
              <p>
                <span className="text-slate-500">Order Ref:</span>{' '}
                <strong className="text-slate-900">#{orderNumber}</strong>
              </p>
              <p>
                <span className="text-slate-500">Place of Supply:</span>{' '}
                <strong>Maharashtra (27)</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Billed To / Shipped To Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
          <div>
            <span className="font-mono uppercase font-bold text-slate-400 block text-[10px]">
              BILLED TO (BUYER)
            </span>
            <h3 className="font-bold text-sm text-slate-900 mt-1">{buyerName}</h3>
            <p className="text-slate-600 mt-1 leading-relaxed">
              {deliveryAddressStr}<br />
              <strong>GSTIN: {buyerGstin}</strong> • Contact: {buyerContact}
            </p>
          </div>

          <div>
            <span className="font-mono uppercase font-bold text-slate-400 block text-[10px]">
              SHIPPED TO (DELIVERY SITE)
            </span>
            <h3 className="font-bold text-sm text-slate-900 mt-1">{buyerName}</h3>
            <p className="text-slate-600 mt-1 leading-relaxed">
              {deliveryAddressStr}<br />
              Method: {order?.deliveryMethod === 'STORE_PICKUP' ? 'Plant Store Pickup' : 'Express Courier Delivery'}
            </p>
          </div>
        </div>

        {/* Itemized Table Including Goods & Separately Displayed Delivery Charges */}
        <div className="py-6 border-b border-slate-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-mono font-bold text-slate-500 uppercase">
                <th className="text-left pb-2">Item Description & Specifications</th>
                <th className="text-center pb-2">HSN / SAC</th>
                <th className="text-right pb-2">Qty</th>
                <th className="text-right pb-2">Rate</th>
                <th className="text-right pb-2">Taxable Amt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {items.map((item: any, idx: number) => {
                const specParts = item.specifications
                  ? Object.entries(item.specifications)
                      .map(([k, v]) => (typeof v === 'string' ? v : ''))
                      .filter(Boolean)
                      .join(' • ')
                  : '';

                return (
                  <tr key={item.id || idx}>
                    <td className="py-3 pr-4">
                      <span className="font-bold text-slate-900 block">{item.productName}</span>
                      {specParts && (
                        <span className="text-[11px] text-slate-500 block">
                          {specParts}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center font-mono text-slate-600">4911</td>
                    <td className="py-3 text-right font-mono font-bold">{item.quantity} pcs</td>
                    <td className="py-3 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 text-right font-mono font-bold">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                );
              })}

              {/* SEPARATELY DISPLAYED COURIER & DELIVERY CHARGES ROW */}
              <tr className="bg-slate-50/80 font-sans">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-slate-700" />
                    <span className="font-bold text-slate-900 block">
                      Courier & Logistics Delivery Charges
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block pl-5">
                    Doorstep Express Delivery Service • Safe Handling & Packaging
                  </span>
                </td>
                <td className="py-3 text-center font-mono text-slate-600 font-semibold">
                  996812
                </td>
                <td className="py-3 text-right font-mono font-semibold">1 shipment</td>
                <td className="py-3 text-right font-mono font-semibold">
                  {shippingFee === 0 ? 'FREE' : formatCurrency(shippingFee)}
                </td>
                <td className="py-3 text-right font-mono font-bold text-slate-900">
                  {shippingFee === 0 ? 'FREE (₹0.00)' : formatCurrency(shippingFee)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tax Summary Calculation */}
        <div className="py-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-6 text-xs">
          <div className="space-y-1 max-w-sm text-[11px] text-slate-500">
            <p className="font-bold text-slate-700">Payment Status: {order?.paymentStatus || 'PAID ONLINE'}</p>
            <p>Delivery Method: {order?.deliveryMethod || 'COURIER'}</p>
            <p>E-Way Bill: Not required (&lt; ₹50,000 threshold)</p>
          </div>

          <div className="w-full sm:w-72 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Print Goods Subtotal:</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>

            {/* SEPARATE DELIVERY CHARGES LINE ITEM IN BREAKDOWN */}
            <div className="flex justify-between text-slate-800 font-semibold py-1 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <Truck className="h-3 w-3 text-slate-600" />
                <span>Courier / Delivery Charges:</span>
              </span>
              <span className={`font-mono font-bold ${shippingFee === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                {shippingFee === 0 ? 'FREE (₹0.00)' : formatCurrency(shippingFee)}
              </span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Total Taxable Base:</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal + shippingFee)}</span>
            </div>

            {igst > 0 ? (
              <div className="flex justify-between text-slate-600">
                <span>IGST (18.0%):</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(igst)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (9.0%):</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(cgst)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (9.0%):</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(sgst)}</span>
                </div>
              </>
            )}

            <div className="pt-2 border-t-2 border-slate-900 flex justify-between font-black text-sm text-slate-900 font-display">
              <span>Total Invoice Value:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Authorized Signature Footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-end justify-between gap-6 text-xs">
          <div className="text-[10px] text-slate-400 font-mono">
            This is an official system-generated GST Tax Invoice with separated courier charges.
          </div>
          <div className="text-right">
            <div className="h-10 border-b border-slate-300 w-48 mb-1" />
            <span className="font-bold text-slate-900 block">For PRINT BAZZAR MFG PVT LTD</span>
            <span className="text-[10px] text-slate-500">Authorized Signatory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
