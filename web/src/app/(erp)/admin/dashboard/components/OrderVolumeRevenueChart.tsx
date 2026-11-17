'use client';

import React, { useState, useMemo } from 'react';
import {
  RiBarChartGroupedLine,
  RiLineChartLine,
  RiCalendarLine,
  RiInformationLine,
  RiArrowRightUpLine,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';

export interface DashboardOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number | string;
  paymentStatus: string;
  deliveryMethod?: string;
  priority?: string;
  createdAt: string;
  customer?: {
    fullName?: string;
    companyName?: string;
  };
  items?: Array<{
    productName: string;
    quantity: number;
    totalPrice: number;
  }>;
}

interface OrderVolumeRevenueChartProps {
  orders: DashboardOrderSummary[];
  isLoading?: boolean;
}

type TimeHorizon = '7d' | '14d' | '30d' | 'all';
type MetricMode = 'volume' | 'revenue';

export function OrderVolumeRevenueChart({
  orders,
  isLoading = false,
}: OrderVolumeRevenueChartProps) {
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('14d');
  const [metricMode, setMetricMode] = useState<MetricMode>('revenue');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group and bucket orders by calendar day
  const chartData = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const now = new Date();
    let numDays = 14;
    if (timeHorizon === '7d') numDays = 7;
    if (timeHorizon === '14d') numDays = 14;
    if (timeHorizon === '30d') numDays = 30;
    if (timeHorizon === 'all') numDays = 30; // fallback window for daily view

    // Prepare date keys map
    const dateMap = new Map<string, { date: Date; label: string; count: number; revenue: number }>();

    // If 'all', find the earliest order date to now
    let startDate = new Date();
    if (timeHorizon === 'all') {
      const earliest = orders.reduce((min, o) => {
        const d = new Date(o.createdAt);
        return d < min ? d : min;
      }, new Date());
      startDate = new Date(earliest);
      startDate.setHours(0, 0, 0, 0);
      const diffDays = Math.max(7, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      numDays = Math.min(60, diffDays);
    } else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - (numDays - 1));
      startDate.setHours(0, 0, 0, 0);
    }

    // Populate day buckets
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap.set(key, { date: d, label, count: 0, revenue: 0 });
    }

    // Accumulate orders into buckets
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = d.toISOString().split('T')[0];
      const bucket = dateMap.get(key);
      if (bucket) {
        bucket.count += 1;
        bucket.revenue += Number(o.totalAmount) || 0;
      }
    });

    return Array.from(dateMap.values());
  }, [orders, timeHorizon]);

  // Aggregate summary stats
  const totals = useMemo(() => {
    const totalRevenue = chartData.reduce((acc, d) => acc + d.revenue, 0);
    const totalCount = chartData.reduce((acc, d) => acc + d.count, 0);
    const peakRevenue = chartData.reduce((max, d) => Math.max(max, d.revenue), 0);
    const peakCount = chartData.reduce((max, d) => Math.max(max, d.count), 0);
    const avgRevenue = chartData.length > 0 ? totalRevenue / chartData.length : 0;
    const avgCount = chartData.length > 0 ? totalCount / chartData.length : 0;

    return {
      totalRevenue,
      totalCount,
      peakRevenue,
      peakCount,
      avgRevenue,
      avgCount,
    };
  }, [chartData]);

  // Calculate SVG dimensions and coordinate paths
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 35;
  const innerWidth = svgWidth - paddingX * 2;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 10;
    if (metricMode === 'revenue') {
      const max = Math.max(...chartData.map((d) => d.revenue));
      return max > 0 ? Math.ceil(max * 1.15) : 5000;
    } else {
      const max = Math.max(...chartData.map((d) => d.count));
      return max > 0 ? Math.ceil(max * 1.25) : 10;
    }
  }, [chartData, metricMode]);

  const points = useMemo(() => {
    if (chartData.length === 0) return [];
    const step = chartData.length > 1 ? innerWidth / (chartData.length - 1) : innerWidth;

    return chartData.map((d, i) => {
      const x = paddingX + i * step;
      const val = metricMode === 'revenue' ? d.revenue : d.count;
      const y = paddingTop + innerHeight - (val / maxValue) * innerHeight;
      return { x, y, data: d, val };
    });
  }, [chartData, metricMode, maxValue, innerWidth, innerHeight, paddingX, paddingTop]);

  // Generate SVG path for smooth line and area fill
  const { pathD, areaD } = useMemo(() => {
    if (points.length === 0) return { pathD: '', areaD: '' };

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      linePath += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const baselineY = paddingTop + innerHeight;
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

    return { pathD: linePath, areaD: areaPath };
  }, [points, innerHeight, paddingTop]);

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header with Title and View Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FFED00]/25 text-slate-900 border border-[#E3A008]/30">
              <RiBarChartGroupedLine className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[15px] sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Order Inflow & Gross Revenue Trajectory</span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                  Telemetry Trend
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Daily volume and transaction values tracked across operational intake.
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Metric Switcher + Horizon Pill */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMetricMode('revenue')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                metricMode === 'revenue'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Revenue (₹)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('volume')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                metricMode === 'volume'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Order Count
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            {(['7d', '14d', '30d', 'all'] as TimeHorizon[]).map((hz) => (
              <button
                key={hz}
                type="button"
                onClick={() => setTimeHorizon(hz)}
                className={`px-2 py-1 rounded-md transition cursor-pointer text-[11px] uppercase font-mono ${
                  timeHorizon === hz
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {hz === 'all' ? 'All Time' : hz}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip for Selected Window */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
        <div>
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
            PERIOD TOTAL REVENUE
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-0.5 block tabular-nums">
            {formatCurrency(totals.totalRevenue)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
            PERIOD TOTAL ORDERS
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-0.5 block tabular-nums">
            {totals.totalCount} Orders
          </span>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
            PEAK SINGLE DAY
          </span>
          <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono mt-0.5 block tabular-nums">
            {metricMode === 'revenue'
              ? formatCurrency(totals.peakRevenue)
              : `${totals.peakCount} Orders`}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
            DAILY RUN-RATE AVG
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-800 font-mono mt-0.5 block tabular-nums">
            {metricMode === 'revenue'
              ? `${formatCurrency(totals.avgRevenue)}/day`
              : `${totals.avgCount.toFixed(1)} orders/day`}
          </span>
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="relative w-full overflow-hidden bg-white rounded-xl border border-slate-100 pt-2 pb-1">
        {/* Active Tooltip Popover */}
        {activePoint && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900 text-white rounded-xl px-3 py-2 shadow-xl border border-slate-700 text-xs font-mono transform -translate-x-1/2 transition-all duration-75"
            style={{
              left: `${(activePoint.x / svgWidth) * 100}%`,
              top: '12px',
            }}
          >
            <div className="text-[10px] text-slate-400 font-bold border-b border-slate-800 pb-1 mb-1">
              {activePoint.data.label} ({activePoint.data.date.getFullYear()})
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-300">Revenue:</span>
              <span className="font-bold text-[#FFED00]">
                {formatCurrency(activePoint.data.revenue)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 mt-0.5">
              <span className="text-slate-300">Orders:</span>
              <span className="font-bold text-white">
                {activePoint.data.count} Orders
              </span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-48 sm:h-56 select-none overflow-visible"
        >
          <defs>
            {/* Revenue Gradient */}
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#FFED00" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FFED00" stopOpacity="0.0" />
            </linearGradient>

            {/* Volume Gradient */}
            <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#60A5FA" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.0" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Horizontal Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + innerHeight * (1 - pct);
            const val = pct * maxValue;
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                  strokeDasharray={pct === 0 ? undefined : '3,3'}
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono font-medium"
                >
                  {metricMode === 'revenue'
                    ? val >= 1000
                      ? `₹${(val / 1000).toFixed(0)}k`
                      : `₹${val.toFixed(0)}`
                    : val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Smooth Filled Area */}
          {areaD && (
            <path
              d={areaD}
              fill={metricMode === 'revenue' ? 'url(#revenueGrad)' : 'url(#volumeGrad)'}
            />
          )}

          {/* Stroke Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={metricMode === 'revenue' ? '#D97706' : '#2563EB'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#chartGlow)"
            />
          )}

          {/* Interactive Bars & Hover Touch Targets */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            const barWidth = Math.max(8, innerWidth / chartData.length - 8);
            const barHeight = (pt.val / maxValue) * innerHeight;
            const barY = paddingTop + innerHeight - barHeight;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Visual Bar Column behind curve */}
                <rect
                  x={pt.x - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  className={`transition-colors duration-150 ${
                    isHovered
                      ? metricMode === 'revenue'
                        ? 'fill-amber-400/60'
                        : 'fill-blue-500/60'
                      : 'fill-slate-100 hover:fill-slate-200'
                  }`}
                />

                {/* Point Node on the line */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5 : 3}
                  fill={isHovered ? '#0F172A' : '#FFFFFF'}
                  stroke={metricMode === 'revenue' ? '#D97706' : '#2563EB'}
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all duration-150"
                />

                {/* Vertical Guidelines when hovered */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={paddingTop}
                    x2={pt.x}
                    y2={paddingTop + innerHeight}
                    stroke="#94A3B8"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                )}

                {/* Large Transparent Hit Area for Easy Hovering */}
                <rect
                  x={pt.x - innerWidth / chartData.length / 2}
                  y={paddingTop}
                  width={innerWidth / chartData.length}
                  height={innerHeight + paddingBottom}
                  fill="transparent"
                />

                {/* X-Axis Day Labels (render every nth label if many) */}
                {(chartData.length <= 14 || i % Math.ceil(chartData.length / 10) === 0) && (
                  <text
                    x={pt.x}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    className={`text-[9.5px] font-mono transition-colors ${
                      isHovered
                        ? 'fill-slate-900 font-bold'
                        : 'fill-slate-400 font-medium'
                    }`}
                  >
                    {pt.data.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

