import { UserRole, Department } from '@prisma/client';
export { UserRole, Department };
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    department?: Department | null;
    customerId?: string | null;
}
export type ActiveUserRole = 'CUSTOMER' | 'SALES_OFFICE' | 'OPERATIONAL_MANAGER' | 'DESIGNER_PREPRESS' | 'PRODUCTION_OPERATOR' | 'FINAL_QC_INSPECTOR' | 'PACKING_OPERATOR' | 'DISPATCH_LOGISTICS' | 'ACCOUNTS' | 'ADMIN_MANAGER';
export declare const ROLE_PERMISSIONS: Partial<Record<UserRole, string[]>>;
export declare function getRolePermissions(role: UserRole): string[];
