'use client';

import React, { useState, useEffect } from 'react';
import {
  RiBarChartBoxLine,
  RiPieChartLine,
  RiMoneyDollarCircleLine,
  RiTruckLine,
  RiRefreshLine,
  RiAlertLine,
  RiScales3Line,
  RiGiftLine,
  RiMapPinRangeLine,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ShippingNavTabs } from '../components/ShippingNavTabs';

export default function ShippingReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getShippingReports();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load shipping reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipping & Logistics Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Freight revenue, zone dispatch distribution, billable weight brackets, and free shipping promotional metrics.
          </p>
        </div>
        <button
          onClick={fetchReports}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition w-fit"
        >
          <RiRefreshLine className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Analytics
        </button>
      </div>

      <ShippingNavTabs />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiAlertLine className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchReports} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Shipping Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <RiMoneyDollarCircleLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : formatCurrency(data?.revenueTotal ?? 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Net delivery charges collected</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Dispatches</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <RiTruckLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : (data?.totalShipments ?? 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Processed orders</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg. Shipping / Order</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <RiScales3Line className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : formatCurrency(data?.avgShippingCost ?? 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Standard surface freight</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Free Shipping Absorption</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <RiGiftLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : `${data?.freeShippingRate ?? 0}%`}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Orders qualifying for ₹0 fee</div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Zone Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <RiMapPinRangeLine className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Shipments by Delivery Zone</h3>
          </div>

          <div className="space-y-3">
            {[
              { zone: 'LOCAL', name: 'Local City Intra-State', count: data?.byZone?.LOCAL ?? 0, percent: 35, color: 'bg-emerald-500' },
              { zone: 'REGIONAL', name: 'Regional Same Zone', count: data?.byZone?.REGIONAL ?? 0, percent: 30, color: 'bg-sky-500' },
              { zone: 'NATIONAL', name: 'National Metros & Tier-1/2', count: data?.byZone?.NATIONAL ?? 0, percent: 25, color: 'bg-indigo-500' },
              { zone: 'REMOTE', name: 'Special Destinations / Remote', count: data?.byZone?.REMOTE ?? 0, percent: 10, color: 'bg-amber-500' },
            ].map((item) => (
              <div key={item.zone} className="text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    <span className="font-mono font-bold mr-1.5">{item.zone}:</span> {item.name}
                  </span>
                  <span className="font-mono text-slate-600 font-bold">{item.count} orders</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weight Bracket Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <RiScales3Line className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Weight Bracket Distribution</h3>
          </div>

          <div className="space-y-3">
            {[
              { label: '0 – 500 grams (Cards & Envelopes)', count: 48, percent: 48, color: 'bg-sky-500' },
              { label: '501g – 1,000 grams (Standard Packs)', count: 28, percent: 28, color: 'bg-indigo-500' },
              { label: '1,001g – 2,000 grams (Bulk Boxes)', count: 16, percent: 16, color: 'bg-amber-500' },
              { label: '> 2,000 grams (Commercial Cartons)', count: 8, percent: 8, color: 'bg-emerald-500' },
            ].map((item) => (
              <div key={item.label} className="text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{item.label}</span>
                  <span className="font-mono text-slate-600 font-bold">{item.count}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

