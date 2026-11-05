'use client';

import React, { useState } from 'react';
import { QCJobCard, QCJobCardDto } from './QCJobCard';
import {
  RiInboxLine,
  RiCheckDoubleLine,
} from 'react-icons/ri';

export interface QCColumnDefinitionDto {
  id: string;
  key: string;
  name: string;
  description?: string;
  color?: string;
  type?: 'SYSTEM' | 'HOLD' | 'APPROVED';
}

interface QCColumnProps {
  column: QCColumnDefinitionDto;
  cards: QCJobCardDto[];
  onAction: (card: QCJobCardDto, actionType: string) => void;
  onOpenInspect: (card: QCJobCardDto) => void;
  onDropJob: (columnKey: string, card: QCJobCardDto) => void;
  draggedCard: QCJobCardDto | null;
  onCardDragStart: (e: React.DragEvent, card: QCJobCardDto) => void;
  onCardDragEnd: (e: React.DragEvent) => void;
}

export function QCColumn({
  column,
  cards,
  onAction,
  onOpenInspect,
  onDropJob,
  draggedCard,
  onCardDragStart,
  onCardDragEnd,
}: QCColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  // Check if current dragged card can be dropped into this column
  const isValidDropTarget =
    draggedCard !== null &&
    (draggedCard.allowedTransitions.includes(column.key) ||
      draggedCard.status !== column.key);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = isValidDropTarget ? 'move' : 'none';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (draggedCard) {
      onDropJob(column.key, draggedCard);
    }
  };

  const columnAccentColor = column.color || '#3B82F6';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-[320px] flex-shrink-0 flex flex-col bg-slate-100/80 rounded-2xl border transition-all duration-200 ${
        isDragOver
          ? isValidDropTarget
            ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-400 shadow-md'
            : 'border-rose-400 bg-rose-50/30 ring-1 ring-rose-300'
          : isValidDropTarget && draggedCard
          ? 'border-amber-400/80 bg-amber-50/20'
          : 'border-slate-200/90'
      }`}
    >
      {/* Top Accent Color Bar */}
      <div
        className="h-1.5 w-full rounded-t-2xl flex-shrink-0"
        style={{ backgroundColor: columnAccentColor }}
      />

      {/* Column Header */}
      <div className="p-3.5 border-b border-slate-200/80 bg-white/70 rounded-t-xl flex items-center justify-between flex-shrink-0">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[13px] text-slate-900 tracking-tight uppercase truncate">
              {column.name}
            </h3>

            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white leading-none">
              {cards.length}
            </span>
          </div>

          {column.description && (
            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
              {column.description}
            </p>
          )}
        </div>

        {/* Column Type Badges */}
        <div className="flex items-center gap-1">
          {column.type === 'HOLD' && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 uppercase">
              HOLD
            </span>
          )}
          {column.type === 'APPROVED' && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
              RELEASED
            </span>
          )}
        </div>
      </div>

      {/* Column Scrollable Cards Body */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar min-h-[160px]">
        {cards.map((card) => (
          <QCJobCard
            key={card.id}
            card={card}
            onAction={onAction}
            onOpenInspect={onOpenInspect}
            onDragStart={onCardDragStart}
            onDragEnd={onCardDragEnd}
            isDragging={draggedCard?.id === card.id}
          />
        ))}

        {/* Empty State / Dropzone */}
        {cards.length === 0 && (
          <div
            className={`h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center transition-colors ${
              isDragOver && isValidDropTarget
                ? 'border-emerald-500 bg-emerald-100/50 text-emerald-800'
                : 'border-slate-300/80 bg-slate-50/50 text-slate-400'
            }`}
          >
            <RiInboxLine className="h-6 w-6 mb-1 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">No active orders</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
              {isValidDropTarget ? 'Drop order card here' : 'Queue clear for this stage'}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Drop Indicator when dragging */}
      {isDragOver && isValidDropTarget && (
        <div className="p-2 bg-emerald-500 text-white text-[11px] font-bold text-center rounded-b-xl flex items-center justify-center gap-1.5 animate-pulse">
          <RiCheckDoubleLine className="h-3.5 w-3.5" />
          <span>Release to advance to {column.name}</span>
        </div>
      )}
    </div>
  );
}
