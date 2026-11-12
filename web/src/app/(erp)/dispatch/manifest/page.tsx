'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  Scale,
  Truck,
  Store,
  Barcode,
  CheckCircle2,
  AlertCircle,
  FileText,
  ScanLine,
  Search,
  RefreshCw,
  ExternalLink,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  CheckSquare,
  Square,
  Printer,
  Clock,
  ArrowUpRight,
  Sparkles,
  X,
  Bike,
  ClipboardCheck,
  Send,
  Eye,
  Hash,
  Link2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui';

type QueueTab = 'ALL' | 'READY_FOR_DISPATCH' | 'IN_TRANSIT' | 'STORE_PICKUP' | 'DELIVERED';

interface ManualChecksState {
  packageSealedAndLabeled: boolean;
  addressAndPincodeVerified: boolean;
  awbMatchedWithParcel: boolean;
  paymentClearanceVerified: boolean;
  podOrReceiverVerified: boolean;
}

const COURIER_PRESETS: Array<{
  name: string;
  urlTemplate: (awb: string) => string;
  prefix: string;
}> = [
  {
    name: 'Delhivery Express',
    prefix: 'DLV',
    urlTemplate: (awb) => `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`,
  },
  {
    name: 'BlueDart Apex',
    prefix: 'BDT',
    urlTemplate: (awb) => `https://www.bluedart.com/tracking?tracknumbers=${encodeURIComponent(awb)}`,
  },
  {
    name: 'DTDC Express',
    prefix: 'DTC',
    urlTemplate: (awb) => `https://www.dtdc.in/trace.asp?strCnno=${encodeURIComponent(awb)}`,
  },
  {
    name: 'Shiprocket Surface',
    prefix: 'SRK',
    urlTemplate: (awb) => `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`,
  },
  {
    name: 'India Post Speed Post',
    prefix: 'INP',
    urlTemplate: (awb) => `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignment=${encodeURIComponent(awb)}`,
  },
  {
    name: 'The Professional Couriers',
    prefix: 'TPC',
    urlTemplate: (awb) => `https://www.tpcindia.com/track.aspx?id=${encodeURIComponent(awb)}`,
  },
  {
    name: 'Porter / Local Express Bike',
    prefix: 'LOC',
    urlTemplate: (awb) => `https://porter.in/track/${encodeURIComponent(awb)}`,
  },
];

export default function DispatchStationPage() {
  const { user } = useAuth();

  // Queue & Filter State
  const [activeTab, setActiveTab] = useState<QueueTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickScanInput, setQuickScanInput] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    readyForDispatch: 0,
    inTransit: 0,
    storePickupReady: 0,
    delivered: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  // Modal 1: Manual Courier & Status Update Modal State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual Courier Form Fields
  const [deliveryMethod, setDeliveryMethod] = useState<'COURIER' | 'LOCAL_EXPRESS_BIKE' | 'STORE_PICKUP'>('COURIER');
  const [courierPreset, setCourierPreset] = useState('Delhivery Express');
  const [customCourierName, setCustomCourierName] = useState('');
  const [awbNumber, setAwbNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [manifestReference, setManifestReference] = useState('');
  const [packageCount, setPackageCount] = useState(1);
  const [grossWeightGrams, setGrossWeightGrams] = useState(850);
  const [lengthCm, setLengthCm] = useState(22);
  const [widthCm, setWidthCm] = useState(15);
  const [heightCm, setHeightCm] = useState(10);
  const [targetStatus, setTargetStatus] = useState<'READY_FOR_DISPATCH' | 'OUT_FOR_DELIVERY' | 'DELIVERED'>('OUT_FOR_DELIVERY');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [manualChecks, setManualChecks] = useState<ManualChecksState>({
    packageSealedAndLabeled: false,
    addressAndPincodeVerified: false,
    awbMatchedWithParcel: false,
    paymentClearanceVerified: false,
    podOrReceiverVerified: false,
  });

  // Modal 2: Store Pickup Modal State
  const [storePickupOrder, setStorePickupOrder] = useState<any | null>(null);
  const [collectorName, setCollectorName] = useState('');
  const [collectorPhone, setCollectorPhone] = useState('');
  const [pickupVerifiedCheck, setPickupVerifiedCheck] = useState(false);
  const [pickupNotes, setPickupNotes] = useState('');

  // Modal 3: Print Thermal Label / Manifest Slip Modal
  const [labelOrder, setLabelOrder] = useState<any | null>(null);

  const loadDispatchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getDispatchQueue({
        search: searchQuery.trim() || undefined,
        tab: activeTab === 'ALL' ? undefined : activeTab,
        limit: 100,
      });
      if (res) {
        setOrders(res.orders || []);
        if (res.kpis) {
          setKpis(res.kpis);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load dispatch manifest queue.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    loadDispatchQueue();
  }, [loadDispatchQueue]);

  // Open Manual Courier Update Modal & populate existing package/shipment data
  const openManualUpdateModal = (order: any, defaultTargetStatus?: 'READY_FOR_DISPATCH' | 'OUT_FOR_DELIVERY' | 'DELIVERED') => {
    setSelectedOrder(order);
    setErrorMessage('');

    const pkg = order.packages?.[0];
    const shipment = order.shipment || pkg?.shipment;

    const existingCourier = shipment?.courierName || 'Delhivery Express';
    const isPreset = COURIER_PRESETS.some((c) => c.name.toLowerCase() === existingCourier.toLowerCase());

    if (order.deliveryMethod === 'STORE_PICKUP') {
      setDeliveryMethod('STORE_PICKUP');
    } else if (existingCourier.toLowerCase().includes('bike') || existingCourier.toLowerCase().includes('porter')) {
      setDeliveryMethod('LOCAL_EXPRESS_BIKE');
    } else {
      setDeliveryMethod('COURIER');
    }

    if (isPreset) {
      const matched = COURIER_PRESETS.find((c) => c.name.toLowerCase() === existingCourier.toLowerCase());
      setCourierPreset(matched?.name || 'Delhivery Express');
      setCustomCourierName('');
    } else {
      setCourierPreset('CUSTOM');
      setCustomCourierName(existingCourier);
    }

    const initialAwb = shipment?.awbNumber || '';
    setAwbNumber(initialAwb);
    setTrackingUrl(shipment?.trackingUrl || '');

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    setManifestReference(`MNF-${todayStr}-${order.orderNumber.replace(/[^A-Z0-9]/gi, '').slice(-4)}`);

    setPackageCount(pkg?.totalPackages || order.packages?.length || 1);
    setGrossWeightGrams(order.totalGrossWeightGrams || pkg?.grossWeightGrams || 850);
    setLengthCm(Number(pkg?.lengthCm) || 22);
    setWidthCm(Number(pkg?.widthCm) || 15);
    setHeightCm(Number(pkg?.heightCm) || 10);

    // Determine sensible next target status
    if (defaultTargetStatus) {
      setTargetStatus(defaultTargetStatus);
    } else if (order.status === 'OUT_FOR_DELIVERY') {
      setTargetStatus('DELIVERED');
    } else if (order.status === 'READY_FOR_DISPATCH') {
      setTargetStatus('OUT_FOR_DELIVERY');
    } else {
      setTargetStatus('OUT_FOR_DELIVERY');
    }

    setReceiverName(order.shippingAddress?.recipientName || order.customer?.fullName || '');
    setReceiverPhone(order.shippingAddress?.phone || order.customer?.phone || '');
    setDispatchNotes('');

    const isPaid = Number(order.balanceAmount || 0) <= 0;
    setManualChecks({
      packageSealedAndLabeled: Boolean(pkg),
      addressAndPincodeVerified: Boolean(order.shippingAddress?.postalCode || order.deliveryMethod === 'STORE_PICKUP'),
      awbMatchedWithParcel: Boolean(initialAwb),
      paymentClearanceVerified: isPaid,
      podOrReceiverVerified: order.status === 'DELIVERED',
    });

    setIsUpdateModalOpen(true);
  };

  // Auto-generate AWB & Tracking URL helper
  const handleGenerateAwb = () => {
    const activeCourier = courierPreset === 'CUSTOM' ? customCourierName || 'EXP' : courierPreset;
    const preset = COURIER_PRESETS.find((c) => c.name === activeCourier);
    const prefix = preset?.prefix || activeCourier.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'AWB';
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randPart = Math.floor(100000 + Math.random() * 900000);
    const newAwb = `${prefix}${datePart}${randPart}`;
    setAwbNumber(newAwb);
    if (preset) {
      setTrackingUrl(preset.urlTemplate(newAwb));
    }
    setManualChecks((prev) => ({ ...prev, awbMatchedWithParcel: true }));
  };

  // Auto-fill tracking URL when courier or AWB changes
  const handleAutoFillTrackingUrl = () => {
    if (!awbNumber.trim()) return;
    const preset = COURIER_PRESETS.find((c) => c.name === courierPreset);
    if (preset) {
      setTrackingUrl(preset.urlTemplate(awbNumber.trim()));
    } else {
      setTrackingUrl(`https://www.google.com/search?q=${encodeURIComponent((customCourierName || 'courier') + ' tracking ' + awbNumber.trim())}`);
    }
  };

  const toggleAllManualChecks = (checked: boolean) => {
    setManualChecks({
      packageSealedAndLabeled: checked,
      addressAndPincodeVerified: checked,
      awbMatchedWithParcel: checked,
      paymentClearanceVerified: checked,
      podOrReceiverVerified: checked,
    });
  };

  const handleSaveManualCourierUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const resolvedCourierName =
      deliveryMethod === 'STORE_PICKUP'
        ? 'Store Counter Pickup'
        : courierPreset === 'CUSTOM'
        ? customCourierName.trim()
        : courierPreset;

    if (deliveryMethod !== 'STORE_PICKUP' && !resolvedCourierName) {
      setErrorMessage('Please select or enter a Courier Partner name.');
      return;
    }

    if (
      deliveryMethod !== 'STORE_PICKUP' &&
      (targetStatus === 'OUT_FOR_DELIVERY' || targetStatus === 'DELIVERED') &&
      !awbNumber.trim()
    ) {
      setErrorMessage('Please enter or generate an AWB / Tracking Number before dispatching.');
      return;
    }

    if (!manualChecks.packageSealedAndLabeled || !manualChecks.addressAndPincodeVerified) {
      setErrorMessage(
        'Please complete the mandatory Manual Verification Checks (Package Sealed & Address/PIN Verified) before updating.',
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const resolvedTrackingUrl =
        trackingUrl.trim() ||
        (awbNumber.trim() && COURIER_PRESETS.find((c) => c.name === courierPreset)
          ? COURIER_PRESETS.find((c) => c.name === courierPreset)!.urlTemplate(awbNumber.trim())
          : undefined);

      await api.manualCourierUpdate(selectedOrder.orderNumber, {
        deliveryMethod,
        courierName: resolvedCourierName,
        awbNumber: awbNumber.trim() || undefined,
        trackingUrl: resolvedTrackingUrl,
        manifestReference: manifestReference.trim() || undefined,
        packageCount,
        grossWeightGrams,
        lengthCm,
        widthCm,
        heightCm,
        targetStatus,
        receiverName: receiverName.trim() || undefined,
        receiverPhone: receiverPhone.trim() || undefined,
        dispatchNotes: dispatchNotes.trim() || undefined,
        manualChecks,
      });

      setFeedbackSuccess(
        `Order #${selectedOrder.orderNumber} updated to ${targetStatus.replace(/_/g, ' ')} (${resolvedCourierName}${
          awbNumber.trim() ? ` • AWB: ${awbNumber.trim()}` : ''
        }). Live on Customer Tracking!`,
      );
      setIsUpdateModalOpen(false);
      setSelectedOrder(null);
      await loadDispatchQueue();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update courier and dispatch status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Store Pickup Modal Handler
  const openStorePickupModal = (order: any) => {
    setStorePickupOrder(order);
    setCollectorName(order.customer?.fullName || order.shippingAddress?.recipientName || '');
    setCollectorPhone(order.customer?.phone || order.shippingAddress?.phone || '');
    setPickupVerifiedCheck(Number(order.balanceAmount || 0) <= 0);
    setPickupNotes('');
    setErrorMessage('');
  };

  const handleConfirmStorePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storePickupOrder) return;
    if (!collectorName.trim()) {
      setErrorMessage('Please enter the collector name for store counter handover.');
      return;
    }
    if (!pickupVerifiedCheck) {
      setErrorMessage('Please check the manual verification box confirming collector identity and zero balance.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await api.manualCourierUpdate(storePickupOrder.orderNumber, {
        deliveryMethod: 'STORE_PICKUP',
        courierName: 'Store Counter Pickup',
        targetStatus: 'DELIVERED',
        receiverName: collectorName.trim(),
        receiverPhone: collectorPhone.trim(),
        dispatchNotes:
          pickupNotes.trim() ||
          `Counter pickup completed. Handed over to ${collectorName.trim()} (${collectorPhone.trim() || 'Phone verified'}).`,
        manualChecks: {
          packageSealedAndLabeled: true,
          addressAndPincodeVerified: true,
          paymentClearanceVerified: true,
          podOrReceiverVerified: true,
        },
      });
      setFeedbackSuccess(
        `Store Counter Pickup confirmed for Order #${storePickupOrder.orderNumber}. Marked as DELIVERED to ${collectorName.trim()}.`,
      );
      setStorePickupOrder(null);
      await loadDispatchQueue();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Store pickup failed. Please ensure all balance payments are cleared.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Scan Lookup handler
  const handleQuickScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = quickScanInput.trim();
    if (!term) return;

    const matched = orders.find(
      (o) =>
        o.orderNumber.toLowerCase() === term.toLowerCase() ||
        o.packages?.some((p: any) => p.barcode?.toLowerCase() === term.toLowerCase()) ||
        o.shipment?.awbNumber?.toLowerCase() === term.toLowerCase(),
    );

    if (matched) {
      openManualUpdateModal(matched);
      setQuickScanInput('');
    } else {
      setSearchQuery(term);
      setQuickScanInput('');
    }
  };

  const checkedCount = Object.values(manualChecks).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase font-bold text-amber-900 bg-amber-100/80 border border-amber-300 px-2.5 py-0.5 rounded-md tracking-wider mb-1.5">
            <Truck className="h-3.5 w-3.5" />
            <span>LOGISTICS, MANIFEST & MANUAL COURIER CONTROL</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-tight">
            Dispatch Manifest & Manual Courier Tracking
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 mt-0.5">
            Manually verify packages, assign courier & AWB tracking numbers, and push live status updates to Customer Tracking.
          </p>
        </div>

        {/* Quick Barcode / Order Scan Bar */}
        <form onSubmit={handleQuickScanSubmit} className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <ScanLine className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={quickScanInput}
              onChange={(e) => setQuickScanInput(e.target.value)}
              placeholder="Scan Order #, Barcode or AWB..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-[#FFED00] font-semibold text-xs whitespace-nowrap transition flex items-center gap-1.5 shadow-xs"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>Manual Check / Update</span>
          </button>
        </form>
      </div>

      {/* Feedback Banners */}
      {errorMessage && (
        <div className="rounded-xl bg-rose-50 border border-rose-300 p-4 text-xs font-semibold text-rose-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-rose-600 hover:text-rose-900 font-bold ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {feedbackSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackSuccess('')}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('READY_FOR_DISPATCH')}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === 'READY_FOR_DISPATCH'
              ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase text-slate-500">Ready for Dispatch</span>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">{kpis.readyForDispatch}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Awaiting courier AWB or handover</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('IN_TRANSIT')}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === 'IN_TRANSIT'
              ? 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase text-slate-500">In Transit / Dispatched</span>
            <div className="p-2 rounded-lg bg-sky-100 text-sky-800">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">{kpis.inTransit}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Out with courier • Live tracking active</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('STORE_PICKUP')}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === 'STORE_PICKUP'
              ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase text-slate-500">Counter Store Pickup</span>
            <div className="p-2 rounded-lg bg-purple-100 text-purple-800">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">{kpis.storePickupReady}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Ready for customer counter collection</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DELIVERED')}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === 'DELIVERED'
              ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase text-slate-500">Delivered Orders</span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">{kpis.delivered}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">POD & customer delivery confirmed</p>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'All Dispatch Queue' },
              { id: 'READY_FOR_DISPATCH', label: `Ready to Dispatch (${kpis.readyForDispatch})` },
              { id: 'IN_TRANSIT', label: `Dispatched / In Transit (${kpis.inTransit})` },
              { id: 'STORE_PICKUP', label: `Store Pickup (${kpis.storePickupReady})` },
              { id: 'DELIVERED', label: `Delivered (${kpis.delivered})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as QueueTab)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-[#FFED00] shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order, customer, PIN, AWB..."
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={loadDispatchQueue}
              className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5"
              title="Refresh Queue"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Orders List / Table */}
        {isLoading ? (
          <div className="py-16 text-center space-y-2">
            <RefreshCw className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">Loading live dispatch & courier manifest queue...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <Package className="h-10 w-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">No orders found in this dispatch view</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Orders appear here once they reach Quality Check, Packing, Ready for Dispatch, Out for Delivery, or Delivered stages.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const pkg = order.packages?.[0];
              const shipment = order.shipment || pkg?.shipment;
              const isPaid = Number(order.balanceAmount || 0) <= 0;
              const isStorePickup = order.deliveryMethod === 'STORE_PICKUP';
              const latestHistory = order.statusHistory?.[0];

              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-slate-200 hover:border-slate-300 bg-white p-4 sm:p-5 transition shadow-2xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Order Info, Customer & Destination */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-black text-slate-900">
                          #{order.orderNumber}
                        </span>
                        <StatusBadge status={order.status} />
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isStorePickup
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-sky-50 text-sky-800 border-sky-200'
                          }`}
                        >
                          {isStorePickup ? 'STORE PICKUP' : 'COURIER DELIVERY'}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {isPaid
                            ? '✓ PAID IN FULL'
                            : `BALANCE DUE: ${formatCurrency(Number(order.balanceAmount || 0))}`}
                        </span>
                        {order.priority === 'URGENT' || order.priority === 'HIGH' ? (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            {order.priority} PRIORITY
                          </span>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                        {/* Customer & Destination */}
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono uppercase text-slate-400 block">
                            Customer & Destination
                          </span>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {order.shippingAddress?.recipientName || order.customer?.fullName || 'Walk-in Customer'}
                            </span>
                          </div>
                          {order.shippingAddress ? (
                            <div className="text-[11px] text-slate-600 flex items-start gap-1">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">
                                {order.shippingAddress.line1}, {order.shippingAddress.city} —{' '}
                                <strong className="font-mono text-slate-900">{order.shippingAddress.postalCode}</strong>
                              </span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500">Counter Pickup • PrintBazar Hub</div>
                          )}
                        </div>

                        {/* Items & Parcel Specs */}
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono uppercase text-slate-400 block">
                            Items & Parcel Weight
                          </span>
                          <div className="font-semibold text-slate-800 truncate">
                            {order.items?.[0]?.productName || 'Custom Print Job'}{' '}
                            <span className="text-slate-500 font-mono">
                              ({order.items?.[0]?.quantity || 1} pcs)
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-600 flex items-center gap-2">
                            <span>
                              <Scale className="h-3 w-3 inline mr-1 text-slate-400" />
                              {order.totalGrossWeightGrams || pkg?.grossWeightGrams || 850}g
                            </span>
                            <span>•</span>
                            <span>{order.packageCount || 1} Parcel(s)</span>
                          </div>
                          {pkg?.barcode && (
                            <div className="text-[10px] font-mono text-slate-500 truncate">
                              Barcode: <span className="text-slate-800 font-semibold">{pkg.barcode}</span>
                            </div>
                          )}
                        </div>

                        {/* Courier & Live Tracking Info */}
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono uppercase text-slate-400 block">
                            Courier & Tracking Status
                          </span>
                          {shipment?.courierName ? (
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Truck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>{shipment.courierName}</span>
                              </div>
                              {shipment.awbNumber ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-[11px] bg-slate-100 border border-slate-300 px-2 py-0.5 rounded font-bold text-slate-900">
                                    AWB: {shipment.awbNumber}
                                  </span>
                                  {shipment.trackingUrl && (
                                    <a
                                      href={shipment.trackingUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                                    >
                                      <span>Track</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-amber-700 font-medium">
                                  AWB not assigned yet
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 italic">
                              No courier assigned yet — click Manual Courier Update
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Latest Dispatch Log Entry */}
                      {latestHistory?.notes && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-600">
                          <div className="truncate">
                            <span className="font-mono font-semibold text-slate-700 mr-1.5">Latest Log:</span>
                            <span>{latestHistory.notes}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 shrink-0">
                            {formatDateTime(latestHistory.createdAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap lg:flex-col items-stretch justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => openManualUpdateModal(order)}
                        className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-[#FFED00] font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        <span>Manual Courier & Status Update</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {isStorePickup || order.status !== 'DELIVERED' ? (
                          <button
                            type="button"
                            onClick={() => openStorePickupModal(order)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1 transition"
                          >
                            <Store className="h-3.5 w-3.5" />
                            <span>Counter Handover</span>
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setLabelOrder(order)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1 transition"
                          title="Print Thermal Shipping Label"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Label</span>
                        </button>

                        <Link
                          href={`/tracking/${order.orderNumber}`}
                          target="_blank"
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1 transition"
                          title="View Customer Tracking Page"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Customer View</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================================
          MODAL 1: MANUAL COURIER, VERIFICATION CHECKLIST & STATUS UPDATE MODAL
         ============================================================================ */}
      {isUpdateModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFED00] text-slate-950 font-black">
                    MANUAL DISPATCH & COURIER CONTROL
                  </span>
                  <span className="font-mono text-xs text-slate-300">#{selectedOrder.orderNumber}</span>
                </div>
                <h2 className="text-lg font-bold mt-1">
                  Manual Verification Check & Courier Tracking Update
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualCourierUpdate} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
              {/* Customer & Order Snapshot Bar */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Recipient</span>
                  <strong className="text-slate-900 block">
                    {selectedOrder.shippingAddress?.recipientName || selectedOrder.customer?.fullName || 'Customer'}
                  </strong>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {selectedOrder.shippingAddress?.phone || selectedOrder.customer?.phone || ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Destination Address</span>
                  {selectedOrder.shippingAddress ? (
                    <span className="text-slate-700 text-[11px] block">
                      {selectedOrder.shippingAddress.line1}, {selectedOrder.shippingAddress.city} —{' '}
                      <strong className="font-mono">{selectedOrder.shippingAddress.postalCode}</strong>
                    </span>
                  ) : (
                    <span className="text-slate-600 text-[11px] block">Store Counter Pickup</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Financial Clearance</span>
                  {Number(selectedOrder.balanceAmount || 0) <= 0 ? (
                    <span className="text-emerald-700 font-bold text-xs block">
                      ✓ Paid ({formatCurrency(Number(selectedOrder.totalAmount || 0))})
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold text-xs block">
                      ⚠ Balance Due: {formatCurrency(Number(selectedOrder.balanceAmount || 0))}
                    </span>
                  )}
                </div>
              </div>

              {/* STEP 1: Manual Pre-Dispatch Verification Checklist */}
              <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-800" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      1. Manual Pre-Dispatch Verification Checklist ({checkedCount}/5 Verified)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAllManualChecks(checkedCount < 5)}
                    className="text-[11px] font-semibold text-amber-900 hover:underline"
                  >
                    {checkedCount < 5 ? 'Check All Verified' : 'Uncheck All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={manualChecks.packageSealedAndLabeled}
                      onChange={(e) =>
                        setManualChecks((prev) => ({ ...prev, packageSealedAndLabeled: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Package Sealed & Weighed (Required)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Carton sealed, moisture-wrapped, and weight verified on scale.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={manualChecks.addressAndPincodeVerified}
                      onChange={(e) =>
                        setManualChecks((prev) => ({ ...prev, addressAndPincodeVerified: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Address & PIN Code Verified (Required)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Shipping label matches master order address & phone.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={manualChecks.awbMatchedWithParcel}
                      onChange={(e) =>
                        setManualChecks((prev) => ({ ...prev, awbMatchedWithParcel: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Courier AWB Matched with Parcel
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Consignment AWB number verified against physical box barcode.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={manualChecks.paymentClearanceVerified}
                      onChange={(e) =>
                        setManualChecks((prev) => ({ ...prev, paymentClearanceVerified: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Payment / Invoice Clearance Checked
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Zero balance or approved corporate credit verified.
                      </span>
                    </div>
                  </label>

                  <label className="sm:col-span-2 flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={manualChecks.podOrReceiverVerified}
                      onChange={(e) =>
                        setManualChecks((prev) => ({ ...prev, podOrReceiverVerified: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Proof of Delivery (POD) / Handover Signature Verified
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Check this when courier pickup manifest is signed or customer delivery POD is confirmed.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* STEP 2: Delivery Method & Courier Partner Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-700" />
                  <span>2. Courier Partner & AWB Tracking Details</span>
                </h3>

                {/* Delivery Mode Selector */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'COURIER', label: 'Courier Partner', icon: Truck },
                    { id: 'LOCAL_EXPRESS_BIKE', label: 'Local Bike / Porter', icon: Bike },
                    { id: 'STORE_PICKUP', label: 'Store Counter Pickup', icon: Store },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const active = deliveryMethod === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setDeliveryMethod(mode.id as any)}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                          active
                            ? 'bg-slate-900 text-[#FFED00] border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>

                {deliveryMethod !== 'STORE_PICKUP' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Courier Partner
                      </label>
                      <select
                        value={courierPreset}
                        onChange={(e) => {
                          setCourierPreset(e.target.value);
                          const preset = COURIER_PRESETS.find((c) => c.name === e.target.value);
                          if (preset && awbNumber.trim()) {
                            setTrackingUrl(preset.urlTemplate(awbNumber.trim()));
                          }
                        }}
                        className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-900 bg-white focus:border-slate-900 focus:outline-none"
                      >
                        {COURIER_PRESETS.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                        <option value="CUSTOM">Other / Custom Courier Partner...</option>
                      </select>
                    </div>

                    {courierPreset === 'CUSTOM' ? (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Custom Courier Name
                        </label>
                        <input
                          type="text"
                          value={customCourierName}
                          onChange={(e) => setCustomCourierName(e.target.value)}
                          placeholder="e.g. Trackon, Ecom Express, Bus Parcel..."
                          className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Manifest Sheet Reference
                        </label>
                        <input
                          type="text"
                          value={manifestReference}
                          onChange={(e) => setManifestReference(e.target.value)}
                          placeholder="MNF-2026..."
                          className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* AWB Number */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          AWB / Consignment Tracking Number
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerateAwb}
                          className="text-[11px] font-bold text-sky-700 hover:text-sky-900"
                        >
                          + Generate AWB
                        </button>
                      </div>
                      <input
                        type="text"
                        value={awbNumber}
                        onChange={(e) => setAwbNumber(e.target.value)}
                        placeholder="Enter or scan courier AWB number"
                        className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs font-mono font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    {/* Tracking URL */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Customer Tracking URL (Shown on Customer Page)
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoFillTrackingUrl}
                          className="text-[11px] font-bold text-sky-700 hover:text-sky-900"
                        >
                          Auto-Fill URL
                        </button>
                      </div>
                      <input
                        type="url"
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Physical Parcel Dimensions & Weight */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">PARCELS</label>
                    <input
                      type="number"
                      min={1}
                      value={packageCount}
                      onChange={(e) => setPackageCount(Math.max(1, Number(e.target.value)))}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">WEIGHT (G)</label>
                    <input
                      type="number"
                      min={1}
                      value={grossWeightGrams}
                      onChange={(e) => setGrossWeightGrams(Math.max(1, Number(e.target.value)))}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">LENGTH (CM)</label>
                    <input
                      type="number"
                      min={1}
                      value={lengthCm}
                      onChange={(e) => setLengthCm(Math.max(1, Number(e.target.value)))}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">WIDTH (CM)</label>
                    <input
                      type="number"
                      min={1}
                      value={widthCm}
                      onChange={(e) => setWidthCm(Math.max(1, Number(e.target.value)))}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">HEIGHT (CM)</label>
                    <input
                      type="number"
                      min={1}
                      value={heightCm}
                      onChange={(e) => setHeightCm(Math.max(1, Number(e.target.value)))}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 3: Target Dispatch Status & Customer Tracking Update */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Send className="h-4 w-4 text-slate-700" />
                  <span>3. Select Order Status to Publish to Customer Tracking</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      status: 'READY_FOR_DISPATCH',
                      title: 'Ready for Dispatch',
                      subtitle: 'Packed, AWB generated & manifested',
                      badge: 'MANIFESTED',
                    },
                    {
                      status: 'OUT_FOR_DELIVERY',
                      title: 'Dispatched / In Transit',
                      subtitle: 'Handed to courier • Shows live AWB to customer',
                      badge: 'IN TRANSIT',
                    },
                    {
                      status: 'DELIVERED',
                      title: 'Delivered to Customer',
                      subtitle: 'Final delivery completed & verified',
                      badge: 'DELIVERED',
                    },
                  ].map((opt) => {
                    const active = targetStatus === opt.status;
                    return (
                      <button
                        key={opt.status}
                        type="button"
                        onClick={() => setTargetStatus(opt.status as any)}
                        className={`text-left p-3.5 rounded-xl border transition ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-amber-300'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${
                              active ? 'bg-[#FFED00] text-slate-950' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {opt.badge}
                          </span>
                          {active && <CheckCircle2 className="h-4 w-4 text-[#FFED00]" />}
                        </div>
                        <div className="font-bold text-xs mt-1">{opt.title}</div>
                        <p className={`text-[11px] mt-0.5 ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                          {opt.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Receiver Details when marking DELIVERED */}
                {targetStatus === 'DELIVERED' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <div>
                      <label className="text-xs font-semibold text-emerald-950 block mb-1">
                        Received By (Customer / Receiver Name)
                      </label>
                      <input
                        type="text"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="Name of person who received the package"
                        className="w-full h-9 rounded-lg border border-emerald-300 bg-white px-3 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-emerald-950 block mb-1">
                        Receiver Contact Number
                      </label>
                      <input
                        type="text"
                        value={receiverPhone}
                        onChange={(e) => setReceiverPhone(e.target.value)}
                        placeholder="+91..."
                        className="w-full h-9 rounded-lg border border-emerald-300 bg-white px-3 text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {/* Customer-Visible Dispatch Note */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Customer-Visible Dispatch / Tracking Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    placeholder="e.g. Dispatched via Delhivery Air Express from Mumbai Hub. Expected delivery in 2-3 business days."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                {/* Live Customer Tracking Preview Box */}
                <div className="rounded-xl bg-sky-50/80 border border-sky-200 p-3.5 text-xs space-y-1">
                  <div className="font-mono text-[10px] font-bold uppercase text-sky-900 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-sky-700" />
                    <span>Customer Tracking Preview (/tracking/{selectedOrder.orderNumber})</span>
                  </div>
                  <p className="text-slate-700 text-[11px]">
                    Customer will see status{' '}
                    <strong className="font-mono text-slate-900">{targetStatus}</strong> with Courier{' '}
                    <strong>
                      {deliveryMethod === 'STORE_PICKUP'
                        ? 'Store Counter Pickup'
                        : courierPreset === 'CUSTOM'
                        ? customCourierName || 'Custom Courier'
                        : courierPreset}
                    </strong>
                    {awbNumber.trim() ? (
                      <>
                        {' '}
                        and live AWB badge <strong className="font-mono">{awbNumber.trim()}</strong>
                      </>
                    ) : null}
                    .
                  </p>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-[#FFED00] text-xs font-bold flex items-center gap-2 shadow-sm transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? 'Updating Courier & Tracking...'
                      : `Verify & Publish ${targetStatus.replace(/_/g, ' ')}`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================
          MODAL 2: STORE COUNTER PICKUP HANDOVER MODAL
         ============================================================================ */}
      {storePickupOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFED00] text-slate-950 font-black">
                  COUNTER STORE PICKUP
                </span>
                <h3 className="text-base font-bold mt-1">
                  Handover Order #{storePickupOrder.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStorePickupOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmStorePickup} className="p-6 space-y-4">
              {Number(storePickupOrder.balanceAmount || 0) <= 0 ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-3 text-xs font-semibold text-emerald-900">
                  ✓ Financial Check Passed: ₹0.00 Outstanding Balance. Safe to release parcel.
                </div>
              ) : (
                <div className="rounded-lg bg-rose-50 border border-rose-300 p-3 text-xs font-semibold text-rose-900">
                  ⚠ Outstanding Balance: {formatCurrency(Number(storePickupOrder.balanceAmount || 0))}. Ensure payment is collected before handover.
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Collector Full Name
                </label>
                <input
                  type="text"
                  required
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Collector Mobile Phone
                </label>
                <input
                  type="tel"
                  value={collectorPhone}
                  onChange={(e) => setCollectorPhone(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Handover Remarks (Visible on Customer Tracking)
                </label>
                <input
                  type="text"
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  placeholder="Collected at counter after ID & invoice verification"
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs text-slate-900"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={pickupVerifiedCheck}
                  onChange={(e) => setPickupVerifiedCheck(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900"
                />
                <span className="text-slate-700 font-medium">
                  I have manually verified the collector&apos;s identity, order invoice, and package count before releasing the order.
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStorePickupOrder(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-[#FFED00] text-xs font-bold flex items-center gap-1.5"
                >
                  <Store className="h-4 w-4" />
                  <span>{isSubmitting ? 'Confirming...' : 'Confirm Handover & Mark Delivered'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================
          MODAL 3: PRINTABLE THERMAL SHIPPING LABEL & MANIFEST SLIP MODAL
         ============================================================================ */}
      {labelOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-[#FFED00]" />
                <span className="text-xs font-mono uppercase font-bold">Thermal Shipping Label Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setLabelOrder(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border-2 border-slate-900 rounded-lg p-4 font-mono text-xs space-y-3 bg-white">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                  <div>
                    <div className="font-black text-sm text-slate-900">PRINT BAZZAR LOGISTICS</div>
                    <div className="text-[10px] text-slate-600">
                      {labelOrder.shipment?.courierName || 'STANDARD COURIER'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                      {labelOrder.deliveryMethod === 'STORE_PICKUP' ? 'PICKUP' : 'PREPAID'}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      WT: {labelOrder.totalGrossWeightGrams || 850}g
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase">DELIVER TO:</div>
                  <div className="font-bold text-slate-900 text-sm">
                    {labelOrder.shippingAddress?.recipientName || labelOrder.customer?.fullName || 'Customer'}
                  </div>
                  {labelOrder.shippingAddress ? (
                    <>
                      <div className="text-slate-800">{labelOrder.shippingAddress.line1}</div>
                      {labelOrder.shippingAddress.line2 && (
                        <div className="text-slate-800">{labelOrder.shippingAddress.line2}</div>
                      )}
                      <div className="font-bold text-slate-900">
                        {labelOrder.shippingAddress.city}, {labelOrder.shippingAddress.state} —{' '}
                        <span className="text-base underline">{labelOrder.shippingAddress.postalCode}</span>
                      </div>
                      <div className="text-slate-700">Ph: {labelOrder.shippingAddress.phone}</div>
                    </>
                  ) : (
                    <div className="text-slate-700">Counter Store Pickup</div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-400 pt-2 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-slate-500">ORDER NO:</div>
                    <div className="font-black text-slate-900">#{labelOrder.orderNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">AWB / TRACKING:</div>
                    <div className="font-black text-slate-900">
                      {labelOrder.shipment?.awbNumber || 'PENDING-AWB'}
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-slate-900 pt-3 text-center">
                  <div className="tracking-[0.25em] font-black text-sm bg-slate-100 py-2 rounded border border-slate-300">
                    ||| |||| || ||||| |||| |||
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 mt-1">
                    {labelOrder.packages?.[0]?.barcode || `BAR-${labelOrder.orderNumber}-1`}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLabelOrder(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-[#FFED00] text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Thermal Label</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
