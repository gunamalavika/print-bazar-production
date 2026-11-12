import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobCardEngineService } from '../job-cards/job-card-engine.service';
import {
  QCInspectionType,
  QCOutcome,
  DefectCategory,
  OrderStatus,
  JobCardStatus,
  Prisma,
} from '@prisma/client';

export interface QCCheckItem {
  code: string;
  name: string;
  result: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
  notes?: string;
}

export interface SubmitQCDto {
  orderId: string;
  jobCardId?: string;
  type: QCInspectionType;
  items: QCCheckItem[];
  defects?: DefectCategory[];
  generalNotes?: string;
}

import { WorkflowStateService } from '../workflow/workflow-state.service';

@Injectable()
export class QualityControlService {
  private readonly logger = new Logger(QualityControlService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly jobCardEngine: JobCardEngineService,
    private readonly workflowState: WorkflowStateService,
  ) {}

  /**
   * Submit Final QC Physical Inspection (FINAL_QC only)
   */
  async submitInspection(dto: SubmitQCDto, inspectorId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${dto.orderId}' not found`);
    }

    // Determine overall outcome: If ANY item fails, overall outcome is FAIL
    const hasFailure = dto.items.some((item) => item.result === 'FAIL');
    const outcome: QCOutcome = hasFailure ? QCOutcome.FAIL : QCOutcome.PASS;
    const inspectionType = QCInspectionType.FINAL_QC;

    // Normalize defect codes to valid Prisma DefectCategory enum values
    const validDefectCategories = new Set<string>(Object.values(DefectCategory));
    const mapToDefectCategory = (raw: string): DefectCategory => {
      const upper = String(raw || '').toUpperCase().trim();
      if (validDefectCategories.has(upper)) {
        return upper as DefectCategory;
      }
      if (upper.includes('COLOR') || upper.includes('RGB') || upper.includes('DELTA')) {
        return DefectCategory.COLOR_MISMATCH;
      }
      if (upper.includes('CUT') || upper.includes('TRIM') || upper.includes('BLEED') || upper.includes('DIMENSION')) {
        return DefectCategory.BLEED_CUTTING_FAULT;
      }
      if (upper.includes('LAMINAT') || upper.includes('BUBBLE')) {
        return DefectCategory.LAMINATION_BUBBLE;
      }
      if (upper.includes('STREAK') || upper.includes('SMUDGE') || upper.includes('SCRATCH')) {
        return DefectCategory.PRINT_STREAKS;
      }
      if (upper.includes('REGISTRAT') || upper.includes('ALIGN') || upper.includes('FOLD')) {
        return DefectCategory.REGISTRATION_ERROR;
      }
      if (upper.includes('COUNT') || upper.includes('QTY') || upper.includes('QUANTITY')) {
        return DefectCategory.QUANTITY_SHORT;
      }
      if (upper.includes('PAPER') || upper.includes('STOCK') || upper.includes('GSM')) {
        return DefectCategory.WRONG_PAPER_STOCK;
      }
      if (upper.includes('FILE') || upper.includes('RESOLUTION') || upper.includes('DPI')) {
        return DefectCategory.CUSTOMER_FILE_ERROR;
      }
      if (upper.includes('DAMAGE') || upper.includes('EDGE')) {
        return DefectCategory.DAMAGED_EDGES;
      }
      return DefectCategory.OTHER;
    };

    const normalizedDefects: DefectCategory[] = Array.isArray(dto.defects)
      ? Array.from(new Set(dto.defects.map(mapToDefectCategory)))
      : outcome === QCOutcome.FAIL
      ? [ mapToDefectCategory(dto.generalNotes || 'OTHER') ]
      : [];

    // 1. Create QC checklist record atomically
    const checklist = await this.prisma.$transaction(async (tx) => {
      const created = await tx.qCChecklist.create({
        data: {
          orderId: order.id,
          jobCardId: dto.jobCardId,
          type: inspectionType,
          outcome,
          inspectorId,
          items: dto.items as unknown as Prisma.InputJsonValue,
          defects: normalizedDefects,
          notes: dto.generalNotes,
        },
      });

      // Handle Final QC Outcomes: Quality Gate -> Payment Clearance Gate -> Packing / Finance
      if (outcome === QCOutcome.PASS) {
        const balance = Number(order.balanceAmount);
        const isPaidInFull = balance <= 0 || order.paymentStatus === 'PAID';
        const isCorporateCredit =
          order.payments.some((p) => p.method === 'CORPORATE_CREDIT') ||
          order.customerNotes?.toLowerCase().includes('net-30') ||
          order.customerNotes?.toLowerCase().includes('credit');
        const isFinanciallyCleared = isPaidInFull || isCorporateCredit;

        if (isFinanciallyCleared) {
          // Case A: 100% Paid / Approved Credit -> AUTOMATIC WORKFLOW TRANSITION TO PACKING
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.PACKING,
              customerStatus: 'QUALITY_CHECK_AND_PACKING',
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: OrderStatus.PACKING,
              changedById: inspectorId,
              reason: 'Final QC PASSED (100% Paid / Approved Credit). Automatically released directly to Packing Station.',
            },
          });

          // Update all job cards of this order to COMPLETED / PACKING
          await tx.jobCard.updateMany({
            where: { orderId: order.id },
            data: {
              status: JobCardStatus.COMPLETED,
              currentStation: 'PACKING',
              completedAt: new Date(),
            },
          });
        } else {
          // Case B: Payment Pending -> ROUTE TO FINANCE / PAYMENTS QUEUE (PACKING BLOCKED)
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.PAYMENT_PENDING,
              customerStatus: 'PAYMENT_PENDING',
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: OrderStatus.PAYMENT_PENDING,
              changedById: inspectorId,
              reason: `Final QC PASSED. Outstanding Balance: ₹${balance.toFixed(2)}. Transferred to Finance/Payments queue (Packing Blocked until settled).`,
            },
          });

          await tx.jobCard.updateMany({
            where: { orderId: order.id },
            data: {
              status: JobCardStatus.PASSED,
              currentStation: 'FINISHING',
              completedAt: new Date(),
            },
          });
        }
      } else {
        // Final QC FAIL: Create Rework Path, Block Packing
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.ON_HOLD,
            customerStatus: 'ON_HOLD',
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.ON_HOLD,
            changedById: inspectorId,
            reason: `Final QC REJECTED: Defects [${dto.defects?.join(', ')}]. Rework required.`,
          },
        });

        if (dto.jobCardId) {
          await tx.jobCard.update({
            where: { id: dto.jobCardId },
            data: {
              status: JobCardStatus.FAILED_REWORK,
              currentStation: 'REWORK',
            },
          });

          // Create structured JobIssue
          await tx.jobIssue.create({
            data: {
              jobCardId: dto.jobCardId,
              reasonCode: dto.defects?.[0] || 'FINAL_QC_DEFECT',
              description: dto.generalNotes || 'Defect detected in Final QC inspection',
              reportedBy: inspectorId,
            },
          });
        }
      }

      return created;
    });

    // 2. Audit Trail
    await this.auditService.log({
      actorId: inspectorId,
      actorType: 'USER',
      action: `QC_INSPECTION_FINAL_QC_${outcome}`,
      entity: 'QCChecklist',
      entityId: checklist.id,
      orderId: order.id,
      newState: { outcome, defects: dto.defects },
      reason: dto.generalNotes,
    });

    // 3. Emit Events
    this.eventEmitter.emit(`qc.final_qc.${outcome.toLowerCase()}`, {
      orderId: order.id,
      jobCardId: dto.jobCardId,
      checklistId: checklist.id,
      inspectorId,
    });

    return checklist;
  }

  async getChecklistsForOrder(orderId: string) {
    return this.prisma.qCChecklist.findMany({
      where: { orderId },
      include: {
        inspector: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all orders waiting or passed in Final QC queue
   */
  async getFinalQCQueue(search?: string) {
    const where: Prisma.OrderWhereInput = {
      OR: [
        {
          status: {
            in: [
              OrderStatus.QUALITY_CHECK,
              OrderStatus.PACKING,
              OrderStatus.READY_FOR_DISPATCH,
              OrderStatus.OUT_FOR_DELIVERY,
              OrderStatus.DELIVERED,
              OrderStatus.ON_HOLD,
            ],
          },
        },
        {
          qcChecklists: {
            some: {
              type: 'FINAL_QC',
              outcome: 'PASS',
            },
          },
        },
        {
          jobCards: {
            some: {
              currentStation: 'PACKING',
            },
          },
        },
      ],
      ...(search
        ? {
            AND: [
              {
                OR: [
                  { orderNumber: { contains: search, mode: 'insensitive' } },
                  { customer: { fullName: { contains: search, mode: 'insensitive' } } },
                ],
              },
            ],
          }
        : {}),
    };

    return this.prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true, email: true, phone: true } },
        items: {
          include: {
            artworkVersions: { orderBy: { versionNumber: 'desc' } },
          },
        },
        jobCards: true,
        qcChecklists: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Standard Final Physical QC Checklist Template (8 Mandatory Quality Gates)
   */
  getFinalQCTemplate(): QCCheckItem[] {
    return [
      { code: 'CORRECT_PRODUCT', name: 'Correct product', result: 'PASS' },
      { code: 'CORRECT_SIZE', name: 'Correct size', result: 'PASS' },
      { code: 'CORRECT_COLOR', name: 'Correct color', result: 'PASS' },
      { code: 'CORRECT_QUANTITY', name: 'Correct quantity', result: 'PASS' },
      { code: 'PRINTING_QUALITY', name: 'Printing Quality', result: 'PASS' },
      { code: 'FINISHING_QUALITY', name: 'Finishing quality', result: 'PASS' },
      { code: 'NO_DAMAGES', name: 'No damages', result: 'PASS' },
      { code: 'NO_SCRATCHES', name: 'No scratches', result: 'PASS' },
    ];
  }
}
