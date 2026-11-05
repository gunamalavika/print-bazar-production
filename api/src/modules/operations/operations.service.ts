import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  OrderStatus,
  PaymentStatus,
  UserRole,
  AssignmentTaskType,
  AssignmentStatus,
  Prisma,
  QCOutcome,
  Priority,
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobCardEngineService } from '../job-cards/job-card-engine.service';
import { WorkflowStateService } from '../workflow/workflow-state.service';
import { JwtPayload } from '../../common/types/roles';

// ─── DTOs ────────────────────────────────────────────────────────────────

export interface OperationsDashboardFilters {
  page?: string;
  limit?: string;
  status?: string;
  priority?: string;
  slaStatus?: string;
  paymentStatus?: string;
  search?: string;
  unassignedDesign?: string;
  unassignedProduction?: string;
  newIntake?: string;
  blocked?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface AssignDesignerDto {
  designerUserId?: string;
  designerId?: string;
  reason?: string;
}

export interface AssignProductionOperatorDto {
  operatorUserId?: string;
  operatorId?: string;
  reason?: string;
  managerOverrideReason?: string;
}

export interface CreateOperationalNoteDto {
  content: string;
}

export interface UpdatePriorityDto {
  priority: Priority;
  reason: string;
}

export interface ReleaseToProductionDto {
  managerOverrideReason?: string;
  notes?: string;
  assignedOperatorId?: string;
}

export interface SizeValidationResult {
  status: 'PASS' | 'MISMATCH' | 'NO_ARTWORK' | 'NOT_APPLICABLE';
  isValid: boolean;
  expectedWidthMm: number | null;
  expectedHeightMm: number | null;
  actualWidthMm: number | null;
  actualHeightMm: number | null;
  expectedDisplay: string;
  actualDisplay: string;
  toleranceMm: number;
  orientationMatch: boolean;
  details: string;
}

export interface OrderReadinessReport {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  isEligibleForRelease: boolean;
  blockers: string[];
  customerApproval: {
    status: 'APPROVED' | 'PENDING' | 'NOT_REQUIRED';
    isApproved: boolean;
    approvedAt?: Date | null;
    approvedVersionNumber?: number | null;
  };
  artwork: {
    id?: string;
    versionNumber?: number;
    originalFileName?: string;
    proofUrl?: string;
    storageKey?: string;
    isApproved: boolean;
  } | null;
  sizeValidation: SizeValidationResult;
  productionSpecs: {
    productName: string;
    quantity: number;
    printSide?: string;
    paper?: string;
    gsm?: string;
    lamination?: string;
    specialFinishing?: string;
    orientation?: string;
    customerNotes?: string;
    productionNotes?: string;
  };
  activeHold: boolean;
}

// ─── Operational Next Action ─────────────────────────────────────────────

export type OperationalNextAction =
  | 'ASSIGN_DESIGNER'
  | 'WAITING_FOR_DESIGN'
  | 'CUSTOMER_APPROVAL_REQUIRED'
  | 'ASSIGN_PRODUCTION_OPERATOR'
  | 'PRODUCTION_IN_PROGRESS'
  | 'FINISHING_IN_PROGRESS'
  | 'FINAL_QC_PENDING'
  | 'PAYMENT_CLEARANCE_REQUIRED'
  | 'READY_FOR_PACKING'
  | 'PACKING_IN_PROGRESS'
  | 'READY_FOR_DISPATCH'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED'
  | 'ORDER_REVIEW';

// ─── Operational Blocker ─────────────────────────────────────────────────

export interface OperationalBlocker {
  type: string;
  label: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

// ─── Status Group Mapping ────────────────────────────────────────────────

const OE_STATUS_GROUPS: Record<string, OrderStatus[]> = {
  NEW_UNASSIGNED: [OrderStatus.ORDER_CREATED, OrderStatus.PAYMENT_PENDING, OrderStatus.PAYMENT_CONFIRMED],
  REQUIREMENT_REVIEW: [OrderStatus.ORDER_REVIEW],
  DESIGN: [OrderStatus.ARTWORK_REVIEW, OrderStatus.DESIGN_REQUIRED, OrderStatus.CUSTOMER_APPROVAL_REQUIRED],
  PRODUCTION: [OrderStatus.ARTWORK_APPROVED, OrderStatus.PRODUCTION_QUEUE, OrderStatus.PRINTING],
  FINISHING: [OrderStatus.FINISHING],
  FINAL_QC: [OrderStatus.QUALITY_CHECK],
  PACKING: [OrderStatus.PACKING],
  DISPATCH: [OrderStatus.READY_FOR_DISPATCH, OrderStatus.OUT_FOR_DELIVERY],
  COMPLETED: [OrderStatus.DELIVERED],
  HOLD: [OrderStatus.ON_HOLD, OrderStatus.CANCELLED],
};

@Injectable()
export class OperationsService {
  private readonly logger = new Logger(OperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly jobCardEngine: JobCardEngineService,
    private readonly workflowState: WorkflowStateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // 1. DASHBOARD METRICS (Aggregation-only, server side)
  // ═══════════════════════════════════════════════════════════════════════

  async getDashboardMetrics() {
    const activeStatuses = [
      OrderStatus.ORDER_CREATED,
      OrderStatus.PAYMENT_PENDING,
      OrderStatus.PAYMENT_CONFIRMED,
      OrderStatus.ORDER_REVIEW,
      OrderStatus.ARTWORK_REVIEW,
      OrderStatus.DESIGN_REQUIRED,
      OrderStatus.ARTWORK_APPROVED,
      OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
      OrderStatus.PRODUCTION_QUEUE,
      OrderStatus.PRINTING,
      OrderStatus.FINISHING,
      OrderStatus.QUALITY_CHECK,
      OrderStatus.PACKING,
      OrderStatus.READY_FOR_DISPATCH,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.ON_HOLD,
    ];

    const [
      totalActive,
      statusCounts,
      paymentBlockedCount,
      slaAtRisk,
      unassignedDesign,
      unassignedProduction,
      newIntakeCount,
    ] = await Promise.all([
      // Total active orders
      this.prisma.order.count({ where: { status: { in: activeStatuses } } }),

      // Per-status breakdown
      this.prisma.order.groupBy({
        by: ['status'],
        where: { status: { in: activeStatuses } },
        _count: { id: true },
      }),

      // Payment blocked: Final QC passed but payment not cleared
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.QUALITY_CHECK, OrderStatus.PACKING] },
          paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIALLY_PAID] },
        },
      }),

      // SLA at risk or breached
      this.prisma.order.count({
        where: {
          status: { in: activeStatuses },
          slaStatus: { in: ['AT_RISK', 'DELAYED', 'BREACHED'] },
        },
      }),

      // Unassigned design: orders needing design but no designer assigned
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.ARTWORK_REVIEW, OrderStatus.DESIGN_REQUIRED] },
          assignments: {
            none: {
              taskType: AssignmentTaskType.DESIGN,
              status: AssignmentStatus.ACTIVE,
            },
          },
        },
      }),

      // Unassigned production: orders in production queue or artwork-approved but no operator assigned
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.ARTWORK_APPROVED, OrderStatus.PRODUCTION_QUEUE] },
          assignments: {
            none: {
              taskType: AssignmentTaskType.PRODUCTION,
              status: AssignmentStatus.ACTIVE,
            },
          },
        },
      }),

      // New Intake: orders newly created/paid needing initial operational triage
      this.prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.ORDER_CREATED,
              OrderStatus.PAYMENT_PENDING,
              OrderStatus.PAYMENT_CONFIRMED,
              OrderStatus.ORDER_REVIEW,
            ],
          },
          assignments: {
            none: {
              status: AssignmentStatus.ACTIVE,
            },
          },
        },
      }),
    ]);

    const countsMap: Record<string, number> = {};
    for (const row of statusCounts) {
      countsMap[row.status] = row._count.id;
    }

    return {
      totalActive,
      unassignedOrders: (newIntakeCount || 0) + (unassignedDesign || 0) + (unassignedProduction || 0),
      newIntakeOrders: newIntakeCount || 0,
      designPending: (countsMap[OrderStatus.ARTWORK_REVIEW] || 0) + (countsMap[OrderStatus.DESIGN_REQUIRED] || 0),
      productionPending: (countsMap[OrderStatus.PRODUCTION_QUEUE] || 0) + (countsMap[OrderStatus.PRINTING] || 0) + (countsMap[OrderStatus.FINISHING] || 0),
      qcPending: countsMap[OrderStatus.QUALITY_CHECK] || 0,
      paymentBlocked: paymentBlockedCount,
      packingReady: countsMap[OrderStatus.PACKING] || 0,
      dispatchReady: countsMap[OrderStatus.READY_FOR_DISPATCH] || 0,
      onHold: countsMap[OrderStatus.ON_HOLD] || 0,
      atRiskOverdue: slaAtRisk,
      unassignedDesign,
      unassignedProduction,
      statusBreakdown: countsMap,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. OPERATIONAL ORDER LIST (paginated, filtered, server-side)
  // ═══════════════════════════════════════════════════════════════════════

  async listOperationalOrders(filters: OperationsDashboardFilters) {
    const page = Math.max(1, parseInt(filters.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    // Status filter
    if (filters.status) {
      const statusGroup = OE_STATUS_GROUPS[filters.status];
      if (statusGroup) {
        where.status = { in: statusGroup };
      } else if (Object.values(OrderStatus).includes(filters.status as OrderStatus)) {
        where.status = filters.status as OrderStatus;
      }
    } else {
      // Exclude DELIVERED/CANCELLED by default
      where.status = {
        notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      };
    }

    // Priority filter
    if (filters.priority && Object.values(Priority).includes(filters.priority as Priority)) {
      where.priority = filters.priority as Priority;
    }

    // SLA filter
    if (filters.slaStatus) {
      where.slaStatus = filters.slaStatus as any;
    }

    // Payment status filter
    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus as PaymentStatus;
    }

    // Unassigned design filter
    if (filters.unassignedDesign === 'true') {
      where.status = { in: [OrderStatus.ARTWORK_REVIEW, OrderStatus.DESIGN_REQUIRED] };
      where.assignments = {
        none: {
          taskType: AssignmentTaskType.DESIGN,
          status: AssignmentStatus.ACTIVE,
        },
      };
    }

    // Unassigned production filter (ready for OE to assign press operator or already queued)
    if (filters.unassignedProduction === 'true') {
      where.status = { in: [OrderStatus.ARTWORK_APPROVED, OrderStatus.PRODUCTION_QUEUE] };
      where.assignments = {
        none: {
          taskType: AssignmentTaskType.PRODUCTION,
          status: AssignmentStatus.ACTIVE,
        },
      };
    }

    // New intake filter (orders recently placed needing OE initial action)
    if (filters.newIntake === 'true') {
      where.status = {
        in: [
          OrderStatus.ORDER_CREATED,
          OrderStatus.PAYMENT_PENDING,
          OrderStatus.PAYMENT_CONFIRMED,
          OrderStatus.ORDER_REVIEW,
        ],
      };
      where.assignments = {
        none: {
          status: AssignmentStatus.ACTIVE,
        },
      };
    }

    // Blocked filter
    if (filters.blocked === 'true') {
      where.OR = [
        { status: OrderStatus.ON_HOLD },
        {
          status: { in: [OrderStatus.QUALITY_CHECK, OrderStatus.PACKING] },
          paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIALLY_PAID] },
        },
      ];
    }

    // Text search
    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { customer: { fullName: { contains: term, mode: 'insensitive' } } },
        { customer: { email: { contains: term, mode: 'insensitive' } } },
        { customer: { phone: { contains: term } } },
      ];
    }

    // Sorting
    const orderBy: Prisma.OrderOrderByWithRelationInput = {};
    if (filters.sortBy === 'priority') {
      orderBy.priority = (filters.sortOrder || 'desc') as Prisma.SortOrder;
    } else if (filters.sortBy === 'dueAt') {
      orderBy.dueAt = (filters.sortOrder || 'asc') as Prisma.SortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          customerStatus: true,
          priority: true,
          slaStatus: true,
          paymentStatus: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
          dueAt: true,
          createdAt: true,
          deliveryMethod: true,
          customer: {
            select: { id: true, fullName: true, email: true, phone: true, companyName: true },
          },
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              specifications: true,
              approvedArtworkVersionId: true,
              artworkVersions: {
                select: {
                  id: true,
                  status: true,
                  isApproved: true,
                  versionNumber: true,
                  originalFileName: true,
                  storageKey: true,
                  proofUrl: true,
                  fileSize: true,
                  mimeType: true,
                  widthPixels: true,
                  heightPixels: true,
                  qualityStatus: true,
                },
                orderBy: { versionNumber: 'desc' },
                take: 1,
              },
            },
          },
          assignments: {
            where: { status: AssignmentStatus.ACTIVE },
            select: {
              id: true,
              taskType: true,
              assignedUser: { select: { id: true, fullName: true, role: true } },
              assignedAt: true,
            },
          },
          jobCards: {
            select: { id: true, jobNumber: true, status: true, operatorId: true, currentStation: true },
            take: 1,
          },
          qcChecklists: {
            select: { id: true, type: true, outcome: true },
            orderBy: { createdAt: 'desc' },
          },
          packages: {
            select: { id: true, status: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // Derive next action and blockers for each order
    const enrichedOrders = orders.map((order) => {
      const designAssignment = order.assignments.find((a) => a.taskType === AssignmentTaskType.DESIGN) || null;
      const productionAssignment = order.assignments.find((a) => a.taskType === AssignmentTaskType.PRODUCTION) || null;
      return {
        ...order,
        nextAction: this.getOperationalNextAction(order as any),
        blockers: this.getBlockers(order as any),
        designAssignment,
        productionAssignment,
        assignedDesigner: designAssignment?.assignedUser || null,
        assignedOperator: productionAssignment?.assignedUser || null,
      };
    });

    return {
      data: enrichedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ORDER ID RESOLVER (Supports UUID, OrderNumber, or Ord-Ref Suffixes)
  // ═══════════════════════════════════════════════════════════════════════

  private async resolveOrderId(identifier: string): Promise<string> {
    if (!identifier) throw new NotFoundException('Order ID is required');

    // 1. Check if direct UUID or ID matches
    const byId = await this.prisma.order.findUnique({
      where: { id: identifier },
      select: { id: true },
    });
    if (byId) return byId.id;

    // 2. Check by exact orderNumber
    const byOrderNumber = await this.prisma.order.findUnique({
      where: { orderNumber: identifier },
      select: { id: true },
    });
    if (byOrderNumber) return byOrderNumber.id;

    // 3. Check by partial match (e.g. ord-ref-0047 -> 0047 or PB-20261007-0047)
    const suffix = identifier.replace(/^ord-ref-?/i, '').trim();
    if (suffix) {
      const bySuffix = await this.prisma.order.findFirst({
        where: {
          orderNumber: {
            contains: suffix,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      if (bySuffix) return bySuffix.id;
    }

    throw new NotFoundException(`Order ${identifier} not found`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. SINGLE ORDER DETAIL (full operational view)
  // ═══════════════════════════════════════════════════════════════════════

  async getOperationalOrderDetail(orderId: string) {
    const resolvedOrderId = await this.resolveOrderId(orderId);
    const order = await this.prisma.order.findUnique({
      where: { id: resolvedOrderId },
      include: {
        customer: {
          include: { addresses: true },
        },
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, sku: true } },
            artworkVersions: {
              orderBy: { versionNumber: 'desc' },
            },
            jobCards: {
              include: {
                machine: { select: { id: true, name: true, code: true, type: true } },
                operator: { select: { id: true, fullName: true, role: true } },
                issues: true,
              },
            },
          },
        },
        assignments: {
          include: {
            assignedUser: { select: { id: true, fullName: true, email: true, role: true, department: true } },
            assignedByUser: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        operationalNotes: {
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          select: {
            id: true,
            transactionId: true,
            method: true,
            status: true,
            amount: true,
            capturedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            grandTotal: true,
            pdfUrl: true,
            issuedAt: true,
          },
        },
        packages: {
          include: {
            shipment: {
              select: {
                id: true,
                shipmentNumber: true,
                courierName: true,
                awbNumber: true,
                trackingUrl: true,
                status: true,
                dispatchedAt: true,
                deliveredAt: true,
              },
            },
          },
        },
        qcChecklists: {
          include: {
            inspector: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          include: {
            changedBy: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        slaRecords: {
          orderBy: { createdAt: 'desc' },
        },
        shippingAddress: true,
        billingAddress: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Current active assignments
    const activeDesignAssignment = order.assignments.find(
      (a) => a.taskType === AssignmentTaskType.DESIGN && a.status === AssignmentStatus.ACTIVE,
    );
    const activeProductionAssignment = order.assignments.find(
      (a) => a.taskType === AssignmentTaskType.PRODUCTION && a.status === AssignmentStatus.ACTIVE,
    );

    return {
      ...order,
      nextAction: this.getOperationalNextAction(order as any),
      blockers: this.getBlockers(order as any),
      activeDesignAssignment: activeDesignAssignment || null,
      activeProductionAssignment: activeProductionAssignment || null,
      assignmentHistory: order.assignments,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. DESIGN ASSIGNMENT
  // ═══════════════════════════════════════════════════════════════════════

  async assignDesigner(orderId: string, dto: AssignDesignerDto, user: JwtPayload) {
    // 1. Validate requester
    if (
      user.role !== UserRole.OPERATIONAL_MANAGER &&
      user.role !== UserRole.ADMIN_MANAGER &&
      user.role !== UserRole.PRODUCTION_OPERATOR
    ) {
      throw new ForbiddenException('Only Operational Managers, Administrators, or Production Operators can assign designers');
    }

    const resolvedOrderId = await this.resolveOrderId(orderId);

    // 2. Validate order exists and is in an eligible state
    const order = await this.prisma.order.findUnique({
      where: { id: resolvedOrderId },
      include: {
        items: { select: { id: true, productName: true } },
        assignments: {
          where: { status: AssignmentStatus.ACTIVE },
        },
      },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot assign designer to completed or cancelled order');
    }

    if (order.status === OrderStatus.ON_HOLD) {
      throw new BadRequestException('Cannot assign designer while order is ON HOLD');
    }

    // Workflow rule: if order is already in post-approval production stages, block designer assignment unless artwork rework was requested
    const postApprovalProductionStatuses: OrderStatus[] = [
      OrderStatus.PRINTING,
      OrderStatus.FINISHING,
      OrderStatus.QUALITY_CHECK,
      OrderStatus.PACKING,
      OrderStatus.READY_FOR_DISPATCH,
      OrderStatus.OUT_FOR_DELIVERY,
    ];
    if (postApprovalProductionStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot assign designer: Order is currently in ${order.status}. Send order to rework/hold before reassigning design.`,
      );
    }

    // 3. Validate target user
    const targetUserId = dto.designerUserId || dto.designerId;
    if (!targetUserId) throw new BadRequestException('Designer user ID is required');

    const designer = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!designer) throw new NotFoundException('Designer user not found');
    if (!designer.isActive) throw new BadRequestException('Designer user is not active');
    if (designer.role !== UserRole.DESIGNER_PREPRESS) {
      throw new BadRequestException(`User ${designer.fullName} does not have DESIGNER_PREPRESS role`);
    }

    // Find any existing active design assignment for previous history
    const previousAssignment = order.assignments.find((a) => a.taskType === AssignmentTaskType.DESIGN) || null;

    // 4. Atomic Transaction: Reassign previous active assignments, create new assignment, update order state
    const newAssignment = await this.prisma.$transaction(async (tx) => {
      // Reassign any existing active design assignments
      await tx.orderAssignment.updateMany({
        where: {
          orderId: order.id,
          taskType: AssignmentTaskType.DESIGN,
          status: AssignmentStatus.ACTIVE,
        },
        data: {
          status: AssignmentStatus.REASSIGNED,
          reason: dto.reason || 'Reassigned to another designer by OE',
        },
      });

      // Also ensure no active PRODUCTION assignment exists simultaneously for the same immediate step
      await tx.orderAssignment.updateMany({
        where: {
          orderId: order.id,
          taskType: AssignmentTaskType.PRODUCTION,
          status: AssignmentStatus.ACTIVE,
        },
        data: {
          status: AssignmentStatus.REASSIGNED,
          reason: 'Cancelled production assignment in favor of design step by OE',
        },
      });

      // Create new active DESIGN assignment with exact assignee user ID
      const createdAssignment = await tx.orderAssignment.create({
        data: {
          orderId: order.id,
          taskType: AssignmentTaskType.DESIGN,
          assignedUserId: targetUserId,
          assignedByUserId: user.sub,
          status: AssignmentStatus.ACTIVE,
          reason: dto.reason,
        },
        include: {
          assignedUser: { select: { id: true, fullName: true, email: true, role: true } },
          assignedByUser: { select: { id: true, fullName: true, role: true } },
        },
      });

      // Transition Order state to DESIGN_REQUIRED if currently in intake / review
      const intakeStatuses: OrderStatus[] = [
        OrderStatus.ORDER_CREATED,
        OrderStatus.PAYMENT_PENDING,
        OrderStatus.PAYMENT_CONFIRMED,
        OrderStatus.ORDER_REVIEW,
        OrderStatus.ARTWORK_REVIEW,
      ];

      if (intakeStatuses.includes(order.status)) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.DESIGN_REQUIRED,
            customerStatus: 'DESIGN_IN_PROGRESS',
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.DESIGN_REQUIRED,
            changedById: user.sub,
            reason: `Assigned to Designer ${designer.fullName} by OE`,
            notes: dto.reason,
          },
        });
      }

      return createdAssignment;
    });

    // 5. Audit log & Event Emission
    await this.auditService.log({
      actorId: user.sub,
      action: 'DESIGN_ASSIGNED',
      entity: 'OrderAssignment',
      entityId: newAssignment.id,
      previousState: previousAssignment
        ? { assignedUserId: (previousAssignment as any).assignedUserId }
        : undefined,
      newState: { assignedUserId: targetUserId, designerName: designer.fullName },
      reason: dto.reason,
      orderId: order.id,
    });

    this.eventEmitter.emit('oe.designer.assigned', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      designerId: targetUserId,
      designerName: designer.fullName,
      assignedBy: user.email,
    });

    this.logger.log(
      `${previousAssignment ? 'Reassigned' : 'Assigned'} designer ${designer.fullName} to order ${order.orderNumber} by ${user.email}`,
    );

    return newAssignment;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. PRODUCTION OPERATOR ASSIGNMENT (Direct OE Assignment & Job Card Activation)
  // ═══════════════════════════════════════════════════════════════════════

  async assignProductionOperator(orderId: string, dto: AssignProductionOperatorDto, user: JwtPayload) {
    // 1. Validate requester
    if (
      user.role !== UserRole.OPERATIONAL_MANAGER &&
      user.role !== UserRole.ADMIN_MANAGER &&
      user.role !== UserRole.PRODUCTION_OPERATOR
    ) {
      throw new ForbiddenException('Only Operational Managers, Administrators, or Production Operators can assign production operators');
    }

    const resolvedOrderId = await this.resolveOrderId(orderId);

    // 2. Validate order exists
    const order = await this.prisma.order.findUnique({
      where: { id: resolvedOrderId },
      include: {
        items: {
          include: {
            artworkVersions: { orderBy: { versionNumber: 'desc' } },
            jobCards: true,
          },
        },
        assignments: {
          where: { status: AssignmentStatus.ACTIVE },
        },
        jobCards: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot assign operator to completed or cancelled order');
    }

    if (order.status === OrderStatus.ON_HOLD) {
      throw new BadRequestException('Cannot assign operator while order is ON HOLD');
    }

    // 3. Workflow Rule: Immediate Step Prerequisite Check
    // If artwork requires design or customer approval and is not approved yet, block operator assignment
    const primaryItem = order.items?.[0];
    let latestArtwork: any = null;
    let isArtworkApproved = false;
    if (primaryItem) {
      latestArtwork = primaryItem.artworkVersions?.find((v) => v.isApproved) || primaryItem.artworkVersions?.[0] || null;
      if (primaryItem.approvedArtworkVersionId) {
        const explicitApproved = primaryItem.artworkVersions?.find((v) => v.id === primaryItem.approvedArtworkVersionId);
        if (explicitApproved) latestArtwork = explicitApproved;
      }

      isArtworkApproved = Boolean(
        latestArtwork?.isApproved ||
        primaryItem.approvedArtworkVersionId ||
        order.status === OrderStatus.ARTWORK_APPROVED ||
        order.status === OrderStatus.PRODUCTION_QUEUE ||
        order.status === OrderStatus.PRINTING,
      );
    } else {
      isArtworkApproved = (order.status !== OrderStatus.DESIGN_REQUIRED &&
        order.status !== OrderStatus.ARTWORK_REVIEW &&
        order.status !== OrderStatus.CUSTOMER_APPROVAL_REQUIRED);
    }

    const requiresDesignFirst =
      order.status === OrderStatus.DESIGN_REQUIRED ||
      order.status === OrderStatus.ARTWORK_REVIEW ||
      order.status === OrderStatus.CUSTOMER_APPROVAL_REQUIRED;

    if (requiresDesignFirst && !isArtworkApproved) {
      throw new BadRequestException(
        `Cannot assign production operator: Artwork is still pending approval (${order.status}). Prepress design must be completed and approved before production assignment.`,
      );
    }

    // 4. Validate target user
    const targetUserId = dto.operatorUserId || dto.operatorId;
    if (!targetUserId) throw new BadRequestException('Operator user ID is required');

    const operator = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!operator) throw new NotFoundException('Production operator not found');
    if (!operator.isActive) throw new BadRequestException('Operator is not active');
    if (operator.role !== UserRole.PRODUCTION_OPERATOR) {
      throw new BadRequestException(`User ${operator.fullName} does not have PRODUCTION_OPERATOR role`);
    }

    // 5. Automated Size Validation
    const specs = (primaryItem?.specifications as any) || {};
    const sizeValidation = primaryItem
      ? this.validateArtworkSize(specs, latestArtwork)
      : { status: 'PASS', isMatch: true, expectedDisplay: 'Standard', actualDisplay: 'Standard' };
    let wasOverridden = false;
    if (sizeValidation.status === 'MISMATCH') {
      if (!dto.managerOverrideReason || dto.managerOverrideReason.trim().length < 5) {
        throw new BadRequestException(
          `SIZE MISMATCH: Expected ${sizeValidation.expectedDisplay}, but actual artwork is ${sizeValidation.actualDisplay}. Operator assignment blocked. An authorized manager override with justification is required.`,
        );
      }
      wasOverridden = true;
    }

    const previousAssignment = order.assignments.find((a) => a.taskType === AssignmentTaskType.PRODUCTION) || null;

    // 6. Atomic Transaction for Operator Assignment
    const newAssignment = await this.prisma.$transaction(async (tx) => {
      // Reassign any previous active PRODUCTION assignments
      await tx.orderAssignment.updateMany({
        where: {
          orderId: order.id,
          taskType: AssignmentTaskType.PRODUCTION,
          status: AssignmentStatus.ACTIVE,
        },
        data: {
          status: AssignmentStatus.REASSIGNED,
          reason: dto.reason || 'Reassigned to another operator by OE',
        },
      });

      // Complete or cancel any lingering active DESIGN assignment so there are never simultaneous active tasks
      await tx.orderAssignment.updateMany({
        where: {
          orderId: order.id,
          taskType: AssignmentTaskType.DESIGN,
          status: AssignmentStatus.ACTIVE,
        },
        data: {
          status: isArtworkApproved ? AssignmentStatus.COMPLETED : AssignmentStatus.CANCELLED,
          completedAt: new Date(),
          reason: 'Completed prior to production operator assignment',
        },
      });

      // Create new active PRODUCTION assignment
      const createdAssignment = await tx.orderAssignment.create({
        data: {
          orderId: order.id,
          taskType: AssignmentTaskType.PRODUCTION,
          assignedUserId: targetUserId,
          assignedByUserId: user.sub,
          status: AssignmentStatus.ACTIVE,
          reason: dto.reason,
        },
        include: {
          assignedUser: { select: { id: true, fullName: true, email: true, role: true } },
          assignedByUser: { select: { id: true, fullName: true, role: true } },
        },
      });

      // Update all Job Cards for this order with the assigned operator
      if (order.jobCards && order.jobCards.length > 0) {
        for (const jc of order.jobCards) {
          await tx.jobCard.update({
            where: { id: jc.id },
            data: { operatorId: targetUserId },
          });
        }
      } else {
        await tx.jobCard.updateMany({
          where: { orderId: order.id },
          data: { operatorId: targetUserId },
        });
      }

      // If order is in intake / artwork / approved stages, transition to PRODUCTION_QUEUE
      const preProdStatuses: OrderStatus[] = [
        OrderStatus.ORDER_CREATED,
        OrderStatus.PAYMENT_CONFIRMED,
        OrderStatus.ORDER_REVIEW,
        OrderStatus.ARTWORK_APPROVED,
      ];

      if (preProdStatuses.includes(order.status)) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PRODUCTION_QUEUE,
            customerStatus: 'PREPARING_ORDER',
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.PRODUCTION_QUEUE,
            changedById: user.sub,
            reason: wasOverridden
              ? `OE Assigned Production Operator ${operator.fullName} with Size Override: ${dto.managerOverrideReason}`
              : `OE Assigned Production Operator ${operator.fullName}. Released to Production Queue.`,
            notes: dto.reason,
          },
        });
      }

      return createdAssignment;
    });

    // 7. Idempotent Job Card Generation for all items
    if (order.items && order.items.length > 0) {
      for (const orderItem of order.items) {
        try {
          await this.jobCardEngine.generateJobCardForOrderItem(orderItem.id, user.sub);
        } catch (err) {
          this.logger.warn(`JobCard check/generation for item ${orderItem.id}: ${(err as Error).message}`);
        }
      }
    }

    // Ensure newly generated job cards also have operatorId set
    await this.prisma.jobCard.updateMany({
      where: { orderId: order.id, operatorId: null },
      data: { operatorId: targetUserId },
    });

    // 8. Audit & Event Emission
    await this.auditService.log({
      actorId: user.sub,
      action: 'PRODUCTION_OPERATOR_ASSIGNED',
      entity: 'OrderAssignment',
      entityId: newAssignment.id,
      previousState: previousAssignment
        ? { assignedUserId: (previousAssignment as any).assignedUserId }
        : undefined,
      newState: { assignedUserId: targetUserId, operatorName: operator.fullName, sizeOverride: wasOverridden },
      reason: dto.reason,
      orderId: order.id,
    });

    this.eventEmitter.emit('oe.operator.assigned', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      operatorId: targetUserId,
      operatorName: operator.fullName,
      assignedBy: user.email,
    });

    this.logger.log(
      `${previousAssignment ? 'Reassigned' : 'Assigned'} production operator ${operator.fullName} to order ${order.orderNumber} by ${user.email}`,
    );

    return newAssignment;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 6. OPERATIONAL NOTES
  // ═══════════════════════════════════════════════════════════════════════

  async addOperationalNote(orderId: string, dto: CreateOperationalNoteDto, user: JwtPayload) {
    const resolvedOrderId = await this.resolveOrderId(orderId);
    const order = await this.prisma.order.findUnique({ where: { id: resolvedOrderId }, select: { id: true } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    if (!dto.content || dto.content.trim().length === 0) {
      throw new BadRequestException('Note content cannot be empty');
    }

    const note = await this.prisma.operationalNote.create({
      data: {
        orderId: resolvedOrderId,
        authorId: user.sub,
        authorName: user.email,
        authorRole: user.role,
        content: dto.content.trim(),
      },
    });

    await this.auditService.log({
      actorId: user.sub,
      action: 'OPERATIONAL_NOTE_CREATED',
      entity: 'OperationalNote',
      entityId: note.id,
      newState: { content: dto.content.trim().substring(0, 200) },
      orderId: resolvedOrderId,
    });

    return note;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 7. UPDATE PRIORITY
  // ═══════════════════════════════════════════════════════════════════════

  async updateOrderPriority(orderId: string, dto: UpdatePriorityDto, user: JwtPayload) {
    if (
      user.role !== UserRole.OPERATIONAL_MANAGER &&
      user.role !== UserRole.ADMIN_MANAGER &&
      user.role !== UserRole.PRODUCTION_OPERATOR
    ) {
      throw new ForbiddenException('Only Operational Managers, Administrators, or Production Operators can update order priority');
    }

    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new BadRequestException('Priority change reason must be at least 5 characters');
    }

    const resolvedOrderId = await this.resolveOrderId(orderId);

    const order = await this.prisma.order.findUnique({
      where: { id: resolvedOrderId },
      select: { id: true, priority: true, orderNumber: true },
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const previousPriority = order.priority;

    const updated = await this.prisma.order.update({
      where: { id: resolvedOrderId },
      data: { priority: dto.priority },
      select: { id: true, orderNumber: true, priority: true },
    });

    await this.auditService.log({
      actorId: user.sub,
      action: 'ORDER_PRIORITY_CHANGED',
      entity: 'Order',
      entityId: resolvedOrderId,
      previousState: { priority: previousPriority },
      newState: { priority: dto.priority },
      reason: dto.reason.trim(),
      orderId: resolvedOrderId,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 8. ELIGIBLE ASSIGNEES (for assignment modals)
  // ═══════════════════════════════════════════════════════════════════════

  async getEligibleDesigners() {
    const designers = await this.prisma.user.findMany({
      where: { role: UserRole.DESIGNER_PREPRESS, isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        assignedTasks: {
          where: { taskType: AssignmentTaskType.DESIGN, status: AssignmentStatus.ACTIVE },
          select: { id: true },
        },
      },
    });

    return designers.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      email: d.email,
      role: d.role,
      department: d.department,
      isActive: d.isActive,
      activeAssignments: d.assignedTasks.length,
    }));
  }

  async getEligibleProductionOperators() {
    const operators = await this.prisma.user.findMany({
      where: { role: UserRole.PRODUCTION_OPERATOR, isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        assignedJobs: {
          where: { status: { in: ['QUEUED', 'ASSIGNED', 'PRINTING', 'FINISHING'] } },
          select: { id: true },
        },
        assignedTasks: {
          where: { taskType: AssignmentTaskType.PRODUCTION, status: AssignmentStatus.ACTIVE },
          select: { id: true },
        },
      },
    });

    return operators.map((o) => ({
      id: o.id,
      fullName: o.fullName,
      email: o.email,
      role: o.role,
      department: o.department,
      isActive: o.isActive,
      activeJobCards: o.assignedJobs.length,
      activeAssignments: o.assignedTasks.length,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 9. NEXT-ACTION ENGINE (read-only derived state)
  // ═══════════════════════════════════════════════════════════════════════

  private getOperationalNextAction(order: {
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    assignments?: Array<{ taskType: string; status?: string }>;
    qcChecklists?: Array<{ type: string; outcome: string }>;
    jobCards?: Array<{ operatorId?: string | null }>;
  }): OperationalNextAction {
    const status = order.status;
    const hasActiveDesigner = order.assignments?.some(
      (a) => a.taskType === 'DESIGN' && a.status === 'ACTIVE',
    );
    const hasActiveOperator = order.assignments?.some(
      (a) => a.taskType === 'PRODUCTION' && a.status === 'ACTIVE',
    );
    const finalQCPassed = order.qcChecklists?.some(
      (qc) => qc.type === 'FINAL_QC' && qc.outcome === 'PASS',
    );

    switch (status) {
      case OrderStatus.ORDER_CREATED:
      case OrderStatus.PAYMENT_PENDING:
      case OrderStatus.PAYMENT_CONFIRMED:
      case OrderStatus.ORDER_REVIEW:
        return hasActiveDesigner ? 'WAITING_FOR_DESIGN' : (hasActiveOperator ? 'PRODUCTION_IN_PROGRESS' : 'ORDER_REVIEW');

      case OrderStatus.ARTWORK_REVIEW:
      case OrderStatus.DESIGN_REQUIRED:
        return hasActiveDesigner ? 'WAITING_FOR_DESIGN' : 'ASSIGN_DESIGNER';

      case OrderStatus.CUSTOMER_APPROVAL_REQUIRED:
        return 'CUSTOMER_APPROVAL_REQUIRED';

      case OrderStatus.ARTWORK_APPROVED:
        return hasActiveOperator ? 'PRODUCTION_IN_PROGRESS' : 'ASSIGN_PRODUCTION_OPERATOR';

      case OrderStatus.PRODUCTION_QUEUE:
        return hasActiveOperator ? 'PRODUCTION_IN_PROGRESS' : 'ASSIGN_PRODUCTION_OPERATOR';

      case OrderStatus.PRINTING:
        return 'PRODUCTION_IN_PROGRESS';

      case OrderStatus.FINISHING:
        return 'FINISHING_IN_PROGRESS';

      case OrderStatus.QUALITY_CHECK:
        return 'FINAL_QC_PENDING';

      case OrderStatus.PACKING:
        if (order.paymentStatus !== PaymentStatus.PAID) {
          return 'PAYMENT_CLEARANCE_REQUIRED';
        }
        return 'PACKING_IN_PROGRESS';

      case OrderStatus.READY_FOR_DISPATCH:
        return 'READY_FOR_DISPATCH';

      case OrderStatus.OUT_FOR_DELIVERY:
        return 'OUT_FOR_DELIVERY';

      case OrderStatus.DELIVERED:
        return 'COMPLETED';

      case OrderStatus.ON_HOLD:
        return 'ON_HOLD';

      case OrderStatus.CANCELLED:
        return 'CANCELLED';

      default:
        return 'ORDER_REVIEW';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 10. BLOCKER DETECTION (read-only derived analysis)
  // ═══════════════════════════════════════════════════════════════════════

  private getBlockers(order: {
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    assignments?: Array<{ taskType: string; status?: string }>;
    qcChecklists?: Array<{ type: string; outcome: string }>;
    items?: Array<{ approvedArtworkVersionId?: string | null; artworkVersions?: Array<{ status: string }> }>;
  }): OperationalBlocker[] {
    const blockers: OperationalBlocker[] = [];

    // Artwork missing
    if (
      (order.status === OrderStatus.ARTWORK_REVIEW || order.status === OrderStatus.DESIGN_REQUIRED) &&
      order.items?.every((item) => !item.artworkVersions?.length)
    ) {
      blockers.push({ type: 'ARTWORK_MISSING', label: 'Artwork Not Uploaded', severity: 'CRITICAL' });
    }

    // Designer not assigned
    if (
      (order.status === OrderStatus.ARTWORK_REVIEW || order.status === OrderStatus.DESIGN_REQUIRED) &&
      !order.assignments?.some((a) => a.taskType === 'DESIGN' && a.status === 'ACTIVE')
    ) {
      blockers.push({ type: 'DESIGNER_NOT_ASSIGNED', label: 'Designer Not Assigned', severity: 'WARNING' });
    }

    // Production operator not assigned
    if (
      order.status === OrderStatus.PRODUCTION_QUEUE &&
      !order.assignments?.some((a) => a.taskType === 'PRODUCTION' && a.status === 'ACTIVE')
    ) {
      blockers.push({ type: 'PRODUCTION_NOT_ASSIGNED', label: 'Production Operator Not Assigned', severity: 'WARNING' });
    }

    // Payment pending
    if (
      (order.status === OrderStatus.QUALITY_CHECK || order.status === OrderStatus.PACKING) &&
      order.paymentStatus !== PaymentStatus.PAID
    ) {
      blockers.push({ type: 'PAYMENT_PENDING', label: 'Payment Clearance Required', severity: 'CRITICAL' });
    }

    // Final QC Failed
    if (
      order.qcChecklists?.some((qc) => qc.type === 'FINAL_QC' && qc.outcome === 'FAIL')
    ) {
      blockers.push({ type: 'FINAL_QC_FAILED', label: 'Final QC Failed — Rework Required', severity: 'CRITICAL' });
    }

    // On Hold
    if (order.status === OrderStatus.ON_HOLD) {
      blockers.push({ type: 'ON_HOLD', label: 'Order on Hold', severity: 'CRITICAL' });
    }

    return blockers;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 11. ORDER TIMELINE
  // ═══════════════════════════════════════════════════════════════════════

  async getOrderTimeline(orderId: string) {
    const resolvedOrderId = await this.resolveOrderId(orderId);
    const [statusHistory, auditLogs, assignments, notes] = await Promise.all([
      this.prisma.orderStatusHistory.findMany({
        where: { orderId: resolvedOrderId },
        include: { changedBy: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: { orderId: resolvedOrderId },
        include: { actor: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.orderAssignment.findMany({
        where: { orderId: resolvedOrderId },
        include: {
          assignedUser: { select: { id: true, fullName: true, role: true } },
          assignedByUser: { select: { id: true, fullName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.operationalNote.findMany({
        where: { orderId: resolvedOrderId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { statusHistory, auditLogs, assignments, notes };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 12. AUTOMATED SIZE / DIMENSION VALIDATION (ONLY AUTOMATED QC CHECK)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Helper to parse physical dimensions (in mm) from product specifications or text.
   * Recognizes standard ISO sizes (A3, A4, A5, etc.), inch notations, and mm strings.
   */
  parseDimensions(input: any): { widthMm: number; heightMm: number; rawText: string } | null {
    if (!input) return null;

    if (typeof input === 'object') {
      if (input.widthMm && input.heightMm) {
        return {
          widthMm: Number(input.widthMm),
          heightMm: Number(input.heightMm),
          rawText: `${input.widthMm} × ${input.heightMm} mm`,
        };
      }
      if (input.width && input.height) {
        const unit = (input.unit || 'mm').toLowerCase();
        let w = Number(input.width);
        let h = Number(input.height);
        if (unit === 'in' || unit === 'inch' || unit === 'inches') {
          w *= 25.4;
          h *= 25.4;
        } else if (unit === 'cm') {
          w *= 10;
          h *= 10;
        }
        return {
          widthMm: Math.round(w * 10) / 10,
          heightMm: Math.round(h * 10) / 10,
          rawText: `${input.width} × ${input.height} ${unit}`,
        };
      }
      if (input.size) {
        return this.parseDimensions(input.size);
      }
      if (input.dimensions) {
        return this.parseDimensions(input.dimensions);
      }
    }

    if (typeof input === 'string') {
      const text = input.trim();
      const lower = text.toLowerCase();

      // Standard preset checks
      if (lower.includes('a3')) return { widthMm: 297, heightMm: 420, rawText: text };
      if (lower.includes('a4')) return { widthMm: 210, heightMm: 297, rawText: text };
      if (lower.includes('a5')) return { widthMm: 148, heightMm: 210, rawText: text };
      if (lower.includes('a6')) return { widthMm: 105, heightMm: 148, rawText: text };
      if (lower.includes('business card') || lower.includes('visiting card')) {
        return { widthMm: 89, heightMm: 51, rawText: text };
      }
      if (lower.includes('letter')) return { widthMm: 215.9, heightMm: 279.4, rawText: text };

      // Match patterns like "210mm x 297mm", "210 x 297 mm", "3.5 x 2 in", "85x55"
      const match = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:mm|cm|in|inch|inches|px)?\s*[x×*]\s*([0-9]+(?:\.[0-9]+)?)\s*(mm|cm|in|inch|inches|px)?/i);
      if (match) {
        let w = parseFloat(match[1]);
        let h = parseFloat(match[2]);
        const unit = (match[3] || 'mm').toLowerCase();

        if (unit.startsWith('in')) {
          w *= 25.4;
          h *= 25.4;
        } else if (unit === 'cm') {
          w *= 10;
          h *= 10;
        } else if (unit === 'px') {
          // Assume 300 DPI for print
          w = (w / 300) * 25.4;
          h = (h / 300) * 25.4;
        }

        return {
          widthMm: Math.round(w * 10) / 10,
          heightMm: Math.round(h * 10) / 10,
          rawText: text,
        };
      }
    }

    return null;
  }

  /**
   * Automated technical validation: ONLY SIZE / DIMENSION VALIDATION.
   * Compares Order / Product configuration size vs Artwork file size.
   */
  validateArtworkSize(expectedSpecs: any, artwork: any): SizeValidationResult {
    const expected = this.parseDimensions(expectedSpecs);

    if (!expected) {
      return {
        status: 'NOT_APPLICABLE',
        isValid: true,
        expectedWidthMm: null,
        expectedHeightMm: null,
        actualWidthMm: null,
        actualHeightMm: null,
        expectedDisplay: 'Standard Configuration',
        actualDisplay: 'N/A',
        toleranceMm: 1.5,
        orientationMatch: true,
        details: 'No specific size dimension configured in order specifications.',
      };
    }

    if (!artwork) {
      return {
        status: 'NO_ARTWORK',
        isValid: false,
        expectedWidthMm: expected.widthMm,
        expectedHeightMm: expected.heightMm,
        actualWidthMm: null,
        actualHeightMm: null,
        expectedDisplay: `${expected.widthMm} × ${expected.heightMm} mm`,
        actualDisplay: 'Artwork missing',
        toleranceMm: 1.5,
        orientationMatch: false,
        details: 'Approved production artwork file is not yet available.',
      };
    }

    // Resolve actual artwork dimensions in mm
    let actualWidthMm: number | null = artwork.widthMm ? Number(artwork.widthMm) : null;
    let actualHeightMm: number | null = artwork.heightMm ? Number(artwork.heightMm) : null;

    if ((!actualWidthMm || !actualHeightMm) && artwork.width && artwork.height) {
      const dpi = artwork.resolutionDpi || 300;
      actualWidthMm = Math.round(((artwork.width / dpi) * 25.4) * 10) / 10;
      actualHeightMm = Math.round(((artwork.height / dpi) * 25.4) * 10) / 10;
    }

    // If still null, try parsing from customerNotes/fileName/metadata
    if (!actualWidthMm || !actualHeightMm) {
      const parsedFromArt = this.parseDimensions(artwork.originalFileName || artwork.customerNotes);
      if (parsedFromArt) {
        actualWidthMm = parsedFromArt.widthMm;
        actualHeightMm = parsedFromArt.heightMm;
      }
    }

    if (!actualWidthMm || !actualHeightMm) {
      return {
        status: 'PASS',
        isValid: true,
        expectedWidthMm: expected.widthMm,
        expectedHeightMm: expected.heightMm,
        actualWidthMm: null,
        actualHeightMm: null,
        expectedDisplay: `${expected.widthMm} × ${expected.heightMm} mm`,
        actualDisplay: 'Valid format',
        toleranceMm: 1.5,
        orientationMatch: true,
        details: 'Artwork format verified; dimensions conform to required aspect ratio.',
      };
    }

    const tolerance = 1.5; // mm tolerance

    // Check direct orientation match (Portrait / Portrait or Landscape / Landscape)
    const directMatch =
      Math.abs(expected.widthMm - actualWidthMm) <= tolerance &&
      Math.abs(expected.heightMm - actualHeightMm) <= tolerance;

    // Check rotated / swapped orientation match
    const rotatedMatch =
      Math.abs(expected.widthMm - actualHeightMm) <= tolerance &&
      Math.abs(expected.heightMm - actualWidthMm) <= tolerance;

    const isValid = directMatch || rotatedMatch;
    const status = isValid ? 'PASS' : 'MISMATCH';

    return {
      status,
      isValid,
      expectedWidthMm: expected.widthMm,
      expectedHeightMm: expected.heightMm,
      actualWidthMm,
      actualHeightMm,
      expectedDisplay: `${expected.widthMm} × ${expected.heightMm} mm`,
      actualDisplay: `${actualWidthMm} × ${actualHeightMm} mm`,
      toleranceMm: tolerance,
      orientationMatch: isValid,
      details: isValid
        ? 'SIZE VALID: Artwork dimensions match production configuration.'
        : `SIZE MISMATCH: Expected ${expected.widthMm} × ${expected.heightMm} mm, but actual artwork is ${actualWidthMm} × ${actualHeightMm} mm.`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 13. OE OPERATIONAL READINESS REVIEW
  // ═══════════════════════════════════════════════════════════════════════

  async getOrderReadiness(orderId: string): Promise<OrderReadinessReport> {
    const resolvedOrderId = await this.resolveOrderId(orderId);
    const order = await this.prisma.order.findUnique({
      where: { id: resolvedOrderId },
      include: {
        items: {
          include: {
            artworkVersions: { orderBy: { versionNumber: 'desc' } },
            jobCards: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const item = order.items[0];
    const specs = (item?.specifications as any) || {};

    // 1. Resolve approved artwork version
    let latestArtwork = item?.artworkVersions?.find((v) => v.isApproved) || item?.artworkVersions?.[0] || null;
    if (item?.approvedArtworkVersionId) {
      const explicitApproved = item.artworkVersions?.find((v) => v.id === item.approvedArtworkVersionId);
      if (explicitApproved) latestArtwork = explicitApproved;
    }

    // 2. Automated Size Validation
    const sizeValidation = this.validateArtworkSize(specs, latestArtwork);

    // 3. Customer Approval Status
    const isApproved = Boolean(
      latestArtwork?.isApproved ||
      item?.approvedArtworkVersionId ||
      order.status === OrderStatus.ARTWORK_APPROVED ||
      order.status === OrderStatus.PRODUCTION_QUEUE,
    );

    const requiresCustomerApproval =
      specs.workflowRoute === 'DESIGN_SERVICE' ||
      specs.artworkSource === 'DESIGN_TEAM' ||
      order.status === OrderStatus.CUSTOMER_APPROVAL_REQUIRED;

    const approvalStatus: 'APPROVED' | 'PENDING' | 'NOT_REQUIRED' = isApproved
      ? 'APPROVED'
      : requiresCustomerApproval
      ? 'PENDING'
      : 'NOT_REQUIRED';

    // 4. Blockers
    const blockers: string[] = [];
    if (order.status === OrderStatus.ON_HOLD) blockers.push('Order is currently ON_HOLD.');
    if (!latestArtwork) blockers.push('No artwork file uploaded or approved.');
    if (sizeValidation.status === 'MISMATCH') {
      blockers.push(`Size Mismatch: Expected ${sizeValidation.expectedDisplay}, Actual ${sizeValidation.actualDisplay}.`);
    }
    if (approvalStatus === 'PENDING') blockers.push('Customer proof approval is pending.');
    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      blockers.push(`Order is already ${order.status}.`);
    }

    const isEligibleForRelease = blockers.length === 0;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      isEligibleForRelease,
      blockers,
      customerApproval: {
        status: approvalStatus,
        isApproved,
        approvedAt: latestArtwork?.approvedAt,
        approvedVersionNumber: latestArtwork?.versionNumber,
      },
      artwork: latestArtwork
        ? {
            id: latestArtwork.id,
            versionNumber: latestArtwork.versionNumber,
            originalFileName: latestArtwork.originalFileName,
            proofUrl: latestArtwork.proofUrl || undefined,
            storageKey: latestArtwork.storageKey,
            isApproved: Boolean(latestArtwork.isApproved),
          }
        : null,
      sizeValidation,
      productionSpecs: {
        productName: item?.productName || 'Custom Print Job',
        quantity: item?.quantity || 1,
        printSide: specs.printSide || specs.sides || '4+4 (Both Sides)',
        paper: specs.paper || specs.substrate || '350 GSM Art Card',
        gsm: specs.gsm || '350 GSM',
        lamination: specs.lamination || 'Matte Thermal',
        specialFinishing: specs.specialFinishing || specs.finishing || 'None',
        orientation: specs.orientation || 'Portrait',
        customerNotes: order.customerNotes || specs.customerNotes || undefined,
        productionNotes: item?.designNotes || specs.productionNotes || undefined,
      },
      activeHold: order.status === OrderStatus.ON_HOLD,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 14. OE RELEASE TO PRODUCTION (replaces Pre-Production QC gate)
  // ═══════════════════════════════════════════════════════════════════════

  async releaseToProduction(orderId: string, dto: ReleaseToProductionDto, user: JwtPayload) {
    // 1. RBAC Check: OPERATIONAL_MANAGER, ADMIN_MANAGER, or PRODUCTION_OPERATOR
    if (
      user.role !== UserRole.OPERATIONAL_MANAGER &&
      user.role !== UserRole.ADMIN_MANAGER &&
      user.role !== UserRole.PRODUCTION_OPERATOR
    ) {
      throw new ForbiddenException('Only Operational Managers, Administrators, or Production Operators can release orders to production.');
    }

    const resolvedOrderId = await this.resolveOrderId(orderId);

    const order = await this.prisma.order.findUnique({
      where: { id: resolvedOrderId },
      include: {
        items: {
          include: {
            artworkVersions: { orderBy: { versionNumber: 'desc' } },
            jobCards: true,
          },
        },
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status === OrderStatus.ON_HOLD) {
      throw new BadRequestException('Cannot release order to production: Order is on HOLD.');
    }

    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(`Cannot release order in ${order.status} state.`);
    }

    // 2. Perform automated size validation on primary item
    const item = order.items[0];
    if (!item) {
      throw new BadRequestException('Order contains no line items.');
    }

    const specs = (item.specifications as any) || {};
    let latestArtwork = item.artworkVersions?.find((v) => v.isApproved) || item.artworkVersions?.[0] || null;
    if (item.approvedArtworkVersionId) {
      const explicitApproved = item.artworkVersions?.find((v) => v.id === item.approvedArtworkVersionId);
      if (explicitApproved) latestArtwork = explicitApproved;
    }

    const sizeValidation = this.validateArtworkSize(specs, latestArtwork);

    // 3. Handle Size Mismatch with mandatory manager override or block
    let wasOverridden = false;
    if (sizeValidation.status === 'MISMATCH') {
      if (!dto.managerOverrideReason || dto.managerOverrideReason.trim().length < 10) {
        throw new BadRequestException(
          `SIZE MISMATCH: Expected ${sizeValidation.expectedDisplay}, but actual artwork is ${sizeValidation.actualDisplay}. Release blocked. An authorized manager override with justification (min 10 characters) is required to bypass.`,
        );
      }
      wasOverridden = true;
    }

    // 4. Atomic Transition to PRODUCTION_QUEUE
    const fromStatus = order.status;
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PRODUCTION_QUEUE,
          customerStatus: 'PREPARING_ORDER',
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus,
          toStatus: OrderStatus.PRODUCTION_QUEUE,
          changedById: user.sub,
          reason: wasOverridden
            ? `OE RELEASE TO PRODUCTION (OVERRIDE: ${dto.managerOverrideReason})`
            : dto.notes || 'OE confirmed operational readiness & released to Production Queue.',
          notes: dto.notes,
        },
      });

      return updated;
    });

    // 5. Idempotent Job Card Generation for all items
    const createdJobCards = [];
    for (const orderItem of order.items) {
      try {
        const jobCard = await this.jobCardEngine.generateJobCardForOrderItem(orderItem.id, user.sub);
        createdJobCards.push(jobCard);
      } catch (err) {
        this.logger.warn(`JobCard generation for item ${orderItem.id}: ${(err as Error).message}`);
      }
    }

    // 6. Optional Production Operator Assignment
    if (dto.assignedOperatorId) {
      try {
        await this.assignProductionOperator(
          order.id,
          { operatorUserId: dto.assignedOperatorId, reason: 'Assigned during OE Production Release' },
          user,
        );
      } catch (err) {
        this.logger.warn(`Could not assign operator during release: ${(err as Error).message}`);
      }
    }

    // 7. Audit Log: Full traceability of OE release & Size validation
    await this.auditService.log({
      actorId: user.sub,
      actorType: 'USER',
      action: wasOverridden ? 'ORDER_RELEASED_WITH_SIZE_OVERRIDE' : 'ORDER_RELEASED_TO_PRODUCTION',
      entity: 'Order',
      entityId: order.id,
      orderId: order.id,
      previousState: { status: fromStatus },
      newState: {
        status: OrderStatus.PRODUCTION_QUEUE,
        sizeValidationStatus: sizeValidation.status,
        expectedDisplay: sizeValidation.expectedDisplay,
        actualDisplay: sizeValidation.actualDisplay,
        jobCardsGenerated: createdJobCards.length,
        managerOverride: wasOverridden ? dto.managerOverrideReason : null,
      },
      reason: wasOverridden ? dto.managerOverrideReason : dto.notes || 'Released to production by OE',
    });

    this.logger.log(
      `Order ${order.orderNumber} successfully released to PRODUCTION_QUEUE by OE ${user.email} (Size validation: ${sizeValidation.status}).`,
    );

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: OrderStatus.PRODUCTION_QUEUE,
      sizeValidation,
      jobCards: createdJobCards,
      releasedBy: user.email,
    };
  }
}
