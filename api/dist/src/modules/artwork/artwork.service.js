"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ArtworkService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtworkService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
const crypto = require("crypto");
const image_dimensions_util_1 = require("../../common/utils/image-dimensions.util");
let ArtworkService = ArtworkService_1 = class ArtworkService {
    prisma;
    auditService;
    eventEmitter;
    logger = new common_1.Logger(ArtworkService_1.name);
    constructor(prisma, auditService, eventEmitter) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.eventEmitter = eventEmitter;
    }
    async registerArtworkVersion(dto, uploaderId) {
        const item = await this.prisma.orderItem.findUnique({
            where: { id: dto.orderItemId },
            include: { order: true, artworkVersions: true },
        });
        if (!item)
            throw new common_1.NotFoundException(`OrderItem '${dto.orderItemId}' not found`);
        const nextVersion = item.artworkVersions.length + 1;
        const checksum = crypto
            .createHash('sha256')
            .update(`${dto.storageKey}-${dto.originalFileName}-${Date.now()}`)
            .digest('hex');
        const artwork = await this.prisma.$transaction(async (tx) => {
            await tx.artworkVersion.updateMany({
                where: { orderItemId: item.id, isApproved: false },
                data: { status: client_1.ArtworkStatus.SUPERSEDED },
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
                    status: client_1.ArtworkStatus.PENDING_REVIEW,
                    uploadedBy: uploaderId,
                    customerNotes: dto.notes,
                },
            });
            if (item.order.status === client_1.OrderStatus.ORDER_REVIEW || item.order.status === client_1.OrderStatus.ORDER_CREATED) {
                await tx.order.update({
                    where: { id: item.order.id },
                    data: {
                        status: client_1.OrderStatus.ARTWORK_REVIEW,
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
    async submitForCustomerApproval(artworkVersionId, prepressNotes, user) {
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
                                    where: { taskType: client_1.AssignmentTaskType.DESIGN, status: client_1.AssignmentStatus.ACTIVE },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!artwork)
            throw new common_1.NotFoundException('Artwork version not found');
        const order = artwork.orderItem.order;
        if (userRole === client_1.UserRole.DESIGNER_PREPRESS) {
            const isAssigned = order.assignments.some((a) => a.assignedUserId === userId);
            if (!isAssigned && order.assignments.length > 0) {
                throw new common_1.ForbiddenException('You cannot submit proofs for a design task assigned to another designer.');
            }
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const art = await tx.artworkVersion.update({
                where: { id: artworkVersionId },
                data: {
                    status: client_1.ArtworkStatus.PROOF_GENERATED,
                    prepressNotes,
                },
            });
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
                    customerStatus: 'APPROVAL_REQUIRED',
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    fromStatus: order.status,
                    toStatus: client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
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
    async approveProof(dto, customerId) {
        const artwork = await this.prisma.artworkVersion.findUnique({
            where: { id: dto.artworkVersionId },
            include: { orderItem: { include: { order: true } } },
        });
        if (!artwork)
            throw new common_1.NotFoundException('Artwork version not found');
        const orderItem = artwork.orderItem;
        const order = orderItem.order;
        const result = await this.prisma.$transaction(async (tx) => {
            const approvedArt = await tx.artworkVersion.update({
                where: { id: dto.artworkVersionId },
                data: {
                    status: client_1.ArtworkStatus.PROOF_APPROVED,
                    isApproved: true,
                    approvedAt: new Date(),
                    customerNotes: dto.customerNotes || 'Approved by customer',
                },
            });
            await tx.orderItem.update({
                where: { id: orderItem.id },
                data: {
                    approvedArtworkVersionId: dto.artworkVersionId,
                },
            });
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.ARTWORK_APPROVED,
                    customerStatus: 'PREPARING_ORDER',
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    fromStatus: order.status,
                    toStatus: client_1.OrderStatus.ARTWORK_APPROVED,
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
    async requestRevision(dto, customerId) {
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
                        status: client_1.ArtworkStatus.PREFLIGHT_FAILED,
                        uploadedBy: customerId || 'STAFF',
                    },
                    include: { orderItem: { include: { order: true } } },
                });
            }
        }
        if (!artwork)
            throw new common_1.NotFoundException('Artwork version or order item not found');
        const order = artwork.orderItem.order;
        const result = await this.prisma.$transaction(async (tx) => {
            await tx.artworkVersion.update({
                where: { id: artwork.id },
                data: {
                    status: client_1.ArtworkStatus.PROOF_REJECTED,
                    customerNotes: feedback,
                },
            });
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.DESIGN_REQUIRED,
                    customerStatus: 'DESIGN_IN_PROGRESS',
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    fromStatus: order.status,
                    toStatus: client_1.OrderStatus.DESIGN_REQUIRED,
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
    async getVersionsForItem(orderItemId) {
        return this.prisma.artworkVersion.findMany({
            where: { orderItemId },
            orderBy: { versionNumber: 'desc' },
        });
    }
    async processArtworkUpload(file, productId, customMinMegapixels) {
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
        let dimensions = file.buffer ? (0, image_dimensions_util_1.extractImageDimensions)(file.buffer) : null;
        if (!dimensions && file.path) {
            dimensions = (0, image_dimensions_util_1.extractDimensionsFromFile)(file.path);
        }
        const width = dimensions?.width ?? null;
        const height = dimensions?.height ?? null;
        const actualMegapixels = dimensions?.megapixels ?? null;
        let qualityStatus = 'PASSED';
        let warningMessage = null;
        if (qualityVerificationEnabled && actualMegapixels !== null) {
            if (actualMegapixels < requiredMegapixels) {
                qualityStatus = 'WARNING';
                warningMessage = `Artwork quality is below the recommended minimum. Required: ${requiredMegapixels} MP, Detected: ${actualMegapixels} MP.`;
            }
            else {
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
    async processReferenceImageUpload(file) {
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
    async getDesignQueue(search, user) {
        const where = {
            OR: [
                { status: client_1.OrderStatus.DESIGN_REQUIRED },
                { status: client_1.OrderStatus.ARTWORK_REVIEW },
                { status: client_1.OrderStatus.ORDER_REVIEW },
                { status: client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED },
            ],
        };
        if (user?.role === client_1.UserRole.DESIGNER_PREPRESS) {
            where.assignments = {
                some: {
                    assignedUserId: user.sub,
                    taskType: client_1.AssignmentTaskType.DESIGN,
                    status: client_1.AssignmentStatus.ACTIVE,
                },
            };
        }
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
            }
            else {
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
                    where: { taskType: client_1.AssignmentTaskType.DESIGN, status: client_1.AssignmentStatus.ACTIVE },
                    include: { assignedUser: { select: { id: true, fullName: true, email: true, role: true } } },
                },
                items: {
                    include: {
                        artworkVersions: { orderBy: { versionNumber: 'desc' } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return orders.map((o) => {
            const item = o.items[0];
            const specs = item?.specifications || {};
            const customerPhone = o.customer?.phone ||
                o.shippingAddress?.phone ||
                o.billingAddress?.phone ||
                specs.customerPhone ||
                specs.phone ||
                specs.contactPhone ||
                null;
            const activeAssignment = o.assignments[0];
            const assignedDesigner = activeAssignment?.assignedUser || null;
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
                    const itSpecs = it.specifications || {};
                    return {
                        id: it.id,
                        productName: it.productName,
                        quantity: it.quantity,
                        artworkUrl: itSpecs.artworkUrl || itSpecs.artworkFile?.fileUrl || null,
                        artworkFile: itSpecs.artworkFile || null,
                        referenceImageUrl: itSpecs.referenceImage?.fileUrl || itSpecs.referenceImageUrl || null,
                        referenceImage: itSpecs.referenceImage || null,
                        artworkSource: itSpecs.artworkSource || 'DESIGN_TEAM',
                        specifications: it.specifications,
                        designNotes: it.designNotes || itSpecs.designNotes || itSpecs.customerNotes || o.customerNotes || null,
                        approvedArtworkVersion: it.artworkVersions?.[0] || null,
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
                dueAt: o.dueAt,
                latestArtworkVersion: item?.artworkVersions?.[0] || null,
                assignedDesignerId: assignedDesigner?.id || null,
                assignedDesignerName: assignedDesigner?.fullName || null,
                assignedDesigner,
            };
        });
    }
    async claimDesignJob(orderId, user) {
        const userId = typeof user === 'string' ? user : user.sub;
        const userRole = typeof user === 'string' ? null : user.role;
        const order = await this.prisma.order.findFirst({
            where: {
                OR: [{ id: orderId }, { orderNumber: orderId }],
            },
            include: {
                items: true,
                assignments: {
                    where: { taskType: client_1.AssignmentTaskType.DESIGN, status: client_1.AssignmentStatus.ACTIVE },
                },
            },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order '${orderId}' not found`);
        const activeAssignment = order.assignments[0];
        if (activeAssignment && activeAssignment.assignedUserId !== userId && userRole !== client_1.UserRole.ADMIN_MANAGER && userRole !== client_1.UserRole.OPERATIONAL_MANAGER) {
            throw new common_1.ForbiddenException('This design task is assigned to another designer.');
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
    async completeDesignJob(orderId, dto, user) {
        const userId = typeof user === 'string' ? user : user.sub;
        const userRole = typeof user === 'string' ? null : user.role;
        const order = await this.prisma.order.findFirst({
            where: {
                OR: [{ id: orderId }, { orderNumber: orderId }],
            },
            include: {
                items: { include: { artworkVersions: true } },
                assignments: {
                    where: { taskType: client_1.AssignmentTaskType.DESIGN, status: client_1.AssignmentStatus.ACTIVE },
                },
            },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order '${orderId}' not found`);
        if (userRole === client_1.UserRole.DESIGNER_PREPRESS) {
            const isAssigned = order.assignments.some((a) => a.assignedUserId === userId);
            if (!isAssigned) {
                throw new common_1.ForbiddenException('You cannot complete a design task assigned to another designer.');
            }
        }
        const item = order.items[0];
        if (!item)
            throw new common_1.BadRequestException('Order contains no items to attach design artwork to.');
        const nextVersion = item.artworkVersions.length + 1;
        const checksum = crypto
            .createHash('sha256')
            .update(`${dto.storageKey}-${dto.originalFileName}-${Date.now()}`)
            .digest('hex');
        const result = await this.prisma.$transaction(async (tx) => {
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
                    status: client_1.ArtworkStatus.PROOF_APPROVED,
                    isApproved: true,
                    approvedAt: new Date(),
                    prepressNotes: dto.prepressNotes || 'Completed by in-house studio team',
                    uploadedBy: userId,
                },
            });
            await tx.orderItem.update({
                where: { id: item.id },
                data: {
                    approvedArtworkVersionId: artwork.id,
                },
            });
            await tx.orderAssignment.updateMany({
                where: {
                    orderId: order.id,
                    taskType: client_1.AssignmentTaskType.DESIGN,
                    status: client_1.AssignmentStatus.ACTIVE,
                },
                data: {
                    status: client_1.AssignmentStatus.COMPLETED,
                    completedAt: new Date(),
                    reason: dto.prepressNotes || 'Design finalized and verified by designer',
                },
            });
            const updatedOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.ARTWORK_APPROVED,
                    customerStatus: 'PREPARING_ORDER',
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    fromStatus: order.status,
                    toStatus: client_1.OrderStatus.ARTWORK_APPROVED,
                    changedById: userId,
                    reason: `Design completed by studio team (v${nextVersion}). Ready for OE Operational Review.`,
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
            newState: { status: client_1.OrderStatus.ARTWORK_APPROVED, artworkVersionId: result.artwork.id },
            reason: `Design completed and ready for OE Operational Review`,
        });
        this.eventEmitter.emit('design.completed', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            artworkVersionId: result.artwork.id,
        });
        return result;
    }
};
exports.ArtworkService = ArtworkService;
exports.ArtworkService = ArtworkService = ArtworkService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        event_emitter_1.EventEmitter2])
], ArtworkService);
//# sourceMappingURL=artwork.service.js.map