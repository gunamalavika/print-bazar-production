'use client';

import React from 'react';
import Link from 'next/link';
import {
  RiDragMove2Fill,
  RiShieldCheckLine,
  RiUser3Line,
  RiTimeLine,
  RiAlertFill,
  RiPlayFill,
  RiCheckFill,
  RiCloseFill,
  RiEyeLine,
  RiFileCheckLine,
  RiImageLine,
} from 'react-icons/ri';
import { resolveImageUrl } from '@/lib/api';

export interface QCJobCardDto {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerCompany?: string;
  customerEmail?: string;
  customerPhone?: string;
  productName: string;
  sku?: string;
  quantity: number;
  specifications: {
    paperGsm?: string;
    finish?: string;
    printMode?: string;
    dimensions?: string;
    sides?: string;
    raw?: Record<string, any>;
  };
  artwork?: {
    fileUrl?: string;
    storageKey?: string;
    originalFileName?: string;
    mimeType?: string;
    resolutionDpi?: number;
    actualMegapixels?: number;
    colorMode?: string;
  } | null;
  status: string; // 'QUEUED' | 'IN_INSPECTION' | 'ON_HOLD' | 'APPROVED'
  type: 'FINAL_QC';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  slaStatus: 'ON_TIME' | 'DUE_SOON' | 'OVERDUE';
  slaBadgeText: string;
  timeInfo: {
    label: string;
    text: string;
  };
  allowedTransitions: string[];
  holdReason?: string;
  isHeld: boolean;
  customerNotes?: string;
  createdAt: string;
}

interface QCJobCardProps {
  card: QCJobCardDto;
  onAction: (card: QCJobCardDto, actionType: string) => void;
  onOpenInspect: (card: QCJobCardDto) => void;
  onDragStart: (e: React.DragEvent, card: QCJobCardDto) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export function QCJobCard({
  card,
  onAction,
  onOpenInspect,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: QCJobCardProps) {
  // Priority color
  const priorityColor =
    card.priority === 'URGENT'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : card.priority === 'HIGH'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  // SLA color badge
  const slaBadgeColor =
    card.slaStatus === 'OVERDUE'
      ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300 animate-pulse'
      : card.slaStatus === 'DUE_SOON'
      ? 'bg-amber-100 text-amber-900 font-semibold border border-amber-300'
      : 'bg-emerald-50 text-emerald-800 font-medium border border-emerald-200';

  // Artwork thumbnail
  const getThumbnailUrl = () => {
    if (!card.artwork) return null;
    if (card.artwork.fileUrl) return card.artwork.fileUrl;
    if (card.artwork.storageKey) {
      if (card.artwork.storageKey.startsWith('http') || card.artwork.storageKey.startsWith('/uploads')) {
        return card.artwork.storageKey;
      }
      return `/uploads/artwork/${card.artwork.storageKey.replace('artwork/', '')}`;
    }
    return null;
  };

  const thumbUrl = getThumbnailUrl();

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
            <button
              onClick={() => onOpenInspect(card)}
              className="font-mono text-[13px] font-bold text-slate-900 hover:text-blue-700 transition-colors truncate text-left"
              title="Open QC Inspection Sheet"
            >
              #{card.orderNumber}
            </button>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold border bg-amber-50 text-amber-800 border-amber-200">
              FINAL QC
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
            title="Drag card across quality stages"
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

      {/* Specifications Snapshot */}
      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] text-slate-600 space-y-0.5">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-semibold text-slate-700">Substrate:</span>
          <span className="truncate">{card.specifications.paperGsm || '350 GSM Art Board'}</span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-semibold text-slate-700">Finishing:</span>
          <span className="truncate">{card.specifications.finish || 'Thermal Lamination'}</span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-semibold text-slate-700">Artwork:</span>
          <span className="truncate font-mono text-emerald-700 font-bold">
            {card.artwork?.actualMegapixels
              ? `${card.artwork.actualMegapixels} MP CMYK`
              : card.artwork?.resolutionDpi
              ? `${card.artwork.resolutionDpi} DPI Verified`
              : '300 DPI CMYK Ready'}
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
        <button
          type="button"
          onClick={() => onOpenInspect(card)}
          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 py-1 px-1.5 rounded hover:bg-slate-100 transition"
        >
          <RiEyeLine className="h-3.5 w-3.5" />
          <span>Inspect</span>
        </button>

        {/* Dynamic Contextual Action based on Card Status */}
        <div className="flex items-center gap-1">
          {card.status === 'QUEUED' && (
            <button
              type="button"
              onClick={() => onAction(card, 'START_INSPECTION')}
              className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-[11px] px-2.5 py-1 rounded-md shadow-xs transition active:scale-95"
            >
              <RiPlayFill className="h-3 w-3" />
              <span>Start Review</span>
            </button>
          )}

          {/* Under Review -> 1-Click Pass or Fail */}
          {card.status === 'IN_INSPECTION' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onAction(card, 'QC_PASS')}
                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-md shadow-xs transition active:scale-95"
                title="1-Click Pass 100% and release"
              >
                <RiCheckFill className="h-3 w-3" />
                <span>Pass Gate</span>
              </button>
              <button
                onClick={() => onAction(card, 'QC_HOLD')}
                className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] px-2 py-1 rounded-md border border-rose-200 transition"
                title="Flag Technical Defect / Hold"
              >
                <RiAlertFill className="h-3 w-3" />
                <span>Hold</span>
              </button>
            </div>
          )}

          {/* On Hold -> Re-inspect */}
          {card.status === 'ON_HOLD' && (
            <button
              onClick={() => onOpenInspect(card)}
              className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] px-2.5 py-1 rounded-md shadow-xs transition active:scale-95"
            >
              <RiShieldCheckLine className="h-3 w-3" />
              <span>Resolve Hold</span>
            </button>
          )}

          {/* Approved -> Released Badge */}
          {card.status === 'APPROVED' && (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
              <RiCheckFill className="h-3 w-3" />
              RELEASED
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
