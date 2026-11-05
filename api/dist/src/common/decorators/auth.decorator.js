"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = exports.Public = exports.IS_PUBLIC_KEY = exports.RequirePermissions = exports.PERMISSIONS_KEY = exports.Departments = exports.DEPARTMENT_KEY = exports.Roles = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ROLES_KEY = 'roles';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
exports.DEPARTMENT_KEY = 'departments';
const Departments = (...departments) => (0, common_1.SetMetadata)(exports.DEPARTMENT_KEY, departments);
exports.Departments = Departments;
exports.PERMISSIONS_KEY = 'permissions';
const RequirePermissions = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.RequirePermissions = RequirePermissions;
exports.IS_PUBLIC_KEY = 'isPublic';
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
});
//# sourceMappingURL=auth.decorator.js.map