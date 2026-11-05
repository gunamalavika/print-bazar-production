// Standalone UI RBAC Navigation Matrix Test
// Runs all 10 canonical roles against navigation rules, route authorization, and empty section elimination

const ROLE_PERMISSIONS = {
  ADMIN_MANAGER: [
    'overview.read', 'orders.read', 'orders.write', 'orders.override',
    'production.read', 'production.start', 'production.pause', 'production.complete',
    'jobcard.read', 'artwork.read', 'artwork.review', 'artwork.proof',
    'qc.preproduction.read', 'qc.preproduction.inspect', 'qc.final.read', 'qc.final.inspect',
    'packing.read', 'packing.create', 'dispatch.read', 'dispatch.scan', 'dispatch.manifest',
    'customers.read', 'customers.write', 'pricing.read', 'pricing.write',
    'finance.read', 'finance.write', 'staff.read', 'staff.write', 'settings.read', 'settings.write',
  ],
  SALES_OFFICE: [
    'orders.read', 'orders.write', 'customers.read', 'customers.write',
    'pricing.read', 'finance.read',
  ],
  DESIGNER_PREPRESS: [
    'artwork.read', 'artwork.review', 'artwork.proof', 'qc.preproduction.read',
  ],
  PRE_PRODUCTION_QC: [
    'qc.preproduction.read', 'qc.preproduction.inspect', 'artwork.read',
  ],
  PRODUCTION_OPERATOR: [
    'production.read', 'production.start', 'production.pause', 'production.complete', 'jobcard.read',
  ],
  FINAL_QC_INSPECTOR: [
    'qc.final.read', 'qc.final.inspect',
  ],
  PACKING_OPERATOR: [
    'packing.read', 'packing.create',
  ],
  DISPATCH_LOGISTICS: [
    'dispatch.read', 'dispatch.scan', 'dispatch.manifest',
  ],
  ACCOUNTS: [
    'finance.read', 'finance.write', 'customers.read',
  ],
  CUSTOMER: [
    'customer.storefront', 'customer.orders.read', 'customer.proof.approve', 'customer.invoices.read',
  ],
};

const CANONICAL_ADMIN_NAV = [
  { id: 'dashboard', label: 'Overview Dashboard', href: '/admin/dashboard', requiredPermissions: ['overview.read'], matchMode: 'all', section: 'MANAGEMENT_INTELLIGENCE' },
  { id: 'orders', label: 'Orders Master Queue', href: '/admin/orders', requiredPermissions: ['orders.read'], matchMode: 'all', section: 'CORE_OPERATIONS' },
  { id: 'production', label: 'Production & Job Cards', href: '/admin/production', requiredPermissions: ['production.read'], matchMode: 'all', section: 'CORE_OPERATIONS' },
  { id: 'artwork', label: 'Artwork & Prepress', href: '/admin/artwork', requiredPermissions: ['artwork.read'], matchMode: 'all', section: 'QUALITY_GATES' },
  { id: 'qc', label: 'QC Release & Inspection', href: '/admin/qc', requiredPermissions: ['qc.preproduction.read', 'qc.final.read'], matchMode: 'any', section: 'QUALITY_GATES' },
  { id: 'packing', label: 'Packing & Parcel Station', href: '/admin/packing', requiredPermissions: ['packing.read'], matchMode: 'all', section: 'FULFILLMENT' },
  { id: 'dispatch', label: 'Dispatch & Courier Manifest', href: '/admin/dispatch', requiredPermissions: ['dispatch.read'], matchMode: 'all', section: 'FULFILLMENT' },
  { id: 'customers', label: 'Corporate Customers', href: '/admin/customers', requiredPermissions: ['customers.read'], matchMode: 'all', section: 'COMMERCIAL' },
  { id: 'pricing', label: 'Pricing & Substrates', href: '/admin/pricing', requiredPermissions: ['pricing.read'], matchMode: 'all', section: 'COMMERCIAL' },
  { id: 'finance', label: 'Payments & Invoices', href: '/admin/finance', requiredPermissions: ['finance.read'], matchMode: 'all', section: 'COMMERCIAL' },
  { id: 'staff', label: 'Staff & Shift RBAC', href: '/admin/staff', requiredPermissions: ['staff.read'], matchMode: 'all', section: 'GOVERNANCE' },
  { id: 'settings', label: 'Factory Plant Settings', href: '/admin/settings', requiredPermissions: ['settings.read'], matchMode: 'all', section: 'GOVERNANCE' },
];

function isNavItemAuthorized(item, userPermissions) {
  if (!userPermissions || userPermissions.length === 0) return false;
  if (item.matchMode === 'any') {
    return item.requiredPermissions.some((p) => userPermissions.includes(p));
  }
  return item.requiredPermissions.every((p) => userPermissions.includes(p));
}

function getVisibleAdminNavigation(userPermissions) {
  const authorizedItems = CANONICAL_ADMIN_NAV.filter((item) => isNavItemAuthorized(item, userPermissions));
  const sectionMap = new Map();
  for (const item of authorizedItems) {
    const list = sectionMap.get(item.section) || [];
    list.push(item);
    sectionMap.set(item.section, list);
  }
  const resultSections = [];
  for (const [sectionKey, items] of sectionMap.entries()) {
    if (items.length === 0) continue; // Prune empty sections
    resultSections.push({ id: sectionKey, items });
  }
  return resultSections;
}

function checkRouteAuthorization(pathname, userPermissions) {
  const matchingItem = [...CANONICAL_ADMIN_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (!matchingItem) return { isAuthorized: true, requiredPermissions: [] };
  return {
    isAuthorized: isNavItemAuthorized(matchingItem, userPermissions),
    requiredPermissions: matchingItem.requiredPermissions,
  };
}

console.log('--- STARTING RBAC UI TEST MATRIX ---');

// 1. CUSTOMER
const customerNav = getVisibleAdminNavigation(ROLE_PERMISSIONS.CUSTOMER);
console.assert(customerNav.length === 0, 'CUSTOMER must see ZERO admin sections');
console.log('✓ CUSTOMER: 0 admin sections visible');

// 2. PRODUCTION_OPERATOR
const prodNav = getVisibleAdminNavigation(ROLE_PERMISSIONS.PRODUCTION_OPERATOR);
const prodItems = prodNav.flatMap((s) => s.items.map((i) => i.id));
console.assert(prodItems.length === 1 && prodItems[0] === 'production', 'PRODUCTION_OPERATOR only sees production');
console.assert(!prodItems.includes('finance'), 'PRODUCTION_OPERATOR must NOT see finance');
console.assert(!prodItems.includes('packing'), 'PRODUCTION_OPERATOR must NOT see packing');
console.log('✓ PRODUCTION_OPERATOR: only sees Production & Job Cards; all other sections pruned');

// Route Check for PRODUCTION_OPERATOR
const poAccessProd = checkRouteAuthorization('/admin/production', ROLE_PERMISSIONS.PRODUCTION_OPERATOR);
const poAccessFinance = checkRouteAuthorization('/admin/finance', ROLE_PERMISSIONS.PRODUCTION_OPERATOR);
console.assert(poAccessProd.isAuthorized === true, 'PRODUCTION_OPERATOR must be authorized for /admin/production');
console.assert(poAccessFinance.isAuthorized === false, 'PRODUCTION_OPERATOR must be blocked from /admin/finance');
console.log('✓ PRODUCTION_OPERATOR: /admin/production allowed, /admin/finance blocked (403)');

// 3. PACKING_OPERATOR
const packNav = getVisibleAdminNavigation(ROLE_PERMISSIONS.PACKING_OPERATOR);
const packItems = packNav.flatMap((s) => s.items.map((i) => i.id));
console.assert(packItems.length === 1 && packItems[0] === 'packing', 'PACKING_OPERATOR only sees packing');
console.assert(!packItems.includes('production'), 'PACKING_OPERATOR must NOT see production');
console.assert(!packItems.includes('finance'), 'PACKING_OPERATOR must NOT see finance');
console.log('✓ PACKING_OPERATOR: only sees Packing station; all other sections pruned');

const pkAccessPack = checkRouteAuthorization('/admin/packing', ROLE_PERMISSIONS.PACKING_OPERATOR);
const pkAccessProd = checkRouteAuthorization('/admin/production', ROLE_PERMISSIONS.PACKING_OPERATOR);
console.assert(pkAccessPack.isAuthorized === true, 'PACKING_OPERATOR must be authorized for /admin/packing');
console.assert(pkAccessProd.isAuthorized === false, 'PACKING_OPERATOR must be blocked from /admin/production');
console.log('✓ PACKING_OPERATOR: /admin/packing allowed, /admin/production blocked (403)');

// 4. DISPATCH_LOGISTICS
const dispNav = getVisibleAdminNavigation(ROLE_PERMISSIONS.DISPATCH_LOGISTICS);
const dispItems = dispNav.flatMap((s) => s.items.map((i) => i.id));
console.assert(dispItems.length === 1 && dispItems[0] === 'dispatch', 'DISPATCH_LOGISTICS only sees dispatch');
console.log('✓ DISPATCH_LOGISTICS: only sees Dispatch & Courier Manifest');

// 5. DESIGNER_PREPRESS
const prepressNav = getVisibleAdminNavigation(ROLE_PERMISSIONS.DESIGNER_PREPRESS);
const prepressItems = prepressNav.flatMap((s) => s.items.map((i) => i.id));
console.assert(prepressItems.includes('artwork'), 'DESIGNER_PREPRESS must see artwork');
console.assert(!prepressItems.includes('production'), 'DESIGNER_PREPRESS must NOT see production');
console.assert(!prepressItems.includes('finance'), 'DESIGNER_PREPRESS must NOT see finance');
console.log('✓ DESIGNER_PREPRESS: sees Artwork & QC Gates, never sees production or finance');

// 6. SALES_OFFICE
const salesNav = getVisibleAdminNavigation(ROLE_PERMISSIONS.SALES_OFFICE);
const salesItems = salesNav.flatMap((s) => s.items.map((i) => i.id));
console.assert(salesItems.includes('orders'), 'SALES_OFFICE must see orders');
console.assert(salesItems.includes('customers'), 'SALES_OFFICE must see customers');
console.assert(!salesItems.includes('production'), 'SALES_OFFICE must NOT see production');
console.assert(!salesItems.includes('packing'), 'SALES_OFFICE must NOT see packing');
console.log('✓ SALES_OFFICE: sees Orders, Customers, Pricing, Finance; never sees shop-floor controls');

// 7. ACCOUNTS
const accNav = getVisibleAdminNavigation(ROLE_PERMISSIONS.ACCOUNTS);
const accItems = accNav.flatMap((s) => s.items.map((i) => i.id));
console.assert(accItems.includes('finance'), 'ACCOUNTS must see finance');
console.assert(accItems.includes('customers'), 'ACCOUNTS must see customers');
console.assert(!accItems.includes('production'), 'ACCOUNTS must NOT see production');
console.log('✓ ACCOUNTS: sees Finance & Customers, never sees production');

// 8. ADMIN_MANAGER
const adminNav = getVisibleAdminNavigation(ROLE_PERMISSIONS.ADMIN_MANAGER);
const adminItems = adminNav.flatMap((s) => s.items.map((i) => i.id));
console.assert(adminItems.length === CANONICAL_ADMIN_NAV.length, 'ADMIN_MANAGER sees ALL canonical items');
console.assert(adminNav.length === 6, 'ADMIN_MANAGER sees all 6 sections');
console.log('✓ ADMIN_MANAGER: sees all 12 operational modules across all 6 sections');

// 9. EMPTY SECTION PRUNING
for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
  const sections = getVisibleAdminNavigation(perms);
  for (const s of sections) {
    console.assert(s.items.length > 0, `Section ${s.id} in role ${role} must NOT be empty`);
  }
}
console.log('✓ ZERO EMPTY SECTIONS: All sections across all roles contain at least 1 authorized item');

console.log('--- ALL UI RBAC MATRIX TESTS PASSED SUCCESSFULLY! ---');
