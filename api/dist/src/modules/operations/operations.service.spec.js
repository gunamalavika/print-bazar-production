"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const operations_service_1 = require("./operations.service");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
const job_card_engine_service_1 = require("../job-cards/job-card-engine.service");
const workflow_state_service_1 = require("../workflow/workflow-state.service");
const event_emitter_1 = require("@nestjs/event-emitter");
describe('OperationsService (Operational Manager Coordinator)', () => {
    let service;
    let prisma;
    let audit;
    const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
        order: {
            count: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            groupBy: jest.fn().mockResolvedValue([]),
        },
        user: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        orderAssignment: {
            update: jest.fn(),
            updateMany: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
        },
        orderStatusHistory: {
            create: jest.fn(),
        },
        operationalNote: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
        jobCard: {
            update: jest.fn(),
            updateMany: jest.fn(),
            findMany: jest.fn(),
        },
        auditLog: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
    };
    const mockAudit = {
        log: jest.fn().mockResolvedValue({}),
    };
    const mockJobCardEngine = {
        generateJobCardForOrderItem: jest.fn().mockResolvedValue({ id: 'jc-1', jobNumber: 'JC-1001' }),
    };
    const mockWorkflowState = {
        transition: jest.fn(),
    };
    const mockActor = {
        sub: 'oe-1',
        email: 'operations@printbazzar.com',
        role: client_1.UserRole.OPERATIONAL_MANAGER,
        department: client_1.Department.OPERATIONS,
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                operations_service_1.OperationsService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrisma },
                { provide: audit_service_1.AuditService, useValue: mockAudit },
                { provide: job_card_engine_service_1.JobCardEngineService, useValue: mockJobCardEngine },
                { provide: workflow_state_service_1.WorkflowStateService, useValue: mockWorkflowState },
                { provide: event_emitter_1.EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(operations_service_1.OperationsService);
        prisma = module.get(prisma_service_1.PrismaService);
        audit = module.get(audit_service_1.AuditService);
        jest.clearAllMocks();
    });
    describe('1. Dashboard Metrics Telemetry', () => {
        it('computes accurate active, pending, blocked and production metrics', async () => {
            mockPrisma.order.count
                .mockResolvedValueOnce(25)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(4)
                .mockResolvedValueOnce(3);
            mockPrisma.order.groupBy.mockResolvedValue([
                { status: client_1.OrderStatus.PRINTING, _count: { id: 5 } },
            ]);
            const metrics = await service.getDashboardMetrics();
            expect(metrics).toBeDefined();
            expect(metrics.totalActive).toBe(25);
            expect(metrics.paymentBlocked).toBe(2);
            expect(metrics.atRiskOverdue).toBe(1);
            expect(metrics.unassignedDesign).toBe(4);
            expect(metrics.unassignedProduction).toBe(3);
            expect(mockPrisma.order.count).toHaveBeenCalled();
        });
    });
    describe('2. Designer Assignment & Reassignment', () => {
        it('successfully assigns a designer to an order in DESIGN_REQUIRED stage and audits the event', async () => {
            const mockOrder = {
                id: 'ord-123',
                orderNumber: 'PB-1001',
                status: client_1.OrderStatus.DESIGN_REQUIRED,
                assignments: [],
            };
            const mockDesigner = {
                id: 'des-1',
                fullName: 'Arjun Verma',
                role: client_1.UserRole.DESIGNER_PREPRESS,
                isActive: true,
            };
            mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
            mockPrisma.user.findUnique.mockResolvedValue(mockDesigner);
            mockPrisma.orderAssignment.create.mockResolvedValue({
                id: 'asg-1',
                orderId: 'ord-123',
                assignedUserId: 'des-1',
                taskType: client_1.AssignmentTaskType.DESIGN,
                status: client_1.AssignmentStatus.ACTIVE,
            });
            const result = await service.assignDesigner('ord-123', { designerId: 'des-1', reason: 'High priority customer proof' }, mockActor);
            expect(result).toBeDefined();
            expect(mockPrisma.orderAssignment.create).toHaveBeenCalled();
            expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'DESIGN_ASSIGNED',
                entity: 'OrderAssignment',
                orderId: 'ord-123',
            }));
        });
        it('rejects assigning a designer if the target user is NOT a DESIGNER_PREPRESS', async () => {
            const mockOrder = {
                id: 'ord-123',
                orderNumber: 'PB-1001',
                status: client_1.OrderStatus.DESIGN_REQUIRED,
                assignments: [],
            };
            const mockInvalidStaff = {
                id: 'sales-1',
                fullName: 'Sales Person',
                role: client_1.UserRole.SALES_OFFICE,
                isActive: true,
            };
            mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
            mockPrisma.user.findUnique.mockResolvedValue(mockInvalidStaff);
            await expect(service.assignDesigner('ord-123', { designerId: 'sales-1' }, mockActor)).rejects.toThrow(common_1.BadRequestException);
        });
    });
    describe('3. Production Operator Assignment', () => {
        it('successfully assigns an operator, updates JobCard.operatorId and logs audit', async () => {
            const mockOrder = {
                id: 'ord-456',
                orderNumber: 'PB-2002',
                status: client_1.OrderStatus.PRODUCTION_QUEUE,
                assignments: [],
                jobCards: [{ id: 'jc-1', jobNumber: 'JC-101' }],
            };
            const mockOperator = {
                id: 'op-1',
                fullName: 'Ramesh Patel',
                role: client_1.UserRole.PRODUCTION_OPERATOR,
                isActive: true,
            };
            mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
            mockPrisma.user.findUnique.mockResolvedValue(mockOperator);
            mockPrisma.orderAssignment.create.mockResolvedValue({ id: 'asg-2' });
            mockPrisma.jobCard.update.mockResolvedValue({ id: 'jc-1', operatorId: 'op-1' });
            const result = await service.assignProductionOperator('ord-456', { operatorId: 'op-1', reason: 'Assigned to HP Indigo Press 1' }, mockActor);
            expect(result).toBeDefined();
            expect(mockPrisma.jobCard.update).toHaveBeenCalledWith({
                where: { id: 'jc-1' },
                data: { operatorId: 'op-1' },
            });
            expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'PRODUCTION_OPERATOR_ASSIGNED',
            }));
        });
    });
    describe('4. Operational Notes Feed', () => {
        it('creates an internal operational note with author attribution', async () => {
            mockPrisma.order.findUnique.mockResolvedValue({ id: 'ord-123', orderNumber: 'PB-1001' });
            mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'Vikramaditya Rao' });
            mockPrisma.operationalNote.create.mockResolvedValue({
                id: 'note-1',
                orderId: 'ord-123',
                content: 'Customer requested 50 extra sample cards.',
                authorName: 'Vikramaditya Rao',
                authorRole: client_1.UserRole.OPERATIONAL_MANAGER,
                createdAt: new Date(),
            });
            const note = await service.addOperationalNote('ord-123', { content: 'Customer requested 50 extra sample cards.' }, mockActor);
            expect(mockPrisma.operationalNote.create).toHaveBeenCalled();
            expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'OPERATIONAL_NOTE_CREATED',
            }));
        });
    });
    describe('5. Priority Updating', () => {
        it('updates priority and logs audit event', async () => {
            mockPrisma.order.findUnique.mockResolvedValue({
                id: 'ord-123',
                orderNumber: 'PB-1001',
                priority: 'NORMAL',
            });
            mockPrisma.order.update.mockResolvedValue({
                id: 'ord-123',
                priority: 'URGENT',
            });
            const updated = await service.updateOrderPriority('ord-123', { priority: 'URGENT', reason: 'VIP Corporate Event deadline' }, mockActor);
            expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'ord-123' },
                data: { priority: 'URGENT' },
            }));
            expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'ORDER_PRIORITY_CHANGED',
            }));
        });
    });
    describe('6. Automated Size / Dimension Validation (Only Technical QC Validation)', () => {
        it('validates matching dimensions as PASS', () => {
            const expectedSpecs = { size: '210mm x 297mm' };
            const artwork = { widthMm: 210, heightMm: 297 };
            const result = service.validateArtworkSize(expectedSpecs, artwork);
            expect(result.isValid).toBe(true);
            expect(result.status).toBe('PASS');
            expect(result.expectedWidthMm).toBe(210);
            expect(result.expectedHeightMm).toBe(297);
        });
        it('validates swapped orientation matching dimensions as PASS', () => {
            const expectedSpecs = { size: '210mm x 297mm' };
            const artwork = { widthMm: 297, heightMm: 210 };
            const result = service.validateArtworkSize(expectedSpecs, artwork);
            expect(result.isValid).toBe(true);
            expect(result.status).toBe('PASS');
        });
        it('detects mismatched dimensions as MISMATCH', () => {
            const expectedSpecs = { size: '210mm x 297mm' };
            const artwork = { widthMm: 200, heightMm: 297 };
            const result = service.validateArtworkSize(expectedSpecs, artwork);
            expect(result.isValid).toBe(false);
            expect(result.status).toBe('MISMATCH');
            expect(result.details).toContain('SIZE MISMATCH');
        });
        it('parses standard ISO names such as A4 and Letter', () => {
            const a4 = service.parseDimensions('Brochure A4 format');
            expect(a4).toEqual({ widthMm: 210, heightMm: 297, rawText: 'Brochure A4 format' });
            const letter = service.parseDimensions('Flyer Letter format');
            expect(letter).toEqual({ widthMm: 215.9, heightMm: 279.4, rawText: 'Flyer Letter format' });
        });
    });
    describe('7. OE Order Readiness & Release to Production', () => {
        it('returns comprehensive readiness report with size validation', async () => {
            const mockOrder = {
                id: 'ord-999',
                orderNumber: 'PB-999',
                status: client_1.OrderStatus.ARTWORK_APPROVED,
                items: [
                    {
                        id: 'item-1',
                        productName: 'A4 Letterhead',
                        quantity: 500,
                        specifications: { size: '210mm x 297mm', paper: '350 GSM' },
                        artworkVersions: [
                            {
                                id: 'art-1',
                                versionNumber: 2,
                                originalFileName: 'letterhead.pdf',
                                widthMm: 210,
                                heightMm: 297,
                                isApproved: true,
                            },
                        ],
                    },
                ],
            };
            mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
            const readiness = await service.getOrderReadiness('ord-999');
            expect(readiness.isEligibleForRelease).toBe(true);
            expect(readiness.sizeValidation.status).toBe('PASS');
            expect(readiness.customerApproval.isApproved).toBe(true);
        });
        it('blocks release to production if size mismatch exists without manager override', async () => {
            const mockOrder = {
                id: 'ord-mismatch',
                orderNumber: 'PB-MISMATCH',
                status: client_1.OrderStatus.ARTWORK_APPROVED,
                items: [
                    {
                        id: 'item-1',
                        productName: 'Custom Flyer',
                        quantity: 1000,
                        specifications: { size: '210mm x 297mm' },
                        artworkVersions: [
                            {
                                id: 'art-1',
                                versionNumber: 1,
                                widthMm: 200,
                                heightMm: 297,
                                isApproved: true,
                            },
                        ],
                    },
                ],
            };
            mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
            await expect(service.releaseToProduction('ord-mismatch', {}, mockActor)).rejects.toThrow(common_1.BadRequestException);
        });
    });
});
//# sourceMappingURL=operations.service.spec.js.map