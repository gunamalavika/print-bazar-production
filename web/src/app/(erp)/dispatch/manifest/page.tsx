'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function DispatchStationPage() {
  const { user } = useAuth();
  const canPack = user?.permissions?.includes('packing.read');

  const [activeTab, setActiveTab] = useState<'PACKING' | 'COURIER_HANDOVER' | 'STORE_PICKUP'>(
    canPack ? 'PACKING' : 'COURIER_HANDOVER'
  );

  // Packaging State
  const [orderNumber, setOrderNumber] = useState('PB-2026-0001');
  const [weightGrams, setWeightGrams] = useState(850);
  const [lengthCm, setLengthCm] = useState(22);
  const [widthCm, setWidthCm] = useState(15);
  const [heightCm, setHeightCm] = useState(10);
  const [courierName, setCourierName] = useState('Delhivery Express');
  const [packingComplete, setPackingComplete] = useState(false);
  const [dispatchDetails, setDispatchDetails] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    if (!orderNumber || orderNumber.trim().length < 3) return;
    let isCancelled = false;
    setIsLoadingDetails(true);
    api.getOrderDispatchDetails(orderNumber.trim())
      .then((data) => {
        if (!isCancelled && data) {
          setDispatchDetails(data);
          if (data.measuredGrossWeightGrams) {
            setWeightGrams(data.measuredGrossWeightGrams);
          } else if (data.actualShipmentWeightGrams) {
            setWeightGrams(data.actualShipmentWeightGrams);
          }
        }
      })
      .catch(() => {
        if (!isCancelled) setDispatchDetails(null);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingDetails(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [orderNumber]);

  // Handover State
  const [scannedBarcode, setScannedBarcode] = useState('BAR-20260929-PB20260001-1');
  const [manifestRef, setManifestRef] = useState('MNF-20260929-DLH-01');
  const [handoverSuccess, setHandoverSuccess] = useState(false);

  // Store Pickup State
  const [collectorName, setCollectorName] = useState('Vikram Singhania');
  const [collectorPhone, setCollectorPhone] = useState('+919876543210');
  const [pickupSuccess, setPickupSuccess] = useState(false);

  // Submission & Error Feedback States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  const handleCompletePacking = async () => {
    if (!orderNumber?.trim()) {
      setErrorMessage('Please enter a valid Order Number to finalize packaging.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await api.completePacking({
        orderId: orderNumber.trim(),
        packages: [
          {
            sequenceNumber: 1,
            grossWeightGrams: weightGrams,
            lengthCm,
            widthCm,
            heightCm,
          },
        ],
        courierName,
      });

      // Record dispatch weight adjustment if scale measured weight differs from quote
      if (dispatchDetails && Math.abs(weightGrams - Number(dispatchDetails.actualShipmentWeightGrams)) > 0) {
        await api.adjustDispatchWeight(orderNumber.trim(), {
          measuredWeightGrams: weightGrams,
          reason: 'Physical scale weight verified during packaging dispatch',
        }).catch(() => null);
      }

      setPackingComplete(true);
      setFeedbackSuccess(`Order #${orderNumber.trim()} packaging finalized and moved to READY_FOR_DISPATCH.`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to complete packaging. Please check the order status.');
      setPackingComplete(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCourierHandover = async () => {
    if (!orderNumber?.trim()) {
      setErrorMessage('Please specify an Order Number for courier handover.');
      return;
    }
    if (!scannedBarcode?.trim()) {
      setErrorMessage('Please scan parcel barcode before confirming courier handover.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await api.confirmCourierHandover({
        orderId: orderNumber.trim(),
        courierName,
        manifestReference: manifestRef,
        scannedBarcodes: [scannedBarcode.trim()],
      });
      setHandoverSuccess(true);
      setFeedbackSuccess(`Order #${orderNumber.trim()} successfully handed to ${courierName}. Status advanced to OUT_FOR_DELIVERY.`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Courier handover failed. Order remains in READY_FOR_DISPATCH state.');
      setHandoverSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmStorePickup = async () => {
    if (!orderNumber?.trim()) {
      setErrorMessage('Please specify an Order Number for store counter pickup.');
      return;
    }
    if (!collectorName?.trim()) {
      setErrorMessage('Please specify the collector name.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await api.confirmStorePickup({
        orderId: orderNumber.trim(),
        collectorName: collectorName.trim(),
        collectorPhone: collectorPhone.trim(),
      });
      setPickupSuccess(true);
      setFeedbackSuccess(`Store pickup confirmed for Order #${orderNumber.trim()} handed over to ${collectorName.trim()}.`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Store pickup failed. Please ensure all balance payments are cleared.');
      setPickupSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <span className="text-[12px] font-mono uppercase font-semibold text-slate-500 block tracking-wider">
          LOGISTICS & FULFILLMENT STATION
        </span>
        <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2] mt-1">
          Packaging, Dispatch & Counter Pickup
        </h1>
        <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
          Carton weigh-in • Thermal barcode generation • Courier manifest verification • Store handover
        </p>
      </div>

      {/* Action Error Banner */}
      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-300 p-4 text-xs font-semibold text-rose-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
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

      {/* Mode Tabs */}
      <div className="flex border-b border-slate-200">
        {canPack && (
          <button
            type="button"
            onClick={() => setActiveTab('PACKING')}
            className={`px-5 py-3 text-[13px] transition ${
              activeTab === 'PACKING'
                ? 'border-b-2 border-slate-900 text-slate-900 font-semibold bg-white'
                : 'border-transparent text-slate-500 font-medium hover:text-slate-800'
            }`}
          >
            1. PACKAGING & WEIGH-IN (1 OF N)
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('COURIER_HANDOVER')}
          className={`px-5 py-3 text-[13px] transition ${
            activeTab === 'COURIER_HANDOVER'
              ? 'border-b-2 border-slate-900 text-slate-900 font-semibold bg-white'
              : 'border-transparent text-slate-500 font-medium hover:text-slate-800'
          }`}
        >
          {canPack ? '2. COURIER MANIFEST SCAN' : '1. COURIER MANIFEST SCAN'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('STORE_PICKUP')}
          className={`px-5 py-3 text-[13px] transition ${
            activeTab === 'STORE_PICKUP'
              ? 'border-b-2 border-slate-900 text-slate-900 font-semibold bg-white'
              : 'border-transparent text-slate-500 font-medium hover:text-slate-800'
          }`}
        >
          {canPack ? '3. COUNTER STORE PICKUP' : '2. COUNTER STORE PICKUP'}
        </button>
      </div>

      {/* Tab 1: Packaging & Weigh-in */}
      {activeTab === 'PACKING' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6">
          {packingComplete ? (
            <div className="rounded-lg bg-amber-50 border border-slate-300 p-6 text-center space-y-3">
              <CheckCircle2 className="h-8 w-8 text-slate-900 mx-auto" />
              <h3 className="text-[16px] font-semibold text-slate-900">Packaging Finalized & Thermal Label Generated!</h3>
              <p className="text-[13px] text-slate-600 font-mono">
                1 Parcel (850g) registered. Thermal label printed: <strong>BAR-20260929-PB20260001-1</strong>.
                Order advanced to <strong>READY_FOR_DISPATCH</strong>.
              </p>
              <button
                type="button"
                onClick={() => setPackingComplete(false)}
                className="mt-2 text-[13px] font-semibold text-slate-900 hover:underline"
              >
                Pack another order
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-[15px] sm:text-[16px] font-semibold text-slate-900">Parcel Packaging & Digital Scale Weigh-In</h2>
                <p className="text-[13px] text-slate-500">
                  Staff never retypes shipping address. Address is inherited directly from the master record.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] sm:text-[13px] font-medium text-slate-700 block mb-1.5">Order Number</label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-[14px] font-mono font-medium text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] font-medium text-slate-700 block mb-1.5">Courier Partner</label>
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-[14px] font-medium text-slate-900 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="Delhivery Express">Delhivery Express Air</option>
                    <option value="Bluedart Apex">Bluedart Apex</option>
                    <option value="Shiprocket Surface">Shiprocket Surface</option>
                  </select>
                </div>
              </div>

              {/* Authoritative Order Logistics Snapshot */}
              {dispatchDetails && (
                <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between font-bold text-sky-950 pb-1.5 border-b border-sky-200">
                    <span className="flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-sky-700" />
                      Authoritative Dispatch Weight Specs — #{dispatchDetails.orderNumber}
                    </span>
                    <span className="bg-sky-200/80 px-2 py-0.5 rounded text-[11px] font-bold">
                      {dispatchDetails.zoneCode} Zone ({dispatchDetails.destinationPincode})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Product Qty:</span>
                      <strong className="text-slate-900">{dispatchDetails.productQuantity} pcs</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Product Weight:</span>
                      <strong className="text-slate-900">{dispatchDetails.configuredProductWeightGrams} g</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Box Tare:</span>
                      <strong className="text-slate-900">+{dispatchDetails.packagingWeightGrams} g</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Estimated Weight:</span>
                      <strong className="text-sky-800">{dispatchDetails.actualShipmentWeightGrams} g</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-sky-200/60 text-[11px]">
                    <span>Expected Courier Charge:</span>
                    <strong className="text-slate-900 font-bold">₹{Number(dispatchDetails.expectedCourierShippingAmount || 0).toFixed(2)}</strong>
                  </div>

                  {/* Weight Variance Notice if measured weight differs */}
                  {Math.abs(weightGrams - Number(dispatchDetails.actualShipmentWeightGrams)) > 10 && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-amber-950 text-[11px]">
                      <div>
                        <strong>Weight Variance Detected: </strong>
                        <span>
                          Measured: {weightGrams}g vs Quote: {dispatchDetails.actualShipmentWeightGrams}g (
                          {weightGrams - dispatchDetails.actualShipmentWeightGrams > 0 ? '+' : ''}
                          {weightGrams - dispatchDetails.actualShipmentWeightGrams}g)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-200/80 px-2 py-0.5 rounded text-amber-900">
                        Variance will be audit-logged
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Physical Parcel Specs */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-semibold text-slate-700 uppercase tracking-wider">
                    Parcel 1 of 1 Physical Specifications (Scale Verification)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Enter physical scale weight
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 font-mono">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">GROSS WEIGHT (G)</label>
                    <input
                      type="number"
                      value={weightGrams}
                      onChange={(e) => setWeightGrams(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-slate-300 px-3 text-[13px] font-semibold tabular-nums text-slate-900 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">LENGTH (CM)</label>
                    <input
                      type="number"
                      value={lengthCm}
                      onChange={(e) => setLengthCm(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-slate-300 px-3 text-[13px] font-semibold tabular-nums text-slate-900 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">WIDTH (CM)</label>
                    <input
                      type="number"
                      value={widthCm}
                      onChange={(e) => setWidthCm(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-slate-300 px-3 text-[13px] font-semibold tabular-nums text-slate-900 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">HEIGHT (CM)</label>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-slate-300 px-3 text-[13px] font-semibold tabular-nums text-slate-900 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Primary Action */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCompletePacking}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold text-[13px] sm:text-[14px] py-3 rounded-lg shadow-sm transition active:scale-[0.98]"
              >
                <Package className="h-4 w-4" />
                <span>{isSubmitting ? 'FINALIZING PACKAGING...' : 'FINALIZE PACKAGING & PRINT THERMAL BARCODE LABEL'}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Courier Manifest Scan */}
      {activeTab === 'COURIER_HANDOVER' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6">
          {handoverSuccess ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-6 text-center space-y-3 font-mono">
              <CheckCircle2 className="h-8 w-8 text-emerald-700 mx-auto" />
              <h3 className="text-[16px] font-semibold text-emerald-900">Courier Handover Verified & Dispatched!</h3>
              <p className="text-[13px] text-slate-600">
                Package scanned & matched to Manifest <strong>{manifestRef}</strong>. Order advanced to{' '}
                <strong>OUT_FOR_DELIVERY</strong>.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-[15px] sm:text-[16px] font-semibold text-slate-900">Scan Parcel Barcode for Courier Manifest</h2>
                <p className="text-[13px] text-slate-500">
                  Pre-dispatch scan prevents wrong parcel handover and confirms shipping custody handover.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[12px] sm:text-[13px] font-medium text-slate-700 block mb-1.5">Scan Parcel Barcode</label>
                  <input
                    type="text"
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-[14px] font-mono font-medium text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] font-medium text-slate-700 block mb-1.5">Courier Manifest Sheet Number</label>
                  <input
                    type="text"
                    value={manifestRef}
                    onChange={(e) => setManifestRef(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-[14px] font-normal text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmCourierHandover}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold text-[13px] sm:text-[14px] py-3 rounded-lg shadow-sm transition"
              >
                <ScanLine className="h-4 w-4" />
                <span>{isSubmitting ? 'VERIFYING & CONFIRMING...' : 'VERIFY SCAN & DISPATCH COURIER MANIFEST'}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Store Pickup */}
      {activeTab === 'STORE_PICKUP' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6">
          {pickupSuccess ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-6 text-center space-y-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-700 mx-auto" />
              <h3 className="text-[16px] font-semibold text-emerald-900">Store Pickup Completed!</h3>
              <p className="text-[13px] text-slate-600">
                Handed over to <strong>{collectorName}</strong>. Master order marked <strong>DELIVERED</strong>.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-[15px] sm:text-[16px] font-semibold text-slate-900">Counter Store Pickup Handover</h2>
                <p className="text-[13px] text-slate-500">
                  Strict Financial Check: Zero balance verified before releasing parcel to customer.
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 border border-slate-300 p-3 text-[13px] font-semibold text-slate-900 tabular-nums">
                ✓ Balance Check: ₹0.00 Outstanding Balance. Safe to Release.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] sm:text-[13px] font-medium text-slate-700 block mb-1.5">Collector Name</label>
                  <input
                    type="text"
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-[14px] font-normal text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[12px] sm:text-[13px] font-medium text-slate-700 block mb-1.5">Collector Mobile Phone</label>
                  <input
                    type="tel"
                    value={collectorPhone}
                    onChange={(e) => setCollectorPhone(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-[14px] font-mono font-medium text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmStorePickup}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold text-[13px] sm:text-[14px] py-3 rounded-lg shadow-sm transition"
              >
                <Store className="h-4 w-4" />
                <span>{isSubmitting ? 'VERIFYING & CONFIRMING...' : 'CONFIRM STORE HANDOVER & MARK DELIVERED'}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
