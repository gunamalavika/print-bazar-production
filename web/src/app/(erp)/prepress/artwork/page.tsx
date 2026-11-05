'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Eye,
  RefreshCw,
  Send,
  UploadCloud,
  FileCode,
  ShieldAlert,
  Paintbrush,
  Sparkles,
  UserCheck,
  Clock,
  ArrowRight,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Download,
  MessageSquare,
  Phone,
  Mail,
  MessageCircle,
  History,
  Filter,
} from 'lucide-react';
import { api, resolveImageUrl, downloadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface DesignQueueItem {
  id: string;
  orderId?: string;
  orderNumber: string;
  currentStatus: string;
  customer?: {
    fullName: string;
    email: string;
    phone?: string;
    companyName?: string;
  };
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    artworkUrl?: string | null;
    artworkFile?: any;
    artworkFiles?: any;
    referenceImageUrl?: string | null;
    referenceImage?: any;
    artworkSource?: string;
    specifications?: any;
    personalizationData?: any;
    personalizationRecords?: any;
    approvedArtworkVersion?: any;
    latestArtworkVersion?: any;
    designNotes?: string | null;
  }>;
  artworkUrl?: string | null;
  referenceImageUrl?: string;
  assignedDesignerId?: string | null;
  assignedDesignerName?: string | null;
  assignedDesigner?: any;
  assignedOperator?: any;
  customerNotes?: string | null;
  slaDueDate?: string;
  createdAt: string;
  updatedAt?: string;
  isPassedToProduction?: boolean;
  passedToStation?: string;
  passedToStageBadge?: string;
  passedAt?: string | null;
  passedByDesigner?: string | null;
  passedPrepressNotes?: string | null;
  latestArtworkVersion?: any;
  approvedArtworkVersion?: any;
  statusHistory?: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    notes: string | null;
    createdAt: string;
    changedBy: string | null;
  }>;
}

interface PreflightJob {
  orderId: string;
  orderDbId?: string;
  orderItemId?: string;
  artworkVersionId?: string;
  customer: string;
  product: string;
  fileName: string;
  fileSize: string;
  dpi: number;
  colorSpace: string;
  bleedStatus: 'PASS' | 'WARNING' | 'FAIL';
  fontStatus: 'OUTLINED' | 'MISSING_GLYPHS';
  inkCoverage: number;
  stage: 'NEEDS_PREFLIGHT' | 'PROOF_DISPATCHED' | 'DEFECT_FLAGGED';
}

const PREFLIGHT_JOBS: PreflightJob[] = [
  {
    orderId: 'PB-2026-0001',
    customer: 'Acme Logistics Corp',
    product: 'Premium Visiting Cards (400 GSM Velvet)',
    fileName: 'Acme_VisitingCard_Final_v3.pdf',
    fileSize: '14.2 MB',
    dpi: 300,
    colorSpace: 'CMYK (FOGRA39)',
    bleedStatus: 'PASS',
    fontStatus: 'OUTLINED',
    inkCoverage: 280,
    stage: 'PROOF_DISPATCHED',
  },
  {
    orderId: 'PB-2026-0004',
    customer: 'Kaveri Herbals Ltd',
    product: 'Rigid Packaging Boxes with Spot Foil',
    fileName: 'Kaveri_Box_Dieline_Spread.ai',
    fileSize: '42.8 MB',
    dpi: 240,
    colorSpace: 'RGB (Profile Mismatch)',
    bleedStatus: 'FAIL',
    fontStatus: 'MISSING_GLYPHS',
    inkCoverage: 345,
    stage: 'DEFECT_FLAGGED',
  },
  {
    orderId: 'PB-2026-0005',
    customer: 'Zenith Tech Systems',
    product: 'Roll-Up Luxury Standee (2.5x6ft)',
    fileName: 'Zenith_Standee_PrintReady.pdf',
    fileSize: '88.1 MB',
    dpi: 150,
    colorSpace: 'CMYK (SWOP v2)',
    bleedStatus: 'PASS',
    fontStatus: 'OUTLINED',
    inkCoverage: 290,
    stage: 'NEEDS_PREFLIGHT',
  },
];

// Exclude all financial, cost, fee, tax, and internal metadata keys/labels
function isExcluded(keyOrLabel: string): boolean {
  const l = keyOrLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
  const blockedTerms = [
    'price',
    'cost',
    'fee',
    'tax',
    'gst',
    'subtotal',
    'total',
    'grandtotal',
    'discount',
    'shipping',
    'advance',
    'balance',
    'payment',
    'currency',
    'baseprice',
    'optionscost',
    'artworkprice',
    'designservicefee',
    'designserviceprice',
    'pricemodifier',
    'pricemodifiertype',
    'workflowroute',
    'artworksource',
    'artworkurl',
    'artworkstoragekey',
    'referenceimageurl',
    'referenceimage',
    'selecteddesignservice',
    'artworkrequirement',
    'designservicerequirement',
    'referenceimagerequirement',
    'ismultivariant',
    'variantlines',
    'specificationssnapshot',
    'designnotes',
    'customernotes',
    'internalnotes',
    'raw',
    'options',
    'selectedoptionssummary',
    'fieldvalues',
  ];

  return blockedTerms.some((term) => l.includes(term));
}

function parseSpecifications(specs: any) {
  if (!specs || typeof specs !== 'object') return [];

  const list: Array<{ label: string; value: string }> = [];
  const seenLabels = new Set<string>();

  const add = (label: string, value: any) => {
    if (value === null || value === undefined || typeof value === 'object') return;
    if (isExcluded(label)) return;

    const cleanLabel = label
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();

    const normalizedLabel = cleanLabel.toLowerCase();
    if (seenLabels.has(normalizedLabel)) return;
    seenLabels.add(normalizedLabel);

    const formattedLabel = cleanLabel
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    list.push({
      label: formattedLabel,
      value: String(value).trim(),
    });
  };

  // 1. Array of options
  if (Array.isArray(specs.options)) {
    for (const opt of specs.options) {
      const label = opt.optionName || opt.fieldLabel || opt.optionCode || 'Option';
      const val = opt.valueName || opt.optionLabel || opt.value || opt.valueCode;
      if (label && val) add(label, val);
    }
  }

  // 2. Selected options summary
  if (Array.isArray(specs.selectedOptionsSummary)) {
    for (const opt of specs.selectedOptionsSummary) {
      const label = opt.fieldLabel || opt.optionName || 'Option';
      const val = opt.value || opt.valueName || opt.optionLabel;
      if (label && val) add(label, val);
    }
  }

  // 3. Known direct design properties
  if (specs.paperGsm) add('Paper Stock', specs.paperGsm);
  if (specs.finish) add('Finishing & Coating', specs.finish);
  if (specs.dimensions) add('Trim Dimensions', specs.dimensions);
  if (specs.printMode) add('Print Mode', specs.printMode);
  if (specs.sides) add('Printing Sides', specs.sides);

  // 4. Any custom fields from fieldValues or direct properties (non-financial only)
  const entries =
    typeof specs.fieldValues === 'object' && specs.fieldValues !== null
      ? { ...specs, ...specs.fieldValues }
      : specs;

  for (const [key, val] of Object.entries(entries)) {
    if (isExcluded(key)) continue;
    if (typeof val === 'string' || typeof val === 'number') {
      if (val !== '' && val !== null && val !== undefined) {
        add(key, val);
      }
    }
  }

  return list;
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getPersonalizationDetails(item: any) {
  if (!item) return null;
  const pData = item.personalizationData || item.specifications?.personalization || null;
  const pRecords = item.personalizationRecords || [];

  const templateCode = pData?.templateCode || pData?.templateName || pData?.templateId || null;
  const sharedValues: Record<string, any> = pData?.sharedValues || {};
  let perItemEntries: Array<{ itemIndex?: number; values: Record<string, any> }> =
    pData?.perItemEntries || [];

  // If perItemEntries is empty or values are empty, check pRecords
  if (perItemEntries.length === 0 || perItemEntries.every((e) => !e.values || Object.keys(e.values).length === 0)) {
    if (pRecords && pRecords.length > 0) {
      perItemEntries = pRecords.map((r: any, idx: number) => ({
        itemIndex: r.itemIndex || idx + 1,
        values: r.fieldValues || {},
      }));
    }
  }

  const hasShared = Object.keys(sharedValues).length > 0;
  const hasPerItem = perItemEntries.some(
    (e) => e.values && Object.keys(e.values).length > 0
  );

  if (!hasShared && !hasPerItem && !templateCode) {
    return null;
  }

  return {
    templateCode: templateCode || 'Custom Personalization',
    sharedValues,
    entries: perItemEntries.filter((e) => e.values && Object.keys(e.values).length > 0),
  };
}

export default function ArtworkPrepressPage() {
  const { user: currentUser } = useAuth();
  const isDesigner = currentUser?.role === 'DESIGNER_PREPRESS';

  const [activeTab, setActiveTab] = useState<'DESIGN_STUDIO' | 'PASSED_TO_PRODUCTION' | 'PREFLIGHT'>('DESIGN_STUDIO');
  const [designSubFilter, setDesignSubFilter] = useState<'ALL' | 'ACTIVE' | 'PASSED'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'MINE'>('MINE');
  
  // Design Queue State
  const [designQueue, setDesignQueue] = useState<DesignQueueItem[]>([]);
  const [selectedDesignOrder, setSelectedDesignOrder] = useState<DesignQueueItem | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [designSearch, setDesignSearch] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);

  // Design Upload & Completion form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [prepressNotes, setPrepressNotes] = useState('');
  const [resolutionDpi, setResolutionDpi] = useState('300');
  const [isSubmittingDesign, setIsSubmittingDesign] = useState(false);
  const [isSpecsConfirmed, setIsSpecsConfirmed] = useState(false);

  // Preflight State
  const [preflightJobs, setPreflightJobs] = useState<PreflightJob[]>(PREFLIGHT_JOBS);
  const [selectedPreflightJob, setSelectedPreflightJob] = useState<PreflightJob | null>(PREFLIGHT_JOBS[0]);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  const activeOrders = designQueue.filter((o) => !o.isPassedToProduction);
  const passedOrders = designQueue.filter((o) => o.isPassedToProduction);

  const displayedOrders = (() => {
    if (activeTab === 'PASSED_TO_PRODUCTION' || designSubFilter === 'PASSED') {
      return passedOrders;
    }
    if (designSubFilter === 'ACTIVE') {
      return activeOrders;
    }
    return designQueue;
  })();

  const fetchDesignQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const effectiveScope = isDesigner ? 'mine' : (scopeFilter === 'MINE' ? 'mine' : 'all');
      const data = await api.getDesignQueue(
        designSearch,
        'all',
        effectiveScope,
      );
      setDesignQueue(data || []);
      if (data && data.length > 0) {
        const mappedJobs: PreflightJob[] = data.map((o: any) => {
          const firstItem = o.items?.[0];
          const artVersion = o.latestArtworkVersion || firstItem?.approvedArtworkVersion;
          const fileName =
            artVersion?.originalFileName ||
            firstItem?.artworkFile?.originalFileName ||
            (firstItem?.artworkUrl ? firstItem.artworkUrl.split('/').pop() : `${o.orderNumber}_artwork.pdf`);
          const fileSizeNum = artVersion?.fileSize || firstItem?.artworkFile?.fileSize;
          const fileSize = fileSizeNum ? `${(fileSizeNum / (1024 * 1024)).toFixed(1)} MB` : '14.2 MB';

          let stage: 'NEEDS_PREFLIGHT' | 'PROOF_DISPATCHED' | 'DEFECT_FLAGGED' = 'NEEDS_PREFLIGHT';
          if (o.status === 'CUSTOMER_APPROVAL_REQUIRED' || artVersion?.status === 'PROOF_GENERATED') {
            stage = 'PROOF_DISPATCHED';
          } else if (artVersion?.status === 'PROOF_REJECTED' || artVersion?.status === 'PREFLIGHT_FAILED') {
            stage = 'DEFECT_FLAGGED';
          }

          return {
            orderId: o.orderNumber,
            orderDbId: o.id,
            orderItemId: firstItem?.id,
            artworkVersionId: artVersion?.id,
            customer: o.customer?.fullName || o.customerName || 'Direct Customer',
            product: firstItem?.productName || o.productName || 'Custom Print Job',
            fileName,
            fileSize,
            dpi: artVersion?.resolutionDpi || 300,
            colorSpace: artVersion?.colorProfile || 'CMYK (FOGRA39)',
            bleedStatus: (artVersion?.hasBleed === false ? 'FAIL' : 'PASS') as 'PASS' | 'FAIL',
            fontStatus: 'OUTLINED' as const,
            inkCoverage: 280,
            stage,
          };
        });

        if (mappedJobs.length > 0) {
          setPreflightJobs(mappedJobs);
          setSelectedPreflightJob((prev) => {
            if (!prev) return mappedJobs[0];
            const match = mappedJobs.find((j) => j.orderId === prev.orderId);
            return match || mappedJobs[0];
          });
        }
      }
    } catch (err: any) {
      console.warn('Could not load design queue:', err.message);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchDesignQueue();
  }, [designSearch, scopeFilter, currentUser?.id]);

  useEffect(() => {
    if (displayedOrders.length > 0) {
      const isStillSelected = displayedOrders.some(
        (o) => (o.id || o.orderId) === (selectedDesignOrder?.id || selectedDesignOrder?.orderId),
      );
      if (!isStillSelected) {
        setSelectedDesignOrder(displayedOrders[0]);
      }
    } else {
      setSelectedDesignOrder(null);
    }
  }, [activeTab, designSubFilter, designQueue]);

  const handleClaimJob = async (orderId: string) => {
    try {
      await api.claimDesignJob(orderId);
      setActionSuccess(`Successfully claimed design job for order #${orderId}`);
      fetchDesignQueue();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to claim job');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  const handleCompleteDesignJob = async () => {
    if (!selectedDesignOrder || !uploadFile) {
      setActionError('Please select a finished print-ready artwork file to upload.');
      return;
    }

    setIsSubmittingDesign(true);
    setActionError('');
    try {
      // 1. Upload artwork file
      const uploadRes = await api.uploadArtwork(uploadFile);

      // 2. Submit & complete design job
      const orderIdToComplete = selectedDesignOrder.id || (selectedDesignOrder as any).orderId;
      await api.completeDesignJob(orderIdToComplete, {
        storageKey: uploadRes.storageKey,
        originalFileName: uploadRes.originalFileName,
        mimeType: uploadRes.mimeType,
        fileSize: uploadRes.fileSize,
        prepressNotes: prepressNotes || 'Design finalized and verified by Prepress Designer.',
        resolutionDpi: Number(resolutionDpi) || 300,
      });

      setActionSuccess(`Design for Order #${selectedDesignOrder.orderNumber} successfully completed and routed to OE for Production Assignment!`);
      setUploadFile(null);
      setPrepressNotes('');
      setIsSpecsConfirmed(false);
      await fetchDesignQueue();
      setActiveTab('PASSED_TO_PRODUCTION');
      setDesignSubFilter('PASSED');
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to complete design job');
    } finally {
      setIsSubmittingDesign(false);
    }
  };

  const handleGenerateProof = async (job: PreflightJob) => {
    setIsSubmittingProof(true);
    setActionError('');
    setActionSuccess('');
    try {
      let versionId = job.artworkVersionId;
      if (!versionId && job.orderItemId) {
        const reg = await api.registerArtwork({
          orderItemId: job.orderItemId,
          originalFileName: job.fileName,
          mimeType: 'application/pdf',
          fileSize: 14 * 1024 * 1024,
          storageKey: `artwork/${job.fileName}`,
          resolutionDpi: job.dpi || 300,
          hasBleed: job.bleedStatus === 'PASS',
          colorProfile: job.colorSpace || 'CMYK',
        });
        versionId = reg?.id;
      }

      if (versionId) {
        await api.submitProofForApproval(versionId, 'Digital proof verified and generated by Prepress Station.');
        setActionSuccess(`Digital Proof generated & dispatched to customer for order #${job.orderId}`);
      } else {
        throw new Error(`Unable to resolve order item or artwork version for order #${job.orderId}`);
      }

      await fetchDesignQueue();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to generate and dispatch digital proof');
      setTimeout(() => setActionError(''), 5000);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleFlagDefect = async (job: PreflightJob) => {
    setIsSubmittingProof(true);
    setActionError('');
    setActionSuccess('');
    try {
      if (!job.orderItemId) {
        throw new Error(`Order item ID missing for order #${job.orderId}`);
      }
      await api.requestRevision({
        orderItemId: job.orderItemId,
        artworkVersionId: job.artworkVersionId,
        revisionFeedback: `Preflight defect detected for ${job.orderId}: RGB colorspace detected and bleed margin missing. Please re-upload CMYK artwork with 3mm bleed.`,
      });
      setActionSuccess(`Defect ticket persisted and dispatched to customer for order #${job.orderId}`);
      await fetchDesignQueue();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to flag defect');
      setTimeout(() => setActionError(''), 5000);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            <span>DESIGN & PREPRESS STUDIO</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">ROUTE A & ROUTE B MANAGEMENT</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Artwork & Design Operations Console
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Manage custom design creation (Route B) and automated preflight proofing for customer artwork (Route A).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-lg">
          <button
            onClick={() => {
              setActiveTab('DESIGN_STUDIO');
              setDesignSubFilter('ACTIVE');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition ${
              activeTab === 'DESIGN_STUDIO' && designSubFilter !== 'PASSED'
                ? 'bg-amber-300 text-slate-900 shadow-sm border border-slate-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paintbrush className="h-4 w-4" />
            <span>Design Studio Queue ({activeOrders.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('PASSED_TO_PRODUCTION');
              setDesignSubFilter('PASSED');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition ${
              activeTab === 'PASSED_TO_PRODUCTION' || (activeTab === 'DESIGN_STUDIO' && designSubFilter === 'PASSED')
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            <span>Passed to Production ({passedOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('PREFLIGHT')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition ${
              activeTab === 'PREFLIGHT'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="h-4 w-4" />
            <span>Preflight & Prepress (Route A)</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[13px] font-medium rounded-md flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-[13px] font-medium rounded-md flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* TAB 1: DESIGN STUDIO QUEUE & PASSED DESIGNS (Route B) */}
      {(activeTab === 'DESIGN_STUDIO' || activeTab === 'PASSED_TO_PRODUCTION') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Design Queue List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  {activeTab === 'PASSED_TO_PRODUCTION' || designSubFilter === 'PASSED' ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>PASSED TO PRODUCTION & RELEASED DESIGNS</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>ROUTE B: DESIGN SERVICE QUEUE</span>
                    </>
                  )}
                </h2>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {activeTab === 'PASSED_TO_PRODUCTION' || designSubFilter === 'PASSED'
                    ? (isDesigner
                        ? 'Completed designs verified and routed by you to OE for Production Assignment.'
                        : 'Completed designs verified and routed downstream to OE for Production Assignment.')
                    : (isDesigner
                        ? 'Orders assigned to you for custom design preparation before OE Production Assignment.'
                        : 'Orders requiring custom design preparation before OE Production Assignment.')}
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                {/* Subfilter pills */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-slate-200 text-xs">
                  <button
                    onClick={() => {
                      setActiveTab('DESIGN_STUDIO');
                      setDesignSubFilter('ALL');
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                      activeTab === 'DESIGN_STUDIO' && designSubFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({designQueue.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('DESIGN_STUDIO');
                      setDesignSubFilter('ACTIVE');
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                      activeTab === 'DESIGN_STUDIO' && designSubFilter === 'ACTIVE'
                        ? 'bg-amber-300 text-slate-900 border border-slate-300'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Needs Design ({activeOrders.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('PASSED_TO_PRODUCTION');
                      setDesignSubFilter('PASSED');
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                      activeTab === 'PASSED_TO_PRODUCTION' || designSubFilter === 'PASSED'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Passed ({passedOrders.length})
                  </button>
                </div>

                {/* Scope selector */}
                {isDesigner ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                    <UserCheck className="h-3.5 w-3.5 text-amber-600" />
                    <span>My Assigned &amp; Passed Orders</span>
                  </div>
                ) : (
                  <select
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value as any)}
                    className="text-[11px] font-bold px-2 py-1 rounded bg-white border border-slate-200 text-slate-700"
                  >
                    <option value="MINE">My Assigned Orders</option>
                    <option value="ALL">All Studio Orders</option>
                  </select>
                )}

                <button
                  onClick={fetchDesignQueue}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition"
                  title="Refresh Queue"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingQueue ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {displayedOrders.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                {activeTab === 'PASSED_TO_PRODUCTION' || designSubFilter === 'PASSED' ? (
                  <>
                    <CheckCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-[14px] font-medium text-slate-700">No Routed Orders Found</p>
                    <p className="text-[12px] text-slate-400 mt-1">Orders will appear here once designs are completed and routed to OE.</p>
                  </>
                ) : (
                  <>
                    <Paintbrush className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-[14px] font-medium text-slate-700">No Orders in Design Queue</p>
                    <p className="text-[12px] text-slate-400 mt-1">All design service requests have been completed and routed to OE.</p>
                    {passedOrders.length > 0 && (
                      <button
                        onClick={() => {
                          setActiveTab('PASSED_TO_PRODUCTION');
                          setDesignSubFilter('PASSED');
                        }}
                        className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>View Passed Designs ({passedOrders.length})</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
                {displayedOrders.map((order, idx) => {
                  const orderKey = order.id || order.orderId || `design-queue-item-${order.orderNumber || idx}`;
                  const isSelected = (selectedDesignOrder?.id || selectedDesignOrder?.orderId) === (order.id || order.orderId);
                  const item = order.items?.[0];
                  return (
                    <div
                      key={orderKey}
                      onClick={() => setSelectedDesignOrder(order)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? order.isPassedToProduction
                            ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500'
                            : 'bg-amber-50/60 border-l-4 border-l-amber-400'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 pr-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-[13px] text-slate-900 tabular-nums">
                              #{order.orderNumber}
                            </span>
                            <span className="text-[13px] font-semibold text-slate-800">
                              {order.customer?.fullName || 'Customer'}
                            </span>
                            {order.isPassedToProduction ? (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                <CheckCircle className="h-3 w-3 text-emerald-600" />
                                ROUTED TO OE
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                DESIGN SERVICE
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-slate-700 font-medium">
                            {item?.productName || 'Custom Print Job'} ({item?.quantity || 1} pcs)
                          </p>

                          {order.isPassedToProduction && (
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 bg-slate-100/90 border border-slate-200/90 rounded-md px-2.5 py-1 mt-1">
                              <ArrowRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>Current Stage: <strong className="text-emerald-950 font-bold">{order.passedToStation}</strong></span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2.5 mt-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3" />
                              {order.isPassedToProduction && order.passedAt
                                ? `Passed: ${new Date(order.passedAt).toLocaleDateString()}`
                                : `Created: ${new Date(order.createdAt).toLocaleDateString()}`}
                            </span>
                            {order.isPassedToProduction && order.passedByDesigner && (
                              <span className="flex items-center gap-1 font-mono text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                <UserCheck className="h-3 w-3 text-purple-600" />
                                By: {order.passedByDesigner}
                              </span>
                            )}
                            {order.customer?.phone && (
                              <span className="flex items-center gap-1 font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <Phone className="h-3 w-3 text-emerald-600" />
                                {order.customer.phone}
                              </span>
                            )}
                            {item?.referenceImageUrl && (
                              <span className="flex items-center gap-1 text-blue-600 font-medium">
                                <ImageIcon className="h-3 w-3" />
                                Reference
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {order.isPassedToProduction ? (
                            <>
                              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-slate-900 text-white shadow-2xs block">
                                {order.passedToStageBadge || 'PASSED'}
                              </span>
                              {order.latestArtworkVersion?.storageKey && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadFile(
                                      order.latestArtworkVersion.storageKey,
                                      `${order.orderNumber}_Proof.png`,
                                    );
                                  }}
                                  className="mt-2 text-[10.5px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded inline-flex items-center gap-1 font-semibold cursor-pointer"
                                  title="Download Proof Image"
                                >
                                  <Download className="h-3 w-3" />
                                  Proof
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-200 block">
                                {order.currentStatus}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500 block mt-2">
                                {order.assignedDesignerId ? 'Assigned' : 'Unassigned'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Design Workspace */}
          {selectedDesignOrder ? (
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-5">
              <div className="border-b border-slate-200 pb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-mono font-bold uppercase text-amber-600">
                    DESIGN STUDIO WORKBENCH
                  </span>
                  <h3 className="text-[17px] font-bold text-slate-900 mt-0.5">
                    Order #{selectedDesignOrder.orderNumber}
                  </h3>
                  
                  {/* Customer Information & Contact Details */}
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap text-[12px] text-slate-700">
                      <span className="font-bold text-slate-900">
                        {selectedDesignOrder.customer?.fullName || 'Direct Customer'}
                      </span>
                      {selectedDesignOrder.customer?.companyName && (
                        <span className="text-slate-500 font-medium">
                          • {selectedDesignOrder.customer.companyName}
                        </span>
                      )}
                      {selectedDesignOrder.customer?.email && (
                        <span className="text-slate-500 font-mono text-[11px]">
                          ({selectedDesignOrder.customer.email})
                        </span>
                      )}
                    </div>

                    {/* Customer Phone Contact Strip */}
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-mono font-bold shadow-2xs">
                        <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{selectedDesignOrder.customer?.phone || 'No phone registered'}</span>
                      </div>

                      {selectedDesignOrder.customer?.phone && (
                        <>
                          <a
                            href={`tel:${selectedDesignOrder.customer.phone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition shadow-2xs"
                            title="Call Customer"
                          >
                            <Phone className="h-3 w-3 text-slate-600" />
                            <span>Call</span>
                          </a>
                          <a
                            href={`https://wa.me/${selectedDesignOrder.customer.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-2xs"
                            title="Open WhatsApp Chat"
                          >
                            <MessageCircle className="h-3 w-3" />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {selectedDesignOrder.isPassedToProduction ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs shrink-0">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span>PASSED TO PRODUCTION</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleClaimJob(selectedDesignOrder.id || (selectedDesignOrder as any).orderId)}
                    className="flex items-center gap-1 text-[12px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded border border-slate-300 transition shrink-0"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Claim Job</span>
                  </button>
                )}
              </div>

              {/* Product Specifications & References */}
              <div className="space-y-4">
                {(() => {
                  const firstItem = selectedDesignOrder.items?.[0];
                  const specs = firstItem?.specifications || {};
                  const parsedSpecs = parseSpecifications(specs);
                  const designNotes =
                    firstItem?.designNotes ||
                    specs?.designNotes ||
                    specs?.customerNotes ||
                    (selectedDesignOrder as any)?.customerNotes;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[12px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          <span>Product Specifications & Notes</span>
                        </h4>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          RUN: {firstItem?.quantity || 1} PCS
                        </span>
                      </div>

                      <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 space-y-3 shadow-2xs">
                        {/* Product & Quantity Strip */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                              PRODUCT ITEM
                            </span>
                            <strong className="text-[14px] font-bold text-slate-950 block leading-tight">
                              {firstItem?.productName || 'Custom Print Job'}
                            </strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                              ORDER RUN
                            </span>
                            <span className="font-mono font-black text-slate-900 text-[13px]">
                              {firstItem?.quantity || 1} pcs
                            </span>
                          </div>
                        </div>

                        {/* Parsed Key-Value Specifications Grid */}
                        {parsedSpecs.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {parsedSpecs.map((spec, idx) => (
                              <div
                                key={idx}
                                className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs space-y-0.5"
                              >
                                <span className="text-[9.5px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                                  {spec.label}
                                </span>
                                <span className="text-[12px] font-bold text-slate-900 block break-words leading-snug">
                                  {spec.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic p-2 bg-white rounded border border-slate-200">
                            Standard commercial specifications configured.
                          </div>
                        )}

                        {/* Customer Custom Design Notes / Instructions */}
                        {designNotes ? (
                          <div className="p-3.5 bg-amber-50/95 rounded-xl border border-amber-300/80 text-[12px] space-y-1.5 shadow-2xs">
                            <div className="flex items-center gap-1.5 font-bold text-amber-950 text-[11px] uppercase tracking-wider">
                              <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                              <span>Customer Design Instructions & Notes:</span>
                            </div>
                            <p className="text-slate-900 text-[12px] leading-relaxed whitespace-pre-wrap font-medium bg-white/80 p-2.5 rounded-lg border border-amber-200/80">
                              {designNotes}
                            </p>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-slate-100/70 rounded-lg border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                            <span>No special design instructions provided by customer for this job.</span>
                          </div>
                        )}

                        {/* Optional Collapsible Technical Data View for Engineers */}
                        {firstItem?.specifications && (
                          <div className="pt-1 border-t border-slate-200/60">
                            <button
                              type="button"
                              onClick={() => setShowRawJson((prev) => !prev)}
                              className="text-[10px] font-mono font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition cursor-pointer"
                            >
                              <FileCode className="h-3 w-3 text-slate-400" />
                              <span>{showRawJson ? 'Hide Technical Metadata (JSON)' : 'Show Technical Metadata (JSON)'}</span>
                            </button>
                            {showRawJson && (
                              <pre className="mt-2 text-[10.5px] font-mono bg-white p-2.5 rounded-lg border border-slate-200 max-h-36 overflow-auto text-slate-700 animate-in fade-in">
                                {JSON.stringify(
                                  Object.fromEntries(
                                    Object.entries(firstItem.specifications || {}).filter(
                                      ([k]) => !isExcluded(k),
                                    ),
                                  ),
                                  null,
                                  2,
                                )}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Client Personalization & Custom Template Fields */}
                {(() => {
                  const firstItem = selectedDesignOrder.items?.[0];
                  const pDetails = getPersonalizationDetails(firstItem);
                  if (!pDetails) return null;

                  return (
                    <div className="p-4 bg-gradient-to-br from-purple-50/90 via-white to-purple-50/50 rounded-xl border-2 border-purple-300 shadow-sm space-y-3.5">
                      <div className="flex items-center justify-between border-b border-purple-200/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-purple-700 text-white shadow-xs">
                            <Sparkles className="h-4 w-4" />
                          </span>
                          <div>
                            <h5 className="text-[12.5px] font-black uppercase tracking-wider text-purple-950 font-display">
                              Client Personalization Template Fields
                            </h5>
                            <span className="text-[11px] font-mono text-purple-700 font-bold block">
                              Template: {pDetails.templateCode}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-900 px-2.5 py-1 rounded-full border border-purple-300 shadow-2xs">
                          CLIENT ENTERED DATA
                        </span>
                      </div>

                      {/* Shared Order-Level Fields */}
                      {Object.keys(pDetails.sharedValues).length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase text-purple-900 block tracking-wider">
                            Order-Level Inscription Details:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(pDetails.sharedValues).map(([k, v]) => (
                              <div key={k} className="bg-white p-2.5 rounded-lg border border-purple-200 shadow-2xs">
                                <span className="text-[9.5px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                                  {formatFieldLabel(k)}
                                </span>
                                <span className="text-[13px] font-black text-slate-950 block break-words mt-0.5">
                                  {String(v)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Per-Item Personalization Fields */}
                      {pDetails.entries.length > 0 && (
                        <div className="space-y-2.5">
                          {pDetails.entries.map((entry, eIdx) => {
                            const hasVals = entry.values && Object.keys(entry.values).length > 0;
                            if (!hasVals) return null;
                            return (
                              <div key={eIdx} className="bg-white rounded-lg border border-purple-200/90 p-3 shadow-2xs space-y-2">
                                {pDetails.entries.length > 1 && (
                                  <div className="flex items-center justify-between pb-1.5 border-b border-purple-100">
                                    <span className="text-[11px] font-mono font-bold text-purple-900">
                                      Unit #{entry.itemIndex || eIdx + 1}
                                    </span>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {Object.entries(entry.values).map(([k, v]) => (
                                    <div key={k} className="bg-purple-50/60 p-2.5 rounded-md border border-purple-200/80">
                                      <span className="text-[9.5px] font-mono uppercase font-bold text-purple-800 block tracking-wider">
                                        {formatFieldLabel(k)}
                                      </span>
                                      <span className="text-[13px] font-black text-slate-950 block break-words mt-0.5">
                                        {String(v)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Customer Uploaded Artwork (Single or Multi-Slot) */}
                {(() => {
                  const firstItem = selectedDesignOrder.items?.[0];
                  const afs = firstItem?.artworkFiles || firstItem?.specifications?.artworkFiles || null;
                  const rawArtworkUrl =
                    firstItem?.artworkUrl ||
                    firstItem?.specifications?.artworkUrl ||
                    firstItem?.specifications?.artworkFile?.fileUrl ||
                    (selectedDesignOrder as any)?.artworkUrl;

                  const slotEntries = afs && typeof afs === 'object' ? Object.entries(afs) : [];

                  if (slotEntries.length > 0) {
                    return (
                      <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                            <ImageIcon className="h-4 w-4 text-amber-600" />
                            <span>Customer Artwork Files ({slotEntries.length} Slots Uploaded)</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {slotEntries.map(([slotKey, fileObj]: [string, any], sIdx: number) => {
                            const fileUrl = fileObj?.fileUrl || (typeof fileObj === 'string' ? fileObj : '');
                            if (!fileUrl) return null;
                            const label = fileObj?.slotLabel || `Slot ${sIdx + 1}: ${slotKey.replace(/^slot_\d+_?/, '').replace(/_/g, ' ')}`;
                            const fileName = fileObj?.originalFileName || fileUrl.split('/').pop() || 'Artwork File';
                            const isDocOrVector =
                              fileUrl.toLowerCase().endsWith('.pdf') ||
                              fileUrl.toLowerCase().endsWith('.ai') ||
                              fileUrl.toLowerCase().endsWith('.eps') ||
                              fileUrl.toLowerCase().endsWith('.psd') ||
                              fileUrl.toLowerCase().endsWith('.cdr');

                            return (
                              <div key={slotKey} className="bg-white rounded-lg border border-amber-200 p-2.5 space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between pb-1.5 border-b border-amber-100">
                                  <span className="text-[11px] font-bold text-amber-950 truncate max-w-[150px]">
                                    {label}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={resolveImageUrl(fileUrl)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10.5px] text-blue-700 font-semibold hover:underline flex items-center gap-0.5"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Open
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => downloadFile(fileUrl, fileName || `${label}.png`)}
                                      className="text-[10px] text-amber-900 bg-amber-200/80 hover:bg-amber-300 font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer"
                                      title="Download File"
                                    >
                                      <Download className="h-2.5 w-2.5" />
                                      Get
                                    </button>
                                  </div>
                                </div>

                                {!isDocOrVector ? (
                                  <div className="relative rounded overflow-hidden border border-slate-100 bg-slate-50">
                                    <img
                                      src={resolveImageUrl(fileUrl)}
                                      alt={label}
                                      className="w-full h-32 object-contain p-1"
                                    />
                                  </div>
                                ) : (
                                  <div className="p-3 bg-amber-50/50 rounded border border-amber-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-800 font-medium truncate">
                                      <FileCode className="h-4 w-4 text-amber-600 shrink-0" />
                                      <span className="truncate">{fileName}</span>
                                    </div>
                                    <span className="text-[9.5px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded shrink-0">
                                      VECTOR
                                    </span>
                                  </div>
                                )}
                                <span className="text-[10px] text-slate-500 font-mono block truncate" title={fileName}>
                                  {fileName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (!rawArtworkUrl) return null;
                  const isDocOrVector =
                    rawArtworkUrl.toLowerCase().endsWith('.pdf') ||
                    rawArtworkUrl.toLowerCase().endsWith('.ai') ||
                    rawArtworkUrl.toLowerCase().endsWith('.eps') ||
                    rawArtworkUrl.toLowerCase().endsWith('.psd') ||
                    rawArtworkUrl.toLowerCase().endsWith('.cdr');

                  return (
                    <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                          <ImageIcon className="h-4 w-4 text-amber-600" />
                          <span>Customer Artwork (For Touch-up / Edits)</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={resolveImageUrl(rawArtworkUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-700 font-semibold flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open Full
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              downloadFile(
                                rawArtworkUrl,
                                rawArtworkUrl.split('/').pop() || 'customer_artwork.png',
                              )
                            }
                            className="text-[11px] text-amber-900 bg-amber-200/80 hover:bg-amber-300 border border-amber-300 font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer"
                            title="Download Customer Artwork"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </button>
                        </div>
                      </div>

                      {!isDocOrVector ? (
                        <div className="relative rounded-lg overflow-hidden border border-amber-200 bg-white">
                          <img
                            src={resolveImageUrl(rawArtworkUrl)}
                            alt="Customer Uploaded Artwork"
                            className="w-full max-h-48 object-contain bg-slate-50 p-1"
                          />
                        </div>
                      ) : (
                        <div className="p-2.5 bg-white rounded-lg border border-amber-200 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[12px] text-slate-800 font-medium">
                            <FileCode className="h-4 w-4 text-amber-600" />
                            <span>File: {rawArtworkUrl.split('/').pop()}</span>
                          </div>
                          <span className="text-[10.5px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            VECTOR / DOC
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Customer Reference Image */}
                {selectedDesignOrder.items?.[0]?.referenceImageUrl && (
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-bold text-blue-900 flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-blue-600" />
                        Customer Reference Image
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={resolveImageUrl(selectedDesignOrder.items[0].referenceImageUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-700 font-semibold flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open Full
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            downloadFile(
                              selectedDesignOrder.items[0].referenceImageUrl,
                              `${selectedDesignOrder.orderNumber}_Reference.png`,
                            )
                          }
                          className="text-[11px] text-blue-900 bg-blue-100 hover:bg-blue-200 border border-blue-200 font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer"
                          title="Download Reference Image"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </button>
                      </div>
                    </div>
                    <img
                      src={resolveImageUrl(selectedDesignOrder.items[0].referenceImageUrl)}
                      alt="Reference"
                      className="w-full h-36 object-cover rounded border border-blue-200"
                    />
                  </div>
                )}
              </div>

              {/* Work Panel Action Area */}
              {selectedDesignOrder.isPassedToProduction ? (
                /* ROUTED TO OE FOR PRODUCTION ASSIGNMENT HANDOFF PANEL */
                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/40 rounded-xl border border-emerald-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-black uppercase tracking-wider text-emerald-950 font-display">
                            Routed to OE for Production Assignment
                          </h4>
                          <span className="text-[11px] font-mono text-emerald-800 font-bold block">
                            Order #{selectedDesignOrder.orderNumber} • Awaiting OE Operator Assignment
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/operations/orders?search=${selectedDesignOrder.orderNumber}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
                        >
                          <span>OE Orders Queue</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-full border border-emerald-300 shadow-2xs">
                          ROUTED TO OE
                        </span>
                      </div>
                    </div>

                    <p className="text-[12px] text-emerald-900/90 leading-relaxed">
                      This custom design has been finalized, verified against customer specifications, and routed to the Operations Coordinator (OE) to assign a production operator.
                    </p>

                    {/* Target Station Card */}
                    <div className="p-3 bg-white/95 rounded-lg border border-emerald-200 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                        <div>
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                            Destination Station / Current Stage
                          </span>
                          <span className="text-[13px] font-black text-slate-900 block mt-0.5 flex items-center gap-1.5">
                            <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>{selectedDesignOrder.passedToStation}</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                            Assigned Production Operator
                          </span>
                          <span className="text-[13px] font-black text-slate-900 block mt-0.5">
                            {selectedDesignOrder.assignedOperator?.fullName || 'Pending OE Operator Assignment'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] pt-2 border-t border-emerald-100">
                        <div>
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                            Passed By Designer
                          </span>
                          <span className="text-[12px] font-bold text-purple-900 block mt-0.5">
                            {selectedDesignOrder.passedByDesigner || 'Studio Designer'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                            Passed Timestamp
                          </span>
                          <span className="text-[12px] font-mono font-bold text-slate-700 block mt-0.5">
                            {selectedDesignOrder.passedAt
                              ? new Date(selectedDesignOrder.passedAt).toLocaleString()
                              : 'Recently'}
                          </span>
                        </div>
                      </div>

                      {selectedDesignOrder.passedPrepressNotes && (
                        <div className="pt-2 border-t border-emerald-100">
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                            Designer Handoff Notes & OE Directives:
                          </span>
                          <p className="text-[12px] text-slate-800 bg-emerald-50/60 p-2 rounded border border-emerald-200/80 mt-1 italic">
                            &quot;{selectedDesignOrder.passedPrepressNotes}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Final Approved Print-Ready Artwork Card */}
                  {(() => {
                    const approvedArt =
                      selectedDesignOrder.approvedArtworkVersion ||
                      selectedDesignOrder.latestArtworkVersion ||
                      selectedDesignOrder.items?.[0]?.approvedArtworkVersion;
                    const fileUrl = approvedArt?.storageKey || approvedArt?.fileUrl;
                    const fileName = approvedArt?.originalFileName || (fileUrl ? fileUrl.split('/').pop() : 'PrintReady_Artwork.pdf');
                    const isDocOrVector =
                      fileName.toLowerCase().endsWith('.pdf') ||
                      fileName.toLowerCase().endsWith('.ai') ||
                      fileName.toLowerCase().endsWith('.eps') ||
                      fileName.toLowerCase().endsWith('.psd');

                    return (
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <span>Final Approved Print-Ready Artwork (Passed File)</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                            {approvedArt?.resolutionDpi || 300} DPI CMYK
                          </span>
                        </div>

                        {fileUrl ? (
                          <div className="space-y-2.5">
                            {!isDocOrVector ? (
                              <div className="relative rounded-lg overflow-hidden border border-emerald-200 bg-slate-50 flex items-center justify-center p-2">
                                <img
                                  src={resolveImageUrl(fileUrl)}
                                  alt="Final Approved Proof"
                                  className="max-h-60 w-auto object-contain rounded"
                                />
                              </div>
                            ) : (
                              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileCode className="h-6 w-6 text-amber-600 shrink-0" />
                                  <div>
                                    <span className="text-[12px] font-bold text-slate-900 block truncate max-w-[220px]">
                                      {fileName}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500 block">
                                      {approvedArt?.fileSize ? `${(approvedArt.fileSize / (1024 * 1024)).toFixed(2)} MB • ` : ''}
                                      Print-Ready Document
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-1 rounded">
                                  PROOF LOCKED
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <a
                                href={resolveImageUrl(fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[12px] py-2 rounded-lg transition"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Open Full Proof</span>
                              </a>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadFile(
                                    fileUrl,
                                    fileName || `${selectedDesignOrder.orderNumber}_Approved_Artwork.png`,
                                  )
                                }
                                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] py-2 rounded-lg transition cursor-pointer"
                                title="Download Artwork to Files"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Download Artwork</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[12px] text-slate-500 italic">No artwork version file attached.</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Status History Trail */}
                  {selectedDesignOrder.statusHistory && selectedDesignOrder.statusHistory.length > 0 && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                        <History className="h-3.5 w-3.5 text-slate-600" />
                        <span>Handoff Timeline & Audit Trail</span>
                      </span>

                      <div className="divide-y divide-slate-200/80">
                        {selectedDesignOrder.statusHistory.map((h, hIdx) => (
                          <div key={h.id || hIdx} className="py-2 text-[11.5px] space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">
                                {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}
                              </span>
                              <span className="text-[10.5px] font-mono text-slate-400">
                                {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px]">{h.reason}</p>
                            {h.changedBy && (
                              <span className="text-[10px] text-slate-400 block font-mono">By: {h.changedBy}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ACTIVE DESIGN WORKFLOW FORM (SUBMIT & RELEASE) */
                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <div>
                    <h4 className="text-[12px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <UploadCloud className="h-4 w-4 text-slate-700" />
                      <span>Upload Final Print-Ready Artwork</span>
                    </h4>
                    <p className="text-[12px] text-slate-500 mb-2">
                      Submit the finished high-resolution artwork (PDF / AI / TIFF).
                    </p>
                    
                    <input
                      type="file"
                      accept=".pdf,.ai,.eps,.psd,.tiff,.png,.jpg,.jpeg"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="block w-full text-[12px] text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-[12px] file:font-semibold file:bg-amber-300 file:text-slate-900 hover:file:bg-amber-400 cursor-pointer border border-slate-300 rounded-lg p-1.5 bg-slate-50"
                    />
                    {uploadFile && (
                      <p className="text-[11px] font-mono text-emerald-700 font-semibold mt-1">
                        ✓ Selected: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                        Target DPI
                      </label>
                      <input
                        type="number"
                        value={resolutionDpi}
                        onChange={(e) => setResolutionDpi(e.target.value)}
                        className="w-full text-[12px] px-3 py-1.5 rounded border border-slate-300 bg-white"
                        placeholder="300"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                        Color Mode
                      </label>
                      <input
                        type="text"
                        disabled
                        value="CMYK (FOGRA39 / SWOP)"
                        className="w-full text-[12px] px-3 py-1.5 rounded border border-slate-200 bg-slate-100 text-slate-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                      Prepress Notes & Directives for OE / Production
                    </label>
                    <textarea
                      rows={2}
                      value={prepressNotes}
                      onChange={(e) => setPrepressNotes(e.target.value)}
                      placeholder="E.g., 3mm bleed added, fonts outlined, vector dieline on separate spot layer."
                      className="w-full text-[12px] p-2.5 rounded-lg border border-slate-300 bg-white placeholder:text-slate-400"
                    />
                  </div>

                  {/* Mandatory Specifications Verification Gate */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-300/80 cursor-pointer text-xs text-amber-950 font-medium select-none shadow-2xs">
                    <input
                      type="checkbox"
                      checked={isSpecsConfirmed}
                      onChange={(e) => setIsSpecsConfirmed(e.target.checked)}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 h-4 w-4 border-amber-300"
                    />
                    <div>
                      <span className="font-bold block">
                        I have reviewed and verified customer specifications for this design
                      </span>
                      <span className="text-[11px] text-amber-800 block mt-0.5">
                        Confirming that the artwork strictly adheres to customer-selected specifications before routing to OE for Production Assignment.
                      </span>
                    </div>
                  </label>

                  <button
                    onClick={handleCompleteDesignJob}
                    disabled={isSubmittingDesign || !uploadFile || !isSpecsConfirmed}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-[13px] py-3 rounded-lg shadow-sm transition active:scale-[0.98]"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      {isSubmittingDesign ? 'Uploading & Routing...' : 'SUBMIT DESIGN & ROUTE TO OE'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-400">
              <Layers className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="text-[14px] font-medium text-slate-600">Select an Order</p>
              <p className="text-[12px] text-slate-400 mt-0.5">Click an order from the queue to start or complete the design.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PREFLIGHT & PREPRESS (Route A: Customer Artwork) */}
      {activeTab === 'PREFLIGHT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Prepress Queue Table */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">
                Incoming Customer Artwork Files
              </h2>
              <span className="text-[11px] font-mono text-slate-400">PitStop Engine: ACTIVE</span>
            </div>

            <div className="divide-y divide-slate-100">
              {preflightJobs.map((job) => {
                const isSelected = selectedPreflightJob?.orderId === job.orderId;
                return (
                  <div
                    key={job.orderId}
                    onClick={() => setSelectedPreflightJob(job)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-amber-50/50 border-l-4 border-l-amber-400' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[13px] text-slate-900 tabular-nums">
                            #{job.orderId}
                          </span>
                          <span className="text-[13px] font-medium text-slate-700">{job.customer}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            job.stage === 'PROOF_DISPATCHED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : job.stage === 'DEFECT_FLAGGED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {job.stage}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-600 font-normal mt-1">{job.product}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          File: {job.fileName} ({job.fileSize})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          job.bleedStatus === 'PASS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          BLEED: {job.bleedStatus}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 block mt-1 tabular-nums">
                          {job.dpi} DPI • {job.colorSpace}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 5 Cols: Preflight Inspection & Actions */}
          {selectedPreflightJob && (
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-[11px] font-mono font-semibold uppercase text-slate-400">
                  INSPECTION REPORT
                </span>
                <h3 className="text-[16px] font-semibold text-slate-900 mt-0.5">
                  {selectedPreflightJob.fileName}
                </h3>
                <p className="text-[12px] text-slate-500 tabular-nums font-mono">Order Ref: #{selectedPreflightJob.orderId}</p>
              </div>

              {/* Preflight Checks */}
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 font-medium">Output Resolution:</span>
                  <span className={`font-semibold tabular-nums ${selectedPreflightJob.dpi >= 300 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedPreflightJob.dpi} DPI {selectedPreflightJob.dpi >= 300 ? '✓ (Optimal)' : '⚠ (Under 300)'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 font-medium">Color Mode:</span>
                  <span className={`font-semibold ${selectedPreflightJob.colorSpace.includes('CMYK') ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedPreflightJob.colorSpace}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 font-medium">Bleed (3mm Required):</span>
                  <span className={`font-semibold ${selectedPreflightJob.bleedStatus === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedPreflightJob.bleedStatus === 'PASS' ? '3.0mm Detected ✓' : 'NO BLEED DETECTED ✕'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 font-medium">Fonts & Text Glyphs:</span>
                  <span className={`font-semibold ${selectedPreflightJob.fontStatus === 'OUTLINED' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedPreflightJob.fontStatus}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 font-medium">Total Area Coverage (TAC):</span>
                  <span className={`font-semibold tabular-nums ${selectedPreflightJob.inkCoverage <= 320 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedPreflightJob.inkCoverage}% {selectedPreflightJob.inkCoverage <= 320 ? '(Under 320% max)' : '(INK SMUDGE RISK)'}
                  </span>
                </div>
              </div>

              {/* Operator Actions */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <button
                  onClick={() => handleGenerateProof(selectedPreflightJob)}
                  disabled={isSubmittingProof}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-[13px] py-2.5 rounded-lg shadow-sm transition active:scale-[0.98]"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmittingProof ? 'Persisting Proof...' : 'GENERATE & DISPATCH DIGITAL PROOF'}</span>
                </button>

                <button
                  onClick={() => handleFlagDefect(selectedPreflightJob)}
                  disabled={isSubmittingProof}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-rose-50 disabled:bg-slate-100 text-rose-700 disabled:text-slate-400 font-semibold text-[13px] py-2 rounded-lg border border-rose-300 disabled:border-slate-200 transition"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>{isSubmittingProof ? 'Flagging Defect...' : 'Flag Preflight Defect & Request Re-Upload'}</span>
                </button>

                <Link
                  href={`/approvals/PROOF-${selectedPreflightJob.orderId}`}
                  target="_blank"
                  className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-900 py-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview Customer Proof Inspection Canvas ↗</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
