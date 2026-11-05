import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, PermissionsGuard, DepartmentGuard } from './auth.guard';
import { UserRole, Department, getRolePermissions } from '../types/roles';

describe('RBAC & Permissions Security Matrix Tests', () => {
  let reflector: Reflector;
  let rolesGuard: RolesGuard;
  let permissionsGuard: PermissionsGuard;
  let departmentGuard: DepartmentGuard;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
    permissionsGuard = new PermissionsGuard(reflector);
    departmentGuard = new DepartmentGuard(reflector);
  });

  function createMockContext(user: any, requiredRoles?: UserRole[], requiredPermissions?: string[], requiredDepartments?: Department[]): ExecutionContext {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === 'roles') return requiredRoles;
      if (key === 'permissions') return requiredPermissions;
      if (key === 'departments') return requiredDepartments;
      return undefined;
    });

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  describe('1. CUSTOMER access restriction', () => {
    it('CUSTOMER has no internal production or admin permissions', () => {
      const perms = getRolePermissions(UserRole.CUSTOMER);
      expect(perms).not.toContain('production.read');
      expect(perms).not.toContain('production.start');
      expect(perms).not.toContain('overview.read');
      expect(perms).not.toContain('qc.final.inspect');
    });

    it('CUSTOMER is forbidden from executing internal staff operations', () => {
      const context = createMockContext(
        { sub: 'c-1', role: UserRole.CUSTOMER },
        undefined,
        ['production.read']
      );
      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('2. SALES_OFFICE permission isolation', () => {
    it('SALES_OFFICE cannot access production without permission', () => {
      const perms = getRolePermissions(UserRole.SALES_OFFICE);
      expect(perms).toContain('orders.read');
      expect(perms).toContain('orders.write');
      expect(perms).not.toContain('production.start');
      expect(perms).not.toContain('production.read');

      const context = createMockContext(
        { sub: 's-1', role: UserRole.SALES_OFFICE },
        undefined,
        ['production.start']
      );
      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('3. DESIGNER_PREPRESS permission isolation', () => {
    it('DESIGNER cannot start production or access payments', () => {
      const perms = getRolePermissions(UserRole.DESIGNER_PREPRESS);
      expect(perms).toContain('artwork.read');
      expect(perms).toContain('artwork.review');
      expect(perms).not.toContain('production.start');
      expect(perms).not.toContain('finance.write');

      const context = createMockContext(
        { sub: 'd-1', role: UserRole.DESIGNER_PREPRESS },
        undefined,
        ['production.start']
      );
      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('4. PRODUCTION_OPERATOR permission isolation', () => {
    it('PRODUCTION_OPERATOR cannot modify payments or finance', () => {
      const perms = getRolePermissions(UserRole.PRODUCTION_OPERATOR);
      expect(perms).toContain('production.start');
      expect(perms).not.toContain('finance.write');
      expect(perms).not.toContain('finance.read');

      const context = createMockContext(
        { sub: 'po-1', role: UserRole.PRODUCTION_OPERATOR },
        undefined,
        ['finance.write']
      );
      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('5. FINAL_QC_INSPECTOR permission isolation', () => {
    it('FINAL_QC_INSPECTOR cannot dispatch shipments', () => {
      const perms = getRolePermissions(UserRole.FINAL_QC_INSPECTOR);
      expect(perms).toContain('qc.final.inspect');
      expect(perms).not.toContain('dispatch.manifest');
      expect(perms).not.toContain('dispatch.read');

      const context = createMockContext(
        { sub: 'qc-1', role: UserRole.FINAL_QC_INSPECTOR },
        undefined,
        ['dispatch.manifest']
      );
      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('6. PACKING_OPERATOR permission isolation', () => {
    it('PACKING_OPERATOR cannot access finance or staff administration', () => {
      const perms = getRolePermissions(UserRole.PACKING_OPERATOR);
      expect(perms).toContain('packing.read');
      expect(perms).not.toContain('finance.read');
      expect(perms).not.toContain('staff.read');

      const context = createMockContext(
        { sub: 'pk-1', role: UserRole.PACKING_OPERATOR },
        undefined,
        ['staff.read']
      );
      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('7. DISPATCH_LOGISTICS permission isolation', () => {
    it('DISPATCH_LOGISTICS cannot modify production jobs', () => {
      const perms = getRolePermissions(UserRole.DISPATCH_LOGISTICS);
      expect(perms).toContain('dispatch.read');
      expect(perms).not.toContain('production.start');

      const context = createMockContext(
        { sub: 'disp-1', role: UserRole.DISPATCH_LOGISTICS },
        undefined,
        ['production.start']
      );
      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('8. ACCOUNTS permission isolation', () => {
    it('ACCOUNTS cannot perform production transitions', () => {
      const perms = getRolePermissions(UserRole.ACCOUNTS);
      expect(perms).toContain('finance.read');
      expect(perms).not.toContain('production.complete');

      const context = createMockContext(
        { sub: 'acc-1', role: UserRole.ACCOUNTS },
        undefined,
        ['production.complete']
      );
      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('9. ADMIN_MANAGER overarching authority', () => {
    it('ADMIN_MANAGER has full access across all operations', () => {
      const context = createMockContext(
        { sub: 'admin-1', role: UserRole.ADMIN_MANAGER },
        [UserRole.PRODUCTION_OPERATOR],
        ['production.start', 'finance.write', 'staff.write']
      );
      expect(permissionsGuard.canActivate(context)).toBe(true);
      expect(rolesGuard.canActivate(context)).toBe(true);
      expect(departmentGuard.canActivate(context)).toBe(true);
    });
  });

  describe('10. Unauthorized user context rejection', () => {
    it('Throws UnauthorizedException if user context is missing', () => {
      const context = createMockContext(null, undefined, ['production.read']);
      expect(() => permissionsGuard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
