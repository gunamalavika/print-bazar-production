'use client';

import { useState } from 'react';
import {
  Sliders,
  DollarSign,
  Save,
  CheckCircle2,
  Layers,
  Printer,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function PricingEnginePage() {
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Substrates Matrix
  const [substrates, setSubstrates] = useState([
    { id: 'sub-1', name: '350 GSM European Art Card', baseCostPerSheet: 4.2, wastagePercent: 8 },
    { id: 'sub-2', name: '400 GSM Velvet Bleached Board', baseCostPerSheet: 6.8, wastagePercent: 6 },
    { id: 'sub-3', name: '1200 GSM Kappa Packaging Board', baseCostPerSheet: 18.5, wastagePercent: 5 },
    { id: 'sub-4', name: '450 Micron Non-Tear Matte Poly', baseCostPerSheet: 28.0, wastagePercent: 4 },
  ]);

  // Finishing Rates
  const [finishingRates, setFinishingRates] = useState([
    { id: 'fin-1', name: 'Thermal Soft-Touch Matte Lam (Double Sided)', ratePerSqInch: 0.12, minCharge: 150 },
    { id: 'fin-2', name: 'Raised Spot UV (Selective High Gloss)', ratePerSqInch: 0.25, minCharge: 350 },
    { id: 'fin-3', name: 'Gold / Silver Hot Foil Stamping Plate', ratePerSqInch: 0.40, minCharge: 500 },
    { id: 'fin-4', name: 'Precision CNC Die-Cutting & Creasing', ratePerSqInch: 0.08, minCharge: 250 },
  ]);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            <span>CALIBRATED ESTIMATING ENGINE</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">AUTHORITATIVE PRICING FORMULA</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Substrates Matrix & Machine Click Charges
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Configure paper substrate base rates, machine click costs, finishing surcharges, and volume discount curves.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] px-4 py-2 rounded-lg shadow-sm transition active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>SAVE ACTIVE PRICING ENGINE</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[13px] font-medium rounded-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Authoritative pricing matrix successfully synced across factory press engine!</span>
        </div>
      )}

      {/* 2. Grid of Rate Matrices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Substrates & Paper Stock */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-[15px] sm:text-[16px] font-semibold text-slate-900">Substrate Stock Rates (Per SRA3 Sheet)</h2>
            <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">RAW PAPER COST</span>
          </div>

          <div className="space-y-2.5">
            {substrates.map((s) => (
              <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[13px]">
                <div>
                  <strong className="block font-semibold text-slate-900">{s.name}</strong>
                  <span className="text-[12px] font-mono text-slate-500">
                    Est. Setup Wastage: {s.wastagePercent}%
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-400 font-semibold">₹</span>
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={s.baseCostPerSheet}
                    className="w-20 font-mono font-semibold text-[13px] tabular-nums p-1.5 bg-white border border-slate-300 rounded-md text-right focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                  <span className="text-[11px] text-slate-500">/ sheet</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Finishing Rates */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-[15px] sm:text-[16px] font-semibold text-slate-900">Finishing & Post-Press Charges</h2>
            <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">CALIBRATED PER SQ. INCH</span>
          </div>

          <div className="space-y-2.5">
            {finishingRates.map((f) => (
              <div key={f.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[13px]">
                <div>
                  <strong className="block font-semibold text-slate-900">{f.name}</strong>
                  <span className="text-[12px] font-mono text-slate-500">
                    Minimum Setup Lot: ₹{f.minCharge}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-400 font-semibold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={f.ratePerSqInch}
                    className="w-20 font-mono font-semibold text-[13px] tabular-nums p-1.5 bg-white border border-slate-300 rounded-md text-right focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                  <span className="text-[11px] text-slate-500">/ sq.in</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Machine Click Charges Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h3 className="text-[15px] sm:text-[16px] font-semibold text-slate-900 border-b border-slate-200 pb-3">
          Press Machine Click Rates & Hourly Amortization
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px]">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] text-slate-500 block uppercase font-mono font-semibold">PRESS 01</span>
            <strong className="text-[14px] font-semibold text-slate-900 block mt-1">Heidelberg Speedmaster XL 106</strong>
            <p className="text-[12px] text-slate-600 mt-2 font-mono tabular-nums leading-relaxed">
              Plate Charge: ₹350 / 4-color set<br />
              Run Charge: ₹0.85 / impression (min 500)
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] text-slate-500 block uppercase font-mono font-semibold">PRESS 02</span>
            <strong className="text-[14px] font-semibold text-slate-900 block mt-1">HP Indigo 12000 Digital Press</strong>
            <p className="text-[12px] text-slate-600 mt-2 font-mono tabular-nums leading-relaxed">
              Click Charge: ₹4.50 / SRA3 sheet (CMYK)<br />
              Spot White / Fluorescent: +₹1.80 / sheet
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] text-slate-500 block uppercase font-mono font-semibold">PRESS 03</span>
            <strong className="text-[14px] font-semibold text-slate-900 block mt-1">Roland TrueVIS VG3-640 Wide UV</strong>
            <p className="text-[12px] text-slate-600 mt-2 font-mono tabular-nums leading-relaxed">
              Square Foot Rate: ₹22.00 / sq.ft<br />
              Eco-Solvent / UV Inks calibrated
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
