'use client';

import React from 'react';
import {
  RiBox3Line,
  RiDeleteBinLine,
  RiCheckboxCircleFill,
  RiBarcodeLine,
  RiPrinterLine,
} from 'react-icons/ri';
import { PackagingCartonItem } from './CartonPackingForm';

interface PackedCartonsTableProps {
  cartons: PackagingCartonItem[];
  onDeleteCarton: (id: string) => void;
  isCompleted: boolean;
  labelPrinted: boolean;
  onOpenPrintModal?: () => void;
}

export function PackedCartonsTable({
  cartons,
  onDeleteCarton,
  isCompleted,
  labelPrinted,
  onOpenPrintModal,
}: PackedCartonsTableProps) {
  const totalWeightKg = cartons.reduce((acc, c) => acc + c.grossWeightKg, 0);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <RiBox3Line className="h-4 w-4 text-blue-600" />
          <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wide">
            Packed Cartons ({cartons.length})
          </h3>
        </div>

        {cartons.length > 0 && (
          <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            TOTAL WT: {totalWeightKg.toFixed(2)} KG
          </span>
        )}
      </div>

      {cartons.length === 0 ? (
        <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
          <RiBox3Line className="h-6 w-6 mx-auto mb-1 text-slate-300" />
          <span className="text-xs font-semibold text-slate-600 block">No Cartons Recorded Yet</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Record carton dimensions & weight in the center form to add.
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase font-mono">
                <th className="pb-2">#</th>
                <th className="pb-2">Carton</th>
                <th className="pb-2">Dim (L×W×H)</th>
                <th className="pb-2">Weight</th>
                <th className="pb-2">Label</th>
                {!isCompleted && <th className="pb-2 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {cartons.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 font-mono font-bold text-slate-900">
                    {c.sequenceNumber}
                  </td>
                  <td className="py-2.5">
                    <span className="font-mono text-slate-900 font-bold block">{c.cartonType}</span>
                  </td>
                  <td className="py-2.5 font-mono text-slate-600">
                    {c.lengthCm}×{c.widthCm}×{c.heightCm} cm
                  </td>
                  <td className="py-2.5 font-mono font-bold text-slate-900">
                    {c.grossWeightKg.toFixed(2)} KG
                  </td>
                  <td className="py-2.5">
                    <button
                      type="button"
                      onClick={onOpenPrintModal}
                      className="cursor-pointer"
                      title="View & Print Label"
                    >
                      {labelPrinted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition">
                          <RiCheckboxCircleFill className="h-3 w-3 text-emerald-600" />
                          PRINTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 transition">
                          <RiBarcodeLine className="h-3 w-3 text-amber-600" />
                          READY
                        </span>
                      )}
                    </button>
                  </td>
                  {!isCompleted && (
                    <td className="py-2.5 text-right flex items-center justify-end gap-1">
                      {onOpenPrintModal && (
                        <button
                          type="button"
                          onClick={onOpenPrintModal}
                          className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="Print Label"
                        >
                          <RiPrinterLine className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteCarton(c.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Delete Carton"
                      >
                        <RiDeleteBinLine className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
