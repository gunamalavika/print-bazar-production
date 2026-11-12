import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Priority, JobCardStatus, AssignmentTaskType, AssignmentStatus, OrderStatus, UserRole } from '@prisma/client';
import { JwtPayload } from '../../common/types/roles';

@Injectable()
export class JobCardEngineService {
  private readonly logger = new Logger(JobCardEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Automatically generate a production Job Card for an Order Item upon passing QC & Payment
   */
  async generateJobCardForOrderItem(orderItemId: string, actorId?: string, targetOperatorId?: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          include: {
            customer: true,
            shippingAddress: true,
            qcChecklists: true,
          },
        },
        product: {
          include: {
            category: true,
          },
        },
        artworkVersions: true,
        jobCards: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`OrderItem '${orderItemId}' not found`);
    }

    // 1. Prevent Duplicates: If active Job Card already exists for this item
    const existingJob = item.jobCards.find((j) => j.status !== JobCardStatus.COMPLETED);
    if (existingJob) {
      this.logger.log(`Job Card '${existingJob.jobNumber}' already exists for OrderItem '${orderItemId}'.`);
      return existingJob;
    }

    // 2. Validate Payment Gate (Full Payment, Authorized, Advance Split Milestone, or Production Queue Release)
    const order = item.order;
    const isPaid =
      order.paymentStatus === 'PAID' ||
      order.paymentStatus === 'AUTHORIZED' ||
      order.paymentStatus === 'PARTIALLY_PAID' ||
      order.status === OrderStatus.PRODUCTION_QUEUE ||
      order.status === OrderStatus.PRINTING ||
      Number(order.paidAmount) > 0;

    if (!isPaid) {
      throw new BadRequestException(
        `Job Card creation blocked: Order '${order.orderNumber}' has no verified payment or advance deposit.`,
      );
    }

    // 3. Resolve Approved Artwork Version
    let approvedArtworkId = item.approvedArtworkVersionId;
    if (!approvedArtworkId) {
      const approvedVersion = item.artworkVersions.find((v) => v.isApproved);
      if (approvedVersion) {
        approvedArtworkId = approvedVersion.id;
      }
    }

    // 4. Resolve Production Route & Operation Sequence
    const categorySlug = item.product?.category?.slug || '';
    const operationSequence = this.resolveProductionRoute(categorySlug, item.specifications);

    // 5. Calculate SLA due date
    const turnaroundDays = item.product?.productionDays || 2;
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + turnaroundDays);

    // 6. Generate Unique Job Number: JC-YYYYMMDD-XXXX
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.jobCard.count();
    const jobNumber = `JC-${datePrefix}-${String(count + 1).padStart(4, '0')}`;

    // 7. Atomic Creation
    const jobCard = await this.prisma.$transaction(async (tx) => {
      // Find operator if active assignment exists or targetOperatorId
      let assignedOperatorId: string | null = targetOperatorId || null;
      if (!assignedOperatorId) {
        const prodAssignment = await tx.orderAssignment.findFirst({
          where: { orderId: order.id, taskType: AssignmentTaskType.PRODUCTION, status: AssignmentStatus.ACTIVE },
        });
        if (prodAssignment) {
          assignedOperatorId = prodAssignment.assignedUserId;
        } else {
          const defaultOp = await tx.user.findFirst({
            where: { role: UserRole.PRODUCTION_OPERATOR, isActive: true },
            orderBy: { createdAt: 'asc' },
          });
          assignedOperatorId = defaultOp?.id || null;
        }
      }

      const created = await tx.jobCard.create({
        data: {
          jobNumber,
          orderId: order.id,
          orderItemId: item.id,
          approvedArtworkVersionId: approvedArtworkId,
          operatorId: assignedOperatorId,
          status: JobCardStatus.QUEUED,
          priority: order.priority,
          currentStation: operationSequence[0]?.station || 'PRINTING',
          operationSequence,
          technicalSpecs: {
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            specifications: item.specifications,
            customerName: order.customer?.fullName || 'Valued Customer',
            customerCompany: order.customer?.companyName || null,
          },
          dueAt,
        },
      });

      // Link order item to approved artwork if not set
      if (approvedArtworkId && !item.approvedArtworkVersionId) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: { approvedArtworkVersionId: approvedArtworkId },
        });
      }

      // Create SLA tracking record
      await tx.slaRecord.create({
        data: {
          orderId: order.id,
          jobCardId: created.id,
          entityType: 'JOB_CARD',
          targetDueAt: dueAt,
        },
      });

      return created;
    });

    // 8. Audit & Events
    await this.auditService.log({
      actorId,
      actorType: actorId ? 'USER' : 'SYSTEM',
      action: 'AUTOMATIC_JOB_CARD_CREATED',
      entity: 'JobCard',
      entityId: jobCard.id,
      orderId: order.id,
      newState: { jobNumber, status: jobCard.status, currentStation: jobCard.currentStation },
      reason: `Automated Job Card generation for Order ${order.orderNumber}`,
    });

    this.eventEmitter.emit('jobcard.created', {
      jobCardId: jobCard.id,
      jobNumber: jobCard.jobNumber,
      orderId: order.id,
    });

    return jobCard;
  }

  /**
   * Deterministic production route resolution
   */
  private resolveProductionRoute(categorySlug: string = '', specs: unknown) {
    const slug = (categorySlug || '').toLowerCase();
    const defaultRoute = [
      { step: 1, station: 'PREPRESS', action: 'Digital Preflight & RIP', status: 'COMPLETED' },
      { step: 2, station: 'PRINTING', action: 'HP Indigo 12000 4-Color Print', status: 'PENDING' },
      { step: 3, station: 'FINISHING', action: 'Thermal Matt Lamination & Die Cut', status: 'PENDING' },
      { step: 4, station: 'FINAL_QC', action: 'Physical Defect & Alignment Inspection', status: 'PENDING' },
      { step: 5, station: 'PACKING', action: 'Protective Film Wrapping & Boxing', status: 'PENDING' },
    ];

    if (slug.includes('apparel') || slug.includes('t-shirt')) {
      return [
        { step: 1, station: 'PREPRESS', action: 'Color Separation & Film RIP', status: 'COMPLETED' },
        { step: 2, station: 'PRINTING', action: 'DTF / Screen Print Station', status: 'PENDING' },
        { step: 3, station: 'FINISHING', action: 'Heat Press Curing', status: 'PENDING' },
        { step: 4, station: 'FINAL_QC', action: 'Fabric Pull & Wash Fastness QC', status: 'PENDING' },
        { step: 5, station: 'PACKING', action: 'Individual Polybag & Barcode Tagging', status: 'PENDING' },
      ];
    }

    if (slug.includes('signage') || slug.includes('banner')) {
      return [
        { step: 1, station: 'PREPRESS', action: 'Tiling & Grommet Alignment', status: 'COMPLETED' },
        { step: 2, station: 'PRINTING', action: 'Wide Format UV Roll-to-Roll', status: 'PENDING' },
        { step: 3, station: 'FINISHING', action: 'Edge Hemming & Brass Eyelets', status: 'PENDING' },
        { step: 4, station: 'FINAL_QC', action: 'Seam & Eyelet Pull Test', status: 'PENDING' },
        { step: 5, station: 'PACKING', action: 'Corrugated Tube Roll Packing', status: 'PENDING' },
      ];
    }

    return defaultRoute;
  }

  async listJobCards(params?: { status?: JobCardStatus; station?: string; user?: JwtPayload }) {
    const isOperator = params?.user?.role === 'PRODUCTION_OPERATOR';
    return this.prisma.jobCard.findMany({
      where: {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.station ? { currentStation: params.station } : {}),
        ...(isOperator && params?.user ? { operatorId: params.user.sub } : {}),
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            priority: true,
            status: true,
            customer: { select: { fullName: true, companyName: true, phone: true } },
          },
        },
        machine: true,
        operator: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
    });
  }

  async claimJobCard(jobCardId: string, operatorId: string) {
    const job = await this.prisma.jobCard.findUnique({ where: { id: jobCardId } });
    if (!job) throw new NotFoundException(`JobCard '${jobCardId}' not found`);

    if (job.operatorId && job.operatorId !== operatorId) {
      throw new ForbiddenException(`JobCard '${job.jobNumber}' is already assigned to another operator.`);
    }

    return this.prisma.jobCard.update({
      where: { id: jobCardId },
      data: {
        operatorId,
        status: JobCardStatus.ASSIGNED,
      },
    });
  }

  async assignMachine(jobCardId: string, machineId: string) {
    return this.prisma.jobCard.update({
      where: { id: jobCardId },
      data: { machineId },
    });
  }

  async startJob(jobCardId: string, user: JwtPayload | string) {
    const userId = typeof user === 'string' ? user : user.sub;
    const isOperator = typeof user !== 'string' && user.role === 'PRODUCTION_OPERATOR';

    const job = await this.prisma.jobCard.findUnique({ where: { id: jobCardId } });
    if (!job) throw new NotFoundException(`JobCard '${jobCardId}' not found`);

    if (isOperator && job.operatorId && job.operatorId !== userId) {
      throw new ForbiddenException(`Forbidden: JobCard is assigned to a different operator`);
    }

    return this.prisma.jobCard.update({
      where: { id: jobCardId },
      data: {
        status: JobCardStatus.PRINTING,
        startedAt: new Date(),
        operatorId: job.operatorId || userId,
      },
    });
  }

  async completeStation(jobCardId: string, nextStation: string, user?: JwtPayload) {
    const job = await this.prisma.jobCard.findUnique({
      where: { id: jobCardId },
      include: { order: true },
    });
    if (!job) throw new NotFoundException(`JobCard '${jobCardId}' not found`);

    if (user?.role === 'PRODUCTION_OPERATOR' && job.operatorId && job.operatorId !== user.sub) {
      throw new ForbiddenException(`Forbidden: JobCard belongs to another operator`);
    }

    const updated = await this.prisma.jobCard.update({
      where: { id: jobCardId },
      data: {
        currentStation: nextStation,
        status: nextStation === 'FINAL_QC' ? JobCardStatus.QC_INSPECTION : JobCardStatus.PRINTING_COMPLETED,
      },
    });

    if (nextStation === 'FINAL_QC' || nextStation === 'PACKING') {
      await this.prisma.orderAssignment.updateMany({
        where: {
          orderId: job.orderId,
          taskType: AssignmentTaskType.PRODUCTION,
          status: AssignmentStatus.ACTIVE,
        },
        data: {
          status: AssignmentStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }

    return updated;
  }

  async getJobCardById(id: string) {
    const job = await this.prisma.jobCard.findFirst({
      where: {
        OR: [{ id }, { jobNumber: id }],
      },
      include: {
        order: {
          include: {
            customer: true,
            shippingAddress: true,
            qcChecklists: true,
            items: true,
          },
        },
        orderItem: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
            artworkVersions: {
              orderBy: { versionNumber: 'desc' },
            },
          },
        },
        machine: true,
        operator: true,
        issues: {
          where: { isResolved: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`JobCard '${id}' not found`);
    }

    return job;
  }
}
