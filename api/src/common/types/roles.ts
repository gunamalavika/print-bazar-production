import { UserRole, Department } from '@prisma/client';

export { UserRole, Department };

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  department?: Department | null;
  customerId?: string | null;
}

export type ActiveUserRole =
  | 'CUSTOMER'
  | 'SALES_OFFICE'
  | 'OPERATIONAL_MANAGER'
  | 'DESIGNER_PREPRESS'
  | 'PRODUCTION_OPERATOR'
  | 'FINAL_QC_INSPECTOR'
  | 'PACKING_OPERATOR'
  | 'DISPATCH_LOGISTICS'
  | 'ACCOUNTS'
  | 'ADMIN_MANAGER';

export const ROLE_PERMISSIONS: Partial<Record<UserRole, string[]>> = {
  [UserRole.ADMIN_MANAGER]: [
    'overview.read',
    'orders.read',
    'orders.write',
    'orders.override',
    'production.read',
    'production.start',
    'production.pause',
    'production.complete',
    'jobcard.read',
    'artwork.read',
    'artwork.review',
    'artwork.proof',
    'qc.final.read',
    'qc.final.inspect',
    'packing.read',
    'packing.create',
    'dispatch.read',
    'dispatch.scan',
    'dispatch.manifest',
    'customers.read',
    'customers.write',
    'pricing.read',
    'pricing.write',
    'finance.read',
    'finance.write',
    'staff.read',
    'staff.write',
    'settings.read',
    'settings.write',
    'shipping.view',
    'shipping.configure',
    'shipping.zones.manage',
    'shipping.pincodes.manage',
    'shipping.rates.manage',
    'shipping.packaging.manage',
    'shipping.calculator.use',
    'shipping.orders.view',
    'shipping.reports.view',
  ],
  [UserRole.SALES_OFFICE]: [
    'orders.read',
    'orders.write',
    'customers.read',
    'customers.write',
    'pricing.read',
    'finance.read',
  ],
  [UserRole.DESIGNER_PREPRESS]: [
    'artwork.read',
    'artwork.review',
    'artwork.proof',
  ],
  [UserRole.PRODUCTION_OPERATOR]: [
    'production.read',
    'production.start',
    'production.pause',
    'production.complete',
    'jobcard.read',
  ],
  [UserRole.FINAL_QC_INSPECTOR]: [
    'qc.final.read',
    'qc.final.inspect',
  ],
  [UserRole.PACKING_OPERATOR]: [
    'packing.read',
    'packing.create',
  ],
  [UserRole.DISPATCH_LOGISTICS]: [
    'dispatch.read',
    'dispatch.scan',
    'dispatch.manifest',
    'shipping.view',
    'shipping.calculator.use',
    'shipping.orders.view',
  ],
  [UserRole.ACCOUNTS]: [
    'finance.read',
    'finance.write',
    'customers.read',
  ],
  [UserRole.CUSTOMER]: [
    'customer.storefront',
    'customer.orders.read',
    'customer.proof.approve',
    'customer.invoices.read',
  ],
  [UserRole.OPERATIONAL_MANAGER]: [
    'overview.read',
    'operations.read',
    'operations.write',
    'operations.assign',
    'orders.read',
    'orders.review',
    'orders.notes',
    'orders.priority',
    'artwork.read',
    'qc.final.read',
    'jobcard.read',
    'production.read',
    'packing.read',
    'dispatch.read',
    'finance.read',
    'sla.read',
    'audit.read',
  ],
};

export function getRolePermissions(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}
