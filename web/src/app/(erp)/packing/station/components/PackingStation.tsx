'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  RiBox3Line,
  RiCheckboxCircleFill,
  RiAlertFill,
  RiRefreshLine,
} from 'react-icons/ri';

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

  // Complete Packing action
  const handleCompletePacking = async () => {
    if (!selectedJob || cartons.length === 0) return;
    setIsCompleting(true);
    try {
      await api.completePacking({
        orderId: selectedJob.id,
        packages: cartons.map((c) => ({
          sequenceNumber: c.sequenceNumber,
          cartonType: c.cartonType,
          grossWeightGrams: Math.round(c.grossWeightKg * 1000),
          lengthCm: c.lengthCm,
          widthCm: c.widthCm,
          heightCm: c.heightCm,
        })),
        courierName: selectedJob.deliveryMethod === 'STORE_PICKUP' ? 'Store Pickup Counter' : 'Delhivery Surface Express',
        stationPrinter: printerName,
      });

      setIsCompleted(true);
      setBanner({
        type: 'success',
        message: `Order #${selectedJob.orderNumber} packing completed! Handed off to Dispatch Station.`,
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

  const canComplete = cartons.length > 0 && labelPrinted && !isCompleted;

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
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
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs transition animate-in fade-in ${
            banner.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'error' ? (
              <RiAlertFill className="h-4 w-4 text-rose-600 shrink-0" />
            ) : (
              <RiCheckboxCircleFill className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Three-Zone Industrial Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT ZONE (3.5 cols): Job Queue */}
        <div className="lg:col-span-3">
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

        {/* CENTER ZONE (5 cols): Selected Job + Packing Form */}
        <div className="lg:col-span-5 space-y-4">
          {selectedJob ? (
            <>
              <JobDetailsPanel job={selectedJob} />
              <CartonPackingForm
                job={selectedJob}
                packagingMaterials={materials}
                onAddCarton={handleAddCarton}
                currentSequenceNumber={cartons.length + 1}
                scaleWeightKg={scaleWeightKg}
              />
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-xs">
              <RiBox3Line className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700">Select a Job from the Left Queue</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Click any Final QC-approved job on the left to begin carton packing and calibrated weight verification.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT ZONE (3.5 cols): Shipping Label Preview + Packed Cartons */}
        <div className="lg:col-span-4 space-y-4">
          {selectedJob ? (
            <>
              <ShippingLabelPreview
                job={selectedJob}
                cartons={cartons}
                activeCartonIndex={Math.max(0, cartons.length - 1)}
                onOpenPrintModal={() => setIsPrintModalOpen(true)}
              />
              <PackedCartonsTable
                cartons={cartons}
                onDeleteCarton={handleDeleteCarton}
                isCompleted={isCompleted}
                labelPrinted={labelPrinted}
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
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-xs">
              <RiBox3Line className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700">Shipping Label Preview Awaiting Job</h3>
              <p className="text-xs text-slate-400 mt-1">
                4×6 thermal shipping label mockup will generate once a job is selected.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Print 4x6 Label Modal */}
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
    </div>
  );
}
