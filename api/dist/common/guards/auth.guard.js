"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsGuard = exports.DepartmentGuard = exports.RolesGuard = exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const passport_1 = require("@nestjs/passport");
const auth_decorator_1 = require("../decorators/auth.decorator");
const roles_1 = require("../types/roles");
let JwtAuthGuard = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    reflector;
    constructor(reflector) {
        super();
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(auth_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        return super.canActivate(context);
    }
    handleRequest(err, user, _info, _context) {
        if (err || !user) {
            throw err || new common_1.UnauthorizedException('Authentication required');
        }
        return user;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], JwtAuthGuard);
let RolesGuard = class RolesGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(auth_decorator_1.ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || !user.role) {
            throw new common_1.UnauthorizedException('User role not identified');
        }
        if (user.role === roles_1.UserRole.ADMIN_MANAGER) {
            return true;
        }
        const hasRole = requiredRoles.includes(user.role);
        if (!hasRole) {
            throw new common_1.ForbiddenException(`User role '${user.role}' is not authorized for this resource`);
        }
        return true;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
let DepartmentGuard = class DepartmentGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredDepartments = this.reflector.getAllAndOverride(auth_decorator_1.DEPARTMENT_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredDepartments || requiredDepartments.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.UnauthorizedException('User not authenticated');
        }
        if (user.role === roles_1.UserRole.ADMIN_MANAGER) {
            return true;
        }
        if (!user.department) {
            throw new common_1.ForbiddenException('User has no department assigned');
        }
        const hasDepartment = requiredDepartments.includes(user.department);
        if (!hasDepartment) {
            throw new common_1.ForbiddenException(`Department '${user.department}' is not authorized for this queue`);
        }
        return true;
    }
};
exports.DepartmentGuard = DepartmentGuard;
exports.DepartmentGuard = DepartmentGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], DepartmentGuard);
let PermissionsGuard = class PermissionsGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredPermissions = this.reflector.getAllAndOverride(auth_decorator_1.PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || !user.role) {
            throw new common_1.UnauthorizedException('Authentication required');
        }
        if (user.role === roles_1.UserRole.ADMIN_MANAGER) {
            return true;
        }
        const userPermissions = (0, roles_1.getRolePermissions)(user.role);
        const hasAll = requiredPermissions.every((perm) => userPermissions.includes(perm));
        if (!hasAll) {
            throw new common_1.ForbiddenException(`User role '${user.role}' lacks required permission: ${requiredPermissions.join(', ')}`);
        }
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], PermissionsGuard);
//# sourceMappingURL=auth.guard.js.map