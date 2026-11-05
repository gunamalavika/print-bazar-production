'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  RiDragMove2Fill,
  RiPrinterLine,
  RiUser3Line,
  RiTimeLine,
  RiAlertFill,
  RiPlayFill,
  RiCheckFill,
  RiCloseFill,
  RiBox3Line,
  RiTruckLine,
  RiEyeLine,
  RiDownload2Line,
  RiFilePdfLine,
  RiShieldCheckLine,
  RiLoader4Line,
} from 'react-icons/ri';
import { KanbanCardDto } from '@/lib/api';

interface ProductionJobCardProps {
  card: KanbanCardDto;
  userRole?: string;
  onAction: (card: KanbanCardDto, actionType: string) => void;
  onDragStart: (e: React.DragEvent, card: KanbanCardDto) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export function ProductionJobCard({
  card,
  userRole,
  onAction,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: ProductionJobCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Determine Priority color
  const priorityColor =
    card.priority === 'URGENT'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : card.priority === 'HIGH'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  // Determine SLA color badge
  const slaBadgeColor =
    card.slaStatus === 'OVERDUE'
      ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300 animate-pulse'
      : card.slaStatus === 'DUE_SOON'
      ? 'bg-amber-100 text-amber-900 font-semibold border border-amber-300'
      : 'bg-emerald-50 text-emerald-800 font-medium border border-emerald-200';

  // Direct 1-Click Artwork Blob Download Handler
  const handleDownloadArtwork = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const rawUrl = card.artwork?.fileUrl || card.artwork?.storageKey;
    if (!rawUrl) {
      alert(`No attached artwork file found for job ${card.jobNumber}. Please check digital job ticket.`);
      return;
    }

    setIsDownloading(true);

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace('/api/v1', '');
    
    // Resolve absolute URL pointing to backend server on port 4000
    let targetPath = rawUrl;
    if (!targetPath.startsWith('http')) {
      if (targetPath.startsWith('/uploads')) {
        targetPath = `${apiBase}${targetPath}`;
      } else if (targetPath.startsWith('uploads/')) {
        targetPath = `${apiBase}/${targetPath}`;
      } else if (targetPath.startsWith('artwork/')) {
        targetPath = `${apiBase}/uploads/${targetPath}`;
      } else if (targetPath.startsWith('/')) {
        targetPath = `${apiBase}${targetPath}`;
      } else {
        targetPath = `${apiBase}/uploads/artwork/${targetPath}`;
      }
    }

    const fileName = card.artwork?.originalFileName || `${card.jobNumber}_Approved_Artwork.pdf`;

    try {
      const response = await fetch(targetPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Direct blob download fallback to window.open:', err);
      window.open(targetPath, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onDragEnd={onDragEnd}
      className={`bg-white border rounded-xl p-3.5 shadow-xs transition-all select-none group relative flex flex-col justify-between gap-2.5 ${
        isDragging
          ? 'opacity-40 border-slate-400 scale-[0.98]'
          : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
      } ${card.isHeld ? 'ring-1 ring-rose-400 bg-rose-50/20' : ''}`}
    >
      {/* Top Row: Order ID, Job Number, Priority & Drag Handle */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/production/job-card/${card.jobNumber || card.id}`}
              className="font-mono text-[13px] font-bold text-slate-900 hover:text-amber-700 transition-colors truncate"
              title="Open Digital Job Ticket"
            >
              {card.orderNumber}
            </Link>
            <span className="text-[10px] font-mono text-slate-400 font-medium truncate">
              • {card.jobNumber}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
            {card.customerCompany || card.customerName}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold border ${priorityColor}`}
          >
            {card.priority}
          </span>

          {/* Dedicated Tactile Drag Handle */}
          <div
            className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-grab active:cursor-grabbing transition"
            title="Drag job to next workflow station"
          >
            <RiDragMove2Fill className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Product Name & Quantity Pill */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-xs font-semibold text-slate-900 line-clamp-1">
          {card.productName}
        </span>
        <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded flex-shrink-0 border border-slate-200/80">
          {card.quantity.toLocaleString()} pcs
        </span>
      </div>

      {/* Customer Selected Specifications Snapshot */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[9.5px] font-mono font-bold uppercase text-slate-500 tracking-wider">
            Customer Specifications
          </span>
          <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-300">
            Job Setup Info
          </span>
        </div>

        {card.specifications.selectedOptions && card.specifications.selectedOptions.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            {card.specifications.selectedOptions.slice(0, 4).map((spec, idx) => (
              <div key={idx} className="bg-white p-1.5 rounded border border-slate-200 shadow-2xs truncate">
                <span className="text-[9px] font-mono uppercase text-slate-400 block truncate font-bold leading-tight">
                  {spec.label}
                </span>
                <span className="font-bold text-slate-900 text-[11px] block truncate leading-tight mt-0.5">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-slate-600 space-y-0.5">
            {card.specifications.paperGsm && (
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-slate-700">Substrate:</span>
                <span className="truncate">{card.specifications.paperGsm}</span>
              </div>
            )}
            {card.specifications.finish && (
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-slate-700">Finishing:</span>
                <span className="truncate">{card.specifications.finish}</span>
              </div>
            )}
            {card.specifications.printMode && (
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-slate-700">Print:</span>
                <span className="truncate">{card.specifications.printMode}</span>
              </div>
            )}
            {!card.specifications.paperGsm && !card.specifications.finish && !card.specifications.printMode && (
              <span className="italic text-slate-400 text-[10.5px]">Standard shop specs configured</span>
            )}
          </div>
        )}

        {card.specifications.customerNotes && (
          <div className="pt-1 border-t border-slate-200/60 text-[10px] text-slate-600 line-clamp-1">
            <span className="font-bold text-slate-700">Notes:</span> {card.specifications.customerNotes}
          </div>
        )}
      </div>

      {/* Approved Job Artwork Download Box */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded bg-amber-100 text-amber-800 flex-shrink-0">
            <RiFilePdfLine className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-900 block truncate leading-tight">
              {card.artwork?.originalFileName || 'Production Artwork'}
            </span>
            <span className="text-[9px] font-mono text-emerald-800 font-semibold flex items-center gap-1 leading-tight mt-0.5">
              <RiShieldCheckLine className="h-3 w-3 text-emerald-600" />
              <span>Approved Production File</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={isDownloading}
          onClick={handleDownloadArtwork}
          className="inline-flex items-center gap-1 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-700 text-[#FFED00] font-black text-[10px] px-2.5 py-1 rounded shadow-2xs transition active:scale-95 flex-shrink-0 cursor-pointer border border-[#E3A008]/40"
          title="Download Approved Print File"
        >
          {isDownloading ? (
            <>
              <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <RiDownload2Line className="h-3.5 w-3.5 stroke-[1.5]" />
              <span>Download</span>
            </>
          )}
        </button>
      </div>

      {/* Machine & Operator Badge */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
        <div className="flex items-center gap-1 min-w-0 pr-2">
          <RiPrinterLine className="h-3.5 w-3.5 text-[#E3A008] flex-shrink-0" />
          <span className="truncate font-medium text-slate-700">
            {card.machine?.name || 'Machine Unassigned'}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 font-mono text-[10px]">
          <RiUser3Line className="h-3 w-3 text-slate-400" />
          <span className="text-slate-600 truncate max-w-[90px]">
            {card.operator?.fullName?.split(' ')[0] || 'Unassigned'}
          </span>
        </div>
      </div>

      {/* Time & SLA Row */}
      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 text-[11px]">
        <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
          <RiTimeLine className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <span>{card.timeInfo.text}</span>
        </div>

        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${slaBadgeColor}`}>
          {card.slaBadgeText}
        </span>
      </div>

      {/* On Hold Alert Banner */}
      {card.isHeld && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-xs text-rose-800 flex items-start gap-1.5">
          <RiAlertFill className="h-3.5 w-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="font-bold block text-[10px] uppercase tracking-wider">HOLD REASON:</span>
            <span className="text-[11px] line-clamp-2">{card.holdReason}</span>
          </div>
        </div>
      )}

      {/* Role-Aware Action Buttons Strip */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
        <Link
          href={`/production/job-card/${card.jobNumber || card.id}`}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 py-1 px-1.5 rounded hover:bg-slate-100 transition"
        >
          <RiEyeLine className="h-3.5 w-3.5" />
          <span>Job Card</span>
        </Link>

        {/* Dynamic Contextual Action based on Card Status & User Role */}
        <div className="flex items-center gap-1">
          {/* QC Approved -> Start Printing */}
          {(card.status === 'QUEUED' || card.status === 'ASSIGNED' || card.orderStatus === 'PRODUCTION_QUEUE') && (
            <button
              onClick={() => onAction(card, 'START_PRINTING')}
              className="inline-flex items-center gap-1 bg-[#FFED00] hover:bg-[#FDD835] text-slate-950 font-bold text-[11px] px-2.5 py-1 rounded-md border border-[#E3A008]/50 shadow-xs transition active:scale-95"
            >
              <RiPlayFill className="h-3 w-3" />
              <span>Start Print</span>
            </button>
          )}

          {/* Printing -> Complete Printing */}
          {card.status === 'PRINTING' && (
            <button
              onClick={() => onAction(card, 'COMPLETE_PRINTING')}
              className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-md shadow-xs transition active:scale-95"
            >
              <RiCheckFill className="h-3 w-3" />
              <span>To Finishing</span>
            </button>
          )}

          {/* Finishing -> To Final QC */}
          {(card.status === 'FINISHING' || card.status === 'PRINTING_COMPLETED') && (
            <button
              onClick={() => onAction(card, 'COMPLETE_FINISHING')}
              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-md shadow-xs transition active:scale-95"
            >
              <RiCheckFill className="h-3 w-3" />
              <span>To Final QC</span>
            </button>
          )}



          {/* Packing -> Complete Packing */}
          {card.orderStatus === 'PACKING' && (
            <button
              onClick={() => onAction(card, 'COMPLETE_PACKING')}
              className="inline-flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-md shadow-xs transition active:scale-95"
            >
              <RiBox3Line className="h-3 w-3" />
              <span>Packaged</span>
            </button>
          )}

          {/* Ready For Dispatch -> Dispatch */}
          {card.orderStatus === 'READY_FOR_DISPATCH' && (
            <button
              onClick={() => onAction(card, 'DISPATCH')}
              className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-[#FFED00] font-bold text-[11px] px-2.5 py-1 rounded-md shadow-xs transition active:scale-95"
            >
              <RiTruckLine className="h-3 w-3" />
              <span>Dispatch</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
