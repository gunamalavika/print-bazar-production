import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService, OptionSelectionDto } from '../pricing/pricing.service';
import { ShippingGstService } from '../shipping-gst/shipping-gst.service';
import { ShippingCalculatorService } from '../shipping/shipping-calculator.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OrderStatus,
  OrderChannel,
  DeliveryMethod,
  PaymentStatus,
  PaymentMethod,
  Priority,
  SlaStatus,
  ArtworkStatus,
  UserRole,
  CustomerVisibleStatus,
  Prisma,
} from '@prisma/client';
import { JwtPayload } from '../../common/types/roles';
import { evaluateProductConfiguration } from '../products/rules/product-rules-engine';
import * as crypto from 'crypto';
import { PersonalizationTemplateService } from '../products/personalization/personalization-template.service';
import { PersonalizationPayload } from '../products/personalization/personalization-template.dto';

export interface CreateOrderItemDto {
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  options?: OptionSelectionDto[];
  fieldValues?: Record<string, any>;
  selectedOptions?: Record<string, any>;
  personalization?: PersonalizationPayload;
  variantLines?: Array<{
    id?: string;
    sku?: string;
    combination: Record<string, string>;
    quantity: number;
    unitPrice?: number;
    lineSubtotal?: number;
    artworkUrl?: string;
    specifications?: any;
  }>;
  specifications?: any;
  designNotes?: string;
  artworkUrl?: string;
  artworkStorageKey?: string;
  referenceImageUrl?: string;
  artworkFile?: {
    fileUrl: string;
    storageKey?: string;
    fileName?: string;
    originalFileName?: string;
    mimeType?: string;
    fileSize?: number;
    width?: number;
    height?: number;
    actualMegapixels?: number;
    qualityStatus?: string;
    warningAccepted?: boolean;
    slotLabel?: string;
  };
  artworkFiles?: Record<string, {
    fileUrl: string;
    storageKey?: string;
    fileName?: string;
    originalFileName?: string;
    mimeType?: string;
    fileSize?: number;
    width?: number;
    height?: number;
    actualMegapixels?: number;
    qualityStatus?: string;
    warningAccepted?: boolean;
    slotLabel?: string;
  }>;
  referenceImage?: {
    fileUrl: string;
    storageKey?: string;
    fileName?: string;
    originalFileName?: string;
    mimeType?: string;
    fileSize?: number;
  };
  selectedDesignService?: boolean;
  hasDesignService?: boolean;
}

export interface CreateOrderDto {
  customerId?: string;
  customer?: {
    fullName?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    gstin?: string;
  };
  customerDetails?: {
    fullName: string;
    email: string;
    phone: string;
    companyName?: string;
    gstin?: string;
  };
  sourceChannel?: OrderChannel;
  deliveryMethod?: DeliveryMethod;
  paymentMode?: 'FULL' | 'SPLIT_50';
  paymentSplitType?: 'FULL_PREPAID' | 'SPLIT_50' | 'FULL' | string;
  paymentMethod?: string;
  paidAmount?: number;
  advanceAmount?: number;
  balanceAmount?: number;
  shippingAddress?: {
    contactName?: string;
    fullName?: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  billingAddress?: {
    contactName?: string;
    fullName?: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  items: CreateOrderItemDto[];
  customerNotes?: string;
  priority?: Priority;
  idempotencyKey?: string;
}

export interface OrderQueryFilters {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  priority?: Priority;
  slaStatus?: SlaStatus;
  sourceChannel?: OrderChannel;
  deliveryMethod?: DeliveryMethod;
  exceptionType?: 'DELAYED' | 'ON_HOLD' | 'QC_FAIL' | 'UNPAID';
  page?: number;
  limit?: number;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly shippingGstService: ShippingGstService,
    private readonly shippingCalculatorService: ShippingCalculatorService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly personalizationService: PersonalizationTemplateService,
  ) { }

  /**
   * Omnichannel Order Creation:
   * Recalculates all pricing server-side, snapshots specs into OrderItem, initializes master record.
   */
  async createOrder(dto: CreateOrderDto, creatorUserId?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('An order must contain at least one product item.');
    }

    // 0. Idempotency Check: Prevent duplicate order creation on network retries or double-clicks
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

    // 1. Resolve or Create Authoritative Customer
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
      } else {
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
    } else if (!customerId && creatorUserId) {
      const userCustomer = await this.prisma.customer.findFirst({
        where: { userId: creatorUserId },
      });
      if (userCustomer) {
        customerId = userCustomer.id;
      }
    }

    if (!customerId) {
      throw new BadRequestException('Customer information or authentication is required to place an order.');
    }

    // 2. Authoritative Server Quote Calculation for each item
    let subtotal = 0;
    let totalTax = 0;
    let shippingAmount = 0;
    let maxProductionDays = 2;

    const evaluatedItems: Array<{
      productId: string;
      sku: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      specifications: Prisma.InputJsonValue;
      personalizationData?: any;
      designNotes?: string;
      variantLinesData?: any[] | null;
      personalizationRecordsData?: any[] | null;
    }> = [];

    for (const itemDto of dto.items) {
      const hasVariantLines = Boolean(itemDto.variantLines && itemDto.variantLines.length > 0);
      const itemQty = hasVariantLines
        ? itemDto.variantLines!.reduce((sum, v) => sum + Math.max(1, Number(v.quantity) || 1), 0)
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
              orderBy: { sortOrder: 'asc' as const },
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
        throw new NotFoundException(`Product not found in system catalog.`);
      }

      // Determine explicit artwork source and workflow route
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

      const hasArtwork = Boolean(
        rawArt?.fileUrl ||
        rawArt?.storageKey ||
        (afs && Object.values(afs).some((f: any) => f?.fileUrl || f?.storageKey)) ||
        (itemDto.variantLines && itemDto.variantLines.some((vl) => Boolean(vl.artworkUrl)))
      );
      const refReq = product.referenceImageRequirement || 'OPTIONAL';
      const rawRef =
        itemDto.referenceImage ||
        (itemDto.referenceImageUrl
          ? {
            fileUrl: itemDto.referenceImageUrl,
            storageKey: itemDto.referenceImageUrl,
            originalFileName: 'Reference_Image',
          }
          : null);

      const hasRefImage = Boolean(rawRef?.fileUrl);
      const designReq = product.designServiceRequirement || 'DISABLED';
      const rawChoices = itemDto.options || itemDto.fieldValues || itemDto.selectedOptions || {};
      let userDesignChoice = '';
      if (typeof rawChoices === 'object' && rawChoices !== null) {
        for (const [k, v] of Object.entries(rawChoices)) {
          const normK = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normK.includes('design') || normK.includes('artworkservice')) {
            userDesignChoice = String(v).toLowerCase().trim();
            break;
          }
        }
      }
      const isExplicitNoDesign = userDesignChoice === 'no' || userDesignChoice === 'false' || userDesignChoice === 'none';
      const isExplicitYesDesign = userDesignChoice === 'yes' || userDesignChoice === 'true' || userDesignChoice.includes('hire') || userDesignChoice.includes('assist');

      const wantsDesign = Boolean(
        !isExplicitNoDesign &&
        (itemDto.selectedDesignService ||
          itemDto.hasDesignService ||
          isExplicitYesDesign ||
          designReq === 'REQUIRED')
      );

      let artworkSource: 'CUSTOMER' | 'DESIGN_TEAM' | 'CUSTOMER_WITH_DESIGN_ASSISTANCE' = 'CUSTOMER';
      if (wantsDesign) {
        artworkSource = hasArtwork ? 'CUSTOMER_WITH_DESIGN_ASSISTANCE' : 'DESIGN_TEAM';
      } else if (hasArtwork) {
        artworkSource = 'CUSTOMER';
      } else if (artReq === 'REQUIRED') {
        throw new BadRequestException(`Production artwork or design service is mandatory for '${product.name}'`);
      } else {
        artworkSource = 'CUSTOMER';
      }

      const workflowRoute: 'CUSTOMER_ARTWORK' | 'DESIGN_SERVICE' =
        wantsDesign ? 'DESIGN_SERVICE' : 'CUSTOMER_ARTWORK';

      // Authoritative Product Configuration Rules Validation
      const configRules: any[] = (product as any).configurationRules || [];
      const optionGroups: any[] = (product as any).optionGroups || [];
      if (configRules.length > 0 && optionGroups.length > 0) {
        const rawChoices = itemDto.options || itemDto.fieldValues || itemDto.selectedOptions || {};
        const ruleEval = evaluateProductConfiguration(
          optionGroups.map((g: any) => ({
            id: g.id,
            name: g.name,
            code: g.code,
            isRequired: g.isRequired,
            isCustomerVisible: g.isCustomerVisible,
            options: (g.options || []).map((o: any) => ({
              id: o.id,
              label: o.label || o.name,
              value: o.value || o.code,
              isActive: o.isActive,
              isDefault: o.isDefault,
            })),
          })),
          configRules,
          rawChoices,
        );

        if (!ruleEval.isValid && ruleEval.invalidCombinations.length > 0) {
          throw new BadRequestException(
            `Invalid option configuration for '${product.name}': ${ruleEval.invalidCombinations.map((c) => c.message).join('; ')}`,
          );
        }

        // Verify client did not attempt to force a disabled choice or hidden group
        for (const [grpCode, chosenVal] of Object.entries(rawChoices)) {
          if (chosenVal) {
            const optKey = `${grpCode}:${chosenVal}`;
            if (ruleEval.optionStatus[optKey]?.isDisabled) {
              throw new BadRequestException(
                `Selected option '${chosenVal}' for '${grpCode}' is disabled by product configuration rules.`,
              );
            }
            if (ruleEval.groupStatus[grpCode]?.isVisible === false) {
              throw new BadRequestException(
                `Option group '${grpCode}' is not available with current selections.`,
              );
            }
          }
        }
      }

      // Calculate server-side price quote with dynamic field & flow engine support
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

      // Authoritative Personalization Validation (Templates with PER_ORDER & PER_ITEM)
      let validatedPersonalization: any = null;
      if (product.personalizationTemplate && product.personalizationTemplate.isActive) {
        const valRes = this.personalizationService.validatePersonalization(
          product.personalizationTemplate as any,
          itemQty,
          itemDto.personalization,
          product.personalizationConfig,
        );

        if (!valRes.isValid) {
          throw new BadRequestException(
            `Personalization validation failed for '${product.name}': ${valRes.errors.join('; ')}`,
          );
        }
        validatedPersonalization = valRes.sanitized;
      } else if (itemDto.personalization?.templateId) {
        const tmpl = await this.personalizationService.getTemplateById(
          itemDto.personalization.templateId,
        );
        const valRes = this.personalizationService.validatePersonalization(
          tmpl as any,
          itemQty,
          itemDto.personalization,
        );
        if (!valRes.isValid) {
          throw new BadRequestException(
            `Personalization validation failed: ${valRes.errors.join('; ')}`,
          );
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
          designNotes: itemDto.designNotes || (itemDto.specifications as any)?.designNotes || dto.customerNotes || null,
        } as unknown as Prisma.InputJsonValue,
        designNotes: itemDto.designNotes || (itemDto.specifications as any)?.designNotes || dto.customerNotes || null,
        variantLinesData: quote.variantLines || null,
      });
    }

    // 2b. Authoritative Order-Level Enterprise Shipping and GST Calculation
    const deliveryMethod = dto.deliveryMethod || 'COURIER';
    const totalOrderQty = evaluatedItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0);

    const shippingBreakdown = await this.shippingCalculatorService.calculateShipping({
      productId: evaluatedItems[0]?.productId,
      quantity: totalOrderQty,
      destinationPincode: dto.shippingAddress?.postalCode,
      orderSubtotal: subtotal,
      deliveryMethod: deliveryMethod === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'COURIER',
      items: evaluatedItems.map((it) => ({
        productId: it.productId,
        quantity: it.quantity || 1,
      })),
    });

    const shipTaxCalc = await this.shippingGstService.calculateShippingAndTax(
      subtotal,
      dto.shippingAddress?.postalCode,
      deliveryMethod === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'COURIER',
      false,
    );

    shippingAmount = dto.shippingAddress?.postalCode ? shippingBreakdown.finalShippingAmount : 0;
    totalTax = shipTaxCalc.gstAmount;
    const totalAmount = Math.round((subtotal + totalTax + shippingAmount) * 100) / 100;

    // Attach shipping and tax snapshot to items so historical orders retain audit proof
    for (const it of evaluatedItems) {
      if (typeof it.specifications === 'object' && it.specifications !== null) {
        (it.specifications as any)['_shippingGstSnapshot'] = {
          shippingCharge: shippingAmount,
          isFreeShipping: shippingBreakdown.isFreeShippingApplied,
          matchedZone: shippingBreakdown.zone,
          gstRatePercent: shipTaxCalc.gstRatePercent,
          gstAmount: totalTax,
          destinationPincode: shippingBreakdown.destinationPincode,
          productWeightGrams: shippingBreakdown.productWeightGrams,
          packagingWeightGrams: shippingBreakdown.packaging.weightGrams,
          actualWeightGrams: shippingBreakdown.actualWeightGrams,
          billableWeightGrams: shippingBreakdown.billableWeightGrams,
          rateCard: shippingBreakdown.rateCard,
          matchedSlab: shippingBreakdown.matchedSlab,
          baseShippingCharge: shippingBreakdown.baseShippingCharge,
          additionalWeightCharge: shippingBreakdown.additionalWeightCharge,
        };
      }
    }

    // 3. Generate unique Order Number: PB-YYYYMMDD-XXXX
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.order.count();
    const orderNumber = `PB-${datePrefix}-${String(count + 1).padStart(4, '0')}`;

    // SLA Due Date
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + maxProductionDays);

    // Determine primary route
    const hasAnyDesignService = evaluatedItems.some((it) => {
      const specs = it.specifications as any;
      return (
        specs?.workflowRoute === 'DESIGN_SERVICE' ||
        specs?.artworkSource === 'DESIGN_TEAM' ||
        specs?.artworkSource === 'CUSTOMER_WITH_DESIGN_ASSISTANCE' ||
        Boolean(specs?.selectedDesignService)
      );
    });
    const primaryWorkflowRoute = hasAnyDesignService ? 'DESIGN_SERVICE' : 'CUSTOMER_ARTWORK';

    // 4. Create Order & OrderItems Atomically
    const order = await this.prisma.$transaction(async (tx) => {
      // Create shipping address if provided
      let shippingAddressId: string | undefined = undefined;
      if (dto.shippingAddress) {
        const addr = await tx.address.create({
          data: {
            customerId,
            type: 'SHIPPING',
            contactName:
              dto.shippingAddress.contactName ||
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

      // Calculate authoritative payment breakdown based on settlement mode
      const isSplit = dto.paymentMode === 'SPLIT_50' || dto.paymentSplitType === 'SPLIT_50';
      const isFullPrepaid = dto.paymentMode === 'FULL' || dto.paymentSplitType === 'FULL_PREPAID';
      const expectedAdvance = isSplit ? Math.round(totalAmount * 0.5 * 100) / 100 : totalAmount;
      const expectedBalance = isSplit ? Math.round((totalAmount - expectedAdvance) * 100) / 100 : 0.0;

      // Authoritative payment verification: Client-supplied prices or paidAmounts are NEVER trusted blindly
      let initialPaid = 0.0;
      if (dto.paidAmount !== undefined && Number(dto.paidAmount) > 0) {
        // Reconcile client payment attempt with authoritative server-calculated order total
        initialPaid = isSplit ? expectedAdvance : totalAmount;
      } else if (dto.paymentMethod === 'ONLINE_PREPAID' || isFullPrepaid) {
        initialPaid = isSplit ? expectedAdvance : totalAmount;
      }
      const initialBalance = Math.max(0, Math.round((totalAmount - initialPaid) * 100) / 100);
      const initialPaymentStatus = isSplit
        ? (initialPaid > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.PENDING)
        : (initialPaid >= totalAmount ? PaymentStatus.PAID : PaymentStatus.PENDING);

      // All newly created orders land directly in OE (Operational Manager) intake queue for evaluation
      let initialStatus: OrderStatus = OrderStatus.ORDER_CREATED;
      let initialCustomerStatus: CustomerVisibleStatus = initialPaid > 0
        ? CustomerVisibleStatus.PAYMENT_CONFIRMED
        : CustomerVisibleStatus.ORDER_CREATED;

      let resolvedChannel: OrderChannel = OrderChannel.WEBSITE;
      if ((dto.sourceChannel as any) === 'WALK_IN' || dto.sourceChannel === OrderChannel.WALK_IN_POS) {
        resolvedChannel = OrderChannel.WALK_IN_POS;
      } else if (dto.sourceChannel) {
        resolvedChannel = dto.sourceChannel;
      }

      let resolvedDelivery: DeliveryMethod = DeliveryMethod.COURIER;
      if ((dto.deliveryMethod as any) === 'STORE_PICKUP' || dto.deliveryMethod === DeliveryMethod.STORE_PICKUP) {
        resolvedDelivery = DeliveryMethod.STORE_PICKUP;
      } else if (dto.deliveryMethod) {
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
          priority: dto.priority || Priority.NORMAL,
          slaStatus: SlaStatus.ON_TIME,
          dueAt,
          customerNotes: dto.customerNotes || (evaluatedItems[0] as any)?.designNotes || null,
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

      // Persist OrderItemVariant records for multi-variant items
      for (let i = 0; i < evaluatedItems.length; i++) {
        const vlData = evaluatedItems[i].variantLinesData;
        const createdItem = createdOrder.items[i];
        if (vlData && vlData.length > 0 && createdItem) {
          await tx.orderItemVariant.createMany({
            data: vlData.map((vl) => ({
              orderItemId: createdItem.id,
              sku: vl.sku || `${createdItem.sku}-${Object.values(vl.combination).join('-')}`,
              combination: vl.combination as Prisma.InputJsonValue,
              quantity: Number(vl.quantity),
              unitPrice: new Prisma.Decimal(vl.unitPrice),
              totalPrice: new Prisma.Decimal(vl.lineSubtotal),
              artworkUrl: vl.artworkUrl || null,
              specifications: { optionsSummary: vl.optionsSummary } as Prisma.InputJsonValue,
            })),
          });
        }
      }

      // Persist OrderItemPersonalization records for per-item personalizations
      for (let i = 0; i < evaluatedItems.length; i++) {
        const pRecords = evaluatedItems[i].personalizationRecordsData;
        const pData = evaluatedItems[i].personalizationData;
        const createdItem = createdOrder.items[i];
        if (pRecords && pRecords.length > 0 && createdItem) {
          await tx.orderItemPersonalization.createMany({
            data: pRecords.map((entry: any) => ({
              orderItemId: createdItem.id,
              itemIndex: Number(entry.itemIndex) || 1,
              variantCombination: entry.variantCombination
                ? (entry.variantCombination as Prisma.InputJsonValue)
                : Prisma.JsonNull,
              fieldValues: (entry.values as Prisma.InputJsonValue) || {},
              sharedValues: pData?.sharedValues
                ? (pData.sharedValues as Prisma.InputJsonValue)
                : Prisma.JsonNull,
              status: 'PENDING',
            })),
          });
        }
      }

      // Create initial ArtworkVersion records for items with artwork uploaded
      for (let i = 0; i < dto.items.length; i++) {
        const itemDto = dto.items[i];
        const createdItem = createdOrder.items[i];
        const artObj = itemDto.artworkFile;
        const artFiles = itemDto.artworkFiles;

        const filesToCreate: Array<{ slotKey: string; file: any }> = [];
        if (artFiles && Object.keys(artFiles).length > 0) {
          for (const [slotKey, sFile] of Object.entries(artFiles)) {
            if (sFile && (sFile.fileUrl || sFile.storageKey)) {
              filesToCreate.push({ slotKey, file: sFile });
            }
          }
        } else if (artObj && (artObj.fileUrl || artObj.storageKey)) {
          filesToCreate.push({ slotKey: 'artwork', file: artObj });
        } else if (itemDto.artworkUrl) {
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

        let primaryArtworkId: string | null = null;
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
              status: ArtworkStatus.PENDING_REVIEW,
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

      // Initial Status History
      await tx.orderStatusHistory.create({
        data: {
          orderId: createdOrder.id,
          toStatus: OrderStatus.ORDER_CREATED,
          changedById: creatorUserId,
          reason: `Order created via ${createdOrder.sourceChannel}. Total: ₹${totalAmount}`,
        },
      });

      // SLA Tracking Record
      await tx.slaRecord.create({
        data: {
          orderId: createdOrder.id,
          entityType: 'ORDER',
          targetDueAt: dueAt,
        },
      });

      // Record Initial Payment if collected (e.g. POS / Walk-in / Advance)
      if (initialPaid > 0) {
        let pm: PaymentMethod = PaymentMethod.CASH_ON_COUNTER;
        if (dto.paymentMethod === 'UPI') pm = PaymentMethod.UPI;
        else if (dto.paymentMethod === 'CARD') pm = PaymentMethod.DEBIT_CARD;
        else if (dto.paymentMethod === 'BANK_TRANSFER') pm = PaymentMethod.BANK_TRANSFER_NEFT;
        else if (dto.paymentMethod === 'CORPORATE_CREDIT') pm = PaymentMethod.CORPORATE_CREDIT;

        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            transactionId: `POS-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            amount: initialPaid,
            currency: 'INR',
            status: PaymentStatus.PAID,
            method: pm,
            capturedAt: new Date(),
          },
        });
      }

      // Generate initial Invoice record
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

    // 5. Audit Log & Domain Event
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

  /**
   * Search and Filter Orders for ERP Control Center or Customer Portal
   */
  async listOrders(filters: OrderQueryFilters, currentUser?: JwtPayload) {
    const page = filters.page ? Math.max(1, Number(filters.page)) : 1;
    const limit = filters.limit ? Math.min(100, Math.max(1, Number(filters.limit))) : 20;
    const skip = (page - 1) * limit;

    const andConditions: Prisma.OrderWhereInput[] = [];

    // Role-based customer scoping: Customers only see their own orders
    if (currentUser?.role === UserRole.CUSTOMER) {
      const customerOr: Prisma.OrderWhereInput[] = [];
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
      } else {
        andConditions.push({ id: 'none' }); // No customer profile -> 0 orders
      }
    }

    if (filters.status) andConditions.push({ status: filters.status });
    if (filters.paymentStatus) andConditions.push({ paymentStatus: filters.paymentStatus });
    if (filters.priority) andConditions.push({ priority: filters.priority });
    if (filters.slaStatus) andConditions.push({ slaStatus: filters.slaStatus });
    if (filters.sourceChannel) andConditions.push({ sourceChannel: filters.sourceChannel });
    if (filters.deliveryMethod) andConditions.push({ deliveryMethod: filters.deliveryMethod });

    // Search query: order number, customer name, email, phone
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

    // Exception views
    if (filters.exceptionType === 'ON_HOLD') {
      andConditions.push({ status: OrderStatus.ON_HOLD });
    } else if (filters.exceptionType === 'DELAYED') {
      andConditions.push({ slaStatus: SlaStatus.DELAYED });
    } else if (filters.exceptionType === 'UNPAID') {
      andConditions.push({ paymentStatus: PaymentStatus.PENDING });
    }

    const where: Prisma.OrderWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

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

  /**
   * One Order = One Connected View
   * Returns complete master record with all related entities
   */
  async getOrderDetails(orderId: string) {
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
            personalizationRecords: true,
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
      throw new NotFoundException(`Order '${orderId}' not found`);
    }

    return order;
  }
}
