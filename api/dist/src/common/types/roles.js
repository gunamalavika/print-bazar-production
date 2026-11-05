"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.Department = exports.UserRole = void 0;
exports.getRolePermissions = getRolePermissions;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return client_1.UserRole; } });
Object.defineProperty(exports, "Department", { enumerable: true, get: function () { return client_1.Department; } });
exports.ROLE_PERMISSIONS = {
    [client_1.UserRole.ADMIN_MANAGER]: [
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
    ],
    [client_1.UserRole.SALES_OFFICE]: [
        'orders.read',
        'orders.write',
        'customers.read',
        'customers.write',
        'pricing.read',
        'finance.read',
    ],
    [client_1.UserRole.DESIGNER_PREPRESS]: [
        'artwork.read',
        'artwork.review',
        'artwork.proof',
    ],
    [client_1.UserRole.PRODUCTION_OPERATOR]: [
        'production.read',
        'production.start',
        'production.pause',
        'production.complete',
        'jobcard.read',
        'operations.read',
        'operations.write',
        'operations.assign',
    ],
    [client_1.UserRole.FINAL_QC_INSPECTOR]: [
        'qc.final.read',
        'qc.final.inspect',
    ],
    [client_1.UserRole.PACKING_OPERATOR]: [
        'packing.read',
        'packing.create',
    ],
    [client_1.UserRole.DISPATCH_LOGISTICS]: [
        'dispatch.read',
        'dispatch.scan',
        'dispatch.manifest',
    ],
    [client_1.UserRole.ACCOUNTS]: [
        'finance.read',
        'finance.write',
        'customers.read',
    ],
    [client_1.UserRole.CUSTOMER]: [
        'customer.storefront',
        'customer.orders.read',
        'customer.proof.approve',
        'customer.invoices.read',
    ],
    [client_1.UserRole.OPERATIONAL_MANAGER]: [
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
function getRolePermissions(role) {
    return exports.ROLE_PERMISSIONS[role] || [];
}
//# sourceMappingURL=roles.js.map