'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RiArrowRightSLine, RiHome4Line } from 'react-icons/ri';
import { CANONICAL_ADMIN_NAV } from './navigation';

const ROUTE_LABELS: Record<string, string> = {
  admin: 'Executive Management',
  dashboard: 'Executive Overview',
  products: 'Products & Field Builder',
  categories: 'Categories & Taxonomies',
  sales: 'Sales Department',
  orders: 'Orders Master Queue',
  'walk-in': 'Walk-in POS Orders',
  customers: 'Corporate Customers',
  pricing: 'Pricing & Substrates',
  production: 'Production Floor',
  queue: 'Press Schedule & Queue',
  inventory: 'Materials & Substrates',
  prepress: 'Prepress Studio',
  artwork: 'Artwork Verification',
  qc: 'Quality Engineering',
  inspection: 'QC Release & Inspection',
  packing: 'Packaging Station',
  station: 'Parcel Station',
  dispatch: 'Logistics & Dispatch',
  manifest: 'Courier Manifest',
  finance: 'Accounts & Billing',
  payments: 'Payments & Ledgers',
  staff: 'Staff & Shift RBAC',
  settings: 'Factory Settings',
  operations: 'Operations Command',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  // Build breadcrumb items
  const crumbs = segments.map((seg, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    
    // Check if canonical nav has a matching label
    const navMatch = CANONICAL_ADMIN_NAV.find((item) => item.href === href);
    const label = navMatch ? navMatch.label : ROUTE_LABELS[seg.toLowerCase()] || seg.toUpperCase();

    const isLast = idx === segments.length - 1;

    return {
      label,
      href,
      isLast,
    };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-[11px] font-mono">
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-1 text-[#525252] hover:text-black transition-colors"
        title="Admin Operations"
      >
        <RiHome4Line className="h-3.5 w-3.5 text-[#737373]" />
        <span className="font-semibold text-black uppercase tracking-wider">ERP</span>
      </Link>

      {crumbs.map((crumb) => (
        <React.Fragment key={crumb.href}>
          <RiArrowRightSLine className="h-3.5 w-3.5 text-[#737373] flex-shrink-0" />
          {crumb.isLast ? (
            <span className="font-semibold text-black truncate max-w-[200px]" aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-[#525252] hover:text-black transition-colors truncate max-w-[150px]"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

