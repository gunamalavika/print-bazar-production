import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OrderStatus,
  CustomerVisibleStatus,
  PackageStatus,
  ShipmentStatus,
  DeliveryMethod,
  Prisma,
} from '@prisma/client';
import { ShippingCalculatorService } from '../shipping/shipping-calculator.service';

export interface DispatchQueueFilters {
  search?: string;
  tab?: 'ALL' | 'READY' | 'IN_TRANSIT' | 'STORE_PICKUP' | 'DELIVERED';
  status?: string;
  deliveryMethod?: string;
  page?: string;
  limit?: string;
}

export interface ManualCourierUpdateDto {
  deliveryMethod?: 'COURIER' | 'STORE_PICKUP' | 'LOCAL_EXPRESS_BIKE';
  courierName?: string;
  awbNumber?: string;
  trackingUrl?: string;
  manifestReference?: string;
  packageCount?: number;
  grossWeightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  targetOrderStatus: 'READY_FOR_DISPATCH' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  targetShipmentStatus?:
    | 'CREATED'
    | 'MANIFESTED'
    | 'IN_TRANSIT'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'RTO_INITIATED'
    | 'EXCEPTION';
  manualChecks?: {
    packageSealedAndLabeled?: boolean;
    addressAndPincodeVerified?: boolean;
    awbMatchedWithParcel?: boolean;
    paymentClearanceVerified?: boolean;
    podOrReceiverVerified?: boolean;
  };
  receiverName?: string;
  receiverPhone?: string;
  dispatchNotes?: string;
}

export interface CourierHandoverDto {
  orderId: string;
  courierName: string;
  awbNumber?: string;
  trackingUrl?: string;
  manifestReference?: string;
  scannedBarcodes?: string[];
  notes?: string;
}

export interface StorePickupHandoverDto {
  orderId: string;
  collectorName: string;
  collectorPhone: string;
  idProofType?: string;
  idProofNumber?: string;
  notes?: string;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly shippingCalculatorService: ShippingCalculatorService,
  ) {}

  private buildDefaultTrackingUrl(courierName: string, awbNumber: string): string {
    const cleanCourier = (courierName || '').toLowerCase();
    const cleanAwb = encodeURIComponent(awbNumber.trim());
    if (cleanCourier.includes('delhivery')) {
      return `https://www.delhivery.com/track/package/${cleanAwb}`;
    }
    if (cleanCourier.includes('bluedart') || cleanCourier.includes('blue dart')) {
      return `https://www.bluedart.com/tracking?trackFor=0&trackNo=${cleanAwb}`;
    }
    if (cleanCourier.includes('dtdc')) {
      return `https://www.dtdc.in/trace.asp?strCnno=${cleanAwb}`;
    }
    if (cleanCourier.includes('shiprocket')) {
      return `https://shiprocket.co/tracking/${cleanAwb}`;
    }
    if (cleanCourier.includes('india post') || cleanCourier.includes('speed post')) {
      return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
    }
    if (cleanCourier.includes('professional')) {
      return `https://www.tpcindia.com/`;
    }
    return `https://track.printbazzar.com/${cleanAwb}`;
  }

  /**
   * List orders in the Dispatch & Manifest Control Station queue with live metrics
   */
  async getDispatchQueue(filters: DispatchQueueFilters = {}) {
    const page = Math.max(1, parseInt(filters.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const dispatchEligibleStatuses: OrderStatus[] = [
      OrderStatus.QUALITY_CHECK,
      OrderStatus.PACKING,
      OrderStatus.READY_FOR_DISPATCH,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];

    const andConditions: Prisma.OrderWhereInput[] = [];

    // Tab filtering
    const tab = filters.tab || 'ALL';
    if (tab === 'READY') {
      andConditions.push({
        status: { in: [OrderStatus.QUALITY_CHECK, OrderStatus.PACKING, OrderStatus.READY_FOR_DISPATCH] },
      });
    } else if (tab === 'IN_TRANSIT') {
      andConditions.push({
        status: OrderStatus.OUT_FOR_DELIVERY,
      });
    } else if (tab === 'STORE_PICKUP') {
      andConditions.push({
        deliveryMethod: DeliveryMethod.STORE_PICKUP,
        status: { notIn: [OrderStatus.CANCELLED] },
      });
    } else if (tab === 'DELIVERED') {
      andConditions.push({
        status: OrderStatus.DELIVERED,
      });
    } else if (filters.status && filters.status !== 'ALL') {
      andConditions.push({
        status: filters.status as OrderStatus,
      });
    } else if (!filters.search) {
      andConditions.push({
        status: { in: dispatchEligibleStatuses },
      });
    }

    if (filters.deliveryMethod && filters.deliveryMethod !== 'ALL') {
      andConditions.push({
        deliveryMethod: filters.deliveryMethod as DeliveryMethod,
      });
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      andConditions.push({
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { customer: { fullName: { contains: q, mode: 'insensitive' } } },
          { customer: { phone: { contains: q } } },
          { shippingAddress: { postalCode: { contains: q } } },
          { shippingAddress: { city: { contains: q, mode: 'insensitive' } } },
          { packages: { some: { barcode: { contains: q, mode: 'insensitive' } } } },
          { packages: { some: { shipment: { awbNumber: { contains: q, mode: 'insensitive' } } } } },
          { packages: { some: { shipment: { courierName: { contains: q, mode: 'insensitive' } } } } },
        ],
      });
    }

    const where: Prisma.OrderWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [
      orders,
      total,
      readyCount,
      inTransitCount,
      storePickupCount,
      deliveredCount,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { id: true, fullName: true, email: true, phone: true, companyName: true },
          },
          shippingAddress: true,
          items: {
            select: {
              id: true,
              productName: true,
              sku: true,
              quantity: true,
              totalPrice: true,
              specifications: true,
              product: { select: { id: true, name: true, unitWeightGrams: true } },
            },
          },
          packages: {
            include: { shipment: true },
            orderBy: { sequenceNumber: 'asc' },
          },
          statusHistory: {
            include: { changedBy: { select: { fullName: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.QUALITY_CHECK, OrderStatus.PACKING, OrderStatus.READY_FOR_DISPATCH] },
        },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.OUT_FOR_DELIVERY },
      }),
      this.prisma.order.count({
        where: {
          deliveryMethod: DeliveryMethod.STORE_PICKUP,
          status: { in: [OrderStatus.PACKING, OrderStatus.READY_FOR_DISPATCH] },
        },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.DELIVERED },
      }),
    ]);

    const enriched = orders.map((order) => {
      const primaryPkg = order.packages?.[0] || null;
      const shipment = primaryPkg?.shipment || null;
      const totalGrossWeightGrams =
        order.packages?.reduce((sum, p) => sum + (Number(p.grossWeightGrams) || 0), 0) ||
        order.items?.reduce(
          (sum, it) => sum + it.quantity * Number(it.product?.unitWeightGrams || 2.5),
          200,
        ) ||
        500;

      return {
        ...order,
        totalAmount: Number(order.totalAmount || 0),
        paidAmount: Number(order.paidAmount || 0),
        balanceAmount: Number(order.balanceAmount || 0),
        shippingAmount: Number(order.shippingAmount || 0),
        totalGrossWeightGrams: Math.round(totalGrossWeightGrams),
        packageCount: order.packages?.length || 1,
        primaryBarcode: primaryPkg?.barcode || null,
        shipment: shipment
          ? {
              id: shipment.id,
              shipmentNumber: shipment.shipmentNumber,
              courierName: shipment.courierName,
              awbNumber: shipment.awbNumber,
              trackingUrl: shipment.trackingUrl,
              status: shipment.status,
              manifestedAt: shipment.manifestedAt,
              dispatchedAt: shipment.dispatchedAt,
              deliveredAt: shipment.deliveredAt,
            }
          : null,
      };
    });

    return {
      data: enriched,
      metrics: {
        readyForDispatch: readyCount,
        inTransit: inTransitCount,
        storePickupReady: storePickupCount,
        delivered: deliveredCount,
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Manual Courier & Dispatch Status Update:
   * Allows dispatch staff to manually verify physical checks, assign/update Courier Partner, AWB, Tracking Link,
   * Package Weight/Count, and transition the order status so it immediately reflects on Customer Tracking.
   */
  async manualCourierUpdate(orderId: string, dto: ManualCourierUpdateDto, staffId?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        customer: true,
        shippingAddress: true,
        packages: { include: { shipment: true }, orderBy: { sequenceNumber: 'asc' } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot update dispatch details for a cancelled order.');
    }

    const deliveryMethod: DeliveryMethod =
      (dto.deliveryMethod as DeliveryMethod) || order.deliveryMethod || DeliveryMethod.COURIER;

    const isStorePickup = deliveryMethod === DeliveryMethod.STORE_PICKUP;
    const courierName =
      dto.courierName?.trim() ||
      order.packages?.[0]?.shipment?.courierName ||
      (isStorePickup ? 'Factory Store Counter Pickup' : 'Delhivery Express');

    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rawAwb =
      dto.awbNumber?.trim() ||
      order.packages?.[0]?.shipment?.awbNumber ||
      (isStorePickup
        ? `PICKUP-${order.orderNumber}`
        : `AWB-${datePrefix}-${Math.floor(100000 + Math.random() * 900000)}`);

    const trackingUrl =
      dto.trackingUrl?.trim() ||
      order.packages?.[0]?.shipment?.trackingUrl ||
      (isStorePickup ? '' : this.buildDefaultTrackingUrl(courierName, rawAwb));

    const targetOrderStatus: OrderStatus =
      (dto.targetOrderStatus as OrderStatus) || OrderStatus.OUT_FOR_DELIVERY;

    // Determine CustomerVisibleStatus
    let targetCustomerStatus: CustomerVisibleStatus = CustomerVisibleStatus.OUT_FOR_DELIVERY;
    if (targetOrderStatus === OrderStatus.READY_FOR_DISPATCH) {
      targetCustomerStatus = isStorePickup
        ? CustomerVisibleStatus.READY_FOR_PICKUP
        : CustomerVisibleStatus.READY_TO_SHIP;
    } else if (targetOrderStatus === OrderStatus.OUT_FOR_DELIVERY) {
      targetCustomerStatus = CustomerVisibleStatus.OUT_FOR_DELIVERY;
    } else if (targetOrderStatus === OrderStatus.DELIVERED) {
      targetCustomerStatus = CustomerVisibleStatus.DELIVERED;
    }

    // Determine ShipmentStatus
    let targetShipmentStatus: ShipmentStatus = ShipmentStatus.IN_TRANSIT;
    if (dto.targetShipmentStatus) {
      targetShipmentStatus = dto.targetShipmentStatus as ShipmentStatus;
    } else if (targetOrderStatus === OrderStatus.READY_FOR_DISPATCH) {
      targetShipmentStatus = ShipmentStatus.MANIFESTED;
    } else if (targetOrderStatus === OrderStatus.OUT_FOR_DELIVERY) {
      targetShipmentStatus = ShipmentStatus.OUT_FOR_DELIVERY;
    } else if (targetOrderStatus === OrderStatus.DELIVERED) {
      targetShipmentStatus = ShipmentStatus.DELIVERED;
    }

    // Determine PackageStatus
    let targetPackageStatus: PackageStatus = PackageStatus.MANIFESTED;
    if (targetOrderStatus === OrderStatus.READY_FOR_DISPATCH) {
      targetPackageStatus = PackageStatus.MANIFESTED;
    } else if (targetOrderStatus === OrderStatus.OUT_FOR_DELIVERY) {
      targetPackageStatus = PackageStatus.DISPATCHED;
    } else if (targetOrderStatus === OrderStatus.DELIVERED) {
      targetPackageStatus = PackageStatus.DELIVERED;
    }

    const grossWeightGrams = Math.max(
      50,
      Number(dto.grossWeightGrams) || Number(order.packages?.[0]?.grossWeightGrams) || 500,
    );
    const lengthCm = Math.max(1, Number(dto.lengthCm) || Number(order.packages?.[0]?.lengthCm) || 22);
    const widthCm = Math.max(1, Number(dto.widthCm) || Number(order.packages?.[0]?.widthCm) || 15);
    const heightCm = Math.max(1, Number(dto.heightCm) || Number(order.packages?.[0]?.heightCm) || 10);
    const packageCount = Math.max(1, Number(dto.packageCount) || order.packages?.length || 1);

    const now = new Date();
    const fromStatus = order.status;

    // Construct a clear customer-facing status history message
    const statusParts: string[] = [];
    if (targetOrderStatus === OrderStatus.READY_FOR_DISPATCH) {
      if (isStorePickup) {
        statusParts.push(`Order packed and ready for store counter pickup.`);
      } else {
        statusParts.push(
          `Shipment manifested with ${courierName} (AWB: ${rawAwb}). Ready for dispatch.`,
        );
      }
    } else if (targetOrderStatus === OrderStatus.OUT_FOR_DELIVERY) {
      statusParts.push(
        `Dispatched via ${courierName} (AWB / Tracking #: ${rawAwb}). Shipment is in transit / out for delivery.`,
      );
    } else if (targetOrderStatus === OrderStatus.DELIVERED) {
      if (isStorePickup) {
        statusParts.push(
          `Order collected at store counter${dto.receiverName ? ` by ${dto.receiverName}` : ''}${
            dto.receiverPhone ? ` (${dto.receiverPhone})` : ''
          }.`,
        );
      } else {
        statusParts.push(
          `Delivered successfully via ${courierName} (AWB: ${rawAwb})${
            dto.receiverName ? ` • Received by: ${dto.receiverName}` : ''
          }.`,
        );
      }
    }

    if (dto.manifestReference?.trim()) {
      statusParts.push(`Manifest Ref: ${dto.manifestReference.trim()}.`);
    }
    if (dto.dispatchNotes?.trim()) {
      statusParts.push(dto.dispatchNotes.trim());
    }

    const historyReason = statusParts.join(' ');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Upsert or Update Shipment
      let shipment = order.packages?.[0]?.shipment || null;

      // Ensure AWB uniqueness if creating/changing AWB
      let resolvedAwb = rawAwb;
      const awbConflict = await tx.shipment.findUnique({
        where: { awbNumber: resolvedAwb },
      });
      if (awbConflict && (!shipment || awbConflict.id !== shipment.id)) {
        resolvedAwb = `${rawAwb}-${order.orderNumber.slice(-4)}`;
      }

      if (shipment) {
        shipment = await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            courierName,
            awbNumber: resolvedAwb,
            trackingUrl: trackingUrl || null,
            status: targetShipmentStatus,
            manifestedAt: shipment.manifestedAt || now,
            ...(targetOrderStatus === OrderStatus.OUT_FOR_DELIVERY ||
            targetOrderStatus === OrderStatus.DELIVERED
              ? { dispatchedAt: shipment.dispatchedAt || now }
              : {}),
            ...(targetOrderStatus === OrderStatus.DELIVERED ? { deliveredAt: now } : {}),
          },
        });
      } else {
        const shipmentNumber = `SHP-${datePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        shipment = await tx.shipment.create({
          data: {
            shipmentNumber,
            courierName,
            awbNumber: resolvedAwb,
            trackingUrl: trackingUrl || null,
            status: targetShipmentStatus,
            manifestedAt: now,
            dispatchedAt:
              targetOrderStatus === OrderStatus.OUT_FOR_DELIVERY ||
              targetOrderStatus === OrderStatus.DELIVERED
                ? now
                : null,
            deliveredAt: targetOrderStatus === OrderStatus.DELIVERED ? now : null,
          },
        });
      }

      // 2. Ensure Package records exist and link to Shipment
      if (!order.packages || order.packages.length === 0) {
        for (let i = 1; i <= packageCount; i++) {
          const pkgNumber = `${order.orderNumber}-PKG-${String(i).padStart(2, '0')}`;
          const barcode = `BAR-${datePrefix}-${order.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}-${i}`;
          await tx.package.create({
            data: {
              orderId: order.id,
              packageNumber: pkgNumber,
              sequenceNumber: i,
              totalPackages: packageCount,
              grossWeightGrams: Math.round(grossWeightGrams / packageCount),
              lengthCm,
              widthCm,
              heightCm,
              status: targetPackageStatus,
              barcode,
              labelUrl: `/api/v1/packages/label/${barcode}`,
              shipmentId: shipment.id,
            },
          });
        }
      } else {
        await tx.package.updateMany({
          where: { orderId: order.id },
          data: {
            grossWeightGrams,
            lengthCm,
            widthCm,
            heightCm,
            totalPackages: packageCount,
            status: targetPackageStatus,
            shipmentId: shipment.id,
          },
        });
      }

      // 3. Update Order status & customerStatus
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: targetOrderStatus,
          customerStatus: targetCustomerStatus,
          deliveryMethod,
        },
        include: {
          customer: true,
          shippingAddress: true,
          items: true,
          packages: {
            include: { shipment: true },
            orderBy: { sequenceNumber: 'asc' },
          },
        },
      });

      // 4. Create OrderStatusHistory entry (visible on Customer Tracking)
      const statusEntry = await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus,
          toStatus: targetOrderStatus,
          changedById: staffId || null,
          reason: historyReason,
          notes: dto.dispatchNotes?.trim() || null,
        },
        include: {
          changedBy: { select: { fullName: true, role: true } },
        },
      });

      return { updatedOrder, shipment, statusEntry };
    });

    // 5. Audit Log with Manual Verification Checklist
    await this.auditService.log({
      actorId: staffId,
      action: 'MANUAL_DISPATCH_COURIER_UPDATE',
      entity: 'Order',
      entityId: order.id,
      orderId: order.id,
      previousState: {
        status: fromStatus,
        courierName: order.packages?.[0]?.shipment?.courierName || null,
        awbNumber: order.packages?.[0]?.shipment?.awbNumber || null,
      },
      newState: {
        status: targetOrderStatus,
        customerStatus: targetCustomerStatus,
        shipmentStatus: targetShipmentStatus,
        courierName,
        awbNumber: result.shipment.awbNumber,
        trackingUrl: result.shipment.trackingUrl,
        manifestReference: dto.manifestReference || null,
        grossWeightGrams,
        packageCount,
        manualChecks: dto.manualChecks || {},
        receiverName: dto.receiverName || null,
      },
      reason: historyReason,
    });

    this.eventEmitter.emit('dispatch.manual.updated', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: targetOrderStatus,
      courierName,
      awbNumber: result.shipment.awbNumber,
      trackingUrl: result.shipment.trackingUrl,
    });

    return {
      ...result.updatedOrder,
      shipment: result.shipment,
      latestStatusHistory: result.statusEntry,
    };
  }

  /**
   * Courier Dispatch Handover:
   * Scans package barcodes, checks manifest, updates shipment to IN_TRANSIT, order to OUT_FOR_DELIVERY
   */
  async confirmCourierHandover(dto: CourierHandoverDto, staffId: string) {
    return this.manualCourierUpdate(
      dto.orderId,
      {
        deliveryMethod: 'COURIER',
        courierName: dto.courierName,
        awbNumber: dto.awbNumber,
        trackingUrl: dto.trackingUrl,
        manifestReference: dto.manifestReference,
        targetOrderStatus: 'OUT_FOR_DELIVERY',
        targetShipmentStatus: 'IN_TRANSIT',
        dispatchNotes: dto.notes,
        manualChecks: {
          packageSealedAndLabeled: true,
          awbMatchedWithParcel: true,
        },
      },
      staffId,
    );
  }

  /**
   * Counter Store Pickup Handover:
   * Mandatory check for unpaid balance; verifies collector identity; transitions order directly to DELIVERED
   */
  async confirmStorePickup(dto: StorePickupHandoverDto, staffId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: dto.orderId }, { orderNumber: dto.orderId }],
      },
    });

    if (!order) throw new NotFoundException(`Order '${dto.orderId}' not found`);

    // Strict Financial Check: Block release if outstanding balance exists
    const balance = Number(order.balanceAmount);
    if (balance > 0) {
      throw new BadRequestException(
        `Store Pickup BLOCKED: Outstanding balance of ₹${balance.toFixed(2)} must be settled at counter first.`,
      );
    }

    return this.manualCourierUpdate(
      order.id,
      {
        deliveryMethod: 'STORE_PICKUP',
        courierName: 'Factory Store Counter Pickup',
        targetOrderStatus: 'DELIVERED',
        targetShipmentStatus: 'DELIVERED',
        receiverName: dto.collectorName,
        receiverPhone: dto.collectorPhone,
        dispatchNotes: dto.notes
          ? `${dto.notes}${dto.idProofType ? ` (ID: ${dto.idProofType} ${dto.idProofNumber || ''})` : ''}`
          : dto.idProofType
          ? `Verified ID: ${dto.idProofType} ${dto.idProofNumber || ''}`
          : undefined,
        manualChecks: {
          paymentClearanceVerified: true,
          podOrReceiverVerified: true,
        },
      },
      staffId,
    );
  }

  /**
   * Confirm Courier Delivery (e.g. via courier webhook or manual POD confirmation)
   */
  async confirmCourierDelivery(orderId: string, receiverName?: string, staffId?: string) {
    return this.manualCourierUpdate(
      orderId,
      {
        targetOrderStatus: 'DELIVERED',
        targetShipmentStatus: 'DELIVERED',
        receiverName: receiverName || 'Customer',
        manualChecks: {
          podOrReceiverVerified: true,
        },
      },
      staffId,
    );
  }

  /**
   * Get detailed shipment weight and courier calculation for dispatch inspection
   */
  async getOrderDispatchDetails(orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        customer: true,
        shippingAddress: true,
        items: {
          include: {
            product: {
              include: { packagingProfile: true },
            },
          },
        },
        packages: {
          include: { shipment: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }

    const firstItem = order.items[0];
    const product = firstItem?.product;
    const qty = firstItem?.quantity || 1;
    const destinationPincode =
      order.shippingAddress?.postalCode || (order as any).shippingPincode || '600001';

    // 1. Authoritative calculated weight & shipping estimate
    const calc = await this.shippingCalculatorService.calculateShipping({
      productId: product?.id,
      quantity: qty,
      destinationPincode,
      orderSubtotal: Number(order.subtotal || 0),
      deliveryMethod: order.deliveryMethod === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'COURIER',
    });

    // 2. Physical measured weight from packed packages (if any)
    const measuredGrossWeightGrams = order.packages.reduce(
      (sum, p) => sum + (Number(p.grossWeightGrams) || 0),
      0,
    );
    const hasMeasured = measuredGrossWeightGrams > 0;

    // 3. Recalculate courier if measured differs
    let recalculatedCourier: any = null;
    let weightVarianceGrams = 0;
    if (hasMeasured) {
      weightVarianceGrams = measuredGrossWeightGrams - calc.actualWeightGrams;
      recalculatedCourier = await this.shippingCalculatorService.calculateShipping({
        productId: product?.id,
        quantity: 1,
        customUnitWeightGrams: Math.max(
          1,
          measuredGrossWeightGrams - (calc.packaging.weightGrams || 0),
        ),
        destinationPincode,
        orderSubtotal: Number(order.subtotal || 0),
        deliveryMethod: order.deliveryMethod === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'COURIER',
      });
    }

    const primaryPkg = order.packages?.[0] || null;
    const shipment = primaryPkg?.shipment || null;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      deliveryMethod: order.deliveryMethod,
      destinationPincode,
      customerName: order.customer?.fullName || 'Customer',
      customerPhone: order.customer?.phone || '',
      shippingAddress: order.shippingAddress,
      productQuantity: qty,
      productName: product?.name || firstItem?.productName || 'Printed Item',
      configuredProductWeightGrams: calc.productWeightGrams,
      packagingWeightGrams: calc.packaging.weightGrams,
      actualShipmentWeightGrams: calc.actualWeightGrams,
      volumetricWeightGrams: calc.volumetricWeightGrams,
      billableWeightGrams: calc.billableWeightGrams,
      expectedCourierShippingAmount: calc.finalShippingAmount,
      zoneCode: calc.zone?.code || 'STANDARD',
      measuredGrossWeightGrams: hasMeasured ? measuredGrossWeightGrams : null,
      weightVarianceGrams: hasMeasured ? weightVarianceGrams : 0,
      recalculatedShippingAmount: recalculatedCourier
        ? recalculatedCourier.finalShippingAmount
        : calc.finalShippingAmount,
      isVarianceDetected: hasMeasured && Math.abs(weightVarianceGrams) > 10,
      packages: order.packages,
      shipment,
    };
  }

  /**
   * Enter actual measured shipment weight and record audit-logged variance
   */
  async adjustDispatchWeight(
    orderId: string,
    dto: { measuredWeightGrams: number; reason?: string },
    staffId: string,
  ) {
    const details = await this.getOrderDispatchDetails(orderId);

    const measuredWeight = Math.max(1, Number(dto.measuredWeightGrams));
    const varianceGrams = measuredWeight - details.actualShipmentWeightGrams;

    // Recalculate courier charge on measured weight
    const recalculated = await this.shippingCalculatorService.calculateShipping({
      quantity: 1,
      customUnitWeightGrams: Math.max(1, measuredWeight - details.packagingWeightGrams),
      destinationPincode: details.destinationPincode,
      orderSubtotal: 0,
      deliveryMethod: 'COURIER',
    });

    // Update package gross weights if package exists
    await this.prisma.package.updateMany({
      where: { orderId: details.orderId },
      data: { grossWeightGrams: measuredWeight },
    });

    // Audit log the dispatch weight adjustment
    await this.auditService.log({
      actorId: staffId,
      action: 'DISPATCH_WEIGHT_ADJUSTED',
      entity: 'Order',
      entityId: details.orderId,
      orderId: details.orderId,
      previousState: {
        estimatedWeightGrams: details.actualShipmentWeightGrams,
        estimatedCourierCharge: details.expectedCourierShippingAmount,
      },
      newState: {
        measuredWeightGrams: measuredWeight,
        varianceGrams,
        recalculatedCourierCharge: recalculated.finalShippingAmount,
        reason: dto.reason || 'Physical scale weight measured at dispatch handover',
        adjustedAt: new Date(),
      },
      reason: `Dispatch weight adjustment: ${details.actualShipmentWeightGrams}g -> ${measuredWeight}g (Variance: ${
        varianceGrams > 0 ? '+' : ''
      }${varianceGrams}g). Expected: ₹${details.expectedCourierShippingAmount}, Recalculated: ₹${
        recalculated.finalShippingAmount
      }.`,
    });

    return {
      success: true,
      orderId: details.orderId,
      orderNumber: details.orderNumber,
      estimatedWeightGrams: details.actualShipmentWeightGrams,
      measuredWeightGrams: measuredWeight,
      varianceGrams,
      estimatedCourierCharge: details.expectedCourierShippingAmount,
      recalculatedCourierCharge: recalculated.finalShippingAmount,
      reason: dto.reason || 'Physical scale measurement verified',
    };
  }
}
