'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PackingStationHeader } from './PackingStationHeader';
import { PackingProgress, PackingStep } from './PackingProgress';
import { PackingJobQueue } from './PackingJobQueue';
import { PackingJobDto } from './PackingJobCard';
import { JobDetailsPanel } from './JobDetailsPanel';
import { CartonPackingForm, PackagingCartonItem } from './CartonPackingForm';
import { PackedCartonsTable } from './PackedCartonsTable';
import { ShippingLabelPreview } from './ShippingLabelPreview';
import { LabelActions } from './LabelActions';
import { PrintLabelModal } from './PrintLabelModal';
import { DispatchTrackingModal } from './DispatchTrackingModal';
import {
  RiBox3Line,
  RiCheckboxCircleFill,
  RiAlertFill,
  RiRefreshLine,
  RiArrowLeftLine,
  RiFileList3Line,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

const DEFAULT_MATERIALS = [
  {
    code: 'PB-BOX-01',
    name: 'PB-BOX-01: Micro Rigid Box (Cards up to 500 pcs)',
    innerLengthCm: 12,
    innerWidthCm: 10,
    innerHeightCm: 7,
    tareWeightKg: 0.08,
    maxWeightKg: 2.0,
  },
  {
    code: 'PB-BOX-02',
    name: 'PB-BOX-02: Double-Wall Corrugated (Standard 5-Ply)',
    innerLengthCm: 25,
    innerWidthCm: 18,
    innerHeightCm: 12,
    tareWeightKg: 0.18,
    maxWeightKg: 8.0,
  },
  {
    code: 'PB-BOX-03',
    name: 'PB-BOX-03: Heavy Master Shipper (A3/Brochures)',
    innerLengthCm: 35,
    innerWidthCm: 26,
    innerHeightCm: 20,
    tareWeightKg: 0.32,
    maxWeightKg: 18.0,
  },
  {
    code: 'PB-TUBE-01',
    name: 'PB-TUBE-01: Telescopic Standee & Banner Tube',
    innerLengthCm: 90,
    innerWidthCm: 15,
    innerHeightCm: 15,
    tareWeightKg: 0.45,
    maxWeightKg: 10.0,
  },
];

export function PackingStation() {
  const { user } = useAuth();

  // Data state
  const [jobs, setJobs] = useState<PackingJobDto[]>([]);
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS);
  const [selectedJob, setSelectedJob] = useState<PackingJobDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('ALL');

  // Workstation state
  const [cartons, setCartons] = useState<PackagingCartonItem[]>([]);
  const [labelPrinted, setLabelPrinted] = useState(false);
  const [printCount, setPrintCount] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  // Responsive mobile tab state ('QUEUE' or 'STATION')
  const [mobileView, setMobileView] = useState<'QUEUE' | 'STATION'>('QUEUE');

  // Notifications
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Hardware Status
  const [scaleWeightKg, setScaleWeightKg] = useState<number | null>(null);
  const printerName = 'Zebra ZT411 (4×6 Thermal)';

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const [queueData, matsData] = await Promise.all([
        api.getPackingQueue({ search: search || undefined }),
        api.getPackagingMaterials().catch(() => DEFAULT_MATERIALS),
      ]);

      const queueList = queueData || [];
      setJobs(queueList);
      if (matsData && matsData.length > 0) {
        setMaterials(matsData);
      }

      // If selected job is not in queue anymore, select first
      if (queueList.length > 0) {
        setSelectedJob((prev) => {
          if (prev) {
            const found = queueList.find((j: any) => j.id === prev.id);
            return found || queueList[0];
          }
          return queueList[0];
        });
      } else {
        setSelectedJob(null);
      }
    } catch (err: any) {
      console.error('Error fetching packing queue:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Reset workstation state when selecting a new job
  const handleSelectJob = (job: PackingJobDto) => {
    setSelectedJob(job);
    setCartons([]);
    setLabelPrinted(false);
    setPrintCount(0);
    setIsCompleted(false);
    setScaleWeightKg(null);
    setMobileView('STATION'); // Automatically switch to station workspace on mobile
  };

  // Add carton
  const handleAddCarton = (carton: PackagingCartonItem) => {
    setCartons((prev) => [...prev, carton]);
    setBanner({
      type: 'success',
      message: `Carton #${carton.sequenceNumber} recorded (${carton.grossWeightKg.toFixed(2)} KG).`,
    });
    setTimeout(() => setBanner(null), 3000);
  };

  // Delete carton
  const handleDeleteCarton = (id: string) => {
    setCartons((prev) => prev.filter((c) => c.id !== id));
  };

  // Print label action
  const handlePrintLabel = () => {
    setLabelPrinted(true);
    setPrintCount((prev) => prev + 1);
    setIsPrintModalOpen(true);
    setBanner({
      type: 'success',
      message: `4×6 Thermal Label preview opened for ${printerName}. Click Print or Esc to close.`,
    });
    setTimeout(() => setBanner(null), 4000);
  };

  // Reprint label action (audited)
  const handleReprintLabel = async () => {
    if (!selectedJob) return;
    try {
      await api.recordLabelReprint(selectedJob.id, 'Operator requested label reprint');
      setPrintCount((prev) => prev + 1);
      setIsPrintModalOpen(true);
      setBanner({
        type: 'success',
        message: `Label reprint #${printCount + 1} logged. Ready for printing.`,
      });
      setTimeout(() => setBanner(null), 4000);
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: `Reprint error: ${err.message || 'Failed to log reprint'}`,
      });
    }
  };

  // Complete Packing action - opens tracking number popup modal
  const handleCompletePacking = () => {
    if (!selectedJob) return;
    // Auto-provision standard Carton #1 if not manually added yet
    if (cartons.length === 0) {
      const def = materials[1] || materials[0] || DEFAULT_MATERIALS[0];
      const item = selectedJob.items?.[0];
      const qty = item?.quantity || 100;
      const calculatedWeight = Math.max(0.5, parseFloat(((qty * 2.8) / 1000 + def.tareWeightKg).toFixed(2)));
      const autoCarton: PackagingCartonItem = {
        id: `carton-${Date.now()}-1`,
        sequenceNumber: 1,
        cartonType: def.code,
        lengthCm: def.innerLengthCm,
        widthCm: def.innerWidthCm,
        heightCm: def.innerHeightCm,
        tareWeightKg: def.tareWeightKg,
        grossWeightKg: calculatedWeight,
        isWeightVerified: true,
      };
      setCartons([autoCarton]);
    }
    setIsTrackingModalOpen(true);
  };

  // Confirm Dispatch with tracking number from popup
  const handleConfirmDispatch = async (trackingNumber: string, courierName: string) => {
    if (!selectedJob) return;
    const def = materials[1] || materials[0] || DEFAULT_MATERIALS[0];
    const activeCartons =
      cartons.length > 0
        ? cartons
        : [
            {
              id: `carton-${Date.now()}-1`,
              sequenceNumber: 1,
              cartonType: def.code,
              lengthCm: def.innerLengthCm || 25,
              widthCm: def.innerWidthCm || 18,
              heightCm: def.innerHeightCm || 12,
              tareWeightKg: def.tareWeightKg || 0.18,
              grossWeightKg: 0.85,
              isWeightVerified: true,
            },
          ];

    setIsCompleting(true);
    try {
      await api.completePacking({
        orderId: selectedJob.id,
        packages: activeCartons.map((c) => ({
          sequenceNumber: c.sequenceNumber,
          cartonType: c.cartonType,
          grossWeightGrams: Math.round(c.grossWeightKg * 1000),
          lengthCm: c.lengthCm,
          widthCm: c.widthCm,
          heightCm: c.heightCm,
        })),
        courierName:
          courierName ||
          (selectedJob.deliveryMethod === 'STORE_PICKUP'
            ? 'Store Pickup Counter'
            : 'Delhivery Surface Express'),
        trackingNumber: trackingNumber.trim(),
        stationPrinter: printerName,
      });

      setIsTrackingModalOpen(false);
      setIsCompleted(true);
      setBanner({
        type: 'success',
        message: `Order #${selectedJob.orderNumber} packing completed (Tracking: ${trackingNumber})! Successfully released to Dispatch Manifest.`,
      });

      // Refresh queue to remove completed job
      setTimeout(() => {
        fetchQueue();
      }, 1500);
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: `Packing Error: ${err?.message || 'Failed to complete packing'}`,
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Calculate current progress step
  const currentStep: PackingStep = useMemo(() => {
    if (isCompleted) return 4;
    if (labelPrinted && cartons.length > 0) return 4;
    if (cartons.length > 0) return 3;
    if (selectedJob) return 2;
    return 1;
  }, [selectedJob, cartons, labelPrinted, isCompleted]);

  const canComplete = Boolean(selectedJob && !isCompleted);

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-12">
      {/* 1. Station Header */}
      <PackingStationHeader
        onRefresh={fetchQueue}
        isLoading={isLoading}
        scaleWeightKg={scaleWeightKg}
        printerName={printerName}
      />

      {/* 2. Four-Step Progress Indicator */}
      <PackingProgress currentStep={currentStep} />

      {/* Notification Banner */}
      {banner && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs transition animate-in fade-in ${
            banner.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {banner.type === 'error' ? (
              <RiAlertFill className="h-4 w-4 text-rose-600 shrink-0" />
            ) : (
              <RiCheckboxCircleFill className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            <span>{banner.message}</span>
            {banner.type === 'success' && (
              <Link
                href="/dispatch/manifest"
                className="ml-2 font-bold underline text-emerald-950 hover:text-emerald-700 inline-flex items-center gap-1"
              >
                Go to Dispatch Manifest →
              </Link>
            )}
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Mobile Tab Switcher (Visible on Mobile / Tablet only) */}
      <div className="flex lg:hidden items-center bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileView('QUEUE')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            mobileView === 'QUEUE'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <RiFileList3Line className="h-4 w-4" />
          <span>Queue ({jobs.length})</span>
        </button>

        <button
          type="button"
          disabled={!selectedJob}
          onClick={() => setMobileView('STATION')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
            mobileView === 'STATION'
              ? 'bg-white text-slate-900 shadow-xs'
              : selectedJob
              ? 'text-slate-600 hover:text-slate-900 cursor-pointer'
              : 'text-slate-400 cursor-not-allowed opacity-60'
          }`}
        >
          <RiBox3Line className="h-4 w-4" />
          <span>Active Station</span>
          {selectedJob && (
            <span className="font-mono text-[10px] bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded-full font-bold">
              #{selectedJob.orderNumber}
            </span>
          )}
        </button>
      </div>

      {/* 4. Responsive Master-Detail Workstation Layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT PANE: Packing Job Queue */}
        <div
          className={`w-full lg:w-84 xl:w-96 shrink-0 ${
            mobileView === 'STATION' ? 'hidden lg:block' : 'block'
          }`}
        >
          <PackingJobQueue
            jobs={jobs}
            selectedJobId={selectedJob?.id || null}
            onSelectJob={handleSelectJob}
            search={search}
            onSearchChange={setSearch}
            filterTab={filterTab}
            onFilterTabChange={setFilterTab}
            onRefresh={fetchQueue}
            isLoading={isLoading}
          />
        </div>

        {/* RIGHT PANE: Active Workstation Area */}
        <div
          className={`w-full lg:flex-1 min-w-0 space-y-4 ${
            mobileView === 'QUEUE' ? 'hidden lg:block' : 'block'
          }`}
        >
          {selectedJob ? (
            <div className="space-y-4">
              {/* Mobile Back Button to Queue */}
              <div className="flex lg:hidden items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setMobileView('QUEUE')}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 cursor-pointer"
                >
                  <RiArrowLeftLine className="h-4 w-4" />
                  <span>Back to Queue ({jobs.length} jobs)</span>
                </button>
                <span className="font-mono text-xs font-bold text-slate-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                  #{selectedJob.orderNumber}
                </span>
              </div>

              {/* Order Overview Banner */}
              <JobDetailsPanel job={selectedJob} />

              {/* Workstation Actions Grid: 2 Clean Balanced Columns on XL */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                {/* Packaging & Weight (7 cols on XL) */}
                <div className="xl:col-span-7 space-y-4">
                  <CartonPackingForm
                    job={selectedJob}
                    packagingMaterials={materials}
                    onAddCarton={handleAddCarton}
                    currentSequenceNumber={cartons.length + 1}
                    scaleWeightKg={scaleWeightKg}
                  />

                  <PackedCartonsTable
                    cartons={cartons}
                    onDeleteCarton={handleDeleteCarton}
                    isCompleted={isCompleted}
                    labelPrinted={labelPrinted}
                    onOpenPrintModal={() => setIsPrintModalOpen(true)}
                  />
                </div>

                {/* Thermal Shipping Label & Dispatch Actions (5 cols on XL) */}
                <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-4">
                  <ShippingLabelPreview
                    job={selectedJob}
                    cartons={cartons}
                    activeCartonIndex={Math.max(0, cartons.length - 1)}
                    onOpenPrintModal={() => setIsPrintModalOpen(true)}
                  />

                  <LabelActions
                    labelPrinted={labelPrinted}
                    printCount={printCount}
                    onPrintLabel={handlePrintLabel}
                    onReprintLabel={handleReprintLabel}
                    onCompletePacking={handleCompletePacking}
                    isCompleting={isCompleting}
                    canComplete={canComplete}
                    isCompleted={isCompleted}
                    printerName={printerName}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Empty State when no job is selected */
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-400 shadow-card">
              <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <RiBox3Line className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Select a Job from the Queue</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Click any Final QC-approved order from the left queue to begin packaging, calibrate weight on the digital scale, and print thermal shipping labels.
              </p>
              {jobs.length > 0 && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleSelectJob(jobs[0])}
                  className="mt-4 font-bold"
                >
                  <span>Open First Job (#{jobs[0].orderNumber})</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. Print 4x6 Thermal Label Modal */}
      <PrintLabelModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        job={selectedJob}
        cartons={cartons}
        printerName={printerName}
        onConfirmPrinted={() => {
          setLabelPrinted(true);
        }}
      />

      {/* 6. Complete Packing & Move to Dispatch Tracking Modal */}
      {selectedJob && (
        <DispatchTrackingModal
          isOpen={isTrackingModalOpen}
          onClose={() => setIsTrackingModalOpen(false)}
          job={selectedJob}
          cartons={cartons}
          defaultCourier={
            selectedJob.deliveryMethod === 'STORE_PICKUP'
              ? 'Store Pickup Counter'
              : 'Delhivery Surface Express'
          }
          isSubmitting={isCompleting}
          onConfirm={handleConfirmDispatch}
        />
      )}
    </div>
  );
}
