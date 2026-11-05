'use client';

import { useState } from 'react';
import {
  Settings,
  Factory,
  Save,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  Printer,
  Sliders,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            <span>PLANT ADMINISTRATION</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">HARD GATES & SLA THRESHOLDS</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Factory Plant & Operating System Settings
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Configure physical plant locations, SLA alert thresholds, courier API keys, and machine work centers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] px-4 py-2 rounded-lg shadow-sm transition active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>SAVE PLANT SETTINGS</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[13px] font-medium rounded-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Plant settings successfully saved and applied to ERP backend engine.</span>
        </div>
      )}

      {/* 2. Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Plant Details */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Factory className="h-4 w-4 text-slate-900" />
            <h2 className="text-[15px] sm:text-[16px] font-semibold text-slate-900">Primary Production Plant Location</h2>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[12px] sm:text-[13px] font-medium text-slate-700 block mb-1.5">Company Registered Name</label>
              <input
                type="text"
                defaultValue="Print Bazzar Manufacturing Pvt. Ltd."
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-[14px] font-normal leading-[1.4] text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-[12px] sm:text-[13px] font-medium text-slate-700 block mb-1.5">GSTIN (Authoritative)</label>
              <input
                type="text"
                defaultValue="27AABCP8920K1ZM"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg font-mono font-semibold text-[14px] text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 tabular-nums"
              />
            </div>

            <div>
              <label className="text-[12px] sm:text-[13px] font-medium text-slate-700 block mb-1.5">Press Complex Address</label>
              <textarea
                rows={3}
                defaultValue="Plot 42-C, Industrial Area Phase 2, Press Complex, Lower Parel, Mumbai, MH — 400013"
                className="w-full p-3 bg-white border border-slate-300 rounded-lg text-[14px] font-normal leading-[1.4] text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        {/* SLA & Production Thresholds */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Clock className="h-4 w-4 text-slate-900" />
            <h2 className="text-[15px] sm:text-[16px] font-semibold text-slate-900">Automated SLA Risk Triggers</h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <strong className="block text-[13px] font-semibold text-slate-900">Proof Sign-off Warning Threshold</strong>
                <span className="text-[12px] text-slate-500">Alert sales if customer doesn't sign off proof</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  defaultValue={4}
                  className="w-16 font-mono font-semibold text-[13px] tabular-nums p-1.5 bg-white border border-slate-300 rounded-md text-center focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
                <span className="font-mono text-slate-500 text-[12px]">Hours</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <strong className="block text-[13px] font-semibold text-slate-900">Pre-Production QC Hard Gate Timeout</strong>
                <span className="text-[12px] text-slate-500">Flag SLA risk if file remains in Pre-QC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  defaultValue={2}
                  className="w-16 font-mono font-semibold text-[13px] tabular-nums p-1.5 bg-white border border-slate-300 rounded-md text-center focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
                <span className="font-mono text-slate-500 text-[12px]">Hours</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <strong className="block text-[13px] font-semibold text-slate-900">Final QC to Courier Handover SLA</strong>
                <span className="text-[12px] text-slate-500">Maximum allowed buffer in packaging station</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  defaultValue={3}
                  className="w-16 font-mono font-semibold text-[13px] tabular-nums p-1.5 bg-white border border-slate-300 rounded-md text-center focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
                <span className="font-mono text-slate-500 text-[12px]">Hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
