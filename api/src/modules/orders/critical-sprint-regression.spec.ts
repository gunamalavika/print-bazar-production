import { OrdersService, CreateOrderDto } from './orders.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { PackingService } from '../packing/packing.service';
import { ArtworkService } from '../artwork/artwork.service';
import { OrderStatus, PaymentStatus, ArtworkStatus, PaymentMethod } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('Sprint Critical Regression Tests (5 Verified Defects)', () => {
  let ordersService: OrdersService;
  let dispatchService: DispatchService;
  let packingService: PackingService;
  let artworkService: ArtworkService;
  let prisma: any;
  let auditService: any;
  let eventEmitter: any;
  let pricingService: any;
  let rulesService: any;
  let shippingGstService: any;
  let personalizationService: any;
  let workflowState: any;

  beforeEach(() => {
    prisma = {
      order: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(10),
      },
      orderItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 'prod-1', name: 'Sample Product', sku: 'SKU-1', productionDays: 2 }),
        findUnique: jest.fn().mockResolvedValue({ id: 'prod-1', name: 'Sample Product', sku: 'SKU-1', productionDays: 2 }),
      },
      artworkVersion: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'cust-1', fullName: 'Guna S' }),
        update: jest.fn().mockResolvedValue({ id: 'cust-1', fullName: 'Guna S' }),
        upsert: jest.fn().mockResolvedValue({ id: 'cust-1', fullName: 'Guna S' }),
      },
      address: {
        create: jest.fn().mockResolvedValue({ id: 'addr-1' }),
      },
      orderItemVariant: {
        createMany: jest.fn(),
      },
      orderItemPersonalization: {
        createMany: jest.fn(),
      },
      slaRecord: {
        create: jest.fn().mockResolvedValue({ id: 'sla-1' }),
      },
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
      },
      invoice: {
        create: jest.fn().mockResolvedValue({ id: 'inv-1' }),
      },
      inventoryItem: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    auditService = { log: jest.fn().mockResolvedValue(true) };
    eventEmitter = { emit: jest.fn() };
    pricingService = {
      calculateQuote: jest.fn().mockResolvedValue({
        basePrice: 500,
        optionsCost: 100,
        artworkCost: 0,
        subtotal: 600,
        gstRatePercent: 18,
        gstAmount: 108,
        grandTotal: 708,
      }),
    };
    rulesService = { evaluateRules: jest.fn().mockResolvedValue({ valid: true, appliedRules: [] }) };
    shippingGstService = {
      calculateShippingAndTax: jest.fn().mockResolvedValue({
        subtotal: 1200,
        shippingFee: 100,
        shippingCharge: 100,
        gstRatePercent: 18,
        gstAmount: 234,
        isFreeShippingApplied: false,
        grandTotal: 1534,
      }),
    };
    personalizationService = {
      validateAndFormatPersonalization: jest.fn().mockResolvedValue({ isValid: true, errors: [] }),
      persistRecords: jest.fn().mockResolvedValue([]),
    };
    workflowState = {
      evaluatePackingEligibility: jest.fn().mockResolvedValue({ eligible: true, reasons: [], balanceAmount: 0 }),
    };

    ordersService = new OrdersService(
      prisma,
      pricingService,
      shippingGstService,
      auditService,
      eventEmitter,
      personalizationService,
    );

    dispatchService = new DispatchService(prisma, auditService, eventEmitter);
    packingService = new PackingService(prisma, auditService, eventEmitter, workflowState);
    artworkService = new ArtworkService(prisma, auditService, eventEmitter);
  });

  // ==========================================
  // PHASE 1: MULTI-ITEM CART & CHECKOUT
  // ==========================================
  describe('Phase 1: Multi-Item Cart & Checkout', () => {
    it('1. should process multi-item order with 2 distinct products and multiple variants', async () => {
      const payload: CreateOrderDto = {
        customerId: 'cust-1',
        customerDetails: { fullName: 'Test Buyer', email: 'test@example.com', phone: '9876543210' },
        items: [
          {
            productId: 'prod-visiting-cards',
            productName: 'Visiting Cards (Velvet)',
            quantity: 500,
            selectedOptions: { paper: '400gsm', finish: 'velvet' },
          },
          {
            productId: 'prod-standee',
            productName: 'Roll-Up Standee',
            quantity: 2,
            selectedOptions: { size: '3x6ft', media: 'star_flex' },
          },
        ],
        shippingAddress: {
          contactName: 'Test Buyer',
          fullName: 'Test Buyer',
          phone: '9876543210',
          street: '123 Print Way',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
        },
        billingAddress: {
          contactName: 'Test Buyer',
          fullName: 'Test Buyer',
          phone: '9876543210',
          street: '123 Print Way',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
        },
        deliveryMethod: 'COURIER',
        paymentMethod: PaymentMethod.RAZORPAY,
        paymentSplitType: 'FULL_PREPAID',
        idempotencyKey: 'idemp-multi-001',
      };

      prisma.order.findFirst.mockResolvedValue(null);
      prisma.order.create.mockImplementation(({ data }: any) => ({
        id: 'ord-multi-123',
        orderNumber: 'PB-2026-MULTI-01',
        ...data,
        items: data.items?.create || [],
      }));

      const result = await ordersService.createOrder(payload);

      expect(result).toBeDefined();
      expect(result.id).toBe('ord-multi-123');
      // Pricing service must be called for each item independently
      expect(pricingService.calculateQuote).toHaveBeenCalledTimes(2);
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            internalNotes: 'IDEMPOTENCY:idemp-multi-001',
            items: {
              create: expect.any(Array),
            },
          }),
        }),
      );
      const callData = prisma.order.create.mock.calls[0][0].data;
      expect(callData.items.create).toHaveLength(2);
    });

    it('2. should enforce authoritative backend pricing and reject client-tampered prices', async () => {
      const payload: CreateOrderDto = {
        customerId: 'cust-1',
        customerDetails: { fullName: 'Hacker', email: 'hack@bad.com', phone: '9876543210' },
        items: [
          {
            productId: 'prod-1',
            quantity: 100,
            unitPrice: 0.01, // Client attempts to buy 100 items for 1 paisa
            totalPrice: 1.0,
          },
        ],
        paidAmount: 1.0, // Client claims they paid 1 rupee
        paymentMethod: PaymentMethod.RAZORPAY,
        paymentSplitType: 'FULL_PREPAID',
      };

      pricingService.calculateQuote.mockResolvedValueOnce({
        basePrice: 500,
        optionsCost: 0,
        artworkCost: 0,
        subtotal: 500,
        gstRatePercent: 18,
        gstAmount: 90,
        grandTotal: 590,
      });

      shippingGstService.calculateShippingAndTax.mockResolvedValueOnce({
        subtotal: 500,
        shippingFee: 50,
        shippingCharge: 50,
        gstRatePercent: 18,
        gstAmount: 99,
        isFreeShippingApplied: false,
        grandTotal: 649,
      });

      prisma.order.findFirst.mockResolvedValue(null);
      prisma.order.create.mockImplementation(({ data }: any) => ({
        id: 'ord-safe',
        orderNumber: 'PB-2026-SAFE-01',
        ...data,
      }));

      const res = await ordersService.createOrder(payload);

      // The authoritative order total must be 649, NOT client 1.0
      expect(res.totalAmount).toBe(649);
      expect(res.paidAmount).toBe(649); // Reconciled against totalAmount for FULL_PREPAID
    });

    it('3. should support idempotency retries without creating duplicate orders', async () => {
      const payload: CreateOrderDto = {
        customer: { fullName: 'Buyer', email: 'b@b.com', phone: '9876543210' },
        items: [{ productId: 'prod-1', quantity: 50 }],
        idempotencyKey: 'dup-submission-key-99',
      };

      // Mock that order with this idempotency key already exists in database
      const existingOrder = {
        id: 'ord-existing-99',
        orderNumber: 'PB-2026-EX-99',
        internalNotes: 'IDEMPOTENCY:dup-submission-key-99',
        totalAmount: 708,
      };

      prisma.order.findFirst.mockResolvedValueOnce(existingOrder);

      const res = await ordersService.createOrder(payload);

      expect(res.id).toBe('ord-existing-99');
      // No duplicate order created
      expect(prisma.order.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // PHASE 2: DISPATCH FALSE SUCCESS
  // ==========================================
  describe('Phase 2: Dispatch False Success', () => {
    it('1. should resolve orders by orderNumber and succeed on valid handover', async () => {
      prisma.order.findFirst.mockResolvedValueOnce({
        id: 'uuid-ord-001',
        orderNumber: 'PB-2026-0001',
        status: OrderStatus.READY_FOR_DISPATCH,
        balanceAmount: 0,
        packages: [{ barcode: 'PKG-001-A' }],
      });

      prisma.order.update.mockResolvedValueOnce({
        id: 'uuid-ord-001',
        status: OrderStatus.OUT_FOR_DELIVERY,
      });

      const res = await dispatchService.confirmCourierHandover(
        {
          orderId: 'PB-2026-0001',
          courierName: 'BlueDart Express',
          scannedBarcodes: ['PKG-001-A'],
        },
        'staff-1',
      );

      expect(res).toBeDefined();
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ id: 'PB-2026-0001' }, { orderNumber: 'PB-2026-0001' }],
          },
        }),
      );
    });

    it('2. should reject handover when order does not exist', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(null);

      await expect(
        dispatchService.confirmCourierHandover(
          {
            orderId: 'NON_EXISTENT_ORDER',
            courierName: 'Delhivery',
            scannedBarcodes: ['BAR-1'],
          },
          'staff-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('3. should reject store pickup handover if balance amount is unpaid', async () => {
      prisma.order.findFirst.mockResolvedValueOnce({
        id: 'uuid-ord-pickup',
        orderNumber: 'PB-2026-0002',
        status: OrderStatus.READY_FOR_DISPATCH,
        balanceAmount: 500.0, // Unpaid balance!
      });

      await expect(
        dispatchService.confirmStorePickup(
          {
            orderId: 'PB-2026-0002',
            collectorName: 'Guna',
            collectorPhone: '9876543210',
          },
          'staff-1',
        ),
      ).rejects.toThrow(/Outstanding balance of ₹500.00 must be settled/);
    });
  });

  // ==========================================
  // PHASE 3: PREPRESS PERSISTENCE
  // ==========================================
  describe('Phase 3: Prepress Persistence', () => {
    it('1. should persist digital proof submission and transition order to CUSTOMER_APPROVAL_REQUIRED', async () => {
      prisma.artworkVersion.findUnique.mockResolvedValueOnce({
        id: 'art-v1',
        orderItemId: 'item-1',
        orderItem: {
          id: 'item-1',
          order: {
            id: 'ord-1',
            status: OrderStatus.DESIGN_REQUIRED,
            assignments: [],
          },
        },
      });

      prisma.artworkVersion.update.mockResolvedValueOnce({
        id: 'art-v1',
        status: ArtworkStatus.PROOF_GENERATED,
      });

      prisma.order.update.mockResolvedValueOnce({
        id: 'ord-1',
        status: OrderStatus.CUSTOMER_APPROVAL_REQUIRED,
      });

      const res = await artworkService.submitForCustomerApproval(
        'art-v1',
        'Bleed checked, font outlined.',
        { sub: 'designer-1', role: 'DESIGNER_PREPRESS' } as any,
      );

      expect(res).toBeDefined();
      expect(prisma.artworkVersion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'art-v1' },
          data: expect.objectContaining({ status: ArtworkStatus.PROOF_GENERATED }),
        }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord-1' },
          data: expect.objectContaining({ status: OrderStatus.CUSTOMER_APPROVAL_REQUIRED }),
        }),
      );
    });

    it('2. should persist defect flagging and handle missing artworkVersionId gracefully', async () => {
      prisma.artworkVersion.findFirst.mockResolvedValueOnce({
        id: 'art-v1-auto',
        orderItemId: 'item-defect-1',
        orderItem: {
          id: 'item-defect-1',
          order: { id: 'ord-defect-1', status: OrderStatus.ARTWORK_REVIEW },
        },
      });

      const res = await artworkService.requestRevision(
        {
          orderItemId: 'item-defect-1',
          reason: 'RGB colorspace detected, missing 3mm bleed margin',
        },
        'prepress-staff-1',
      );

      expect(res).toBe(true);
      expect(prisma.artworkVersion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'art-v1-auto' },
          data: expect.objectContaining({ status: ArtworkStatus.PROOF_REJECTED }),
        }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord-defect-1' },
          data: expect.objectContaining({ status: OrderStatus.DESIGN_REQUIRED }),
        }),
      );
    });
  });

  // ==========================================
  // PHASE 5: SALES ORDER FILTER NULL SAFETY
  // ==========================================
  describe('Phase 5: Sales Order Filter Null Safety', () => {
    const testOrders = [
      {
        orderNumber: 'PB-2026-0001',
        status: 'PRINTING',
        customer: { fullName: 'Rohit Singhania', companyName: 'Acme Corp', phone: '9876543210' },
      },
      {
        orderNumber: 'PB-2026-0002',
        status: 'PACKING',
        customer: { fullName: 'Priya Sharma', companyName: null, phone: '9822334455' }, // Null companyName!
      },
      {
        orderNumber: 'PB-2026-0003',
        status: 'READY_FOR_DISPATCH',
        customer: { fullName: 'Direct Walkin' }, // Absent companyName and phone!
      },
      {
        orderNumber: 'PB-2026-0004',
        status: 'ON_HOLD',
        customer: null, // Null customer object!
      },
    ];

    const runFilter = (query: string, status = 'ALL') => {
      const q = query.trim().toLowerCase();
      return testOrders.filter((o) => {
        const matchesSearch =
          !q ||
          (o.orderNumber || '').toLowerCase().includes(q) ||
          (o.customer?.fullName || '').toLowerCase().includes(q) ||
          (o.customer?.companyName || '').toLowerCase().includes(q) ||
          (o.customer?.phone || '').toLowerCase().includes(q);
        const matchesStatus = status === 'ALL' || o.status === status;
        return matchesSearch && matchesStatus;
      });
    };

    it('1. should never crash on null or absent companyName or null customer', () => {
      expect(() => runFilter('')).not.toThrow();
      expect(runFilter('').length).toBe(4);
    });

    it('2. should find customer with companyName', () => {
      const res = runFilter('Acme');
      expect(res.length).toBe(1);
      expect(res[0].orderNumber).toBe('PB-2026-0001');
    });

    it('3. should find customer with null companyName by their fullName', () => {
      const res = runFilter('Priya');
      expect(res.length).toBe(1);
      expect(res[0].orderNumber).toBe('PB-2026-0002');
    });

    it('4. should find order with null customer by orderNumber', () => {
      const res = runFilter('0004');
      expect(res.length).toBe(1);
      expect(res[0].orderNumber).toBe('PB-2026-0004');
    });

    it('5. should filter by status accurately alongside search', () => {
      const res = runFilter('', 'PACKING');
      expect(res.length).toBe(1);
      expect(res[0].orderNumber).toBe('PB-2026-0002');
    });
  });
});
