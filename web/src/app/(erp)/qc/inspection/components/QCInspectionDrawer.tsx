'use client';

import React, { useState, useEffect } from 'react';
import {
  RiCloseLine,
  RiShieldCheckLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiAlertLine,
  RiFileCheckLine,
  RiExternalLinkLine,
  RiDownload2Line,
  RiUser3Line,
  RiMailLine,
  RiPhoneLine,
  RiSparklingLine,
  RiBox3Line,
} from 'react-icons/ri';
import { resolveImageUrl, downloadFile } from '@/lib/api';
import { QCJobCardDto } from './QCJobCard';

const DEFAULT_PRE_PROD_CHECKS = [
  { code: 'ARTWORK_VERSION_LOCKED', name: '01. Approved Artwork Version Attached & Verified', result: 'PASS' },
  { code: 'RESOLUTION_CHECK', name: '02. High Resolution (>= 300 DPI / Megapixels) Verified', result: 'PASS' },
  { code: 'COLOR_MODE', name: '03. CMYK / Pantone Calibrated (No RGB Artifacts)', result: 'PASS' },
  { code: 'BLEED_SAFE_MARGIN', name: '04. 3.0mm Bleed & 4.0mm Safe Margins Met', result: 'PASS' },
  { code: 'FINISHED_SIZE', name: '05. Finished Trim Dimensions Match Product SKU', result: 'PASS' },
  { code: 'QUANTITY_CHECK', name: '06. Batch Production Quantity Verified', result: 'PASS' },
  { code: 'PAPER_GSM', name: '07. Substrate & Paper GSM Specified & In Stock', result: 'PASS' },
  { code: 'PRINT_SIDE', name: '08. Single / Double Sided Config Verified', result: 'PASS' },
  { code: 'LAMINATION_COATING', name: '09. Thermal Lamination / Coating Specified', result: 'PASS' },
  { code: 'SPECIAL_FINISHING', name: '10. Dieline, Foil or Spot UV Layer Verified', result: 'PASS' },
  { code: 'OPERATOR_NOTES', name: '11. Customer Special Instructions Reviewed', result: 'PASS' },
  { code: 'PRODUCTION_READY', name: '12. Technical Sign-Off Authorized for Press Run', result: 'PASS' },
];

const DEFAULT_FINAL_QC_CHECKS = [
  {
    code: 'CORRECT_PRODUCT',
    name: '01. Correct product',
    desc: 'Verify product type, substrate stock & SKU match customer order specifications.',
    result: 'PASS',
  },
  {
    code: 'CORRECT_SIZE',
    name: '02. Correct size',
    desc: 'Verify finished trim dimensions, safe margins, and cut squareness match exact size.',
    result: 'PASS',
  },
  {
    code: 'CORRECT_COLOR',
    name: '03. Correct color',
    desc: 'Verify CMYK / Pantone ink density, registration, and color calibration vs proof.',
    result: 'PASS',
  },
  {
    code: 'CORRECT_QUANTITY',
    name: '04. Correct quantity',
    desc: 'Verify physical piece count and bundled quantity match customer ordered count.',
    result: 'PASS',
  },
  {
    code: 'PRINTING_QUALITY',
    name: '05. Printing Quality',
    desc: 'Verify crisp resolution (>= 300 DPI), zero banding, ghosting, or ink smearing.',
    result: 'PASS',
  },
  {
    code: 'FINISHING_QUALITY',
    name: '06. Finishing quality',
    desc: 'Verify thermal lamination adhesion, foil/UV coating, fold alignment, and dieline.',
    result: 'PASS',
  },
  {
    code: 'NO_DAMAGES',
    name: '07. No damages',
    desc: 'Verify zero torn edges, substrate warping, crushed corners, or physical defects.',
    result: 'PASS',
  },
  {
    code: 'NO_SCRATCHES',
    name: '08. No scratches',
    desc: 'Verify clean surface integrity with zero scuffs, scratches, or roller marks.',
    result: 'PASS',
  },
];

const DEFECT_OPTIONS = [
  { code: 'CUSTOMER_FILE_ERROR', label: 'Wrong Product / Specification Mismatch' },
  { code: 'BLEED_CUTTING_FAULT', label: 'Incorrect Size, Trim or Bleed Error' },
  { code: 'COLOR_MISMATCH', label: 'Color Variance / Delta-E Shift against Proof' },
  { code: 'QUANTITY_SHORT', label: 'Quantity Shortage / Missing Physical Pieces' },
  { code: 'PRINT_STREAKS', label: 'Printing Defects, Banding, Streaks or Ghosting' },
  { code: 'LAMINATION_BUBBLE', label: 'Finishing Defect, Lamination Peeling or Bubbles' },
  { code: 'DAMAGED_EDGES', label: 'Physical Damages, Tears, or Crushed Edges' },
  { code: 'PRINT_STREAKS', label: 'Surface Scratches, Roller Scuffs or Smudges' },
];

interface QCInspectionDrawerProps {
  card: QCJobCardDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitPass: (card: QCJobCardDto, checks: any[], notes: string) => Promise<void>;
  onSubmitFail: (card: QCJobCardDto, defects: string[], notes: string) => Promise<void>;
}

export function QCInspectionDrawer({
  card,
  isOpen,
  onClose,
  onSubmitPass,
  onSubmitFail,
}: QCInspectionDrawerProps) {
  const [checks, setChecks] = useState(DEFAULT_PRE_PROD_CHECKS);
  const [finalChecks, setFinalChecks] = useState(DEFAULT_FINAL_QC_CHECKS);
  const [selectedDefects, setSelectedDefects] = useState<string[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (card) {
      setChecks(DEFAULT_PRE_PROD_CHECKS);
      setFinalChecks(DEFAULT_FINAL_QC_CHECKS);
      setSelectedDefects(card.holdReason ? ['BLEED_CUTTING_FAULT'] : []);
      setGeneralNotes(card.holdReason || '');
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const handleToggleCheck = (code: string, newResult: 'PASS' | 'FAIL' | 'NOT_APPLICABLE') => {
    setFinalChecks((prev) =>
      prev.map((c) => (c.code === code ? { ...c, result: newResult } : c)),
    );
  };

  const handlePassAll = () => {
    setFinalChecks((prev) => prev.map((c) => ({ ...c, result: 'PASS' })));
  };

  const handleToggleDefect = (code: string) => {
    setSelectedDefects((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleConfirmPass = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitPass(card, finalChecks, generalNotes || 'Final physical inspection 100% verified.');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmFail = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitFail(
        card,
        selectedDefects.length > 0 ? selectedDefects : ['OTHER'],
        generalNotes || 'Quality defects detected during final inspection. Sent for rework.',
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCleanMediaUrl = () => {
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

  const artworkUrl = getCleanMediaUrl();
  const currentChecks = finalChecks;
  const hasFailure = currentChecks.some((c) => c.result === 'FAIL');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
              <RiBox3Line className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-amber-300 text-[14px]">
                  #{card.orderNumber}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Final Physical QC Inspection
                </span>
              </div>
              <h2 className="text-[15px] font-bold text-white leading-tight mt-0.5">
                {card.productName}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Customer Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px] bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-start gap-2.5">
              <RiUser3Line className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Customer</span>
                <span className="font-bold text-slate-900">{card.customerCompany || card.customerName}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <RiMailLine className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Email</span>
                <span className="font-medium text-slate-800 truncate block">{card.customerEmail || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <RiPhoneLine className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Run Quantity</span>
                <span className="font-mono font-black text-slate-900 bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px]">
                  {card.quantity.toLocaleString()} PCS
                </span>
              </div>
            </div>
          </div>

          {/* 2. Customer Artwork & Prepress Inspection Canvas */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <RiFileCheckLine className="h-4 w-4 text-blue-600" />
                <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wide">
                  Artwork & Prepress Diagnostic Canvas
                </h3>
              </div>

              {artworkUrl && (
                <div className="flex items-center gap-2">
                  <a
                    href={resolveImageUrl(artworkUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
                  >
                    <RiExternalLinkLine className="h-3 w-3" />
                    <span>Open Raw File</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => downloadFile(artworkUrl, `${card.orderNumber}_Artwork`)}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-300 cursor-pointer shadow-2xs"
                  >
                    <RiDownload2Line className="h-3 w-3" />
                    <span>Download</span>
                  </button>
                </div>
              )}
            </div>

            {artworkUrl ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="sm:col-span-5 bg-white p-2 rounded-lg border border-slate-200 flex flex-col items-center justify-center">
                  <div className="relative w-full h-56 rounded overflow-hidden bg-slate-100 flex items-center justify-center">
                    <img
                      src={resolveImageUrl(artworkUrl)}
                      alt="Customer Artwork"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as any).style.display = 'none';
                      }}
                    />
                    <div className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                      {card.artwork?.mimeType?.includes('pdf') ? 'PDF PRINT FILE' : 'HIGH-RES IMAGE'}
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-7 space-y-2.5 text-[12px]">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">File Name</span>
                    <span className="font-bold text-slate-900 text-[12px] break-all">
                      {card.artwork?.originalFileName || 'Customer_Artwork_File.pdf'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Calculated Quality:</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {card.artwork?.actualMegapixels
                          ? `${card.artwork.actualMegapixels} MP`
                          : card.artwork?.resolutionDpi
                          ? `${card.artwork.resolutionDpi} DPI`
                          : '300 DPI Verified'}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Color Profile:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        CMYK / Coated FOGRA39
                      </span>
                    </div>
                  </div>

                  {card.customerNotes && (
                    <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[11px]">
                      <span className="font-bold text-amber-900 block uppercase text-[10px]">Customer Notes:</span>
                      <p className="text-amber-800 mt-0.5">{card.customerNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-center text-slate-500">
                <RiAlertLine className="h-6 w-6 text-amber-500 mx-auto mb-1" />
                <p className="text-[13px] font-bold text-slate-700">No Direct Artwork File Uploaded</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Check if design service team completed the print file.</p>
              </div>
            )}
          </div>

          {/* 3. Technical Checklist */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-bold text-slate-900">
                    QC Inspection Checklist (Physical Verification)
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      hasFailure
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {finalChecks.filter((c) => c.result === 'PASS').length} / {finalChecks.length} Passed
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  All 8 mandatory checks must pass physical test to release order to &quot;Passed to Packing&quot;.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePassAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200 transition cursor-pointer self-start sm:self-auto"
              >
                <RiSparklingLine className="h-3.5 w-3.5 text-emerald-600" />
                <span>Verify All 8 Checks</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentChecks.map((chk: any) => {
                const isPass = chk.result === 'PASS';
                const isFail = chk.result === 'FAIL';
                return (
                  <div
                    key={chk.code}
                    className={`rounded-xl border p-3 text-[11px] transition-all flex flex-col justify-between gap-2 ${
                      isPass
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : isFail
                        ? 'border-rose-300 bg-rose-50/80 shadow-xs'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-slate-900 text-xs">{chk.name}</span>
                        {isPass && (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            VERIFIED
                          </span>
                        )}
                        {isFail && (
                          <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                            FAILED
                          </span>
                        )}
                      </div>
                      {chk.desc && (
                        <p className="text-[10.5px] text-slate-500 leading-tight">{chk.desc}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => handleToggleCheck(chk.code, 'PASS')}
                        className={`rounded-lg px-3 py-1 font-bold text-[10.5px] transition-all cursor-pointer ${
                          isPass
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        PASS
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleCheck(chk.code, 'FAIL')}
                        className={`rounded-lg px-3 py-1 font-bold text-[10.5px] transition-all cursor-pointer ${
                          isFail
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        FAIL
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasFailure && (
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-rose-900 uppercase block">
                  Tag Quality Defect Categories:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {DEFECT_OPTIONS.map((def) => {
                    const isSelected = selectedDefects.includes(def.code);
                    return (
                      <button
                        key={def.code}
                        type="button"
                        onClick={() => handleToggleDefect(def.code)}
                        className={`text-left p-2 rounded-lg text-[11px] font-medium border transition ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-rose-200 hover:bg-rose-100/50'
                        }`}
                      >
                        {def.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Inspector Sign-off Notes & Remarks
              </label>
              <input
                type="text"
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="e.g. Verified color density, cut squareness, and count verified for packing."
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-[12px] text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-[12px] font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmFail}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl font-bold text-[12px] transition"
            >
              <RiCloseCircleLine className="h-4 w-4" />
              <span>REJECT & SEND TO REWORK</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting || hasFailure}
              onClick={handleConfirmPass}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl font-bold text-[12px] transition shadow-xs"
            >
              <RiCheckboxCircleLine className="h-4 w-4" />
              <span>
                {isSubmitting
                  ? 'Processing Final QC Sign-Off...'
                  : 'PASS & RELEASE TO PACKING'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
