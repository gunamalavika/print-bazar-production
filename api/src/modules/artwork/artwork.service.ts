import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ArtworkStatus,
  OrderStatus,
  AssignmentTaskType,
  AssignmentStatus,
  UserRole,
} from '@prisma/client';
import { JwtPayload } from '../../common/types/roles';
import * as crypto from 'crypto';
import { extractDimensionsFromFile, extractImageDimensions } from '../../common/utils/image-dimensions.util';

export interface RegisterArtworkDto {
  orderItemId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  resolutionDpi?: number;
  widthMm?: number;
  heightMm?: number;
  hasBleed?: boolean;
  colorProfile?: string;
  notes?: string;
}

export interface ApproveProofDto {
  orderItemId: string;
  artworkVersionId: string;
  customerNotes?: string;
  ipAddress?: string;
}

export interface RequestRevisionDto {
  orderItemId: string;
  artworkVersionId?: string;
  revisionFeedback?: string;
  reason?: string;
  customerNotes?: string;
}

@Injectable()
export class ArtworkService {
  private readonly logger = new Logger(ArtworkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Upload / Register new artwork version (e.g. v1, v2, v3...)
   * Guaranteed immutable versioning
   */
  async registerArtworkVersion(dto: RegisterArtworkDto, uploaderId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: dto.orderItemId },
      include: { order: true, artworkVersions: true },
    });

    if (!item) throw new NotFoundException(`OrderItem '${dto.orderItemId}' not found`);

    // Determine next sequential version number
    const nextVersion = item.artworkVersions.length + 1;
    const checksum = crypto
      .createHash('sha256')
      .update(`${dto.storageKey}-${dto.originalFileName}-${Date.now()}`)
      .digest('hex');

    const artwork = await this.prisma.$transaction(async (tx) => {
      // Mark previous unapproved versions as superseded
      await tx.artworkVersion.updateMany({
        where: { orderItemId: item.id, isApproved: false },
        data: { status: ArtworkStatus.SUPERSEDED },
      });

      const created = await tx.artworkVersion.create({
        data: {
          orderItemId: item.id,
          versionNumber: nextVersion,
          storageKey: dto.storageKey,
          originalFileName: dto.originalFileName,
          mimeType: dto.mimeType,
          fileSize: dto.fileSize,
          checksum,
          resolutionDpi: dto.resolutionDpi || 300,
          widthMm: dto.widthMm,
          heightMm: dto.heightMm,
          hasBleed: dto.hasBleed ?? true,
          colorProfile: dto.colorProfile || 'CMYK',
          proofUrl: `/api/v1/artwork/proof/${item.id}/v${nextVersion}`,
          status: ArtworkStatus.PENDING_REVIEW,
          uploadedBy: uploaderId,
          customerNotes: dto.notes,
        },
      });

      // Update Order Status to ARTWORK_REVIEW if in ORDER_REVIEW
      if (item.order.status === OrderStatus.ORDER_REVIEW || item.order.status === OrderStatus.ORDER_CREATED) {
        await tx.order.update({
          where: { id: item.order.id },
          data: {
            status: OrderStatus.ARTWORK_REVIEW,
            customerStatus: 'ARTWORK_BEING_CHECKED',
          },
        });
      }

      return created;
    });

    await this.auditService.log({
      actorId: uploaderId,
      action: 'UPLOAD_ARTWORK_VERSION',
      entity: 'ArtworkVersion',
      entityId: artwork.id,
      orderId: item.order.id,
      newState: { versionNumber: nextVersion, fileName: dto.originalFileName },
      reason: `Uploaded artwork v${nextVersion}`,
    });

    this.eventEmitter.emit('artwork.uploaded', {
      orderItemId: item.id,
      versionNumber: nextVersion,
      artworkId: artwork.id,
    });

    return artwork;
  }

  /**
   * Designer uploads customer proof and requests customer sign-off
   */
  async submitForCustomerApproval(artworkVersionId: string, prepressNotes: string, user: JwtPayload | string) {
    const userId = typeof user === 'string' ? user : user.sub;
    const userRole = typeof user === 'string' ? null : user.role;

    const artwork = await this.prisma.artworkVersion.findUnique({
      where: { id: artworkVersionId },
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                assignments: {
                  where: { taskType: AssignmentTaskType.DESIGN, status: AssignmentStatus.ACTIVE },
                },
              },
            },
          },
        },
      },
    });

    if (!artwork) throw new NotFoundException('Artwork version not found');

    const order = artwork.orderItem.order;

    // Security check: individual ownership verification
    if (userRole === UserRole.DESIGNER_PREPRESS) {
      const isAssigned = order.assignments.some((a) => a.assignedUserId === userId);
      if (!isAssigned && order.assignments.length > 0) {
        throw new ForbiddenException('You cannot submit proofs for a design task assigned to another designer.');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const art = await tx.artworkVersion.update({
        where: { id: artworkVersionId },
        data: {
          status: ArtworkStatus.PROOF_GENERATED,
          prepressNotes,
        },
      });

      // Transition order to CUSTOMER_APPROVAL_REQUIRED
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
          customerStatus: 'APPROVAL_REQUIRED',
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
          changedById: userId,
          reason: 'Prepress proof generated. Awaiting customer digital approval sign-off.',
        },
      });

      return art;
    });

    await this.auditService.log({
      actorId: userId,
      action: 'SUBMIT_FOR_CUSTOMER_APPROVAL',
      entity: 'ArtworkVersion',
      entityId: artwork.id,
      orderId: order.id,
      reason: prepressNotes,
    });

    this.eventEmitter.emit('proof.ready', {
      orderId: order.id,
      orderItemId: artwork.orderItemId,
      artworkVersionId: artwork.id,
    });

    return updated;
  }

  /**
   * Customer explicit sign-off on digital proof
   * Atomic lock to approvedArtworkVersionId and transition to ARTWORK_APPROVED (returns to OE queue)
   */
  async approveProof(dto: ApproveProofDto, customerId: string) {
    const artwork = await this.prisma.artworkVersion.findUnique({
      where: { id: dto.artworkVersionId },
      include: { orderItem: { include: { order: true } } },
    });

    if (!artwork) throw new NotFoundException('Artwork version not found');

    const orderItem = artwork.orderItem;
    const order = orderItem.order;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark this exact version as APPROVED
      const approvedArt = await tx.artworkVersion.update({
        where: { id: dto.artworkVersionId },
        data: {
          status: ArtworkStatus.PROOF_APPROVED,
          isApproved: true,
          approvedAt: new Date(),
          customerNotes: dto.customerNotes || 'Approved by customer',
        },
      });

      // 2. Lock approvedArtworkVersionId onto OrderItem
      await tx.orderItem.update({
        where: { id: orderItem.id },
        data: {
          approvedArtworkVersionId: dto.artworkVersionId,
        },
      });

      // 3. Move Order to ARTWORK_APPROVED (Ready for OE Operational Review & Production Release)
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.ARTWORK_APPROVED,
          customerStatus: 'PREPARING_ORDER',
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.ARTWORK_APPROVED,
          changedById: customerId,
          reason: 'Customer approved digital proof. Queued for OE Operational Readiness Review.',
        },
      });

      return approvedArt;
    });

    await this.auditService.log({
      actorId: customerId,
      action: 'PROOF_APPROVED_BY_CUSTOMER',
      entity: 'OrderItem',
      entityId: orderItem.id,
      orderId: order.id,
      ipAddress: dto.ipAddress,
      newState: { approvedArtworkVersionId: dto.artworkVersionId },
      reason: 'Digital proof sign-off: "I approve spelling, design, and layout."',
    });

    this.eventEmitter.emit('proof.approved', {
      orderId: order.id,
      orderItemId: orderItem.id,
      artworkVersionId: dto.artworkVersionId,
    });

    return result;
  }

  /**
   * Customer requests design revision
   */
  async requestRevision(dto: RequestRevisionDto, customerId: string) {
    const feedback = dto.revisionFeedback || dto.reason || dto.customerNotes || 'Artwork revision / preflight defect flagged';
    let artwork = dto.artworkVersionId
      ? await this.prisma.artworkVersion.findUnique({
          where: { id: dto.artworkVersionId },
          include: { orderItem: { include: { order: true } } },
        })
      : null;

    if (!artwork && dto.orderItemId) {
      artwork = await this.prisma.artworkVersion.findFirst({
        where: { orderItemId: dto.orderItemId },
        orderBy: { versionNumber: 'desc' },
        include: { orderItem: { include: { order: true } } },
      });
    }

    if (!artwork && dto.orderItemId) {
      const item = await this.prisma.orderItem.findUnique({
        where: { id: dto.orderItemId },
        include: { order: true },
      });
      if (item) {
        artwork = await this.prisma.artworkVersion.create({
          data: {
            orderItemId: item.id,
            versionNumber: 1,
            storageKey: `artwork/initial_${item.id}`,
            originalFileName: 'customer_artwork.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
            checksum: crypto.createHash('sha256').update(`${item.id}-${Date.now()}`).digest('hex'),
            status: ArtworkStatus.PREFLIGHT_FAILED,
            uploadedBy: customerId || 'STAFF',
          },
          include: { orderItem: { include: { order: true } } },
        });
      }
    }

    if (!artwork) throw new NotFoundException('Artwork version or order item not found');

    const order = artwork.orderItem.order;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.artworkVersion.update({
        where: { id: artwork.id },
        data: {
          status: ArtworkStatus.PROOF_REJECTED,
          customerNotes: feedback,
        },
      });

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
          changedById: customerId,
          reason: `Customer/Prepress defect flagged: ${feedback}`,
        },
      });

      return true;
    });

    await this.auditService.log({
      actorId: customerId,
      action: 'PROOF_REVISION_REQUESTED',
      entity: 'ArtworkVersion',
      entityId: artwork.id,
      orderId: order.id,
      reason: feedback,
    });

    return result;
  }

  async getVersionsForItem(orderItemId: string) {
    return this.prisma.artworkVersion.findMany({
      where: { orderItemId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  /**
   * Process customer uploaded artwork file, extract dimensions, calculate megapixels, and check quality threshold.
   */
  async processArtworkUpload(
    file: Express.Multer.File,
    productId?: string,
    customMinMegapixels?: number,
  ) {
    let requiredMegapixels = customMinMegapixels !== undefined ? customMinMegapixels : 1.0;
    let qualityVerificationEnabled = true;

    if (productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (product) {
        qualityVerificationEnabled = product.artworkQualityVerification;
        if (product.minimumArtworkMegapixels !== null && product.minimumArtworkMegapixels !== undefined) {
          requiredMegapixels = Number(product.minimumArtworkMegapixels);
        }
      }
    }

    // Extract exact physical image dimensions from buffer / disk
    let dimensions = file.buffer ? extractImageDimensions(file.buffer) : null;
    if (!dimensions && file.path) {
      dimensions = extractDimensionsFromFile(file.path);
    }

    const width = dimensions?.width ?? null;
    const height = dimensions?.height ?? null;
    const actualMegapixels = dimensions?.megapixels ?? null;

    let qualityStatus: 'PASSED' | 'WARNING' | 'NOT_APPLICABLE' = 'PASSED';
    let warningMessage: string | null = null;

    if (qualityVerificationEnabled && actualMegapixels !== null) {
      if (actualMegapixels < requiredMegapixels) {
        qualityStatus = 'WARNING';
        warningMessage = `Artwork quality is below the recommended minimum. Required: ${requiredMegapixels} MP, Detected: ${actualMegapixels} MP.`;
      } else {
        qualityStatus = 'PASSED';
      }
    }

    const filename = file.filename || file.originalname;
    const fileUrl = `/uploads/artwork/${filename}`;
    const storageKey = `artwork/${filename}`;

    return {
      fileUrl,
      storageKey,
      originalFileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      width,
      height,
      actualMegapixels,
      requiredMegapixels,
      qualityVerificationEnabled,
      qualityStatus,
      warningMessage,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Process customer reference image upload
   */
  async processReferenceImageUpload(file: Express.Multer.File) {
    const filename = file.filename || file.originalname;
    return {
      fileUrl: `/uploads/references/${filename}`,
      storageKey: `references/${filename}`,
      originalFileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Design Queue: Fetch orders waiting in DESIGN_REQUIRED or needing design preparation,
   * OR orders that have completed design and have been passed to production.
   * If called by a DESIGNER_PREPRESS and scope === 'mine', filters to tasks assigned to or completed by the designer.
   * If scope === 'all', returns operational studio view across all orders.
   */
  async getDesignQueue(
    search?: string,
    user?: JwtPayload,
    tab: 'active' | 'passed' | 'all' = 'all',
    scope: 'mine' | 'all' = 'mine',
  ) {
    // Strict individual ownership:
    // A DESIGNER_PREPRESS MUST ONLY see tasks assigned to them and designs that THEY completed/passed!
    const isDesignerRole = user?.role === UserRole.DESIGNER_PREPRESS;
    const isDesignerOnly = isDesignerRole || scope === 'mine';

    let statusCondition: any;
    if (tab === 'active') {
      statusCondition = {
        status: {
          in: [
            OrderStatus.DESIGN_REQUIRED,
            OrderStatus.ARTWORK_REVIEW,
            OrderStatus.ORDER_REVIEW,
            OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
          ],
        },
        ...(isDesignerOnly && user?.sub
          ? {
              assignments: {
                some: {
                  assignedUserId: user.sub,
                  taskType: AssignmentTaskType.DESIGN,
                  status: AssignmentStatus.ACTIVE,
                },
              },
            }
          : {}),
      };
    } else if (tab === 'passed') {
      statusCondition = {
        OR: [
          {
            assignments: {
              some: {
                taskType: AssignmentTaskType.DESIGN,
                status: AssignmentStatus.COMPLETED,
                ...(isDesignerOnly && user?.sub ? { assignedUserId: user.sub } : {}),
              },
            },
          },
          {
            status: {
              in: [
                OrderStatus.ARTWORK_APPROVED,
                OrderStatus.PRE_PRODUCTION_QC,
                OrderStatus.PRODUCTION_QUEUE,
                OrderStatus.PRINTING,
                OrderStatus.FINISHING,
                OrderStatus.QUALITY_CHECK,
                OrderStatus.PACKING,
                OrderStatus.READY_FOR_DISPATCH,
                OrderStatus.OUT_FOR_DELIVERY,
                OrderStatus.DELIVERED,
              ],
            },
            assignments: {
              some: {
                taskType: AssignmentTaskType.DESIGN,
                status: AssignmentStatus.COMPLETED,
                ...(isDesignerOnly && user?.sub ? { assignedUserId: user.sub } : {}),
              },
            },
          },
        ],
      };
    } else {
      // tab === 'all'
      statusCondition = {
        OR: [
          // 1. Active design jobs
          {
            status: {
              in: [
                OrderStatus.DESIGN_REQUIRED,
                OrderStatus.ARTWORK_REVIEW,
                OrderStatus.ORDER_REVIEW,
                OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
              ],
            },
            ...(isDesignerOnly && user?.sub
              ? {
                  assignments: {
                    some: {
                      assignedUserId: user.sub,
                      taskType: AssignmentTaskType.DESIGN,
                      status: AssignmentStatus.ACTIVE,
                    },
                  },
                }
              : {}),
          },
          // 2. Completed design assignments
          {
            assignments: {
              some: {
                taskType: AssignmentTaskType.DESIGN,
                status: AssignmentStatus.COMPLETED,
                ...(isDesignerOnly && user?.sub ? { assignedUserId: user.sub } : {}),
              },
            },
          },
          // 3. Orders in production pipeline that originated from design
          {
            status: {
              in: [
                OrderStatus.ARTWORK_APPROVED,
                OrderStatus.PRE_PRODUCTION_QC,
                OrderStatus.PRODUCTION_QUEUE,
                OrderStatus.PRINTING,
                OrderStatus.FINISHING,
                OrderStatus.QUALITY_CHECK,
                OrderStatus.PACKING,
                OrderStatus.READY_FOR_DISPATCH,
                OrderStatus.OUT_FOR_DELIVERY,
                OrderStatus.DELIVERED,
              ],
            },
            assignments: {
              some: {
                taskType: AssignmentTaskType.DESIGN,
                status: AssignmentStatus.COMPLETED,
                ...(isDesignerOnly && user?.sub ? { assignedUserId: user.sub } : {}),
              },
            },
          },
        ],
      };
    }

    const where: any = statusCondition;

    if (search) {
      const searchCondition = {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customer: { fullName: { contains: search, mode: 'insensitive' } } },
          { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        ],
      };
      if (where.AND) {
        where.AND.push(searchCondition);
      } else {
        where.AND = [searchCondition];
      }
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        customer: true,
        shippingAddress: true,
        billingAddress: true,
        assignments: {
          include: {
            assignedUser: { select: { id: true, fullName: true, email: true, role: true } },
            assignedByUser: { select: { id: true, fullName: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        items: {
          include: {
            artworkVersions: { orderBy: { versionNumber: 'desc' } },
            personalizationRecords: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            changedBy: { select: { id: true, fullName: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => {
      const item = o.items[0];
      const specs = (item?.specifications as any) || {};
      const customerPhone =
        o.customer?.phone ||
        o.shippingAddress?.phone ||
        o.billingAddress?.phone ||
        specs.customerPhone ||
        specs.phone ||
        specs.contactPhone ||
        null;

      const activeDesignAssignment = o.assignments.find(
        (a) => a.taskType === AssignmentTaskType.DESIGN && a.status === AssignmentStatus.ACTIVE,
      );
      const completedDesignAssignment =
        o.assignments.find(
          (a) => a.taskType === AssignmentTaskType.DESIGN && a.status === AssignmentStatus.COMPLETED,
        ) ||
        o.assignments.find((a) => a.taskType === AssignmentTaskType.DESIGN);

      const activeProdAssignment = o.assignments.find(
        (a) => a.taskType === AssignmentTaskType.PRODUCTION && a.status === AssignmentStatus.ACTIVE,
      );
      const anyProdAssignment = o.assignments.find(
        (a) => a.taskType === AssignmentTaskType.PRODUCTION,
      );

      const assignedDesigner = activeDesignAssignment?.assignedUser || completedDesignAssignment?.assignedUser || null;
      const assignedOperator = activeProdAssignment?.assignedUser || anyProdAssignment?.assignedUser || null;

      // Check if design is completed & passed to production
      const allItemVersions = o.items.flatMap((it) => it.artworkVersions || []);
      const approvedArtworkVersion =
        allItemVersions.find((v) => v.isApproved || v.status === ArtworkStatus.PROOF_APPROVED) ||
        allItemVersions[0] ||
        null;

      const isPassedToProduction =
        Boolean(completedDesignAssignment && completedDesignAssignment.status === AssignmentStatus.COMPLETED) ||
        (approvedArtworkVersion?.status === ArtworkStatus.PROOF_APPROVED && o.status !== OrderStatus.DESIGN_REQUIRED) ||
        [
          OrderStatus.ARTWORK_APPROVED,
          OrderStatus.PRE_PRODUCTION_QC,
          OrderStatus.PRODUCTION_QUEUE,
          OrderStatus.PRINTING,
          OrderStatus.FINISHING,
          OrderStatus.QUALITY_CHECK,
          OrderStatus.PACKING,
          OrderStatus.READY_FOR_DISPATCH,
          OrderStatus.OUT_FOR_DELIVERY,
          OrderStatus.DELIVERED,
        ].includes(o.status as any);

      // Station / Stage handoff details
      let passedToStation = 'Design Studio';
      let passedToStageBadge = 'In Design';
      if (isPassedToProduction) {
        switch (o.status) {
          case OrderStatus.ARTWORK_APPROVED:
          case OrderStatus.ORDER_REVIEW:
            passedToStation = assignedOperator
              ? `Production (Assigned: ${assignedOperator.fullName})`
              : 'OE Operations Command (Ready for Production Assignment)';
            passedToStageBadge = assignedOperator ? 'Production Assigned' : 'OE Assignment';
            break;
          case OrderStatus.CUSTOMER_APPROVAL_REQUIRED:
            passedToStation = 'Customer Proof Approval';
            passedToStageBadge = 'Customer Approval';
            break;
          case OrderStatus.PRE_PRODUCTION_QC:
            passedToStation = assignedOperator
              ? `Production (Assigned: ${assignedOperator.fullName})`
              : 'OE Operations Command (Ready for Production Assignment)';
            passedToStageBadge = 'OE Assignment';
            break;
          case OrderStatus.PRODUCTION_QUEUE:
            passedToStation = assignedOperator
              ? `Production Queue (Assigned: ${assignedOperator.fullName})`
              : 'Production Queue (Awaiting Machine Slot)';
            passedToStageBadge = 'Production Queue';
            break;
          case OrderStatus.PRINTING:
            passedToStation = assignedOperator
              ? `Press Station: Printing (${assignedOperator.fullName})`
              : 'Press Station: Printing';
            passedToStageBadge = 'Printing';
            break;
          case OrderStatus.FINISHING:
            passedToStation = assignedOperator
              ? `Post-Press: Finishing & Binding (${assignedOperator.fullName})`
              : 'Post-Press: Finishing & Binding';
            passedToStageBadge = 'Finishing';
            break;
          case OrderStatus.QUALITY_CHECK:
            passedToStation = 'Post-Production Final QC Gate';
            passedToStageBadge = 'Quality Check';
            break;
          case OrderStatus.PACKING:
            passedToStation = 'Packaging & Shipping Dispatch';
            passedToStageBadge = 'Packing';
            break;
          case OrderStatus.READY_FOR_DISPATCH:
          case OrderStatus.OUT_FOR_DELIVERY:
          case OrderStatus.DELIVERED:
            passedToStation = 'Dispatch & Logistics';
            passedToStageBadge = 'Dispatched';
            break;
          default:
            passedToStation = assignedOperator ? `Production (${assignedOperator.fullName})` : 'Production Pipeline';
            passedToStageBadge = 'Production';
        }
      }

      const passedAt =
        completedDesignAssignment?.completedAt ||
        approvedArtworkVersion?.approvedAt ||
        (isPassedToProduction ? o.updatedAt : null);

      const passedByDesigner =
        completedDesignAssignment?.assignedUser?.fullName ||
        (approvedArtworkVersion ? 'In-House Studio Designer' : null);

      const passedPrepressNotes =
        completedDesignAssignment?.reason ||
        approvedArtworkVersion?.prepressNotes ||
        null;

      return {
        id: o.id,
        orderId: o.id,
        orderNumber: o.orderNumber,
        customer: {
          fullName: o.customer?.fullName || 'Direct Customer',
          companyName: o.customer?.companyName || null,
          email: o.customer?.email || '',
          phone: customerPhone,
        },
        items: o.items.map((it) => {
          const itSpecs = (it.specifications as any) || {};
          const itApprovedVersion =
            it.artworkVersions?.find((v) => v.isApproved || v.status === ArtworkStatus.PROOF_APPROVED) ||
            it.artworkVersions?.[0] ||
            null;
          return {
            id: it.id,
            productName: it.productName,
            quantity: it.quantity,
            artworkUrl: itSpecs.artworkUrl || itSpecs.artworkFile?.fileUrl || null,
            artworkFile: itSpecs.artworkFile || null,
            artworkFiles: itSpecs.artworkFiles || (itSpecs.artworkFile ? { [itSpecs.artworkFile.slotKey || 'artwork']: itSpecs.artworkFile } : null),
            referenceImageUrl: itSpecs.referenceImage?.fileUrl || itSpecs.referenceImageUrl || null,
            referenceImage: itSpecs.referenceImage || null,
            artworkSource: itSpecs.artworkSource || 'DESIGN_TEAM',
            specifications: it.specifications,
            personalizationData: it.personalizationData || itSpecs.personalization || null,
            personalizationRecords: it.personalizationRecords || null,
            designNotes: it.designNotes || itSpecs.designNotes || itSpecs.customerNotes || o.customerNotes || null,
            approvedArtworkVersion: itApprovedVersion,
            latestArtworkVersion: it.artworkVersions?.[0] || null,
          };
        }),
        customerName: o.customer?.fullName,
        companyName: o.customer?.companyName,
        productName: item?.productName || 'Custom Print Job',
        quantity: item?.quantity || 1,
        status: o.status,
        customerStatus: o.customerStatus,
        currentStatus: o.status,
        workflowRoute: specs.workflowRoute || 'DESIGN_SERVICE',
        artworkSource: specs.artworkSource || 'DESIGN_TEAM',
        artworkUrl: specs.artworkUrl || specs.artworkFile?.fileUrl || null,
        referenceImageUrl: specs.referenceImage?.fileUrl || specs.referenceImageUrl || null,
        designNotes: item?.designNotes || specs.designNotes || o.customerNotes || null,
        customerNotes: o.customerNotes || item?.designNotes || specs.designNotes || null,
        designServiceFee: specs.designServiceFee || 0,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        dueAt: o.dueAt,
        latestArtworkVersion: approvedArtworkVersion || item?.artworkVersions?.[0] || null,
        approvedArtworkVersion,
        assignedDesignerId: assignedDesigner?.id || null,
        assignedDesignerName: assignedDesigner?.fullName || null,
        assignedDesigner,
        assignedOperator,
        isPassedToProduction,
        passedToStation,
        passedToStageBadge,
        passedAt,
        passedByDesigner,
        passedPrepressNotes,
        statusHistory: o.statusHistory?.map((h) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          reason: h.reason,
          notes: h.notes,
          createdAt: h.createdAt,
          changedBy: h.changedBy?.fullName || null,
        })) || [],
      };
    });
  }

  /**
   * Designer claims a design job from the queue
   */
  async claimDesignJob(orderId: string, user: JwtPayload | string) {
    const userId = typeof user === 'string' ? user : user.sub;
    const userRole = typeof user === 'string' ? null : user.role;

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        items: true,
        assignments: {
          where: { taskType: AssignmentTaskType.DESIGN, status: AssignmentStatus.ACTIVE },
        },
      },
    });

    if (!order) throw new NotFoundException(`Order '${orderId}' not found`);

    const activeAssignment = order.assignments[0];
    if (activeAssignment && activeAssignment.assignedUserId !== userId && userRole !== UserRole.ADMIN_MANAGER && userRole !== UserRole.OPERATIONAL_MANAGER) {
      throw new ForbiddenException('This design task is assigned to another designer.');
    }

    await this.auditService.log({
      actorId: userId,
      action: 'CLAIM_DESIGN_JOB',
      entity: 'Order',
      entityId: order.id,
      orderId: order.id,
      reason: 'Designer claimed order for artwork generation',
    });

    return { success: true, message: `Design job for ${order.orderNumber} claimed successfully.` };
  }

  /**
   * Designer completes the design job, uploads the print-ready ArtworkVersion, and routes back to OE for operator assignment
   */
  async completeDesignJob(
    orderId: string,
    dto: {
      storageKey: string;
      originalFileName: string;
      mimeType?: string;
      fileSize?: number;
      prepressNotes?: string;
      resolutionDpi?: number;
    },
    user: JwtPayload | string,
  ) {
    const userId = typeof user === 'string' ? user : user.sub;
    const userRole = typeof user === 'string' ? null : user.role;

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        items: { include: { artworkVersions: true } },
        assignments: {
          where: { taskType: AssignmentTaskType.DESIGN, status: AssignmentStatus.ACTIVE },
        },
      },
    });

    if (!order) throw new NotFoundException(`Order '${orderId}' not found`);

    // Security check: individual ownership
    if (userRole === UserRole.DESIGNER_PREPRESS) {
      const isAssigned = order.assignments.some((a) => a.assignedUserId === userId);
      if (!isAssigned) {
        throw new ForbiddenException('You cannot complete a design task assigned to another designer.');
      }
    }

    const item = order.items[0];
    if (!item) throw new BadRequestException('Order contains no items to attach design artwork to.');

    const nextVersion = item.artworkVersions.length + 1;
    const checksum = crypto
      .createHash('sha256')
      .update(`${dto.storageKey}-${dto.originalFileName}-${Date.now()}`)
      .digest('hex');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create approved ArtworkVersion
      const artwork = await tx.artworkVersion.create({
        data: {
          orderItemId: item.id,
          versionNumber: nextVersion,
          storageKey: dto.storageKey,
          originalFileName: dto.originalFileName,
          mimeType: dto.mimeType || 'application/pdf',
          fileSize: dto.fileSize || 1024 * 1024,
          checksum,
          resolutionDpi: dto.resolutionDpi || 300,
          status: ArtworkStatus.PROOF_APPROVED,
          isApproved: true,
          approvedAt: new Date(),
          prepressNotes: dto.prepressNotes || 'Completed by in-house studio team',
          uploadedBy: userId,
        },
      });

      // 2. Lock approved version on order item
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          approvedArtworkVersionId: artwork.id,
        },
      });

      // 3. Mark the active DESIGN OrderAssignment as COMPLETED
      await tx.orderAssignment.updateMany({
        where: {
          orderId: order.id,
          taskType: AssignmentTaskType.DESIGN,
          status: AssignmentStatus.ACTIVE,
        },
        data: {
          status: AssignmentStatus.COMPLETED,
          completedAt: new Date(),
          reason: dto.prepressNotes || 'Design finalized and verified by designer',
        },
      });

      // 4. Transition Master Order to ARTWORK_APPROVED
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.ARTWORK_APPROVED,
          customerStatus: 'PREPARING_ORDER',
        },
      });

      // 5. Record sequential status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.ARTWORK_APPROVED,
          changedById: userId,
          reason: `Design completed by studio team (v${nextVersion}). Ready for OE Production Assignment.`,
          notes: dto.prepressNotes,
        },
      });

      return { artwork, order: updatedOrder };
    });

    await this.auditService.log({
      actorId: userId,
      action: 'DESIGN_COMPLETED',
      entity: 'Order',
      entityId: order.id,
      orderId: order.id,
      newState: { status: OrderStatus.ARTWORK_APPROVED, artworkVersionId: result.artwork.id },
      reason: `Design completed and routed to OE for Production Assignment`,
    });

    this.eventEmitter.emit('design.completed', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      artworkVersionId: result.artwork.id,
    });

    return result;
  }
}
