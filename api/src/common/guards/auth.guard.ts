import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ROLES_KEY, DEPARTMENT_KEY, PERMISSIONS_KEY, IS_PUBLIC_KEY } from '../decorators/auth.decorator';
import { UserRole, Department, JwtPayload, getRolePermissions } from '../types/roles';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = JwtPayload>(err: unknown, user: TUser | false, _info: unknown, _context: ExecutionContext): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user || !user.role) {
      throw new UnauthorizedException('User role not identified');
    }

    // ADMIN_MANAGER has full overarching authority
    if (user.role === UserRole.ADMIN_MANAGER) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(`User role '${user.role}' is not authorized for this resource`);
    }

    return true;
  }
}

@Injectable()
export class DepartmentGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredDepartments = this.reflector.getAllAndOverride<Department[]>(DEPARTMENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredDepartments || requiredDepartments.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // ADMIN_MANAGER can bypass departmental restrictions
    if (user.role === UserRole.ADMIN_MANAGER) {
      return true;
    }

    if (!user.department) {
      throw new ForbiddenException('User has no department assigned');
    }

    const hasDepartment = requiredDepartments.includes(user.department);
    if (!hasDepartment) {
      throw new ForbiddenException(`Department '${user.department}' is not authorized for this queue`);
    }

    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user || !user.role) {
      throw new UnauthorizedException('Authentication required');
    }

    // ADMIN_MANAGER has overarching system authority
    if (user.role === UserRole.ADMIN_MANAGER) {
      return true;
    }

    const userPermissions = getRolePermissions(user.role);
    const hasAll = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasAll) {
      throw new ForbiddenException(
        `User role '${user.role}' lacks required permission: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}
