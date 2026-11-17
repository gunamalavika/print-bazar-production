'use client';

import React from 'react';
import {
  RiSearch2Line,
  RiFilter3Line,
  RiBox3Line,
  RiRefreshLine,
  RiCheckboxCircleLine,
} from 'react-icons/ri';
import { PackingJobCard, PackingJobDto } from './PackingJobCard';

interface PackingJobQueueProps {
  jobs: PackingJobDto[];
  selectedJobId: string | null;
  onSelectJob: (job: PackingJobDto) => void;
  search: string;
  onSearchChange: (val: string) => void;
  filterTab: string;
  onFilterTabChange: (val: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function PackingJobQueue({
  jobs,
  selectedJobId,
  onSelectJob,
  search,
  onSearchChange,
  filterTab,
  onFilterTabChange,
  onRefresh,
  isLoading,
}: PackingJobQueueProps) {
  const filteredJobs = jobs.filter((job) => {
    if (filterTab === 'URGENT' && job.priority !== 'URGENT') return false;
    if (filterTab === 'HIGH' && job.priority !== 'HIGH' && job.priority !== 'URGENT') return false;
    if (filterTab === 'COURIER' && job.deliveryMethod !== 'COURIER') return false;
    if (filterTab === 'PICKUP' && job.deliveryMethod !== 'STORE_PICKUP') return false;
    return true;
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col h-auto lg:h-[calc(100vh-210px)] lg:sticky lg:top-4">
      {/* Queue Header */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-mono">
              Ready for Packing
            </h3>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
              {jobs.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Orders passed Final QC inspection.
          </p>
        </div>

        <button
          onClick={onRefresh}
          title="Refresh Queue"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer"
        >
          <RiRefreshLine className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-slate-100 bg-white space-y-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Order #, Customer, SKU..."
            className="w-full h-8.5 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition"
          />
          <RiSearch2Line className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px] font-bold custom-scrollbar">
          <button
            type="button"
            onClick={() => onFilterTabChange('ALL')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer flex-shrink-0 ${
              filterTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({jobs.length})
          </button>
          <button
            type="button"
            onClick={() => onFilterTabChange('URGENT')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer flex-shrink-0 ${
              filterTab === 'URGENT'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Urgent
          </button>
          <button
            type="button"
            onClick={() => onFilterTabChange('COURIER')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer flex-shrink-0 ${
              filterTab === 'COURIER'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Courier
          </button>
          <button
            type="button"
            onClick={() => onFilterTabChange('PICKUP')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer flex-shrink-0 ${
              filterTab === 'PICKUP'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pickup
          </button>
        </div>
      </div>

      {/* Queue Cards List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
        {filteredJobs.length === 0 ? (
          <div className="h-56 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <RiBox3Line className="h-8 w-8 text-slate-300 mb-2" />
            <span className="text-xs font-bold text-slate-700">No Jobs Waiting</span>
            <span className="text-[11px] text-slate-400 mt-1 max-w-[180px]">
              All approved jobs have been packaged.
            </span>
            <button
              onClick={onRefresh}
              className="mt-3 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs transition cursor-pointer"
            >
              Refresh Queue
            </button>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <PackingJobCard
              key={job.id}
              job={job}
              isSelected={selectedJobId === job.id}
              onSelect={onSelectJob}
            />
          ))
        )}
      </div>
    </div>
  );
}
