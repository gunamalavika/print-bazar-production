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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pricing_service_1 = require("../pricing/pricing.service");
const shipping_gst_service_1 = require("../shipping-gst/shipping-gst.service");
const audit_service_1 = require("../audit/audit.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
const product_rules_engine_1 = require("../products/rules/product-rules-engine");
const crypto = require("crypto");
const personalization_template_service_1 = require("../products/personalization/personalization-template.service");
let OrdersService = OrdersService_1 = class OrdersService {
    prisma;
    pricingService;
    shippingGstService;
    auditService;
    eventEmitter;
    personalizationService;
    logger = new common_1.Logger(OrdersService_1.name);
    constructor(prisma, pricingService, shippingGstService, auditService, eventEmitter, personalizationService) {
        this.prisma = prisma;
        this.pricingService = pricingService;
        this.shippingGstService = shippingGstService;
        this.auditService = auditService;
        this.eventEmitter = eventEmitter;
        this.personalizationService = personalizationService;
    }
    async createOrder(dto, creatorUserId) {
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('An order must contain at least one product item.');
        }
        if (dto.idempotencyKey) {
            const existing = await this.prisma.order.findFirst({
                where: {
                    internalNotes: { contains: `IDEMPOTENCY:${dto.idempotencyKey}` },
                },
                include: {
                    items: true,
                    customer: true,
                    shippingAddress: true,
                },
            });
            if (existing) {
                this.logger.warn(`Idempotent order replay detected for key ${dto.idempotencyKey}: returning existing order ${existing.orderNumber}`);
                return existing;
            }
        }
        let customerId = dto.customerId;
        const customerInfo = dto.customerDetails || dto.customer;
        if (customerInfo && (customerInfo.email || customerInfo.phone)) {
            let existing = await this.prisma.customer.findFirst({
                where: {
                    OR: [
                        ...(customerInfo.email ? [{ email: customerInfo.email }] : []),
                        ...(customerInfo.phone ? [{ phone: customerInfo.phone }] : []),
                    ],
                },
            });
            if (!existing) {
                existing = await this.prisma.customer.create({
                    data: {
                        fullName: customerInfo.fullName || 'Walk-in Customer',
                        email: customerInfo.email || `walkin-${Date.now()}@printbazzar.local`,
                        phone: customerInfo.phone || 'N/A',
                        companyName: customerInfo.companyName,
                        gstin: customerInfo.gstin,
                    },
                });
            }
            else {
                existing = await this.prisma.customer.update({
                    where: { id: existing.id },
                    data: {
                        fullName: customerInfo.fullName || existing.fullName,
                        companyName: customerInfo.companyName || existing.companyName,
                        gstin: customerInfo.gstin || existing.gstin,
                        phone: customerInfo.phone || existing.phone,
                    },
                });
            }
            customerId = existing.id;
        }
        else if (!customerId && creatorUserId) {
            const userCustomer = await this.prisma.customer.findFirst({
                where: { userId: creatorUserId },
            });
            if (userCustomer) {
                customerId = userCustomer.id;
            }
        }
        if (!customerId) {
            throw new common_1.BadRequestException('Customer information or authentication is required to place an order.');
        }
        let subtotal = 0;
        let totalTax = 0;
        let shippingAmount = 0;
        let maxProductionDays = 2;
        const evaluatedItems = [];
        for (const itemDto of dto.items) {
            const hasVariantLines = Boolean(itemDto.variantLines && itemDto.variantLines.length > 0);
            const itemQty = hasVariantLines
                ? itemDto.variantLines.reduce((sum, v) => sum + Math.max(1, Number(v.quantity) || 1), 0)
                : Math.max(1, Number(itemDto.quantity) || 100);
            let product = null;
            const productInclude = {
                optionGroups: {
                    include: {
                        options: true,
                    },
                },
                configurationRules: true,
                personalizationTemplate: {
                    include: {
                        fields: {
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                },
            };
            if (itemDto.productId) {
                product = await this.prisma.product.findFirst({
                    where: {
                        OR: [
                            { id: itemDto.productId },
                            { slug: itemDto.productId },
                            { sku: itemDto.productId },
                        ],
                    },
                    include: productInclude,
                });
            }
            if (!product && itemDto.sku) {
                product = await this.prisma.product.findFirst({
                    where: { sku: itemDto.sku },
                    include: productInclude,
                });
            }
            if (!product) {
                product = await this.prisma.product.findFirst({
                    where: { status: 'PUBLISHED' },
                    include: productInclude,
                });
            }
            if (!product) {
                product = await this.prisma.product.findFirst({
                    include: productInclude,
                });
            }
            if (!product) {
                throw new common_1.NotFoundException(`Product not found in system catalog.`);
            }
            const artReq = product.artworkRequirement || 'OPTIONAL';
            const af = itemDto.artworkFile;
            const afs = itemDto.artworkFiles;
            const firstSlotArt = afs && Object.values(afs).length > 0 ? Object.values(afs)[0] : null;
            const rawArt = af
                ? af
                : firstSlotArt
                    ? firstSlotArt
                    : itemDto.artworkUrl
                        ? {
                            fileUrl: itemDto.artworkUrl,
                            storageKey: itemDto.artworkStorageKey || itemDto.artworkUrl,
                            originalFileName: 'Customer_Artwork',
                            mimeType: 'image/jpeg',
                            fileSize: 1024 * 1024,
                            actualMegapixels: undefined,
                            qualityStatus: 'PASSED',
                        }
                        : null;
            const hasArtwork = Boolean(rawArt?.fileUrl ||
                rawArt?.storageKey ||
                (afs && Object.values(afs).some((f) => f?.fileUrl || f?.storageKey)) ||
                (itemDto.variantLines && itemDto.variantLines.some((vl) => Boolean(vl.artworkUrl))));
            const refReq = product.referenceImageRequirement || 'OPTIONAL';
            const rawRef = itemDto.referenceImage ||
                (itemDto.referenceImageUrl
                    ? {
                        fileUrl: itemDto.referenceImageUrl,
                        storageKey: itemDto.referenceImageUrl,
                        originalFileName: 'Reference_Image',
                    }
                    : null);
            const hasRefImage = Boolean(rawRef?.fileUrl);
            const designReq = product.designServiceRequirement || 'DISABLED';
            const wantsDesign = Boolean(itemDto.selectedDesignService ||
                itemDto.hasDesignService ||
                designReq === 'REQUIRED');
            let artworkSource = 'CUSTOMER';
            if (wantsDesign) {
                artworkSource = hasArtwork ? 'CUSTOMER_WITH_DESIGN_ASSISTANCE' : 'DESIGN_TEAM';
            }
            else if (hasArtwork) {
                artworkSource = 'CUSTOMER';
            }
            else if (artReq === 'REQUIRED') {
                throw new common_1.BadRequestException(`Production artwork or design service is mandatory for '${product.name}'`);
            }
            else {
                artworkSource = 'CUSTOMER';
            }
            const workflowRoute = wantsDesign ? 'DESIGN_SERVICE' : 'CUSTOMER_ARTWORK';
            const configRules = product.configurationRules || [];
            const optionGroups = product.optionGroups || [];
            if (configRules.length > 0 && optionGroups.length > 0) {
                const rawChoices = itemDto.options || itemDto.fieldValues || itemDto.selectedOptions || {};
                const ruleEval = (0, product_rules_engine_1.evaluateProductConfiguration)(optionGroups.map((g) => ({
                    id: g.id,
                    name: g.name,
                    code: g.code,
                    isRequired: g.isRequired,
                    isCustomerVisible: g.isCustomerVisible,
                    options: (g.options || []).map((o) => ({
                        id: o.id,
                        label: o.label || o.name,
                        value: o.value || o.code,
                        isActive: o.isActive,
                        isDefault: o.isDefault,
                    })),
                })), configRules, rawChoices);
                if (!ruleEval.isValid && ruleEval.invalidCombinations.length > 0) {
                    throw new common_1.BadRequestException(`Invalid option configuration for '${product.name}': ${ruleEval.invalidCombinations.map((c) => c.message).join('; ')}`);
                }
                for (const [grpCode, chosenVal] of Object.entries(rawChoices)) {
                    if (chosenVal) {
                        const optKey = `${grpCode}:${chosenVal}`;
                        if (ruleEval.optionStatus[optKey]?.isDisabled) {
                            throw new common_1.BadRequestException(`Selected option '${chosenVal}' for '${grpCode}' is disabled by product configuration rules.`);
                        }
                        if (ruleEval.groupStatus[grpCode]?.isVisible === false) {
                            throw new common_1.BadRequestException(`Option group '${grpCode}' is not available with current selections.`);
                        }
                    }
                }
            }
            const quote = await this.pricingService.calculateQuote({
                productId: product.id,
                quantity: itemQty,
                options: itemDto.options,
                fieldValues: itemDto.fieldValues || itemDto.selectedOptions,
                variantLines: itemDto.variantLines,
                hasArtwork,
                hasDesignService: wantsDesign,
                hasReferenceImage: hasRefImage,
                isInterState: false,
            });
            subtotal += quote.subtotal;
            if (quote.productionDays > maxProductionDays) {
                maxProductionDays = quote.productionDays;
            }
            let validatedPersonalization = null;
            if (product.personalizationTemplate && product.personalizationTemplate.isActive) {
                const valRes = this.personalizationService.validatePersonalization(product.personalizationTemplate, itemQty, itemDto.personalization, product.personalizationConfig);
                if (!valRes.isValid) {
                    throw new common_1.BadRequestException(`Personalization validation failed for '${product.name}': ${valRes.errors.join('; ')}`);
                }
                validatedPersonalization = valRes.sanitized;
            }
            else if (itemDto.personalization?.templateId) {
                const tmpl = await this.personalizationService.getTemplateById(itemDto.personalization.templateId);
                const valRes = this.personalizationService.validatePersonalization(tmpl, itemQty, itemDto.personalization);
                if (!valRes.isValid) {
                    throw new common_1.BadRequestException(`Personalization validation failed: ${valRes.errors.join('; ')}`);
                }
                validatedPersonalization = valRes.sanitized;
            }
            evaluatedItems.push({
                productId: product.id,
                sku: product.sku,
                productName: product.name,
                quantity: quote.quantity,
                unitPrice: quote.unitPrice,
                totalPrice: quote.subtotal,
                personalizationData: validatedPersonalization || null,
                personalizationRecordsData: validatedPersonalization?.perItemEntries || null,
                specifications: {
                    options: quote.selectedOptionsSummary,
                    specificationsSnapshot: quote.specificationsSnapshot,
                    personalization: validatedPersonalization || null,
                    isMultiVariant: Boolean(quote.isMultiVariant),
                    variantLines: quote.variantLines || null,
                    basePrice: quote.basePrice,
                    optionsCost: quote.optionsCost,
                    artworkRequirement: artReq,
                    artworkPrice: Number(product.artworkPrice) || 0,
                    artworkFee: quote.artworkFee,
                    artworkFile: rawArt,
                    artworkFiles: afs || (rawArt ? { artwork: rawArt } : null),
                    artworkUrl: rawArt?.fileUrl || null,
                    artworkStorageKey: rawArt?.storageKey || null,
                    artworkSource,
                    workflowRoute,
                    referenceImageRequirement: refReq,
                    referenceImage: rawRef,
                    referenceImageUrl: rawRef?.fileUrl || null,
                    designServiceRequirement: designReq,
                    designServicePrice: Number(product.designServicePrice) || 0,
                    designServiceFee: quote.designServiceFee,
                    selectedDesignService: wantsDesign,
                    unitPrice: quote.unitPrice,
                    subtotal: quote.subtotal,
                    designNotes: itemDto.designNotes || itemDto.specifications?.designNotes || dto.customerNotes || null,
                },
                designNotes: itemDto.designNotes || itemDto.specifications?.designNotes || dto.customerNotes || null,
                variantLinesData: quote.variantLines || null,
            });
        }
        const deliveryMethod = dto.deliveryMethod || 'COURIER';
        const shipTaxCalc = await this.shippingGstService.calculateShippingAndTax(subtotal, dto.shippingAddress?.postalCode, deliveryMethod === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'COURIER', false);
        shippingAmount = shipTaxCalc.shippingFee;
        totalTax = shipTaxCalc.gstAmount;
        const totalAmount = Math.round((subtotal + totalTax + shippingAmount) * 100) / 100;
        for (const it of evaluatedItems) {
            if (typeof it.specifications === 'object' && it.specifications !== null) {
                it.specifications['_shippingGstSnapshot'] = {
                    shippingCharge: shippingAmount,
                    isFreeShipping: shipTaxCalc.isFreeShippingApplied,
                    matchedZone: shipTaxCalc.matchedZone,
                    gstRatePercent: shipTaxCalc.gstRatePercent,
                    gstAmount: totalTax,
                };
            }
        }
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await this.prisma.order.count();
        const orderNumber = `PB-${datePrefix}-${String(count + 1).padStart(4, '0')}`;
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + maxProductionDays);
        const hasAnyDesignService = evaluatedItems.some((it) => {
            const specs = it.specifications;
            return (specs?.workflowRoute === 'DESIGN_SERVICE' ||
                specs?.artworkSource === 'DESIGN_TEAM' ||
                specs?.artworkSource === 'CUSTOMER_WITH_DESIGN_ASSISTANCE' ||
                Boolean(specs?.selectedDesignService));
        });
        const primaryWorkflowRoute = hasAnyDesignService ? 'DESIGN_SERVICE' : 'CUSTOMER_ARTWORK';
        const order = await this.prisma.$transaction(async (tx) => {
            let shippingAddressId = undefined;
            if (dto.shippingAddress) {
                const addr = await tx.address.create({
                    data: {
                        customerId,
                        type: 'SHIPPING',
                        contactName: dto.shippingAddress.contactName ||
                            dto.shippingAddress.fullName ||
                            customerInfo?.fullName ||
                            'Customer',
                        phone: dto.shippingAddress.phone || customerInfo?.phone || '',
                        street: dto.shippingAddress.street,
                        city: dto.shippingAddress.city,
                        state: dto.shippingAddress.state,
                        postalCode: dto.shippingAddress.postalCode,
                        country: dto.shippingAddress.country || 'India',
                    },
                });
                shippingAddressId = addr.id;
            }
            const isSplit = dto.paymentMode === 'SPLIT_50' || dto.paymentSplitType === 'SPLIT_50';
            const isFullPrepaid = dto.paymentMode === 'FULL' || dto.paymentSplitType === 'FULL_PREPAID';
            const expectedAdvance = isSplit ? Math.round(totalAmount * 0.5 * 100) / 100 : totalAmount;
            const expectedBalance = isSplit ? Math.round((totalAmount - expectedAdvance) * 100) / 100 : 0.0;
            let initialPaid = 0.0;
            if (dto.paidAmount !== undefined && Number(dto.paidAmount) > 0) {
                initialPaid = isSplit ? expectedAdvance : totalAmount;
            }
            else if (dto.paymentMethod === 'ONLINE_PREPAID' || isFullPrepaid) {
                initialPaid = isSplit ? expectedAdvance : totalAmount;
            }
            const initialBalance = Math.max(0, Math.round((totalAmount - initialPaid) * 100) / 100);
            const initialPaymentStatus = isSplit
                ? (initialPaid > 0 ? client_1.PaymentStatus.PARTIALLY_PAID : client_1.PaymentStatus.PENDING)
                : (initialPaid >= totalAmount ? client_1.PaymentStatus.PAID : client_1.PaymentStatus.PENDING);
            let initialStatus = client_1.OrderStatus.ORDER_CREATED;
            let initialCustomerStatus = initialPaid > 0
                ? client_1.CustomerVisibleStatus.PAYMENT_CONFIRMED
                : client_1.CustomerVisibleStatus.ORDER_CREATED;
            let resolvedChannel = client_1.OrderChannel.WEBSITE;
            if (dto.sourceChannel === 'WALK_IN' || dto.sourceChannel === client_1.OrderChannel.WALK_IN_POS) {
                resolvedChannel = client_1.OrderChannel.WALK_IN_POS;
            }
            else if (dto.sourceChannel) {
                resolvedChannel = dto.sourceChannel;
            }
            let resolvedDelivery = client_1.DeliveryMethod.COURIER;
            if (dto.deliveryMethod === 'STORE_PICKUP' || dto.deliveryMethod === client_1.DeliveryMethod.STORE_PICKUP) {
                resolvedDelivery = client_1.DeliveryMethod.STORE_PICKUP;
            }
            else if (dto.deliveryMethod) {
                resolvedDelivery = dto.deliveryMethod;
            }
            const createdOrder = await tx.order.create({
                data: {
                    orderNumber,
                    customerId,
                    sourceChannel: resolvedChannel,
                    status: initialStatus,
                    customerStatus: initialCustomerStatus,
                    deliveryMethod: resolvedDelivery,
                    subtotal,
                    taxAmount: totalTax,
                    shippingAmount,
                    discountAmount: 0.0,
                    totalAmount,
                    paidAmount: initialPaid,
                    balanceAmount: initialBalance,
                    paymentStatus: initialPaymentStatus,
                    priority: dto.priority || client_1.Priority.NORMAL,
                    slaStatus: client_1.SlaStatus.ON_TIME,
                    dueAt,
                    customerNotes: dto.customerNotes || evaluatedItems[0]?.designNotes || null,
                    internalNotes: dto.idempotencyKey ? `IDEMPOTENCY:${dto.idempotencyKey}` : null,
                    shippingAddressId,
                    items: {
                        create: evaluatedItems.map(({ variantLinesData, personalizationRecordsData, ...it }) => it),
                    },
                },
                include: {
                    items: true,
                    customer: true,
                    shippingAddress: true,
                },
            });
            for (let i = 0; i < evaluatedItems.length; i++) {
                const vlData = evaluatedItems[i].variantLinesData;
                const createdItem = createdOrder.items[i];
                if (vlData && vlData.length > 0 && createdItem) {
                    await tx.orderItemVariant.createMany({
                        data: vlData.map((vl) => ({
                            orderItemId: createdItem.id,
                            sku: vl.sku || `${createdItem.sku}-${Object.values(vl.combination).join('-')}`,
                            combination: vl.combination,
                            quantity: Number(vl.quantity),
                            unitPrice: new client_1.Prisma.Decimal(vl.unitPrice),
                            totalPrice: new client_1.Prisma.Decimal(vl.lineSubtotal),
                            artworkUrl: vl.artworkUrl || null,
                            specifications: { optionsSummary: vl.optionsSummary },
                        })),
                    });
                }
            }
            for (let i = 0; i < evaluatedItems.length; i++) {
                const pRecords = evaluatedItems[i].personalizationRecordsData;
                const pData = evaluatedItems[i].personalizationData;
                const createdItem = createdOrder.items[i];
                if (pRecords && pRecords.length > 0 && createdItem) {
                    await tx.orderItemPersonalization.createMany({
                        data: pRecords.map((entry) => ({
                            orderItemId: createdItem.id,
                            itemIndex: Number(entry.itemIndex) || 1,
                            variantCombination: entry.variantCombination
                                ? entry.variantCombination
                                : client_1.Prisma.JsonNull,
                            fieldValues: entry.values || {},
                            sharedValues: pData?.sharedValues
                                ? pData.sharedValues
                                : client_1.Prisma.JsonNull,
                            status: 'PENDING',
                        })),
                    });
                }
            }
            for (let i = 0; i < dto.items.length; i++) {
                const itemDto = dto.items[i];
                const createdItem = createdOrder.items[i];
                const artObj = itemDto.artworkFile;
                const artFiles = itemDto.artworkFiles;
                const filesToCreate = [];
                if (artFiles && Object.keys(artFiles).length > 0) {
                    for (const [slotKey, sFile] of Object.entries(artFiles)) {
                        if (sFile && (sFile.fileUrl || sFile.storageKey)) {
                            filesToCreate.push({ slotKey, file: sFile });
                        }
                    }
                }
                else if (artObj && (artObj.fileUrl || artObj.storageKey)) {
                    filesToCreate.push({ slotKey: 'artwork', file: artObj });
                }
                else if (itemDto.artworkUrl) {
                    filesToCreate.push({
                        slotKey: 'artwork',
                        file: {
                            fileUrl: itemDto.artworkUrl,
                            storageKey: itemDto.artworkStorageKey || itemDto.artworkUrl,
                            originalFileName: 'Customer_Artwork',
                            mimeType: 'image/jpeg',
                            fileSize: 1024 * 1024,
                        },
                    });
                }
                let primaryArtworkId = null;
                for (let vIdx = 0; vIdx < filesToCreate.length; vIdx++) {
                    const { slotKey, file: artItem } = filesToCreate[vIdx];
                    const checksum = crypto
                        .createHash('sha256')
                        .update(`${artItem.storageKey || artItem.fileUrl}-${Date.now()}-${vIdx}`)
                        .digest('hex');
                    const slotPrefix = artItem.slotLabel || (slotKey !== 'artwork' ? slotKey.replace(/[_-]+/g, ' ').toUpperCase() : '');
                    const originalName = slotPrefix
                        ? `${slotPrefix}: ${artItem.originalFileName || 'Artwork'}`
                        : (artItem.originalFileName || 'Customer_Artwork');
                    const createdArtwork = await tx.artworkVersion.create({
                        data: {
                            orderItemId: createdItem.id,
                            versionNumber: vIdx + 1,
                            storageKey: artItem.storageKey || artItem.fileUrl,
                            originalFileName: originalName,
                            mimeType: artItem.mimeType || 'image/jpeg',
                            fileSize: artItem.fileSize || 1024 * 1024,
                            checksum,
                            status: client_1.ArtworkStatus.PENDING_REVIEW,
                            widthPixels: artItem.width,
                            heightPixels: artItem.height,
                            actualMegapixels: artItem.actualMegapixels,
                            qualityStatus: artItem.qualityStatus || 'PASSED',
                            warningAccepted: artItem.warningAccepted ?? false,
                            uploadedBy: customerId,
                        },
                    });
                    if (!primaryArtworkId) {
                        primaryArtworkId = createdArtwork.id;
                    }
                }
                if (primaryArtworkId && createdItem) {
                    await tx.orderItem.update({
                        where: { id: createdItem.id },
                        data: { approvedArtworkVersionId: primaryArtworkId },
                    });
                }
            }
            await tx.orderStatusHistory.create({
                data: {
                    orderId: createdOrder.id,
                    toStatus: client_1.OrderStatus.ORDER_CREATED,
                    changedById: creatorUserId,
                    reason: `Order created via ${createdOrder.sourceChannel}. Total: ₹${totalAmount}`,
                },
            });
            await tx.slaRecord.create({
                data: {
                    orderId: createdOrder.id,
                    entityType: 'ORDER',
                    targetDueAt: dueAt,
                },
            });
            if (initialPaid > 0) {
                let pm = client_1.PaymentMethod.CASH_ON_COUNTER;
                if (dto.paymentMethod === 'UPI')
                    pm = client_1.PaymentMethod.UPI;
                else if (dto.paymentMethod === 'CARD')
                    pm = client_1.PaymentMethod.DEBIT_CARD;
                else if (dto.paymentMethod === 'BANK_TRANSFER')
                    pm = client_1.PaymentMethod.BANK_TRANSFER_NEFT;
                else if (dto.paymentMethod === 'CORPORATE_CREDIT')
                    pm = client_1.PaymentMethod.CORPORATE_CREDIT;
                await tx.payment.create({
                    data: {
                        orderId: createdOrder.id,
                        transactionId: `POS-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                        amount: initialPaid,
                        currency: 'INR',
                        status: client_1.PaymentStatus.PAID,
                        method: pm,
                        capturedAt: new Date(),
                    },
                });
            }
            await tx.invoice.create({
                data: {
                    orderId: createdOrder.id,
                    invoiceNumber: `INV-${orderNumber}`,
                    customerGstin: customerInfo?.gstin || null,
                    subtotal,
                    shippingAmount: Number(shippingAmount || 0),
                    cgst: Math.round((totalTax / 2) * 100) / 100,
                    sgst: Math.round((totalTax / 2) * 100) / 100,
                    igst: 0,
                    totalTax,
                    grandTotal: totalAmount,
                },
            });
            return createdOrder;
        });
        await this.auditService.log({
            actorId: creatorUserId,
            action: 'CREATE_ORDER',
            entity: 'Order',
            entityId: order.id,
            orderId: order.id,
            newState: { orderNumber: order.orderNumber, totalAmount: order.totalAmount, itemsCount: order.items.length },
            reason: `New order created via ${order.sourceChannel}`,
        });
        this.eventEmitter.emit('order.created', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            totalAmount: Number(order.totalAmount),
        });
        return order;
    }
    async listOrders(filters, currentUser) {
        const page = filters.page ? Math.max(1, Number(filters.page)) : 1;
        const limit = filters.limit ? Math.min(100, Math.max(1, Number(filters.limit))) : 20;
        const skip = (page - 1) * limit;
        const andConditions = [];
        if (currentUser?.role === client_1.UserRole.CUSTOMER) {
            const customerOr = [];
            if (currentUser.customerId) {
                customerOr.push({ customerId: currentUser.customerId });
            }
            if (currentUser.email) {
                customerOr.push({ customer: { email: { equals: currentUser.email.toLowerCase(), mode: 'insensitive' } } });
            }
            if (currentUser.sub) {
                customerOr.push({ customer: { userId: currentUser.sub } });
            }
            if (customerOr.length > 0) {
                andConditions.push({ OR: customerOr });
            }
            else {
                andConditions.push({ id: 'none' });
            }
        }
        if (filters.status)
            andConditions.push({ status: filters.status });
        if (filters.paymentStatus)
            andConditions.push({ paymentStatus: filters.paymentStatus });
        if (filters.priority)
            andConditions.push({ priority: filters.priority });
        if (filters.slaStatus)
            andConditions.push({ slaStatus: filters.slaStatus });
        if (filters.sourceChannel)
            andConditions.push({ sourceChannel: filters.sourceChannel });
        if (filters.deliveryMethod)
            andConditions.push({ deliveryMethod: filters.deliveryMethod });
        if (filters.search) {
            andConditions.push({
                OR: [
                    { orderNumber: { contains: filters.search, mode: 'insensitive' } },
                    { customer: { fullName: { contains: filters.search, mode: 'insensitive' } } },
                    { customer: { phone: { contains: filters.search, mode: 'insensitive' } } },
                    { customer: { email: { contains: filters.search, mode: 'insensitive' } } },
                ],
            });
        }
        if (filters.exceptionType === 'ON_HOLD') {
            andConditions.push({ status: client_1.OrderStatus.ON_HOLD });
        }
        else if (filters.exceptionType === 'DELAYED') {
            andConditions.push({ slaStatus: client_1.SlaStatus.DELAYED });
        }
        else if (filters.exceptionType === 'UNPAID') {
            andConditions.push({ paymentStatus: client_1.PaymentStatus.PENDING });
        }
        const where = andConditions.length > 0 ? { AND: andConditions } : {};
        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: {
                    customer: { select: { fullName: true, email: true, phone: true, companyName: true } },
                    items: {
                        include: {
                            variants: true,
                            artworkVersions: {
                                orderBy: { versionNumber: 'desc' },
                                take: 1,
                            },
                        },
                    },
                    packages: { select: { id: true, packageNumber: true, status: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.order.count({ where }),
        ]);
        return {
            data: orders,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getOrderDetails(orderId) {
        const order = await this.prisma.order.findFirst({
            where: {
                OR: [{ id: orderId }, { orderNumber: orderId }],
            },
            include: {
                customer: true,
                shippingAddress: true,
                billingAddress: true,
                items: {
                    include: {
                        variants: true,
                        artworkVersions: { orderBy: { versionNumber: 'desc' } },
                        jobCards: {
                            include: {
                                machine: true,
                                operator: { select: { fullName: true, role: true } },
                                issues: true,
                            },
                        },
                    },
                },
                payments: true,
                invoices: true,
                packages: { include: { shipment: true } },
                qcChecklists: {
                    include: { inspector: { select: { fullName: true, role: true } } },
                    orderBy: { createdAt: 'desc' },
                },
                statusHistory: {
                    include: { changedBy: { select: { fullName: true, role: true } } },
                    orderBy: { createdAt: 'desc' },
                },
                auditLogs: {
                    include: { actor: { select: { fullName: true, role: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order '${orderId}' not found`);
        }
        return order;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pricing_service_1.PricingService,
        shipping_gst_service_1.ShippingGstService,
        audit_service_1.AuditService,
        event_emitter_1.EventEmitter2,
        personalization_template_service_1.PersonalizationTemplateService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map