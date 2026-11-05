'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  RiDashboardLine,
  RiSettings4Line,
  RiMapPinRangeLine,
  RiCompass3Line,
  RiScales3Line,
  RiBox3Line,
  RiCalculatorLine,
  RiTruckLine,
  RiBarChartBoxLine,
} from 'react-icons/ri';

const NAV_TABS = [
  { href: '/admin/shipping', label: 'Overview', icon: RiDashboardLine, exact: true },
  { href: '/admin/shipping/configuration', label: 'Configuration', icon: RiSettings4Line },
  { href: '/admin/shipping/zones', label: 'Delivery Zones', icon: RiMapPinRangeLine },
  { href: '/admin/shipping/pincodes', label: 'Pincodes', icon: RiCompass3Line },
  { href: '/admin/shipping/rates', label: 'Rate Cards & Slabs', icon: RiScales3Line },
  { href: '/admin/shipping/packaging', label: 'Packaging Profiles', icon: RiBox3Line },
  { href: '/admin/shipping/calculator', label: 'Calculator', icon: RiCalculatorLine },
  { href: '/admin/shipping/orders', label: 'Shipping Orders', icon: RiTruckLine },
  { href: '/admin/shipping/reports', label: 'Reports', icon: RiBarChartBoxLine },
];

export function ShippingNavTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white mb-6 -mx-4 sm:-mx-6 px-4 sm:px-6">
      <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-2">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact ? pathname === tab.href : pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-sky-50 text-sky-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

