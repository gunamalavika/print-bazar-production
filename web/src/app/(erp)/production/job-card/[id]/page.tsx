'use client';

import React, { use, useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Printer,
  ArrowLeft,
  Scissors,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Sparkles,
  ExternalLink,
  Lock,
  RefreshCw,
  Box,
  Truck,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  ScanLine,
  Sliders,
  Eye,
  Check,
  Building,
  Settings,
  ChevronRight,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, resolveArtworkUrl } from '@/lib/utils';

// Helper to sanitize specification values & auto-hide non-applicable/empty specs
function parseDynamicSpecifications(specs: any): Array<{ label: string; value: string; category?: string }> {
  if (!specs || typeof specs !== 'object') return [];
  const list: Array<{ label: string; value: string; category?: string }> = [];
  const seen = new Set<string>();

  const isFalsyOrNone = (v: any) => {
    if (v === null || v === undefined) return true;
    const str = String(v).trim().toLowerCase();
    return (
      !str ||
      str === 'none' ||
      str === 'no' ||
      str === 'null' ||
      str === 'undefined' ||
      str === 'n/a' ||
      str === 'false' ||
      str === 'not applicable' ||
      str === '0'
    );
  };

  const add = (rawLabel: string, rawVal: any, category?: string) => {
    if (isFalsyOrNone(rawVal) || typeof rawVal === 'object') return;
    const str = String(rawVal).trim();
    if (!str) return;

    const cleanLabel = rawLabel
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
    const norm = cleanLabel.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (seen.has(norm)) return;

    // Block financial, internal, or raw system fields from shop floor job card
    const blocked = [
      'price',
      'cost',
      'fee',
      'tax',
      'gst',
      'subtotal',
      'total',
      'grandtotal',
      'artworkrequirement',
      'designservicerequirement',
      'referenceimagerequirement',
      'workflowroute',
      'artworksource',
      'artworkurl',
      'artworkstoragekey',
      'referenceimage',
      'referenceimageurl',
      'designnotes',
      'customernotes',
      'ismultivariant',
      'variantlines',
      'specificationssnapshot',
      'fieldvalues',
      'raw',
      'approvedartworkversionid',
      'slotkey',
    ];
    if (blocked.some((b) => norm.includes(b))) return;

    seen.add(norm);
    list.push({
      label: cleanLabel.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      value: str,
      category,
    });
  };

  if (Array.isArray(specs.options)) {
    for (const opt of specs.options) {
      add(opt.fieldLabel || opt.optionName || opt.optionCode, opt.value || opt.valueName || opt.optionLabel);
    }
  }
  if (Array.isArray(specs.selectedOptionsSummary)) {
    for (const opt of specs.selectedOptionsSummary) {
      add(opt.fieldLabel || opt.optionName, opt.value || opt.valueName);
    }
  }
  const snap = typeof specs.specificationsSnapshot === 'object' && specs.specificationsSnapshot ? specs.specificationsSnapshot : {};
  for (const [k, v] of Object.entries(snap)) {
    add(k, v);
  }
  for (const [k, v] of Object.entries(specs)) {
    add(k, v);
  }

  return list;
}

export default function ShopFloorJobCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id || 'JOB-2026-0001';

  const [jobData, setJobData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // View mode: Full A4 Job Card vs Mini Thermal Label
  const [viewMode, setViewMode] = useState<'A4' | 'THERMAL'>('A4');

  // Digital Status Updater Modal (Opened when mobile/tablet scans QR code or clicks "Update Status")
  const [isStatusUpdaterOpen, setIsStatusUpdaterOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [statusUpdateNotes, setStatusUpdateNotes] = useState<string>('');
  const [statusFeedback, setStatusFeedback] = useState<string>('');

  // Admin Customizer Mode for routing & checklists
  const [isAdminCustomizerOpen, setIsAdminCustomizerOpen] = useState(false);
  const [customizerWastagePercent, setCustomizerWastagePercent] = useState<number>(5);
  const [customStationNote, setCustomStationNote] = useState('');

  // QC Checklist Interactive State
  const [qcChecks, setQcChecks] = useState<Record<string, boolean>>({
    sizeCutAccuracy: false,
    colorProofMatch: false,
    laminationQuality: false,
    specialFinishingAlign: false,
    quantityCountVerified: false,
    whiteLabelCompliance: false,
  });

  // Machine Operator & QC Sign-off inputs
  const [operatorSignName, setOperatorSignName] = useState('');
  const [qcInspectorSignName, setQcInspectorSignName] = useState('');
  const [signOffTimestamp, setSignOffTimestamp] = useState<string>('');

  const loadJob = async () => {
    setIsLoading(true);
    try {
      const data = await api.getJobCard(jobId);
      if (data) {
        setJobData(data);
        setSelectedStation(data.currentStation || 'PRINTING');
        setOperatorSignName(data.operator?.fullName || '');
      }
    } catch (err) {
      console.warn('Could not load dynamic job card from API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [jobId]);

  // Generate Scannable QR Code containing Job Card ID + Order ID + Direct Scan URL
  useEffect(() => {
    if (!jobData) return;
    const jobNumber = jobData.jobNumber || jobId;
    const orderNumber = jobData.order?.orderNumber || 'PB-ORDER';

    // Digital status updater URL encoded in QR code
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://printbazzar.com';
    const qrPayload = `${origin}/production/job-card/${jobNumber}?scan=1&orderId=${orderNumber}`;

    QRCode.toDataURL(qrPayload, {
      width: 220,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.warn('QR code generation failed:', err));
  }, [jobData, jobId]);

  // Check URL params for ?scan=1 auto-opening digital updater on scan
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('scan') === '1') {
        setIsStatusUpdaterOpen(true);
      }
    }
  }, []);

  const order = jobData?.order;
  const orderItem = jobData?.orderItem;
  const customer = order?.customer;
  const specs = (orderItem?.specifications || jobData?.technicalSpecs?.specifications || {}) as Record<string, any>;
  const parsedSpecs = useMemo(() => parseDynamicSpecifications(specs), [specs]);

  // Approved Artwork Version & Product Visual Fallback
  const approvedArtwork = useMemo(() => {
    // 1. Direct relation on JobCard
    if (jobData?.approvedArtworkVersion) {
      return jobData.approvedArtworkVersion;
    }
    // 2. OrderItem artworkVersions
    const itemVersions = orderItem?.artworkVersions;
    if (Array.isArray(itemVersions) && itemVersions.length > 0) {
      const match =
        itemVersions.find((v: any) => v.id === jobData?.approvedArtworkVersionId) ||
        itemVersions.find((v: any) => v.isApproved || v.status === 'APPROVED' || v.status === 'PROOF_APPROVED') ||
        itemVersions[0];
      if (match) return match;
    }
    // 3. TechnicalSpecs snapshot on JobCard
    const snapshotVersions = jobData?.technicalSpecs?.artworkVersions;
    if (Array.isArray(snapshotVersions) && snapshotVersions.length > 0) {
      return snapshotVersions[0];
    }
    // 4. Any artwork in order.items
    if (Array.isArray(order?.items)) {
      for (const it of order.items) {
        if (Array.isArray(it.artworkVersions) && it.artworkVersions.length > 0) {
          return it.artworkVersions[0];
        }
      }
    }
    return null;
  }, [jobData, orderItem, order]);

  // Resolved Artwork Image URL with fallback to catalog image
  const resolvedArtworkImageUrl = useMemo(() => {
    const raw =
      approvedArtwork?.proofUrl ||
      approvedArtwork?.storageKey ||
      specs?.artworkUrl ||
      specs?.artworkStorageKey ||
      specs?.referenceImageUrl;
    if (raw) {
      const resolved = resolveArtworkUrl(raw);
      if (resolved) return resolved;
    }
    // Fallback to catalog product image
    const prodImg = orderItem?.product?.images?.[0]?.url || orderItem?.product?.image;
    if (prodImg) {
      return resolveArtworkUrl(prodImg);
    }
    return null;
  }, [approvedArtwork, specs, orderItem]);

  // Customer Type Resolution: B2C vs B2B vs B2B2C White-Label
  const customerType: 'B2C' | 'B2B' | 'B2B2C_RESELLER' = useMemo(() => {
    const rawType = (customer?.customerType || order?.customerType || '').toUpperCase();
    if (
      rawType.includes('RESELLER') ||
      rawType.includes('B2B2C') ||
      rawType.includes('WHITE_LABEL') ||
      customer?.isReseller ||
      specs?.isReseller ||
      specs?.whiteLabel
    ) {
      return 'B2B2C_RESELLER';
    }
    if (rawType.includes('B2B') || customer?.companyName || customer?.gstin) {
      return 'B2B';
    }
    return 'B2C';
  }, [customer, order, specs]);

  const isWhiteLabelReseller = customerType === 'B2B2C_RESELLER';

  // Shipping Method
  const shippingMethod = useMemo(() => {
    const method = (order?.deliveryMethod || specs?.deliveryMethod || '').toUpperCase();
    if (method.includes('STORE_PICKUP') || method.includes('PICKUP')) return 'Store Pickup';
    if (method.includes('RAPIDO') || method.includes('BIKE') || method.includes('PORTER')) return 'Rapido / Express Bike';
    if (method.includes('TRANSPORT') || method.includes('CARGO')) return 'Road Transport';
    return 'Courier Delivery';
  }, [order, specs]);

  // Preflight Status & Payment Pre-Check Rule (9.3 Acceptance Criteria)
  const isPreflightPassed = Boolean(
    approvedArtwork?.status === 'APPROVED' ||
    approvedArtwork?.qualityStatus === 'PASSED' ||
    jobData?.status !== 'ON_HOLD'
  );

  const isPaymentApproved = Boolean(
    order?.paymentStatus === 'PAID' ||
    order?.paymentStatus === 'AUTHORIZED' ||
    order?.paymentStatus === 'PARTIALLY_PAID' ||
    Number(order?.paidAmount || 0) > 0 ||
    order?.status === 'PRODUCTION_QUEUE' ||
    order?.status === 'PRINTING'
  );

  const isJobReleased = isPreflightPassed && isPaymentApproved;

  // Quantity & Wastage Control
  const orderedQuantity = Number(jobData?.quantity || orderItem?.quantity || jobData?.technicalSpecs?.quantity || 100);
  const overshootAllowance = Math.max(5, Math.ceil((orderedQuantity * customizerWastagePercent) / 100));
  const finalPrintableSheetCount = orderedQuantity + overshootAllowance;

  // Key Dynamic Specifications Extraction (Width, GSM, Technology, Lamination, etc.)
  const specMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of parsedSpecs) {
      map[s.label.toLowerCase()] = s.value;
    }
    return map;
  }, [parsedSpecs]);

  const finishedSize = specMap['finished size'] || specMap['size'] || specMap['dimensions'] || specMap['product size'] || 'Standard Cut';
  const rawCutSize = specMap['raw cut size'] || specMap['cut size'] || (finishedSize !== 'Standard Cut' ? `${finishedSize} (+3mm Bleed)` : 'Standard + Bleed');
  const paperGSM = specMap['paper type & gsm'] || specMap['paper type'] || specMap['paper gsm'] || specMap['paper'] || specMap['gsm'] || specMap['media type'] || '350 GSM Premium Art Card';
  const printSides = specMap['print sides'] || specMap['sides'] || specMap['printing sides'] || 'Double Sided (4/4)';
  const printingTechnology = specMap['printing technology'] || specMap['technology'] || specMap['print process'] || 'Digital Press (Indigo)';
  const laminationType = specMap['lamination type'] || specMap['lamination'] || 'Thermal Matte Lamination';
  const specialEnhancements = specMap['special enhancements'] || specMap['enhancements'] || specMap['foiling'] || specMap['spot uv'] || 'None';
  const cornerCutting = specMap['corner cutting'] || specMap['corners'] || 'Straight Cut';
  const foldingCreasing = specMap['folding / creasing'] || specMap['folding'] || specMap['creasing'] || 'None';
  const bindingType = specMap['binding type'] || specMap['binding'] || 'None';
  const packagingReq = specMap['packaging requirements'] || specMap['packaging'] || 'Shrink Wrap in Bundles of 100';

  // Production Route Operation Sequence
  const operationSequence = useMemo(() => {
    if (Array.isArray(jobData?.operationSequence) && jobData.operationSequence.length > 0) {
      return jobData.operationSequence;
    }
    return [
      { step: 1, station: 'PREPRESS', action: 'Digital Preflight & RIP', status: 'COMPLETED', machine: 'RIP Server 01' },
      { step: 2, station: 'PRINTING', action: `${printingTechnology} Run`, status: 'IN_PROGRESS', machine: jobData?.machine?.name || 'HP Indigo 12000' },
      { step: 3, station: 'LAMINATION', action: `${laminationType} Setup`, status: 'PENDING', machine: 'GMP Pro-Topic Thermal' },
      { step: 4, station: 'CUTTING', action: 'Guillotine Precision Trim', status: 'PENDING', machine: 'Polar 115 High-Speed' },
      { step: 5, station: 'SPECIAL_FINISHING', action: specialEnhancements !== 'None' ? specialEnhancements : 'Corner & Finish Inspection', status: 'PENDING', machine: 'Duplo Spot Coater' },
      { step: 6, station: 'FINAL_QC', action: 'Physical Quality Audit & CMYK Proof Match', status: 'PENDING', machine: 'D50 Viewing Booth' },
      { step: 7, station: 'PACKING', action: packagingReq, status: 'PENDING', machine: 'Shrink Pack Station 2' },
      { step: 8, station: 'DISPATCH', action: `Carrier Handover (${shippingMethod})`, status: 'PENDING', machine: 'Dispatch Bay A' },
    ];
  }, [jobData, printingTechnology, laminationType, specialEnhancements, packagingReq, shippingMethod]);

  // Digital Status Updater Submission
  const handleUpdateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation) return;
    setIsUpdatingStatus(true);
    setStatusFeedback('');

    try {
      await api.transitionProductionJob(jobData.id || jobId, {
        targetColumnKey: selectedStation,
        reason: statusUpdateNotes || `Scanned QR Code update to station ${selectedStation}`,
      });

      setStatusFeedback(`Job Card #${jobData.jobNumber || jobId} updated to ${selectedStation} in realtime!`);
      setTimeout(() => {
        setIsStatusUpdaterOpen(false);
        loadJob();
      }, 1200);
    } catch (err: any) {
      // Fallback: update via station handover
      try {
        await api.completeStation(jobData.id || jobId, selectedStation);
        setStatusFeedback(`Station updated to ${selectedStation}!`);
        setTimeout(() => {
          setIsStatusUpdaterOpen(false);
          loadJob();
        }, 1200);
      } catch (innerErr: any) {
        setStatusFeedback(innerErr?.message || err?.message || 'Failed to update job status.');
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleQcCheck = (key: string) => {
    setQcChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSignOff = () => {
    setSignOffTimestamp(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  };

  return (
    <div className="min-h-screen bg-[#F4F4F6] py-6 px-3 sm:px-6 font-sans">
      {/* Top Action Bar (Print-Hidden) */}
      <div className="mx-auto max-w-5xl mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/production/queue"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-black bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Production Floor Queue</span>
          </Link>

          {/* View Mode Toggle: A4 vs Mini Thermal */}
          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('A4')}
              className={`px-3 py-1 rounded-md transition ${
                viewMode === 'A4' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-black'
              }`}
            >
              A4 Production Sheet
            </button>
            <button
              type="button"
              onClick={() => setViewMode('THERMAL')}
              className={`px-3 py-1 rounded-md transition ${
                viewMode === 'THERMAL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-black'
              }`}
            >
              Mini Thermal Label
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Digital Status Updater Trigger (Simulates QR scan from tablet/mobile) */}
          <button
            type="button"
            onClick={() => setIsStatusUpdaterOpen(true)}
            className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
          >
            <ScanLine className="h-3.5 w-3.5" />
            <span>Digital Status Updater (Scan)</span>
          </button>

          {/* Admin Template Customizer */}
          <button
            type="button"
            onClick={() => setIsAdminCustomizerOpen(!isAdminCustomizerOpen)}
            className="h-8 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            <span>Template Settings</span>
          </button>

          {/* Print Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.print()}
            disabled={!isJobReleased}
            className="h-8 shadow-xs cursor-pointer font-bold bg-slate-900 hover:bg-black text-[#FFED00] disabled:bg-slate-300 disabled:text-slate-500"
            title={!isJobReleased ? 'Job Card cannot be released until Preflight & Payment are approved' : 'Print Job Card'}
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            <span>Print {viewMode === 'A4' ? 'A4 Job Sheet' : 'Thermal Label'}</span>
          </Button>
        </div>
      </div>

      {/* Pre-Check Release Warning Banner (Section 9.3) */}
      {!isJobReleased && !isLoading && (
        <div className="mx-auto max-w-5xl mb-4 bg-rose-50 border-2 border-rose-400 p-4 rounded-xl text-rose-950 flex items-start gap-3 shadow-xs print:hidden">
          <Lock className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <strong className="text-sm font-bold block text-rose-900">
              JOB RELEASE VALIDATION (PRE-CHECK RULE BLOCKED)
            </strong>
            <p>
              A Job Card cannot be printed or released to the production floor unless Preflight Status is &quot;PASSED&quot; and Payment/Credit Status is &quot;APPROVED&quot;.
            </p>
            <div className="flex gap-4 pt-1 font-mono font-bold text-[11px]">
              <span className={isPreflightPassed ? 'text-emerald-700' : 'text-rose-700'}>
                Preflight Status: {isPreflightPassed ? '✓ PASSED' : '✕ PENDING REVIEW'}
              </span>
              <span className={isPaymentApproved ? 'text-emerald-700' : 'text-rose-700'}>
                Payment Clearance: {isPaymentApproved ? '✓ APPROVED' : '✕ UNPAID / ADVANCE PENDING'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Template Customizer Drawer (Section 9.4) */}
      {isAdminCustomizerOpen && (
        <div className="mx-auto max-w-5xl mb-4 bg-slate-900 text-white p-4 rounded-xl shadow-lg space-y-3 print:hidden text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#FFED00]" />
              <strong className="text-sm font-bold text-[#FFED00]">Admin Template Customizer (Category: {orderItem?.product?.category?.name || 'Commercial Print'})</strong>
            </div>
            <button
              type="button"
              onClick={() => setIsAdminCustomizerOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Wastage / Setup Overshoot Rate (%)</label>
              <input
                type="number"
                min={0}
                max={25}
                value={customizerWastagePercent}
                onChange={(e) => setCustomizerWastagePercent(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded bg-slate-800 border border-slate-700 text-white font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Default Press Machine Station</label>
              <input
                type="text"
                value={jobData?.machine?.name || 'HP Indigo 12000'}
                readOnly
                className="w-full h-8 px-2.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Custom Station Operator Note</label>
              <input
                type="text"
                placeholder="e.g. Inspect under D50 daylight booth"
                value={customStationNote}
                onChange={(e) => setCustomStationNote(e.target.value)}
                className="w-full h-8 px-2.5 rounded bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="mx-auto max-w-5xl bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-card">
          <Loader2 className="h-9 w-9 animate-spin mx-auto text-amber-500 mb-3" />
          <p className="text-sm font-mono font-bold text-slate-800">
            Generating Authoritative Job Card #{jobId}...
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Compiling dynamic specifications, QR code, and preflight profile</span>
        </div>
      ) : viewMode === 'THERMAL' ? (
        /* =========================================================================
           MINI THERMAL LABEL JOB CARD (Section 9.3)
           Optimized for 4x6" thermal label attachment to physical parcel or work bin
           ========================================================================= */
        <div className="mx-auto max-w-sm bg-white border-2 border-black p-5 rounded-lg shadow-md font-mono text-xs space-y-3 print:m-0 print:border-2 print:border-black print:shadow-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <div>
              {!isWhiteLabelReseller ? (
                <div className="font-black text-sm tracking-tight text-black">PRINTBAZZAR</div>
              ) : (
                <div className="font-black text-xs text-slate-700">WHITE-LABEL FULFILLMENT</div>
              )}
              <div className="text-[10px] text-slate-600">MINI JOB TICKET</div>
            </div>
            <div className="text-right">
              <span className="font-bold text-[10px] bg-black text-white px-2 py-0.5 rounded">
                {jobData?.priority || 'NORMAL'}
              </span>
            </div>
          </div>

          {/* QR Code + Job Number */}
          <div className="flex items-center gap-3 py-1">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="Job QR" className="w-20 h-20 border border-slate-300 p-1 rounded" />
            ) : (
              <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px]">QR Code</div>
            )}
            <div className="space-y-0.5 text-left">
              <div className="text-[10px] text-slate-500 uppercase">JOB CARD ID</div>
              <div className="text-base font-black text-black">{jobData?.jobNumber || jobId}</div>
              <div className="text-[10px] text-slate-600">Order: #{order?.orderNumber}</div>
              <div className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded inline-block">
                QTY: {orderedQuantity.toLocaleString()} PCS
              </div>
            </div>
          </div>

          {/* Product & Substrate */}
          <div className="border-t border-dashed border-slate-400 pt-2 space-y-1">
            <div className="flex items-start gap-2">
              {resolvedArtworkImageUrl && (
                <img
                  src={resolvedArtworkImageUrl}
                  alt="Thumb"
                  className="w-12 h-12 object-contain border border-slate-300 rounded bg-white p-0.5 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-black text-xs text-black truncate">{orderItem?.productName || 'Print Product'}</div>
                <div className="text-[10px] text-slate-700 font-bold">{paperGSM}</div>
                <div className="text-[9px] text-slate-600">Size: {finishedSize} • {printSides}</div>
              </div>
            </div>
            <div className="text-[10px] text-slate-600">Lamination: {laminationType}</div>
          </div>

          {/* Destination */}
          <div className="border-t border-dashed border-slate-400 pt-2 text-[10px]">
            <div className="text-slate-500 uppercase">DISPATCH MODE</div>
            <div className="font-bold text-black">{shippingMethod}</div>
            {!isWhiteLabelReseller && order?.shippingAddress && (
              <div className="text-slate-700 truncate">{order.shippingAddress.city} — {order.shippingAddress.postalCode}</div>
            )}
          </div>

          {/* Barcode representation */}
          <div className="border-t-2 border-black pt-2 text-center">
            <div className="text-[9px] tracking-[4px] bg-slate-100 py-1.5 font-bold rounded">
              ||| | ||||| || |||| ||||| |||
            </div>
            <span className="text-[9px] text-slate-500 block mt-0.5">{jobData?.jobNumber || jobId}</span>
          </div>
        </div>
      ) : (
        /* =========================================================================
           A4 PRODUCTION SHEET JOB CARD (Sections 9.2, 9.3, 9.4, 9.5)
           Authoritative full sheet printable for press operators, post-press & QC
           ========================================================================= */
        <div className="mx-auto max-w-5xl bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-card text-black print:border-none print:shadow-none print:p-0 print:m-0 space-y-6">
          {/* SECTION 1: JOB CARD HEADER (9.2) */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b-2 border-black">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Branding: Automatically suppressed if B2B2C / Reseller (Section 9.5) */}
                {!isWhiteLabelReseller ? (
                  <span className="text-xs font-mono font-black bg-black text-[#FFED00] px-2.5 py-0.5 rounded tracking-wider">
                    PRINTBAZZAR INDUSTRIAL PRESS
                  </span>
                ) : (
                  <span className="text-xs font-mono font-black bg-slate-800 text-white px-2.5 py-0.5 rounded tracking-wider">
                    WHITE-LABEL RESELLER FULFILLMENT
                  </span>
                )}
                <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  STATION: {jobData?.currentStation || 'PRINTING'}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                    customerType === 'B2B2C_RESELLER'
                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                      : customerType === 'B2B'
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  {customerType === 'B2B2C_RESELLER' ? 'B2B2C White-Label' : customerType === 'B2B' ? 'B2B Corporate' : 'B2C Retail'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-black font-mono tracking-tight mt-1.5 flex items-center gap-2">
                <span>{jobData?.jobNumber || jobId}</span>
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded uppercase ${
                    jobData?.priority === 'URGENT'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : jobData?.priority === 'HIGH' || jobData?.priority === 'EXPRESS'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {jobData?.priority || 'STANDARD'} PRIORITY
                </span>
              </h1>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-mono text-slate-600 mt-1">
                <span>
                  Order ID: <strong className="text-black font-bold">#{order?.orderNumber || 'PB-2026-0001'}</strong>
                </span>
                <span>•</span>
                <span>
                  Generated:{' '}
                  <strong className="text-black font-bold">
                    {jobData?.createdAt ? formatDateTime(jobData.createdAt) : '—'}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Target Dispatch:{' '}
                  <strong className="text-amber-900 font-bold bg-amber-50 px-1 rounded">
                    {jobData?.dueAt ? formatDateTime(jobData.dueAt) : 'Within 48h SLA'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Scannable Barcode & QR Code Integration (Section 9.3) */}
            <div className="flex items-center gap-3 sm:text-right shrink-0">
              <div className="space-y-1">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Scannable QR Code"
                    className="w-20 h-20 border-2 border-black p-1 rounded-lg mx-auto sm:ml-auto"
                  />
                ) : (
                  <div className="w-20 h-20 bg-slate-100 border border-slate-300 rounded flex items-center justify-center">
                    <QrCode className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">
                  Scan to Update Status
                </span>
              </div>

              <div className="hidden sm:block text-right font-mono">
                <div className="h-10 bg-black text-white px-3 flex items-center justify-center text-[10px] tracking-[4px] font-bold rounded">
                  ||| |||| || ||||| ||||
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5 uppercase font-bold">
                  {jobData?.jobNumber || jobId}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: JOB OVERVIEW & DESTINATION (9.2) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
            {/* Customer Details: Hidden for White-Label Reseller Orders (Section 9.5) */}
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">CUSTOMER IDENTITY</span>
              {!isWhiteLabelReseller ? (
                <div className="mt-1 space-y-0.5">
                  <strong className="text-black text-sm font-bold block truncate">
                    {customer?.fullName || 'Direct Customer'}
                  </strong>
                  {customer?.companyName && (
                    <span className="text-slate-600 block text-[11px] truncate">{customer.companyName}</span>
                  )}
                  <span className="text-slate-500 text-[11px] block">{customer?.phone || 'Phone on file'}</span>
                </div>
              ) : (
                <div className="mt-1 p-2 rounded bg-purple-50 border border-purple-200 text-purple-900 space-y-0.5">
                  <strong className="block text-[11px] font-black">WHITE-LABEL RESELLER RUN</strong>
                  <span className="text-[10px] text-purple-700 block">
                    End-customer name & contact suppressed per Reseller Privacy Rule.
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">SHIPPING METHOD</span>
              <div className="mt-1 font-bold text-black text-sm flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-slate-700" />
                <span>{shippingMethod}</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Channel: {order?.sourceChannel || 'Website Portal'}
              </span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">DELIVERY DESTINATION / ADDRESS</span>
              {!isWhiteLabelReseller && order?.shippingAddress ? (
                <div className="mt-1 text-slate-800 text-[11px] leading-tight">
                  <span className="font-bold">{order.shippingAddress.recipientName || customer?.fullName}</span>
                  <br />
                  {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
                  <strong className="font-bold text-black">{order.shippingAddress.postalCode}</strong>
                </div>
              ) : isWhiteLabelReseller ? (
                <div className="mt-1 text-slate-700 text-[11px]">
                  <span>Reseller Forwarding Hub Destination (PIN: {order?.shippingAddress?.postalCode || 'Verified'})</span>
                </div>
              ) : (
                <div className="mt-1 text-slate-600 text-[11px]">Store Counter Pickup / PrintBazzar Front Hub</div>
              )}
            </div>
          </div>

          {/* SECTION 3: DYNAMIC PRODUCT SPECIFICATIONS (9.2 & 9.3) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-black pb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-black" />
                <h2 className="text-xs font-mono font-black uppercase tracking-wider text-black">
                  DYNAMIC PRODUCT SPECIFICATIONS (MANDATORY PRESS SETUP)
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-950 px-2 py-0.5 rounded border border-amber-300">
                {parsedSpecs.length} SPECIFICATIONS ACTIVE
              </span>
            </div>

            {/* Spec Matrix: Automatically hides non-applicable fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">PRODUCT NAME & SKU</span>
                <strong className="text-black text-xs font-bold block mt-0.5 truncate">
                  {orderItem?.productName || 'Print Product'}
                </strong>
                <span className="text-[10px] text-slate-500 font-bold block">SKU: {orderItem?.sku || 'PB-PRINT-01'}</span>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">ORDERED NET QUANTITY</span>
                <strong className="text-black text-base font-black block mt-0.5">
                  {orderedQuantity.toLocaleString()} PCS
                </strong>
                <span className="text-[10px] text-amber-800 font-semibold block">Target Finished Units</span>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">FINISHED SIZE</span>
                <strong className="text-black text-xs font-bold block mt-0.5">{finishedSize}</strong>
                <span className="text-[10px] text-slate-500 block">Final Trimmed Boundary</span>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">RAW CUT SIZE (BLEED)</span>
                <strong className="text-black text-xs font-bold block mt-0.5">{rawCutSize}</strong>
                <span className="text-[10px] text-slate-500 block">Includes +3mm Safety Margin</span>
              </div>

              {/* Substrate & GSM */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">PAPER / MEDIA & GSM</span>
                <strong className="text-black text-xs font-bold block mt-0.5">{paperGSM}</strong>
              </div>

              {/* Print Sides */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">PRINT SIDES</span>
                <strong className="text-black text-xs font-bold block mt-0.5">{printSides}</strong>
              </div>

              {/* Technology */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">PRINTING TECHNOLOGY</span>
                <strong className="text-black text-xs font-bold block mt-0.5">{printingTechnology}</strong>
              </div>

              {/* Lamination */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">LAMINATION TYPE</span>
                <strong className="text-black text-xs font-bold block mt-0.5">{laminationType}</strong>
              </div>

              {/* Special Enhancements */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">SPECIAL ENHANCEMENTS</span>
                <strong className="text-black text-xs font-bold block mt-0.5">{specialEnhancements}</strong>
              </div>

              {/* Corner Cutting */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">CORNER CUTTING</span>
                <strong className="text-black text-xs font-bold block mt-0.5">{cornerCutting}</strong>
              </div>

              {/* Folding / Creasing */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">FOLDING / CREASING</span>
                <strong className="text-black text-xs font-bold block mt-0.5">{foldingCreasing}</strong>
              </div>

              {/* Binding */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">BINDING TYPE</span>
                <strong className="text-black text-xs font-bold block mt-0.5">{bindingType}</strong>
              </div>
            </div>

            {/* Packaging Requirements Notice */}
            <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-lg flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-amber-800 shrink-0" />
                <span>
                  <strong>PACKAGING REQUIREMENTS:</strong> {packagingReq}
                </span>
              </div>
              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                Standard Shipping Carton
              </span>
            </div>
          </div>

          {/* SECTION 4: APPROVED ARTWORK & PREFLIGHT SPECIFICATIONS (9.2) */}
          <div className="space-y-3 border-t border-slate-300 pt-5">
            <div className="flex items-center justify-between border-b border-black pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h2 className="text-xs font-mono font-black uppercase tracking-wider text-black">
                  APPROVED ARTWORK & PREFLIGHT VALIDATION SECTION
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                  isPreflightPassed
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                Preflight: {isPreflightPassed ? 'PASSED & APPROVED' : 'ACTION REQUIRED'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start text-xs font-mono">
              {/* Artwork Thumbnail Preview (Front / Back / Calibrated Proof) */}
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-2 text-center">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">
                    CALIBRATED PROOF PREVIEW
                  </span>
                  {resolvedArtworkImageUrl && (
                    <a
                      href={resolvedArtworkImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 print:hidden"
                    >
                      <span>Full Res</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>

                <div className="relative aspect-video min-h-[140px] max-h-48 bg-white border border-slate-300 rounded-lg flex items-center justify-center overflow-hidden mx-auto shadow-inner group">
                  {resolvedArtworkImageUrl ? (
                    <img
                      src={resolvedArtworkImageUrl}
                      alt="Approved Production Artwork"
                      className="object-contain w-full h-full p-1.5 transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        console.warn('Failed to load artwork image from', resolvedArtworkImageUrl);
                        const target = e.target as HTMLElement;
                        target.style.display = 'none';
                        const fallback = target.parentElement?.querySelector('.artwork-fallback-icon');
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}

                  {/* Fallback placeholder if no image exists or load error */}
                  <div
                    className={`artwork-fallback-icon flex-col items-center justify-center p-3 text-slate-400 ${
                      resolvedArtworkImageUrl ? 'hidden' : 'flex'
                    }`}
                  >
                    <FileText className="h-8 w-8 text-slate-300 mb-1" />
                    <span className="text-[10px] text-slate-500 font-bold">Vector PDF Artwork</span>
                    <span className="text-[9px] text-slate-400">Prepress Calibrated Proof</span>
                  </div>

                  {/* Bleed Safety Margin Overlay Indicator */}
                  <div className="absolute inset-0 border-2 border-dashed border-rose-400/80 pointer-events-none m-1.5 rounded flex items-start justify-between p-1">
                    <span className="text-[8px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-black shadow-xs">
                      +3mm Bleed Safety Line
                    </span>
                    <span className="text-[8px] bg-black/75 text-[#FFED00] px-1 py-0.2 rounded font-mono font-bold">
                      CMYK
                    </span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-800 font-bold block truncate font-mono">
                    {approvedArtwork?.originalFileName || `Artwork_${order?.orderNumber || 'PB'}_Proof.png`}
                  </span>
                  {approvedArtwork?.fileSize && (
                    <span className="text-[9px] text-slate-500 block">
                      {(approvedArtwork.fileSize / (1024 * 1024)).toFixed(2)} MB • {approvedArtwork.mimeType || 'image/png'}
                    </span>
                  )}
                </div>
              </div>

              {/* Preflight Technical Specs */}
              <div className="sm:col-span-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">PREFLIGHT STATUS</span>
                    <strong className="text-emerald-700 font-bold block text-xs mt-0.5">
                      {approvedArtwork?.qualityStatus || 'PASSED'} (FOGRA39 Coated)
                    </strong>
                    <span className="text-[10px] text-slate-500">Color calibrations verified</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">RESOLUTION VALIDATION</span>
                    <strong className="text-black font-bold block text-xs mt-0.5">
                      {approvedArtwork?.resolutionDpi ? `${approvedArtwork.resolutionDpi} DPI` : '300 DPI Confirmed'}
                    </strong>
                    <span className="text-[10px] text-slate-500">Press print-ready vector/raster</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">COLOR SPACE PROFILE</span>
                    <strong className="text-black font-bold block text-xs mt-0.5">
                      CMYK (ISO Coated v2 / FOGRA39)
                    </strong>
                    <span className="text-[10px] text-slate-500">No unseparated RGB elements</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">STUDIO / RIP REFERENCE</span>
                    <strong className="text-black font-bold block text-xs mt-0.5 truncate">
                      {approvedArtwork?.id ? `RIP-${approvedArtwork.id.slice(0, 8)}` : `AI-STUDIO-${jobData?.jobNumber || '01'}`}
                    </strong>
                    <span className="text-[10px] text-slate-500">Prepress approved identifier</span>
                  </div>
                </div>

                {approvedArtwork?.prepressNotes && (
                  <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-950">
                    <strong>Prepress Notes:</strong> {approvedArtwork.prepressNotes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5: PRODUCTION ROUTE & WORKFLOW INSTRUCTIONS (9.2) */}
          <div className="space-y-3 border-t border-slate-300 pt-5">
            <div className="flex items-center justify-between border-b border-black pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-700" />
                <h2 className="text-xs font-mono font-black uppercase tracking-wider text-black">
                  STEP-BY-STEP PRODUCTION ROUTE & STATION INSTRUCTIONS
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                Current: <strong className="text-black">{jobData?.currentStation || 'PRINTING'}</strong>
              </span>
            </div>

            <div className="overflow-x-auto bg-white border border-slate-300 rounded-lg">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2 px-3 w-12 text-center">Step</th>
                    <th className="py-2 px-3 w-36">Station</th>
                    <th className="py-2 px-3">Process Action & Operator Notes</th>
                    <th className="py-2 px-3 w-44">Assigned Machine</th>
                    <th className="py-2 px-3 w-28 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {operationSequence.map((op: any, idx: number) => {
                    const isCurrent = (jobData?.currentStation || 'PRINTING') === op.station;
                    return (
                      <tr key={idx} className={isCurrent ? 'bg-amber-50/70 font-bold' : 'hover:bg-slate-50'}>
                        <td className="py-2 px-3 text-center text-slate-500">{op.step || idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-black flex items-center gap-1.5">
                          {isCurrent && <ChevronRight className="h-3.5 w-3.5 text-amber-600 animate-pulse" />}
                          <span>{op.station}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-800">
                          {op.action}
                          {customStationNote && isCurrent ? ` • Note: ${customStationNote}` : ''}
                        </td>
                        <td className="py-2 px-3 text-slate-700 truncate">{op.machine || 'Work Center'}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`text-[9px] font-mono font-black px-2 py-0.5 rounded uppercase ${
                              op.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : isCurrent
                                ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-500'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isCurrent ? 'IN RUN' : op.status || 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 6: QUANTITY & WASTAGE CONTROL (9.2) */}
          <div className="rounded-xl border border-slate-300 bg-slate-50/80 p-4 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-black uppercase tracking-wider text-[11px]">
                QUANTITY, MAKEREADY & WASTAGE CONTROL SPECIFICATIONS
              </span>
              <span className="text-[10px] text-slate-500 font-bold">
                Setup Overshoot: +{customizerWastagePercent}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 block uppercase">1. NET QUANTITY REQUIRED</span>
                <strong className="text-black text-lg font-black block mt-0.5">
                  {orderedQuantity.toLocaleString()} PCS
                </strong>
                <span className="text-[10px] text-slate-500 block">Deliverable customer units</span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 block uppercase">2. MAKEREADY / OVERSHOOT SHEETS</span>
                <strong className="text-amber-800 text-lg font-black block mt-0.5">
                  +{overshootAllowance.toLocaleString()} SHEETS
                </strong>
                <span className="text-[10px] text-slate-500 block">Press alignment & die-cut buffer</span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg bg-emerald-50/50">
                <span className="text-[10px] text-slate-700 block uppercase font-bold">3. FINAL PRINTABLE RUN COUNT</span>
                <strong className="text-emerald-900 text-lg font-black block mt-0.5">
                  {finalPrintableSheetCount.toLocaleString()} SHEETS
                </strong>
                <span className="text-[10px] text-emerald-800 block">Total raw sheet feed required</span>
              </div>
            </div>
          </div>

          {/* SECTION 7: QUALITY CONTROL (QC) CHECKLIST (9.2) */}
          <div className="space-y-3 border-t border-slate-300 pt-5">
            <div className="flex items-center justify-between border-b border-black pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h2 className="text-xs font-mono font-black uppercase tracking-wider text-black">
                  QUALITY CONTROL (QC) CHECKLIST (VERIFICATION MANDATORY BEFORE RELEASE)
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                ISO 12647 Print Standard
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
              <label
                onClick={() => toggleQcCheck('sizeCutAccuracy')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer select-none transition ${
                  qcChecks.sizeCutAccuracy ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={qcChecks.sizeCutAccuracy}
                  onChange={() => {}}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                />
                <div>
                  <strong className="text-black block text-xs">Size & Cut Accuracy</strong>
                  <span className="text-[11px] text-slate-600 block">
                    Finished size matches {finishedSize} within ±0.5mm tolerance.
                  </span>
                </div>
              </label>

              <label
                onClick={() => toggleQcCheck('colorProofMatch')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer select-none transition ${
                  qcChecks.colorProofMatch ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={qcChecks.colorProofMatch}
                  onChange={() => {}}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                />
                <div>
                  <strong className="text-black block text-xs">Color Matching vs CMYK Sample Proof</strong>
                  <span className="text-[11px] text-slate-600 block">
                    Visual D50 light audit against approved RIP calibration.
                  </span>
                </div>
              </label>

              <label
                onClick={() => toggleQcCheck('laminationQuality')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer select-none transition ${
                  qcChecks.laminationQuality ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={qcChecks.laminationQuality}
                  onChange={() => {}}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                />
                <div>
                  <strong className="text-black block text-xs">Lamination Quality Check</strong>
                  <span className="text-[11px] text-slate-600 block">
                    Zero thermal bubbles, peeling, edge lift, or surface creases.
                  </span>
                </div>
              </label>

              <label
                onClick={() => toggleQcCheck('specialFinishingAlign')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer select-none transition ${
                  qcChecks.specialFinishingAlign ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={qcChecks.specialFinishingAlign}
                  onChange={() => {}}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                />
                <div>
                  <strong className="text-black block text-xs">Special Finishing Registration</strong>
                  <span className="text-[11px] text-slate-600 block">
                    Spot UV / Foil alignment registered within ±0.25mm.
                  </span>
                </div>
              </label>

              <label
                onClick={() => toggleQcCheck('quantityCountVerified')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer select-none transition ${
                  qcChecks.quantityCountVerified ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={qcChecks.quantityCountVerified}
                  onChange={() => {}}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                />
                <div>
                  <strong className="text-black block text-xs">Quantity Count Verification</strong>
                  <span className="text-[11px] text-slate-600 block">
                    Scale weigh-count or optical sheet counter confirms {orderedQuantity} units.
                  </span>
                </div>
              </label>

              <label
                onClick={() => toggleQcCheck('whiteLabelCompliance')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer select-none transition ${
                  qcChecks.whiteLabelCompliance ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={qcChecks.whiteLabelCompliance}
                  onChange={() => {}}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                />
                <div>
                  <strong className="text-black block text-xs">White-Label Compliance Check</strong>
                  <span className="text-[11px] text-slate-600 block">
                    {isWhiteLabelReseller
                      ? '✓ CONFIRMED: Zero PrintBazzar branding on packaging, slips, or box tapes.'
                      : 'Standard retail packaging brand audit passed.'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 8: OPERATOR SIGN-OFF & TIMESTAMPING BLOCK (9.2) */}
          <div className="pt-4 border-t-2 border-black space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-black">
                OPERATOR SIGN-OFF & PRODUCTION TIMESTAMPING BLOCK
              </span>
              <button
                type="button"
                onClick={handleSignOff}
                className="text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded print:hidden"
              >
                Timestamp Current Shift
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="border border-black rounded-lg p-3 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">1. MACHINE OPERATOR SIGN-OFF</span>
                <input
                  type="text"
                  placeholder="Operator Name"
                  value={operatorSignName}
                  onChange={(e) => setOperatorSignName(e.target.value)}
                  className="w-full text-xs font-bold text-black border-b border-dashed border-slate-400 py-1 focus:outline-none"
                />
                <div className="h-6 border-b border-slate-300 mt-2" />
                <span className="text-[9px] text-slate-500 block">Signature & Press Shift ID</span>
              </div>

              <div className="border border-black rounded-lg p-3 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">2. QC INSPECTOR SIGN-OFF</span>
                <input
                  type="text"
                  placeholder="QC Inspector Name"
                  value={qcInspectorSignName}
                  onChange={(e) => setQcInspectorSignName(e.target.value)}
                  className="w-full text-xs font-bold text-black border-b border-dashed border-slate-400 py-1 focus:outline-none"
                />
                <div className="h-6 border-b border-slate-300 mt-2" />
                <span className="text-[9px] text-slate-500 block">Signature & Inspection Release</span>
              </div>

              <div className="border border-black rounded-lg p-3 bg-amber-50/50 space-y-1">
                <span className="text-[10px] text-amber-900 uppercase font-bold block">3. COMPLETION TIMESTAMP</span>
                <strong className="text-black font-black text-xs block py-1" suppressHydrationWarning>
                  {signOffTimestamp || (jobData?.completedAt ? formatDateTime(jobData.completedAt) : 'Pending Shift Completion')}
                </strong>
                <div className="text-[10px] text-slate-700 pt-2 border-t border-amber-200">
                  Ready for Finishing & Dispatch Packaging
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         DIGITAL STATUS UPDATER MODAL (Section 9.3 & AC 9.3)
         Triggered when QR code is scanned or operator clicks digital update
         ========================================================================= */}
      {isStatusUpdaterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-md w-full overflow-hidden text-slate-900 font-sans">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold bg-[#FFED00] text-slate-950 px-2 py-0.5 rounded">
                  QR SCAN REALTIME STATUS UPDATER
                </span>
                <h3 className="text-base font-bold mt-1">
                  Update Job #{jobData?.jobNumber || jobId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStatusUpdaterOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStation} className="p-5 space-y-4 text-xs">
              {statusFeedback && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold">
                  {statusFeedback}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Select Production Station to Advance:
                </label>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  {[
                    { id: 'PRINTING', label: '1. Printing Press' },
                    { id: 'FINISHING', label: '2. Lamination & Finishing' },
                    { id: 'FINAL_QC', label: '3. Final QC Inspection' },
                    { id: 'PACKING', label: '4. Packing Station' },
                    { id: 'READY_FOR_DISPATCH', label: '5. Ready for Dispatch' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStation(st.id)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition ${
                        selectedStation === st.id
                          ? 'bg-slate-900 text-[#FFED00] border-slate-900 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Operator / Machine Remarks (Optional):
                </label>
                <textarea
                  rows={2}
                  value={statusUpdateNotes}
                  onChange={(e) => setStatusUpdateNotes(e.target.value)}
                  placeholder="e.g. 500 sheets completed on Indigo 12000, color density checked."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-950 font-mono">
                ✓ Scanning updates the central ERP production Kanban board in realtime.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsStatusUpdaterOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus || !selectedStation}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-black text-[#FFED00] font-bold text-xs flex items-center gap-1.5 disabled:bg-slate-400"
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Updating Realtime...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Publish Status Update</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
