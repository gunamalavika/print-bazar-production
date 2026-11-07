'use client';

import React, { useState } from 'react';
import { DesignCardItem, DesignJobCard, DesignKanbanStage } from './DesignJobCard';
import {
  RiInboxLine,
  RiCheckDoubleLine,
} from 'react-icons/ri';

interface ColumnConfig {
  key: DesignKanbanStage;
  name: string;
  subtitle: string;
  color: string;
  description: string;
}

interface DesignKanbanColumnProps {
  column: ColumnConfig;
  cards: DesignCardItem[];
  userRole?: string;
  onAdvanceStage: (card: DesignCardItem, nextStage: DesignKanbanStage) => void;
  onInspect: (card: DesignCardItem) => void;
  onDropJob: (columnKey: DesignKanbanStage, card: DesignCardItem) => void;
  draggedCard: DesignCardItem | null;
  onCardDragStart: (e: React.DragEvent, card: DesignCardItem) => void;
  onCardDragEnd: (e: React.DragEvent) => void;
}

export function DesignKanbanColumn({
  column,
  cards,
  userRole,
  onAdvanceStage,
  onInspect,
  onDropJob,
  draggedCard,
  onCardDragStart,
  onCardDragEnd,
}: DesignKanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  // Dropping into this column is valid if dragging a card from a different column
  const isValidDropTarget = draggedCard !== null && draggedCard.stage !== column.key;

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
    if (draggedCard && draggedCard.stage !== column.key) {
      onDropJob(column.key, draggedCard);
    }
  };

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
        style={{ backgroundColor: column.color }}
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

          <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
            {column.subtitle}
          </p>
        </div>
      </div>

      {/* Scrollable Cards Container */}
      <div className="p-3 space-y-3 min-h-[450px] max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar flex-1">
        {cards.length === 0 ? (
          <div className="h-44 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 text-center text-slate-400">
            <RiInboxLine className="h-7 w-7 text-slate-300 mb-1.5" />
            <span className="text-xs font-semibold text-slate-600 block">No jobs in {column.name}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
              Drag jobs here or advance from previous gate
            </span>
          </div>
        ) : (
          cards.map((card) => (
            <DesignJobCard
              key={card.id}
              card={card}
              userRole={userRole}
              onAdvanceStage={onAdvanceStage}
              onInspect={onInspect}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
              isDragging={draggedCard?.id === card.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

