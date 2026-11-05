import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { ShippingGstService } from '../shipping-gst/shipping-gst.service';

describe('Multi-Variant Product Ordering & Selection Behavior Tests', () => {
  let service: PricingService;

  const mockTShirtProduct = {
    id: 'prod-tshirt-001',
    name: 'Custom Premium Crewneck T-Shirt',
    sku: 'TSHIRT-CREW-01',
    pricingModel: 'VOLUME_TIER',
    basePrice: 500.0, // Starting reference rate for MOQ 1 (₹500/pc)
    minQuantity: 5,
    maxQuantity: 1000,
    productionDays: 3,
    allowMultipleVariants: true,
    variantDimensions: ['size', 'color'],
    designServiceRequirement: 'OPTIONAL',
    designServiceFee: 150.0,
    optionGroups: [
      {
        id: 'grp-size',
        code: 'size',
        name: 'Size',
        inputType: 'SELECT',
        selectionBehavior: 'VARIANT_WISE',
        options: [
          { id: 'opt-s', value: 's', label: 'Small (S)', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-m', value: 'm', label: 'Medium (M)', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-l', value: 'l', label: 'Large (L)', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-xl', value: 'xl', label: 'Extra Large (XL)', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-xxl', value: 'xxl', label: 'Double XL (XXL)', priceModifierType: 'FIXED', priceModifier: 50, isActive: true },
          { id: 'opt-3xl', value: '3xl', label: 'Triple XL (3XL)', priceModifierType: 'FIXED', priceModifier: 80, isActive: false }, // Inactive option
        ],
      },
      {
        id: 'grp-color',
        code: 'color',
        name: 'Color',
        inputType: 'RADIO',
        selectionBehavior: 'VARIANT_WISE',
        options: [
          { id: 'opt-black', value: 'black', label: 'Jet Black', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-white', value: 'white', label: 'Pure White', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-navy', value: 'navy', label: 'Navy Blue', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
        ],
      },
      {
        id: 'grp-fabric',
        code: 'fabric',
        name: 'Fabric Type',
        inputType: 'SELECT',
        selectionBehavior: 'SINGLE',
        options: [
          { id: 'opt-cotton', value: 'cotton_100', label: '100% Combed Cotton', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-poly', value: 'poly_blend', label: 'Polyester Blend', priceModifierType: 'FIXED', priceModifier: -20, isActive: true },
        ],
      },
    ],
    pricingMatrices: [
      // Volume tier base rates: 1-9 pcs = ₹300, 10-49 pcs = ₹250, 50+ pcs = ₹200
      { minQty: 1, maxQty: 9, unitPrice: 300.0, attributeCombination: { type: 'BASE', isBasePrice: true } },
      { minQty: 10, maxQty: 49, unitPrice: 250.0, attributeCombination: { type: 'BASE', isBasePrice: true } },
      { minQty: 50, maxQty: 1000, unitPrice: 200.0, attributeCombination: { type: 'BASE', isBasePrice: true } },
    ],
    configurationRules: [],
  };

  const mockStandardProduct = {
    id: 'prod-standard-flyer',
    name: 'A5 Promotional Flyers',
    sku: 'FLYER-A5',
    pricingModel: 'MATRIX',
    basePrice: 500.0,
    minQuantity: 100,
    maxQuantity: 10000,
    allowMultipleVariants: false,
    variantDimensions: [],
    optionGroups: [
      {
        id: 'grp-paper',
        code: 'paper',
        name: 'Paper Stock',
        inputType: 'SELECT',
        selectionBehavior: 'SINGLE',
        options: [
          { id: 'opt-170', value: '170gsm', label: '170 GSM Gloss', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
        ],
      },
    ],
    pricingMatrices: [
      { minQty: 100, maxQty: 499, unitPrice: 2.0, attributeCombination: {} },
      { minQty: 500, maxQty: 10000, unitPrice: 1.5, attributeCombination: {} },
    ],
    configurationRules: [],
  };

  const mockPrismaService = {
    product: {
      findFirst: jest.fn().mockImplementation((args) => {
        const orConditions = args?.where?.OR || [];
        const idCond = orConditions.find((c: any) => c.id);
        const targetId = idCond?.id || args?.where?.id;

        if (targetId === mockTShirtProduct.id) {
          return Promise.resolve(mockTShirtProduct);
        }
        if (targetId === mockStandardProduct.id) {
          return Promise.resolve(mockStandardProduct);
        }
        return Promise.resolve(null);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockTShirtProduct.id) {
          return Promise.resolve(mockTShirtProduct);
        }
        if (where.id === mockStandardProduct.id) {
          return Promise.resolve(mockStandardProduct);
        }
        return Promise.resolve(null);
      }),
    },
    promotionOffer: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    couponCode: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  const mockShippingGstService = {
    calculateShippingAndTax: jest.fn().mockResolvedValue({
      taxableAmount: 1000,
      cgstAmount: 90,
      sgstAmount: 90,
      igstAmount: 0,
      totalTax: 180,
      shippingAmount: 100,
      shippingGst: 18,
      grandTotal: 1298,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ShippingGstService, useValue: mockShippingGstService },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('1. Existing single-selection products continue working without multi-variant behavior', async () => {
    const quote = await service.calculateQuote({
      productId: mockStandardProduct.id,
      quantity: 100,
      options: [{ optionCode: 'paper', valueCode: '170gsm' }],
    });

    expect(quote).toBeDefined();
    expect(quote.quantity).toBe(100);
    expect(quote.unitPrice).toBe(2.0);
    expect(quote.subtotal).toBe(200.0);
    expect(quote.variantLines).toBeUndefined();
  });

  it('2. Multi-variant T-shirt supports mixed sizes and colors in a single order with independent quantities', async () => {
    // Immediate business requirement:
    // Medium / Black — 2 pieces (₹300/pc = ₹600)
    // XL / White — 2 pieces (₹300/pc = ₹600)
    // XXL / Black — 1 piece (₹300 base + ₹50 XXL modifier = ₹350/pc = ₹350)
    // Total: 5 pieces, subtotal = ₹1,550
    const quote = await service.calculateQuote({
      productId: mockTShirtProduct.id,
      quantity: 5,
      options: [{ optionCode: 'fabric', valueCode: 'cotton_100' }],
      variantLines: [
        { combination: { size: 'm', color: 'black' }, quantity: 2 },
        { combination: { size: 'xl', color: 'white' }, quantity: 2 },
        { combination: { size: 'xxl', color: 'black' }, quantity: 1 },
      ],
    });

    expect(quote).toBeDefined();
    expect(quote.quantity).toBe(5); // 2 + 2 + 1 = 5 pieces total
    expect(quote.variantLines).toHaveLength(3);

    // Line 1: M / Black
    expect(quote.variantLines![0].quantity).toBe(2);
    expect(quote.variantLines![0].unitPrice).toBe(300);
    expect(quote.variantLines![0].lineSubtotal).toBe(600);

    // Line 2: XL / White
    expect(quote.variantLines![1].quantity).toBe(2);
    expect(quote.variantLines![1].unitPrice).toBe(300);
    expect(quote.variantLines![1].lineSubtotal).toBe(600);

    // Line 3: XXL / Black (with +₹50 size modifier)
    expect(quote.variantLines![2].quantity).toBe(1);
    expect(quote.variantLines![2].unitPrice).toBe(350);
    expect(quote.variantLines![2].lineSubtotal).toBe(350);

    // Total subtotal: 600 + 600 + 350 = 1550
    expect(quote.subtotal).toBe(1550);
  });

  it('3. Volume tier bracket is determined by total order quantity (e.g. 10 pcs unlocks 10-49 tier rate)', async () => {
    // 5 M/Black + 5 XL/White = 10 pcs total
    // 10 pcs qualifies for tier 10-49 pcs where base rate is ₹250 instead of ₹300!
    const quote = await service.calculateQuote({
      productId: mockTShirtProduct.id,
      quantity: 10,
      options: [{ optionCode: 'fabric', valueCode: 'cotton_100' }],
      variantLines: [
        { combination: { size: 'm', color: 'black' }, quantity: 5 },
        { combination: { size: 'xl', color: 'white' }, quantity: 5 },
      ],
    });

    expect(quote.quantity).toBe(10);
    expect(quote.variantLines![0].unitPrice).toBe(250);
    expect(quote.variantLines![0].lineSubtotal).toBe(1250);
    expect(quote.variantLines![1].unitPrice).toBe(250);
    expect(quote.variantLines![1].lineSubtotal).toBe(1250);
    expect(quote.subtotal).toBe(2500);
  });

  it('4. Duplicate variant combinations are merged into a single consolidated line', async () => {
    // Submitting M/Black: 2 and M/Black: 3 should merge into M/Black: 5
    const quote = await service.calculateQuote({
      productId: mockTShirtProduct.id,
      quantity: 5,
      options: [{ optionCode: 'fabric', valueCode: 'cotton_100' }],
      variantLines: [
        { combination: { size: 'm', color: 'black' }, quantity: 2 },
        { combination: { size: 'm', color: 'black' }, quantity: 3 },
      ],
    });

    expect(quote.variantLines).toHaveLength(1);
    expect(quote.variantLines![0].quantity).toBe(5);
    expect(quote.variantLines![0].lineSubtotal).toBe(1500);
    expect(quote.quantity).toBe(5);
  });

  it('5. Shared design fee is charged once per product order and not multiplied per variant line', async () => {
    // 3 variant lines, design service = ₹150 flat
    const quote = await service.calculateQuote({
      productId: mockTShirtProduct.id,
      quantity: 5,
      hasDesignService: true,
      options: [{ optionCode: 'fabric', valueCode: 'cotton_100' }],
      variantLines: [
        { combination: { size: 'm', color: 'black' }, quantity: 2 },
        { combination: { size: 'xl', color: 'white' }, quantity: 2 },
        { combination: { size: 's', color: 'navy' }, quantity: 1 },
      ],
    });

    // 5 pcs @ ₹300 = ₹1,500 + ₹150 design fee once = ₹1,650
    expect(quote.designServiceFee).toBe(150);
    expect(quote.subtotal).toBe(1650);
  });

  it('6. Rejects order when total variant quantity is below product minimum order quantity', async () => {
    // MOQ is 5, customer tries to order 3
    await expect(
      service.calculateQuote({
        productId: mockTShirtProduct.id,
        quantity: 3,
        options: [{ optionCode: 'fabric', valueCode: 'cotton_100' }],
        variantLines: [
          { combination: { size: 'm', color: 'black' }, quantity: 2 },
          { combination: { size: 'xl', color: 'white' }, quantity: 1 },
        ],
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('7. Inactive options cannot be ordered in variant combinations', async () => {
    // 3XL is marked isActive: false
    await expect(
      service.calculateQuote({
        productId: mockTShirtProduct.id,
        quantity: 5,
        options: [{ optionCode: 'fabric', valueCode: 'cotton_100' }],
        variantLines: [
          { combination: { size: '3xl', color: 'black' }, quantity: 5 },
        ],
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('8. Server-side validation rejects invalid negative or zero quantities', async () => {
    await expect(
      service.calculateQuote({
        productId: mockTShirtProduct.id,
        quantity: 5,
        options: [{ optionCode: 'fabric', valueCode: 'cotton_100' }],
        variantLines: [
          { combination: { size: 'm', color: 'black' }, quantity: 0 },
        ],
      })
    ).rejects.toThrow(BadRequestException);
  });
});
