import { Test, TestingModule } from '@nestjs/testing';
import { JobCardEngineService } from './job-card-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { JobCardStatus } from '@prisma/client';

describe('JobCardEngineService (Automated Shop Floor Job Card Engine)', () => {
  let service: JobCardEngineService;

  const mockItem = {
    id: 'item-101',
    sku: 'PRD-BC-001',
    productName: 'Premium Visiting Cards',
    quantity: 500,
    approvedArtworkVersionId: 'art-v2',
    specifications: { substrate: '350 GSM Art Card' },
    order: {
      id: 'ord-202',
      orderNumber: 'PB-2026-0002',
      priority: 'NORMAL',
      paymentStatus: 'PAID',
      paidAmount: 2000,
      totalAmount: 2000,
      customer: { fullName: 'Rohit Singhania', companyName: 'Acme Corp' },
    },
    product: {
      productionDays: 2,
      category: { slug: 'stationery-marketing' },
    },
    artworkVersions: [{ id: 'art-v2', isApproved: true, versionNumber: 2 }],
    jobCards: [],
  };

  const mockPrismaService = {
    orderItem: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'item-101') return Promise.resolve({ ...mockItem });
        return Promise.resolve(null);
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    jobCard: {
      count: jest.fn().mockResolvedValue(12),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'jc-created-1',
          ...data,
        }),
      ),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'jc-created-1', ...data })),
      findUnique: jest.fn().mockResolvedValue({ id: 'jc-created-1', jobNumber: 'JC-20260929-0013' }),
    },
    slaRecord: {
      create: jest.fn().mockResolvedValue({ id: 'sla-1' }),
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
        JobCardEngineService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<JobCardEngineService>(JobCardEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should automatically generate Job Card locking exact approved artwork version and snapshotting specs', async () => {
    const jobCard = await service.generateJobCardForOrderItem('item-101', 'system-actor');

    expect(jobCard).toBeDefined();
    expect(jobCard.jobNumber).toMatch(/^JC-\d{8}-0013$/);
    expect(jobCard.approvedArtworkVersionId).toBe('art-v2');
    expect(jobCard.status).toBe(JobCardStatus.QUEUED);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTOMATIC_JOB_CARD_CREATED',
      }),
    );
  });

  it('should block Job Card generation if order has unpaid balance', async () => {
    mockPrismaService.orderItem.findUnique.mockResolvedValueOnce({
      ...mockItem,
      order: {
        ...mockItem.order,
        paymentStatus: 'PENDING',
        paidAmount: 0,
        totalAmount: 2000,
      },
    });

    await expect(service.generateJobCardForOrderItem('item-101', 'system-actor')).rejects.toThrow(
      BadRequestException,
    );
  });
});
