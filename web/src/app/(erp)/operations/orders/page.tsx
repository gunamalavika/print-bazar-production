'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  RiSearchLine,
  RiFilter3Line,
  RiRefreshLine,
  RiArrowRightLine,
  RiUserFollowLine,
  RiPrinterLine,
  RiAlertLine,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiFileTextLine,
  RiMoreFill,
  RiCloseLine,
  RiCheckLine,
  RiCalendarLine,
  RiFlashlightLine,
  RiLayoutGridLine,
  RiListCheck2,
  RiFilePdfLine,
  RiPaletteLine,
  RiSettings4Line,
  RiFileListLine,
  RiBox3Line,
  RiEyeLine,
  RiDownloadLine,
  RiExternalLinkLine,
  RiZoomInLine,
  RiImageLine,
  RiShieldCheckLine,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { useSocket } from '@/lib/socket-context';
import { formatCurrency, formatDate, resolveArtworkUrl } from '@/lib/utils';
import { Button } from '@/components/ui';

// ─── TYPES ──────────────────────────────────────────────────────────────────

type QueueTab =
  | 'NEEDS_ACTION'
  | 'DESIGN_REQUIRED'
  | 'READY_FOR_PRODUCTION'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'ALL';

interface StaffAssignee {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: 'AVAILABLE' | 'BUSY' | 'ON_LEAVE';
  activeJobs: number;
  skills: string[];
  recommended?: boolean;
  avatarUrl?: string;
}

// ─── DEFAULT ROSTERS FOR DRAWER ──────────────────────────────────────────────

const DEFAULT_DESIGNERS: StaffAssignee[] = [
  {
    id: '8f1d34a6-9509-441f-9b02-dab9611999a9',
    fullName: 'Rahul Verma',
    email: 'prepress@printbazzar.com',
    role: 'DESIGNER_PREPRESS',
    status: 'AVAILABLE',
    activeJobs: 2,
    skills: ['Branding', 'Print Design'],
    recommended: true,
  },
  {
    id: 'e04f9529-0bcb-4513-8cfb-1fe85073e8ef',
    fullName: 'Anjali Mehta',
    email: 'anjali.m@printbazzar.com',
    role: 'DESIGNER_PREPRESS',
    status: 'AVAILABLE',
    activeJobs: 3,
    skills: ['Branding', 'Packaging'],
  },
  {
    id: '0818f838-7bdd-43a6-b9cd-a960fc07fffa',
    fullName: 'Rahul Sharma',
    email: 'rahul.s@printbazzar.com',
    role: 'DESIGNER_PREPRESS',
    status: 'AVAILABLE',
    activeJobs: 2,
    skills: ['Digital', 'Illustrations'],
  },
  {
    id: 'fc170867-44b6-412b-a5fa-e526bb67f080',
    fullName: 'Priya Nair',
    email: 'priya.n@printbazzar.com',
    role: 'DESIGNER_PREPRESS',
    status: 'AVAILABLE',
    activeJobs: 1,
    skills: ['Visual Design', 'Proofing'],
  },
];

const DEFAULT_OPERATORS: StaffAssignee[] = [
  {
    id: 'b53ac7e3-08b2-4704-9049-4d646b27367f',
    fullName: 'Manoj Kumar',
    email: 'operator@printbazzar.com',
    role: 'PRODUCTION_OPERATOR',
    status: 'AVAILABLE',
    activeJobs: 2,
    skills: ['Sheetfed Offset', 'Brochures', 'Book Printing'],
    recommended: true,
  },
  {
    id: '61960d33-059a-42c6-9383-a029ec80d141',
    fullName: 'Arun Kumar',
    email: 'arun.print@printbazzar.com',
    role: 'PRODUCTION_OPERATOR',
    status: 'AVAILABLE',
    activeJobs: 2,
    skills: ['Digital Press', 'Business Cards', 'Commercial Print'],
  },
  {
    id: '8f1dd996-65ca-41a6-a629-6d3270a6ffd5',
    fullName: 'Vijay Verma',
    email: 'vijay.v@printbazzar.com',
    role: 'PRODUCTION_OPERATOR',
    status: 'AVAILABLE',
    activeJobs: 3,
    skills: ['Packaging Line', 'Rigid Boxes', 'Die-Cutter'],
  },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function OrderAssignmentCenterPage() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { isConnected, lastEvent, subscribeToOperations } = useSocket();

  // Primary state
  const [activeTab, setActiveTab] = useState<QueueTab>('NEEDS_ACTION');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [slaFilter, setSlaFilter] = useState('ALL');

  // Selection state for Bulk Assignment
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Drawer state - supports explicit DESIGN or PRODUCTION assignment
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerOrder, setDrawerOrder] = useState<any | null>(null);
  const [drawerType, setDrawerType] = useState<'DESIGN' | 'PRODUCTION'>('DESIGN');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [staffSearch, setStaffSearch] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  // Auto-dismiss live toast after 4.5 seconds
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => {
      setLiveToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [liveToast]);

  // Candidate Artworks Review & Selection Modal state
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [candidateOrder, setCandidateOrder] = useState<any | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedModalOperatorId, setSelectedModalOperatorId] = useState<string>('');
  const [oeReviewNotes, setOeReviewNotes] = useState('');
  const [isApprovingCandidate, setIsApprovingCandidate] = useState(false);
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);
  const [oeCorrectionNotes, setOeCorrectionNotes] = useState('');
  const [isReturningToDesigner, setIsReturningToDesigner] = useState(false);

  // Artwork Inspection Modal Viewer state
  const [artworkModalOpen, setArtworkModalOpen] = useState(false);
  const [artworkImageError, setArtworkImageError] = useState(false);
  const [viewingArtwork, setViewingArtwork] = useState<{
    orderNumber: string;
    productName: string;
    customerName: string;
    fileName: string;
    version: string;
    fileSize: string;
    fileUrl: string | null;
    storageKey?: string | null;
    mimeType?: string;
    dimensions?: string;
    qualityStatus?: string;
  } | null>(null);

  // Live order list state
  const [orders, setOrders] = useState<any[]>([]);
  const [designers, setDesigners] = useState<StaffAssignee[]>(DEFAULT_DESIGNERS);
  const [operators, setOperators] = useState<StaffAssignee[]>(DEFAULT_OPERATORS);
  const [isLoading, setIsLoading] = useState(false);

  // Date formatted card
  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return { dateStr, timeStr };
  }, []);

  // Fetch real data from Backend API and sync
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resOrders, resDesigners, resOperators] = await Promise.all([
        api.getOperationsOrders({ limit: 100 }).catch(() => null),
        api.getEligibleDesigners().catch(() => null),
        api.getEligibleProductionOperators().catch(() => null),
      ]);

      const backendOrders = Array.isArray(resOrders)
        ? resOrders
        : (resOrders as any)?.data || (resOrders as any)?.orders || [];

      if (backendOrders && backendOrders.length > 0) {
        // Map backend orders to unified structure
        const mapped = backendOrders.map((bo: any) => {
          const item = bo.items?.[0] || {};
          const specs = item.specifications || {};
          const latestArt = item.artworkVersions?.[0];
          const approvedArt = item.artworkVersions?.find((v: any) => v.isApproved);
          const hasConfirmedWork = Boolean(item.approvedArtworkVersionId || approvedArt);
          const hasUploadedCandidates = Boolean(item.artworkVersions && item.artworkVersions.length > 0);

          const isArtReady =
            bo.status === 'ARTWORK_APPROVED' ||
            bo.status === 'PRODUCTION_QUEUE' ||
            bo.status === 'PRINTING' ||
            bo.status === 'FINISHING' ||
            bo.status === 'QUALITY_CHECK' ||
            bo.status === 'PACKING' ||
            bo.status === 'READY_FOR_DISPATCH' ||
            bo.status === 'DELIVERED' ||
            hasConfirmedWork;

          const isDesign =
            bo.status === 'DESIGN_REQUIRED' ||
            bo.workflowRoute === 'DESIGN_SERVICE' ||
            item.artworkSource === 'DESIGN_TEAM' ||
            specs?.selectedDesignService ||
            specs?.workflowRoute === 'DESIGN_SERVICE' ||
            specs?.artworkSource === 'DESIGN_TEAM' ||
            specs?.artworkSource === 'CUSTOMER_WITH_DESIGN_ASSISTANCE';

          const artState = isArtReady
            ? 'READY'
            : bo.status === 'ARTWORK_REVIEW' || hasUploadedCandidates
            ? 'NEEDS_OE_CONFIRMATION'
            : isDesign
            ? 'DESIGN_REQUIRED'
            : 'NOT_READY';

          const rawArtUrl =
            approvedArt?.storageKey ||
            approvedArt?.proofUrl ||
            latestArt?.proofUrl ||
            latestArt?.storageKey ||
            specs?.artworkUrl ||
            specs?.artworkFile?.fileUrl ||
            specs?.artworkFile?.storageKey ||
            null;

          const artFileUrl = resolveArtworkUrl(rawArtUrl);

          const prodAssignee =
            bo.assignedOperator ||
            bo.productionAssignment?.assignedUser ||
            bo.assignments?.find((a: any) => a.taskType === 'PRODUCTION' && a.status === 'ACTIVE')?.assignedUser ||
            bo.assignments?.find((a: any) => a.taskType === 'PRODUCTION')?.assignedUser ||
            null;

          const activeDesignAssignment = bo.assignments?.find(
            (a: any) => a.taskType === 'DESIGN' && a.status === 'ACTIVE',
          );
          const completedDesignAssignment = bo.assignments?.find(
            (a: any) => a.taskType === 'DESIGN' && a.status === 'COMPLETED',
          );
          const anyDesignAssignment = bo.assignments?.find(
            (a: any) => a.taskType === 'DESIGN',
          );

          const designAssignee =
            bo.assignedDesigner ||
            bo.designAssignment?.assignedUser ||
            activeDesignAssignment?.assignedUser ||
            completedDesignAssignment?.assignedUser ||
            anyDesignAssignment?.assignedUser ||
            null;

          const isDesignCompleted = Boolean(
            completedDesignAssignment ||
            bo.status === 'ARTWORK_REVIEW' ||
            bo.status === 'ARTWORK_APPROVED' ||
            hasUploadedCandidates ||
            isArtReady,
          );

          const candidateArtworks = (item.artworkVersions || []).map((v: any) => ({
            id: v.id,
            versionNumber: v.versionNumber,
            originalFileName: v.originalFileName || `Artwork_v${v.versionNumber || 1}.pdf`,
            fileUrl: resolveArtworkUrl(v.proofUrl || v.storageKey),
            storageKey: v.storageKey,
            fileSize: v.fileSize ? `${(Number(v.fileSize) / (1024 * 1024)).toFixed(1)} MB` : '3.2 MB',
            mimeType: v.mimeType || 'application/pdf',
            isApproved: Boolean(v.isApproved),
            prepressNotes: v.prepressNotes || null,
            resolutionDpi: v.resolutionDpi || 300,
            createdAt: v.createdAt,
          }));

          return {
            id: bo.id,
            orderNumber: bo.orderNumber,
            orderItemId: item.id || null,
            candidateArtworks,
            customerName: bo.customer?.fullName || 'Direct Customer',
            productName: item.productName || 'Custom Print Job',
            thumbnailType: item.productName?.toLowerCase().includes('card')
              ? 'cards'
              : item.productName?.toLowerCase().includes('box')
              ? 'box'
              : 'brochure',
            specs: {
              quantity: item.quantity || 100,
              dimensions: specs.dimensions || specs.size || 'Standard',
              sides: specs.sides || '4 + 4',
              substrate: specs.paperGsm || specs.substrate || '350 GSM',
            },
            artworkState: artState,
            artworkMessage: isArtReady
              ? 'Artwork verified & approved for production'
              : isDesign
              ? 'Custom prepress design requested by client'
              : 'No approved artwork version uploaded',
            artworkFile: isArtReady || hasUploadedCandidates
              ? {
                  fileName:
                    latestArt?.originalFileName ||
                    specs?.artworkFile?.originalFileName ||
                    specs?.artworkFile?.fileName ||
                    'artwork_final_v1.pdf',
                  version: `v${latestArt?.versionNumber || 1}`,
                  fileSize: latestArt?.fileSize
                    ? `${(Number(latestArt.fileSize) / (1024 * 1024)).toFixed(1)} MB`
                    : '3.2 MB',
                  fileUrl: artFileUrl,
                  storageKey: latestArt?.storageKey || specs?.artworkStorageKey || null,
                  mimeType: latestArt?.mimeType || specs?.artworkFile?.mimeType || (rawArtUrl?.match(/\.(jpeg|jpg|png|webp|gif|svg)(\?.*)?$/i) ? 'image/png' : 'application/pdf'),
                  qualityStatus: latestArt?.qualityStatus || 'PASSED',
                  sizeValid: true,
                  sizeDisplay: specs.dimensions || specs.size || 'Standard',
                }
              : null,
            priority: bo.priority || 'NORMAL',
            dueDate: formatDate(bo.promisedDeliveryDate || bo.createdAt),
            dueDaysLeft: 5,
            isUrgent: bo.priority === 'URGENT',
            assignedDesigner: designAssignee,
            assignedOperator: prodAssignee,
            isDesignCompleted,
            status: bo.status,
          };
        });

        setOrders(mapped);
      } else {
        setOrders([]);
      }

      // Update rosters if returned (strictly filtered by their respective role)
      if (Array.isArray(resDesigners) && resDesigners.length > 0) {
        const onlyDesigners = resDesigners.filter(
          (d: any) => !d.role || d.role === 'DESIGNER_PREPRESS'
        );
        const dMapped: StaffAssignee[] = onlyDesigners.map((d: any, idx: number) => ({
          id: d.id,
          fullName: d.fullName,
          email: d.email,
          role: 'DESIGNER_PREPRESS',
          status: d.activeAssignments > 6 ? 'BUSY' : 'AVAILABLE',
          activeJobs: d.activeAssignments ?? 2,
          skills: idx === 0 ? ['Branding', 'Print Design'] : ['Branding', 'Packaging'],
          recommended: idx === 0,
        }));
        if (dMapped.length > 0) setDesigners(dMapped);
      }

      if (Array.isArray(resOperators) && resOperators.length > 0) {
        const onlyOperators = resOperators.filter(
          (o: any) => !o.role || o.role === 'PRODUCTION_OPERATOR'
        );
        const oMapped: StaffAssignee[] = onlyOperators.map((o: any, idx: number) => ({
          id: o.id,
          fullName: o.fullName,
          email: o.email,
          role: 'PRODUCTION_OPERATOR',
          status: (o.activeJobCards || o.activeAssignments || 0) > 6 ? 'BUSY' : 'AVAILABLE',
          activeJobs: o.activeJobCards || o.activeAssignments || 1,
          skills: idx === 0 ? ['Digital Press', 'Business Cards', 'Commercial Print'] : ['Offset Press', 'Brochures'],
          recommended: idx === 0,
        }));
        if (oMapped.length > 0) setOperators(oMapped);
      }
    } catch (err) {
      console.error('Failed to sync OE Assignment Center data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    subscribeToOperations();
  }, [loadData, subscribeToOperations]);

  // Real-time WebSocket live updates
  useEffect(() => {
    if (lastEvent) {
      const orderNum = lastEvent.data?.orderNumber || lastEvent.data?.orderId || 'Order';
      let msg = `⚡ Live Update: ${lastEvent.name}`;
      if (lastEvent.name === 'order:created') msg = `🆕 New Order Intake: #${orderNum}`;
      if (lastEvent.name === 'order:updated') msg = `🔄 Order Updated: #${orderNum}`;
      if (lastEvent.name === 'order:assigned') msg = `👤 Operator/Designer Assigned: #${orderNum}`;

      setLiveToast(msg);
      loadData();
      const timer = setTimeout(() => setLiveToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastEvent, loadData]);

  // ─── KPI METRICS CALCULATION ───────────────────────────────────────────────

  const kpiMetrics = useMemo(() => {
    const total = orders.length;
    // Needs Action: orders where either Designer or Production Operator is unassigned
    const needsAction = orders.filter((o) => !o.assignedDesigner || !o.assignedOperator).length;
    // Design Required: orders without designer or with design required artwork state
    const designReq = orders.filter((o) => !o.assignedDesigner && (o.artworkState === 'DESIGN_REQUIRED' || o.artworkState === 'NOT_READY')).length;
    // Ready for Production: artwork ready but operator not assigned
    const readyProd = orders.filter((o) => !o.assignedOperator && o.artworkState === 'READY').length;
    // In Progress: active with either designer or operator
    const inProgress = orders.filter((o) => (o.assignedDesigner || o.assignedOperator) && !['DELIVERED', 'CANCELLED', 'ON_HOLD'].includes(o.status)).length;
    // Blocked: ON_HOLD or blocked
    const blocked = orders.filter((o) => o.artworkState === 'BLOCKED' || o.status === 'ON_HOLD').length;

    return {
      needsAction,
      designRequired: designReq,
      readyForProduction: readyProd,
      inProgress,
      blocked,
      totalOrders: total,
    };
  }, [orders]);

  // ─── FILTERED ORDERS LIST ──────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      if (activeTab === 'NEEDS_ACTION') {
        if (o.assignedDesigner && o.assignedOperator) return false;
      } else if (activeTab === 'DESIGN_REQUIRED') {
        if (o.artworkState !== 'DESIGN_REQUIRED' && o.artworkState !== 'NOT_READY' && o.assignedDesigner) return false;
      } else if (activeTab === 'READY_FOR_PRODUCTION') {
        if (o.artworkState !== 'READY') return false;
      } else if (activeTab === 'IN_PROGRESS') {
        if (!o.assignedDesigner && !o.assignedOperator && !['PRINTING', 'FINISHING', 'QUALITY_CHECK'].includes(o.status)) return false;
      } else if (activeTab === 'BLOCKED') {
        if (o.artworkState !== 'BLOCKED' && o.status !== 'ON_HOLD') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.productName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Priority Filter
      if (priorityFilter !== 'ALL' && o.priority !== priorityFilter) return false;

      // Customer Filter
      if (customerFilter !== 'ALL' && o.customerName !== customerFilter) return false;

      // Product Filter
      if (productFilter !== 'ALL' && o.productName !== productFilter) return false;

      return true;
    });
  }, [orders, activeTab, searchQuery, priorityFilter, customerFilter, productFilter]);

  // ─── DRAWER OPEN HANDLER ───────────────────────────────────────────────────

  const handleOpenDrawer = (order: any, type: 'DESIGN' | 'PRODUCTION') => {
    // Immediate Step Validation: If artwork is not approved, force DESIGN assignment
    if (type === 'PRODUCTION' && order.artworkState !== 'READY') {
      setLiveToast('⚠️ Artwork is not approved yet. Assign a Prepress Designer first.');
      type = 'DESIGN';
    }

    setDrawerOrder(order);
    setDrawerType(type);
    setStaffSearch('');
    setAssignmentNotes('');

    const staffList = type === 'DESIGN' ? designers : operators;
    const currentAssignedId =
      type === 'DESIGN'
        ? order.assignedDesigner?.id
        : order.assignedOperator?.id;

    const matchedStaff = currentAssignedId ? staffList.find((s) => s.id === currentAssignedId) : null;
    const rec = matchedStaff || staffList.find((s) => s.recommended) || staffList[0];
    setSelectedStaffId(rec?.id || '');
    setDrawerOpen(true);
  };

  // ─── ARTWORK VIEWER HANDLER ────────────────────────────────────────────────
  const handleOpenArtwork = (order: any) => {
    if (!order) return;
    const art = order.artworkFile;
    const resolvedUrl = resolveArtworkUrl(
      art?.fileUrl ||
      art?.storageKey ||
      order.specs?.artworkUrl ||
      order.specs?.artworkFile?.fileUrl ||
      order.specs?.artworkFile?.storageKey ||
      null
    );

    setViewingArtwork({
      orderNumber: order.orderNumber,
      productName: order.productName,
      customerName: order.customerName,
      fileName: art?.fileName || `${order.orderNumber}_Production_Artwork_v1.pdf`,
      version: art?.version || 'v1',
      fileSize: art?.fileSize || '3.2 MB',
      fileUrl: resolvedUrl,
      storageKey: art?.storageKey || null,
      mimeType:
        art?.mimeType ||
        (resolvedUrl?.match(/\.(jpeg|jpg|png|webp|gif|svg)(\?.*)?$/i)
          ? 'image/png'
          : 'application/pdf'),
      dimensions: art?.sizeDisplay || order.specs?.dimensions || 'Standard Press Dimensions',
      qualityStatus: art?.qualityStatus || 'PASSED',
    });
    setArtworkImageError(false);
    setArtworkModalOpen(true);
  };

  // ─── CANDIDATE ARTWORKS REVIEW & APPROVAL HANDLERS ─────────────────────────
  const handleOpenCandidateReviewModal = (order: any) => {
    if (!order) return;
    setCandidateOrder(order);
    const approved = order.candidateArtworks?.find((v: any) => v.isApproved);
    setSelectedCandidateId(approved?.id || order.candidateArtworks?.[0]?.id || null);
    setOeReviewNotes('');
    setOeCorrectionNotes('');
    setShowCorrectionInput(false);

    // Pre-select current operator or recommended operator
    const currentOpId = order.assignedOperator?.id;
    const recOp = operators.find((o) => o.recommended) || operators[0];
    setSelectedModalOperatorId(currentOpId || recOp?.id || '');

    setCandidateModalOpen(true);
  };

  const handleApproveCandidateWork = async () => {
    if (!candidateOrder || !selectedCandidateId) {
      setLiveToast('Please select a candidate artwork to confirm.');
      return;
    }
    setIsApprovingCandidate(true);
    try {
      const orderItemId = candidateOrder.orderItemId || candidateOrder.id;
      // 1. Authoritative Artwork confirmation
      await api.confirmArtworkWork({
        orderItemId,
        artworkVersionId: selectedCandidateId,
        oeNotes: oeReviewNotes || 'Confirmed by Operations Manager for production',
      });

      // 2. Direct Operator Assignment if selected in modal
      let assignedOpName = '';
      if (selectedModalOperatorId && selectedModalOperatorId !== 'LATER') {
        const op = operators.find((o) => o.id === selectedModalOperatorId);
        assignedOpName = op?.fullName || 'Production Operator';
        await api.assignProductionOperator(candidateOrder.id, {
          operatorId: selectedModalOperatorId,
          reason: oeReviewNotes || `Assigned Production Operator during Artwork Sign-off`,
        });
      }

      if (assignedOpName) {
        setLiveToast(`✓ Artwork confirmed & assigned to Operator ${assignedOpName} (#${candidateOrder.orderNumber})! Moved to Production Queue.`);
      } else {
        setLiveToast(`✓ Authoritative work confirmed for Order #${candidateOrder.orderNumber}! Moved to Production Queue.`);
      }

      setCandidateModalOpen(false);
      await loadData();

      // If operator assignment was skipped, open assignment drawer so it's not forgotten
      if (!selectedModalOperatorId || selectedModalOperatorId === 'LATER') {
        handleOpenDrawer({ ...candidateOrder, artworkState: 'READY' }, 'PRODUCTION');
      }
    } catch (err: any) {
      setLiveToast(`⚠️ Failed to approve artwork: ${err.message || 'Server error'}`);
    } finally {
      setIsApprovingCandidate(false);
    }
  };

  const handleReturnToDesignerFromOperations = async () => {
    if (!candidateOrder) return;
    if (!oeCorrectionNotes.trim()) {
      setLiveToast('Please enter correction directives for the designer.');
      return;
    }
    setIsReturningToDesigner(true);
    try {
      const orderItemId = candidateOrder.orderItemId || candidateOrder.id;
      await api.returnArtworkToDesigner({
        orderItemId,
        revisionFeedback: oeCorrectionNotes.trim(),
      });

      setLiveToast(`✓ Order #${candidateOrder.orderNumber} returned to designer for corrections.`);
      setCandidateModalOpen(false);
      setShowCorrectionInput(false);
      setOeCorrectionNotes('');
      await loadData();
    } catch (err: any) {
      setLiveToast(`⚠️ Failed to return to designer: ${err.message || 'Server error'}`);
    } finally {
      setIsReturningToDesigner(false);
    }
  };

  // ─── EXECUTE ASSIGNMENT ────────────────────────────────────────────────────

  const handleConfirmAssignment = async () => {
    if (!drawerOrder || !selectedStaffId) return;

    if (drawerType === 'PRODUCTION' && drawerOrder.artworkState !== 'READY') {
      alert('Cannot assign Production Operator: Artwork is still pending approval. The immediate next task is Prepress Design.');
      return;
    }

    setIsSubmitting(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('pb2_token') : null;
    if (!token || !isAuthenticated) {
      alert(
        'Authentication Required:\n\n' +
        'You are not currently authenticated as an Operations Coordinator.\n\n' +
        'Please sign in with your Operations account:\n' +
        'Email: operations@printbazzar.com\n' +
        'Password: Admin@12345'
      );
      router.push('/login?returnTo=/operations/orders');
      setIsSubmitting(false);
      return;
    }

    const staffList = drawerType === 'DESIGN' ? designers : operators;
    const chosenStaff = staffList.find((s) => s.id === selectedStaffId);
    const staffName = chosenStaff?.fullName || 'Assigned Staff';

    try {
      if (drawerType === 'DESIGN') {
        await api.assignDesigner(drawerOrder.id, {
          designerId: selectedStaffId,
          reason: assignmentNotes || `Prepress Designer assignment by Operations Coordinator`,
        });
      } else {
        await api.assignProductionOperator(drawerOrder.id, {
          operatorId: selectedStaffId,
          reason: assignmentNotes || `Production Operator assignment by Operations Coordinator`,
        });
      }

      // Optimistic local state update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === drawerOrder.id
            ? {
                ...o,
                assignedDesigner: drawerType === 'DESIGN' && chosenStaff ? chosenStaff : o.assignedDesigner,
                assignedOperator: drawerType === 'PRODUCTION' && chosenStaff ? chosenStaff : o.assignedOperator,
                status:
                  drawerType === 'DESIGN'
                    ? 'DESIGN_REQUIRED'
                    : 'PRODUCTION_QUEUE',
              }
            : o
        )
      );

      setLiveToast(
        drawerType === 'DESIGN'
          ? `🎨 Assigned Prepress Designer: ${staffName} (#${drawerOrder.orderNumber})`
          : `🖨️ Assigned Production Operator: ${staffName} (#${drawerOrder.orderNumber})`
      );
      setDrawerOpen(false);
      setDrawerOrder(null);
      await loadData();
    } catch (err: any) {
      console.error('Assignment error:', err);
      const isAuthErr =
        err.message?.includes('Authentication') ||
        err.message?.includes('Unauthorized') ||
        err.message?.includes('jwt') ||
        err.message?.includes('not authorized') ||
        err.message?.includes('401') ||
        err.message?.includes('403');
      if (isAuthErr) {
        alert(
          'Authentication Required:\n\n' +
          'Your operational session is missing, expired, or unauthorized.\n\n' +
          'Please sign in as an Operations Coordinator:\n' +
          'Email: operations@printbazzar.com\n' +
          'Password: Admin@12345'
        );
        router.push('/login?returnTo=/operations/orders');
      } else {
        alert(err.message || 'Failed to complete operational assignment.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── BULK ASSIGNMENT EXECUTION ─────────────────────────────────────────────

  const handleBulkExecute = async (type: 'DESIGN' | 'PRODUCTION') => {
    if (selectedOrderIds.length === 0) return;
    const firstSelected = orders.find((o) => selectedOrderIds.includes(o.id));
    if (firstSelected) {
      handleOpenDrawer(firstSelected, type);
    }
  };

  // ─── CHECKBOX TOGGLES ──────────────────────────────────────────────────────

  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Active selected staff object for dynamic button label
  const activeSelectedStaff = useMemo(() => {
    const list = drawerType === 'DESIGN' ? designers : operators;
    return list.find((s) => s.id === selectedStaffId);
  }, [drawerType, designers, operators, selectedStaffId]);

  // ─── THUMBNAIL RENDERER ────────────────────────────────────────────────────

  const renderThumbnail = (type: string) => {
    switch (type) {
      case 'cards':
        return (
          <div className="h-11 w-11 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] shadow-xs shrink-0 border border-slate-700">
            <span className="text-[#FFED00]">PB</span>
          </div>
        );
      case 'brochure':
        return (
          <div className="h-11 w-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
            <RiFilePdfLine className="h-5 w-5" />
          </div>
        );
      case 'box':
        return (
          <div className="h-11 w-11 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <RiBox3Line className="h-5 w-5" />
          </div>
        );
      case 'flyer':
        return (
          <div className="h-11 w-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
            <RiFileTextLine className="h-5 w-5" />
          </div>
        );
      case 'poster':
        return (
          <div className="h-11 w-11 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
            <RiPaletteLine className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className="h-11 w-11 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
            <RiFileListLine className="h-5 w-5" />
          </div>
        );
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] pb-16 font-sans text-slate-900 select-none">
      {/* ─── LIVE WEBSOCKET TOAST BANNER ─────────────────────────────────── */}
      {liveToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-[92vw] sm:max-w-lg bg-slate-950 text-white text-xs font-mono font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-slate-700/80 animate-in fade-in slide-in-from-top-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="truncate">{liveToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setLiveToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors font-sans text-sm leading-none shrink-0 cursor-pointer"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <div className="mx-auto max-w-[1440px] space-y-5">
        {/* ─── 1. PAGE TITLE & BREADCRUMB HEADER ──────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>OPERATIONS COORDINATION COMMAND</span>
            </div>
            <h1 className="text-[26px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-none font-sans flex items-center gap-2.5">
              <span>Order Assignment Center</span>
            </h1>
            <p className="text-[13px] text-slate-500 mt-1.5 font-normal">
              Operations Coordinator workflow: Assign Prepress Designer or Assign Production Operator directly based on operational requirements.
            </p>
          </div>

          {/* Right Date / Time Card */}
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200/90 px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-2.5 text-xs text-slate-700">
              <RiCalendarLine className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <div className="font-bold font-sans text-slate-900 text-[12px] leading-tight">
                  {currentDateFormatted.dateStr}
                </div>
                <div className="text-[11px] font-mono text-slate-400 leading-tight">
                  {currentDateFormatted.timeStr}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              isLoading={isLoading}
              className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 h-[38px]"
            >
              <RiRefreshLine className="h-4 w-4 mr-1" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* ─── 2. KPI SUMMARY ROW (6 Horizontal Cards) ────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Needs Action (EMPHASIZED) */}
          <div
            onClick={() => setActiveTab('NEEDS_ACTION')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'NEEDS_ACTION'
                ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <RiFileListCheckIcon className="h-4 w-4" />
              </div>
              <span className="text-[24px] font-black font-sans text-slate-900 leading-none">
                {kpiMetrics.needsAction}
              </span>
            </div>
            <div className="text-[12px] font-bold text-slate-800 tracking-tight">Needs Action</div>
          </div>

          {/* Card 2: Design Required */}
          <div
            onClick={() => setActiveTab('DESIGN_REQUIRED')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'DESIGN_REQUIRED'
                ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <RiPaletteLine className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-[24px] font-bold font-sans text-slate-900 leading-none">
                {kpiMetrics.designRequired}
              </span>
            </div>
            <div className="text-[12px] font-semibold text-slate-600 tracking-tight">Design Required</div>
          </div>

          {/* Card 3: Ready for Production */}
          <div
            onClick={() => setActiveTab('READY_FOR_PRODUCTION')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'READY_FOR_PRODUCTION'
                ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <RiSettings4Line className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-[24px] font-bold font-sans text-slate-900 leading-none">
                {kpiMetrics.readyForProduction}
              </span>
            </div>
            <div className="text-[12px] font-semibold text-slate-600 tracking-tight">Ready for Production</div>
          </div>

          {/* Card 4: In Progress */}
          <div
            onClick={() => setActiveTab('IN_PROGRESS')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'IN_PROGRESS'
                ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <RiTimeLine className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-[24px] font-bold font-sans text-slate-900 leading-none">
                {kpiMetrics.inProgress}
              </span>
            </div>
            <div className="text-[12px] font-semibold text-slate-600 tracking-tight">In Progress</div>
          </div>

          {/* Card 5: Blocked / On Hold */}
          <div
            onClick={() => setActiveTab('BLOCKED')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'BLOCKED'
                ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <div className="p-1.5 bg-amber-50 rounded-lg">
                <RiAlertLine className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-[24px] font-bold font-sans text-slate-900 leading-none">
                {kpiMetrics.blocked}
              </span>
            </div>
            <div className="text-[12px] font-semibold text-slate-600 tracking-tight">Blocked / On Hold</div>
          </div>

          {/* Card 6: Total Operational Orders */}
          <div
            onClick={() => setActiveTab('ALL')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'ALL'
                ? 'bg-slate-100 border-slate-400'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <div className="p-1.5 bg-slate-50 rounded-lg">
                <RiFileListLine className="h-4 w-4 text-slate-500" />
              </div>
              <span className="text-[24px] font-bold font-sans text-slate-900 leading-none">
                {kpiMetrics.totalOrders}
              </span>
            </div>
            <div className="text-[12px] font-semibold text-slate-600 tracking-tight">Total Operational Orders</div>
          </div>
        </div>

        {/* ─── 3. PRIMARY QUEUE FILTER TABS ───────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('NEEDS_ACTION')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'NEEDS_ACTION'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Needs Action ({kpiMetrics.needsAction})
          </button>
          <button
            onClick={() => setActiveTab('DESIGN_REQUIRED')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'DESIGN_REQUIRED'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Design Required ({kpiMetrics.designRequired})
          </button>
          <button
            onClick={() => setActiveTab('READY_FOR_PRODUCTION')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'READY_FOR_PRODUCTION'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Ready for Production ({kpiMetrics.readyForProduction})
          </button>
          <button
            onClick={() => setActiveTab('IN_PROGRESS')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'IN_PROGRESS'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            In Progress ({kpiMetrics.inProgress})
          </button>
          <button
            onClick={() => setActiveTab('BLOCKED')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'BLOCKED'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Blocked ({kpiMetrics.blocked})
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'ALL'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            All Orders ({kpiMetrics.totalOrders})
          </button>
        </div>

        {/* ─── 4. FILTER TOOLBAR ──────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative min-w-[220px] max-w-[280px]">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#FFED00]"
              />
            </div>

            {/* Dropdown: Customers */}
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
            >
              <option value="ALL">All Customers</option>
              {Array.from(new Set(orders.map((o) => o.customerName).filter(Boolean))).map((cName) => (
                <option key={cName as string} value={cName as string}>{cName as string}</option>
              ))}
            </select>

            {/* Dropdown: Products */}
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
            >
              <option value="ALL">All Products</option>
              {Array.from(new Set(orders.map((o) => o.productName).filter(Boolean))).map((pName) => (
                <option key={pName as string} value={pName as string}>{pName as string}</option>
              ))}
            </select>

            {/* Dropdown: Priorities */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">URGENT</option>
              <option value="HIGH">HIGH</option>
              <option value="NORMAL">NORMAL</option>
              <option value="LOW">LOW</option>
            </select>

            {/* Dropdown: SLA */}
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
            >
              <option value="ALL">SLA (All)</option>
              <option value="ON_TIME">On Schedule</option>
              <option value="DUE_SOON">Due Soon (≤ 48h)</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          {/* View Mode Toggle: Card View vs Table View */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'card'
                  ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RiLayoutGridLine className="h-3.5 w-3.5" />
              <span>Card View</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RiListCheck2 className="h-3.5 w-3.5" />
              <span>Table View</span>
            </button>
          </div>
        </div>

        {/* ─── 5. BULK ASSIGNMENT FLOATING BAR ────────────────────────────── */}
        {selectedOrderIds.length > 0 && (
          <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs font-semibold animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="bg-[#FFED00] text-slate-950 font-black px-2 py-0.5 rounded text-[11px]">
                {selectedOrderIds.length} ORDERS SELECTED
              </span>
              <span className="text-slate-300">
                Operations Coordinator Bulk Dispatch
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleBulkExecute('DESIGN')}
                className="bg-amber-600 hover:bg-amber-700 text-white border-none font-bold cursor-pointer"
              >
                <RiPaletteLine className="h-3.5 w-3.5 mr-1" />
                <span>Bulk Assign Designer</span>
              </Button>
              <Button
                variant="primary"
                size="xs"
                onClick={() => handleBulkExecute('PRODUCTION')}
                className="bg-blue-600 hover:bg-blue-700 text-white border-none font-bold cursor-pointer"
              >
                <RiPrinterLine className="h-3.5 w-3.5 mr-1" />
                <span>Bulk Assign Production</span>
              </Button>
              <button
                onClick={() => setSelectedOrderIds([])}
                className="text-slate-400 hover:text-white text-xs underline ml-2 cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* ─── 6. MAIN ORDER QUEUE: COMPACT HORIZONTAL CARDS ───────────────── */}
        {viewMode === 'card' ? (
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400">
                <RiFileListLine className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No operational orders found.</p>
                <p className="text-slate-400 mt-0.5">Try clearing filters or switching tabs.</p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isChecked = selectedOrderIds.includes(order.id);
                const isArtReady = order.artworkState === 'READY';

                return (
                  <div
                    key={order.id}
                    className={`bg-white border rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4 ${
                      isChecked ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200/90'
                    }`}
                  >
                    {/* Left: Checkbox + Product Thumbnail + Order Info */}
                    <div className="flex items-center gap-3.5 min-w-[280px]">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelectOrder(order.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-[#FFED00] cursor-pointer shrink-0"
                      />

                      {renderThumbnail(order.thumbnailType)}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/operations/orders/${order.id}`}
                            className="font-bold text-[14px] text-slate-900 hover:text-blue-600 hover:underline leading-tight tracking-tight font-sans"
                          >
                            #{order.orderNumber}
                          </Link>
                          {order.priority === 'URGENT' && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border border-red-200">
                              URGENT
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-[13px] text-slate-800 leading-tight mt-0.5">
                          {order.customerName}
                        </div>
                        <div className="text-[12px] text-slate-500 font-medium leading-tight">
                          {order.productName}
                        </div>
                        {/* Specs Line */}
                        <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                          <span>{order.specs.quantity.toLocaleString()} pcs</span>
                          <span>•</span>
                          <span>{order.specs.dimensions}</span>
                          <span>•</span>
                          <span>{order.specs.substrate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Column: Artwork Status & Proof Preview */}
                    <div className="min-w-[200px] xl:max-w-[240px]">
                      {isArtReady ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            ARTWORK READY
                          </span>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                            <RiFilePdfLine className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span className="font-mono text-[11px] text-slate-800 truncate max-w-[130px]">
                              {order.artworkFile?.fileName}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleOpenArtwork(order)}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RiEyeLine className="h-3 w-3" />
                              <span>Inspect Proof</span>
                            </button>
                            {order.candidateArtworks && order.candidateArtworks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleOpenCandidateReviewModal(order)}
                                className="text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                title="Click to view and switch between multiple candidate artworks"
                              >
                                <RiShieldCheckLine className="h-3 w-3 text-amber-600" />
                                <span>Select Work ({order.candidateArtworks.length})</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (order.candidateArtworks && order.candidateArtworks.length > 0) || order.artworkState === 'NEEDS_OE_CONFIRMATION' || order.status === 'ARTWORK_REVIEW' ? (
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                              </span>
                              <span>{order.candidateArtworks?.length || 1} Candidate Work(s)</span>
                            </span>
                          </div>
                          <div className="mt-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCandidateReviewModal(order)}
                              className="text-[11px] font-bold text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-400 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                            >
                              <RiShieldCheckLine className="h-3.5 w-3.5 text-amber-800" />
                              <span>Select & Approve Work →</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {order.artworkState === 'DESIGN_REQUIRED' ? 'DESIGN REQUIRED' : 'ARTWORK PENDING'}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[200px]">
                            {order.artworkMessage}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* SLA Column */}
                    <div className="min-w-[110px]">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                        Promised Due
                      </span>
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1 mt-0.5 font-mono">
                        <RiCalendarLine className="h-3.5 w-3.5 text-slate-400" />
                        <span>{order.dueDate}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                        {order.priority} Priority
                      </span>
                    </div>

                    {/* Right: Operational Assignments (Prepress Design & Production Operator) */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-end min-w-[340px] bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
                      {/* 1. Prepress Designer Allocation */}
                      <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs min-w-[150px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`h-7 w-7 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              order.assignedDesigner
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <RiPaletteLine className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 pr-1 text-left">
                            <div className="text-[9px] font-mono text-slate-400 font-bold uppercase leading-none">
                              Designer
                            </div>
                            <div className="text-xs font-bold text-slate-800 truncate max-w-[85px] leading-tight mt-0.5">
                              {order.assignedDesigner ? (
                                order.assignedDesigner.fullName
                              ) : (
                                <span className="text-slate-400 font-normal">None</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenDrawer(order, 'DESIGN')}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer shrink-0 ${
                            order.assignedDesigner
                              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                          }`}
                        >
                          {order.assignedDesigner ? 'Change' : 'Assign'}
                        </button>
                      </div>

                      {/* 2. Production Operator Allocation */}
                      <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs min-w-[150px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`h-7 w-7 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              order.assignedOperator
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <RiPrinterLine className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 pr-1 text-left">
                            <div className="text-[9px] font-mono text-slate-400 font-bold uppercase leading-none">
                              Operator
                            </div>
                            <div className="text-xs font-bold text-slate-800 truncate max-w-[85px] leading-tight mt-0.5">
                              {order.assignedOperator ? (
                                order.assignedOperator.fullName
                              ) : (
                                <span className="text-slate-400 font-normal">None</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {order.assignedOperator ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(order, 'PRODUCTION')}
                            className="px-2 py-1 rounded text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer shrink-0"
                          >
                            Change
                          </button>
                        ) : order.artworkState === 'READY' ? (
                          order.candidateArtworks && order.candidateArtworks.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCandidateReviewModal(order)}
                              className="px-2.5 py-1 rounded text-[10.5px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 shrink-0"
                              title="Multiple artworks uploaded. Select master artwork and assign operator."
                            >
                              <RiPrinterLine className="h-3 w-3" />
                              <span>Select & Assign</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDrawer(order, 'PRODUCTION')}
                              className="px-2.5 py-1 rounded text-[10.5px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 shrink-0"
                              title="Assign Production Operator for press floor execution"
                            >
                              <RiPrinterLine className="h-3 w-3" />
                              <span>Assign</span>
                            </button>
                          )
                        ) : (order.candidateArtworks && order.candidateArtworks.length > 0) || order.artworkState === 'NEEDS_OE_CONFIRMATION' || order.status === 'ARTWORK_REVIEW' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCandidateReviewModal(order)}
                            className="px-2.5 py-1 rounded text-[10.5px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 shrink-0"
                            title="Candidate works uploaded. Click to review and confirm."
                          >
                            <RiShieldCheckLine className="h-3 w-3" />
                            <span>Select Work</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setLiveToast('⚠️ Artwork must be approved before assigning Production Operator. Immediate task: Prepress Design.');
                              handleOpenDrawer(order, 'DESIGN');
                            }}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200 transition cursor-pointer shrink-0"
                            title="Artwork must be approved before assigning Operator"
                          >
                            Artwork Req
                          </button>
                        )}
                      </div>

                      {/* Three-Dot Menu */}
                      <Link
                        href={`/operations/orders/${order.id}`}
                        className="h-[34px] w-[34px] flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
                        title="Order Details & Operational Timeline"
                      >
                        <RiMoreFill className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ─── ALTERNATIVE TABLE VIEW ─────────────────────────────────────── */
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[960px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] bg-slate-50/70">
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={handleToggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">ORDER & CUSTOMER</th>
                  <th className="py-3 px-3">PRODUCT & SPECS</th>
                  <th className="py-3 px-3">ARTWORK STATUS</th>
                  <th className="py-3 px-3">DESIGNER (PREPRESS)</th>
                  <th className="py-3 px-3">OPERATOR (PRODUCTION)</th>
                  <th className="py-3 px-3">DUE DATE</th>
                  <th className="py-3 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredOrders.map((order) => {
                  const isChecked = selectedOrderIds.includes(order.id);
                  const isArtReady = order.artworkState === 'READY';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          href={`/operations/orders/${order.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 hover:underline font-mono"
                        >
                          #{order.orderNumber}
                        </Link>
                        <div className="font-semibold text-slate-800 text-[11px]">{order.customerName}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{order.productName}</div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {order.specs.quantity.toLocaleString()} pcs • {order.specs.dimensions}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {isArtReady ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleOpenArtwork(order)}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="Click to view artwork proof"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <RiEyeLine className="h-3 w-3 text-emerald-700" />
                              <span>READY</span>
                            </button>
                            {order.candidateArtworks && order.candidateArtworks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleOpenCandidateReviewModal(order)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                                title="Click to view and switch between multiple uploaded artworks"
                              >
                                <RiShieldCheckLine className="h-3 w-3 text-amber-600" />
                                <span>{order.candidateArtworks.length} Works</span>
                              </button>
                            )}
                          </div>
                        ) : (order.candidateArtworks && order.candidateArtworks.length > 0) || order.artworkState === 'NEEDS_OE_CONFIRMATION' || order.status === 'ARTWORK_REVIEW' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCandidateReviewModal(order)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10.5px] font-mono font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition shadow-2xs cursor-pointer group active:scale-95"
                            title="Candidate works uploaded by prepress designer. Click to review and select confirmed work."
                          >
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            <RiShieldCheckLine className="h-3.5 w-3.5 text-amber-700" />
                            <span>{order.candidateArtworks?.length > 1 ? `${order.candidateArtworks.length} Works` : 'OE Review'}</span>
                            <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded font-sans group-hover:bg-amber-300">
                              Select →
                            </span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {order.artworkState === 'DESIGN_REQUIRED' ? 'DESIGN REQ' : 'PENDING'}
                          </span>
                        )}
                      </td>
                      {/* Designer Cell */}
                      <td className="py-3 px-3">
                        {order.assignedDesigner ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold">
                              <RiPaletteLine className="h-3 w-3 text-amber-600" />
                              <span className="truncate max-w-[100px]">{order.assignedDesigner.fullName}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenDrawer(order, 'DESIGN')}
                              className="text-[10px] font-bold text-slate-500 hover:text-slate-900 underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        ) : order.isDesignCompleted || order.artworkState === 'NEEDS_OE_CONFIRMATION' || order.status === 'ARTWORK_REVIEW' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                            <RiPaletteLine className="h-3 w-3 text-emerald-600" />
                            <span>Work Uploaded</span>
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleOpenDrawer(order, 'DESIGN')}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold cursor-pointer"
                          >
                            + Assign Designer
                          </Button>
                        )}
                      </td>
                      {/* Operator Cell */}
                      <td className="py-3 px-3">
                        {order.assignedOperator ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-semibold">
                              <RiPrinterLine className="h-3 w-3 text-blue-600" />
                              <span className="truncate max-w-[100px]">{order.assignedOperator.fullName}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenDrawer(order, 'PRODUCTION')}
                              className="text-[10px] font-bold text-slate-500 hover:text-slate-900 underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        ) : order.artworkState === 'READY' ? (
                          order.candidateArtworks && order.candidateArtworks.length > 1 ? (
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => handleOpenCandidateReviewModal(order)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                              title="Multiple artworks uploaded. Select master artwork and assign operator."
                            >
                              + Select & Assign Operator
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => handleOpenDrawer(order, 'PRODUCTION')}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              + Assign Operator
                            </Button>
                          )
                        ) : (order.candidateArtworks && order.candidateArtworks.length > 0) || order.artworkState === 'NEEDS_OE_CONFIRMATION' || order.status === 'ARTWORK_REVIEW' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCandidateReviewModal(order)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-[10.5px] font-bold shadow-xs transition cursor-pointer active:scale-95"
                            title="Review candidate artworks uploaded by designer and confirm for production."
                          >
                            <RiShieldCheckLine className="h-3.5 w-3.5" />
                            <span>Select Work ({order.candidateArtworks?.length || 1})</span>
                            <RiArrowRightLine className="h-3 w-3" />
                          </button>
                        ) : (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setLiveToast('⚠️ Artwork must be approved before assigning Production Operator. Immediate task: Prepress Design.');
                              handleOpenDrawer(order, 'DESIGN');
                            }}
                            className="bg-slate-100 text-slate-400 border-slate-200 text-[10px] font-bold cursor-pointer hover:bg-slate-200"
                            title="Artwork must be approved first"
                          >
                            Locked (Artwork Req)
                          </Button>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {order.dueDate}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/operations/orders/${order.id}`}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition"
                          title="View Order Details"
                        >
                          <RiMoreFill className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 7. RIGHT-SIDE CONTEXTUAL ASSIGNMENT DRAWER ────────────────────── */}
      {drawerOpen && drawerOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmitting && setDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-[460px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200 select-none">
            {/* Drawer Top Header */}
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Operations Dispatch Control
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                        drawerType === 'DESIGN'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {drawerType === 'DESIGN' ? (
                        <>
                          <RiPaletteLine className="h-3 w-3 text-amber-600" />
                          <span>DESIGNER_PREPRESS</span>
                        </>
                      ) : (
                        <>
                          <RiPrinterLine className="h-3 w-3 text-blue-600" />
                          <span>PRODUCTION_OPERATOR</span>
                        </>
                      )}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-0.5">
                    {drawerType === 'DESIGN' ? 'Assign Prepress Designer' : 'Assign Production Operator'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => !isSubmitting && setDrawerOpen(false)}
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                >
                  <RiCloseLine className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              {/* Order Summary Mini-Card */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 flex items-start gap-3">
                {renderThumbnail(drawerOrder.thumbnailType)}
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 font-mono text-xs block">
                    #{drawerOrder.orderNumber}
                  </span>
                  <div className="font-bold text-slate-800 text-xs mt-0.5">
                    {drawerOrder.customerName}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {drawerOrder.productName}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    {drawerOrder.specs.quantity.toLocaleString()} pcs • {drawerOrder.specs.dimensions} • {drawerOrder.specs.substrate}
                  </div>
                </div>
              </div>

              {/* Current Status Overview Card (Role-Specific Only) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">
                    {drawerType === 'DESIGN' ? 'Currently Assigned Designer' : 'Currently Assigned Operator'}
                  </span>
                  <div className="font-bold text-slate-900 text-xs truncate mt-0.5">
                    {drawerType === 'DESIGN' ? (
                      drawerOrder.assignedDesigner ? (
                        drawerOrder.assignedDesigner.fullName
                      ) : (
                        <span className="text-slate-400 font-normal">Unassigned</span>
                      )
                    ) : drawerOrder.assignedOperator ? (
                      drawerOrder.assignedOperator.fullName
                    ) : (
                      <span className="text-slate-400 font-normal">Unassigned</span>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    drawerType === 'DESIGN'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}
                >
                  {drawerType === 'DESIGN' ? 'Designer Role Only' : 'Production Role Only'}
                </span>
              </div>

              {(!isAuthenticated || (currentUser?.role !== 'OPERATIONAL_MANAGER' && currentUser?.role !== 'ADMIN_MANAGER')) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold">
                    <RiAlertLine className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Operations Coordinator Login Required</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    You are currently {currentUser ? `signed in as ${currentUser.fullName} (${currentUser.role})` : 'not signed in'}. Assigning designers and operators requires an <strong>Operations Coordinator</strong> account.
                  </p>
                  <Link
                    href={`/login?returnTo=${encodeURIComponent('/operations/orders')}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                  >
                    <span>Sign In as Operations Coordinator (operations@printbazzar.com)</span>
                    <RiArrowRightLine className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {/* Staff Person Selector Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                    {drawerType === 'DESIGN' ? 'Select Prepress Designer' : 'Select Production Operator'}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {drawerType === 'DESIGN'
                      ? `${designers.filter((s) => s.role === 'DESIGNER_PREPRESS').length} Active Designers`
                      : `${operators.filter((s) => s.role === 'PRODUCTION_OPERATOR').length} Active Operators`}
                  </span>
                </div>

                {/* Staff Search Input */}
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
                    <input
                      type="text"
                      placeholder={drawerType === 'DESIGN' ? 'Search designer...' : 'Search operator...'}
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#FFED00]"
                    />
                  </div>
                  <button
                    type="button"
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    <RiFilter3Line className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Staff Cards List */}
                <div className="space-y-2">
                  {(drawerType === 'DESIGN'
                    ? designers.filter((s) => s.role === 'DESIGNER_PREPRESS')
                    : operators.filter((s) => s.role === 'PRODUCTION_OPERATOR')
                  )
                    .filter((s) => !staffSearch || s.fullName.toLowerCase().includes(staffSearch.toLowerCase()))
                    .map((staff) => {
                      const isSelected = selectedStaffId === staff.id;

                      return (
                        <div
                          key={staff.id}
                          onClick={() => setSelectedStaffId(staff.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? drawerType === 'DESIGN'
                                ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500 shadow-xs'
                                : 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Radio Circle */}
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? drawerType === 'DESIGN'
                                    ? 'border-amber-600 bg-amber-600'
                                    : 'border-blue-600 bg-blue-600'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>

                            {/* Avatar */}
                            <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {staff.fullName
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')}
                            </div>

                            {/* Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs truncate">
                                  {staff.fullName}
                                </span>
                                {staff.recommended && (
                                  <span className="text-[9px] font-mono font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded">
                                    RECOMMENDED
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    staff.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-red-500'
                                  }`}
                                />
                                <span className="capitalize">{staff.status.toLowerCase()}</span>
                                <span>•</span>
                                <span className="text-[9px] font-semibold uppercase text-slate-600">
                                  {staff.role === 'DESIGNER_PREPRESS' ? 'Designer' : 'Production'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Active Jobs + Skills */}
                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-mono font-bold text-slate-700 block">
                              {staff.activeJobs} active jobs
                            </span>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              {staff.skills.slice(0, 2).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Assignment Notes (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase font-bold text-slate-500">
                  Assignment Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    drawerType === 'DESIGN'
                      ? 'Add notes for the designer...'
                      : 'Add production press instructions...'
                  }
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#FFED00]"
                />
              </div>
            </div>

            {/* ─── STICKY FOOTER ─────────────────────────────────────────── */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => !isSubmitting && setDrawerOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAssignment}
                disabled={isSubmitting || !selectedStaffId}
                className="flex-1 py-2 px-4 rounded-lg bg-[#FFED00] hover:bg-[#F2DE00] text-slate-950 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 border border-[#E3A008]/40 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Saving Assignment...</span>
                ) : drawerType === 'DESIGN' ? (
                  <span>Assign Designer: {activeSelectedStaff?.fullName || 'Staff Member'}</span>
                ) : (
                  <span>Assign Operator: {activeSelectedStaff?.fullName || 'Staff Member'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. INTERACTIVE ARTWORK PROOF & ASSET VIEWER MODAL ───────────── */}
      {artworkModalOpen && viewingArtwork && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
          {/* Light Glass Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setArtworkModalOpen(false)}
          />

          {/* Main Modal Dialog Box (Light Home Brand Theme) */}
          <div className="relative w-full max-w-5xl max-h-[92vh] bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-10">
            {/* Header Bar */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-[#FFED00] text-slate-950 border border-[#E3A008]/40 flex items-center justify-center shrink-0 shadow-2xs">
                  <RiShieldCheckLine className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sm text-slate-950 bg-[#FFED00]/60 px-2 py-0.5 rounded border border-[#E3A008]/30">
                      #{viewingArtwork.orderNumber}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {viewingArtwork.productName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      PREFLIGHT PASSED
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-2 truncate">
                    <span>Customer: <strong className="text-slate-800">{viewingArtwork.customerName}</strong></span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-700 truncate">{viewingArtwork.fileName}</span>
                    <span className="bg-slate-200/80 text-slate-700 font-bold px-1.5 py-0.2 rounded text-[10px]">
                      {viewingArtwork.version}
                    </span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setArtworkModalOpen(false)}
                className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 flex items-center justify-center transition shrink-0 ml-4 cursor-pointer"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
              {/* Left Canvas Preview Area */}
              <div className="lg:col-span-8 bg-slate-50/70 p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-200 relative select-none">
                <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-md p-5 relative overflow-hidden group">
                  <div className="relative border-2 border-dashed border-rose-400 rounded-lg p-3 bg-slate-50 aspect-[4/3] flex flex-col items-center justify-center text-center overflow-hidden">
                    {viewingArtwork.fileUrl && !artworkImageError && (viewingArtwork.fileUrl.match(/\.(jpeg|jpg|png|webp|gif|svg)(\?.*)?$/i) || viewingArtwork.mimeType?.startsWith('image/')) ? (
                      <img
                        src={viewingArtwork.fileUrl}
                        alt="Customer Artwork Proof"
                        onError={() => setArtworkImageError(true)}
                        className="w-full h-full object-contain rounded bg-white shadow-2xs"
                      />
                    ) : (
                      <div className="space-y-3 p-4">
                        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                          <RiFilePdfLine className="h-8 w-8" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 font-mono">
                            {viewingArtwork.fileName}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-1">
                            PDF/X-1a:2001 • CMYK 300 DPI Prepress
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 pt-2">
                          <span className="h-3 w-6 rounded-xs bg-cyan-400" title="Cyan 100%" />
                          <span className="h-3 w-6 rounded-xs bg-fuchsia-500" title="Magenta 100%" />
                          <span className="h-3 w-6 rounded-xs bg-yellow-400" title="Yellow 100%" />
                          <span className="h-3 w-6 rounded-xs bg-slate-900 border border-slate-300" title="Key (Black) 100%" />
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-slate-600 bg-white/95 px-2.5 py-1 rounded shadow-xs border border-slate-200">
                      <span className="flex items-center gap-1 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Cut Margin (Trim Line)
                      </span>
                      <span className="flex items-center gap-1 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Safe Zone: +3.0mm
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <span className="text-[11px] font-mono text-slate-500">
                    Press Print-Ready Vector Proof • Verified against production template
                  </span>
                </div>
              </div>

              {/* Right Preflight Inspection Panel */}
              <div className="lg:col-span-4 p-6 bg-white flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#FFED00] border border-[#E3A008]" />
                      Preflight Specifications
                    </h3>
                    <div className="mt-3 space-y-2.5 font-mono text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Target Dimensions:</span>
                        <span className="text-slate-900 font-bold">{viewingArtwork.dimensions}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">File Format:</span>
                        <span className="text-slate-900 font-bold">{viewingArtwork.mimeType?.includes('pdf') ? 'PDF/X-1a (Press-Ready)' : (viewingArtwork.mimeType || 'PDF/X-1a')}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Resolution:</span>
                        <span className="text-emerald-700 font-bold">300 DPI (High Res)</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Color Profile:</span>
                        <span className="text-slate-900 font-bold">CMYK ISO Coated v2</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Bleed Margin:</span>
                        <span className="text-slate-900 font-bold">3.0 mm standard</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">File Size:</span>
                        <span className="text-slate-900 font-bold">{viewingArtwork.fileSize}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                      Automated Preflight Checks
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                        <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-[11px] font-semibold">All typography converted to outlines</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                        <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-[11px] font-semibold">Zero RGB color profiles detected</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                        <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-[11px] font-semibold">Cut line bleed margins aligned</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-200">
                  {viewingArtwork.fileUrl ? (
                    <a
                      href={viewingArtwork.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#FFED00] hover:bg-[#F2DE00] text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs border border-[#E3A008]/40"
                    >
                      <RiExternalLinkLine className="h-4 w-4" />
                      <span>Open High-Res Original</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => alert(`Opening preflight master asset for Order #${viewingArtwork.orderNumber}`)}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#FFED00] hover:bg-[#F2DE00] text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs border border-[#E3A008]/40 cursor-pointer"
                    >
                      <RiExternalLinkLine className="h-4 w-4" />
                      <span>Open Preflight Proof</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setArtworkModalOpen(false)}
                    className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition text-center border border-slate-200 cursor-pointer"
                  >
                    Close Viewer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CANDIDATE ARTWORKS REVIEW & OE CONFIRMATION MODAL ────────────────── */}
      {candidateModalOpen && candidateOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <RiShieldCheckLine className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black tracking-tight text-white font-display">
                      Candidate Artworks Review & OE Sign-Off
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      Order #{candidateOrder.orderNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {candidateOrder.customerName} • {candidateOrder.productName} ({candidateOrder.specs.quantity.toLocaleString()} pcs • {candidateOrder.specs.dimensions})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCandidateModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            {/* Instruction banner */}
            <div className="px-6 py-2.5 bg-amber-50/80 border-b border-amber-200/80 flex items-center justify-between text-xs text-amber-950 shrink-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-medium">
                  The Prepress Designer submitted <strong>{candidateOrder.candidateArtworks?.length || 1} candidate design work(s)</strong>. Select the confirmed master artwork to approve and move to production.
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                Role: Operations Manager
              </span>
            </div>

            {/* Scrollable Content: Candidate Cards Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {candidateOrder.candidateArtworks && candidateOrder.candidateArtworks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {candidateOrder.candidateArtworks.map((cand: any, idx: number) => {
                    const isSelected = selectedCandidateId === cand.id;
                    const resolvedUrl = resolveArtworkUrl(cand.proofUrl || cand.storageKey);
                    const formattedSize = cand.fileSize
                      ? `${(Number(cand.fileSize) / (1024 * 1024)).toFixed(1)} MB`
                      : 'High-Res Asset';

                    return (
                      <div
                        key={cand.id || idx}
                        onClick={() => setSelectedCandidateId(cand.id)}
                        className={`relative rounded-xl border-2 transition-all p-3.5 flex flex-col justify-between cursor-pointer group ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/40 shadow-md ring-2 ring-amber-400/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        {/* Top badges */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-black ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                            }`}
                          >
                            Option V{cand.versionNumber || idx + 1}
                          </span>
                          {cand.isApproved && (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              CURRENT APPROVED
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">
                            {cand.resolutionDpi ? `${cand.resolutionDpi} DPI` : '300 DPI'}
                          </span>
                        </div>

                        {/* Thumbnail Preview */}
                        <div className="relative aspect-4/3 w-full rounded-lg bg-slate-900 border border-slate-200 overflow-hidden flex items-center justify-center mb-3">
                          {resolvedUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={resolvedUrl}
                              alt={cand.originalFileName || `Artwork Option ${idx + 1}`}
                              className="h-full w-full object-contain group-hover:scale-105 transition duration-300"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="text-center p-4 text-slate-400">
                              <RiImageLine className="h-8 w-8 mx-auto mb-1 opacity-50" />
                              <span className="text-[10px] font-mono">No Preview</span>
                            </div>
                          )}
                          {resolvedUrl && (
                            <a
                              href={resolvedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shadow-sm"
                              title="Open original proof"
                            >
                              <RiExternalLinkLine className="h-3 w-3" />
                              <span>View</span>
                            </a>
                          )}
                        </div>

                        {/* File Details */}
                        <div className="space-y-1.5 text-xs">
                          <p
                            className="font-bold text-slate-900 truncate text-[11.5px]"
                            title={cand.originalFileName}
                          >
                            {cand.originalFileName || `Option_${idx + 1}_artwork.png`}
                          </p>
                          <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-500">
                            <span>{formattedSize}</span>
                            <span>{cand.status || 'READY'}</span>
                          </div>
                          {cand.prepressNotes && (
                            <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 italic line-clamp-2">
                              &ldquo;{cand.prepressNotes}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Radio selection indicator */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'border-amber-500 bg-amber-500'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <span
                              className={`text-[11px] font-bold ${
                                isSelected ? 'text-amber-950 font-black' : 'text-slate-500'
                              }`}
                            >
                              {isSelected ? 'Selected for Production' : 'Choose this work'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <RiAlertLine className="h-10 w-10 mx-auto text-amber-500 mb-2" />
                  <p className="font-bold text-sm text-slate-800">No candidate artworks found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    The designer has not uploaded candidate files yet.
                  </p>
                </div>
              )}

              {/* Step 2: Assign Production Operator directly */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RiPrinterLine className="h-4 w-4 text-blue-600" />
                    <label className="text-xs font-bold text-blue-950">
                      Step 2: Assign Production Operator for Machine Run
                    </label>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-300">
                    Press Floor Allocation
                  </span>
                </div>
                <p className="text-[11px] text-blue-900/80">
                  Select which press operator will receive and execute this print job immediately upon artwork approval.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {operators.map((op) => {
                    const isOpSelected = selectedModalOperatorId === op.id;
                    return (
                      <div
                        key={op.id}
                        onClick={() => setSelectedModalOperatorId(op.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isOpSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold truncate text-[11.5px] flex items-center gap-1.5">
                            <RiPrinterLine className={`h-3 w-3 ${isOpSelected ? 'text-white' : 'text-blue-600'}`} />
                            <span className="truncate">{op.fullName}</span>
                          </div>
                          <div className={`text-[10px] font-mono mt-0.5 ${isOpSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            {op.activeJobs} active job(s)
                          </div>
                        </div>
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isOpSelected
                              ? 'border-white bg-white text-blue-600'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isOpSelected && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedModalOperatorId('LATER')}
                    className={`font-semibold hover:underline cursor-pointer ${
                      selectedModalOperatorId === 'LATER'
                        ? 'text-blue-700 font-bold underline'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Skip & Assign Operator Later
                  </button>
                  {selectedModalOperatorId && selectedModalOperatorId !== 'LATER' && (
                    <span className="text-emerald-700 font-bold font-mono text-[10px] flex items-center gap-1">
                      <RiCheckLine className="h-3.5 w-3.5 text-emerald-600" />
                      <span>
                        Operator Assigned: {operators.find((o) => o.id === selectedModalOperatorId)?.fullName}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Step 3: Optional OE Production Sign-off Notes */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Step 3: Manager Sign-off / Print Operator Directive (Optional)
                </label>
                <input
                  type="text"
                  value={oeReviewNotes}
                  onChange={(e) => setOeReviewNotes(e.target.value)}
                  placeholder="e.g. Master artwork confirmed; ensure 350 GSM matte lamination and alignment on Roland TrueVIS."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
              </div>

              {/* Revision Directives Drawer (When returning to designer) */}
              {showCorrectionInput && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <RiAlertLine className="h-4 w-4 text-rose-600" />
                      Specific Directives for Prepress Designer:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCorrectionInput(false)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={oeCorrectionNotes}
                    onChange={(e) => setOeCorrectionNotes(e.target.value)}
                    placeholder="Describe needed corrections (e.g., Increase bleed margin by 3mm, change font color to Pantone 286C, upload vector version)..."
                    className="w-full text-xs p-3 rounded-lg border border-rose-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-slate-800"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCorrectionInput(false)}
                      className="text-xs font-bold"
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleReturnToDesignerFromOperations}
                      disabled={isReturningToDesigner || !oeCorrectionNotes.trim()}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                    >
                      {isReturningToDesigner ? 'Returning to Designer...' : 'Send Directives to Designer'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div>
                {!showCorrectionInput && (
                  <button
                    type="button"
                    onClick={() => setShowCorrectionInput(true)}
                    className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Need corrections? Return to Designer</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCandidateModalOpen(false)}
                  className="text-xs font-bold text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleApproveCandidateWork}
                  disabled={!selectedCandidateId || isApprovingCandidate}
                  className="bg-[#FFED00] hover:bg-[#F2DE00] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl border border-[#E3A008]/40 shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <RiCheckLine className="h-4 w-4" />
                  <span>
                    {isApprovingCandidate
                      ? 'Confirming Artwork & Assigning Operator...'
                      : selectedModalOperatorId && selectedModalOperatorId !== 'LATER'
                      ? `APPROVE WORK & ASSIGN TO ${operators.find((o) => o.id === selectedModalOperatorId)?.fullName?.toUpperCase() || 'OPERATOR'} →`
                      : 'APPROVE SELECTED WORK & MOVE TO PRODUCTION →'}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ICON HELPER ─────────────────────────────────────────────────────────────

function RiFileListCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path d="M19 22H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3zm-8.293-6.707 5-5-1.414-1.414L10 13.172l-2.293-2.293-1.414 1.414 3.707 3.707z" />
    </svg>
  );
}
