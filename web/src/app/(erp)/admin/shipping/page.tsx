'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RiTruckLine,
  RiMapPinRangeLine,
  RiScales3Line,
  RiBox3Line,
  RiSettings4Line,
  RiCompass3Line,
  RiShieldCheckLine,
  RiArrowRightLine,
  RiRefreshLine,
  RiCalculatorLine,
  RiBarChartBoxLine,
  RiCheckDoubleLine,
  RiAlertLine,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ShippingNavTabs } from './components/ShippingNavTabs';

export default function ShippingOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getShippingOverview();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load shipping overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 uppercase tracking-wider">
              Logistics & Fulfillment Suite
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Shipping & Logistics Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage pincodes, delivery zones, weight slabs, packaging tare profiles, and dynamic freight calculations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RiRefreshLine className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/admin/shipping/calculator"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <RiCalculatorLine className="w-4 h-4" />
            Live Freight Calculator
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <ShippingNavTabs />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiAlertLine className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchOverview} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Shipped Orders</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <RiTruckLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : (data?.stats?.totalShippedOrders ?? data?.kpis?.ordersAwaitingDispatch ?? 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Dispatched via logistics partners</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Delivery Zones</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <RiMapPinRangeLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : (data?.stats?.activeZones ?? data?.kpis?.totalZones ?? 4)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Local, Regional, National, Remote</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Indexed PIN Codes</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <RiCompass3Line className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : (data?.stats?.totalPincodes ?? data?.kpis?.totalPincodes ?? 26)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Fast 6-digit Indian postal mapping</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Rate Cards</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <RiScales3Line className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : (data?.stats?.activeRateCards ?? data?.kpis?.activeRateCards ?? 4)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">With 16 configured weight slabs</div>
        </div>
      </div>

      {/* System Health & Architecture Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Config & Zones */}
        <div className="lg:col-span-2 space-y-6">
          {/* Architecture Status Checklist */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RiShieldCheckLine className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Enterprise Architecture Integrity</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Authoritative Mode
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-start gap-2.5">
                <RiCheckDoubleLine className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Centralized Shipping Hub</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Rates, zones, and pincodes managed in dedicated admin sidebar suite.</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-start gap-2.5">
                <RiCheckDoubleLine className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Stage 5 Product Weight Sync</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Physical weights embedded directly in Product Setup Studio Stage 5.</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-start gap-2.5">
                <RiCheckDoubleLine className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Tare Packaging Protection</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Packaging box weight added strictly once per order (never multiplied by quantity).</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-start gap-2.5">
                <RiCheckDoubleLine className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Authoritative Quotation Service</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Shipping engine seamlessly integrated into <code>POST /pricing/calculate-quote</code>.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Core Delivery Zones Quick View */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Configured Delivery Zones</h3>
              <Link href="/admin/shipping/zones" className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1">
                Manage All Zones <RiArrowRightLine className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {(data?.zones && data.zones.length > 0 ? data.zones : [
                { id: 'z-local', zoneCode: 'LOCAL', name: 'Local City Intra-State', estimatedDeliveryDays: '1-2 Days', baseSurcharge: 0 },
                { id: 'z-reg', zoneCode: 'REGIONAL', name: 'Regional Same Zone', estimatedDeliveryDays: '2-3 Days', baseSurcharge: 0 },
                { id: 'z-nat', zoneCode: 'NATIONAL', name: 'National Metro & Tier-1/2', estimatedDeliveryDays: '4-5 Days', baseSurcharge: 0 },
                { id: 'z-rem', zoneCode: 'REMOTE', name: 'Special Destinations / Remote Surcharge', estimatedDeliveryDays: '6-8 Days', baseSurcharge: 50 },
              ]).map((zone: any, idx: number) => {
                const zKey = (zone.id ? String(zone.id) : null) || (zone.zoneCode ? String(zone.zoneCode) : null) || `zone-row-${idx}`;
                const zCode = zone.zoneCode || zone.pincodePrefix || `ZONE-${idx + 1}`;
                const zName = zone.name || zone.zoneName || 'Delivery Zone';
                const zSurcharge = Number(zone.baseSurcharge ?? zone.zoneSurcharge ?? zone.shippingCharge ?? 0);
                const zEta = zone.estimatedDeliveryDays || '2-4 Days';

                return (
                  <div key={zKey} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">
                        {zCode}
                      </span>
                      <span className="font-semibold text-slate-800">{zName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500">
                      <span>ETA: <strong className="text-slate-700">{zEta}</strong></span>
                      {zSurcharge > 0 && (
                        <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          +{formatCurrency(zSurcharge)} surcharge
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Launch Modules & Global Settings */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Quick Navigation</h3>
            <div className="space-y-2">
              <Link
                href="/admin/shipping/configuration"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition text-xs font-semibold text-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <RiSettings4Line className="w-4 h-4 text-sky-600" />
                  <span>Global Config & Free Shipping</span>
                </div>
                <RiArrowRightLine className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/shipping/pincodes"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition text-xs font-semibold text-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <RiCompass3Line className="w-4 h-4 text-indigo-600" />
                  <span>Pincode Directory & CSV Import</span>
                </div>
                <RiArrowRightLine className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/shipping/rates"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition text-xs font-semibold text-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <RiScales3Line className="w-4 h-4 text-amber-600" />
                  <span>Weight Slabs & Excess Kg Rates</span>
                </div>
                <RiArrowRightLine className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/shipping/packaging"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition text-xs font-semibold text-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <RiBox3Line className="w-4 h-4 text-emerald-600" />
                  <span>Packaging Box Tare Profiles</span>
                </div>
                <RiArrowRightLine className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/shipping/orders"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition text-xs font-semibold text-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <RiTruckLine className="w-4 h-4 text-purple-600" />
                  <span>Shipping Orders & Dispatches</span>
                </div>
                <RiArrowRightLine className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Quick Calculator Teaser */}
          <div className="bg-linear-to-br from-sky-600 to-indigo-700 text-white rounded-xl p-5 shadow-xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <RiCalculatorLine className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm">Diagnostic Freight Calculator</h4>
            <p className="text-xs text-sky-100 leading-relaxed">
              Test live shipping rate calculation for any product quantity, packaging profile, and destination PIN code instantly.
            </p>
            <Link
              href="/admin/shipping/calculator"
              className="inline-block mt-1 px-3.5 py-1.5 bg-white text-sky-800 font-bold text-xs rounded-lg shadow-2xs hover:bg-sky-50 transition"
            >
              Open Calculator &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

