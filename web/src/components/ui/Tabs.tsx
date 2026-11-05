'use client';

import React from 'react';
import { cn } from './index';

interface TabsProps {
  tabs: { id: string; label: string; count?: number; icon?: React.ComponentType<{ className?: string }> }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'pills' | 'underline';
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
  variant = 'pills',
}: TabsProps) {
  if (variant === 'underline') {
    return (
      <div className={cn('flex items-center gap-6 border-b border-slate-200', className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 py-3 text-xs font-bold transition-all relative border-b-2 -mb-px',
                isActive
                  ? 'border-[#FFED00] text-slate-950 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                    isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 w-fit',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
              isActive
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  isActive ? 'bg-[#FFED00] text-slate-950' : 'bg-slate-200 text-slate-600'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
