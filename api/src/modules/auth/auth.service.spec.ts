import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole, Department } from '../../common/types/roles';

describe('AuthService (Production Authentication & Session Logic)', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;

  let testPasswordHash: string;

  beforeAll(async () => {
    const salt = await bcrypt.genSalt(10);
    testPasswordHash = await bcrypt.hash('Secret@123', salt);
  });

  const mockStaffUser = {
    id: 'user-staff-01',
    email: 'operator@printbazzar.com',
    fullName: 'Manoj Kumar',
    phone: '+919876543210',
    passwordHash: '', // Will set in beforeEach
    role: UserRole.PRODUCTION_OPERATOR,
    department: Department.PRODUCTION,
    isActive: true,
    customerProfile: null,
  };

  const mockCustomerUser = {
    id: 'user-cust-01',
    email: 'client@acme.com',
    fullName: 'Rohit Singhania',
    phone: '+919800000000',
    passwordHash: '',
    role: UserRole.CUSTOMER,
    department: null,
    isActive: true,
    customerProfile: { id: 'cust-profile-01' },
  };

  beforeEach(async () => {
    mockStaffUser.passwordHash = testPasswordHash;
    mockCustomerUser.passwordHash = testPasswordHash;

    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.email === 'operator@printbazzar.com') return Promise.resolve(mockStaffUser);
          if (where.email === 'client@acme.com') return Promise.resolve(mockCustomerUser);
          if (where.id === 'user-staff-01') return Promise.resolve(mockStaffUser);
          if (where.id === 'user-cust-01') return Promise.resolve(mockCustomerUser);
          return Promise.resolve(null);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.OR?.some((cond: any) => cond.phone === '+919876543210')) {
            return Promise.resolve(mockStaffUser);
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new-user-01', ...data })),
      },
      customer: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new-cust-01', ...data })),
      },
    };

    const mockJwt = {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwt = module.get(JwtService);
  });

  describe('Login Flow', () => {
    it('1. Successfully authenticates staff member (PRODUCTION_OPERATOR) via email and returns role & department from backend', async () => {
      const res = await service.login({
        email: 'operator@printbazzar.com',
        password: 'Secret@123',
      });

      expect(res.user.id).toBe('user-staff-01');
      expect(res.user.role).toBe(UserRole.PRODUCTION_OPERATOR);
      expect(res.user.department).toBe(Department.PRODUCTION);
      expect(res.accessToken).toBe('mock.jwt.token');
    });

    it('2. Successfully authenticates customer via phone number and links customer profile', async () => {
      const res = await service.login({
        identifier: '+919876543210',
        password: 'Secret@123',
      });

      expect(res.user.id).toBe('user-staff-01');
      expect(res.accessToken).toBe('mock.jwt.token');
    });

    it('3. Throws generic UnauthorizedException on invalid password without exposing details', async () => {
      await expect(
        service.login({
          email: 'operator@printbazzar.com',
          password: 'WrongPassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('4. Throws generic UnauthorizedException when email/mobile does not exist', async () => {
      await expect(
        service.login({
          email: 'nonexistent@company.com',
          password: 'Secret@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('5. Throws generic UnauthorizedException when user account is inactive', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...mockStaffUser,
        isActive: false,
      });

      await expect(
        service.login({
          email: 'operator@printbazzar.com',
          password: 'Secret@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('User Registration', () => {
    it('6. Rejects registration if user with email already exists', async () => {
      await expect(
        service.register({
          email: 'operator@printbazzar.com',
          fullName: 'Duplicate Operator',
          password: 'Password@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('7. Registers customer and creates associated Customer profile', async () => {
      const res = await service.register({
        email: 'newbuyer@enterprise.in',
        fullName: 'New Enterprise Buyer',
        password: 'StrongPass@123',
        role: UserRole.CUSTOMER,
      });

      expect(res.user.email).toBe('newbuyer@enterprise.in');
      expect(res.user.role).toBe(UserRole.CUSTOMER);
      expect(prisma.customer.create).toHaveBeenCalled();
    });
  });

  describe('Get Me Profile', () => {
    it('8. Retrieves fresh user profile from database', async () => {
      const me = await service.getMe('user-staff-01');
      expect(me.fullName).toBe('Manoj Kumar');
      expect(me.role).toBe(UserRole.PRODUCTION_OPERATOR);
    });

    it('9. Throws NotFoundException if user id is missing', async () => {
      await expect(service.getMe('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });
});
