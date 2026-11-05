'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Printer,
  ArrowRight,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button, Badge } from '@/components/ui';

export default function ProofApprovalWorkspacePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token || 'PROOF-SECURE-9921';

  const [approved, setApproved] = useState(false);
  const [revisionRequested, setRevisionRequested] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');

  const handleApprove = () => {
    if (!declarationChecked) {
      alert('Please check the confirmation declaration before approving.');
      return;
    }
    setApproved(true);
  };

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionReason.trim()) {
      alert('Please specify the defects or revisions needed.');
      return;
    }
    setRevisionRequested(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* 1. White-First Clean Header */}
      <div className="bg-white text-slate-900 py-6 px-4 sm:px-8 border-b border-slate-200 blueprint-grid">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FFED00] text-slate-950 flex items-center justify-center font-black border border-[#E3A008]/40 shadow-xs">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 font-display">Digital Proof Approval Workspace</h1>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  TOKEN: {token}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Calibrated 1:1 Soft Proof Inspection prior to Pre-Production Press Plate Release
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">ORDER: <strong>#PB-2026-0001</strong></span>
            <span className="text-xs font-mono bg-amber-50 text-amber-900 px-2.5 py-1 rounded border border-amber-300 font-bold">
              STATUS: AWAITING SIGN-OFF
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Proof Inspection Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Proof Canvas */}
          <div className="lg:col-span-8 space-y-4">
            {/* Canvas Toolbar */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-card">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('front')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'front'
                      ? 'bg-slate-900 text-[#FFED00] shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  Front Side (CMYK + Raised Spot UV)
                </button>
                <button
                  onClick={() => setActiveTab('back')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'back'
                      ? 'bg-slate-900 text-[#FFED00] shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  Back Side (Full Bleed CMYK)
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <span>ZOOM: 100% (1:1)</span>
              </div>
            </div>

            {/* Simulated High-Res Proof Card Preview */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-card flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden">
              {/* Bleed Safety Guide Lines */}
              <div className="absolute top-4 left-4 text-[10px] font-mono text-rose-500 font-bold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>3.0 mm Red Safety Bleed Line</span>
              </div>

              <div className="w-full max-w-md aspect-[1.75/1] bg-gradient-to-br from-slate-900 to-slate-950 rounded-xl p-6 text-white shadow-2xl relative border-2 border-dashed border-rose-400">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-[#FFED00] uppercase font-bold">
                      ACME LOGISTICS CORP
                    </span>
                    <h3 className="text-lg font-black text-white mt-1 font-display">Vikram Sharma</h3>
                    <p className="text-xs text-slate-300">Chief Operating Officer</p>
                  </div>
                  <div className="h-8 w-8 rounded bg-[#FFED00] text-slate-950 flex items-center justify-center font-black text-xs">
                    AL
                  </div>
                </div>

                <div className="mt-8 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-400 space-y-0.5">
                  <p>vikram.sharma@acmelogistics.in</p>
                  <p>+91 (022) 8940-2100 • BKC Tower 4, Mumbai</p>
                </div>
              </div>

              <div className="mt-6 text-center text-xs text-slate-500 font-mono">
                Proof Calibrated: FOGRA39 Coated CMYK • 300 DPI High-Density Raster
              </div>
            </div>
          </div>

          {/* Right Column: Sign-off Controls */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-elevated space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display border-b border-slate-100 pb-3">
                Proof Sign-Off Authorization
              </h3>

              {!approved && !revisionRequested ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Review spelling, phone numbers, email addresses, and safety margin trim before approving.
                  </p>

                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>
                      I have verified the soft proof. I approve physical plate-making and press production.
                    </span>
                  </label>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full shadow-brand"
                    disabled={!declarationChecked}
                    onClick={handleApprove}
                  >
                    <span>Approve & Authorize Production</span>
                    <CheckCircle2 className="h-4 w-4 ml-1.5" />
                  </Button>

                  <div className="pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 mb-2">Need Corrections?</h4>
                    <textarea
                      value={revisionReason}
                      onChange={(e) => setRevisionReason(e.target.value)}
                      placeholder="Specify required corrections (typo, color shift, alignment)..."
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={handleRevisionSubmit}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      <span>Request Prepress Revision</span>
                    </Button>
                  </div>
                </div>
              ) : approved ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-black text-emerald-950 font-display">Proof Sign-Off Recorded!</h4>
                  <p className="text-xs text-emerald-800">
                    Your authorization has been recorded in the Plant Job Card. Press run scheduled immediately.
                  </p>
                  <Link href="/tracking/PB-2026-0001" className="inline-block pt-2">
                    <Button variant="primary" size="sm">
                      <span>View Live Order Progress</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-center space-y-2">
                  <AlertCircle className="h-8 w-8 text-amber-600 mx-auto" />
                  <h4 className="text-sm font-black text-amber-950 font-display">Revision Submitted</h4>
                  <p className="text-xs text-amber-900">
                    Our prepress team is modifying the proof. You will be notified via SMS/email with revision v2.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
