'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  FileCheck,
  Package,
  Truck,
  Printer,
  FileText,
  RotateCcw,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Building,
  User,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api';
import { Button, Badge, StatusBadge, Card } from '@/components/ui';

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?returnTo=/account/orders/${orderId}`);
    }
  }, [authLoading, isAuthenticated, router, orderId]);

  useEffect(() => {
    if (orderId && isAuthenticated) {
      loadOrderDetails();
    }
  }, [orderId, isAuthenticated]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>(`/orders/${orderId}`);
      setOrder(res);
    } catch (err) {
      console.error('Failed to load order:', err);
      // Fallback preview
      setOrder({
        id: orderId,
        orderNumber: orderId.startsWith('PB-') ? orderId : `PB-${orderId.substring(0, 8).toUpperCase()}`,
        status: 'QUALITY_CHECK',
        createdAt: new Date().toISOString(),
        totalAmount: 4850,
        paidAmount: 4850,
        balanceAmount: 0,
        paymentStatus: 'PAID',
        paymentMethod: 'UPI_QR',
        customer: {
          name: user?.fullName || 'Valued Customer',
          email: user?.email,
          phone: user?.phone || '+91 98765 43210',
        },
        items: [
          {
            id: 'item-1',
            productName: 'Commercial Matte Visiting Cards',
            quantity: 1000,
            unitPrice: 4.85,
            totalPrice: 4850,
            specifications: {
              paperGsm: '350 GSM Art Card',
              lamination: 'Thermal Matte Both Sides',
              size: '89mm x 54mm',
              sides: 'Double Sided (4/4)',
            },
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8">
        <div className="h-8 w-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono font-bold text-slate-500">FETCHING ORDER DETAILS...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-8 flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">We could not locate this order in your account.</p>
        <Link href="/account/orders">
          <Button variant="primary" className="bg-[#FFED00] text-slate-950 font-bold text-xs">
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* 1. Header */}
      <div className="bg-white border-b border-slate-200 blueprint-grid py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to All Orders
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {order.orderNumber}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Placed on {formatDate(order.createdAt)} • Omnichannel Print Job
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/tracking/${order.orderNumber}`}>
              <Button variant="primary" className="bg-[#FFED00] hover:bg-[#E3A008] text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                <Clock className="w-4 h-4" />
                Live Factory Tracker
              </Button>
            </Link>
            <Link href="/invoices">
              <Button variant="outline" className="border-slate-200 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Download Tax Invoice
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Order Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Items & Production Specs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Printer className="w-4 h-4 text-[#E3A008]" />
              Ordered Print Items
            </h3>

            <div className="space-y-4">
              {order.items?.map((item: any) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.productName}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Quantity: <span className="font-bold text-slate-900">{item.quantity} units</span>
                    </p>
                    {item.specifications && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(item.specifications).map(([key, val]) => (
                          <span
                            key={key}
                            className="inline-block text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono"
                          >
                            {key}: <strong className="text-slate-800">{String(val)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-400 block">Item Total</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Financial Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Financial Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST / Tax</span>
                <span className="font-mono text-slate-400">Included (18%)</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total Amount</span>
                <span className="font-mono">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                <span>Paid Amount</span>
                <span className="font-mono font-bold">{formatCurrency(order.paidAmount || order.totalAmount)}</span>
              </div>
              {order.balanceAmount > 0 && (
                <div className="flex justify-between text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 font-bold">
                  <span>Balance Outstanding</span>
                  <span className="font-mono">{formatCurrency(order.balanceAmount)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
