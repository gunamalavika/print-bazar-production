"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const workflow_state_service_1 = require("./workflow-state.service");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const common_1 = require("@nestjs/common");
const workflow_1 = require("../../common/types/workflow");
const roles_1 = require("../../common/types/roles");
describe('WorkflowStateService (Master 16-Stage State Machine)', () => {
    let service;
    const mockOrder = {
        id: 'ord-100',
        orderNumber: 'PB-2026-0001',
        status: workflow_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
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
                if (where.id === 'ord-100')
                    return Promise.resolve({ ...mockOrder });
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
        const module = await testing_1.Test.createTestingModule({
            providers: [
                workflow_state_service_1.WorkflowStateService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrismaService },
                { provide: audit_service_1.AuditService, useValue: mockAuditService },
                { provide: event_emitter_1.EventEmitter2, useValue: mockEventEmitter },
            ],
        }).compile();
        service = module.get(workflow_state_service_1.WorkflowStateService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should strictly FORBID direct jump from CUSTOMER_APPROVAL_REQUIRED to PRINTING', async () => {
        const operatorUser = {
            sub: 'user-op',
            email: 'op@printbazzar.com',
            role: roles_1.UserRole.PRODUCTION_OPERATOR,
            department: roles_1.Department.PRODUCTION,
        };
        await expect(service.transition({
            orderId: 'ord-100',
            targetStatus: workflow_1.OrderStatus.PRINTING,
        }, operatorUser)).rejects.toThrow(common_1.BadRequestException);
    });
    it('should allow valid transition from CUSTOMER_APPROVAL_REQUIRED to ARTWORK_APPROVED and OE release to PRODUCTION_QUEUE', async () => {
        const customerUser = {
            sub: 'cust-1',
            email: 'customer@acme.com',
            role: roles_1.UserRole.CUSTOMER,
            department: null,
        };
        const res = await service.transition({
            orderId: 'ord-100',
            targetStatus: workflow_1.OrderStatus.ARTWORK_APPROVED,
        }, customerUser);
        expect(res.status).toBe(workflow_1.OrderStatus.ARTWORK_APPROVED);
        expect(mockAuditService.log).toHaveBeenCalledWith(expect.objectContaining({
            action: 'TRANSITION_ARTWORK_APPROVED',
        }));
        const oeUser = {
            sub: 'oe-1',
            email: 'operations@printbazzar.com',
            role: roles_1.UserRole.OPERATIONAL_MANAGER,
            department: roles_1.Department.OPERATIONS,
        };
        mockOrder.status = workflow_1.OrderStatus.ARTWORK_APPROVED;
        const prodRes = await service.transition({
            orderId: 'ord-100',
            targetStatus: workflow_1.OrderStatus.PRODUCTION_QUEUE,
        }, oeUser);
        expect(prodRes.status).toBe(workflow_1.OrderStatus.PRODUCTION_QUEUE);
    });
    it('should allow Manager Override with mandatory justification', async () => {
        const managerUser = {
            sub: 'mgr-1',
            email: 'admin@printbazzar.com',
            role: roles_1.UserRole.ADMIN_MANAGER,
            department: roles_1.Department.MANAGEMENT,
        };
        const res = await service.managerOverride({
            orderId: 'ord-100',
            targetStatus: workflow_1.OrderStatus.ORDER_REVIEW,
            reason: 'Customer requested change of delivery address before production.',
        }, managerUser);
        expect(res.status).toBe(workflow_1.OrderStatus.ORDER_REVIEW);
        expect(mockAuditService.log).toHaveBeenCalledWith(expect.objectContaining({
            action: 'MANAGER_OVERRIDE_TO_ORDER_REVIEW',
        }));
    });
    it('should reject Manager Override if justification is missing or too short', async () => {
        const managerUser = {
            sub: 'mgr-1',
            email: 'admin@printbazzar.com',
            role: roles_1.UserRole.ADMIN_MANAGER,
            department: roles_1.Department.MANAGEMENT,
        };
        await expect(service.managerOverride({
            orderId: 'ord-100',
            targetStatus: workflow_1.OrderStatus.ORDER_REVIEW,
            reason: 'fix',
        }, managerUser)).rejects.toThrow(common_1.BadRequestException);
    });
    it('should pause an active order and resume to its exact previous preHoldStatus', async () => {
        const managerUser = {
            sub: 'mgr-1',
            email: 'admin@printbazzar.com',
            role: roles_1.UserRole.ADMIN_MANAGER,
            department: roles_1.Department.MANAGEMENT,
        };
        const paused = await service.pauseOrder('ord-100', 'Paper stock out at mill', managerUser);
        expect(paused.status).toBe(workflow_1.OrderStatus.ON_HOLD);
        const resumed = await service.resumeOrder('ord-100', workflow_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED, managerUser);
        expect(resumed.status).toBe(workflow_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED);
    });
});
//# sourceMappingURL=workflow-state.service.spec.js.map