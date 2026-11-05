'use client';

import React from 'react';
import {
  RiCheckboxCircleFill,
  RiArrowRightSLine,
} from 'react-icons/ri';

export type PackingStep = 1 | 2 | 3 | 4;

interface PackingProgressProps {
  currentStep: PackingStep;
  onSelectStep?: (step: PackingStep) => void;
}

export function PackingProgress({ currentStep }: PackingProgressProps) {
  const steps = [
    { number: 1, label: 'SELECT JOB', description: 'Order from Queue' },
    { number: 2, label: 'PACK & WEIGH', description: 'Carton & Scale' },
    { number: 3, label: 'VERIFY & LABEL', description: '4×6 Thermal Label' },
    { number: 4, label: 'COMPLETE', description: 'Move to Dispatch' },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {steps.map((step, idx) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;

          return (
            <div
              key={step.number}
              className={`flex items-center gap-2.5 p-2 rounded-lg border transition ${
                isCurrent
                  ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                  : isCompleted
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div
                className={`h-7 w-7 rounded-md flex items-center justify-center font-mono font-bold text-xs shrink-0 transition ${
                  isCurrent
                    ? 'bg-[#FFED00] text-slate-950 shadow-2xs border border-[#E3A008]/50'
                    : isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isCompleted ? <RiCheckboxCircleFill className="h-4 w-4" /> : `0${step.number}`}
              </div>

              <div className="min-w-0 flex-1">
                <span
                  className={`text-[11px] font-black uppercase tracking-wider block truncate ${
                    isCurrent
                      ? 'text-slate-900'
                      : isCompleted
                      ? 'text-emerald-900'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-slate-400 block truncate font-medium">
                  {step.description}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <RiArrowRightSLine className="h-4 w-4 text-slate-300 hidden md:block shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
