import { IconType } from 'react-icons';
import {
  RiDashboard3Line,
  RiShoppingBag3Line,
  RiPrinterLine,
  RiFileCheckLine,
  RiCheckboxCircleLine,
  RiBox3Line,
  RiTruckLine,
  RiExchangeDollarLine,
  RiShieldUserLine,
  RiSettings4Line,
  RiArchiveDrawerLine,
  RiFoldersLine,
  RiStore2Line,
  RiPulseLine,
  RiListCheck2,
  RiListSettingsLine,
  RiFileList3Line,
  RiMapPinLine,
  RiMapPin2Line,
  RiScales3Line,
  RiCalculatorLine,
  RiBarChart2Line,
  RiKanbanView2,
} from 'react-icons/ri';

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: IconType;
  requiredPermissions: string[];
  matchMode?: 'all' | 'any';
  section: string;
  order: number;
  badge?: string;
  badgeVariant?: 'yellow' | 'emerald' | 'blue' | 'zinc' | 'amber';
  description?: string;
}

export interface AdminNavSection {
  id: string;
  title: string;
  order: number;
  items: AdminNavItem[];
}

export const CANONICAL_ADMIN_NAV: AdminNavItem[] = [
  // SECTION: OVERVIEW & INTELLIGENCE
  {
    id: 'dashboard',
    label: 'Overview Dashboard',
    href: '/admin/dashboard',
    icon: RiDashboard3Line,
    requiredPermissions: ['overview.read'],
    matchMode: 'all',
    section: 'MANAGEMENT_INTELLIGENCE',
    order: 10,
    badge: 'LIVE',
    badgeVariant: 'yellow',
    description: 'Executive plant telemetry & order velocities',
  },

  // SECTION: OPERATIONS COORDINATION (OE)
  {
    id: 'operations-dashboard',
    label: 'Operations Command',
    href: '/operations',
    icon: RiPulseLine,
    requiredPermissions: ['operations.read'],
    matchMode: 'all',
    section: 'OPERATIONS_COORDINATION',
    order: 12,
    badge: 'OE',
    badgeVariant: 'yellow',
    description: 'Central operational order intake & department coordination',
  },
  {
    id: 'operations-orders',
    label: 'Operational Orders',
    href: '/operations/orders',
    icon: RiListCheck2,
    requiredPermissions: ['operations.read'],
    matchMode: 'all',
    section: 'OPERATIONS_COORDINATION',
    order: 13,
    description: 'Live order queue, assignment status & blocker engine',
  },

  // SECTION: CATALOGUE & INVENTORY (ADMIN-CONTROLLED)
  {
    id: 'products',
    label: 'Products & Field Builder',
    href: '/admin/products',
    icon: RiArchiveDrawerLine,
    requiredPermissions: ['orders.write', 'pricing.write'],
    matchMode: 'any',
    section: 'CATALOGUE_INVENTORY',
    order: 15,
    badge: 'BUILDER',
    badgeVariant: 'yellow',
    description: 'Dynamic products, custom fields & media manager',
  },
  {
    id: 'option-groups',
    label: 'Option Groups Library',
    href: '/admin/option-groups',
    icon: RiListSettingsLine,
    requiredPermissions: ['orders.write', 'pricing.write'],
    matchMode: 'any',
    section: 'CATALOGUE_INVENTORY',
    order: 16,
    badge: 'LIBRARY',
    badgeVariant: 'yellow',
    description: 'Central reusable option groups library & default values',
  },
  {
    id: 'personalization-templates',
    label: 'Personalization Templates',
    href: '/admin/personalization-templates',
    icon: RiFileList3Line,
    requiredPermissions: ['orders.write', 'pricing.write'],
    matchMode: 'any',
    section: 'CATALOGUE_INVENTORY',
    order: 17,
    badge: 'TEMPLATES',
    badgeVariant: 'emerald',
    description: 'Reusable frames, keepsakes, and gift personalization templates',
  },
  {
    id: 'categories',
    label: 'Categories & Taxonomies',
    href: '/admin/categories',
    icon: RiFoldersLine,
    requiredPermissions: ['orders.write', 'pricing.write'],
    matchMode: 'any',
    section: 'CATALOGUE_INVENTORY',
    order: 18,
    description: 'Storefront categories & ordering',
  },


  // SECTION: CORE OPERATIONS
  {
    id: 'orders',
    label: 'Orders Master Queue',
    href: '/sales/orders',
    icon: RiShoppingBag3Line,
    requiredPermissions: ['orders.read'],
    matchMode: 'all',
    section: 'CORE_OPERATIONS',
    order: 20,
    badgeVariant: 'blue',
    description: 'Central customer order stream & status tracker',
  },
  {
    id: 'walk-in-orders',
    label: 'Walk-in POS Orders',
    href: '/sales/walk-in',
    icon: RiStore2Line,
    requiredPermissions: ['orders.read'],
    matchMode: 'all',
    section: 'CORE_OPERATIONS',
    order: 21,
    badge: 'POS',
    badgeVariant: 'amber',
    description: 'Direct sales counter & phone order creation desk',
  },
  {
    id: 'production',
    label: 'Production & Job Cards',
    href: '/production/queue',
    icon: RiPrinterLine,
    requiredPermissions: ['production.read'],
    matchMode: 'all',
    section: 'CORE_OPERATIONS',
    order: 30,
    badgeVariant: 'amber',
    description: 'Press scheduling, RIP engines & machine routing',
  },

  // SECTION: QUALITY & PREPRESS GATES
  {
    id: 'artwork',
    label: 'Artwork & Prepress',
    href: '/prepress/artwork',
    icon: RiFileCheckLine,
    requiredPermissions: ['artwork.read'],
    matchMode: 'all',
    section: 'QUALITY_GATES',
    order: 40,
    description: 'Pre-flight file verification & proof approvals',
  },
  {
    id: 'design-process-kanban',
    label: 'Design Process Kanban',
    href: '/prepress/kanban',
    icon: RiKanbanView2,
    requiredPermissions: ['artwork.read'],
    matchMode: 'all',
    section: 'QUALITY_GATES',
    order: 41,
    badge: 'BOARD',
    badgeVariant: 'yellow',
    description: 'Design department process: Artwork Check → Designing → Waiting for Approval → Ready to Print',
  },
  {
    id: 'qc',
    label: 'QC Release & Inspection',
    href: '/qc/inspection',
    icon: RiCheckboxCircleLine,
    requiredPermissions: ['qc.preproduction.read', 'qc.final.read'],
    matchMode: 'any',
    section: 'QUALITY_GATES',
    order: 50,
    badgeVariant: 'emerald',
    description: 'Tolerance gates, bleed audits & batch sign-off',
  },

  // SECTION: FULFILLMENT & DISPATCH
  {
    id: 'packing',
    label: 'Packing & Parcel Station',
    href: '/packing/station',
    icon: RiBox3Line,
    requiredPermissions: ['packing.read'],
    matchMode: 'all',
    section: 'FULFILLMENT',
    order: 60,
    description: 'Carton labeling, barcode scanning & bundling',
  },
  {
    id: 'dispatch',
    label: 'Dispatch & Courier Manifest',
    href: '/dispatch/manifest',
    icon: RiTruckLine,
    requiredPermissions: ['dispatch.read'],
    matchMode: 'all',
    section: 'FULFILLMENT',
    order: 70,
    description: 'Waybills, carrier integrations & logistics',
  },

  // SECTION: SHIPPING & LOGISTICS (CENTRALIZED SHIPPING SUITE)
  {
    id: 'shipping-overview',
    label: 'Shipping Overview',
    href: '/admin/shipping',
    icon: RiTruckLine,
    requiredPermissions: ['shipping.view'],
    matchMode: 'any',
    section: 'SHIPPING_LOGISTICS',
    order: 71,
    badge: 'LIVE',
    badgeVariant: 'yellow',
    description: 'Central shipping dashboard & telemetry',
  },
  {
    id: 'shipping-configuration',
    label: 'Shipping Configuration',
    href: '/admin/shipping/configuration',
    icon: RiSettings4Line,
    requiredPermissions: ['shipping.configure', 'shipping.view'],
    matchMode: 'any',
    section: 'SHIPPING_LOGISTICS',
    order: 72,
    description: 'Global origin, units, rounding & calculation settings',
  },
  {
    id: 'shipping-zones',
    label: 'Delivery Zones',
    href: '/admin/shipping/zones',
    icon: RiMapPinLine,
    requiredPermissions: ['shipping.zones.manage', 'shipping.view'],
    matchMode: 'any',
    section: 'SHIPPING_LOGISTICS',
    order: 73,
    description: 'Manage geographical shipping delivery zones',
  },
  {
    id: 'shipping-pincodes',
    label: 'Pincode Management',
    href: '/admin/shipping/pincodes',
    icon: RiMapPin2Line,
    requiredPermissions: ['shipping.pincodes.manage', 'shipping.view'],
    matchMode: 'any',
    section: 'SHIPPING_LOGISTICS',
    order: 74,
    description: 'Indian 6-digit PIN codes & serviceability database',
  },
  {
    id: 'shipping-rates',
    label: 'Weight Slabs & Rate Cards',
    href: '/admin/shipping/rates',
    icon: RiScales3Line,
    requiredPermissions: ['shipping.rates.manage', 'shipping.view'],
    matchMode: 'any',
    section: 'SHIPPING_LOGISTICS',
    order: 75,
    description: 'Weight-based tier slabs, rate cards & additional rates',
  },
  {
    id: 'shipping-packaging',
    label: 'Packaging Configuration',
    href: '/admin/shipping/packaging',
    icon: RiBox3Line,
    requiredPermissions: ['shipping.packaging.manage', 'shipping.view'],
    matchMode: 'any',
    section: 'SHIPPING_LOGISTICS',
    order: 76,
    description: 'Cartons, tubes, tare weights & dimension profiles',
  },
  {
    id: 'shipping-calculator',
    label: 'Shipping Calculator',
    href: '/admin/shipping/calculator',
    icon: RiCalculatorLine,
    requiredPermissions: ['shipping.calculator.use', 'shipping.view'],
    matchMode: 'any',
    section: 'SHIPPING_LOGISTICS',
    order: 77,
    description: 'Live test engine for simulated shipping calculations',
  },
  {
    id: 'shipping-orders',
    label: 'Shipping Orders',
    href: '/admin/shipping/orders',
    icon: RiFileList3Line,
    requiredPermissions: ['shipping.orders.view', 'shipping.view'],
    matchMode: 'any',
    section: 'SHIPPING_LOGISTICS',
    order: 78,
    description: 'Order shipping breakdowns & dispatch weights',
  },
  {
    id: 'shipping-reports',
    label: 'Shipping Reports',
    href: '/admin/shipping/reports',
    icon: RiBarChart2Line,
    requiredPermissions: ['shipping.reports.view', 'shipping.view'],
    matchMode: 'any',
    section: 'SHIPPING_LOGISTICS',
    order: 79,
    description: 'Shipping analytics, zone revenues & weight distributions',
  },

  // SECTION: COMMERCIAL & FINANCE

  {
    id: 'finance',
    label: 'Payments & Invoices',
    href: '/finance/payments',
    icon: RiExchangeDollarLine,
    requiredPermissions: ['finance.read'],
    matchMode: 'all',
    section: 'COMMERCIAL',
    order: 100,
    description: 'Tax ledgers, GST filings & payment gateway sync',
  },

  // SECTION: SYSTEM & STAFF GOVERNANCE
  {
    id: 'staff',
    label: 'Staff & Shift RBAC',
    href: '/admin/staff',
    icon: RiShieldUserLine,
    requiredPermissions: ['staff.read'],
    matchMode: 'all',
    section: 'GOVERNANCE',
    order: 110,
    description: 'Operator permissions, shift rotas & access audit',
  },
  {
    id: 'site-settings',
    label: 'Site Settings',
    href: '/admin/site-settings',
    icon: RiStore2Line,
    requiredPermissions: ['settings.read'],
    matchMode: 'all',
    section: 'GOVERNANCE',
    order: 115,
    badge: 'STORE',
    badgeVariant: 'yellow',
    description: 'Home page hero image & header marquee announcements',
  },
  {
    id: 'settings',
    label: 'Factory Plant Settings',
    href: '/admin/settings',
    icon: RiSettings4Line,
    requiredPermissions: ['settings.read'],
    matchMode: 'all',
    section: 'GOVERNANCE',
    order: 120,
    description: 'Machine calibrations & environmental profiles',
  },
];

export const SECTION_METADATA: Record<string, { title: string; order: number }> = {
  MANAGEMENT_INTELLIGENCE: { title: 'EXECUTIVE INTELLIGENCE', order: 1 },
  OPERATIONS_COORDINATION: { title: 'OPERATIONAL COMMAND (OE)', order: 2 },
  CATALOGUE_INVENTORY: { title: 'CATALOGUE & INVENTORY', order: 3 },
  CORE_OPERATIONS: { title: 'SHOP-FLOOR OPERATIONS', order: 4 },
  QUALITY_GATES: { title: 'PREPRESS & QUALITY GATES', order: 5 },
  FULFILLMENT: { title: 'PACKING & DISPATCH', order: 6 },
  SHIPPING_LOGISTICS: { title: 'SHIPPING & LOGISTICS', order: 7 },
  COMMERCIAL: { title: 'COMMERCIAL & LEDGER', order: 8 },
  GOVERNANCE: { title: 'PLANT GOVERNANCE & ROLES', order: 9 },
};

/**
 * Validates if the user's permissions grant access to a specific nav item
 */
export function isNavItemAuthorized(item: AdminNavItem, userPermissions: string[]): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  if (item.matchMode === 'any') {
    return item.requiredPermissions.some((perm) => userPermissions.includes(perm));
  }

  // Default: must satisfy all required permissions
  return item.requiredPermissions.every((perm) => userPermissions.includes(perm));
}

/**
 * Centralized, permission-aware navigation builder.
 * Filters canonical navigation against backend permissions and eliminates empty sections.
 */
export function getVisibleAdminNavigation(
  userPermissions: string[],
  userRole?: string,
  userRoles?: string[]
): AdminNavSection[] {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return [];
  }

  const effectiveRoles = Array.isArray(userRoles) && userRoles.length > 0
    ? userRoles
    : (userRole ? [userRole] : []);

  const isOperatorOnly = effectiveRoles.length === 1 && effectiveRoles[0] === 'PRODUCTION_OPERATOR';

  // 1. Filter authorized items (and enforce role-level section exclusions ONLY if strictly PRODUCTION_OPERATOR only)
  const authorizedItems = CANONICAL_ADMIN_NAV.filter((item) => {
    if (
      isOperatorOnly &&
      (item.section === 'OPERATIONS_COORDINATION' || item.section === 'CATALOGUE_INVENTORY')
    ) {
      return false;
    }
    return isNavItemAuthorized(item, userPermissions);
  });

  // 2. Group by section
  const sectionMap = new Map<string, AdminNavItem[]>();

  for (const item of authorizedItems) {
    const existing = sectionMap.get(item.section) || [];
    existing.push(item);
    sectionMap.set(item.section, existing);
  }

  // 3. Build ordered section list, discarding empty sections
  const resultSections: AdminNavSection[] = [];

  for (const [sectionKey, items] of sectionMap.entries()) {
    if (items.length === 0) continue;

    const meta = SECTION_METADATA[sectionKey] || { title: sectionKey, order: 99 };
    items.sort((a, b) => a.order - b.order);

    resultSections.push({
      id: sectionKey,
      title: meta.title,
      order: meta.order,
      items,
    });
  }

  resultSections.sort((a, b) => a.order - b.order);
  return resultSections;
}

/**
 * Route protection helper: checks if the current URL pathname is authorized
 * for the user based on their permissions.
 */
export function checkRouteAuthorization(
  pathname: string,
  userPermissions: string[],
  userRole?: string,
  userRoles?: string[]
): { isAuthorized: boolean; requiredPermissions: string[] } {
  const matchingItem = [...CANONICAL_ADMIN_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (!matchingItem) {
    return { isAuthorized: true, requiredPermissions: [] };
  }

  const effectiveRoles = Array.isArray(userRoles) && userRoles.length > 0
    ? userRoles
    : (userRole ? [userRole] : []);

  const isOperatorOnly = effectiveRoles.length === 1 && effectiveRoles[0] === 'PRODUCTION_OPERATOR';

  if (
    isOperatorOnly &&
    (matchingItem.section === 'OPERATIONS_COORDINATION' || matchingItem.section === 'CATALOGUE_INVENTORY')
  ) {
    return {
      isAuthorized: false,
      requiredPermissions: matchingItem.requiredPermissions,
    };
  }

  // Prepress Designers have verified oversight to view released production queue jobs
  if (
    (effectiveRoles.includes('DESIGNER_PREPRESS') || userRole === 'DESIGNER_PREPRESS') &&
    pathname.startsWith('/production/queue')
  ) {
    return {
      isAuthorized: true,
      requiredPermissions: matchingItem.requiredPermissions,
    };
  }

  const authorized = isNavItemAuthorized(matchingItem, userPermissions);
  return {
    isAuthorized: authorized,
    requiredPermissions: matchingItem.requiredPermissions,
  };
}
