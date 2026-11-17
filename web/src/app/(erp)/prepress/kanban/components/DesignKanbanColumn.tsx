'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DesignCardItem, DesignJobCard, DesignKanbanStage } from './DesignJobCard';
import { PrepressColumnConfig } from './DesignColumnEditModal';
import {
  RiInboxLine,
  RiCheckDoubleLine,
  RiMore2Fill,
  RiEditLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
} from 'react-icons/ri';

interface DesignKanbanColumnProps {
  column: PrepressColumnConfig;
  cards: DesignCardItem[];
  userRole?: string;
  onAdvanceStage: (card: DesignCardItem, nextStage: DesignKanbanStage) => void;
  onInspect: (card: DesignCardItem) => void;
  onDropJob: (columnKey: DesignKanbanStage, cardOrId: DesignCardItem | string) => void;
  draggedCard: DesignCardItem | null;
  onCardDragStart: (e: React.DragEvent, card: DesignCardItem) => void;
  onCardDragEnd: (e: React.DragEvent) => void;
  onEditColumn?: (col: PrepressColumnConfig) => void;
  onDeleteColumn?: (col: PrepressColumnConfig) => void;
  onMoveColumn?: (col: PrepressColumnConfig, direction: 'left' | 'right') => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
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
  onEditColumn,
  onDeleteColumn,
  onMoveColumn,
  canMoveLeft = false,
  canMoveRight = false,
}: DesignKanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = React.useRef(0);

  // Close menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Dropping into this column is valid if dragging a card from a different column
  const isValidDropTarget = draggedCard !== null && draggedCard.stage !== column.key;

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    // 1. Try to read card identifier from dataTransfer payload
    let cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) {
      try {
        const json = e.dataTransfer.getData('application/json');
        if (json) {
          const parsed = JSON.parse(json);
          cardId = parsed.id || parsed.orderId;
        }
      } catch { }
    }

    if (cardId) {
      onDropJob(column.key, cardId);
    } else if (draggedCard && draggedCard.stage !== column.key) {
      onDropJob(column.key, draggedCard);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-[320px] flex-shrink-0 flex flex-col bg-slate-100/80 rounded-2xl border transition-all duration-200 ${isDragOver
          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-400 shadow-lg scale-[1.01]'
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
      <div className="p-3.5 border-b border-slate-200/80 bg-white/70 rounded-t-xl flex items-center justify-between flex-shrink-0 relative">
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

        {/* Column Quick Actions Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 transition"
            title="Column actions"
          >
            <RiMore2Fill className="h-4 w-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
              {onEditColumn && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEditColumn(column);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2"
                >
                  <RiEditLine className="h-3.5 w-3.5 text-slate-500" />
                  <span>Edit Column</span>
                </button>
              )}

              {onMoveColumn && canMoveLeft && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onMoveColumn(column, 'left');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2"
                >
                  <RiArrowLeftSLine className="h-3.5 w-3.5 text-slate-500" />
                  <span>Move Left</span>
                </button>
              )}

              {onMoveColumn && canMoveRight && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onMoveColumn(column, 'right');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2"
                >
                  <RiArrowRightSLine className="h-3.5 w-3.5 text-slate-500" />
                  <span>Move Right</span>
                </button>
              )}

              {onDeleteColumn && (
                <>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDeleteColumn(column);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2"
                  >
                    <RiDeleteBinLine className="h-3.5 w-3.5 text-rose-500" />
                    <span>Delete Column</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Cards Container */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="p-3 space-y-3 min-h-[450px] max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar flex-1"
      >
        {cards.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="h-44 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 text-center text-slate-400"
          >
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
