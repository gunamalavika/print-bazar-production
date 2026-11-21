'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Check,
  ShieldCheck,
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
  Trash2,
  Plus,
  MessageSquare,
  Phone,
  Mail,
  MessageCircle,
  History,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  X,
  ChevronRight,
  Calendar,
  AlertCircle,
  Tag,
  Building,
  User,
  Hash,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { RiKanbanView2 } from 'react-icons/ri';
import { api, resolveImageUrl, downloadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export interface DesignQueueItem {
  id: string;
  orderId?: string;
  orderNumber: string;
  currentStatus: string;
  revisionDirectives?: string | null;
  returnedBy?: string | null;
  returnedAt?: string | null;
  priority?: 'URGENT' | 'HIGH' | 'STANDARD' | string;
  customer?: {
    fullName: string;
    email: string;
    phone?: string;
    companyName?: string;
  };
  customerName?: string;
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
    approvedArtworkVersionId?: string | null;
    latestArtworkVersion?: any;
    artworkVersions?: any[];
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
  dueAt?: string;
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
  approvedArtworkVersionId?: string | null;
  allArtworkVersions?: any[];
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

export interface PreflightJob {
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

// Helper to exclude non-production, financial metadata
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

  if (Array.isArray(specs.options)) {
    for (const opt of specs.options) {
      const label = opt.optionName || opt.fieldLabel || opt.optionCode || 'Option';
      const val = opt.valueName || opt.optionLabel || opt.value || opt.valueCode;
      if (label && val) add(label, val);
    }
  }

  if (Array.isArray(specs.selectedOptionsSummary)) {
    for (const opt of specs.selectedOptionsSummary) {
      const label = opt.fieldLabel || opt.optionName || 'Option';
      const val = opt.value || opt.valueName || opt.optionLabel;
      if (label && val) add(label, val);
    }
  }

  if (specs.paperGsm) add('Paper Stock', specs.paperGsm);
  if (specs.finish) add('Finishing & Coating', specs.finish);
  if (specs.dimensions) add('Trim Dimensions', specs.dimensions);
  if (specs.printMode) add('Print Mode', specs.printMode);
  if (specs.sides) add('Printing Sides', specs.sides);

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

  if (perItemEntries.length === 0 || perItemEntries.every((e) => !e.values || Object.keys(e.values).length === 0)) {
    if (pRecords && pRecords.length > 0) {
      perItemEntries = pRecords.map((r: any, idx: number) => ({
        itemIndex: r.itemIndex || idx + 1,
        values: r.fieldValues || {},
      }));
    }
  }

  const hasShared = Object.keys(sharedValues).length > 0;
  const hasPerItem = perItemEntries.some((e) => e.values && Object.keys(e.values).length > 0);

  if (!hasShared && !hasPerItem && !templateCode) {
    return null;
  }

  return {
    templateCode: templateCode || 'Custom Personalization',
    sharedValues,
    entries: perItemEntries.filter((e) => e.values && Object.keys(e.values).length > 0),
  };
}

interface StagedUploadFile {
  id: string;
  file: File;
  label: string;
  previewUrl?: string;
}

export default function ArtworkPrepressPage() {
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const urlSearch = searchParams?.get('search') || '';

  const isDesigner = currentUser?.role === 'DESIGNER_PREPRESS';
  const isOE =
    currentUser?.role === 'OPERATIONAL_MANAGER' ||
    currentUser?.role === 'ADMIN_MANAGER';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'DESIGN_STUDIO' | 'PASSED_TO_PRODUCTION' | 'PREFLIGHT'>('DESIGN_STUDIO');
  
  // Rich Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVISION_NEEDED' | 'NEEDS_OE_CONFIRMATION' | 'PASSED'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'MINE' | 'UNASSIGNED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'URGENT' | 'HIGH' | 'STANDARD'>('ALL');
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'DUE_SOON'>('NEWEST');
  const [viewLayout, setViewLayout] = useState<'GRID' | 'TABLE'>('GRID');

  // Design Queue State
  const [designQueue, setDesignQueue] = useState<DesignQueueItem[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Selected Order for Full Detail View / Modal
  const [inspectedOrder, setInspectedOrder] = useState<DesignQueueItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Multi-File Staging & Upload form (in modal or workbench)
  const [stagedFiles, setStagedFiles] = useState<StagedUploadFile[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [prepressNotes, setPrepressNotes] = useState('');
  const [resolutionDpi, setResolutionDpi] = useState('300');
  const [isSubmittingDesign, setIsSubmittingDesign] = useState(false);
  const [isSpecsConfirmed, setIsSpecsConfirmed] = useState(false);

  // OE Artwork Confirmation & Correction Return State
  const [isConfirmingWork, setIsConfirmingWork] = useState(false);
  const [confirmingVersionId, setConfirmingVersionId] = useState<string | null>(null);
  const [oeConfirmNotes, setOeConfirmNotes] = useState('');
  const [isReturningToDesigner, setIsReturningToDesigner] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnFeedback, setReturnFeedback] = useState('');

  // Preflight State (Route A)
  const [preflightJobs, setPreflightJobs] = useState<PreflightJob[]>(PREFLIGHT_JOBS);
  const [selectedPreflightJob, setSelectedPreflightJob] = useState<PreflightJob | null>(PREFLIGHT_JOBS[0]);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Status helper functions
  const isPassedOrder = (o?: DesignQueueItem | null) => {
    if (!o) return false;
    const status = String(o.currentStatus || (o as any).status || '').toUpperCase();
    if (
      status === 'ARTWORK_APPROVED' ||
      status === 'PRE_PRODUCTION_QC' ||
      status === 'PRODUCTION_QUEUE' ||
      status === 'PRINTING' ||
      status === 'FINISHING' ||
      status === 'QUALITY_CHECK' ||
      status === 'PACKING' ||
      status === 'READY_FOR_DISPATCH' ||
      status === 'OUT_FOR_DELIVERY' ||
      status === 'DELIVERED'
    ) {
      return true;
    }
    return Boolean(o.isPassedToProduction);
  };

  const isAwaitingOE = (o?: DesignQueueItem | null) => {
    if (!o) return false;
    if (isPassedOrder(o)) return false;
    const status = String(o.currentStatus || (o as any).status || '').toUpperCase();
    if (status === 'CUSTOMER_APPROVAL_REQUIRED' || status === 'ARTWORK_REVIEW') {
      return true;
    }
    const itemVersions = o.items?.[0]?.artworkVersions || [];
    const allVersions = o.allArtworkVersions || [];
    const hasCandidateVersions = itemVersions.length > 0 || allVersions.length > 0 || Boolean(o.latestArtworkVersion);
    return hasCandidateVersions && status !== 'DESIGN_REQUIRED';
  };

  const isRevisionNeeded = (o?: DesignQueueItem | null) => {
    if (!o) return false;
    return Boolean(o.revisionDirectives);
  };

  const isNeedsDesign = (o?: DesignQueueItem | null) => {
    if (!o) return false;
    if (isPassedOrder(o)) return false;
    if (isAwaitingOE(o)) return false;
    return true;
  };

  // Counts for Metrics
  const passedOrders = useMemo(() => designQueue.filter((o) => isPassedOrder(o)), [designQueue]);
  const needsConfirmationOrders = useMemo(() => designQueue.filter((o) => isAwaitingOE(o)), [designQueue]);
  const revisionNeededOrders = useMemo(() => designQueue.filter((o) => isRevisionNeeded(o)), [designQueue]);
  const activeOrders = useMemo(() => designQueue.filter((o) => isNeedsDesign(o)), [designQueue]);

  // Fetch queue data
  const fetchDesignQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const effectiveScope = isDesigner ? 'mine' : 'all';
      const data = await api.getDesignQueue(searchQuery, 'all', effectiveScope);
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
        }

        // If an inspected order is currently open, refresh its data reference
        if (inspectedOrder) {
          const updated = data.find((x: any) => (x.id || x.orderId) === (inspectedOrder.id || inspectedOrder.orderId));
          if (updated) setInspectedOrder(updated);
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
  }, [searchQuery, currentUser?.id]);

  // Open modal if url has matching order
  useEffect(() => {
    if (urlSearch && designQueue.length > 0) {
      const match = designQueue.find(
        (o) => o.orderNumber.toLowerCase() === urlSearch.toLowerCase() || o.id === urlSearch,
      );
      if (match) {
        setInspectedOrder(match);
        setIsDetailModalOpen(true);
      }
    }
  }, [urlSearch, designQueue]);

  // Apply filters and sorting
  const filteredOrders = useMemo(() => {
    let result = [...designQueue];

    // Main Tab Filter
    if (activeTab === 'PASSED_TO_PRODUCTION') {
      result = result.filter((o) => isPassedOrder(o));
    } else if (activeTab === 'DESIGN_STUDIO') {
      // Sub-status filter
      if (statusFilter === 'ACTIVE') {
        result = result.filter((o) => isNeedsDesign(o));
      } else if (statusFilter === 'REVISION_NEEDED') {
        result = result.filter((o) => isRevisionNeeded(o));
      } else if (statusFilter === 'NEEDS_OE_CONFIRMATION') {
        result = result.filter((o) => isAwaitingOE(o));
      } else if (statusFilter === 'PASSED') {
        result = result.filter((o) => isPassedOrder(o));
      }
    }

    // Assignment Scope Filter
    if (scopeFilter === 'MINE') {
      if (currentUser?.id) {
        result = result.filter(
          (o) =>
            o.assignedDesignerId === currentUser.id ||
            o.assignedDesigner?.id === currentUser.id ||
            (o as any).assignments?.some((a: any) => a.assignedUserId === currentUser.id),
        );
      }
    } else if (scopeFilter === 'UNASSIGNED') {
      result = result.filter((o) => !o.assignedDesignerId && !o.assignedDesigner?.id);
    }

    // Priority Filter
    if (priorityFilter !== 'ALL') {
      result = result.filter((o) => {
        const prio = (o.priority || 'STANDARD').toUpperCase();
        return prio === priorityFilter;
      });
    }

    // Search query filter (Order number, customer name, phone, product)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o) => {
        const orderNum = (o.orderNumber || '').toLowerCase();
        const custName = (o.customer?.fullName || o.customerName || '').toLowerCase();
        const custCompany = (o.customer?.companyName || '').toLowerCase();
        const custPhone = (o.customer?.phone || '').toLowerCase();
        const prodName = (o.items?.[0]?.productName || '').toLowerCase();
        return (
          orderNum.includes(q) ||
          custName.includes(q) ||
          custCompany.includes(q) ||
          custPhone.includes(q) ||
          prodName.includes(q)
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'DUE_SOON') {
        const dueA = a.slaDueDate || a.dueAt || a.createdAt;
        const dueB = b.slaDueDate || b.dueAt || b.createdAt;
        return new Date(dueA).getTime() - new Date(dueB).getTime();
      }
      return 0;
    });

    return result;
  }, [designQueue, activeTab, statusFilter, scopeFilter, priorityFilter, searchQuery, sortBy, currentUser?.id]);

  // Actions
  const handleOpenDetailModal = (order: DesignQueueItem) => {
    setInspectedOrder(order);
    setIsDetailModalOpen(true);
    setStagedFiles([]);
    setUploadFile(null);
    setPrepressNotes('');
    setIsSpecsConfirmed(false);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    stagedFiles.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setStagedFiles([]);
    setUploadFile(null);
    setPrepressNotes('');
  };

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

  const handleFilesSelected = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const newStaged: StagedUploadFile[] = incoming.map((f, idx) => {
      const isImg = f.type.startsWith('image/');
      const previewUrl = isImg ? URL.createObjectURL(f) : undefined;
      const baseLabel = incoming.length > 1 ? `Option ${stagedFiles.length + idx + 1}` : 'Print-Ready Proof';
      return {
        id: `${f.name}_${Date.now()}_${idx}`,
        file: f,
        label: baseLabel,
        previewUrl,
      };
    });
    setStagedFiles((prev) => [...prev, ...newStaged]);
  };

  const handleRemoveStagedFile = (id: string) => {
    setStagedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleUpdateFileLabel = (id: string, label: string) => {
    setStagedFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, label } : item)),
    );
  };

  // Submit Artwork / Complete Design Job
  const handleSubmitDesignWork = async () => {
    if (!inspectedOrder) {
      setActionError('Please select an order to upload artwork.');
      return;
    }
    if (stagedFiles.length === 0 && !uploadFile) {
      setActionError('Please select at least one finished artwork/proof file to upload.');
      return;
    }

    setIsSubmittingDesign(true);
    setActionError('');
    try {
      const filesToProcess =
        stagedFiles.length > 0
          ? stagedFiles
          : uploadFile
          ? [{ id: 'single_file', file: uploadFile, label: 'Print-Ready Design' }]
          : [];

      const uploadedFilesPayload: Array<{
        storageKey: string;
        originalFileName: string;
        mimeType?: string;
        fileSize?: number;
        label?: string;
        resolutionDpi?: number;
      }> = [];

      for (const staged of filesToProcess) {
        const uploadRes = await api.uploadArtwork(staged.file);
        uploadedFilesPayload.push({
          storageKey: uploadRes.storageKey,
          originalFileName: staged.file.name,
          mimeType: staged.file.type || 'application/pdf',
          fileSize: staged.file.size,
          label: staged.label || staged.file.name,
          resolutionDpi: Number(resolutionDpi) || 300,
        });
      }

      const orderIdToSubmit = inspectedOrder.id || (inspectedOrder as any).orderId;
      await api.submitMultipleDesignWorks(orderIdToSubmit, {
        files: uploadedFilesPayload,
        prepressNotes:
          prepressNotes || 'Design works prepared and submitted by Prepress Designer. Released directly to Production.',
        resolutionDpi: Number(resolutionDpi) || 300,
      });

      setActionSuccess(
        `✓ Successfully uploaded ${filesToProcess.length} artwork file(s) for Order #${inspectedOrder.orderNumber}! Released directly to Production Queue.`,
      );

      stagedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      setStagedFiles([]);
      setUploadFile(null);
      setPrepressNotes('');
      setIsSpecsConfirmed(false);
      await fetchDesignQueue();
      setIsDetailModalOpen(false);
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to upload and submit artwork');
    } finally {
      setIsSubmittingDesign(false);
    }
  };

  const handleConfirmArtworkWork = async (orderItemId: string, artworkVersionId: string) => {
    setIsConfirmingWork(true);
    setConfirmingVersionId(artworkVersionId);
    setActionError('');
    try {
      await api.confirmArtworkWork({
        orderItemId,
        artworkVersionId,
        oeNotes: oeConfirmNotes || 'Confirmed and released directly to production',
      });

      setActionSuccess(
        `✓ Authoritative artwork confirmed for Order #${inspectedOrder?.orderNumber}! Locked and released to production queue.`,
      );
      setOeConfirmNotes('');
      setConfirmingVersionId(null);
      await fetchDesignQueue();
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to confirm artwork work');
    } finally {
      setIsConfirmingWork(false);
      setConfirmingVersionId(null);
    }
  };

  const handleReturnToDesigner = async () => {
    if (!inspectedOrder) return;
    setIsReturningToDesigner(true);
    setActionError('');
    try {
      const firstItem = inspectedOrder.items?.[0];
      const orderItemId = firstItem?.id || inspectedOrder.id;
      await api.returnArtworkToDesigner({
        orderItemId,
        revisionFeedback: returnFeedback.trim() || 'OE requested corrections to candidate designs.',
      });

      setActionSuccess(
        `✓ Order #${inspectedOrder.orderNumber} successfully returned to prepress designer with correction directives.`,
      );
      setShowReturnModal(false);
      setReturnFeedback('');
      await fetchDesignQueue();
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to return artwork to designer');
    } finally {
      setIsReturningToDesigner(false);
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

  const resetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setScopeFilter('ALL');
    setPriorityFilter('ALL');
    setSortBy('NEWEST');
  };

  const isAnyFilterActive =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    scopeFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    sortBy !== 'NEWEST';

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            <span>PREPRESS & ARTWORK STUDIO</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">ROUTE A & ROUTE B MANAGEMENT</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Artwork & Assigned Works Console
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            View assigned design works, inspect customer design requirements, and upload final print-ready artworks directly to Production.
          </p>
        </div>

        {/* Tab & Kanban Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto no-scrollbar shrink-0">
          <Link
            href="/prepress/kanban"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-white transition whitespace-nowrap shadow-2xs"
          >
            <RiKanbanView2 className="h-4 w-4 text-amber-600" />
            <span>Kanban Board</span>
          </Link>
          <button
            onClick={() => {
              setActiveTab('DESIGN_STUDIO');
              setStatusFilter('ALL');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'DESIGN_STUDIO'
                ? 'bg-amber-400 text-slate-950 shadow-xs border border-amber-500/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paintbrush className="h-4 w-4" />
            <span>Assigned Works ({designQueue.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('PASSED_TO_PRODUCTION');
              setStatusFilter('PASSED');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'PASSED_TO_PRODUCTION'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            <span>In Production ({passedOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('PREFLIGHT')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'PREFLIGHT'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="h-4 w-4" />
            <span>Route A Preflight</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs md:text-sm font-semibold rounded-xl flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 text-xs md:text-sm font-semibold rounded-xl flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-rose-700 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TAB 1 & 2: ASSIGNED WORKS CONSOLE */}
      {(activeTab === 'DESIGN_STUDIO' || activeTab === 'PASSED_TO_PRODUCTION') && (
        <div className="space-y-6">
          {/* Top Metric Cards Strip (Clickable KPI Filter Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Card 1: All Assigned Works */}
            <div
              onClick={() => {
                setActiveTab('DESIGN_STUDIO');
                setStatusFilter('ALL');
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                statusFilter === 'ALL' && activeTab === 'DESIGN_STUDIO'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider opacity-80">
                  ALL WORKS
                </span>
                <Layers className="h-4 w-4 opacity-70" />
              </div>
              <div className="text-2xl font-black mt-2 font-mono">{designQueue.length}</div>
              <p className="text-[11px] opacity-70 mt-0.5 truncate">Total design &amp; prepress jobs</p>
            </div>

            {/* Card 2: Needs Design */}
            <div
              onClick={() => {
                setActiveTab('DESIGN_STUDIO');
                setStatusFilter('ACTIVE');
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                statusFilter === 'ACTIVE' && activeTab === 'DESIGN_STUDIO'
                  ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-400/30'
                  : 'bg-amber-50/60 text-amber-950 border-amber-200 hover:border-amber-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider opacity-90">
                  NEEDS DESIGN
                </span>
                <Paintbrush className="h-4 w-4 text-amber-700" />
              </div>
              <div className="text-2xl font-black mt-2 font-mono text-amber-950">{activeOrders.length}</div>
              <p className="text-[11px] text-amber-800/80 mt-0.5 truncate">Ready for prepress design work</p>
            </div>

            {/* Card 3: Revision Directives */}
            <div
              onClick={() => {
                setActiveTab('DESIGN_STUDIO');
                setStatusFilter('REVISION_NEEDED');
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                statusFilter === 'REVISION_NEEDED' && activeTab === 'DESIGN_STUDIO'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-600/30'
                  : 'bg-rose-50/60 text-rose-950 border-rose-200 hover:border-rose-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider opacity-90">
                  REVISIONS NEEDED
                </span>
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black mt-2 font-mono text-rose-700">{revisionNeededOrders.length}</div>
              <p className="text-[11px] text-rose-800/80 mt-0.5 truncate">Returned by OE Coordinator</p>
            </div>

            {/* Card 4: Awaiting OE Confirmation */}
            <div
              onClick={() => {
                setActiveTab('DESIGN_STUDIO');
                setStatusFilter('NEEDS_OE_CONFIRMATION');
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                statusFilter === 'NEEDS_OE_CONFIRMATION' && activeTab === 'DESIGN_STUDIO'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-600/30'
                  : 'bg-blue-50/60 text-blue-950 border-blue-200 hover:border-blue-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider opacity-90">
                  AWAITING OE REVIEW
                </span>
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black mt-2 font-mono text-blue-700">
                {needsConfirmationOrders.length}
              </div>
              <p className="text-[11px] text-blue-800/80 mt-0.5 truncate">Candidate designs submitted</p>
            </div>

            {/* Card 5: In Production */}
            <div
              onClick={() => {
                setActiveTab('PASSED_TO_PRODUCTION');
                setStatusFilter('PASSED');
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none col-span-2 sm:col-span-1 ${
                activeTab === 'PASSED_TO_PRODUCTION' || statusFilter === 'PASSED'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-600/30'
                  : 'bg-emerald-50/60 text-emerald-950 border-emerald-200 hover:border-emerald-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider opacity-90">
                  IN PRODUCTION
                </span>
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black mt-2 font-mono text-emerald-700">{passedOrders.length}</div>
              <p className="text-[11px] text-emerald-800/80 mt-0.5 truncate">Released to shop-floor queue</p>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Order #, Customer, Phone, or Product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-200 bg-slate-50/80 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filters & Actions Controls */}
              <div className="flex items-center flex-wrap gap-2">
                {/* Scope selector */}
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className="text-slate-500 font-mono text-[11px] uppercase hidden sm:inline">Scope:</span>
                  <select
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value as any)}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <option value="ALL">All Studio Works</option>
                    <option value="MINE">My Assigned Works</option>
                    <option value="UNASSIGNED">Unassigned Works</option>
                  </select>
                </div>

                {/* Priority filter */}
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">🔥 Urgent</option>
                  <option value="HIGH">⚡ High</option>
                  <option value="STANDARD">Standard</option>
                </select>

                {/* Sort selector */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <option value="NEWEST">Newest First</option>
                  <option value="OLDEST">Oldest First</option>
                  <option value="DUE_SOON">Due Date (Soonest)</option>
                </select>

                {/* Layout view toggle */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewLayout('GRID')}
                    className={`p-1.5 rounded-md transition ${
                      viewLayout === 'GRID' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewLayout('TABLE')}
                    className={`p-1.5 rounded-md transition ${
                      viewLayout === 'TABLE' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Table / List View"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                {/* Refresh */}
                <button
                  onClick={fetchDesignQueue}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                  title="Refresh Queue"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingQueue ? 'animate-spin' : ''}`} />
                </button>

                {/* Reset Filters */}
                {isAnyFilterActive && (
                  <button
                    onClick={resetAllFilters}
                    className="text-[11px] font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 border border-dashed border-slate-300 transition flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Status Pill Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-xs">
              <span className="text-slate-400 font-mono text-[11px] uppercase mr-1">Status:</span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-full font-semibold transition ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({designQueue.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-full font-semibold transition ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-amber-400 text-slate-950 shadow-2xs'
                    : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Needs Design ({activeOrders.length})
              </button>
              <button
                onClick={() => setStatusFilter('REVISION_NEEDED')}
                className={`px-2.5 py-1 rounded-full font-semibold transition ${
                  statusFilter === 'REVISION_NEEDED'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                Revisions Needed ({revisionNeededOrders.length})
              </button>
              <button
                onClick={() => setStatusFilter('NEEDS_OE_CONFIRMATION')}
                className={`px-2.5 py-1 rounded-full font-semibold transition ${
                  statusFilter === 'NEEDS_OE_CONFIRMATION'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                Awaiting OE Review ({needsConfirmationOrders.length})
              </button>
              <button
                onClick={() => setStatusFilter('PASSED')}
                className={`px-2.5 py-1 rounded-full font-semibold transition ${
                  statusFilter === 'PASSED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                In Production ({passedOrders.length})
              </button>
            </div>
          </div>

          {/* Results Count Header */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong className="text-slate-900">{filteredOrders.length}</strong> of{' '}
              <strong className="text-slate-900">{designQueue.length}</strong> works
            </span>
            {searchQuery && (
              <span className="font-mono">
                Matching &quot;<span className="text-slate-800 font-bold">{searchQuery}</span>&quot;
              </span>
            )}
          </div>

          {/* EMPTY STATE */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <Paintbrush className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Matching Works Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No design jobs match the selected filter criteria or search query. Try resetting your filters to view all works.
              </p>
              {isAnyFilterActive && (
                <button
                  onClick={resetAllFilters}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          ) : viewLayout === 'GRID' ? (
            /* GRID VIEW OF DESIGN CARDS */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order, idx) => {
                const item = order.items?.[0];
                const orderKey = order.id || order.orderId || `order-${order.orderNumber || idx}`;
                const isPassed = isPassedOrder(order);
                const isRevision = isRevisionNeeded(order);
                const isAwaiting = isAwaitingOE(order);
                const hasSpecs = item?.specifications && Object.keys(item.specifications).length > 0;
                const parsedSpecs = parseSpecifications(item?.specifications || {});
                const pDetails = getPersonalizationDetails(item);
                const hasCustomerArtwork = Boolean(item?.artworkUrl || item?.artworkFile || item?.artworkFiles);
                const hasReference = Boolean(item?.referenceImageUrl);
                const versionsCount = (item?.artworkVersions?.length || 0) + (order.allArtworkVersions?.length || 0);

                return (
                  <div
                    key={orderKey}
                    onClick={() => handleOpenDetailModal(order)}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all duration-150 p-4 flex flex-col justify-between space-y-4 cursor-pointer relative group"
                  >
                    {/* Top Row: Order Number, Priority & Status Badge */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-slate-950 group-hover:text-amber-600 transition">
                            #{order.orderNumber}
                          </span>
                          {order.priority === 'URGENT' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                              🔥 URGENT
                            </span>
                          ) : order.priority === 'HIGH' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              ⚡ HIGH
                            </span>
                          ) : null}
                        </div>

                        {/* Status Badge */}
                        {isRevision ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                            REVISION REQUIRED
                          </span>
                        ) : isPassed ? (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                            IN PRODUCTION
                          </span>
                        ) : isAwaiting ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-blue-600" />
                            AWAITING OE
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Paintbrush className="h-3 w-3 text-amber-700" />
                            NEEDS DESIGN
                          </span>
                        )}
                      </div>

                      {/* Customer Info Strip */}
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-900 block truncate">
                            {order.customer?.fullName || order.customerName || 'Customer'}
                          </span>
                          {order.customer?.companyName && (
                            <span className="text-[11px] text-slate-500 block truncate">
                              {order.customer.companyName}
                            </span>
                          )}
                        </div>

                        {/* Contact Buttons */}
                        {order.customer?.phone && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 shrink-0"
                          >
                            <a
                              href={`tel:${order.customer.phone}`}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              title={`Call ${order.customer.phone}`}
                            >
                              <Phone className="h-3 w-3" />
                            </a>
                            <a
                              href={`https://wa.me/${order.customer.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Product Name & Run Quantity */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                            {item?.productName || 'Custom Print Job'}
                          </span>
                          <span className="text-[11px] font-mono font-black text-slate-950 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                            {item?.quantity || 1} pcs
                          </span>
                        </div>

                        {/* Quick Specs Chips */}
                        {parsedSpecs.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {parsedSpecs.slice(0, 3).map((s, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[10px] font-medium bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/80 truncate max-w-[120px]"
                                title={`${s.label}: ${s.value}`}
                              >
                                {s.value}
                              </span>
                            ))}
                            {parsedSpecs.length > 3 && (
                              <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                +{parsedSpecs.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Alert banner if revision directives exist */}
                      {isRevision && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-900 font-semibold space-y-0.5">
                          <div className="flex items-center gap-1 text-rose-700">
                            <RotateCcw className="h-3 w-3 shrink-0" />
                            <span className="font-bold uppercase tracking-wider text-[10px]">OE Directives:</span>
                          </div>
                          <p className="line-clamp-2 italic text-rose-950">&quot;{order.revisionDirectives}&quot;</p>
                        </div>
                      )}

                      {/* Asset & Attachment Indicators */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {hasCustomerArtwork && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <FileCode className="h-3 w-3" />
                            <span>Artwork Attached</span>
                          </span>
                        )}
                        {hasReference && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            <span>Reference</span>
                          </span>
                        )}
                        {pDetails && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            <span>Personalized</span>
                          </span>
                        )}
                        {versionsCount > 0 && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {versionsCount} version(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Assignment & Action Button */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        {order.assignedDesignerId ? (
                          <span className="text-[11px] font-mono text-slate-600 flex items-center gap-1 truncate">
                            <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {order.assignedDesignerName || order.assignedDesigner?.fullName || 'Assigned'}
                            </span>
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaimJob(order.id || (order as any).orderId);
                            }}
                            className="text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded border border-amber-300 transition"
                          >
                            + Claim Job
                          </button>
                        )}
                      </div>

                      {/* View Card / Details Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetailModal(order);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 group-hover:bg-amber-400 text-white group-hover:text-slate-950 text-xs font-bold transition shadow-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Card</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE / LIST VIEW */
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Product &amp; Qty</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Assets</th>
                      <th className="py-3 px-4">Assigned To</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order, idx) => {
                      const item = order.items?.[0];
                      const isPassed = isPassedOrder(order);
                      const isRevision = isRevisionNeeded(order);
                      const isAwaiting = isAwaitingOE(order);
                      const hasCustomerArtwork = Boolean(item?.artworkUrl || item?.artworkFile || item?.artworkFiles);

                      return (
                        <tr
                          key={order.id || idx}
                          onClick={() => handleOpenDetailModal(order)}
                          className="hover:bg-amber-50/40 transition cursor-pointer"
                        >
                          <td className="py-3 px-4 font-mono font-black text-slate-950">
                            #{order.orderNumber}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">
                              {order.customer?.fullName || order.customerName || 'Customer'}
                            </div>
                            {order.customer?.phone && (
                              <div className="text-[11px] font-mono text-slate-500">
                                {order.customer.phone}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 line-clamp-1">
                              {item?.productName || 'Custom Print Job'}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              Run: {item?.quantity || 1} pcs
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isRevision ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                REVISION
                              </span>
                            ) : isPassed ? (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                IN PROD
                              </span>
                            ) : isAwaiting ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                                AWAITING OE
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                NEEDS DESIGN
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              {hasCustomerArtwork && (
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                  Artwork
                                </span>
                              )}
                              {item?.referenceImageUrl && (
                                <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                                  Ref
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {order.assignedDesignerName || order.assignedDesigner?.fullName || 'Unassigned'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetailModal(order);
                              }}
                              className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-amber-400 text-white hover:text-slate-950 font-bold text-xs transition inline-flex items-center gap-1 shadow-2xs"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View Card</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PREFLIGHT & PREPRESS (Route A) */}
      {activeTab === 'PREFLIGHT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Preflight Jobs List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Incoming Customer Artwork Files (Route A)
              </h2>
              <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                PitStop Engine: ACTIVE
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {preflightJobs.map((job) => {
                const isSelected = selectedPreflightJob?.orderId === job.orderId;
                return (
                  <div
                    key={job.orderId}
                    onClick={() => setSelectedPreflightJob(job)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-amber-50/60 border-l-4 border-l-amber-400' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            #{job.orderId}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">{job.customer}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              job.stage === 'PROOF_DISPATCHED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : job.stage === 'DEFECT_FLAGGED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {job.stage}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{job.product}</p>
                        <p className="text-[11px] font-mono text-slate-400">
                          File: {job.fileName} ({job.fileSize})
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            job.bleedStatus === 'PASS'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          BLEED: {job.bleedStatus}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 block mt-1">
                          {job.dpi} DPI • {job.colorSpace}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preflight Inspection Right Column */}
          {selectedPreflightJob && (
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-[11px] font-mono font-bold uppercase text-slate-400">
                  INSPECTION REPORT
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedPreflightJob.fileName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">Order Ref: #{selectedPreflightJob.orderId}</p>
              </div>

              {/* Preflight Checks */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Output Resolution:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      selectedPreflightJob.dpi >= 300 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {selectedPreflightJob.dpi} DPI {selectedPreflightJob.dpi >= 300 ? '✓ (Optimal)' : '⚠ (Under 300)'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Color Mode:</span>
                  <span
                    className={`font-bold ${
                      selectedPreflightJob.colorSpace.includes('CMYK') ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {selectedPreflightJob.colorSpace}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Bleed (3mm Required):</span>
                  <span
                    className={`font-bold ${
                      selectedPreflightJob.bleedStatus === 'PASS' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {selectedPreflightJob.bleedStatus === 'PASS' ? '3.0mm Detected ✓' : 'NO BLEED DETECTED ✕'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Fonts &amp; Text Glyphs:</span>
                  <span
                    className={`font-bold ${
                      selectedPreflightJob.fontStatus === 'OUTLINED' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {selectedPreflightJob.fontStatus}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Total Area Coverage (TAC):</span>
                  <span
                    className={`font-bold tabular-nums ${
                      selectedPreflightJob.inkCoverage <= 320 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {selectedPreflightJob.inkCoverage}% {selectedPreflightJob.inkCoverage <= 320 ? '(Optimal)' : '(SMUDGE RISK)'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <button
                  onClick={() => handleGenerateProof(selectedPreflightJob)}
                  disabled={isSubmittingProof}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmittingProof ? 'Persisting Proof...' : 'GENERATE & DISPATCH DIGITAL PROOF'}</span>
                </button>

                <button
                  onClick={() => handleFlagDefect(selectedPreflightJob)}
                  disabled={isSubmittingProof}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-rose-50 disabled:bg-slate-100 text-rose-700 font-bold text-xs py-2 rounded-xl border border-rose-300 transition"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Flag Defect &amp; Request Re-Upload</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPREHENSIVE DESIGN WORK & INSPECTION MODAL (View Card Modal) */}
      {/* ========================================================================= */}
      {isDetailModalOpen && inspectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-6xl xl:max-w-7xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-3 shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-amber-600 uppercase tracking-wider">
                    DESIGN WORKBENCH
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono font-black text-lg text-slate-950">
                    Order #{inspectedOrder.orderNumber}
                  </span>
                  {isRevisionNeeded(inspectedOrder) ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-rose-600" />
                      REVISION NEEDED
                    </span>
                  ) : isPassedOrder(inspectedOrder) ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                      IN PRODUCTION
                    </span>
                  ) : isAwaitingOE(inspectedOrder) ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-blue-600" />
                      AWAITING OE
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      NEEDS DESIGN
                    </span>
                  )}
                </div>

                {/* Customer Details Strip */}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-600">
                  <span className="font-bold text-slate-900">
                    {inspectedOrder.customer?.fullName || inspectedOrder.customerName || 'Customer'}
                  </span>
                  {inspectedOrder.customer?.companyName && (
                    <span className="text-slate-500 font-medium">
                      • {inspectedOrder.customer.companyName}
                    </span>
                  )}
                  {inspectedOrder.customer?.email && (
                    <span className="font-mono text-slate-400 text-[11px]">
                      ({inspectedOrder.customer.email})
                    </span>
                  )}

                  {/* Customer Call & WhatsApp Quick Buttons */}
                  {inspectedOrder.customer?.phone && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {inspectedOrder.customer.phone}
                      </span>
                      <a
                        href={`tel:${inspectedOrder.customer.phone}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition"
                        title="Call Customer"
                      >
                        <Phone className="h-3 w-3 text-slate-600" />
                        <span>Call</span>
                      </a>
                      <a
                        href={`https://wa.me/${inspectedOrder.customer.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition"
                        title="Open WhatsApp"
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button & Actions */}
              <div className="flex items-center gap-2">
                {isOE && (
                  <button
                    type="button"
                    onClick={() => setShowReturnModal(true)}
                    className="flex items-center gap-1 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 px-3 py-1.5 rounded-lg border border-rose-300 transition cursor-pointer"
                    title="Return to Designer with Directives"
                  >
                    <RotateCcw className="h-3 w-3 text-rose-600" />
                    <span>Return for Corrections</span>
                  </button>
                )}
                {!inspectedOrder.assignedDesignerId && !isPassedOrder(inspectedOrder) && (
                  <button
                    type="button"
                    onClick={() => handleClaimJob(inspectedOrder.id || (inspectedOrder as any).orderId)}
                    className="flex items-center gap-1 text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-lg border border-amber-300 transition"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Claim Work</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseDetailModal}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable with Responsive 2-Column Grid on Large Screens) */}
            <div className="p-6 overflow-y-auto max-h-[calc(94vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (7 cols): Requirements, Specs, Assets, Personalization */}
                <div className="lg:col-span-7 space-y-5">
              {/* OE Correction Directives Banner if Returned */}
              {inspectedOrder.revisionDirectives && (
                <div className="p-4 bg-gradient-to-r from-rose-50 via-rose-50/80 to-amber-50 rounded-2xl border-2 border-rose-300 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-600 text-white shadow-xs">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-rose-950 font-mono">
                          OE CORRECTION DIRECTIVES — REVISIONS REQUIRED
                        </h4>
                        <span className="text-[11px] font-mono text-rose-800 font-bold block">
                          Returned by: {inspectedOrder.returnedBy || 'Operations Coordinator'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/95 p-3 rounded-xl border border-rose-200 shadow-2xs">
                    <p className="text-xs md:text-sm text-slate-900 font-semibold whitespace-pre-wrap leading-relaxed">
                      &quot;{inspectedOrder.revisionDirectives}&quot;
                    </p>
                  </div>
                  <p className="text-xs text-rose-900 font-medium">
                    ⚠️ Please update the artwork according to the instructions above and upload the updated file below.
                  </p>
                </div>
              )}

              {/* Product Specifications & Order Run */}
              {(() => {
                const firstItem = inspectedOrder.items?.[0];
                const specs = firstItem?.specifications || {};
                const parsedSpecs = parseSpecifications(specs);
                const designNotes =
                  firstItem?.designNotes ||
                  specs?.designNotes ||
                  specs?.customerNotes ||
                  (inspectedOrder as any)?.customerNotes;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span>Product Specifications &amp; Requirements</span>
                      </h4>
                      <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded border border-slate-200">
                        RUN: {firstItem?.quantity || 1} PCS
                      </span>
                    </div>

                    <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                      {/* Product Name Title */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                            PRODUCT ITEM
                          </span>
                          <strong className="text-base font-bold text-slate-950 block">
                            {firstItem?.productName || 'Custom Print Job'}
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                            ORDER QUANTITY
                          </span>
                          <span className="font-mono font-black text-slate-950 text-sm">
                            {firstItem?.quantity || 1} pcs
                          </span>
                        </div>
                      </div>

                      {/* Key-Value Specifications Grid */}
                      {parsedSpecs.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {parsedSpecs.map((spec, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-0.5"
                            >
                              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                                {spec.label}
                              </span>
                              <span className="text-xs font-bold text-slate-900 block break-words">
                                {spec.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic p-3 bg-white rounded-xl border border-slate-200">
                          Standard commercial specifications configured.
                        </div>
                      )}

                      {/* Customer Custom Design Notes / Instructions */}
                      {designNotes && (
                        <div className="p-3.5 bg-amber-50/95 rounded-xl border border-amber-300/80 text-xs space-y-1.5 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-950 text-[11px] uppercase tracking-wider font-mono">
                            <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                            <span>Customer Design Instructions &amp; Brief:</span>
                          </div>
                          <p className="text-slate-900 text-xs leading-relaxed whitespace-pre-wrap font-medium bg-white/80 p-2.5 rounded-lg border border-amber-200/80">
                            {designNotes}
                          </p>
                        </div>
                      )}

                      {/* Technical JSON Toggle */}
                      {firstItem?.specifications && (
                        <div className="pt-1 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => setShowRawJson((prev) => !prev)}
                            className="text-[11px] font-mono font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
                          >
                            <FileCode className="h-3.5 w-3.5 text-slate-400" />
                            <span>{showRawJson ? 'Hide Technical Metadata' : 'Show Technical Metadata (JSON)'}</span>
                          </button>
                          {showRawJson && (
                            <pre className="mt-2 text-[11px] font-mono bg-white p-3 rounded-xl border border-slate-200 max-h-40 overflow-auto text-slate-700">
                              {JSON.stringify(
                                Object.fromEntries(
                                  Object.entries(firstItem.specifications || {}).filter(([k]) => !isExcluded(k)),
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

              {/* Client Personalization Template Details */}
              {(() => {
                const firstItem = inspectedOrder.items?.[0];
                const pDetails = getPersonalizationDetails(firstItem);
                if (!pDetails) return null;

                return (
                  <div className="p-4 bg-gradient-to-br from-purple-50/90 via-white to-purple-50/50 rounded-2xl border-2 border-purple-300 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-purple-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-purple-700 text-white shadow-xs">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <div>
                          <h5 className="text-xs font-black uppercase tracking-wider text-purple-950 font-mono">
                            Client Personalization Template Fields
                          </h5>
                          <span className="text-[11px] font-mono text-purple-700 font-bold block">
                            Template: {pDetails.templateCode}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-900 px-2.5 py-1 rounded-full border border-purple-300">
                        CLIENT DATA
                      </span>
                    </div>

                    {/* Shared Values */}
                    {Object.keys(pDetails.sharedValues).length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase text-purple-900 block tracking-wider">
                          Shared Inscription Values:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(pDetails.sharedValues).map(([k, v]) => (
                            <div key={k} className="bg-white p-2.5 rounded-xl border border-purple-200 shadow-2xs">
                              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                                {formatFieldLabel(k)}
                              </span>
                              <span className="text-xs font-bold text-slate-950 block break-words mt-0.5">
                                {String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Per-item entries */}
                    {pDetails.entries.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold uppercase text-purple-900 block tracking-wider">
                          Per-Unit Entries ({pDetails.entries.length} items):
                        </span>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {pDetails.entries.map((entry, eIdx) => (
                            <div
                              key={eIdx}
                              className="bg-white rounded-xl border border-purple-200 p-2.5 shadow-2xs space-y-1.5"
                            >
                              <span className="text-[10px] font-mono font-bold text-purple-900 block">
                                Unit #{entry.itemIndex || eIdx + 1}
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Object.entries(entry.values || {}).map(([k, v]) => (
                                  <div key={k} className="bg-purple-50/60 p-2 rounded-lg border border-purple-200/80">
                                    <span className="text-[9.5px] font-mono uppercase font-bold text-purple-800 block">
                                      {formatFieldLabel(k)}
                                    </span>
                                    <span className="text-xs font-bold text-slate-950 block break-words">
                                      {String(v)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Customer Uploaded Artwork Assets */}
              {(() => {
                const firstItem = inspectedOrder.items?.[0];
                const afs = firstItem?.artworkFiles || firstItem?.specifications?.artworkFiles || null;
                const rawArtworkUrl =
                  firstItem?.artworkUrl ||
                  firstItem?.specifications?.artworkUrl ||
                  firstItem?.specifications?.artworkFile?.fileUrl ||
                  (inspectedOrder as any)?.artworkUrl;

                const slotEntries = afs && typeof afs === 'object' ? Object.entries(afs) : [];

                if (slotEntries.length > 0) {
                  return (
                    <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                          <ImageIcon className="h-4 w-4 text-amber-600" />
                          <span>Customer Artwork Files ({slotEntries.length} Slots Uploaded)</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {slotEntries.map(([slotKey, fileObj]: [string, any], sIdx: number) => {
                          const fileUrl = fileObj?.fileUrl || (typeof fileObj === 'string' ? fileObj : '');
                          if (!fileUrl) return null;
                          const label =
                            fileObj?.slotLabel || `Slot ${sIdx + 1}: ${slotKey.replace(/^slot_\d+_?/, '').replace(/_/g, ' ')}`;
                          const fileName = fileObj?.originalFileName || fileUrl.split('/').pop() || 'Artwork File';
                          const isDocOrVector =
                            fileUrl.toLowerCase().endsWith('.pdf') ||
                            fileUrl.toLowerCase().endsWith('.ai') ||
                            fileUrl.toLowerCase().endsWith('.eps') ||
                            fileUrl.toLowerCase().endsWith('.psd') ||
                            fileUrl.toLowerCase().endsWith('.cdr');

                          return (
                            <div key={slotKey} className="bg-white rounded-xl border border-amber-200 p-3 space-y-2 shadow-2xs">
                              <div className="flex items-center justify-between pb-1.5 border-b border-amber-100">
                                <span className="text-xs font-bold text-amber-950 truncate max-w-[180px]">
                                  {label}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={resolveImageUrl(fileUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-blue-700 font-semibold hover:underline flex items-center gap-0.5"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Open
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => downloadFile(fileUrl, fileName || `${label}.png`)}
                                    className="text-[11px] text-amber-900 bg-amber-200 hover:bg-amber-300 font-semibold px-2 py-0.5 rounded flex items-center gap-0.5 transition cursor-pointer"
                                  >
                                    <Download className="h-3 w-3" />
                                    Get
                                  </button>
                                </div>
                              </div>

                              {!isDocOrVector ? (
                                <div className="relative rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                                  <img
                                    src={resolveImageUrl(fileUrl)}
                                    alt={label}
                                    className="w-full h-36 object-contain p-1"
                                  />
                                </div>
                              ) : (
                                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-slate-800 font-medium truncate">
                                    <FileCode className="h-4 w-4 text-amber-600 shrink-0" />
                                    <span className="truncate">{fileName}</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded shrink-0">
                                    VECTOR / DOC
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
                  <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                        <ImageIcon className="h-4 w-4 text-amber-600" />
                        <span>Customer Uploaded Artwork</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={resolveImageUrl(rawArtworkUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-700 font-semibold flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
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
                          className="text-xs text-amber-900 bg-amber-200/80 hover:bg-amber-300 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      </div>
                    </div>

                    {!isDocOrVector ? (
                      <div className="relative rounded-xl overflow-hidden border border-amber-200 bg-white">
                        <img
                          src={resolveImageUrl(rawArtworkUrl)}
                          alt="Customer Uploaded Artwork"
                          className="w-full max-h-56 object-contain bg-slate-50 p-2"
                        />
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-800 font-medium">
                          <FileCode className="h-5 w-5 text-amber-600" />
                          <span>File: {rawArtworkUrl.split('/').pop()}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          VECTOR / DOC
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Customer Reference Image */}
              {inspectedOrder.items?.[0]?.referenceImageUrl && (
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                      <ImageIcon className="h-4 w-4 text-blue-600" />
                      Customer Reference Image
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={resolveImageUrl(inspectedOrder.items[0].referenceImageUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-700 font-semibold flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Full
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          downloadFile(
                            inspectedOrder.items[0].referenceImageUrl,
                            `${inspectedOrder.orderNumber}_Reference.png`,
                          )
                        }
                        className="text-xs text-blue-900 bg-blue-100 hover:bg-blue-200 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                  <img
                    src={resolveImageUrl(inspectedOrder.items[0].referenceImageUrl)}
                    alt="Reference"
                    className="w-full max-h-52 object-contain rounded-xl border border-blue-200 bg-white p-1"
                  />
                </div>
              )}
                </div>

                {/* Right Column (5 cols): Candidate Versions History & Artwork Submission Form */}
                <div className="lg:col-span-5 space-y-5">
              {/* Existing Candidate Artworks & Version History */}
              {(() => {
                const firstItem = inspectedOrder.items?.[0];
                const itemVersions: any[] = firstItem?.artworkVersions || [];
                const allVersions: any[] = inspectedOrder.allArtworkVersions || [];
                const approvedArt: any =
                  inspectedOrder.approvedArtworkVersion || firstItem?.approvedArtworkVersion || null;
                const latestArt: any = inspectedOrder.latestArtworkVersion || null;

                const rawVersions = [...allVersions, ...itemVersions];
                if (approvedArt) rawVersions.push(approvedArt);
                if (latestArt) rawVersions.push(latestArt);

                const uniqueVersions = rawVersions
                  .filter((v, idx, arr) => v?.id && arr.findIndex((x) => x?.id === v?.id) === idx)
                  .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));

                if (uniqueVersions.length === 0) return null;

                return (
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <span>Artwork Version History ({uniqueVersions.length} versions)</span>
                      </span>
                      {isPassedOrder(inspectedOrder) && (
                        <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
                          RELEASED TO PRODUCTION
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {uniqueVersions.map((art, vIdx) => {
                        const fileUrl = art.fileUrl || art.storageKey;
                        const fileName =
                          art.originalFileName ||
                          (fileUrl ? fileUrl.split('/').pop() : `Artwork_V${art.versionNumber || vIdx + 1}`);
                        const isThisConfirmed = Boolean(art.isApproved);
                        const isProcessingThis = isConfirmingWork && confirmingVersionId === art.id;

                        return (
                          <div
                            key={art.id || vIdx}
                            className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isThisConfirmed
                                ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300'
                                : 'bg-slate-50/70 border-slate-200'
                            }`}
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                    isThisConfirmed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  V{art.versionNumber || vIdx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-900 truncate max-w-xs" title={fileName}>
                                  {fileName}
                                </span>
                                {isThisConfirmed && (
                                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    CONFIRMED WORK
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                                <span>{art.resolutionDpi || 300} DPI</span>
                                {art.fileSize && (
                                  <span>• {(art.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                                )}
                                {art.uploadedBy && <span>• By: {art.uploadedBy}</span>}
                              </div>
                              {art.prepressNotes && (
                                <p className="text-[11px] text-slate-600 italic mt-1">
                                  &quot;{art.prepressNotes}&quot;
                                </p>
                              )}
                            </div>

                            {/* Version Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              {fileUrl && (
                                <>
                                  <a
                                    href={resolveImageUrl(fileUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 transition"
                                  >
                                    View Proof
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => downloadFile(fileUrl, fileName)}
                                    className="text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 transition cursor-pointer"
                                  >
                                    Download
                                  </button>
                                </>
                              )}

                              {isOE && !isThisConfirmed && (
                                <button
                                  type="button"
                                  disabled={isConfirmingWork}
                                  onClick={() =>
                                    handleConfirmArtworkWork(firstItem?.id || inspectedOrder.id, art.id)
                                  }
                                  className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer active:scale-95"
                                >
                                  {isProcessingThis ? 'Confirming...' : 'Set Confirmed Work'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ========================================================== */}
              {/* UPLOAD UPDATED ARTWORK & SUBMIT SECTION */}
              {/* ========================================================== */}
              <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                      <UploadCloud className="h-4 w-4 text-slate-800" />
                      <span>Upload Artwork &amp; Submit Direct to Production</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload candidate designs, variations, or production proofs (.PDF, .AI, .EPS, .PSD, .TIFF, .PNG, .JPG).
                    </p>
                  </div>
                </div>

                {/* Drag-and-drop upload zone */}
                <div className="border-2 border-dashed border-slate-300 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/30 rounded-2xl p-5 text-center transition cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.ai,.eps,.psd,.tiff,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesSelected(e.target.files);
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    <UploadCloud className="h-8 w-8 text-slate-400 mb-1.5" />
                    <span className="text-xs md:text-sm font-bold text-slate-800">
                      Click or drag &amp; drop artwork file(s) here
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Supports multiple files: .pdf, .ai, .eps, .psd, .tiff, images (300 DPI CMYK recommended)
                    </span>
                  </div>
                </div>

                {/* Staged files list with editable labels */}
                {stagedFiles.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block font-mono">
                      Staged Files for Submission ({stagedFiles.length}):
                    </span>
                    <div className="space-y-2">
                      {stagedFiles.map((sf, sfIdx) => (
                        <div
                          key={sf.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {sf.previewUrl ? (
                              <img
                                src={sf.previewUrl}
                                alt="Preview"
                                className="h-10 w-10 object-cover rounded-lg border border-slate-200 shrink-0"
                              />
                            ) : (
                              <FileCode className="h-8 w-8 text-amber-600 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 block truncate max-w-xs">
                                {sf.file.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 block">
                                {(sf.file.size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={sf.label}
                              onChange={(e) => handleUpdateFileLabel(sf.id, e.target.value)}
                              placeholder={`Option ${sfIdx + 1}`}
                              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 w-36 text-slate-800 focus:bg-white focus:border-amber-400"
                              title="Custom label (e.g., Front Side, Back Side, Spot UV)"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveStagedFile(sf.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              title="Remove file"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Configuration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase font-mono block mb-1">
                      Output Resolution (DPI)
                    </label>
                    <input
                      type="number"
                      value={resolutionDpi}
                      onChange={(e) => setResolutionDpi(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="300"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase font-mono block mb-1">
                      Color Mode
                    </label>
                    <input
                      type="text"
                      disabled
                      value="CMYK (FOGRA39 / Commercial Standard)"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 font-mono"
                    />
                  </div>
                </div>

                {/* Prepress Notes for Production */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase font-mono block mb-1">
                    Prepress Notes &amp; Directives for Production
                  </label>
                  <textarea
                    rows={2}
                    value={prepressNotes}
                    onChange={(e) => setPrepressNotes(e.target.value)}
                    placeholder="Enter instructions for production operators (e.g. 3mm bleed added, cut marks on Page 1, foil plate layer)..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 leading-relaxed"
                  />
                </div>

                {/* Verification Confirmation Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-300/80 cursor-pointer text-xs text-amber-950 font-medium select-none shadow-2xs">
                  <input
                    type="checkbox"
                    checked={isSpecsConfirmed}
                    onChange={(e) => setIsSpecsConfirmed(e.target.checked)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 h-4 w-4 border-amber-300"
                  />
                  <div>
                    <span className="font-bold block">
                      I have reviewed and verified customer specifications for this artwork
                    </span>
                    <span className="text-[11px] text-amber-800 block mt-0.5">
                      Confirming that candidate artworks strictly adhere to customer specifications and are ready for direct release to the shop-floor Production Queue.
                    </span>
                  </div>
                </label>

                {/* Main Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmitDesignWork}
                  disabled={isSubmittingDesign || (stagedFiles.length === 0 && !uploadFile) || !isSpecsConfirmed}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs md:text-sm py-3.5 rounded-xl shadow-md transition active:scale-[0.99] cursor-pointer"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>
                    {isSubmittingDesign
                      ? 'Uploading & Releasing Directly to Production...'
                      : stagedFiles.length > 1
                      ? `UPLOAD ${stagedFiles.length} ARTWORK FILES & MOVE DIRECT TO PRODUCTION`
                      : 'UPLOAD ARTWORK & MOVE DIRECT TO PRODUCTION'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* ========================================================================= */}
      {/* 3. RETURN TO DESIGNER MODAL (For Operations Coordinator / OE) */}
      {/* ========================================================================= */}
      {showReturnModal && inspectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    Return Artwork to Designer
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Order #{inspectedOrder.orderNumber} • Request Prepress Refinements
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-800 block">
                OE Revision Directives &amp; Feedback <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={returnFeedback}
                onChange={(e) => setReturnFeedback(e.target.value)}
                placeholder="Detail what needs correction (e.g. adjust bleed margin by 3mm, change font size on back side, correct logo placement)..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition shadow-2xs leading-relaxed"
              />
              <div className="space-y-1.5 pt-1">
                <span className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider block font-mono">
                  Quick Directives Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Bleed margin cutoff - add 3mm',
                    'Low resolution image - replace with 300 DPI asset',
                    'Color mismatch - convert to CMYK profile',
                    'Incorrect cut marks alignment',
                    'Customer requested modification',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReturnFeedback((prev) => (prev ? `${prev}. ${preset}` : preset))}
                      className="text-[10.5px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer active:scale-95"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                disabled={isReturningToDesigner}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturnToDesigner}
                disabled={isReturningToDesigner || !returnFeedback.trim()}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {isReturningToDesigner ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Returning...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Return to Designer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
