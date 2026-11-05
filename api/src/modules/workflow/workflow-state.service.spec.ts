import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowStateService } from './workflow-state.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus } from '../../common/types/workflow';
import { UserRole, Department, JwtPayload } from '../../common/types/roles';

describe('WorkflowStateService (Master 16-Stage State Machine)', () => {
  let service: WorkflowStateService;

  const mockOrder: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    customerStatus: string;
    totalAmount: number;
    paidAmount: number;
    paymentStatus: string;
    items: Array<{ id: string; approvedArtworkVersionId: string; designNotes: string | null }>;
    payments: Array<{ status: string; amount: number }>;
    qcChecklists: any[];
  } = {
    id: 'ord-100',
    orderNumber: 'PB-2026-0001',
    status: OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
    customerStatus: 'APPROVAL_REQUIRED',
    totalAmount: 1500,
    paidAmount: 1500,
    paymentStatus: 'PAID',
    items: [{ id: 'item-1', approvedArtworkVersionId: 'art-v2', designNotes: null }],
    payments: [{ status: 'PAID', amount: 1500 }],
    qcChecklists: [],
  };

  const mockPrismaService = {
    order: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'ord-100') return Promise.resolve({ ...mockOrder });
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockOrder, ...data })),
    },
    orderStatusHistory: {
      create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
    },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrismaService)),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowStateService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<WorkflowStateService>(WorkflowStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should strictly FORBID direct jump from CUSTOMER_APPROVAL_REQUIRED to PRINTING', async () => {
    const operatorUser: JwtPayload = {
      sub: 'user-op',
      email: 'op@printbazzar.com',
      role: UserRole.PRODUCTION_OPERATOR,
      department: Department.PRODUCTION,
    };

    // Customer approval must never directly release to printing
    await expect(
      service.transition(
        {
          orderId: 'ord-100',
          targetStatus: OrderStatus.PRINTING,
        },
        operatorUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow valid transition from CUSTOMER_APPROVAL_REQUIRED to ARTWORK_APPROVED and OE release to PRODUCTION_QUEUE', async () => {
    const customerUser: JwtPayload = {
      sub: 'cust-1',
      email: 'customer@acme.com',
      role: UserRole.CUSTOMER,
      department: null,
    };

    const res = await service.transition(
      {
        orderId: 'ord-100',
        targetStatus: OrderStatus.ARTWORK_APPROVED,
      },
      customerUser,
    );

    expect(res.status).toBe(OrderStatus.ARTWORK_APPROVED);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRANSITION_ARTWORK_APPROVED',
      }),
    );

    // Now OE releases to PRODUCTION_QUEUE
    const oeUser: JwtPayload = {
      sub: 'oe-1',
      email: 'operations@printbazzar.com',
      role: UserRole.OPERATIONAL_MANAGER,
      department: Department.OPERATIONS,
    };

    mockOrder.status = OrderStatus.ARTWORK_APPROVED;

    const prodRes = await service.transition(
      {
        orderId: 'ord-100',
        targetStatus: OrderStatus.PRODUCTION_QUEUE,
      },
      oeUser,
    );

    expect(prodRes.status).toBe(OrderStatus.PRODUCTION_QUEUE);
  });

  it('should allow Manager Override with mandatory justification', async () => {
    const managerUser: JwtPayload = {
      sub: 'mgr-1',
      email: 'admin@printbazzar.com',
      role: UserRole.ADMIN_MANAGER,
      department: Department.MANAGEMENT,
    };

    const res = await service.managerOverride(
      {
        orderId: 'ord-100',
        targetStatus: OrderStatus.ORDER_REVIEW,
        reason: 'Customer requested change of delivery address before production.',
      },
      managerUser,
    );

    expect(res.status).toBe(OrderStatus.ORDER_REVIEW);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MANAGER_OVERRIDE_TO_ORDER_REVIEW',
      }),
    );
  });

  it('should reject Manager Override if justification is missing or too short', async () => {
    const managerUser: JwtPayload = {
      sub: 'mgr-1',
      email: 'admin@printbazzar.com',
      role: UserRole.ADMIN_MANAGER,
      department: Department.MANAGEMENT,
    };

    await expect(
      service.managerOverride(
        {
          orderId: 'ord-100',
          targetStatus: OrderStatus.ORDER_REVIEW,
          reason: 'fix', // too short (< 8 chars)
        },
        managerUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should pause an active order and resume to its exact previous preHoldStatus', async () => {
    const managerUser: JwtPayload = {
      sub: 'mgr-1',
      email: 'admin@printbazzar.com',
      role: UserRole.ADMIN_MANAGER,
      department: Department.MANAGEMENT,
    };

    // Pause
    const paused = await service.pauseOrder('ord-100', 'Paper stock out at mill', managerUser);
    expect(paused.status).toBe(OrderStatus.ON_HOLD);

    // Resume
    const resumed = await service.resumeOrder(
      'ord-100',
      OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
      managerUser,
    );
    expect(resumed.status).toBe(OrderStatus.CUSTOMER_APPROVAL_REQUIRED);
  });
});
