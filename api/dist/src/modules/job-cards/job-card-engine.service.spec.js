"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const job_card_engine_service_1 = require("./job-card-engine.service");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
describe('JobCardEngineService (Automated Shop Floor Job Card Engine)', () => {
    let service;
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
                if (where.id === 'item-101')
                    return Promise.resolve({ ...mockItem });
                return Promise.resolve(null);
            }),
            update: jest.fn().mockResolvedValue({}),
        },
        jobCard: {
            count: jest.fn().mockResolvedValue(12),
            create: jest.fn().mockImplementation(({ data }) => Promise.resolve({
                id: 'jc-created-1',
                ...data,
            })),
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
        const module = await testing_1.Test.createTestingModule({
            providers: [
                job_card_engine_service_1.JobCardEngineService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrismaService },
                { provide: audit_service_1.AuditService, useValue: mockAuditService },
                { provide: event_emitter_1.EventEmitter2, useValue: mockEventEmitter },
            ],
        }).compile();
        service = module.get(job_card_engine_service_1.JobCardEngineService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should automatically generate Job Card locking exact approved artwork version and snapshotting specs', async () => {
        const jobCard = await service.generateJobCardForOrderItem('item-101', 'system-actor');
        expect(jobCard).toBeDefined();
        expect(jobCard.jobNumber).toMatch(/^JC-\d{8}-0013$/);
        expect(jobCard.approvedArtworkVersionId).toBe('art-v2');
        expect(jobCard.status).toBe(client_1.JobCardStatus.QUEUED);
        expect(mockAuditService.log).toHaveBeenCalledWith(expect.objectContaining({
            action: 'AUTOMATIC_JOB_CARD_CREATED',
        }));
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
        await expect(service.generateJobCardForOrderItem('item-101', 'system-actor')).rejects.toThrow(common_1.BadRequestException);
    });
});
//# sourceMappingURL=job-card-engine.service.spec.js.map