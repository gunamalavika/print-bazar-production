import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CustomerVisibleStatus,
  STATUS_MAPPING,
} from '../../common/types/workflow';
import { UserRole, Department, JwtPayload } from '../../common/types/roles';
import { OrderStatus, JobCardStatus, QCInspectionType, QCOutcome, Prisma } from '@prisma/client';

export interface TransitionRequestDto {
  orderId: string;
  targetStatus: OrderStatus;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ManagerOverrideRequestDto {
  orderId: string;
  targetStatus: OrderStatus;
  reason: string;
  notes?: string;
}

export interface TransitionRule {
  from: OrderStatus[];
  to: OrderStatus;
  allowedRoles: UserRole[];
  allowedDepartments?: Department[];
  requiresPayment?: boolean;
  requiresApprovedArtwork?: boolean;
  requiresQCPass?: boolean;
}

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  // Authoritative State Transition Graph
  private readonly transitionRules: TransitionRule[] = [
    {
      from: [OrderStatus.ORDER_CREATED],
      to: OrderStatus.PAYMENT_PENDING,
      allowedRoles: [UserRole.CUSTOMER, UserRole.SALES_OFFICE, UserRole.ADMIN_MANAGER],
    },
    {
      from: [OrderStatus.PAYMENT_PENDING, OrderStatus.ORDER_CREATED],
      to: OrderStatus.PAYMENT_CONFIRMED,
      allowedRoles: [UserRole.ACCOUNTS, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.FINANCE, Department.MANAGEMENT],
    },
    // Route B: Design Team Queue
    {
      from: [OrderStatus.PAYMENT_CONFIRMED, OrderStatus.ORDER_CREATED, OrderStatus.ORDER_REVIEW, OrderStatus.ARTWORK_REVIEW],
      to: OrderStatus.DESIGN_REQUIRED,
      allowedRoles: [UserRole.SALES_OFFICE, UserRole.DESIGNER_PREPRESS, UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.SALES, Department.DESIGN_PREPRESS, Department.OPERATIONS, Department.MANAGEMENT],
    },
    // Route B: Designer Completes Design
    {
      from: [OrderStatus.DESIGN_REQUIRED],
      to: OrderStatus.ARTWORK_APPROVED,
      allowedRoles: [UserRole.DESIGNER_PREPRESS, UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.DESIGN_PREPRESS, Department.OPERATIONS, Department.MANAGEMENT],
    },
    {
      from: [OrderStatus.ORDER_REVIEW],
      to: OrderStatus.ARTWORK_REVIEW,
      allowedRoles: [UserRole.DESIGNER_PREPRESS, UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.DESIGN_PREPRESS, Department.OPERATIONS, Department.MANAGEMENT],
    },
    {
      from: [OrderStatus.ARTWORK_REVIEW, OrderStatus.DESIGN_REQUIRED, OrderStatus.ORDER_REVIEW],
      to: OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
      allowedRoles: [UserRole.DESIGNER_PREPRESS, UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.DESIGN_PREPRESS, Department.OPERATIONS, Department.MANAGEMENT],
    },
    {
      from: [OrderStatus.CUSTOMER_APPROVAL_REQUIRED, OrderStatus.ARTWORK_REVIEW],
      to: OrderStatus.ARTWORK_APPROVED,
      allowedRoles: [UserRole.CUSTOMER, UserRole.DESIGNER_PREPRESS, UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.DESIGN_PREPRESS, Department.OPERATIONS, Department.MANAGEMENT],
    },
    // OE Operational Release to Production Queue
    {
      from: [
        OrderStatus.ARTWORK_APPROVED,
        OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
        OrderStatus.ORDER_REVIEW,
        OrderStatus.ARTWORK_REVIEW,
        OrderStatus.PAYMENT_CONFIRMED,
        OrderStatus.PRE_PRODUCTION_QC, // legacy support
      ],
      to: OrderStatus.PRODUCTION_QUEUE,
      allowedRoles: [UserRole.OPERATIONAL_MANAGER, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.OPERATIONS, Department.MANAGEMENT],
      requiresPayment: true,
    },
    {
      from: [OrderStatus.PRODUCTION_QUEUE],
      to: OrderStatus.PRINTING,
      allowedRoles: [UserRole.PRODUCTION_OPERATOR, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.PRODUCTION, Department.MANAGEMENT],
    },
    {
      from: [OrderStatus.PRINTING],
      to: OrderStatus.FINISHING,
      allowedRoles: [UserRole.PRODUCTION_OPERATOR, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.PRODUCTION, Department.MANAGEMENT],
    },
    {
      from: [OrderStatus.PRINTING, OrderStatus.FINISHING],
      to: OrderStatus.QUALITY_CHECK,
      allowedRoles: [UserRole.PRODUCTION_OPERATOR, UserRole.FINAL_QC_INSPECTOR, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.PRODUCTION, Department.QUALITY_ASSURANCE, Department.MANAGEMENT],
    },
    {
      from: [OrderStatus.QUALITY_CHECK, OrderStatus.PAYMENT_PENDING],
      to: OrderStatus.PACKING,
      allowedRoles: [UserRole.FINAL_QC_INSPECTOR, UserRole.ACCOUNTS, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.QUALITY_ASSURANCE, Department.FINANCE, Department.MANAGEMENT],
      requiresQCPass: true,
      requiresPayment: true,
    },
    {
      from: [OrderStatus.PACKING],
      to: OrderStatus.READY_FOR_DISPATCH,
      allowedRoles: [UserRole.PACKING_OPERATOR, UserRole.DISPATCH_LOGISTICS, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.PACKAGING, Department.LOGISTICS, Department.MANAGEMENT],
    },
    {
      from: [OrderStatus.READY_FOR_DISPATCH],
      to: OrderStatus.OUT_FOR_DELIVERY,
      allowedRoles: [UserRole.DISPATCH_LOGISTICS, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.LOGISTICS, Department.MANAGEMENT],
    },
    {
      from: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.READY_FOR_DISPATCH],
      to: OrderStatus.DELIVERED,
      allowedRoles: [UserRole.DISPATCH_LOGISTICS, UserRole.SALES_OFFICE, UserRole.ADMIN_MANAGER],
      allowedDepartments: [Department.LOGISTICS, Department.SALES, Department.MANAGEMENT],
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async transition(dto: TransitionRequestDto, user: JwtPayload) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: {
          include: {
            artworkVersions: true,
            jobCards: true,
          },
        },
        payments: true,
        qcChecklists: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${dto.orderId}' not found`);
    }

    const currentStatus = order.status;
    const targetStatus = dto.targetStatus;

    if (currentStatus === targetStatus) {
      return order; // Idempotent no-op
    }

    // 1. Evaluate Rule existence
    const rule = this.transitionRules.find(
      (r) => r.from.includes(currentStatus) && r.to === targetStatus,
    );

    if (!rule && user.role !== UserRole.ADMIN_MANAGER) {
      throw new BadRequestException(
        `Transition from '${currentStatus}' to '${targetStatus}' is invalid and forbidden.`,
      );
    }

    // 2. Validate RBAC permissions
    if (rule && user.role !== UserRole.ADMIN_MANAGER) {
      if (!rule.allowedRoles.includes(user.role)) {
        throw new ForbiddenException(
          `User role '${user.role}' is not authorized to transition order to '${targetStatus}'.`,
        );
      }
      if (
        rule.allowedDepartments &&
        user.department &&
        !rule.allowedDepartments.includes(user.department)
      ) {
        throw new ForbiddenException(
          `User department '${user.department}' is not authorized for this operation.`,
        );
      }
    }

    // 3. Evaluate Workflow Preconditions
    if (rule?.requiresPayment) {
      const isPaidInFull =
        order.paymentStatus === 'PAID' ||
        order.paymentStatus === 'AUTHORIZED' ||
        Number(order.paidAmount) >= Number(order.totalAmount);
      const isAdvancePaid =
        order.paymentStatus === 'PARTIALLY_PAID' ||
        Number(order.paidAmount) > 0;

      const isEligible =
        targetStatus === OrderStatus.PRODUCTION_QUEUE
          ? isPaidInFull || isAdvancePaid
          : isPaidInFull;

      if (!isEligible) {
        throw new BadRequestException(
          `Cannot transition to '${targetStatus}': Order has unpaid balance (Total: ₹${order.totalAmount}, Paid: ₹${order.paidAmount}).`,
        );
      }
    }

    if (rule?.requiresApprovedArtwork) {
      const allItemsApproved = order.items.every(
        (item) => item.approvedArtworkVersionId !== null || item.designNotes === 'BYPASS_ARTWORK',
      );
      if (!allItemsApproved) {
        throw new BadRequestException(
          `Cannot transition to '${targetStatus}': All order items must have an approved artwork version.`,
        );
      }
    }

    if (rule?.requiresQCPass) {
      const finalQc = order.qcChecklists.find(
        (qc) => qc.type === 'FINAL_QC' && qc.outcome === 'PASS',
      );
      if (targetStatus === OrderStatus.PACKING && !finalQc) {
        throw new BadRequestException(
          `Cannot release to '${targetStatus}': Final QC inspection has not passed.`,
        );
      }
    }

    // 4. Atomic Execution inside Database Transaction
    const newCustomerStatus = STATUS_MAPPING[targetStatus] || CustomerVisibleStatus.IN_PRODUCTION;

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: targetStatus,
          customerStatus: newCustomerStatus,
        },
      });

      // Sequential status history record
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          changedById: user.sub,
          department: user.department,
          reason: dto.notes || `Transitioned to ${targetStatus}`,
          notes: dto.notes,
        },
      });

      return updated;
    });

    // 5. Record Audit Log
    await this.auditService.log({
      actorId: user.sub,
      actorType: 'USER',
      action: `TRANSITION_${targetStatus}`,
      entity: 'Order',
      entityId: order.id,
      orderId: order.id,
      previousState: { status: currentStatus, customerStatus: order.customerStatus },
      newState: { status: targetStatus, customerStatus: newCustomerStatus },
      reason: dto.notes,
    });

    // 6. Emit Domain Events
    this.eventEmitter.emit(`order.status.${targetStatus.toLowerCase()}`, {
      orderId: order.id,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      actorId: user.sub,
    });

    return updatedOrder;
  }

  // Manager Override with mandatory reason & audit
  async managerOverride(dto: ManagerOverrideRequestDto, user: JwtPayload) {
    if (user.role !== UserRole.ADMIN_MANAGER) {
      throw new ForbiddenException('Manager overrides require ADMIN_MANAGER role.');
    }

    if (!dto.reason || dto.reason.trim().length < 8) {
      throw new BadRequestException('Manager override requires a detailed justification (min 8 characters).');
    }

    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException(`Order '${dto.orderId}' not found`);

    const currentStatus = order.status;
    const targetStatus = dto.targetStatus;
    const newCustomerStatus = STATUS_MAPPING[targetStatus] || CustomerVisibleStatus.IN_PRODUCTION;

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: targetStatus,
          customerStatus: newCustomerStatus,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          changedById: user.sub,
          department: Department.MANAGEMENT,
          reason: `MANAGER OVERRIDE: ${dto.reason}`,
          notes: dto.notes,
        },
      });

      return updated;
    });

    await this.auditService.log({
      actorId: user.sub,
      actorType: 'USER',
      action: `MANAGER_OVERRIDE_TO_${targetStatus}`,
      entity: 'Order',
      entityId: order.id,
      orderId: order.id,
      previousState: { status: currentStatus },
      newState: { status: targetStatus },
      reason: dto.reason,
    });

    return updatedOrder;
  }

  // Pause operation with preHoldStatus preservation
  async pauseOrder(orderId: string, reason: string, user: JwtPayload) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order '${orderId}' not found`);

    if (order.status === OrderStatus.ON_HOLD) {
      return order; // Already paused
    }

    const preHold = order.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.ON_HOLD,
          customerStatus: CustomerVisibleStatus.ON_HOLD,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: preHold,
          toStatus: OrderStatus.ON_HOLD,
          changedById: user.sub,
          reason: `PAUSED: ${reason} (preHoldStatus: ${preHold})`,
        },
      });

      return res;
    });

    await this.auditService.log({
      actorId: user.sub,
      action: 'PAUSE_ORDER',
      entity: 'Order',
      entityId: orderId,
      orderId,
      previousState: { status: preHold },
      newState: { status: OrderStatus.ON_HOLD, preHoldStatus: preHold },
      reason,
    });

    return updated;
  }

  // Resume operation returning to exact preHoldStatus
  async resumeOrder(orderId: string, preHoldStatus: OrderStatus, user: JwtPayload) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order '${orderId}' not found`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.order.update({
        where: { id: orderId },
        data: {
          status: preHoldStatus,
          customerStatus: STATUS_MAPPING[preHoldStatus] || CustomerVisibleStatus.IN_PRODUCTION,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: OrderStatus.ON_HOLD,
          toStatus: preHoldStatus,
          changedById: user.sub,
          reason: `RESUMED from ON_HOLD back to ${preHoldStatus}`,
        },
      });

      return res;
    });

    await this.auditService.log({
      actorId: user.sub,
      action: 'RESUME_ORDER',
      entity: 'Order',
      entityId: orderId,
      orderId,
      previousState: { status: OrderStatus.ON_HOLD },
      newState: { status: preHoldStatus },
      reason: `Resumed back to ${preHoldStatus}`,
    });

    return updated;
  }

  /**
   * Centralized Workflow Router
   * Determines the authoritative next workflow state for Route A vs Route B
   */
  resolveInitialWorkflow(order: {
    paymentStatus?: string;
    paidAmount?: number | Prisma.Decimal;
    totalAmount?: number | Prisma.Decimal;
    items?: Array<{
      specifications?: any;
      selectedDesignService?: boolean;
    }>;
  }): OrderStatus {
    const isPaid =
      order.paymentStatus === 'PAID' ||
      order.paymentStatus === 'AUTHORIZED' ||
      order.paymentStatus === 'PARTIALLY_PAID' ||
      Number(order.paidAmount || 0) > 0;

    if (!isPaid) {
      return OrderStatus.PAYMENT_PENDING;
    }

    const firstItem = order.items?.[0];
    const specs = (firstItem?.specifications as any) || {};
    const isDesignRoute =
      specs.workflowRoute === 'DESIGN_SERVICE' ||
      specs.artworkSource === 'DESIGN_TEAM' ||
      specs.artworkSource === 'CUSTOMER_WITH_DESIGN_ASSISTANCE' ||
      Boolean(specs.selectedDesignService) ||
      Boolean(firstItem?.selectedDesignService);

    if (isDesignRoute) {
      return OrderStatus.DESIGN_REQUIRED;
    }

    return OrderStatus.ORDER_REVIEW;
  }

  /**
   * Centralized, backend-authoritative Packing eligibility evaluator.
   * Checks quality, finance, production completion, and active holds.
   */
  async evaluatePackingEligibility(
    orderId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    eligible: boolean;
    reasons: string[];
    finalQcPassed: boolean;
    paymentCleared: boolean;
    productionComplete: boolean;
    noActiveHold: boolean;
    balanceAmount: number;
  }> {
    const client = tx || this.prisma;

    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        qcChecklists: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        jobCards: { select: { id: true, status: true, currentStation: true } },
      },
    });

    if (!order) {
      return {
        eligible: false,
        reasons: ['ORDER_NOT_FOUND'],
        finalQcPassed: false,
        paymentCleared: false,
        productionComplete: false,
        noActiveHold: false,
        balanceAmount: 0,
      };
    }

    const reasons: string[] = [];

    // 1. Final QC Pass Check (actual physical inspection gate post-manufacture)
    const finalQcPass = order.qcChecklists.find(
      (qc) => qc.type === QCInspectionType.FINAL_QC && qc.outcome === QCOutcome.PASS,
    );
    const finalQcPassed = !!finalQcPass;
    if (!finalQcPassed) {
      const finalQcFail = order.qcChecklists.find(
        (qc) => qc.type === QCInspectionType.FINAL_QC && qc.outcome === QCOutcome.FAIL,
      );
      if (finalQcFail) {
        reasons.push('FINAL_QC_FAILED');
      } else {
        reasons.push('FINAL_QC_NOT_PASSED');
      }
    }

    // 2. Financial Clearance Check
    const balance = Number(order.balanceAmount);
    const isPaidInFull = balance <= 0 || order.paymentStatus === 'PAID';
    const isCorporateCredit =
      order.payments.some((p) => p.method === 'CORPORATE_CREDIT') ||
      order.customerNotes?.toLowerCase().includes('net-30') ||
      order.customerNotes?.toLowerCase().includes('credit');
    const paymentCleared = isPaidInFull || isCorporateCredit;
    if (!paymentCleared) {
      if (order.paidAmount && Number(order.paidAmount) > 0) {
        reasons.push('PAYMENT_PARTIAL');
      } else {
        reasons.push('PAYMENT_PENDING');
      }
    }

    // 3. Production Completion Check
    const hasJobCards = order.jobCards.length > 0;
    const productionComplete =
      !hasJobCards ||
      order.status === OrderStatus.PACKING ||
      order.status === OrderStatus.READY_FOR_DISPATCH ||
      order.jobCards.every(
        (jc) =>
          jc.status === JobCardStatus.PASSED ||
          jc.status === JobCardStatus.COMPLETED ||
          jc.status === JobCardStatus.QC_INSPECTION ||
          jc.currentStation === 'PACKING' ||
          jc.currentStation === 'FINAL_QC' ||
          jc.currentStation === 'FINISHING' ||
          jc.currentStation === 'DISPATCH',
      );
    if (!productionComplete) {
      reasons.push('PRODUCTION_NOT_COMPLETE');
    }

    // 4. No Active Hold
    const noActiveHold = order.status !== OrderStatus.ON_HOLD;
    if (!noActiveHold) {
      reasons.push('ACTIVE_HOLD');
    }

    const isPaymentCleared = Boolean(paymentCleared);
    const isFinalQcPassed = Boolean(finalQcPassed);
    const isComplete = Boolean(productionComplete);
    const hasNoHold = Boolean(noActiveHold);
    const isEligible = Boolean(isFinalQcPassed && isPaymentCleared && isComplete && hasNoHold);

    return {
      eligible: isEligible,
      reasons,
      finalQcPassed: isFinalQcPassed,
      paymentCleared: isPaymentCleared,
      productionComplete: isComplete,
      noActiveHold: hasNoHold,
      balanceAmount: balance,
    };
  }

  /**
   * Centralized Packing Gate Trigger.
   * Atomically evaluates eligibility and transitions order to PACKING with concurrency lock.
   */
  async triggerPackingGate(
    orderId: string,
    actorId?: string,
    sourceEvent: 'FINAL_QC_PASS' | 'PAYMENT_CLEARED' | 'MANUAL_SETTLEMENT' = 'FINAL_QC_PASS',
  ): Promise<{
    transitioned: boolean;
    newStatus: OrderStatus;
    evaluation: {
      eligible: boolean;
      reasons: string[];
      finalQcPassed: boolean;
      paymentCleared: boolean;
      balanceAmount: number;
    };
  }> {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          qcChecklists: { orderBy: { createdAt: 'desc' } },
          payments: { orderBy: { createdAt: 'desc' } },
          jobCards: true,
        },
      });

      if (!order) {
        throw new NotFoundException(`Order '${orderId}' not found`);
      }

      // Idempotency check: If already in PACKING or beyond, return no-op
      if (
        order.status === OrderStatus.PACKING ||
        order.status === OrderStatus.READY_FOR_DISPATCH ||
        order.status === OrderStatus.OUT_FOR_DELIVERY ||
        order.status === OrderStatus.DELIVERED
      ) {
        const evalResult = await this.evaluatePackingEligibility(orderId, tx);
        return { transitioned: false, newStatus: order.status, evaluation: evalResult };
      }

      const evaluation = await this.evaluatePackingEligibility(orderId, tx);

      if (evaluation.eligible) {
        const fromStatus = order.status;
        const updated = await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PACKING,
            customerStatus: CustomerVisibleStatus.QUALITY_CHECK_AND_PACKING,
          },
        });

        await tx.jobCard.updateMany({
          where: { orderId: order.id },
          data: {
            status: JobCardStatus.COMPLETED,
            currentStation: 'PACKING',
            completedAt: new Date(),
          },
        });

        const reason =
          sourceEvent === 'FINAL_QC_PASS'
            ? 'Final QC PASSED and Payment 100% Cleared. Automatically released directly to Packing Station.'
            : 'Payment 100% Cleared. Final QC already passed -> Automatically released directly to Packing Station.';

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus,
            toStatus: OrderStatus.PACKING,
            changedById: actorId,
            reason,
          },
        });

        await this.auditService.log({
          actorId,
          action: 'AUTO_RELEASED_TO_PACKING',
          entity: 'Order',
          entityId: order.id,
          orderId: order.id,
          previousState: { status: fromStatus },
          newState: { status: OrderStatus.PACKING, triggerEvent: sourceEvent },
          reason,
        });

        this.eventEmitter.emit('order.status.packing', {
          orderId: order.id,
          fromStatus,
          toStatus: OrderStatus.PACKING,
          actorId,
          triggerEvent: sourceEvent,
        });

        return { transitioned: true, newStatus: OrderStatus.PACKING, evaluation };
      } else {
        if (evaluation.finalQcPassed && !evaluation.paymentCleared && order.status !== OrderStatus.ON_HOLD) {
          if (order.status !== OrderStatus.PAYMENT_PENDING) {
            const fromStatus = order.status;
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: OrderStatus.PAYMENT_PENDING,
                customerStatus: CustomerVisibleStatus.PAYMENT_PENDING,
              },
            });

            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                fromStatus,
                toStatus: OrderStatus.PAYMENT_PENDING,
                changedById: actorId,
                reason: `Final QC PASSED. Outstanding Balance: ₹${evaluation.balanceAmount.toFixed(2)}. Blocked from Packing awaiting payment clearance.`,
              },
            });

            await this.auditService.log({
              actorId,
              action: 'PAYMENT_GATE_BLOCKED',
              entity: 'Order',
              entityId: order.id,
              orderId: order.id,
              previousState: { status: fromStatus },
              newState: { status: OrderStatus.PAYMENT_PENDING, balance: evaluation.balanceAmount },
              reason: 'Packing blocked awaiting payment clearance',
            });
          }
        }

        return { transitioned: false, newStatus: order.status, evaluation };
      }
    });
  }
}
