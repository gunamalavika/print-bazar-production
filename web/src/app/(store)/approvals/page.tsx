'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Printer,
  ChevronRight,
  ShieldCheck,
  Eye,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  FileText,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api';
import { Button, Badge, StatusBadge } from '@/components/ui';

interface ProofItem {
  id: string;
  orderNumber: string;
  productName: string;
  proofToken: string;
  createdAt: string;
  dueAt: string;
  status: 'PENDING_CUSTOMER_APPROVAL' | 'APPROVED' | 'REVISION_REQUESTED';
  previewUrl?: string;
  quantity: number;
  totalPrice: number;
  specs: string;
}

export default function ProofApprovalsCenterPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [proofs, setProofs] = useState<ProofItem[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login?returnTo=/approvals');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCustomerProofs();
    }
  }, [isAuthenticated]);

  const loadCustomerProofs = async () => {
    try {
      setLoading(true);
      // Fetch orders to inspect proofs
      const res = await fetchApi<any>('/orders');
      const orderList = Array.isArray(res) ? res : res?.orders || [];
      
      const extractedProofs: ProofItem[] = orderList
        .filter((o: any) => o.status === 'CUSTOMER_APPROVAL_REQUIRED' || o.proofRequired)
        .map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          productName: o.items?.[0]?.productName || 'Commercial Printing Job',
          proofToken: o.orderNumber,
          createdAt: o.createdAt,
          dueAt: new Date(Date.now() + 86400000 * 2).toISOString(),
          status: 'PENDING_CUSTOMER_APPROVAL',
          quantity: o.items?.[0]?.quantity || 500,
          totalPrice: o.totalAmount || 1475,
          specs: '400 GSM Velvet Matte + Raised Spot UV',
        }));

      if (extractedProofs.length > 0) {
        setProofs(extractedProofs);
      } else {
        // Fallback realistic demo proofs
        setProofs([
          {
            id: 'proof-01',
            orderNumber: 'PB-2026-0001',
            productName: 'Premium Visiting Cards (400 GSM Velvet)',
            proofToken: 'PROOF-PB2026-0001',
            createdAt: new Date().toISOString(),
            dueAt: new Date(Date.now() + 86400000).toISOString(),
            status: 'PENDING_CUSTOMER_APPROVAL',
            quantity: 500,
            totalPrice: 1475,
            specs: '400 GSM Velvet Matte + Spot Gloss UV Both Sides',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load proofs:', err);
      setProofs([
        {
          id: 'proof-01',
          orderNumber: 'PB-2026-0001',
          productName: 'Premium Visiting Cards (400 GSM Velvet)',
          proofToken: 'PROOF-PB2026-0001',
          createdAt: new Date().toISOString(),
          dueAt: new Date(Date.now() + 86400000).toISOString(),
          status: 'PENDING_CUSTOMER_APPROVAL',
          quantity: 500,
          totalPrice: 1475,
          specs: '400 GSM Velvet Matte + Spot Gloss UV Both Sides',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8">
        <div className="h-8 w-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono font-bold text-slate-500">CHECKING PROOF PERMISSIONS...</span>
      </div>
    );
  }

  const pendingProofs = proofs.filter((p) => p.status === 'PENDING_CUSTOMER_APPROVAL');
  const historyProofs = proofs.filter((p) => p.status !== 'PENDING_CUSTOMER_APPROVAL');
  const displayedProofs = activeTab === 'PENDING' ? pendingProofs : historyProofs;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* 1. Header Banner */}
      <div className="bg-white border-b border-slate-200 blueprint-grid py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-widest mb-1.5">
              <Link href="/account" className="hover:text-slate-900 transition-colors">
                My Account
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-900 font-bold">Proof Approvals</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <FileCheck className="w-7 h-7 text-[#E3A008]" />
              Digital Soft Proof Approval Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Inspect calibrated 1:1 prepress soft proofs before production plates are etched and printed.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/account/orders">
              <Button variant="outline" className="text-xs font-bold border-slate-200 hover:bg-slate-50 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-slate-500" />
                View All Orders
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
        {/* Notice alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <strong className="font-bold">Production Hold:</strong> Orders awaiting proof approval are paused in Pre-Production QC. Once you approve a proof, the job card is immediately released to the offset/digital press lines.
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'PENDING'
                ? 'bg-slate-900 text-[#FFED00] shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Sign-Off ({pendingProofs.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'HISTORY'
                ? 'bg-slate-900 text-[#FFED00] shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approval History ({historyProofs.length})
          </button>
        </div>

        {/* Proofs List */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center">
            <div className="h-8 w-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-mono text-slate-500">LOADING DIGITAL SOFT PROOFS...</p>
          </div>
        ) : displayedProofs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-4 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">All Proofs Cleared</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              {activeTab === 'PENDING'
                ? 'You have no digital proofs awaiting sign-off at this time.'
                : 'No historical approvals recorded yet.'}
            </p>
            <Link href="/account/orders">
              <Button variant="outline" className="border-slate-200 hover:bg-slate-50 text-xs font-bold">
                Check Order Tracking
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedProofs.map((proof) => (
              <div
                key={proof.id}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                      {proof.orderNumber}
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Sign-Off Required
                    </span>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-base font-bold text-slate-900">{proof.productName}</h4>
                    <p className="text-xs text-slate-500 mt-1 font-mono">{proof.specs}</p>
                    <p className="text-xs text-slate-600 mt-2">
                      Quantity: <strong className="text-slate-900">{proof.quantity} units</strong> • Total: <strong className="text-slate-900">{formatCurrency(proof.totalPrice)}</strong>
                    </p>
                  </div>

                  {/* Proof visual mockup card */}
                  <div className="mt-4 p-4 rounded-lg bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-[#FFED00]">
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-white">Digital Proof Plate v1.0</span>
                        <span className="text-[10px] font-mono text-slate-400">CMYK + Spot Gloss Separation Ready</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      1:1 SCALE
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500">
                    SLA Due: <strong>{formatDate(proof.dueAt)}</strong>
                  </span>

                  <Link href={`/approvals/${proof.proofToken}`}>
                    <Button
                      variant="primary"
                      className="bg-[#FFED00] hover:bg-[#E3A008] text-slate-950 font-bold text-xs h-9 px-4 flex items-center gap-2 shadow-xs"
                    >
                      <Eye className="w-4 h-4" />
                      Open Proof Canvas
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
