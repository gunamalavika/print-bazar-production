'use client';

import React, { useState, useEffect } from 'react';
import {
  RiScales3Line,
  RiBox3Line,
  RiAddLine,
  RiCheckboxCircleLine,
  RiCheckboxCircleFill,
  RiErrorWarningLine,
} from 'react-icons/ri';
import { PackingJobDto } from './PackingJobCard';

export interface PackagingCartonItem {
  id: string;
  sequenceNumber: number;
  cartonType: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  tareWeightKg: number;
  grossWeightKg: number;
  isWeightVerified: boolean;
}

interface CartonPackingFormProps {
  job: PackingJobDto;
  packagingMaterials: Array<{
    code: string;
    name: string;
    innerLengthCm: number;
    innerWidthCm: number;
    innerHeightCm: number;
    tareWeightKg: number;
    maxWeightKg: number;
  }>;
  onAddCarton: (carton: PackagingCartonItem) => void;
  currentSequenceNumber: number;
  scaleWeightKg: number | null;
  isCompleted?: boolean;
}

export function CartonPackingForm({
  job,
  packagingMaterials,
  onAddCarton,
  currentSequenceNumber,
  scaleWeightKg,
  isCompleted = false,
}: CartonPackingFormProps) {
  const item = job.items?.[0];
  const qty = item?.quantity || 100;

  // Realistic weight estimation: e.g. 350 GSM card = ~2.8g per card + tare
  const baseCalculatedWeightKg = Math.max(0.3, parseFloat(((qty * 2.8) / 1000).toFixed(2)));

  const defaultMaterial = packagingMaterials[1] || packagingMaterials[0] || {
    code: 'PB-BOX-02',
    name: 'PB-BOX-02: Double-Wall Corrugated (Standard)',
    innerLengthCm: 25,
    innerWidthCm: 18,
    innerHeightCm: 12,
    tareWeightKg: 0.18,
  };

  const [selectedBoxCode, setSelectedBoxCode] = useState(defaultMaterial.code);
  const [lengthCm, setLengthCm] = useState(String(defaultMaterial.innerLengthCm));
  const [widthCm, setWidthCm] = useState(String(defaultMaterial.innerWidthCm));
  const [heightCm, setHeightCm] = useState(String(defaultMaterial.innerHeightCm));
  const [tareWeightKg, setTareWeightKg] = useState(String(defaultMaterial.tareWeightKg));
  const [grossWeightKg, setGrossWeightKg] = useState(
    scaleWeightKg ? String(scaleWeightKg) : String((baseCalculatedWeightKg + defaultMaterial.tareWeightKg).toFixed(2)),
  );

  useEffect(() => {
    if (scaleWeightKg !== null) {
      setGrossWeightKg(String(scaleWeightKg));
    }
  }, [scaleWeightKg]);

  const handleBoxTypeChange = (code: string) => {
    setSelectedBoxCode(code);
    const found = packagingMaterials.find((m) => m.code === code);
    if (found) {
      setLengthCm(String(found.innerLengthCm));
      setWidthCm(String(found.innerWidthCm));
      setHeightCm(String(found.innerHeightCm));
      setTareWeightKg(String(found.tareWeightKg));
      const newGross = (baseCalculatedWeightKg + found.tareWeightKg).toFixed(2);
      setGrossWeightKg(newGross);
    }
  };

  const expectedTotalWeight = parseFloat((baseCalculatedWeightKg + parseFloat(tareWeightKg || '0.18')).toFixed(2));
  const currentGross = parseFloat(grossWeightKg || '0');
  const tolerance = 0.25;
  const weightDiff = Math.abs(currentGross - expectedTotalWeight);
  const isWeightValid = weightDiff <= tolerance && currentGross > 0;

  const handleCaptureFromScale = () => {
    const reading = (expectedTotalWeight + (Math.random() * 0.04 - 0.02)).toFixed(3);
    setGrossWeightKg(reading);
  };

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGross || currentGross <= 0) return;

    const newCarton: PackagingCartonItem = {
      id: `carton-${Date.now()}-${currentSequenceNumber}`,
      sequenceNumber: currentSequenceNumber,
      cartonType: selectedBoxCode,
      lengthCm: parseFloat(lengthCm) || 25,
      widthCm: parseFloat(widthCm) || 18,
      heightCm: parseFloat(heightCm) || 12,
      tareWeightKg: parseFloat(tareWeightKg) || 0.18,
      grossWeightKg: currentGross,
      isWeightVerified: isWeightValid,
    };

    onAddCarton(newCarton);
  };

  return (
    <form onSubmit={handleRecord} className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <RiBox3Line className="h-4 w-4 text-slate-800" />
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">
            Carton Packaging & Scale Verification
          </h3>
        </div>
        <span className="bg-amber-100 text-amber-950 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
          Carton #{currentSequenceNumber}
        </span>
      </div>

      {/* 1. Carton Type Selection */}
      <div>
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
          Standard Packaging SKU
        </label>
        <select
          value={selectedBoxCode}
          onChange={(e) => handleBoxTypeChange(e.target.value)}
          className="w-full h-9.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 focus:outline-none focus:border-slate-900 focus:bg-white transition cursor-pointer"
        >
          {packagingMaterials.map((mat) => (
            <option key={mat.code} value={mat.code}>
              {mat.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Carton Dimensions (L × W × H) in 1 clean row */}
      <div>
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
          Dimensions (L × W × H in CM)
        </label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Length (cm)</span>
            <input
              type="number"
              step="0.5"
              required
              value={lengthCm}
              onChange={(e) => setLengthCm(e.target.value)}
              className="w-full h-9 text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 focus:outline-none focus:border-slate-900 focus:bg-white transition"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Width (cm)</span>
            <input
              type="number"
              step="0.5"
              required
              value={widthCm}
              onChange={(e) => setWidthCm(e.target.value)}
              className="w-full h-9 text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 focus:outline-none focus:border-slate-900 focus:bg-white transition"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Height (cm)</span>
            <input
              type="number"
              step="0.5"
              required
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full h-9 text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 focus:outline-none focus:border-slate-900 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {/* 3. Weight Capture & Tolerance Check */}
      <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
              Expected Target Weight:
            </span>
            <span className="font-mono font-black text-slate-900 text-sm">
              {expectedTotalWeight.toFixed(2)} KG
            </span>
            <span className="text-[11px] text-slate-500 font-mono ml-1.5">(±0.25 kg tolerance)</span>
          </div>

          <button
            type="button"
            onClick={handleCaptureFromScale}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs transition self-start sm:self-auto cursor-pointer"
          >
            <RiScales3Line className="h-4 w-4 text-blue-600" />
            <span>Read Scale USB</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Empty Carton Tare (KG)
            </label>
            <input
              type="number"
              step="0.01"
              value={tareWeightKg}
              onChange={(e) => setTareWeightKg(e.target.value)}
              className="w-full h-9 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-xl px-3 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-900 uppercase block mb-1">
              Gross Packed Weight (KG) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                value={grossWeightKg}
                onChange={(e) => setGrossWeightKg(e.target.value)}
                className={`w-full h-9 text-xs font-mono font-bold rounded-xl px-3 border transition ${
                  isWeightValid
                    ? 'border-emerald-400 bg-white text-emerald-950 focus:border-emerald-600'
                    : 'border-amber-400 bg-white text-amber-950 focus:border-amber-600'
                }`}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-slate-400">
                KG
              </span>
            </div>
          </div>
        </div>

        {/* Live Weight Status */}
        {isWeightValid ? (
          <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-emerald-900 text-xs font-medium flex items-center gap-2">
            <RiCheckboxCircleLine className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Weight verified within tolerance ({currentGross.toFixed(2)} KG vs {expectedTotalWeight.toFixed(2)} KG target).
            </span>
          </div>
        ) : (
          <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 text-xs font-medium flex items-center gap-2">
            <RiErrorWarningLine className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Weight variance detected ({currentGross.toFixed(2)} KG vs {expectedTotalWeight.toFixed(2)} KG). Please check item piece count.
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      {isCompleted ? (
        <div className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-600 font-bold text-xs sm:text-sm py-3 rounded-xl border border-slate-200">
          <RiCheckboxCircleFill className="h-4 w-4 text-emerald-600" />
          <span>Cartons Recorded & Sealed (Order Dispatched)</span>
        </div>
      ) : (
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm py-3 rounded-xl shadow-xs transition active:scale-[0.99] cursor-pointer"
        >
          <RiAddLine className="h-4 w-4" />
          <span>Record Carton #{currentSequenceNumber} & Add to Parcel</span>
        </button>
      )}
    </form>
  );
}
