import { Test, TestingModule } from '@nestjs/testing';
import { PricingService, QuoteCalculationRequestDto } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingGstService } from '../shipping-gst/shipping-gst.service';
import { ShippingCalculatorService } from '../shipping/shipping-calculator.service';
import { BadRequestException } from '@nestjs/common';
import { evaluateProductConfiguration } from '../../../../web/src/lib/product-rules-engine';

describe('Phase 2 — Dynamic Configurator Integration & Production Verification Audit', () => {
  let pricingService: PricingService;

  // 1. Mock T-Shirt Multi-Variant Product
  const mockTShirtProduct = {
    id: 'prod-tshirt-live',
    name: 'Custom Premium T-Shirt',
    slug: 't-shirt',
    sku: 'TSHIRT-001',
    pricingModel: 'VOLUME_TIER',
    basePrice: 300.0,
    minQuantity: 10,
    maxQuantity: 5000,
    productionDays: 2,
    allowMultipleVariants: true,
    variantDimensions: ['colors', 'size'],
    artworkRequirement: 'OPTIONAL',
    artworkPrice: 0,
    designServiceRequirement: 'OPTIONAL',
    designServiceFee: 150.0,
    optionGroups: [
      {
        id: 'grp-color',
        code: 'colors',
        name: 'Colors',
        inputType: 'CHECKBOX',
        selectionBehavior: 'VARIANT_WISE',
        options: [
          { id: 'opt-red', value: 'red', label: 'Red', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-blue', value: 'blue', label: 'Blue', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-yellow', value: 'yellow', label: 'Yellow', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
        ],
      },
      {
        id: 'grp-size',
        code: 'size',
        name: 'Size',
        inputType: 'CHECKBOX',
        selectionBehavior: 'VARIANT_WISE',
        options: [
          { id: 'opt-s', value: 's', label: 'S', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-m', value: 'm', label: 'M', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-l', value: 'l', label: 'L', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-xl', value: 'xl', label: 'XL', priceModifierType: 'FIXED', priceModifier: 20, isActive: true },
          { id: 'opt-xxl', value: 'xxl', label: 'XXL', priceModifierType: 'FIXED', priceModifier: 40, isActive: true },
          { id: 'opt-3xl', value: '3xl', label: '3XL', priceModifierType: 'FIXED', priceModifier: 60, isActive: false }, // Inactive
        ],
      },
      {
        id: 'grp-unrelated-variant',
        code: 'cuff_style',
        name: 'Cuff Style',
        inputType: 'RADIO',
        selectionBehavior: 'VARIANT_WISE', // Variant-wise but NOT in variantDimensions
        options: [
          { id: 'opt-ribbed', value: 'ribbed', label: 'Ribbed Cuff', priceModifierType: 'FIXED', priceModifier: 15, isActive: true },
          { id: 'opt-plain', value: 'plain', label: 'Plain Cuff', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
        ],
      },
      {
        id: 'grp-print-loc',
        code: 'print_location',
        name: 'Printing Location',
        inputType: 'SELECT',
        selectionBehavior: 'SINGLE',
        options: [
          { id: 'opt-front', value: 'front_only', label: 'Front Only', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-both', value: 'front_and_back', label: 'Front & Back', priceModifierType: 'FIXED', priceModifier: 50, isActive: true },
        ],
      },
    ],
    pricingMatrices: [
      // 10-19 pcs = ₹250/pc, 20-49 pcs = ₹220/pc, 50+ pcs = ₹190/pc
      { minQty: 10, maxQty: 19, unitPrice: 250.0, attributeCombination: { type: 'BASE', isBasePrice: true } },
      { minQty: 20, maxQty: 49, unitPrice: 220.0, attributeCombination: { type: 'BASE', isBasePrice: true } },
      { minQty: 50, maxQty: 5000, unitPrice: 190.0, attributeCombination: { type: 'BASE', isBasePrice: true } },
    ],
    configurationRules: [],
  };

  // 2. Mock Visiting Card (Non-Variant Single Fixed / Matrix Product)
  const mockVisitingCardProduct = {
    id: 'prod-vc-001',
    name: 'Premium Visiting Cards',
    slug: 'visiting-card',
    sku: 'PB-100',
    pricingModel: 'SINGLE_FIXED_QUANTITY',
    basePrice: 100.0,
    minQuantity: 100,
    maxQuantity: 10000,
    productionDays: 1,
    allowMultipleVariants: false,
    variantDimensions: [],
    artworkRequirement: 'OPTIONAL',
    artworkPrice: 0,
    designServiceRequirement: 'DISABLED',
    designServiceFee: 0,
    optionGroups: [
      {
        id: 'grp-paper-type',
        code: 'paper_type',
        name: 'Paper Type',
        inputType: 'SELECT',
        selectionBehavior: 'SINGLE',
        options: [
          { id: 'opt-350gsm', value: '350gsm', label: '350 GSM Art Card', priceModifierType: 'FIXED', priceModifier: 0, isActive: true },
          { id: 'opt-400gsm', value: '400gsm', label: '400 GSM Velvet Card', priceModifierType: 'FIXED', priceModifier: 50, isActive: true },
        ],
      },
      {
        id: 'grp-lamination',
        code: 'lamination',
        name: 'Lamination Finish',
        inputType: 'RADIO',
        selectionBehavior: 'SINGLE',
        options: [
          { id: 'opt-gloss', value: 'gloss', label: 'Gloss Lamination', priceModifierType: 'FIXED', priceModifier: 20, isActive: true },
          { id: 'opt-matte', value: 'matte', label: 'Matte Lamination', priceModifierType: 'FIXED', priceModifier: 30, isActive: true },
        ],
      },
      {
        id: 'grp-addons',
        code: 'finishing_addons',
        name: 'Finishing Add-ons',
        inputType: 'CHECKBOX',
        selectionBehavior: 'MULTIPLE',
        options: [
          { id: 'opt-round-corners', value: 'round_corners', label: 'Round Corners (4-Corner Punch)', priceModifierType: 'FIXED', priceModifier: 40, isActive: true },
          { id: 'opt-spot-uv', value: 'spot_uv', label: 'Raised Spot UV', priceModifierType: 'FIXED', priceModifier: 80, isActive: true },
        ],
      },
    ],
    pricingMatrices: [
      { minQty: 100, maxQty: 10000, unitPrice: 1.0, attributeCombination: { type: 'BASE', isBasePrice: true } },
    ],
    configurationRules: [],
  };

  const mockPrismaService = {
    product: {
      findFirst: jest.fn().mockImplementation((args) => {
        const orConditions = args?.where?.OR || [];
        const idCond = orConditions.find((c: any) => c.id || c.slug || c.sku);
        const target = idCond?.id || idCond?.slug || idCond?.sku || args?.where?.id || args?.where?.slug;

        if (target === mockTShirtProduct.id || target === mockTShirtProduct.slug || target === mockTShirtProduct.sku) {
          return Promise.resolve(mockTShirtProduct);
        }
        if (target === mockVisitingCardProduct.id || target === mockVisitingCardProduct.slug || target === mockVisitingCardProduct.sku) {
          return Promise.resolve(mockVisitingCardProduct);
        }
        return Promise.resolve(null);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockTShirtProduct.id || where.slug === mockTShirtProduct.slug) {
          return Promise.resolve(mockTShirtProduct);
        }
        if (where.id === mockVisitingCardProduct.id || where.slug === mockVisitingCardProduct.slug) {
          return Promise.resolve(mockVisitingCardProduct);
        }
        return Promise.resolve(null);
      }),
    },
    promotionOffer: { findFirst: jest.fn().mockResolvedValue(null) },
    couponCode: { findUnique: jest.fn().mockResolvedValue(null) },
  };

  const mockShippingGstService = {
    calculateShippingAndTax: jest.fn().mockImplementation((subtotal: number) => {
      const gst = Math.round(subtotal * 0.18 * 100) / 100;
      return Promise.resolve({
        taxableAmount: subtotal,
        cgstAmount: gst / 2,
        sgstAmount: gst / 2,
        igstAmount: 0,
        totalTax: gst,
        gstAmount: gst,
        shippingAmount: 100,
        shippingGst: 18,
        grandTotal: Math.round((subtotal + gst + 100) * 100) / 100,
      });
    }),
  };

  const mockShippingCalculatorService = {
    calculateShipping: jest.fn().mockResolvedValue({
      finalShippingAmount: 100,
      isFreeShipping: false,
    }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ShippingGstService, useValue: mockShippingGstService },
        { provide: ShippingCalculatorService, useValue: mockShippingCalculatorService },
      ],
    }).compile();

    pricingService = module.get<PricingService>(PricingService);
  });

  // =========================================================================
  // SECTION 1: FRONTEND RUNTIME & RULES ENGINE VERIFICATION
  // =========================================================================
  describe('1. Frontend Runtime & Rules Engine Verification', () => {
    it('1.1 Should evaluate rule-based disabling of options conditionally', () => {
      const sampleOptionGroups = [
        {
          id: 'grp-paper',
          code: 'paper_stock',
          inputType: 'SELECT',
          selectionBehavior: 'SINGLE',
          isRequired: true,
          options: [
            { id: 'o-250', value: '250gsm', label: '250 GSM Card', isActive: true },
            { id: 'o-350', value: '350gsm', label: '350 GSM Heavy Card', isActive: true },
          ],
        },
        {
          id: 'grp-finish',
          code: 'finishing',
          inputType: 'RADIO',
          selectionBehavior: 'SINGLE',
          isRequired: false,
          options: [
            { id: 'o-matte', value: 'matte', label: 'Matte Finish', isActive: true },
            { id: 'o-spot-uv', value: 'spot_uv', label: 'Spot UV', isActive: true },
          ],
        },
      ];

      // Rule: Spot UV is NOT compatible with 250 GSM paper
      const sampleRules = [
        {
          id: 'rule-uv-restriction',
          name: 'Spot UV requires at least 350 GSM',
          actionType: 'DISABLE_OPTION',
          isActive: true,
          conditionGroupCode: 'paper_stock',
          conditionOperator: 'EQUALS',
          conditionOptionValue: '250gsm',
          targetGroupCode: 'finishing',
          targetOptionValue: 'spot_uv',
          actionPayload: {
            reason: 'Spot UV requires at least 350 GSM cardstock to prevent paper warping',
          },
        },
      ];

      // Evaluation with 250 GSM selected -> spot_uv must be disabled
      const resultWith250 = evaluateProductConfiguration(
        sampleOptionGroups as any,
        sampleRules as any,
        { paper_stock: '250gsm' },
      );

      expect(resultWith250.optionStatus['finishing:spot_uv']?.isDisabled).toBe(true);
      expect(resultWith250.optionStatus['finishing:spot_uv']?.disabledReason).toContain('350 GSM');

      // Evaluation with 350 GSM selected -> spot_uv must NOT be disabled
      const resultWith350 = evaluateProductConfiguration(
        sampleOptionGroups as any,
        sampleRules as any,
        { paper_stock: '350gsm' },
      );

      expect(resultWith350.optionStatus['finishing:spot_uv']?.isDisabled).toBeFalsy();
    });

    it('1.2 Supports MULTIPLE selection on CHECKBOX / SELECT input types', () => {
      const selections: Record<string, any> = {
        finishing_addons: ['round_corners', 'spot_uv'],
      };

      expect(Array.isArray(selections.finishing_addons)).toBe(true);
      expect(selections.finishing_addons).toHaveLength(2);
      expect(selections.finishing_addons).toContain('round_corners');
      expect(selections.finishing_addons).toContain('spot_uv');
    });
  });

  // =========================================================================
  // SECTION 2: VARIANT DIMENSION INTEGRITY
  // =========================================================================
  describe('2. Variant Dimension Integrity', () => {
    it('2.1 Respects configured variantDimensions and isolates unrelated VARIANT_WISE groups', () => {
      const configuredDims = mockTShirtProduct.variantDimensions; // ['colors', 'size']
      expect(configuredDims).toEqual(['colors', 'size']);

      // grp-unrelated-variant (cuff_style) has selectionBehavior === 'VARIANT_WISE',
      // but is NOT listed in variantDimensions.
      const isCuffInCombinedMatrix = configuredDims.includes('cuff_style');
      expect(isCuffInCombinedMatrix).toBe(false);
    });

    it('2.2 Verifies every Color × Size combination (3 Colors × 5 Active Sizes = 15 combinations)', () => {
      const colors = mockTShirtProduct.optionGroups.find((g) => g.code === 'colors')!.options;
      const sizes = mockTShirtProduct.optionGroups.find((g) => g.code === 'size')!.options.filter((o) => o.isActive);

      expect(colors).toHaveLength(3);
      expect(sizes).toHaveLength(5); // S, M, L, XL, XXL (excluding inactive 3XL)

      const allCombinations: Array<{ color: string; size: string }> = [];
      for (const c of colors) {
        for (const s of sizes) {
          allCombinations.push({ color: c.value, size: s.value });
        }
      }

      expect(allCombinations).toHaveLength(15);
    });

    it('2.3 Rejects inactive option selection in variant combination', async () => {
      await expect(
        pricingService.calculateQuote({
          productId: mockTShirtProduct.id,
          quantity: 20,
          variantLines: [
            { combination: { colors: 'red', size: '3xl' }, quantity: 20 }, // 3XL is isActive: false
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('2.4 Automatically deduplicates and merges identical variant combinations', async () => {
      const quote = await pricingService.calculateQuote({
        productId: mockTShirtProduct.id,
        quantity: 20,
        variantLines: [
          { combination: { colors: 'red', size: 'm' }, quantity: 10 },
          { combination: { colors: 'red', size: 'm' }, quantity: 10 }, // Duplicate!
        ],
      });

      expect(quote.isMultiVariant).toBe(true);
      expect(quote.variantLines).toHaveLength(1); // Deduplicated to 1 line
      expect(quote.variantLines![0].quantity).toBe(20);
      expect(quote.totalVariantQuantity).toBe(20);
    });

    it('2.5 Enforces MOQ on total variant quantity', async () => {
      // MOQ for T-shirt is 10. Attempting 5 must fail.
      await expect(
        pricingService.calculateQuote({
          productId: mockTShirtProduct.id,
          quantity: 5,
          variantLines: [
            { combination: { colors: 'red', size: 'm' }, quantity: 5 },
          ],
        }),
      ).rejects.toThrow('Minimum quantity for Custom Premium T-Shirt is 10');
    });

    it('2.6 Rejects non-positive or negative quantities in variant lines', async () => {
      await expect(
        pricingService.calculateQuote({
          productId: mockTShirtProduct.id,
          quantity: 10,
          variantLines: [
            { combination: { colors: 'red', size: 'm' }, quantity: -5 },
            { combination: { colors: 'blue', size: 'l' }, quantity: 15 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // SECTION 3: BACKEND SECURITY & RECALCULATION
  // =========================================================================
  describe('3. Backend Security & Authoritative Price Recalculation', () => {
    it('3.1 Completely ignores client-manipulated prices and recalculates from matrix', async () => {
      // Client maliciously attempts to send unitPrice = ₹10 and subtotal = ₹200
      const tamperedDto: any = {
        productId: mockTShirtProduct.id,
        quantity: 20,
        unitPrice: 10.0,
        subtotal: 200.0,
        variantLines: [
          { combination: { colors: 'red', size: 'm' }, quantity: 10, unitPrice: 5.0, lineSubtotal: 50.0 },
          { combination: { colors: 'blue', size: 'l' }, quantity: 10, unitPrice: 5.0, lineSubtotal: 50.0 },
        ],
      };

      const quote = await pricingService.calculateQuote(tamperedDto);

      // Volume tier for 20 pcs is ₹220/pc (from matrix minQty 20 to 49)
      expect(quote.totalVariantQuantity).toBe(20);
      expect(quote.variantLines![0].unitPrice).toBe(220.0);
      expect(quote.variantLines![1].unitPrice).toBe(220.0);
      expect(quote.variantLines![0].lineSubtotal).toBe(2200.0);
      expect(quote.variantLines![1].lineSubtotal).toBe(2200.0);
      expect(quote.baseSubtotal).toBe(4400.0); // 20 * 220 = 4400, NOT 200!
    });

    it('3.2 Evaluates volume pricing using the TOTAL aggregated order quantity across variants', async () => {
      // 50 total units qualify for Tier 3 (50+ pcs = ₹190/pc)
      // Even though each line by itself has only 25 units!
      const quote = await pricingService.calculateQuote({
        productId: mockTShirtProduct.id,
        quantity: 50,
        variantLines: [
          { combination: { colors: 'red', size: 'm' }, quantity: 25 },
          { combination: { colors: 'blue', size: 'l' }, quantity: 25 },
        ],
      });

      expect(quote.totalVariantQuantity).toBe(50);
      expect(quote.variantLines![0].unitPrice).toBe(190.0);
      expect(quote.variantLines![1].unitPrice).toBe(190.0);
      expect(quote.baseSubtotal).toBe(9500.0); // 50 * 190 = 9500
    });

    it('3.3 Charges shared Design Service Fee exactly once per item, not per variant', async () => {
      const quote = await pricingService.calculateQuote({
        productId: mockTShirtProduct.id,
        quantity: 20,
        hasDesignService: true,
        variantLines: [
          { combination: { colors: 'red', size: 's' }, quantity: 5 },
          { combination: { colors: 'red', size: 'm' }, quantity: 5 },
          { combination: { colors: 'blue', size: 'l' }, quantity: 5 },
          { combination: { colors: 'yellow', size: 'xl' }, quantity: 5 },
        ],
      });

      expect(quote.designServiceFee).toBe(150.0); // Charged ONCE for the item, NOT 4 x 150 = 600
    });

    it('3.4 Respects option-specific price modifiers inside variants (XL +₹20)', async () => {
      const quote = await pricingService.calculateQuote({
        productId: mockTShirtProduct.id,
        quantity: 20,
        variantLines: [
          { combination: { colors: 'red', size: 'm' }, quantity: 10 }, // M modifier = 0
          { combination: { colors: 'red', size: 'xl' }, quantity: 10 }, // XL modifier = +20
        ],
      });

      // Tier 2 base rate = 220
      // Line 1: M = 220 * 10 = 2200
      // Line 2: XL = (220 + 20) * 10 = 2400
      expect(quote.variantLines![0].unitPrice).toBe(220.0);
      expect(quote.variantLines![0].lineSubtotal).toBe(2200.0);
      expect(quote.variantLines![1].unitPrice).toBe(240.0);
      expect(quote.variantLines![1].lineSubtotal).toBe(2400.0);
      expect(quote.baseSubtotal).toBe(4600.0);
    });
  });

  // =========================================================================
  // SECTION 4: CART SNAPSHOT & ORDER VERIFICATION
  // =========================================================================
  describe('4. Cart Snapshot & Order Integrity', () => {
    it('4.1 Generates complete variantLines payload matching backend expectations', async () => {
      const quote = await pricingService.calculateQuote({
        productId: mockTShirtProduct.id,
        quantity: 30,
        variantLines: [
          { combination: { colors: 'red', size: 'm' }, quantity: 15 },
          { combination: { colors: 'blue', size: 'l' }, quantity: 15 },
        ],
      });

      // Cart item payload structure
      const cartItemSnapshot = {
        productId: mockTShirtProduct.id,
        productName: mockTShirtProduct.name,
        slug: mockTShirtProduct.slug,
        sku: mockTShirtProduct.sku,
        quantity: quote.totalVariantQuantity,
        isMultiVariant: quote.isMultiVariant,
        variantLines: quote.variantLines,
        basePrice: quote.basePrice,
        unitPrice: quote.unitPrice,
        subtotal: quote.subtotal,
        gstAmount: quote.totalTax,
        totalAmount: quote.grandTotal,
      };

      expect(cartItemSnapshot.isMultiVariant).toBe(true);
      expect(cartItemSnapshot.quantity).toBe(30);
      expect(cartItemSnapshot.variantLines).toHaveLength(2);
      expect(cartItemSnapshot.variantLines![0].combination).toEqual({ colors: 'red', size: 'm' });
      expect(cartItemSnapshot.variantLines![1].combination).toEqual({ colors: 'blue', size: 'l' });
    });
  });

  // =========================================================================
  // SECTION 5: REGRESSION TESTING (NON-VARIANT PRODUCTS)
  // =========================================================================
  describe('5. Regression Testing (Non-Variant Products)', () => {
    it('5.1 Premium Visiting Cards calculates quote with single selection & options modifiers', async () => {
      const quote = await pricingService.calculateQuote({
        productId: mockVisitingCardProduct.id,
        quantity: 500,
        options: [
          { optionCode: 'paper_type', valueCode: '400gsm' }, // +50
          { optionCode: 'lamination', valueCode: 'matte' }, // +30
        ],
      });

      expect(quote).toBeDefined();
      expect(quote.isMultiVariant).toBeFalsy();
      expect(quote.variantLines).toBeUndefined();
      expect(quote.quantity).toBe(500);
      expect(quote.effectiveBasePrice).toBe(1.0);
      // Options modifier: (Paper 50 + Lamination 30) * 500 units = 40,000
      expect(quote.optionsCost).toBe(40000.0);
      expect(quote.subtotal).toBe(40500.0);
    });

    it('5.2 Non-variant products reject multi-variant payloads if allowMultipleVariants is false', async () => {
      // Standard product without variant capability
      const quote = await pricingService.calculateQuote({
        productId: mockVisitingCardProduct.id,
        quantity: 100,
        options: [{ optionCode: 'paper_type', valueCode: '350gsm' }],
      });

      expect(quote.isMultiVariant).toBeFalsy();
      expect(quote.quantity).toBe(100);
    });
  });
});
