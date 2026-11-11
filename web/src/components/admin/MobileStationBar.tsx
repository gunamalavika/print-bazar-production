'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  RiDashboard3Line,
  RiPulseLine,
  RiShoppingBag3Line,
  RiFileCheckLine,
  RiPrinterLine,
  RiCheckboxCircleLine,
  RiBox3Line,
  RiTruckLine,
  RiExchangeDollarLine,
  RiArchiveDrawerLine,
  RiShieldUserLine,
  RiSettings4Line,
} from 'react-icons/ri';

interface StationTab {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: string;
}

const STATION_TABS: StationTab[] = [
  {
    id: 'dashboard',
    label: 'Overview',
    href: '/admin/dashboard',
    icon: RiDashboard3Line,
    permission: 'overview.read',
    badge: 'LIVE',
  },
  {
    id: 'operations',
    label: 'Operations',
    href: '/operations',
    icon: RiPulseLine,
    permission: 'operations.read',
    badge: 'OE',
  },
  {
    id: 'orders',
    label: 'Orders Master',
    href: '/sales/orders',
    icon: RiShoppingBag3Line,
    permission: 'orders.read',
  },
  {
    id: 'prepress',
    label: 'Prepress',
    href: '/prepress/artwork',
    icon: RiFileCheckLine,
    permission: 'prepress.read',
  },
  {
    id: 'production',
    label: 'Production',
    href: '/production/queue',
    icon: RiPrinterLine,
    permission: 'production.read',
  },
  {
    id: 'qc',
    label: 'QC Gate',
    href: '/qc/inspection',
    icon: RiCheckboxCircleLine,
    permission: 'qc.read',
  },
  {
    id: 'packing',
    label: 'Packing',
    href: '/packing/station',
    icon: RiBox3Line,
    permission: 'packing.read',
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    href: '/dispatch/manifest',
    icon: RiTruckLine,
    permission: 'dispatch.read',
  },
  {
    id: 'finance',
    label: 'Finance',
    href: '/finance/payments',
    icon: RiExchangeDollarLine,
    permission: 'finance.read',
  },
  {
    id: 'products',
    label: 'Products',
    href: '/admin/products',
    icon: RiArchiveDrawerLine,
    permission: 'orders.write',
  },
  {
    id: 'staff',
    label: 'Staff',
    href: '/admin/staff',
    icon: RiShieldUserLine,
    permission: 'staff.manage',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/admin/settings',
    icon: RiSettings4Line,
    permission: 'settings.manage',
  },
];

export function MobileStationBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const activeTabRef = useRef<HTMLAnchorElement | null>(null);

  // Filter tabs based on user permissions. Owner/ADMIN_MANAGER has full factory access.
  const isOwner = user?.role === 'ADMIN_MANAGER';
  const userPermissions = user?.permissions || [];

  const visibleTabs = STATION_TABS.filter((tab) => {
    if (isOwner) return true;
    if (!tab.permission) return true;
    return userPermissions.includes(tab.permission);
  });

  // Auto-scroll active tab into view horizontally on route change
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [pathname]);

  if (visibleTabs.length <= 1) return null;

  return (
    <nav
      aria-label="Mobile Stations Navigation"
      className="md:hidden flex-shrink-0 bg-white border-b border-[#E5E5E5] px-2.5 py-1.5 sticky top-0 z-20 shadow-2xs"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isExact = pathname === tab.href;
          const isSubMatch =
            !isExact &&
            tab.href !== '/admin' &&
            tab.href !== '/admin/dashboard' &&
            pathname.startsWith(tab.href);
          const isActive = isExact || isSubMatch;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              ref={isActive ? activeTabRef : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-black text-[#FFED00] shadow-xs ring-1 ring-black'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-black'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    isActive ? 'bg-[#FFED00] text-black' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

