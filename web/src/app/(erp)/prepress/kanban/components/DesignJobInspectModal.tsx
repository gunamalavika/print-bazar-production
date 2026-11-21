'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  RiCloseLine,
  RiFilePdfLine,
  RiDownload2Line,
  RiUser3Line,
  RiPhoneLine,
  RiMailLine,
  RiShieldCheckLine,
  RiAlertFill,
  RiCheckDoubleLine,
  RiExternalLinkLine,
  RiPaintBrushLine,
  RiUploadCloudLine,
} from 'react-icons/ri';
import { DesignCardItem, DesignKanbanStage } from './DesignJobCard';
import { Button } from '@/components/ui';
import { resolveImageUrl } from '@/lib/api';

interface DesignJobInspectModalProps {
  isOpen: boolean;
  card: DesignCardItem | null;
  onClose: () => void;
  onUpdateStage: (card: DesignCardItem, targetStage: DesignKanbanStage, notes?: string) => Promise<void>;
  onUploadArtwork?: (
    card: DesignCardItem,
    files: File | File[],
    targetStage?: DesignKanbanStage,
    notes?: string,
    dpi?: number,
    isFinalArtwork?: boolean,
  ) => Promise<void>;
}

export function DesignJobInspectModal({
  isOpen,
  card,
  onClose,
  onUpdateStage,
  onUploadArtwork,
}: DesignJobInspectModalProps) {
  const [selectedStage, setSelectedStage] = useState<DesignKanbanStage | ''>('');
  const [prepressNotes, setPrepressNotes] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [resolutionDpi, setResolutionDpi] = useState<number>(300);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalFileInputRef = React.useRef<HTMLInputElement | null>(null);

  if (!isOpen || !card) return null;

  const hasSelectedFiles = uploadFiles.length > 0;
  const hasArtwork = Boolean(
    card.artworkUrl ||
    card.artworkFile?.fileUrl ||
    card.latestArtworkVersion?.fileUrl ||
    card.latestArtworkVersion?.storageKey ||
    (card.artworkVersions && card.artworkVersions.length > 0) ||
    hasSelectedFiles
  );
  const hasFinalArtwork = Boolean(card.hasFinalArtwork || hasSelectedFiles);

  const currentStage = card.stage;
  const activeTargetStage = selectedStage || currentStage;
  const isFinalArtworkContext =
    card.stage === 'WAITING_FOR_APPROVAL' || activeTargetStage === 'READY_TO_PRINT';
  const isReadyToPrintBlocked =
    activeTargetStage === 'READY_TO_PRINT' && !hasFinalArtwork;

  const addSelectedFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    if (arr.length === 0) return;
    setUploadFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      const uniqueNew = arr.filter((f) => !existingKeys.has(`${f.name}-${f.size}-${f.lastModified}`));
      return [...prev, ...uniqueNew];
    });
  };

  const removeFileAt = (idx: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (
    e: React.FormEvent,
    customTargetStage?: DesignKanbanStage,
    forceFinalArtwork?: boolean,
  ) => {
    e.preventDefault();
    const finalTargetStage = customTargetStage || activeTargetStage;
    if (!finalTargetStage) return;

    if (finalTargetStage === 'READY_TO_PRINT' && !card.hasFinalArtwork && uploadFiles.length === 0) {
      alert(
        `Final Artwork Mandatory: Cannot move Order #${card.orderNumber} to Ready to Print without uploading at least 1 final artwork file first.`,
      );
      return;
    }

    if (
      (finalTargetStage === 'ARTWORK_CHECK' ||
        finalTargetStage === 'WAITING_FOR_APPROVAL') &&
      !hasArtwork
    ) {
      alert(
        `Cannot move Order #${card.orderNumber} to ${finalTargetStage.replace(
          /_/g,
          ' ',
        )}: At least 1 designer artwork file must be uploaded first.`,
      );
      return;
    }

    const markAsFinal = Boolean(
      forceFinalArtwork ||
      finalTargetStage === 'READY_TO_PRINT' ||
      card.stage === 'WAITING_FOR_APPROVAL',
    );

    setIsSubmitting(true);
    try {
      if (uploadFiles.length > 0 && onUploadArtwork) {
        await onUploadArtwork(
          card,
          uploadFiles,
          finalTargetStage,
          prepressNotes.trim() || undefined,
          resolutionDpi,
          markAsFinal,
        );
      } else {
        await onUpdateStage(card, finalTargetStage, prepressNotes.trim() || undefined);
      }
      setUploadFiles([]);
      setPrepressNotes('');
      setSelectedStage('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 font-mono">
                {card.orderNumber}
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                {card.stage.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {card.productName} • {card.quantity.toLocaleString()} units
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Information */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">
              {card.companyName ? `${card.companyName} (${card.customerName})` : card.customerName || 'Direct Customer'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Created: {new Date(card.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 flex-wrap">
            {card.customerPhone && (
              <span className="flex items-center gap-1 font-mono">
                <RiPhoneLine className="w-3.5 h-3.5 text-slate-400" />
                {card.customerPhone}
              </span>
            )}
            {card.customerEmail && (
              <span className="flex items-center gap-1 font-mono">
                <RiMailLine className="w-3.5 h-3.5 text-slate-400" />
                {card.customerEmail}
              </span>
            )}
          </div>
        </div>

        {/* Specifications Breakdown */}
        {card.specifications && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              Job Specifications
            </h4>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs grid grid-cols-2 gap-2">
              {card.specifications.selectedOptions && Array.isArray(card.specifications.selectedOptions) ? (
                card.specifications.selectedOptions.map((spec: any, idx: number) => (
                  <div key={idx} className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-400 block font-bold uppercase">
                      {spec.fieldLabel || spec.label}
                    </span>
                    <span className="font-bold text-slate-900 text-xs block mt-0.5">
                      {String(spec.value)}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  {card.specifications.dimensions && (
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-400 block font-bold uppercase">Dimensions</span>
                      <span className="font-bold text-slate-900 text-xs">{String(card.specifications.dimensions)}</span>
                    </div>
                  )}
                  {card.specifications.paperGsm && (
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-400 block font-bold uppercase">Substrate</span>
                      <span className="font-bold text-slate-900 text-xs">{String(card.specifications.paperGsm)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Operations Assignment Notes */}
        {card.assignmentNotes && (
          <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-xs space-y-1 shadow-2xs">
            <span className="font-bold text-amber-950 block font-mono uppercase text-[10.5px]">
              Operations Assignment Notes{card.assignedBy ? ` (by ${card.assignedBy})` : ''}:
            </span>
            <p className="text-amber-950 font-medium whitespace-pre-wrap bg-white/80 p-2.5 rounded-lg border border-amber-200/80">
              {card.assignmentNotes}
            </p>
          </div>
        )}

        {/* Customer Notes / Brief */}
        {card.customerNotes && (
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-1">
            <span className="font-bold text-amber-900 block font-mono uppercase text-[10.5px]">
              Customer Design Brief / Instructions:
            </span>
            <p className="text-amber-950 italic">{card.customerNotes}</p>
          </div>
        )}

        {/* OE Directives Warning if present */}
        {card.revisionDirectives && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 text-rose-900">
            <span className="font-bold text-rose-800 block font-mono uppercase text-[10.5px] flex items-center gap-1.5">
              <RiAlertFill className="w-4 h-4 text-rose-600" />
              Returned for Revisions by {card.returnedBy || 'Operations'}:
            </span>
            <p className="italic">{card.revisionDirectives}</p>
          </div>
        )}

        {/* Designer Artwork Upload Dropzone Section (Min 1 Mandatory, Multiple Allowed) */}
        <div
          className={`border rounded-xl p-3.5 space-y-2.5 ${
            isFinalArtworkContext && !card.hasFinalArtwork && !hasSelectedFiles
              ? 'bg-purple-50/70 border-purple-300'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-800 font-mono uppercase flex items-center gap-1.5">
              <RiUploadCloudLine
                className={`w-4 h-4 ${
                  isFinalArtworkContext ? 'text-purple-600' : 'text-amber-600'
                }`}
              />
              {isFinalArtworkContext
                ? 'Upload Final Artwork (Min 1 Mandatory • Multiple Allowed)'
                : card.stage === 'ARTWORK_CHECK'
                ? 'Upload Approved Artwork Proofs (Multiple Allowed)'
                : 'Upload Designer Artworks (Min 1 • Multiple Allowed)'}
            </span>
            {card.hasFinalArtwork ? (
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold shrink-0">
                {card.finalArtworkVersions && card.finalArtworkVersions.length > 1
                  ? `${card.finalArtworkVersions.length} Final Artworks Ready ✓`
                  : 'Final Artwork Ready ✓'}
              </span>
            ) : isFinalArtworkContext ? (
              <span className="text-[10px] font-mono text-purple-800 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded font-bold shrink-0">
                Min 1 Final Required
              </span>
            ) : hasArtwork ? (
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold shrink-0">
                Artwork Ready
              </span>
            ) : null}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                addSelectedFiles(e.dataTransfer.files);
              }
            }}
            onClick={() => modalFileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-amber-500 bg-amber-50/50'
                : hasSelectedFiles
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-slate-300 hover:border-slate-400 bg-white'
            }`}
          >
            <input
              type="file"
              multiple
              ref={modalFileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  addSelectedFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.ai,.psd,.svg,.tiff"
            />
            {hasSelectedFiles ? (
              <div className="space-y-2 text-left" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-emerald-900">
                    {uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''} ready to upload
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => modalFileInputRef.current?.click()}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                    >
                      + Add More Files
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadFiles([])}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {uploadFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${file.size}-${idx}`}
                      className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-emerald-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                          <RiFilePdfLine className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {file.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Designer Master'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFileAt(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer shrink-0"
                        title="Remove file"
                      >
                        <RiCloseLine className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <RiUploadCloudLine className="w-7 h-7 mx-auto text-slate-400" />
                <div className="text-xs font-semibold text-slate-700">
                  Click to select or drag & drop 1 or multiple artwork files
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  Min 1 mandatory • Multiple allowed • PDF, AI, PSD, TIFF, High-Res PNG/JPG (CMYK 300 DPI)
                </div>
              </div>
            )}
          </div>

          {/* Preflight Resolution Directives */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-600 font-medium">Preflight Resolution:</span>
            <div className="flex items-center gap-1.5">
              {[300, 600, 150].map((dpi) => (
                <button
                  key={dpi}
                  type="button"
                  onClick={() => setResolutionDpi(dpi)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                    resolutionDpi === dpi
                      ? 'bg-slate-950 text-[#FFED00]'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {dpi} DPI
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Existing Uploaded Artwork Files List */}
        {card.artworkVersions && card.artworkVersions.length > 0 ? (
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold uppercase text-[10px] text-amber-900">
                Uploaded Artwork Files ({card.artworkVersions.length})
              </span>
              {card.finalArtworkVersions && card.finalArtworkVersions.length > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {card.finalArtworkVersions.length} Final
                </span>
              )}
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {card.artworkVersions.map((ver: any, idx: number) => {
                const isFinal =
                  typeof ver.prepressNotes === 'string' &&
                  ver.prepressNotes.includes('[FINAL_ARTWORK]');
                const viewUrl = resolveImageUrl(ver.storageKey || ver.fileUrl || ver.proofUrl);
                return (
                  <div
                    key={ver.id || idx}
                    className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-amber-200/70"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <RiFilePdfLine className="w-4 h-4 text-amber-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 truncate">
                            {ver.originalFileName || `Artwork_v${ver.versionNumber || idx + 1}`}
                          </span>
                          {isFinal && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                              FINAL
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          v{ver.versionNumber || idx + 1} • {ver.resolutionDpi || 300} DPI
                        </span>
                      </div>
                    </div>
                    {viewUrl && (
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-800 hover:text-amber-950 font-bold font-mono text-[11px] flex items-center gap-1 shrink-0"
                      >
                        <span>View</span>
                        <RiExternalLinkLine className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : card.artworkUrl && !hasSelectedFiles ? (
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <RiFilePdfLine className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block truncate">
                  {card.artworkFileName || 'Current Artwork Master'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {card.latestArtworkVersion ? `v${card.latestArtworkVersion.versionNumber}` : 'Prepress Active'}
                </span>
              </div>
            </div>
            <a
              href={card.artworkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-800 hover:text-amber-950 font-bold font-mono text-[11px] flex items-center gap-1 shrink-0"
            >
              <span>View</span>
              <RiExternalLinkLine className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : null}

        {/* Stage Change / Prepress Note Form */}
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-3 pt-2 border-t border-slate-200">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Advance or Change Kanban Stage:
            </label>
            <select
              value={selectedStage || card.stage}
              onChange={(e) => setSelectedStage(e.target.value as DesignKanbanStage)}
              className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
            >
              <option value="DESIGNING">Stage 1: Designing</option>
              <option value="ARTWORK_CHECK">Stage 2: Artwork Check (Preflight Audit)</option>
              <option value="WAITING_FOR_APPROVAL">Stage 3: Waiting for Approval</option>
              <option value="READY_TO_PRINT">Stage 4: Ready to Print (Production Handover)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Prepress / Handover Notes (Optional):
            </label>
            <textarea
              rows={2}
              value={prepressNotes}
              onChange={(e) => setPrepressNotes(e.target.value)}
              placeholder="e.g., Bleed confirmed 3mm, color profile CMYK FOGRA39, customer proof approved via WhatsApp..."
              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
            />
          </div>

          {isReadyToPrintBlocked && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <RiAlertFill className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Final artwork upload is mandatory before moving to Ready to Print. Please select and upload the final artwork above.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2 flex-wrap">
              {hasSelectedFiles ? (
                <>
                  {card.stage === 'WAITING_FOR_APPROVAL' ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={(e) => handleSubmit(e, 'WAITING_FOR_APPROVAL', true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                    >
                      {isSubmitting
                        ? 'Uploading...'
                        : `Save Final Artwork${uploadFiles.length > 1 ? `s (${uploadFiles.length})` : ''}`}
                    </Button>
                  ) : card.stage === 'ARTWORK_CHECK' ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={(e) => handleSubmit(e, 'WAITING_FOR_APPROVAL', false)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                    >
                      {isSubmitting
                        ? 'Uploading...'
                        : `Upload (${uploadFiles.length}) & Move to Waiting for Approval →`}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={(e) => handleSubmit(e, 'ARTWORK_CHECK', false)}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
                    >
                      {isSubmitting
                        ? 'Uploading...'
                        : `Upload (${uploadFiles.length}) & Move to Artwork Check →`}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={(e) => handleSubmit(e, 'READY_TO_PRINT', true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {isSubmitting
                      ? 'Uploading...'
                      : `Upload Final (${uploadFiles.length}) & Move to Ready to Print ⚡`}
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || isReadyToPrintBlocked}
                  className="shadow-brand"
                >
                  {isSubmitting ? 'Saving...' : 'Update Stage & Save Notes'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

