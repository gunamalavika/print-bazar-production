import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { ShippingGstService } from '../shipping-gst/shipping-gst.service';
import { ShippingCalculatorService } from '../shipping/shipping-calculator.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PersonalizationTemplateService } from '../products/personalization/personalization-template.service';
import { BadRequestException } from '@nestjs/common';

describe('OrdersService - Personalization Integration & Regression', () => {
  let service: OrdersService;
  let prisma: any;
  let pricingService: any;
  let shippingGstService: any;
  let auditService: any;
  let eventEmitter: any;
  let personalizationService: any;

  beforeEach(async () => {
    prisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'cust-1', fullName: 'Guna S', email: 'test@example.com' }),
        create: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
      },
      order: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      orderAssignment: {
        updateMany: jest.fn(),
      },
      address: {
        create: jest.fn(),
      },
      orderItemVariant: {
        createMany: jest.fn(),
      },
      orderItemPersonalization: {
        createMany: jest.fn(),
      },
      orderItem: {
        update: jest.fn(),
      },
      slaRecord: {
        create: jest.fn(),
      },
      payment: {
        create: jest.fn(),
      },
      invoice: {
        create: jest.fn(),
      },
      artworkVersion: {
        create: jest.fn(),
      },
      inventoryItem: {
        findFirst: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }
        return callback;
      }),
    };

    pricingService = {
      calculateQuote: jest.fn().mockResolvedValue({
        quantity: 1,
        unitPrice: 500,
        subtotal: 500,
        optionsCost: 0,
        basePrice: 500,
        artworkFee: 0,
        designServiceFee: 0,
        productionDays: 2,
        isMultiVariant: false,
        selectedOptionsSummary: {},
        specificationsSnapshot: {},
      }),
    };

    shippingGstService = {
      calculateShippingAndTax: jest.fn().mockResolvedValue({
        subtotal: 500,
        shippingFee: 50,
        gstAmount: 90,
        isFreeShippingApplied: false,
        matchedZone: 'STANDARD',
        gstRatePercent: 18,
      }),
    };

    auditService = {
      log: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    personalizationService = {
      validatePersonalization: jest.fn(),
      getTemplateById: jest.fn(),
    };

    const shippingCalculatorService = {
      calculateShipping: jest.fn().mockResolvedValue({
        finalShippingAmount: 50,
        isFreeShippingApplied: false,
        zone: 'LOCAL',
        destinationPincode: '600001',
        productWeightGrams: 500,
        packaging: { weightGrams: 50 },
        actualWeightGrams: 550,
        billableWeightGrams: 550,
        rateCard: 'STANDARD',
        matchedSlab: '0-500g',
        baseShippingCharge: 50,
        additionalWeightCharge: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: PricingService, useValue: pricingService },
        { provide: ShippingGstService, useValue: shippingGstService },
        { provide: ShippingCalculatorService, useValue: shippingCalculatorService },
        { provide: AuditService, useValue: auditService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: PersonalizationTemplateService, useValue: personalizationService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should successfully create an order for a legacy product without personalization template', async () => {
    // Legacy product: no personalizationTemplate
    prisma.product.findFirst.mockResolvedValue({
      id: 'prod-legacy-cup',
      sku: 'CUP-WHITE-01',
      name: 'Standard Ceramic Mug',
      status: 'PUBLISHED',
      personalizationTemplate: null,
      artworkRequirement: 'OPTIONAL',
      designServiceRequirement: 'DISABLED',
    });

    prisma.order.findFirst.mockResolvedValue(null); // No prior order with same number
    prisma.order.create.mockResolvedValue({
      id: 'ord-101',
      orderNumber: 'ORD-2026-0001',
      totalAmount: 640,
      sourceChannel: 'WEBSITE',
      items: [
        {
          id: 'item-101',
          productId: 'prod-legacy-cup',
          sku: 'CUP-WHITE-01',
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500,
        },
      ],
    });

    const result = await service.createOrder(
      {
        customerId: 'cust-1',
        paymentMode: 'FULL',
        items: [
          {
            productId: 'prod-legacy-cup',
            quantity: 1,
          },
        ],
      },
      'admin-user-id',
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('ord-101');
    // Ensure no personalization validation was triggered
    expect(personalizationService.validatePersonalization).not.toHaveBeenCalled();
    // Ensure no OrderItemPersonalization records were created
    expect(prisma.orderItemPersonalization.createMany).not.toHaveBeenCalled();
  });

  it('should validate and persist personalization records for a personalized product', async () => {
    const mockTemplate = {
      id: 'tmpl-frames',
      name: 'Personalized Photo Frame',
      isActive: true,
      fields: [
        { code: 'event_title', name: 'Event Title', scope: 'PER_ORDER', isRequired: true },
        { code: 'guest_name', name: 'Guest Name', scope: 'PER_ITEM', isRequired: true },
      ],
    };

    prisma.product.findFirst.mockResolvedValue({
      id: 'prod-frame-01',
      sku: 'FRAME-WOOD-A4',
      name: 'Custom Wooden Photo Frame',
      status: 'PUBLISHED',
      personalizationTemplate: mockTemplate,
      artworkRequirement: 'OPTIONAL',
      designServiceRequirement: 'DISABLED',
    });

    personalizationService.validatePersonalization.mockReturnValue({
      isValid: true,
      errors: [],
      sanitized: {
        templateId: 'tmpl-frames',
        templateName: 'Personalized Photo Frame',
        sharedValues: { event_title: 'Annual Gala' },
        perItemEntries: [
          { itemIndex: 1, values: { guest_name: 'Dr. John Doe' } },
          { itemIndex: 2, values: { guest_name: 'Dr. Jane Smith' } },
        ],
      },
    });

    pricingService.calculateQuote.mockResolvedValue({
      quantity: 2,
      unitPrice: 400,
      subtotal: 800,
      optionsCost: 0,
      basePrice: 800,
      artworkFee: 0,
      designServiceFee: 0,
      productionDays: 3,
      isMultiVariant: false,
      selectedOptionsSummary: {},
      specificationsSnapshot: {},
    });

    prisma.order.findFirst.mockResolvedValue(null);
    prisma.order.create.mockResolvedValue({
      id: 'ord-202',
      orderNumber: 'ORD-2026-0002',
      totalAmount: 940,
      sourceChannel: 'WEBSITE',
      items: [
        {
          id: 'item-202',
          productId: 'prod-frame-01',
          sku: 'FRAME-WOOD-A4',
          quantity: 2,
          unitPrice: 400,
          totalPrice: 800,
        },
      ],
    });

    const result = await service.createOrder(
      {
        customerId: 'cust-1',
        paymentMode: 'FULL',
        items: [
          {
            productId: 'prod-frame-01',
            quantity: 2,
            personalization: {
              templateId: 'tmpl-frames',
              sharedValues: { event_title: 'Annual Gala' },
              perItemEntries: [
                { itemIndex: 1, values: { guest_name: 'Dr. John Doe' } },
                { itemIndex: 2, values: { guest_name: 'Dr. Jane Smith' } },
              ],
            },
          },
        ],
      },
      'admin-user-id',
    );

    expect(result.id).toBe('ord-202');
    expect(personalizationService.validatePersonalization).toHaveBeenCalled();
    expect(prisma.orderItemPersonalization.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          orderItemId: 'item-202',
          itemIndex: 1,
          fieldValues: { guest_name: 'Dr. John Doe' },
          sharedValues: { event_title: 'Annual Gala' },
        }),
        expect.objectContaining({
          orderItemId: 'item-202',
          itemIndex: 2,
          fieldValues: { guest_name: 'Dr. Jane Smith' },
          sharedValues: { event_title: 'Annual Gala' },
        }),
      ],
    });
  });

  it('should reject order creation if personalization validation fails', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'prod-frame-01',
      sku: 'FRAME-WOOD-A4',
      name: 'Custom Wooden Photo Frame',
      status: 'PUBLISHED',
      personalizationTemplate: { id: 'tmpl-frames', isActive: true, fields: [] },
      artworkRequirement: 'OPTIONAL',
      designServiceRequirement: 'DISABLED',
    });

    personalizationService.validatePersonalization.mockReturnValue({
      isValid: false,
      errors: ['Guest Name is required for all items', 'Expected 2 per-item entries, received 1'],
      sanitized: null,
    });

    await expect(
      service.createOrder(
        {
          customerId: 'cust-1',
          paymentMode: 'FULL',
          items: [
            {
              productId: 'prod-frame-01',
              quantity: 2,
              personalization: {
                templateId: 'tmpl-frames',
                sharedValues: {},
                perItemEntries: [{ itemIndex: 1, values: {} }],
              },
            },
          ],
        },
        'admin-user-id',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow customer to cancel an order before it moves to production', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'ord-pre-prod',
      orderNumber: 'PB-20261113-0001',
      customerId: 'cust-1',
      status: 'ORDER_REVIEW',
      customerStatus: 'ORDER_RECEIVED',
      paymentStatus: 'PENDING',
      customer: { id: 'cust-1', userId: 'user-cust-1', email: 'test@example.com' },
      items: [],
      jobCards: [],
      statusHistory: [{ id: 'h-1', toStatus: 'ORDER_CREATED' }],
    });

    prisma.order.update.mockResolvedValue({
      id: 'ord-pre-prod',
      orderNumber: 'PB-20261113-0001',
      status: 'CANCELLED',
      customerStatus: 'CANCELLED',
      paymentStatus: 'CANCELLED',
      statusHistory: [],
    });

    prisma.orderStatusHistory.create.mockResolvedValue({
      id: 'h-2',
      fromStatus: 'ORDER_REVIEW',
      toStatus: 'CANCELLED',
      reason: 'Cancelled by customer: Ordered by mistake',
      createdAt: new Date(),
    });

    const result = await service.cancelOrder('ord-pre-prod', 'Ordered by mistake', {
      sub: 'user-cust-1',
      email: 'test@example.com',
      role: 'CUSTOMER' as any,
      customerId: 'cust-1',
    });

    expect(result.status).toBe('CANCELLED');
    expect(result.canCancel).toBe(false);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ord-pre-prod' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          customerStatus: 'CANCELLED',
        }),
      }),
    );
  });

  it('should block order cancellation once the order has moved to production', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'ord-in-prod',
      orderNumber: 'PB-20261113-0002',
      customerId: 'cust-1',
      status: 'PRODUCTION_QUEUE',
      customerStatus: 'PREPARING_ORDER',
      paymentStatus: 'PAID',
      customer: { id: 'cust-1', userId: 'user-cust-1', email: 'test@example.com' },
      items: [],
      jobCards: [{ id: 'jc-1', status: 'QUEUED' }],
      statusHistory: [{ id: 'h-1', toStatus: 'PRODUCTION_QUEUE' }],
    });

    await expect(
      service.cancelOrder('ord-in-prod', 'Changed mind', {
        sub: 'user-cust-1',
        email: 'test@example.com',
        role: 'CUSTOMER' as any,
        customerId: 'cust-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
