'use client';

import React from 'react';
import {
  RiSearch2Line,
  RiFilter3Line,
  RiUser3Line,
  RiFlagLine,
  RiTimeLine,
  RiRefreshLine,
  RiPaintBrushLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui';

interface DesignKanbanFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  stageFilter: string;
  onStageChange: (val: string) => void;
  designerFilter: string;
  onDesignerChange: (val: string) => void;
  priorityFilter: string;
  onPriorityChange: (val: string) => void;
  availableDesigners: Array<{ id: string; fullName: string }>;
  onReset: () => void;
  hasActiveFilters: boolean;
  totalCount: number;
  filteredCount: number;
}

export function DesignKanbanFilters({
  search,
  onSearchChange,
  stageFilter,
  onStageChange,
  designerFilter,
  onDesignerChange,
  priorityFilter,
  onPriorityChange,
  availableDesigners,
  onReset,
  hasActiveFilters,
  totalCount,
  filteredCount,
}: DesignKanbanFiltersProps) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Order (PB-2026-0001), Customer, Product, Specs..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 transition font-sans"
          />
          <RiSearch2Line className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-mono"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={stageFilter}
              onChange={(e) => onStageChange(e.target.value)}
              className="w-full h-9 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium appearance-none focus:outline-none focus:border-slate-900 focus:bg-white transition"
            >
              <option value="ALL">All Stages (4 Gates)</option>
              <option value="ARTWORK_CHECK">Artwork Check</option>
              <option value="DESIGNING">Designing</option>
              <option value="WAITING_FOR_APPROVAL">Waiting for Approval</option>
              <option value="READY_TO_PRINT">Ready to Print</option>
            </select>
            <RiPaintBrushLine className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Designer Filter */}
          <div className="relative min-w-[150px]">
            <select
              value={designerFilter}
              onChange={(e) => onDesignerChange(e.target.value)}
              className="w-full h-9 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium appearance-none focus:outline-none focus:border-slate-900 focus:bg-white transition"
            >
              <option value="ALL">All Designers</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {availableDesigners.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
            <RiUser3Line className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Priority Filter */}
          <div className="relative min-w-[130px]">
            <select
              value={priorityFilter}
              onChange={(e) => onPriorityChange(e.target.value)}
              className="w-full h-9 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium appearance-none focus:outline-none focus:border-slate-900 focus:bg-white transition"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Rush</option>
              <option value="HIGH">High Priority</option>
              <option value="STANDARD">Standard</option>
            </select>
            <RiFlagLine className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-9 px-2.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <RiRefreshLine className="h-3.5 w-3.5 mr-1" />
              <span>Reset</span>
            </Button>
          )}

          {/* Live Count Pill */}
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200 text-xs font-mono text-slate-500">
            <span className="font-bold text-slate-900">{filteredCount}</span>
            <span>of {totalCount} jobs</span>
          </div>
        </div>
      </div>
    </div>
  );
}

