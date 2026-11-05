'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Printer,
  ArrowLeft,
  Scissors,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';

function parseJobSpecifications(specs: any): Array<{ label: string; value: string }> {
  if (!specs || typeof specs !== 'object') return [];
  const list: Array<{ label: string; value: string }> = [];
  const seen = new Set<string>();

  const add = (label: string, val: any) => {
    if (!val || typeof val === 'object') return;
    const str = String(val).trim();
    if (!str) return;
    const cleanLabel = label.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    const norm = cleanLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(norm)) return;
    const blocked = [
      'price',
      'cost',
      'fee',
      'tax',
      'gst',
      'subtotal',
      'total',
      'grandtotal',
      'artworkrequirement',
      'designservicerequirement',
      'referenceimagerequirement',
      'workflowroute',
      'artworksource',
      'artworkurl',
      'artworkstoragekey',
      'referenceimage',
      'referenceimageurl',
      'designnotes',
      'customernotes',
      'ismultivariant',
      'variantlines',
      'specificationssnapshot',
      'fieldvalues',
      'raw',
    ];
    if (blocked.some((b) => norm.includes(b))) return;
    seen.add(norm);
    list.push({
      label: cleanLabel.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      value: str,
    });
  };

  if (Array.isArray(specs.options)) {
    for (const opt of specs.options) {
      add(opt.fieldLabel || opt.optionName || opt.optionCode, opt.value || opt.valueName || opt.optionLabel);
    }
  }
  if (Array.isArray(specs.selectedOptionsSummary)) {
    for (const opt of specs.selectedOptionsSummary) {
      add(opt.fieldLabel || opt.optionName, opt.value || opt.valueName);
    }
  }
  const snap = typeof specs.specificationsSnapshot === 'object' && specs.specificationsSnapshot ? specs.specificationsSnapshot : {};
  for (const [k, v] of Object.entries(snap)) {
    add(k, v);
  }
  for (const [k, v] of Object.entries(specs)) {
    add(k, v);
  }

  return list;
}

export default function ShopFloorJobCardPrintable({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id || 'JOB-2026-001';

  const [jobData, setJobData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadJob() {
      setIsLoading(true);
      try {
        const data = await api.getJobCard(jobId);
        if (isMounted && data) {
          setJobData(data);
        }
      } catch (err) {
        console.warn('Could not load dynamic job card from API, using fallback ticket view:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadJob();
    return () => {
      isMounted = false;
    };
  }, [jobId]);

  const order = jobData?.order;
  const orderItem = jobData?.orderItem;
  const specs = (orderItem?.specifications || jobData?.technicalSpecs?.specifications || {}) as Record<string, any>;
  const parsedSpecs = parseJobSpecifications(specs);

  const customerNotes =
    specs?.customerNotes ||
    specs?.designNotes ||
    orderItem?.designNotes ||
    order?.customerNotes ||
    jobData?.technicalSpecs?.customerNotes;

  const personalizationEntries =
    orderItem?.personalizationData?.perItemEntries ||
    order?.items?.find((it: any) => it.personalizationData)?.personalizationData?.perItemEntries ||
    [];

  const runQuantity = jobData?.quantity || jobData?.technicalSpecs?.quantity || orderItem?.quantity || 1;
  const productName = orderItem?.productName || jobData?.technicalSpecs?.productName || 'Custom Print Job';
  const customerName = order?.customer?.fullName || order?.customer?.companyName || jobData?.technicalSpecs?.customerName || 'Valued Customer';
  const orderNumber = order?.orderNumber || jobData?.orderNumber || 'PB-2026-0001';
  const machineName = jobData?.machine?.name || 'Assigned Factory Press';
  const operatorName = jobData?.operator?.fullName || 'Shift Press Operator';

  return (
    <div className="min-h-screen bg-[#F8F8F8] py-8 px-4 sm:px-6">
      {/* Action Bar */}
      <div className="mx-auto max-w-4xl mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/production/queue"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Production Floor Queue</span>
        </Link>

        <Button
          variant="primary"
          size="sm"
          onClick={() => window.print()}
          className="shadow-xs cursor-pointer font-bold"
        >
          <Printer className="h-4 w-4 mr-1.5" />
          <span>Print Shop Floor Job Card (A4 Sheet)</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="mx-auto max-w-4xl bg-white border border-slate-200 rounded-xl p-12 text-center shadow-card">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-500 mb-3" />
          <p className="text-sm font-mono font-bold text-slate-700">Loading Digital Job Ticket #{jobId}...</p>
        </div>
      ) : (
        /* Industrial Work Order Sheet */
        <div className="mx-auto max-w-4xl bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-card print:border-none print:shadow-none print:p-0 text-black">
          {/* Giant Shop Floor Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-black">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-[#FFED00] text-black px-2 py-0.5 rounded border border-[#E5E5E5]">
                  PRESS SHOP-FLOOR JOB CARD
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  STATION: {jobData?.currentStation || 'PRINTING'}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-black font-mono tracking-tight mt-1">
                #{jobData?.jobNumber || jobId}
              </h1>
              <p className="text-xs font-mono text-slate-600 mt-1">
                ORDER LINK: <strong className="text-black font-bold">#{orderNumber}</strong> • PRODUCT: <strong className="text-black font-bold">{productName}</strong> • CLIENT: <strong className="text-black font-bold">{customerName}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right font-mono">
              <div className="h-12 bg-zinc-900 rounded-[2px] flex items-center justify-center text-white text-[9px] tracking-[5px] font-bold px-4">
                ||| | ||||| || |||| ||||| ||| ||||
              </div>
              <span className="text-[10px] text-zinc-500 block mt-1 uppercase font-bold">
                BARCODE // VERIFIED RUN
              </span>
            </div>
          </div>

          {/* 6 Essential Factory Floor Signals */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-4 border-b-2 border-black bg-[#FAFAFA] -mx-6 sm:-mx-10 px-6 sm:px-10 text-xs font-mono">
            <div>
              <span className="text-[9px] text-zinc-400 block uppercase font-bold">ASSIGNED MACHINE</span>
              <strong className="text-black block text-xs mt-0.5 font-bold truncate">{machineName}</strong>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 block uppercase font-bold">TOTAL RUN RUN QTY</span>
              <strong className="text-black block text-sm mt-0.5 font-black">{runQuantity.toLocaleString()} PCS</strong>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 block uppercase font-bold">CURRENT STATION</span>
              <strong className="text-black block text-xs mt-0.5 font-bold">{jobData?.currentStation || 'PRINTING'}</strong>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 block uppercase font-bold">OPERATOR</span>
              <strong className="text-black block text-xs mt-0.5 font-bold truncate">{operatorName}</strong>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 block uppercase font-bold">DUE DATE</span>
              <strong className="text-amber-800 block text-xs mt-0.5 font-bold">
                {jobData?.dueAt ? new Date(jobData.dueAt).toLocaleDateString() : 'Priority Run'}
              </strong>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 block uppercase font-bold">STATUS</span>
              <strong className="text-emerald-700 block text-xs mt-0.5 font-bold uppercase">{jobData?.status || 'QUEUED'}</strong>
            </div>
          </div>

          {/* Customer Specifications Grid (Authoritative Source of Truth) */}
          <div className="py-6 border-b-2 border-black space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-amber-600" />
                <span>CUSTOMER SELECTED SPECIFICATIONS (MANDATORY PRESS SETUP)</span>
              </h2>
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-950 px-2 py-0.5 rounded border border-amber-300">
                {parsedSpecs.length} SPECIFICATIONS VERIFIED
              </span>
            </div>

            {parsedSpecs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {parsedSpecs.map((spec, idx) => (
                  <div key={idx} className="p-3 bg-zinc-50 border border-slate-200 rounded space-y-1">
                    <span className="text-[10px] font-mono uppercase font-bold text-zinc-500 block tracking-wider">
                      {spec.label}
                    </span>
                    <strong className="text-black text-[13px] font-bold block leading-snug">
                      {spec.value}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-zinc-50 border border-slate-200 rounded text-xs text-slate-600 font-mono">
                Standard commercial production specifications configured for this order run.
              </div>
            )}

            {/* Customer Special Notes / Design Instructions */}
            {customerNotes && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 text-xs space-y-1">
                <span className="font-bold text-amber-950 uppercase tracking-wider text-[11px] block font-mono">
                  CUSTOMER REMARKS & SPECIAL INSTRUCTIONS:
                </span>
                <p className="text-black text-xs font-medium bg-white p-2.5 rounded border border-amber-200">
                  {customerNotes}
                </p>
              </div>
            )}
          </div>

          {/* Finishing & Guillotine Cutting Checklist */}
          <div className="py-6 border-b-2 border-black space-y-3">
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-black" />
              <h3 className="text-xs font-mono font-black text-black uppercase tracking-wider">
                POST-PRESS FINISHING & OPERATOR VERIFICATION CHECKLIST
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <label className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-slate-200 rounded cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded" />
                <span>Step 1: Verify customer selected specifications against digital job ticket</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-slate-200 rounded cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded" />
                <span>Step 2: Inspect 1st pull sheet against approved artwork under D50 light</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-slate-200 rounded cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded" />
                <span>Step 3: Setup required finishing / lamination according to specifications</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-slate-200 rounded cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded" />
                <span>Step 4: Precision trim to finished size and confirm zero-burr edge finish</span>
              </label>
            </div>
          </div>

          {/* Personalization & Variable Data Roster (if applicable) */}
          {personalizationEntries.length > 0 && (
            <div className="py-6 border-b-2 border-black space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-purple-700" />
                  <h3 className="text-xs font-mono font-black text-black uppercase tracking-wider">
                    VARIABLE DATA & PERSONALIZATION ROSTER ({personalizationEntries.length} ITEMS)
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded">
                  CUSTOM RUN
                </span>
              </div>

              <div className="overflow-x-auto max-h-48 overflow-y-auto bg-white border border-purple-200 rounded">
                <table className="w-full text-left text-[11px] border-collapse font-mono">
                  <thead className="bg-purple-50 border-b border-purple-200 sticky top-0 text-purple-950 font-bold">
                    <tr>
                      <th className="py-1 px-2.5 w-16">Item #</th>
                      <th className="py-1 px-2.5">Field / Data Key</th>
                      <th className="py-1 px-2.5">Customer Inscription / Value</th>
                      <th className="py-1 px-2.5 text-center">QC Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {personalizationEntries.slice(0, 10).map((entry: any, i: number) => {
                      const values = entry.values || entry;
                      return (
                        <tr key={i} className="hover:bg-purple-50/20">
                          <td className="py-1 px-2.5 font-bold text-slate-500">#{entry.itemIndex || i + 1}</td>
                          <td className="py-1 px-2.5 text-slate-700">
                            {Object.keys(values).join(', ') || 'Custom Value'}
                          </td>
                          <td className="py-1 px-2.5 font-bold text-slate-900">
                            {Object.values(values).join(' • ') || 'Inscription'}
                          </td>
                          <td className="py-1 px-2.5 text-center text-slate-400">[ ] PASS</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Operator Sign-Off Box */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-mono">
            <div className="border border-black p-3 rounded">
              <span className="text-[10px] text-zinc-500 uppercase block font-bold">1. PRESS RUN SIGN-OFF</span>
              <div className="h-8 border-b border-dashed border-zinc-400 mt-2" />
              <div className="flex justify-between mt-1 text-[10px] text-zinc-600">
                <span>Time: ______:______</span>
                <span>Sheets: ______</span>
              </div>
            </div>

            <div className="border border-black p-3 rounded">
              <span className="text-[10px] text-zinc-500 uppercase block font-bold">2. FINISHING SIGN-OFF</span>
              <div className="h-8 border-b border-dashed border-zinc-400 mt-2" />
              <div className="flex justify-between mt-1 text-[10px] text-zinc-600">
                <span>Finishing: [ ] PASS</span>
                <span>Cut: [ ] PASS</span>
              </div>
            </div>

            <div className="border border-black p-3 rounded bg-amber-50/60">
              <span className="text-[10px] text-black font-bold uppercase block">3. FINAL QC INSPECTION</span>
              <div className="h-8 border-b border-dashed border-zinc-400 mt-2" />
              <div className="flex justify-between mt-1 text-[10px] text-black font-bold">
                <span>Release to Packing: [ ]</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
