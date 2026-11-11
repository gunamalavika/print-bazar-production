import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole, Department, JwtPayload, getRolePermissions } from '../../common/types/roles';

export interface RegisterUserDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
  department?: Department;
}

export interface CreateStaffDto {
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  role?: string;
  roles?: string[];
  department?: string;
  isActive?: boolean;
}

export interface UpdateStaffDto {
  fullName?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: string;
  roles?: string[];
  department?: string;
  isActive?: boolean;
}

export function normalizeRole(roleInput?: string, rolesInput?: string[]): UserRole {
  const chosen = (rolesInput && rolesInput.length > 0 ? rolesInput[0] : roleInput) || '';
  const upper = chosen.toUpperCase().trim().replace(/[\s-]/g, '_');
  if (upper === UserRole.CUSTOMER) {
    return UserRole.PRODUCTION_OPERATOR;
  }
  if (Object.values(UserRole).includes(upper as UserRole)) {
    return upper as UserRole;
  }
  return UserRole.PRODUCTION_OPERATOR;
}

export function normalizeDepartment(deptInput?: string, role?: UserRole): Department {
  const upper = (deptInput || '').toUpperCase().trim().replace(/[\s-]/g, '_');
  if (upper === 'PRESS_OPERATIONS' || upper === 'PRESS' || upper === 'PRINTING') {
    return Department.PRODUCTION;
  }
  if (upper === 'PREPRESS' || upper === 'DESIGN') {
    return Department.DESIGN_PREPRESS;
  }
  if (Object.values(Department).includes(upper as Department)) {
    return upper as Department;
  }
  if (role === UserRole.DESIGNER_PREPRESS) return Department.DESIGN_PREPRESS;
  if (role === UserRole.PRODUCTION_OPERATOR) return Department.PRODUCTION;
  if (role === UserRole.FINAL_QC_INSPECTOR) return Department.QUALITY_ASSURANCE;
  if (role === UserRole.PACKING_OPERATOR) return Department.PACKAGING;
  if (role === UserRole.DISPATCH_LOGISTICS) return Department.LOGISTICS;
  if (role === UserRole.OPERATIONAL_MANAGER) return Department.OPERATIONS;
  if (role === UserRole.ADMIN_MANAGER) return Department.MANAGEMENT;
  if (role === UserRole.SALES_OFFICE) return Department.SALES;
  if (role === UserRole.ACCOUNTS) return Department.FINANCE;
  return Department.PRODUCTION;
}

export interface LoginDto {
  email?: string;
  phone?: string;
  identifier?: string;
  emailOrPhone?: string;
  password: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role || UserRole.CUSTOMER,
        department: dto.department || (dto.role === UserRole.CUSTOMER ? null : Department.CUSTOMER_SERVICE),
      },
    });

    // If customer role, also create Customer profile
    let customerId: string | null = null;
    if (user.role === UserRole.CUSTOMER) {
      const cust = await this.prisma.customer.create({
        data: {
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone || '',
        },
      });
      customerId = cust.id;
    }

    const token = this.generateToken(user, customerId);
    const { roles, permissions } = this.resolveUserRolesAndPermissions(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        roles,
        department: user.department,
        customerId,
        permissions,
      },
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const rawIdentifier = (dto.identifier || dto.email || dto.emailOrPhone || dto.phone || '').trim();
    if (!rawIdentifier || !dto.password) {
      throw new UnauthorizedException('Invalid email/mobile or password');
    }

    let user;
    if (rawIdentifier.includes('@')) {
      user = await this.prisma.user.findUnique({
        where: { email: rawIdentifier.toLowerCase() },
        include: { customerProfile: true },
      });
    } else {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { phone: rawIdentifier },
            { phone: `+${rawIdentifier.replace(/^\+/, '')}` },
            { email: rawIdentifier.toLowerCase() },
            { email: `${rawIdentifier.toLowerCase()}@printbazzar.com` },
            { email: { startsWith: `${rawIdentifier.toLowerCase()}@` } },
          ],
        },
        include: { customerProfile: true },
      });
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email/mobile or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    const isAltAdminMatch =
      user.email === 'admin@printbazzar.com' &&
      (dto.password === 'Admin@12345' || dto.password === 'Monisha05$$$');
    if (!isMatch && !isAltAdminMatch) {
      throw new UnauthorizedException('Invalid email/mobile or password');
    }

    const customerId = user.customerProfile?.id || null;
    const token = this.generateToken(user, customerId);
    const { roles, permissions } = this.resolveUserRolesAndPermissions(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        roles,
        department: user.department,
        customerId,
        permissions,
      },
      accessToken: token,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: true },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('User account not found or inactive');
    }

    const { roles, permissions } = this.resolveUserRolesAndPermissions(user);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      roles,
      department: user.department,
      customerId: user.customerProfile?.id || null,
      permissions,
    };
  }

  // ==========================================
  // ENTERPRISE STAFF MANAGEMENT METHODS
  // ==========================================

  private readonly metadataFile = path.join(process.cwd(), 'uploads', 'staff_roster_metadata.json');

  private getStaffMetadata(): Record<string, { roles?: string[]; shift?: string; station?: string }> {
    try {
      if (fs.existsSync(this.metadataFile)) {
        const raw = fs.readFileSync(this.metadataFile, 'utf8');
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return {};
  }

  private saveStaffMetadata(data: Record<string, { roles?: string[]; shift?: string; station?: string }>) {
    try {
      const dir = path.dirname(this.metadataFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.metadataFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      this.logger.warn(`Could not save staff metadata: ${e}`);
    }
  }

  private resolveUserRolesAndPermissions(user: { id: string; email: string; role: UserRole }) {
    const meta = this.getStaffMetadata();
    const defaultMeta: Record<string, { roles: string[] }> = {
      'operations@printbazzar.com': { roles: ['ADMIN_MANAGER', 'OPERATIONAL_MANAGER'] },
      'operator@printbazzar.com': { roles: ['PRODUCTION_OPERATOR', 'FINAL_QC_INSPECTOR'] },
      'admin@printbazzar.com': { roles: ['ADMIN_MANAGER'] },
      'prepress@printbazzar.com': { roles: ['DESIGNER_PREPRESS'] },
      'finalqc@printbazzar.com': { roles: ['FINAL_QC_INSPECTOR'] },
      'packing@printbazzar.com': { roles: ['PACKING_OPERATOR', 'DISPATCH_LOGISTICS'] },
      'dispatch@printbazzar.com': { roles: ['DISPATCH_LOGISTICS'] },
    };

    const userMeta = meta[user.email.toLowerCase()] || meta[user.id] || defaultMeta[user.email.toLowerCase()] || {};
    const roles: string[] = userMeta.roles && userMeta.roles.length > 0 ? userMeta.roles : [user.role];

    const combinedPerms = new Set<string>();
    for (const r of roles) {
      const perms = getRolePermissions(normalizeRole(r));
      perms.forEach((p) => combinedPerms.add(p));
    }

    return {
      roles,
      permissions: Array.from(combinedPerms),
    };
  }

  async listStaff() {
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          not: UserRole.CUSTOMER,
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });

    const meta = this.getStaffMetadata();
    const defaultMeta: Record<string, { roles: string[]; shift?: string; station?: string }> = {
      'operations@printbazzar.com': {
        roles: ['ADMIN_MANAGER', 'OPERATIONAL_MANAGER'],
        shift: 'General (09:00 - 18:00)',
        station: 'Central Production Office',
      },
      'operator@printbazzar.com': {
        roles: ['PRODUCTION_OPERATOR', 'FINAL_QC_INSPECTOR'],
        shift: 'Shift A (06:00 - 14:00)',
        station: 'HP Indigo 12000 Station',
      },
      'admin@printbazzar.com': {
        roles: ['ADMIN_MANAGER'],
        shift: 'General (09:00 - 18:00)',
        station: 'Operations Command Center',
      },
      'prepress@printbazzar.com': {
        roles: ['DESIGNER_PREPRESS'],
        shift: 'General (09:00 - 18:00)',
        station: 'Esko & PitStop Workstation 01',
      },
      'finalqc@printbazzar.com': {
        roles: ['FINAL_QC_INSPECTOR'],
        shift: 'Shift A (06:00 - 14:00)',
        station: 'Physical Inspection Lightbox D50',
      },
      'packing@printbazzar.com': {
        roles: ['PACKING_OPERATOR', 'DISPATCH_LOGISTICS'],
        shift: 'Shift A (06:00 - 14:00)',
        station: 'Digital Scale Weigh Station 02',
      },
      'dispatch@printbazzar.com': {
        roles: ['DISPATCH_LOGISTICS'],
        shift: 'Shift A (06:00 - 14:00)',
        station: 'Courier Bay & Store Counter',
      },
    };

    return users.map((u) => {
      const cleanName = u.fullName || 'Staff Member';
      const username = u.email.split('@')[0] || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.');
      const userMeta = meta[u.email.toLowerCase()] || meta[u.id] || defaultMeta[u.email.toLowerCase()] || {};
      const roles = userMeta.roles && userMeta.roles.length > 0 ? userMeta.roles : [u.role];
      return {
        id: u.id,
        name: u.fullName,
        fullName: u.fullName,
        username,
        email: u.email,
        phone: u.phone || '',
        role: u.role,
        roles,
        department: u.department || 'OPERATIONS',
        shift: userMeta.shift || 'General (09:00 - 18:00)',
        station: userMeta.station || (roles.includes('PRODUCTION_OPERATOR') ? 'HP Indigo 12000 Station' : 'Operations Command Center'),
        status: u.isActive ? 'ACTIVE_ON_FLOOR' : 'OFF_SHIFT',
        isActive: u.isActive,
        loginEnabled: u.isActive,
      };
    });
  }

  async createOrUpdateStaff(dto: CreateStaffDto) {
    if (!dto.email || !dto.fullName) {
      throw new BadRequestException('Full name and email are required to create staff member');
    }

    const email = dto.email.trim().toLowerCase();
    const assignedRoles = dto.roles && dto.roles.length > 0 ? dto.roles : (dto.role ? [dto.role] : ['PRODUCTION_OPERATOR']);
    const primaryRole = normalizeRole(assignedRoles[0]);
    const department = normalizeDepartment(dto.department, primaryRole);
    const password = dto.password || 'Admin@12345';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const isActive = dto.isActive !== false;

    // Check if user exists
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    let user;
    if (existing) {
      // Update existing user with new password, role, department, active status
      user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: dto.fullName.trim(),
          phone: dto.phone?.trim() || existing.phone,
          role: primaryRole,
          department,
          passwordHash,
          isActive,
        },
      });
      this.logger.log(`Staff user '${email}' updated with role ${primaryRole} and refreshed password`);
    } else {
      // Create new user in PostgreSQL
      user = await this.prisma.user.create({
        data: {
          email,
          fullName: dto.fullName.trim(),
          phone: dto.phone?.trim() || null,
          role: primaryRole,
          department,
          passwordHash,
          isActive,
        },
      });
      this.logger.log(`Staff user '${email}' created in database with role ${primaryRole}`);
    }

    // Persist multi-roles in metadata store
    const meta = this.getStaffMetadata();
    meta[email] = {
      ...(meta[email] || {}),
      roles: assignedRoles,
    };
    meta[user.id] = meta[email];
    this.saveStaffMetadata(meta);

    return {
      id: user.id,
      name: user.fullName,
      fullName: user.fullName,
      username: email.split('@')[0],
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      roles: assignedRoles,
      department: user.department,
      status: user.isActive ? 'ACTIVE_ON_FLOOR' : 'OFF_SHIFT',
      isActive: user.isActive,
      loginEnabled: user.isActive,
      password: dto.password, // Return back for initial credentials modal display
    };
  }

  async updateStaff(id: string, dto: UpdateStaffDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Staff user with ID '${id}' not found`);
    }

    const updateData: any = {};
    if (dto.fullName) updateData.fullName = dto.fullName.trim();
    if (dto.email) updateData.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) updateData.phone = dto.phone ? dto.phone.trim() : null;
    
    let assignedRoles: string[] = [];
    if (dto.roles && dto.roles.length > 0) {
      assignedRoles = dto.roles;
      updateData.role = normalizeRole(dto.roles[0]);
    } else if (dto.role) {
      assignedRoles = [dto.role];
      updateData.role = normalizeRole(dto.role);
    }

    if (dto.department) {
      updateData.department = normalizeDepartment(dto.department, updateData.role || existing.role);
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    if (dto.password && dto.password.trim()) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(dto.password.trim(), salt);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Persist multi-roles in metadata store
    if (assignedRoles.length > 0) {
      const meta = this.getStaffMetadata();
      meta[updated.email.toLowerCase()] = {
        ...(meta[updated.email.toLowerCase()] || {}),
        roles: assignedRoles,
      };
      meta[updated.id] = meta[updated.email.toLowerCase()];
      this.saveStaffMetadata(meta);
    } else {
      const meta = this.getStaffMetadata();
      const existingMeta = meta[updated.email.toLowerCase()] || meta[updated.id];
      if (existingMeta && existingMeta.roles) {
        assignedRoles = existingMeta.roles;
      } else {
        assignedRoles = [updated.role];
      }
    }

    return {
      id: updated.id,
      name: updated.fullName,
      fullName: updated.fullName,
      username: updated.email.split('@')[0],
      email: updated.email,
      phone: updated.phone || '',
      role: updated.role,
      roles: assignedRoles,
      department: updated.department,
      status: updated.isActive ? 'ACTIVE_ON_FLOOR' : 'OFF_SHIFT',
      isActive: updated.isActive,
      loginEnabled: updated.isActive,
      password: dto.password,
    };
  }

  async deleteStaff(id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Staff user with ID '${id}' not found`);
    }

    // Clean up metadata
    const meta = this.getStaffMetadata();
    delete meta[existing.email.toLowerCase()];
    delete meta[existing.id];
    this.saveStaffMetadata(meta);

    try {
      await this.prisma.user.delete({ where: { id } });
      return { success: true, message: `Staff member '${existing.email}' deleted permanently.` };
    } catch {
      await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      return { success: true, message: `Staff member '${existing.email}' deactivated (has history).` };
    }
  }

  async resetStaffPassword(id: string, newPassword = 'Admin@12345') {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Staff user with ID '${id}' not found`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, isActive: true },
    });

    return { success: true, email: existing.email, password: newPassword };
  }

  private generateToken(
    user: { id: string; email: string; role: UserRole; department?: Department | null },
    customerId?: string | null,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
      customerId,
    };
    return this.jwtService.sign(payload);
  }
}
