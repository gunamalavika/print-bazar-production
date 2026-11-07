'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  RiDragMove2Fill,
  RiPaintBrushLine,
  RiUser3Line,
  RiTimeLine,
  RiAlertFill,
  RiPlayFill,
  RiCheckFill,
  RiCloseFill,
  RiEyeLine,
  RiDownload2Line,
  RiFilePdfLine,
  RiShieldCheckLine,
  RiLoader4Line,
  RiArrowRightLine,
  RiSparklingFill,
  RiFileCopyLine,
  RiCheckDoubleLine,
} from 'react-icons/ri';
import { getApiHost } from '@/lib/api';

export type DesignKanbanStage = 'ARTWORK_CHECK' | 'DESIGNING' | 'WAITING_FOR_APPROVAL' | 'READY_TO_PRINT';

export interface DesignCardItem {
  id: string;
  orderId: string;
  orderNumber: string;
  stage: DesignKanbanStage;
  currentStatus: string;
  customerName?: string;
  companyName?: string;
  customerPhone?: string;
  customerEmail?: string;
  productName: string;
  quantity: number;
  priority: 'URGENT' | 'HIGH' | 'STANDARD';
  specifications: Record<string, any>;
  customerNotes?: string | null;
  designNotes?: string | null;
  revisionDirectives?: string | null;
  returnedBy?: string | null;
  returnedAt?: string | null;
  assignedDesignerId?: string | null;
  assignedDesignerName?: string | null;
  assignedDesigner?: any;
  artworkUrl?: string | null;
  artworkFileName?: string;
  artworkFile?: any;
  latestArtworkVersion?: any;
  approvedArtworkVersion?: any;
  createdAt: string;
  dueAt?: string;
}

interface DesignJobCardProps {
  card: DesignCardItem;
  userRole?: string;
  onAdvanceStage: (card: DesignCardItem, nextStage: DesignKanbanStage) => void;
  onInspect: (card: DesignCardItem) => void;
  onDragStart: (e: React.DragEvent, card: DesignCardItem) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export function DesignJobCard({
  card,
  userRole,
  onAdvanceStage,
  onInspect,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: DesignJobCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Priority color badge
  const priorityColor =
    card.priority === 'URGENT'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : card.priority === 'HIGH'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  // 1-Click Direct Artwork Download Handler
  const handleDownloadArtwork = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const rawUrl =
      card.artworkUrl ||
      card.artworkFile?.fileUrl ||
      card.latestArtworkVersion?.fileUrl ||
      card.latestArtworkVersion?.storageKey;

    if (!rawUrl) {
      alert(`No customer or prepress artwork file uploaded for Order ${card.orderNumber}.`);
      return;
    }

    setIsDownloading(true);
    const apiBase = getApiHost();

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

    const fileName =
      card.artworkFileName ||
      card.latestArtworkVersion?.originalFileName ||
      `${card.orderNumber}_Prepress_Artwork.pdf`;

    try {
      const response = await fetch(targetPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
      console.warn('Fallback opening in new tab:', err);
      window.open(targetPath, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  // Next stage recommendation
  const getNextStageInfo = () => {
    switch (card.stage) {
      case 'ARTWORK_CHECK':
        return {
          nextStage: 'DESIGNING' as DesignKanbanStage,
          label: 'Start Designing →',
          buttonClass: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold',
        };
      case 'DESIGNING':
        return {
          nextStage: 'WAITING_FOR_APPROVAL' as DesignKanbanStage,
          label: 'Send for Approval →',
          buttonClass: 'bg-purple-600 hover:bg-purple-700 text-white font-bold',
        };
      case 'WAITING_FOR_APPROVAL':
        return {
          nextStage: 'READY_TO_PRINT' as DesignKanbanStage,
          label: 'Sign-Off Ready to Print →',
          buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold',
        };
      case 'READY_TO_PRINT':
        return {
          nextStage: null,
          label: 'Press Released ✓',
          buttonClass: 'bg-slate-100 text-slate-600 cursor-default border border-slate-200',
        };
      default:
        return null;
    }
  };

  const nextInfo = getNextStageInfo();

  // Extract key specification attributes
  const specEntries: Array<{ label: string; value: string }> = [];
  if (card.specifications) {
    if (card.specifications.selectedOptions && Array.isArray(card.specifications.selectedOptions)) {
      card.specifications.selectedOptions.slice(0, 4).forEach((o: any) => {
        specEntries.push({ label: o.fieldLabel || o.label || 'Spec', value: String(o.value || '') });
      });
    } else {
      if (card.specifications.dimensions) specEntries.push({ label: 'Size', value: String(card.specifications.dimensions) });
      if (card.specifications.paperGsm) specEntries.push({ label: 'Paper', value: String(card.specifications.paperGsm) });
      if (card.specifications.finish) specEntries.push({ label: 'Finish', value: String(card.specifications.finish) });
      if (card.specifications.printMode) specEntries.push({ label: 'Mode', value: String(card.specifications.printMode) });
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onDragEnd={onDragEnd}
      className={`bg-white border rounded-xl p-3.5 shadow-xs transition-all select-none group relative flex flex-col justify-between gap-2.5 ${
        isDragging
          ? 'opacity-40 border-slate-400 scale-[0.98]'
          : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
      } ${card.revisionDirectives ? 'ring-1 ring-rose-400 bg-rose-50/20' : ''}`}
    >
      {/* Top Row: Order Number, Customer, Priority & Tactile Drag Handle */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/operations/orders/${card.orderId}`}
              className="font-mono text-[13px] font-bold text-slate-900 hover:text-amber-700 transition-colors truncate"
              title="Open Order Details"
            >
              {card.orderNumber}
            </Link>
            <span className="text-[10px] font-mono text-slate-400 font-medium truncate">
              • {card.stage.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
            {card.companyName || card.customerName || 'Direct Customer'}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold border ${priorityColor}`}>
            {card.priority}
          </span>

          {/* Dedicated Tactile Drag Handle */}
          <div
            className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-grab active:cursor-grabbing transition"
            title="Drag job to another kanban stage"
          >
            <RiDragMove2Fill className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Product Name & Quantity Pill */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-xs font-semibold text-slate-900 line-clamp-1" title={card.productName}>
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
            Prepress Specs
          </span>
        </div>

        {specEntries.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            {specEntries.slice(0, 4).map((spec, idx) => (
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
          <div className="text-[10.5px] italic text-slate-400">
            Standard prepress job specifications
          </div>
        )}

        {card.customerNotes && (
          <div className="pt-1 border-t border-slate-200/60 text-[10px] text-slate-600 line-clamp-2">
            <span className="font-bold text-slate-700">Client Note:</span> {card.customerNotes}
          </div>
        )}
      </div>

      {/* Revision Directives Warning (if returned from QC or OE) */}
      {card.revisionDirectives && (
        <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-[11px] space-y-0.5">
          <div className="flex items-center gap-1 font-bold text-rose-700 text-[10px] font-mono uppercase">
            <RiAlertFill className="h-3 w-3 text-rose-600" />
            <span>Revision Required by {card.returnedBy || 'OE Operations'}:</span>
          </div>
          <p className="line-clamp-2 italic text-rose-800">{card.revisionDirectives}</p>
        </div>
      )}

      {/* Prepress Artwork Box */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded bg-amber-100 text-amber-800 flex-shrink-0">
            <RiFilePdfLine className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-900 block truncate leading-tight">
              {card.artworkFileName || (card.artworkUrl ? 'Customer Uploaded File' : 'No Artwork File')}
            </span>
            <span className="text-[9px] font-mono text-emerald-800 font-semibold flex items-center gap-1 leading-tight mt-0.5">
              <RiShieldCheckLine className="h-3 w-3 text-emerald-600" />
              <span>
                {card.stage === 'READY_TO_PRINT'
                  ? '300 DPI Press Ready'
                  : card.latestArtworkVersion
                  ? `Proof v${card.latestArtworkVersion.versionNumber || 1}`
                  : 'Customer Artwork'}
              </span>
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={isDownloading || !card.artworkUrl}
          onClick={handleDownloadArtwork}
          className="inline-flex items-center gap-1 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-[#FFED00] font-black text-[10px] px-2.5 py-1 rounded shadow-2xs transition active:scale-95 flex-shrink-0 cursor-pointer border border-[#E3A008]/40"
          title="Download original artwork file"
        >
          {isDownloading ? (
            <RiLoader4Line className="h-3 w-3 animate-spin text-[#FFED00]" />
          ) : (
            <RiDownload2Line className="h-3 w-3" />
          )}
          <span>{isDownloading ? 'Fetching...' : 'Download'}</span>
        </button>
      </div>

      {/* Designer Assignment Badge */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 font-medium">
        <div className="flex items-center gap-1 min-w-0 truncate">
          <RiUser3Line className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="truncate">
            {card.assignedDesignerName ? `Designer: ${card.assignedDesignerName}` : 'Unassigned'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onInspect(card)}
          className="text-slate-700 hover:text-slate-950 hover:underline font-bold text-[10.5px] shrink-0"
        >
          Inspect Proofs
        </button>
      </div>

      {/* Bottom Action Button: Quick Advance Stage */}
      {nextInfo?.nextStage ? (
        <button
          type="button"
          onClick={() => onAdvanceStage(card, nextInfo.nextStage!)}
          className={`w-full h-8 text-xs rounded-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${nextInfo.buttonClass}`}
        >
          <span>{nextInfo.label}</span>
        </button>
      ) : (
        <div className="w-full h-8 text-[11px] font-mono font-bold rounded-lg flex items-center justify-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200">
          <RiCheckDoubleLine className="h-3.5 w-3.5 text-emerald-600" />
          <span>Handed over to Press Queue</span>
        </div>
      )}
    </div>
  );
}

