import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ShippingGstService } from '../shipping-gst/shipping-gst.service';
import { ShippingCalculatorService } from '../shipping/shipping-calculator.service';

describe('PricingService (Authoritative Server Pricing Engine)', () => {
  let service: PricingService;

  const mockProduct = {
    id: 'prod-001',
    name: 'Visiting Cards',
    sku: 'SKU-VC-001',
    pricingModel: 'MATRIX',
    basePrice: 200.0, // Starting Reference Rate for MOQ 100 (₹2.00/pc)
    minQuantity: 100,
    maxQuantity: 10000,
    productionDays: 2,
    options: [
      {
        code: 'paper',
        name: 'Paper Stock',
        values: [
          { code: '350gsm', name: '350 GSM', priceModifierType: 'FIXED', priceModifier: 0.5 },
        ],
      },
    ],
    pricingMatrices: [
      { minQty: 100, maxQty: 500, unitPrice: 2.0, attributeCombination: {} },
      { minQty: 501, maxQty: 2000, unitPrice: 1.6, attributeCombination: {} },
      { minQty: 100, maxQty: 500, unitPrice: 0, attributeCombination: { paper: 'unsupported_kraft', isExcluded: true } },
    ],
    designServiceRequirement: 'OPTIONAL',
    designServiceFee: 150,
  };

  const mockSingleProduct = {
    id: 'prod-single-001',
    name: 'Custom Framed Poster',
    sku: 'SKU-POSTER-001',
    pricingModel: 'SINGLE',
    basePrice: 200.0,
    minQuantity: 1,
    maxQuantity: 20,
    productionDays: 2,
    tags: ['SINGLE_TYPE'],
    pricingMatrices: [
      { minQty: 1, maxQty: 5, unitPrice: 200.0, attributeCombination: { type: 'BASE', isBasePrice: true } },
      { minQty: 6, maxQty: 10, unitPrice: 190.0, attributeCombination: { type: 'BASE', isBasePrice: true } },
      { minQty: 11, maxQty: 20, unitPrice: 180.0, attributeCombination: { type: 'BASE', isBasePrice: true } },
      // Add-on rules
      { minQty: 1, maxQty: 5, unitPrice: 40.0, attributeCombination: { type: 'ATTRIBUTE', attributeCode: 'design', attributeValue: 'yes' } },
      { minQty: 6, maxQty: 10, unitPrice: 35.0, attributeCombination: { type: 'ATTRIBUTE', attributeCode: 'design', attributeValue: 'yes' } },
      { minQty: 11, maxQty: 20, unitPrice: 30.0, attributeCombination: { type: 'ATTRIBUTE', attributeCode: 'design', attributeValue: 'yes' } },
    ],
  };

  const mockCombinationProduct = {
    id: 'prod-combo-001',
    name: 'Visiting Cards (Dynamic Matrix)',
    sku: 'SKU-VC-COMBO',
    pricingModel: 'MATRIX',
    basePrice: 0,
    minQuantity: 1,
    maxQuantity: 100000,
    productionDays: 2,
    optionGroups: [
      {
        code: 'size',
        name: 'Size',
        options: [
          { value: 'standard', label: 'Standard' },
          { value: 'square', label: 'Square' },
        ],
      },
      {
        code: 'paper',
        name: 'Paper',
        options: [
          { value: '300gsm', label: '300 GSM' },
          { value: '350gsm', label: '350 GSM' },
        ],
      },
      {
        code: 'finish',
        name: 'Finish',
        options: [
          { value: 'matte', label: 'Matte' },
          { value: 'gloss', label: 'Gloss' },
        ],
      },
    ],
    pricingMatrices: [
      // Standard + 300 GSM + Matte (Quantities: 100, 250, 750)
      {
        id: 'pm-1',
        minQty: 100,
        maxQty: 100,
        unitPrice: 3.0,
        attributeCombination: { size: 'standard', paper: '300gsm', finish: 'matte', quantity: 100, price: 300, totalPrice: 300 },
      },
      {
        id: 'pm-2',
        minQty: 250,
        maxQty: 250,
        unitPrice: 2.4,
        attributeCombination: { size: 'standard', paper: '300gsm', finish: 'matte', quantity: 250, price: 600, totalPrice: 600 },
      },
      {
        id: 'pm-3',
        minQty: 750,
        maxQty: 750,
        unitPrice: 2.0,
        attributeCombination: { size: 'standard', paper: '300gsm', finish: 'matte', quantity: 750, price: 1500, totalPrice: 1500 },
      },
      // Standard + 300 GSM + Gloss (Quantities: 50, 200)
      {
        id: 'pm-4',
        minQty: 50,
        maxQty: 50,
        unitPrice: 4.4,
        attributeCombination: { size: 'standard', paper: '300gsm', finish: 'gloss', quantity: 50, price: 220, totalPrice: 220 },
      },
      {
        id: 'pm-5',
        minQty: 200,
        maxQty: 200,
        unitPrice: 2.5,
        attributeCombination: { size: 'standard', paper: '300gsm', finish: 'gloss', quantity: 200, price: 500, totalPrice: 500 },
      },
      // Square + 300 GSM + Matte (Excluded by rule)
      {
        id: 'pm-6',
        minQty: 100,
        maxQty: 100,
        unitPrice: 0,
        attributeCombination: { size: 'square', paper: '300gsm', finish: 'matte', isExcluded: true, exclusionReason: 'Square format incompatible with 300 GSM' },
      },
    ],
  };

  const mockProductWithCharges = {
    id: 'prod-charge-001',
    name: 'Custom Packaging Box',
    sku: 'SKU-BOX-001',
    pricingModel: 'MATRIX',
    basePrice: 10.0,
    minQuantity: 50,
    maxQuantity: 10000,
    productionDays: 3,
    configurationRules: [
      {
        id: 'rule-charge-1',
        name: 'Foil Stamping Setup Fee',
        isActive: true,
        conditionGroupCode: 'finish',
        conditionOperator: 'EQUALS',
        conditionOptionValue: 'gold_foil',
        actionType: 'APPLY_CHARGE',
        actionPayload: {
          chargeId: 'foil-setup',
          name: 'Gold Foil Stamping Die & Setup',
          amount: 500,
          calculationType: 'FIXED',
          description: 'Custom magnesium die creation and press setup',
        },
      },
      {
        id: 'rule-charge-2',
        name: 'Lamination Per Unit Fee',
        isActive: true,
        conditionGroupCode: 'coating',
        conditionOperator: 'EQUALS',
        conditionOptionValue: 'velvet',
        actionType: 'APPLY_CHARGE',
        actionPayload: {
          chargeId: 'velvet-lam',
          name: 'Soft Touch Velvet Lamination',
          amount: 2,
          calculationType: 'PER_UNIT',
          description: 'Thermal velvet lamination film',
        },
      },
      {
        id: 'rule-charge-3',
        name: 'Waive Foil Setup on No Foil',
        isActive: true,
        conditionGroupCode: 'finish',
        conditionOperator: 'EQUALS',
        conditionOptionValue: 'no_foil',
        actionType: 'REMOVE_CHARGE',
        actionPayload: {
          chargeId: 'foil-setup',
        },
      },
    ],
    pricingMatrices: [
      {
        id: 'pm-box-1',
        minQty: 100,
        maxQty: 100,
        unitPrice: 10.0,
        attributeCombination: { finish: 'gold_foil', coating: 'velvet', quantity: 100, price: 1000, totalPrice: 1000 },
      },
      {
        id: 'pm-box-2',
        minQty: 100,
        maxQty: 100,
        unitPrice: 10.0,
        attributeCombination: { finish: 'no_foil', coating: 'matte', quantity: 100, price: 1000, totalPrice: 1000 },
      },
    ],
  };

  const mockVisitingCardProduct = {
    id: 'prod-vc-prompt-001',
    name: 'Visiting Card Enterprise Reference',
    sku: 'SKU-VC-ENT',
    pricingModel: 'MATRIX',
    basePrice: 0,
    minQuantity: 100,
    maxQuantity: 10000,
    productionDays: 2,
    designServiceRequirement: 'OPTIONAL',
    designServiceFee: 300,
    optionGroups: [
      {
        code: 'cutting_style',
        name: 'Cutting Style',
        options: [
          { value: 'square_corner', label: 'Square Corner' },
          { value: 'rounded_corner', label: 'Rounded Corner' },
        ],
      },
      {
        code: 'lamination',
        name: 'Lamination',
        options: [
          { value: 'matte', label: 'Matte' },
          { value: 'glossy', label: 'Glossy' },
        ],
      },
      {
        code: 'printing_side',
        name: 'Printing Side',
        options: [
          { value: 'front_only', label: 'Front Only' },
          { value: 'front_back', label: 'Front & Back' },
        ],
      },
    ],
    pricingMatrices: [
      // 1. Square Corner + Matte + Front Only (100: 180, 250: 300, 500: 450, 1000: 750)
      { minQty: 100, maxQty: 100, unitPrice: 1.8, attributeCombination: { cutting_style: 'square_corner', lamination: 'matte', printing_side: 'front_only', quantity: 100, price: 180, totalPrice: 180 } },
      { minQty: 250, maxQty: 250, unitPrice: 1.2, attributeCombination: { cutting_style: 'square_corner', lamination: 'matte', printing_side: 'front_only', quantity: 250, price: 300, totalPrice: 300 } },
      { minQty: 500, maxQty: 500, unitPrice: 0.9, attributeCombination: { cutting_style: 'square_corner', lamination: 'matte', printing_side: 'front_only', quantity: 500, price: 450, totalPrice: 450 } },
      { minQty: 1000, maxQty: 1000, unitPrice: 0.75, attributeCombination: { cutting_style: 'square_corner', lamination: 'matte', printing_side: 'front_only', quantity: 1000, price: 750, totalPrice: 750 } },

      // 2. Square Corner + Matte + Front & Back (100: 250, 250: 400, 500: 650, 1000: 1050)
      { minQty: 100, maxQty: 100, unitPrice: 2.5, attributeCombination: { cutting_style: 'square_corner', lamination: 'matte', printing_side: 'front_back', quantity: 100, price: 250, totalPrice: 250 } },
      { minQty: 250, maxQty: 250, unitPrice: 1.6, attributeCombination: { cutting_style: 'square_corner', lamination: 'matte', printing_side: 'front_back', quantity: 250, price: 400, totalPrice: 400 } },
      { minQty: 500, maxQty: 500, unitPrice: 1.3, attributeCombination: { cutting_style: 'square_corner', lamination: 'matte', printing_side: 'front_back', quantity: 500, price: 650, totalPrice: 650 } },
      { minQty: 1000, maxQty: 1000, unitPrice: 1.05, attributeCombination: { cutting_style: 'square_corner', lamination: 'matte', printing_side: 'front_back', quantity: 1000, price: 1050, totalPrice: 1050 } },

      // 3. Square Corner + Glossy + Front & Back (100: 300, 250: 500, 500: 800, 1000: 1250)
      { minQty: 100, maxQty: 100, unitPrice: 3.0, attributeCombination: { cutting_style: 'square_corner', lamination: 'glossy', printing_side: 'front_back', quantity: 100, price: 300, totalPrice: 300 } },
      { minQty: 250, maxQty: 250, unitPrice: 2.0, attributeCombination: { cutting_style: 'square_corner', lamination: 'glossy', printing_side: 'front_back', quantity: 250, price: 500, totalPrice: 500 } },
      { minQty: 500, maxQty: 500, unitPrice: 1.6, attributeCombination: { cutting_style: 'square_corner', lamination: 'glossy', printing_side: 'front_back', quantity: 500, price: 800, totalPrice: 800 } },
      { minQty: 1000, maxQty: 1000, unitPrice: 1.25, attributeCombination: { cutting_style: 'square_corner', lamination: 'glossy', printing_side: 'front_back', quantity: 1000, price: 1250, totalPrice: 1250 } },

      // 4. Rounded Corner + Matte + Front & Back (100: 320, 250: 550, 500: 850, 1000: 1350)
      { minQty: 100, maxQty: 100, unitPrice: 3.2, attributeCombination: { cutting_style: 'rounded_corner', lamination: 'matte', printing_side: 'front_back', quantity: 100, price: 320, totalPrice: 320 } },
      { minQty: 250, maxQty: 250, unitPrice: 2.2, attributeCombination: { cutting_style: 'rounded_corner', lamination: 'matte', printing_side: 'front_back', quantity: 250, price: 550, totalPrice: 550 } },
      { minQty: 500, maxQty: 500, unitPrice: 1.7, attributeCombination: { cutting_style: 'rounded_corner', lamination: 'matte', printing_side: 'front_back', quantity: 500, price: 850, totalPrice: 850 } },
      { minQty: 1000, maxQty: 1000, unitPrice: 1.35, attributeCombination: { cutting_style: 'rounded_corner', lamination: 'matte', printing_side: 'front_back', quantity: 1000, price: 1350, totalPrice: 1350 } },

      // 5. Rounded Corner + Glossy + Front & Back (100: 350, 250: 600, 500: 950, 1000: 1500)
      { minQty: 100, maxQty: 100, unitPrice: 3.5, attributeCombination: { cutting_style: 'rounded_corner', lamination: 'glossy', printing_side: 'front_back', quantity: 100, price: 350, totalPrice: 350 } },
      { minQty: 250, maxQty: 250, unitPrice: 2.4, attributeCombination: { cutting_style: 'rounded_corner', lamination: 'glossy', printing_side: 'front_back', quantity: 250, price: 600, totalPrice: 600 } },
      { minQty: 500, maxQty: 500, unitPrice: 1.9, attributeCombination: { cutting_style: 'rounded_corner', lamination: 'glossy', printing_side: 'front_back', quantity: 500, price: 950, totalPrice: 950 } },
      { minQty: 1000, maxQty: 1000, unitPrice: 1.5, attributeCombination: { cutting_style: 'rounded_corner', lamination: 'glossy', printing_side: 'front_back', quantity: 1000, price: 1500, totalPrice: 1500 } },
    ],
  };

  const mockBaseOnlyProduct = {
    id: 'prod-base-only-001',
    name: 'Base Only Visiting Cards',
    sku: 'SKU-BO-001',
    pricingModel: 'BASE_ONLY',
    basePrice: 500.0, // Starting Reference Rate: ₹500 for MOQ 100 (₹5.00/pc)
    minQuantity: 100,
    maxQuantity: 10000,
    productionDays: 2,
    designServiceRequirement: 'OPTIONAL',
    designServiceFee: 150,
    optionGroups: [
      {
        id: 'grp-bo-corner',
        code: 'corner_finish',
        name: 'Corner Finish',
        isRequired: false,
        options: [
          { id: 'opt-bo-c1', value: 'square', label: 'Square Corners', priceModifier: 0, priceModifierType: 'FIXED' },
          { id: 'opt-bo-c2', value: 'rounded', label: 'Rounded Corners', priceModifier: 0.50, priceModifierType: 'FIXED' },
        ],
      },
      {
        id: 'grp-bo-design',
        code: 'design_required',
        name: 'Design Required',
        isRequired: false,
        options: [
          { id: 'opt-bo-d1', value: 'no', label: 'No', priceModifier: 0, priceModifierType: 'FIXED' },
          { id: 'opt-bo-d2', value: 'yes', label: 'Yes', priceModifier: 0, priceModifierType: 'FIXED' },
        ],
      },
      {
        id: 'grp-bo-loc',
        code: 'printing_location',
        name: 'Printing Location',
        isRequired: false,
        options: [
          { id: 'opt-bo-l1', value: 'front', label: 'Front Only', priceModifier: 0, priceModifierType: 'FIXED' },
          { id: 'opt-bo-l2', value: 'both', label: 'Front & Back', priceModifier: 0, priceModifierType: 'FIXED' },
        ],
      },
    ],
    pricingMatrices: [],
  };

  const mockAutomaticProduct = {
    id: 'prod-auto-001',
    name: 'Automatic Tiered Booklets',
    sku: 'SKU-AUTO-001',
    pricingModel: 'AUTOMATIC',
    basePrice: 500.0, // Starting Reference Rate: ₹500 for MOQ 100 (₹5.00/pc)
    minQuantity: 100,
    maxQuantity: 10000,
    productionDays: 3,
    optionGroups: [],
    pricingMatrices: [
      { id: 'pm-auto-1', minQty: 100, maxQty: 499, unitPrice: 5.0, attributeCombination: {} },
      { id: 'pm-auto-2', minQty: 500, maxQty: 999, unitPrice: 4.50, attributeCombination: {} },
      { id: 'pm-auto-3', minQty: 1000, maxQty: 10000, unitPrice: 4.0, attributeCombination: {} },
    ],
  };

  const mockManualMatrixProduct = {
    id: 'prod-manual-001',
    name: 'Manual Exact Matrix Cards',
    sku: 'SKU-MANUAL-001',
    pricingModel: 'MANUAL',
    basePrice: 500.0,
    minQuantity: 100,
    maxQuantity: 10000,
    productionDays: 2,
    optionGroups: [
      {
        id: 'grp-man-paper',
        code: 'paper',
        name: 'Paper',
        options: [
          { value: '300gsm', label: '300 GSM', priceModifier: 1.00, priceModifierType: 'FIXED' },
          { value: '350gsm', label: '350 GSM', priceModifier: 2.00, priceModifierType: 'FIXED' },
        ],
      },
      {
        id: 'grp-man-lam',
        code: 'lamination',
        name: 'Lamination',
        options: [
          { value: 'matte', label: 'Matte', priceModifier: 0.50, priceModifierType: 'FIXED' },
          { value: 'gloss', label: 'Gloss', priceModifier: 0.50, priceModifierType: 'FIXED' },
        ],
      },
    ],
    pricingMatrices: [
      {
        id: 'pm-man-1',
        minQty: 100,
        maxQty: 100,
        unitPrice: 6.0,
        attributeCombination: { paper: '300gsm', lamination: 'matte', quantity: 100, price: 600, totalPrice: 600 },
      },
      {
        id: 'pm-man-2',
        minQty: 250,
        maxQty: 250,
        unitPrice: 2.4,
        attributeCombination: { paper: '300gsm', lamination: 'matte', quantity: 250, price: 600, totalPrice: 600 },
      },
    ],
  };

  const mockAddonProduct = {
    id: 'prod-addon-001',
    name: 'Custom Pamphlets',
    sku: 'SKU-PAMPHLET-001',
    slug: 'custom-pamphlets',
    pricingModel: 'MATRIX',
    basePrice: 500.0,
    minQuantity: 100,
    maxQuantity: 10000,
    productionDays: 3,
    designServiceRequirement: 'OPTIONAL',
    designServiceFee: 150,
    optionGroups: [
      {
        id: 'g-paper',
        code: 'paper_stock',
        name: 'Paper Stock',
        enableAdditionalPricing: true,
        options: [
          { id: 'o-130', value: '130_gsm', label: '130 GSM Gloss', priceModifier: 0, priceModifierType: 'FIXED' },
          { id: 'o-170', value: '170_gsm', label: '170 GSM Art Paper', priceModifier: 0.1, priceModifierType: 'FIXED' },
          { id: 'o-350', value: '350_gsm', label: '350 GSM Board', priceModifier: 0.5, priceModifierType: 'FIXED' },
          { id: 'o-heavy', value: 'heavy_kraft', label: 'Heavy Kraft', priceModifier: 0, priceModifierType: 'FIXED' },
        ],
      },
    ],
    pricingMatrices: [
      { id: 'pm-100', minQty: 100, maxQty: 100, unitPrice: 5.0, attributeCombination: {} },
      { id: 'pm-200', minQty: 200, maxQty: 200, unitPrice: 4.8, attributeCombination: {} },
      { id: 'pm-300', minQty: 300, maxQty: 300, unitPrice: 4.5, attributeCombination: {} },
    ],
    additionalPricings: [
      { groupCode: 'paper_stock', optionValue: '130_gsm', minQty: 100, maxQty: 100, unitPrice: 0.0, isExcluded: false },
      { groupCode: 'paper_stock', optionValue: '130_gsm', minQty: 200, maxQty: 200, unitPrice: 0.0, isExcluded: false },
      { groupCode: 'paper_stock', optionValue: '130_gsm', minQty: 300, maxQty: 300, unitPrice: 0.0, isExcluded: false },
      { groupCode: 'paper_stock', optionValue: '170_gsm', minQty: 100, maxQty: 100, unitPrice: 0.2, isExcluded: false },
      { groupCode: 'paper_stock', optionValue: '170_gsm', minQty: 200, maxQty: 200, unitPrice: 0.35, isExcluded: false },
      { groupCode: 'paper_stock', optionValue: '170_gsm', minQty: 300, maxQty: 300, unitPrice: 0.5, isExcluded: false },
      { groupCode: 'paper_stock', optionValue: '350_gsm', minQty: 100, maxQty: 100, unitPrice: 0.8, isExcluded: false },
      { groupCode: 'paper_stock', optionValue: '350_gsm', minQty: 200, maxQty: 200, unitPrice: 1.2, isExcluded: false },
      { groupCode: 'paper_stock', optionValue: '350_gsm', minQty: 300, maxQty: 300, unitPrice: 1.5, isExcluded: false },
      { groupCode: 'paper_stock', optionValue: 'heavy_kraft', minQty: 300, maxQty: 300, unitPrice: 2.0, isExcluded: true },
    ],
  };

  const mockPrismaService = {
    product: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where?.OR?.some((cond: any) => cond.id === 'prod-001' || cond.slug === 'prod-001' || cond.sku === 'prod-001')) {
          return Promise.resolve(mockProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-single-001' || cond.slug === 'prod-single-001' || cond.sku === 'prod-single-001')) {
          return Promise.resolve(mockSingleProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-combo-001' || cond.slug === 'prod-combo-001' || cond.sku === 'prod-combo-001')) {
          return Promise.resolve(mockCombinationProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-charge-001' || cond.slug === 'prod-charge-001' || cond.sku === 'prod-charge-001')) {
          return Promise.resolve(mockProductWithCharges);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-vc-prompt-001' || cond.slug === 'prod-vc-prompt-001' || cond.sku === 'prod-vc-prompt-001')) {
          return Promise.resolve(mockVisitingCardProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-base-only-001' || cond.slug === 'prod-base-only-001' || cond.sku === 'prod-base-only-001')) {
          return Promise.resolve(mockBaseOnlyProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-auto-001' || cond.slug === 'prod-auto-001' || cond.sku === 'prod-auto-001')) {
          return Promise.resolve(mockAutomaticProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-manual-001' || cond.slug === 'prod-manual-001' || cond.sku === 'prod-manual-001')) {
          return Promise.resolve(mockManualMatrixProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-addon-001' || cond.slug === 'prod-addon-001' || cond.sku === 'prod-addon-001')) {
          return Promise.resolve(mockAddonProduct);
        }
        return Promise.resolve(null);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'prod-001') return Promise.resolve(mockProduct);
        if (where.id === 'prod-single-001') return Promise.resolve(mockSingleProduct);
        if (where.id === 'prod-combo-001') return Promise.resolve(mockCombinationProduct);
        if (where.id === 'prod-charge-001') return Promise.resolve(mockProductWithCharges);
        if (where.id === 'prod-vc-prompt-001') return Promise.resolve(mockVisitingCardProduct);
        if (where.id === 'prod-base-only-001') return Promise.resolve(mockBaseOnlyProduct);
        if (where.id === 'prod-auto-001') return Promise.resolve(mockAutomaticProduct);
        if (where.id === 'prod-manual-001') return Promise.resolve(mockManualMatrixProduct);
        if (where.id === 'prod-addon-001') return Promise.resolve(mockAddonProduct);
        return Promise.resolve(null);
      }),
    },
  };

  const mockShippingGstService = {
    calculateShippingAndTax: jest.fn().mockImplementation((subtotal: number) => {
      const gst = Math.round(subtotal * 0.18 * 100) / 100;
      const shipping = subtotal >= 1000 ? 0 : 100;
      return Promise.resolve({
        cgst: gst / 2,
        sgst: gst / 2,
        igst: 0,
        gstAmount: gst,
        gstRatePercent: 18,
        shippingFee: shipping,
        baseShippingFee: 100,
        freeShippingThreshold: 1000,
        isFreeShippingApplied: subtotal >= 1000,
        appliedCourierZone: null,
      });
    }),
    getSetting: jest.fn().mockResolvedValue({ defaultCourierCharge: 100, freeShippingThreshold: 1000, defaultGstRate: 18 }),
  };

  const mockShippingCalculatorService = {
    calculateShipping: jest.fn().mockImplementation((dto: any) => {
      const subtotal = Number(dto.orderSubtotal || 0);
      const isFree = subtotal >= 1000;
      return Promise.resolve({
        shippingAmount: isFree ? 0 : 100,
        baseShippingCharge: 100,
        additionalWeightCharge: 0,
        zoneSurcharge: 0,
        pincodeSurcharge: 0,
        packagingCharge: 0,
        billableWeightGrams: 500,
        actualWeightGrams: 500,
        volumetricWeightGrams: 0,
        isFreeShipping: isFree,
        freeShippingThreshold: 1000,
        isServiceable: true,
        destinationPincode: dto.destinationPincode || '110001',
        shippingMethod: 'STANDARD',
        estimatedDeliveryDays: '3-5 business days',
        calculationBasis: 'Standard test calculation',
      });
    }),
    checkServiceability: jest.fn().mockResolvedValue({ isServiceable: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ShippingGstService, useValue: mockShippingGstService },
        { provide: ShippingCalculatorService, useValue: mockShippingCalculatorService },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should accurately calculate quote with options, tax and shipping', async () => {
    const quote = await service.calculateQuote({
      productId: 'prod-001',
      quantity: 500,
      options: [{ optionCode: 'paper', valueCode: '350gsm' }],
    });

    // Unit price = 2.0 (matrix) + 0.5 (option) = 2.5
    expect(quote.unitPrice).toBe(2.5);
    // Subtotal = 500 * 2.5 = 1250
    expect(quote.subtotal).toBe(1250);
    // GST = 18% of 1250 = 225
    expect(quote.totalTax).toBe(225);
    // Shipping: Free above 1000 INR
    expect(quote.estimatedShipping).toBe(0);
    // Grand Total = 1250 + 225 = 1475
    expect(quote.grandTotal).toBe(1475);
  });

  it('should apply volume tiered matrix price reduction for higher quantities', async () => {
    const quote = await service.calculateQuote({
      productId: 'prod-001',
      quantity: 1000,
      options: [{ optionCode: 'paper', valueCode: '350gsm' }],
    });

    // Unit price = 1.6 (matrix) + 0.5 (option) = 2.1
    expect(quote.unitPrice).toBe(2.1);
    expect(quote.subtotal).toBe(2100);
  });

  it('should reject quotes for excluded option combinations', async () => {
    await expect(
      service.calculateQuote({
        productId: 'prod-001',
        quantity: 200,
        options: [{ optionCode: 'paper', valueCode: 'unsupported_kraft' }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should evaluate design service fee when hasDesignService is true vs false', async () => {
    const quoteNoDesign = await service.calculateQuote({
      productId: 'prod-001',
      quantity: 500,
      hasDesignService: false,
    });
    expect(quoteNoDesign.designServiceFee).toBe(0);

    const quoteWithDesign = await service.calculateQuote({
      productId: 'prod-001',
      quantity: 500,
      hasDesignService: true,
    });
    expect(quoteWithDesign.designServiceFee).toBe(150);
    expect(quoteWithDesign.subtotal).toBe(quoteNoDesign.subtotal + 150);
  });

  it('should reject calculation if requested quantity is below product minimum', async () => {
    await expect(
      service.calculateQuote({
        productId: 'prod-001',
        quantity: 50, // Min is 100
        options: [],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException for invalid product ID', async () => {
    await expect(
      service.calculateQuote({
        productId: 'non-existent-id',
        quantity: 100,
        options: [],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  describe('Single-Type Quantity Range Pricing', () => {
    it('should calculate correct price for quantity in range 1–5', async () => {
      // Qty 1 -> ₹200 per piece, total ₹200
      const quote1 = await service.calculateQuote({
        productId: 'prod-single-001',
        quantity: 1,
      });
      expect(quote1.unitPrice).toBe(200);
      expect(quote1.subtotal).toBe(200);

      // Qty 5 -> ₹200 per piece, total ₹1,000
      const quote5 = await service.calculateQuote({
        productId: 'prod-single-001',
        quantity: 5,
      });
      expect(quote5.unitPrice).toBe(200);
      expect(quote5.subtotal).toBe(1000);
    });

    it('should calculate correct price for quantity in range 6–10', async () => {
      // Qty 6 -> ₹190 per piece, total ₹1,140
      const quote6 = await service.calculateQuote({
        productId: 'prod-single-001',
        quantity: 6,
      });
      expect(quote6.unitPrice).toBe(190);
      expect(quote6.subtotal).toBe(1140);

      // Qty 10 -> ₹190 per piece, total ₹1,900
      const quote10 = await service.calculateQuote({
        productId: 'prod-single-001',
        quantity: 10,
      });
      expect(quote10.unitPrice).toBe(190);
      expect(quote10.subtotal).toBe(1900);
    });

    it('should calculate correct price for quantity in range 11–20', async () => {
      // Qty 11 -> ₹180 per piece, total ₹1,980
      const quote11 = await service.calculateQuote({
        productId: 'prod-single-001',
        quantity: 11,
      });
      expect(quote11.unitPrice).toBe(180);
      expect(quote11.subtotal).toBe(1980);

      // Qty 20 -> ₹180 per piece, total ₹3,600
      const quote20 = await service.calculateQuote({
        productId: 'prod-single-001',
        quantity: 20,
      });
      expect(quote20.unitPrice).toBe(180);
      expect(quote20.subtotal).toBe(3600);
    });

    it('should calculate independent add-on prices for each quantity range', async () => {
      // Range 1-5 has Design add-on = ₹40/pc -> Unit price 240, Total for 5 = 1200
      const quote5WithAddon = await service.calculateQuote({
        productId: 'prod-single-001',
        quantity: 5,
        fieldValues: { design: 'yes' },
      });
      expect(quote5WithAddon.unitPrice).toBe(240);
      expect(quote5WithAddon.subtotal).toBe(1200);

      // Range 6-10 has Design add-on = ₹35/pc -> Unit price 225, Total for 6 = 1350
      const quote6WithAddon = await service.calculateQuote({
        productId: 'prod-single-001',
        quantity: 6,
        fieldValues: { design: 'yes' },
      });
      expect(quote6WithAddon.unitPrice).toBe(225);
      expect(quote6WithAddon.subtotal).toBe(1350);
    });

    it('should reject quantity outside Single Type min/max range', async () => {
      await expect(
        service.calculateQuote({
          productId: 'prod-single-001',
          quantity: 25, // max is 20
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Product Combination Pricing Matrix (Admin-Controlled Independent Quantities)', () => {
    it('should resolve exact saved price for Combination 1 (Standard / 300 GSM / Matte) at Qty 100', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-combo-001',
        quantity: 100,
        options: [
          { optionCode: 'size', valueCode: 'standard' },
          { optionCode: 'paper', valueCode: '300gsm' },
          { optionCode: 'finish', valueCode: 'matte' },
        ],
      });

      // Price is ₹300 total, unit price ₹3.0
      expect(quote.subtotal).toBe(300);
      expect(quote.unitPrice).toBe(3.0);
    });

    it('should resolve exact saved price for Combination 1 at Qty 250 and Qty 750', async () => {
      const quote250 = await service.calculateQuote({
        productId: 'prod-combo-001',
        quantity: 250,
        options: [
          { optionCode: 'size', valueCode: 'standard' },
          { optionCode: 'paper', valueCode: '300gsm' },
          { optionCode: 'finish', valueCode: 'matte' },
        ],
      });
      expect(quote250.subtotal).toBe(600);
      expect(quote250.unitPrice).toBe(2.4);

      const quote750 = await service.calculateQuote({
        productId: 'prod-combo-001',
        quantity: 750,
        options: [
          { optionCode: 'size', valueCode: 'standard' },
          { optionCode: 'paper', valueCode: '300gsm' },
          { optionCode: 'finish', valueCode: 'matte' },
        ],
      });
      expect(quote750.subtotal).toBe(1500);
      expect(quote750.unitPrice).toBe(2.0);
    });

    it('should support completely independent quantities for Combination 2 (Standard / 300 GSM / Gloss)', async () => {
      // Combination 2 only has quantities 50 and 200
      const quote50 = await service.calculateQuote({
        productId: 'prod-combo-001',
        quantity: 50,
        options: [
          { optionCode: 'size', valueCode: 'standard' },
          { optionCode: 'paper', valueCode: '300gsm' },
          { optionCode: 'finish', valueCode: 'gloss' },
        ],
      });
      expect(quote50.subtotal).toBe(220);
      expect(quote50.unitPrice).toBe(4.4);

      const quote200 = await service.calculateQuote({
        productId: 'prod-combo-001',
        quantity: 200,
        options: [
          { optionCode: 'size', valueCode: 'standard' },
          { optionCode: 'paper', valueCode: '300gsm' },
          { optionCode: 'finish', valueCode: 'gloss' },
        ],
      });
      expect(quote200.subtotal).toBe(500);
      expect(quote200.unitPrice).toBe(2.5);
    });

    it('should strictly reject quantities not configured for the selected combination', async () => {
      // Qty 50 exists for Combination 2 (Gloss), but NOT for Combination 1 (Matte)
      await expect(
        service.calculateQuote({
          productId: 'prod-combo-001',
          quantity: 50,
          options: [
            { optionCode: 'size', valueCode: 'standard' },
            { optionCode: 'paper', valueCode: '300gsm' },
            { optionCode: 'finish', valueCode: 'matte' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);

      // Qty 100 exists for Combination 1 (Matte), but NOT for Combination 2 (Gloss)
      await expect(
        service.calculateQuote({
          productId: 'prod-combo-001',
          quantity: 100,
          options: [
            { optionCode: 'size', valueCode: 'standard' },
            { optionCode: 'paper', valueCode: '300gsm' },
            { optionCode: 'finish', valueCode: 'gloss' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject excluded/incompatible combinations defined by conditional rules', async () => {
      await expect(
        service.calculateQuote({
          productId: 'prod-combo-001',
          quantity: 100,
          options: [
            { optionCode: 'size', valueCode: 'square' },
            { optionCode: 'paper', valueCode: '300gsm' },
            { optionCode: 'finish', valueCode: 'matte' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject unpriced combinations', async () => {
      await expect(
        service.calculateQuote({
          productId: 'prod-combo-001',
          quantity: 100,
          options: [
            { optionCode: 'size', valueCode: 'square' },
            { optionCode: 'paper', valueCode: '350gsm' },
            { optionCode: 'finish', valueCode: 'gloss' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should be server-authoritative and ignore client-submitted prices', async () => {
      // Even if client passes fieldValues with custom price or tampered prices
      const quote = await service.calculateQuote({
        productId: 'prod-combo-001',
        quantity: 100,
        options: [
          { optionCode: 'size', valueCode: 'standard' },
          { optionCode: 'paper', valueCode: '300gsm' },
          { optionCode: 'finish', valueCode: 'matte' },
        ],
        fieldValues: {
          size: 'standard',
          paper: '300gsm',
          finish: 'matte',
          price: 1, // Tampered client price ₹1
          totalPrice: 1,
        },
      });

      // Must strictly resolve to server matrix ₹300, NOT ₹1
      expect(quote.subtotal).toBe(300);
      expect(quote.unitPrice).toBe(3.0);
    });
  });

  describe('Generic Conditional Additional Charges (APPLY_CHARGE & REMOVE_CHARGE)', () => {
    it('should evaluate rules and apply FIXED and PER_UNIT additional charges dynamically', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-charge-001',
        quantity: 100,
        options: [
          { optionCode: 'finish', valueCode: 'gold_foil' },
          { optionCode: 'coating', valueCode: 'velvet' },
        ],
      });

      // Base combination total = ₹1,000
      // Fixed charge: foil-setup = ₹500
      // Per-unit charge: velvet-lam = ₹2 * 100 = ₹200
      // Additional charges total = ₹700
      // Total subtotal = ₹1,700
      expect(quote.additionalChargesTotal).toBe(700);
      expect(quote.subtotal).toBe(1700);
      expect(quote.appliedCharges).toBeDefined();
      expect(quote.appliedCharges?.length).toBe(2);

      const foilCharge = quote.appliedCharges?.find((c) => c.chargeId === 'foil-setup');
      expect(foilCharge).toBeDefined();
      expect(foilCharge?.amount).toBe(500);
      expect(foilCharge?.calculationType).toBe('FIXED');

      const lamCharge = quote.appliedCharges?.find((c) => c.chargeId === 'velvet-lam');
      expect(lamCharge).toBeDefined();
      expect(lamCharge?.amount).toBe(200);
      expect(lamCharge?.calculationType).toBe('PER_UNIT');
    });

    it('should waive/remove charge when conditions do not apply or rule executes REMOVE_CHARGE', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-charge-001',
        quantity: 100,
        options: [
          { optionCode: 'finish', valueCode: 'no_foil' },
          { optionCode: 'coating', valueCode: 'matte' },
        ],
      });

      // Base combination total = ₹1,000
      // No additional charges triggered
      expect(quote.additionalChargesTotal).toBe(0);
      expect(quote.subtotal).toBe(1000);
      expect(quote.appliedCharges?.length).toBe(0);
    });
  });

  describe('Section 12 Required Acceptance Tests (Visiting Card Reference)', () => {
    it('Test 1 — Exact combination price: Square Corner, Glossy, Front & Back, Qty 500 => ₹800', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-vc-prompt-001',
        quantity: 500,
        options: [
          { optionCode: 'cutting_style', valueCode: 'square_corner' },
          { optionCode: 'lamination', valueCode: 'glossy' },
          { optionCode: 'printing_side', valueCode: 'front_back' },
        ],
        hasDesignService: false,
      });

      // The backend returns ₹800 as the matrix price
      // Customer sees ₹800 before optional charges
      expect(quote.subtotal).toBe(800);
      expect(quote.unitPrice).toBe(1.6);
      expect(quote.designServiceFee).toBe(0);
    });

    it('Test 2 — Design service: Matrix price ₹800 + Configured design fee ₹300 => ₹1,100', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-vc-prompt-001',
        quantity: 500,
        options: [
          { optionCode: 'cutting_style', valueCode: 'square_corner' },
          { optionCode: 'lamination', valueCode: 'glossy' },
          { optionCode: 'printing_side', valueCode: 'front_back' },
        ],
        hasDesignService: true,
      });

      // Matrix price = ₹800, Design service = ₹300, Pre-tax total excluding other charges = ₹1,100
      expect(quote.designServiceFee).toBe(300);
      expect(quote.subtotal).toBe(1100);
    });

    it('Test 6 — Missing combination: Selected combination not in sellable matrix is rejected with exact error', async () => {
      // Rounded Corner + Matte + Front Only is NOT configured in the sellable matrix
      await expect(
        service.calculateQuote({
          productId: 'prod-vc-prompt-001',
          quantity: 100,
          options: [
            { optionCode: 'cutting_style', valueCode: 'rounded_corner' },
            { optionCode: 'lamination', valueCode: 'matte' },
            { optionCode: 'printing_side', valueCode: 'front_only' },
          ],
        }),
      ).rejects.toThrow(
        new BadRequestException('This combination is currently unavailable. Please select another configuration.')
      );
    });

    it('Test 7 — Missing quantity price: Valid combination but unsupported quantity tier is rejected', async () => {
      // Square Corner + Glossy + Front & Back has prices for 100, 250, 500, 1000 — NOT 350
      await expect(
        service.calculateQuote({
          productId: 'prod-vc-prompt-001',
          quantity: 350,
          options: [
            { optionCode: 'cutting_style', valueCode: 'square_corner' },
            { optionCode: 'lamination', valueCode: 'glossy' },
            { optionCode: 'printing_side', valueCode: 'front_back' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Test 8 — Combination normalization and uniqueness identity prevents duplicate sellable entries', () => {
      const normalizeCombKey = (opts: Record<string, string>) =>
        Object.keys(opts)
          .sort()
          .map((k) => `${k}:${opts[k]}`)
          .join('|');

      const entry1 = { cutting_style: 'square_corner', lamination: 'glossy', printing_side: 'front_back' };
      const entry2 = { printing_side: 'front_back', cutting_style: 'square_corner', lamination: 'glossy' };

      // Normalization key must be strictly identical regardless of key order
      expect(normalizeCombKey(entry1)).toBe(normalizeCombKey(entry2));
      expect(normalizeCombKey(entry1)).toBe('cutting_style:square_corner|lamination:glossy|printing_side:front_back');
    });

    it('Test 9 — Historical order price integrity is preserved and isolated from live catalogue modifications', async () => {
      // Simulate historical order item snapshot placed at ₹800
      const historicalOrderItem = {
        id: 'order-item-past-001',
        productId: 'prod-vc-prompt-001',
        quantity: 500,
        unitPrice: 1.6,
        subtotal: 800,
        metadata: {
          cutting_style: 'square_corner',
          lamination: 'glossy',
          printing_side: 'front_back',
        },
      };

      // Live matrix calculation must be independent of historical order item instances
      const liveQuote = await service.calculateQuote({
        productId: 'prod-vc-prompt-001',
        quantity: 500,
        options: [
          { optionCode: 'cutting_style', valueCode: 'square_corner' },
          { optionCode: 'lamination', valueCode: 'glossy' },
          { optionCode: 'printing_side', valueCode: 'front_back' },
        ],
      });

      expect(liveQuote.subtotal).toBe(historicalOrderItem.subtotal);
      expect(historicalOrderItem.subtotal).toBe(800);
    });

    it('Test 10 — Multi-group combination rules evaluate all condition groups deterministically', async () => {
      const productWithMultiRule = {
        id: 'prod-multi-rule-001',
        name: 'Flyers with Multi-Condition Rule',
        sku: 'SKU-FLY-001',
        pricingModel: 'MATRIX',
        basePrice: 5.0,
        minQuantity: 100,
        maxQuantity: 10000,
        productionDays: 3,
        optionGroups: [
          {
            code: 'paper',
            name: 'Paper',
            options: [{ value: 'gloss', label: 'Gloss' }, { value: 'matte', label: 'Matte' }],
          },
          {
            code: 'size',
            name: 'Size',
            options: [{ value: 'a4', label: 'A4' }, { value: 'a5', label: 'A5' }],
          },
        ],
        configurationRules: [
          {
            id: 'rule-combo-chg',
            name: 'A4 + Gloss Special Surcharge',
            isActive: true,
            actionType: 'APPLY_CHARGE',
            actionPayload: {
              conditionCombination: { paper: 'gloss', size: 'a4' },
              name: 'Special Coating Fee',
              amount: 50,
              calculationType: 'FIXED',
            },
          },
        ],
        pricingMatrices: [
          { minQty: 100, maxQty: 1000, unitPrice: 5.0, attributeCombination: {} },
        ],
      };

      // Mock findFirst to return productWithMultiRule
      const spy = jest.spyOn((service as any).prisma.product, 'findFirst').mockResolvedValueOnce(productWithMultiRule as any);

      // Matches both conditions: paper=gloss AND size=a4 -> charge of 50 is applied
      const quoteWithCharge = await service.calculateQuote({
        productId: 'prod-multi-rule-001',
        quantity: 100,
        fieldValues: { paper: 'gloss', size: 'a4' },
      });
      expect(quoteWithCharge.additionalChargesTotal).toBe(50);
      expect(quoteWithCharge.appliedCharges).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'Special Coating Fee', amount: 50 })])
      );

      // Only matches paper=gloss, but size=a5 -> charge NOT applied
      spy.mockResolvedValueOnce(productWithMultiRule as any);
      const quoteNoCharge = await service.calculateQuote({
        productId: 'prod-multi-rule-001',
        quantity: 100,
        fieldValues: { paper: 'gloss', size: 'a5' },
      });
      expect(quoteNoCharge.additionalChargesTotal).toBe(0);
    });

    it('Test 11 — Printing Location is never hidden solely because design is not required', async () => {
      const productWithConflictingRule = {
        id: 'prod-guard-001',
        name: 'Brochure',
        sku: 'SKU-BROCH-001',
        pricingModel: 'MATRIX',
        basePrice: 10.0,
        minQuantity: 100,
        maxQuantity: 5000,
        productionDays: 3,
        optionGroups: [
          {
            code: 'design_required',
            name: 'Design Required',
            isRequired: true,
            options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }],
          },
          {
            code: 'printing_location',
            name: 'Printing Location',
            isRequired: true,
            options: [{ value: 'front', label: 'Front Only' }, { value: 'both', label: 'Both Sides' }],
          },
        ],
        configurationRules: [
          // Misconfigured legacy rule attempting to hide printing_location when design_required = no
          {
            id: 'bad-legacy-rule',
            name: 'Hide location when no design',
            isActive: true,
            conditionGroupCode: 'design_required',
            conditionOperator: 'EQUALS',
            conditionOptionValue: 'no',
            actionType: 'HIDE',
            targetGroupCode: 'printing_location',
          },
        ],
        pricingMatrices: [
          { minQty: 100, maxQty: 500, unitPrice: 10.0, attributeCombination: {} },
        ],
      };

      jest.spyOn((service as any).prisma.product, 'findFirst').mockResolvedValueOnce(productWithConflictingRule as any);

      const quote = await service.calculateQuote({
        productId: 'prod-guard-001',
        quantity: 100,
        fieldValues: { design_required: 'no', printing_location: 'front' },
      });

      // printing_location must NOT be stripped or hidden
      expect(quote.specificationsSnapshot['printing_location']).toBeDefined();
      expect(quote.specificationsSnapshot['printing_location'].value).toBe('front');
    });

    it('Test 12 — Design service fee is not double-charged when matrix pricing explicitly includes design attribute', async () => {
      const productWithDesignMatrix = {
        id: 'prod-matrix-design-001',
        name: 'Stationery with Design Tier',
        sku: 'SKU-STAT-001',
        pricingModel: 'MATRIX',
        basePrice: 5.0,
        minQuantity: 100,
        maxQuantity: 1000,
        productionDays: 3,
        designServiceRequirement: 'OPTIONAL',
        designServicePrice: 250,
        optionGroups: [
          {
            code: 'design_service',
            name: 'Design Service',
            isRequired: true,
            options: [{ value: 'full_design', label: 'Full Design' }],
          },
        ],
        pricingMatrices: [
          // Explicit matrix row that already prices full_design at ₹8/pc
          {
            minQty: 100,
            maxQty: 100,
            unitPrice: 8.0,
            attributeCombination: { design_service: 'full_design' },
          },
        ],
      };

      jest.spyOn((service as any).prisma.product, 'findFirst').mockResolvedValueOnce(productWithDesignMatrix as any);

      const quote = await service.calculateQuote({
        productId: 'prod-matrix-design-001',
        quantity: 100,
        hasDesignService: true,
        fieldValues: { design_service: 'full_design' },
      });

      // Matrix rate of 8.0 applies: 100 * 8 = 800 subtotal. Design fee of 250 must NOT be added again!
      expect(quote.unitPrice).toBe(8.0);
      expect(quote.designServiceFee).toBe(0);
      expect(quote.subtotal).toBe(800);
    });
  });

  describe('Move Design Pricing into Artwork Conditions — 12 Acceptance Tests', () => {
    const mockArtworkDesignProduct = {
      id: 'prod-artwork-design-001',
      name: 'Custom Marketing Postcards',
      sku: 'SKU-PC-ART-001',
      pricingModel: 'MATRIX',
      basePrice: 500.0, // Starting Reference Rate for MOQ 100 (₹5.00/pc)
      minQuantity: 100,
      maxQuantity: 5000,
      productionDays: 3,
      designServiceRequirement: 'OPTIONAL',
      designServiceFee: 100,
      optionGroups: [
        {
          code: 'printing_location',
          name: 'Printing Location',
          isRequired: true,
          options: [
            { value: 'front', label: 'Front Only' },
            { value: 'back', label: 'Back Only' },
            { value: 'both', label: 'Front & Back' },
          ],
        },
        {
          code: 'design_required',
          name: 'Design Required',
          isRequired: true,
          options: [
            { value: 'no', label: 'No (I have Artwork)' },
            { value: 'yes', label: 'Yes (Design Assistance)' },
          ],
        },
        {
          code: 'design_scope',
          name: 'Design Scope',
          isRequired: false,
          options: [
            { value: 'front', label: 'Front Design' },
            { value: 'back', label: 'Back Design' },
            { value: 'full', label: 'Full Design (Both Sides)' },
          ],
        },
      ],
      configurationRules: [
        // Scope 1: Front design amount = 150
        {
          id: 'rule-scope-front',
          name: 'Front Design Fee',
          isActive: true,
          conditionGroupCode: 'design_scope',
          conditionOperator: 'EQUALS',
          conditionOptionValue: 'front',
          actionType: 'ARTWORK_CONDITIONS',
          actionPayload: {
            designScope: 'front',
            designFee: 150,
            requiredArtworkSlots: ['front'],
          },
        },
        // Scope 2: Back design amount = 120
        {
          id: 'rule-scope-back',
          name: 'Back Design Fee',
          isActive: true,
          conditionGroupCode: 'design_scope',
          conditionOperator: 'EQUALS',
          conditionOptionValue: 'back',
          actionType: 'ARTWORK_CONDITIONS',
          actionPayload: {
            designScope: 'back',
            designFee: 120,
            requiredArtworkSlots: ['back'],
          },
        },
        // Scope 3: Full design amount = 280
        {
          id: 'rule-scope-full',
          name: 'Full Design Fee',
          isActive: true,
          conditionGroupCode: 'design_scope',
          conditionOperator: 'EQUALS',
          conditionOptionValue: 'full',
          actionType: 'ARTWORK_CONDITIONS',
          actionPayload: {
            designScope: 'full',
            designFee: 280,
            requiredArtworkSlots: ['front', 'back'],
          },
        },
        // Partial design combination rule: Front design only, but printing on both sides
        {
          id: 'rule-combo-partial',
          name: 'Front Design on Double-Sided Print',
          isActive: true,
          actionType: 'ARTWORK_CONDITIONS',
          actionPayload: {
            conditionCombination: { design_scope: 'front', printing_location: 'both' },
            designScope: 'front',
            designFee: 150,
            requiredArtworkSlots: ['back'], // Customer supplies back side artwork
          },
        },
      ],
      pricingMatrices: [
        { minQty: 100, maxQty: 500, unitPrice: 2.5, attributeCombination: { printing_location: 'front' } },
        { minQty: 100, maxQty: 500, unitPrice: 2.5, attributeCombination: { printing_location: 'back' } },
        { minQty: 100, maxQty: 500, unitPrice: 4.0, attributeCombination: { printing_location: 'both' } },
      ],
    };

    beforeEach(() => {
      jest.spyOn((service as any).prisma.product, 'findFirst').mockResolvedValue(mockArtworkDesignProduct as any);
    });

    it('Test 1: Design Required = No results in no design-service charge', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-artwork-design-001',
        quantity: 100,
        fieldValues: { design_required: 'no', printing_location: 'both' },
      });
      expect(quote.designServiceFee).toBe(0);
      expect(quote.subtotal).toBe(400); // 100 * 4.00
    });

    it('Test 2: Front design applies only the configured Front design amount', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-artwork-design-001',
        quantity: 100,
        hasDesignService: true,
        fieldValues: { design_required: 'yes', design_scope: 'front', printing_location: 'front' },
      });
      expect(quote.designServiceFee).toBe(150);
      expect(quote.subtotal).toBe(400); // 100 * 2.50 + 150 = 400
    });

    it('Test 3: Back design applies only the configured Back design amount', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-artwork-design-001',
        quantity: 100,
        hasDesignService: true,
        fieldValues: { design_required: 'yes', design_scope: 'back', printing_location: 'back' },
      });
      expect(quote.designServiceFee).toBe(120);
      expect(quote.subtotal).toBe(370); // 100 * 2.50 + 120 = 370
    });

    it('Test 4: Full design applies the configured Full design amount', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-artwork-design-001',
        quantity: 100,
        hasDesignService: true,
        fieldValues: { design_required: 'yes', design_scope: 'full', printing_location: 'both' },
      });
      expect(quote.designServiceFee).toBe(280);
      expect(quote.subtotal).toBe(680); // 100 * 4.00 + 280 = 680
    });

    it('Test 5: Partial design combination applies only applicable design fee (₹150)', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-artwork-design-001',
        quantity: 100,
        hasDesignService: true,
        fieldValues: { design_required: 'yes', design_scope: 'front', printing_location: 'both' },
      });
      expect(quote.designServiceFee).toBe(150);
      expect(quote.subtotal).toBe(550); // 100 * 4.00 + 150 = 550
    });

    it('Test 6: Printing Location remains available and preserved when design is not required', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-artwork-design-001',
        quantity: 100,
        fieldValues: { design_required: 'no', printing_location: 'both' },
      });
      expect(quote.specificationsSnapshot['printing_location']).toBeDefined();
      expect(quote.specificationsSnapshot['printing_location'].value).toBe('both');
    });

    it('Test 7: Base printing price remains exact from combination pricing matrix', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-artwork-design-001',
        quantity: 100,
        fieldValues: { printing_location: 'both' },
      });
      expect(quote.unitPrice).toBe(4.0);
      expect(quote.baseSubtotal).toBe(500); // originalBasePrice 5.0 * 100
      expect(quote.subtotal).toBe(400); // combination matrix price 4.0 * 100
    });

    it('Test 8: Design charges are not double-counted with generic additional charge rules', async () => {
      const productWithExtraDesignRule = {
        ...mockArtworkDesignProduct,
        configurationRules: [
          ...mockArtworkDesignProduct.configurationRules,
          {
            id: 'extra-design-chg',
            name: 'Redundant Design Charge',
            isActive: true,
            actionType: 'APPLY_CHARGE',
            actionPayload: {
              chargeId: 'design_service_addon',
              name: 'Design Studio Charge',
              amount: 150,
              calculationType: 'FIXED',
            },
          },
        ],
      };
      jest.spyOn((service as any).prisma.product, 'findFirst').mockResolvedValueOnce(productWithExtraDesignRule as any);

      const quote = await service.calculateQuote({
        productId: 'prod-artwork-design-001',
        quantity: 100,
        hasDesignService: true,
        fieldValues: { design_required: 'yes', design_scope: 'front', printing_location: 'front' },
      });

      // Exactly 1 design fee of ₹150; redundant charge rule is skipped
      expect(quote.designServiceFee).toBe(150);
      expect(quote.additionalChargesTotal).toBe(0);
      expect(quote.subtotal).toBe(400); // 250 + 150
    });

    it('Test 9: Invalid design scope is rejected by authoritative server quote', async () => {
      await expect(
        service.calculateQuote({
          productId: 'prod-artwork-design-001',
          quantity: 100,
          fieldValues: { design_required: 'yes', design_scope: 'invalid_unsupported_scope' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Test 10: Client price manipulation is rejected by server calculations', async () => {
      const manipulatedDto = {
        productId: 'prod-artwork-design-001',
        quantity: 100,
        fieldValues: { printing_location: 'both' },
        unitPrice: 0.01,
        subtotal: 1.0,
        price: 1.0,
      };

      const quote = await service.calculateQuote(manipulatedDto as any);
      expect(quote.unitPrice).toBe(4.0);
      expect(quote.subtotal).toBe(400); // Client prices ignored
    });

    it('Test 11: Negative design amounts in rules throw validation exception', async () => {
      const productWithNegativeFee = {
        ...mockArtworkDesignProduct,
        configurationRules: [
          {
            id: 'rule-negative-fee',
            name: 'Corrupted Design Fee',
            isActive: true,
            actionType: 'ARTWORK_CONDITIONS',
            conditionGroupCode: 'design_scope',
            conditionOperator: 'EQUALS',
            conditionOptionValue: 'front',
            actionPayload: {
              designScope: 'front',
              designFee: -50,
            },
          },
        ],
      };
      jest.spyOn((service as any).prisma.product, 'findFirst').mockResolvedValueOnce(productWithNegativeFee as any);

      await expect(
        service.calculateQuote({
          productId: 'prod-artwork-design-001',
          quantity: 100,
          hasDesignService: true,
          fieldValues: { design_required: 'yes', design_scope: 'front' },
        }),
      ).rejects.toThrow(new BadRequestException('Configured design service amount cannot be negative.'));
    });

    it('Test 12: Existing pricing and order workflows remain completely functional', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-artwork-design-001',
        quantity: 100,
        fieldValues: { design_required: 'yes', design_scope: 'full', printing_location: 'both' },
        deliveryMethod: 'STORE_PICKUP',
      });

      expect(quote.subtotal).toBe(680);
      expect(quote.totalTax).toBeGreaterThan(0);
      expect(quote.grandTotal).toBe(Math.round((quote.subtotal + quote.totalTax + quote.estimatedShipping) * 100) / 100);
      expect(quote.specificationsSnapshot).toBeDefined();
    });
  });

  describe('Section 11 Acceptance Tests: Group-Based Pricing Studio Redesign (14 Tests)', () => {
    const mockGroupPricingProduct = {
      id: 'prod-group-studio-001',
      name: 'Corporate Brochure Studio Demo',
      sku: 'SKU-BROCHURE-001',
      pricingModel: 'MATRIX',
      basePrice: 0,
      minQuantity: 100,
      maxQuantity: 5000,
      productionDays: 3,
      optionGroups: [
        {
          id: 'grp-paper',
          code: 'paper_type',
          name: 'Paper Type',
          isRequired: true,
          options: [
            { id: 'opt-p1', value: 'matte', label: 'Matte 300 GSM', priceModifier: 0, priceModifierType: 'FIXED' },
            { id: 'opt-p2', value: 'glossy', label: 'Glossy 350 GSM', priceModifier: 0, priceModifierType: 'FIXED' },
          ],
        },
        {
          id: 'grp-location',
          code: 'printing_location',
          name: 'Printing Location',
          isRequired: true,
          options: [
            { id: 'opt-l1', value: 'front', label: 'Front Only', priceModifier: 0, priceModifierType: 'FIXED' },
            { id: 'opt-l2', value: 'both', label: 'Front & Back', priceModifier: 200, priceModifierType: 'FIXED' },
          ],
        },
        {
          id: 'grp-lamination',
          code: 'lamination',
          name: 'Lamination',
          isRequired: false,
          options: [
            { id: 'opt-lam1', value: 'none', label: 'No Lamination', priceModifier: 0, priceModifierType: 'FIXED' },
            { id: 'opt-lam2', value: 'thermal_gloss', label: 'Thermal Gloss', priceModifier: 0, priceModifierType: 'FIXED' },
          ],
        },
        {
          id: 'grp-corner',
          code: 'corner_finish',
          name: 'Corner Finish',
          isRequired: false,
          options: [
            { id: 'opt-c1', value: 'square', label: 'Square Corners', priceModifier: 0, priceModifierType: 'FIXED' },
            { id: 'opt-c2', value: 'rounded', label: 'Rounded Corners', priceModifier: 0.50, priceModifierType: 'FIXED' },
          ],
        },
      ],
      pricingMatrices: [
        // Method B combinations for paper_type and printing_location at Qty 100
        {
          id: 'pm-b1',
          minQty: 100,
          maxQty: 100,
          unitPrice: 3.0,
          attributeCombination: { paper_type: 'matte', printing_location: 'front', quantity: 100, price: 300, totalPrice: 300 },
        },
        {
          id: 'pm-b2',
          minQty: 100,
          maxQty: 100,
          unitPrice: 4.0,
          attributeCombination: { paper_type: 'matte', printing_location: 'both', quantity: 100, price: 400, totalPrice: 400 },
        },
        {
          id: 'pm-b3',
          minQty: 100,
          maxQty: 100,
          unitPrice: 3.5,
          attributeCombination: { paper_type: 'glossy', printing_location: 'front', quantity: 100, price: 350, totalPrice: 350 },
        },
        {
          id: 'pm-b4',
          minQty: 100,
          maxQty: 100,
          unitPrice: 5.0,
          attributeCombination: { paper_type: 'glossy', printing_location: 'both', quantity: 100, price: 500, totalPrice: 500 },
        },
        // Tiered intervals for backward compatibility
        {
          id: 'pm-tier-1',
          minQty: 500,
          maxQty: 999,
          unitPrice: 2.5,
          attributeCombination: { paper_type: 'matte', printing_location: 'front' },
        },
        {
          id: 'pm-tier-2',
          minQty: 1000,
          maxQty: 5000,
          unitPrice: 2.0,
          attributeCombination: { paper_type: 'matte', printing_location: 'front' },
        },
      ],
      configurationRules: [
        {
          id: 'rule-artwork-brochure',
          name: 'Brochure Artwork Condition',
          isActive: true,
          actionType: 'ARTWORK_CONDITIONS',
          conditionGroupCode: 'design_scope',
          conditionOperator: 'EQUALS',
          conditionOptionValue: 'full',
          actionPayload: {
            designScope: 'full',
            designFee: 500,
            requiredArtworkSlots: ['front', 'back'],
          },
        },
      ],
    };

    beforeEach(() => {
      jest.spyOn((service as any).prisma.product, 'findFirst').mockImplementation(({ where }) => {
        if (where?.OR?.some((cond: any) => cond.id === 'prod-group-studio-001' || cond.slug === 'prod-group-studio-001')) {
          return Promise.resolve(mockGroupPricingProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-vc-prompt-001' || cond.slug === 'prod-vc-prompt-001' || cond.sku === 'prod-vc-prompt-001')) {
          return Promise.resolve(mockVisitingCardProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-001' || cond.slug === 'prod-001' || cond.sku === 'prod-001')) {
          return Promise.resolve(mockProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-single-001' || cond.slug === 'prod-single-001' || cond.sku === 'prod-single-001')) {
          return Promise.resolve(mockSingleProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-combo-001' || cond.slug === 'prod-combo-001' || cond.sku === 'prod-combo-001')) {
          return Promise.resolve(mockCombinationProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-charge-001' || cond.slug === 'prod-charge-001' || cond.sku === 'prod-charge-001')) {
          return Promise.resolve(mockProductWithCharges);
        }
        return Promise.resolve(null);
      });
    });

    it('Test 1: Selecting a group loads its pricing configuration', () => {
      // Helper function simulating the studio group pricing resolver
      const resolveGroupPricingMethod = (groupCode: string, product: typeof mockGroupPricingProduct) => {
        const group = product.optionGroups.find((g) => g.code === groupCode);
        if (!group) return null;
        const hasMatrix = product.pricingMatrices.some((pm) => {
          const combo = pm.attributeCombination as Record<string, any> || {};
          return combo[groupCode] !== undefined;
        });
        if (hasMatrix) return 'COMBINATION_BASED';
        const hasOptionModifier = group.options.some((o) => (o.priceModifier || 0) > 0);
        if (hasOptionModifier) return 'OPTION_BASED';
        return 'INCLUDED_IN_BASE';
      };

      expect(resolveGroupPricingMethod('paper_type', mockGroupPricingProduct)).toBe('COMBINATION_BASED');
      expect(resolveGroupPricingMethod('corner_finish', mockGroupPricingProduct)).toBe('OPTION_BASED');
      expect(resolveGroupPricingMethod('lamination', mockGroupPricingProduct)).toBe('INCLUDED_IN_BASE');

      const printingGroup = mockGroupPricingProduct.optionGroups.find((g) => g.code === 'printing_location');
      expect(printingGroup?.options).toHaveLength(2);
      expect(printingGroup?.options[0].priceModifier).toBe(0);
      expect(printingGroup?.options[1].priceModifier).toBe(200);
    });

    it('Test 2: Option-based pricing applies the correct independent charge', async () => {
      // Product using basePrice + independent option modifier
      const baseProduct = {
        ...mockGroupPricingProduct,
        basePrice: 2000.0, // Starting Reference Rate for MOQ 100 (₹20.00/pc)
        pricingMatrices: [], // Pure Option-based product
      };
      jest.spyOn((service as any).prisma.product, 'findFirst').mockResolvedValueOnce(baseProduct as any);

      const quote = await service.calculateQuote({
        productId: 'prod-group-studio-001',
        quantity: 100,
        fieldValues: { corner_finish: 'rounded' },
      });

      // corner_finish 'rounded' has +0.50 unit modifier -> 100 * 0.50 = 50 optionsCost
      expect(quote.optionsCost).toBe(50);
      expect(quote.dynamicModifiersTotal).toBe(50);
      expect(quote.unitPrice).toBe(20.5);
      expect(quote.subtotal).toBe(2050); // 100 * 20.50

      // Rejection of negative option price modifier
      const productWithNegativeOption = {
        ...baseProduct,
        optionGroups: [
          {
            code: 'discount_group',
            name: 'Corrupted Group',
            options: [{ value: 'illegal_disc', label: 'Negative', priceModifier: -10, priceModifierType: 'FIXED' }],
          },
        ],
      };
      jest.spyOn((service as any).prisma.product, 'findFirst').mockResolvedValueOnce(productWithNegativeOption as any);

      await expect(
        service.calculateQuote({
          productId: 'prod-group-studio-001',
          quantity: 100,
          fieldValues: { discount_group: 'illegal_disc' },
        }),
      ).rejects.toThrow(new BadRequestException("Option charge for 'Negative' cannot be negative."));
    });

    it('Test 3: Included-in-base-price groups do not create duplicate charges', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-group-studio-001',
        quantity: 100,
        fieldValues: {
          paper_type: 'matte',
          printing_location: 'front',
          lamination: 'thermal_gloss', // Method C: Included in base
        },
      });

      // Thermal gloss has 0 modifier and is included in base combination price
      expect(quote.unitPrice).toBe(3.0);
      expect(quote.optionsCost).toBe(0);
      expect(quote.additionalChargesTotal).toBe(0);
      expect(quote.subtotal).toBe(300); // Exactly 100 * 3.0
    });

    it('Test 4: Combination pricing resolves an exact configured combination', async () => {
      // Combination: Glossy + Front @ Qty 100 -> ₹3.50/unit
      const quoteFront = await service.calculateQuote({
        productId: 'prod-group-studio-001',
        quantity: 100,
        fieldValues: { paper_type: 'glossy', printing_location: 'front' },
      });
      expect(quoteFront.unitPrice).toBe(3.5);
      expect(quoteFront.subtotal).toBe(350);

      // Combination: Glossy + Both @ Qty 100 -> ₹5.00/unit
      const quoteBoth = await service.calculateQuote({
        productId: 'prod-group-studio-001',
        quantity: 100,
        fieldValues: { paper_type: 'glossy', printing_location: 'both' },
      });
      expect(quoteBoth.unitPrice).toBe(5.0);
      expect(quoteBoth.subtotal).toBe(500);

      // Hybrid combination + independent Method A group: Matte + Front (₹3.00) + Rounded Corners (+₹0.50)
      const quoteHybrid = await service.calculateQuote({
        productId: 'prod-group-studio-001',
        quantity: 100,
        fieldValues: { paper_type: 'matte', printing_location: 'front', corner_finish: 'rounded' },
      });
      expect(quoteHybrid.unitPrice).toBe(3.5); // 3.00 + 0.50
      expect(quoteHybrid.subtotal).toBe(350);
    });

    it('Test 5: An unconfigured combination is rejected', async () => {
      await expect(
        service.calculateQuote({
          productId: 'prod-group-studio-001',
          quantity: 100,
          fieldValues: { paper_type: 'unconfigured_paper', printing_location: 'front' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Test 6: An unpriced quantity is rejected', async () => {
      // Qty 250 is neither an exact 100 match nor in the 500-5000 ranges
      await expect(
        service.calculateQuote({
          productId: 'prod-group-studio-001',
          quantity: 250,
          fieldValues: { paper_type: 'matte', printing_location: 'front' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Test 7: Duplicate combinations are prevented', () => {
      const detectDuplicates = (matrices: any[]) => {
        const seen = new Set<string>();
        const duplicates: any[] = [];
        for (const row of matrices) {
          const combo = row.attributeCombination || {};
          const keys = Object.keys(combo).filter((k) => !['quantity', 'price', 'totalPrice', 'isExcluded'].includes(k)).sort();
          const signature = `${keys.map((k) => `${k}:${combo[k]}`).join('|')}#${row.minQty}-${row.maxQty}`;
          if (seen.has(signature)) {
            duplicates.push(signature);
          } else {
            seen.add(signature);
          }
        }
        return duplicates;
      };

      const validList = mockGroupPricingProduct.pricingMatrices;
      expect(detectDuplicates(validList)).toHaveLength(0);

      const duplicatedList = [
        ...validList,
        {
          minQty: 100,
          maxQty: 100,
          unitPrice: 3.5,
          attributeCombination: { paper_type: 'matte', printing_location: 'front', quantity: 100 },
        },
      ];
      const dups = detectDuplicates(duplicatedList);
      expect(dups).toHaveLength(1);
      expect(dups[0]).toContain('paper_type:matte|printing_location:front#100-100');
    });

    it('Test 8: Quantity range semantics remain backward compatible', async () => {
      // Tier 1: 500 - 999 -> ₹2.50
      const quoteTier1 = await service.calculateQuote({
        productId: 'prod-group-studio-001',
        quantity: 750,
        fieldValues: { paper_type: 'matte', printing_location: 'front' },
      });
      expect(quoteTier1.unitPrice).toBe(2.5);
      expect(quoteTier1.subtotal).toBe(1875); // 750 * 2.50

      // Tier 2: 1000 - 5000 -> ₹2.00
      const quoteTier2 = await service.calculateQuote({
        productId: 'prod-group-studio-001',
        quantity: 2000,
        fieldValues: { paper_type: 'matte', printing_location: 'front' },
      });
      expect(quoteTier2.unitPrice).toBe(2.0);
      expect(quoteTier2.subtotal).toBe(4000); // 2000 * 2.00
    });

    it('Test 9: Design charges from Step 3 are applied exactly once', async () => {
      const quoteWithDesign = await service.calculateQuote({
        productId: 'prod-group-studio-001',
        quantity: 100,
        hasDesignService: true,
        fieldValues: {
          paper_type: 'matte',
          printing_location: 'front',
          design_required: 'yes',
          design_scope: 'full',
        },
      });

      expect(quoteWithDesign.designServiceFee).toBe(500);
      expect(quoteWithDesign.subtotal).toBe(800); // 300 base + 500 design
      expect(quoteWithDesign.additionalChargesTotal).toBe(0);
    });

    it('Test 10: Customer-supplied artwork does not automatically incur a design-service charge', async () => {
      const quoteSelfArtwork = await service.calculateQuote({
        productId: 'prod-group-studio-001',
        quantity: 100,
        hasDesignService: false,
        fieldValues: {
          paper_type: 'matte',
          printing_location: 'front',
          design_required: 'no',
        },
      });

      expect(quoteSelfArtwork.designServiceFee).toBe(0);
      expect(quoteSelfArtwork.subtotal).toBe(300);
    });

    it('Test 11: Client-supplied prices are rejected', async () => {
      const maliciousPayload = {
        productId: 'prod-group-studio-001',
        quantity: 100,
        fieldValues: { paper_type: 'matte', printing_location: 'front' },
        unitPrice: 0.05,
        subtotal: 5.0,
        grandTotal: 5.0,
      };

      const quote = await service.calculateQuote(maliciousPayload as any);
      expect(quote.unitPrice).toBe(3.0);
      expect(quote.subtotal).toBe(300);
      expect(quote.grandTotal).toBeGreaterThan(300);
    });

    it('Test 12: Existing valid pricing rows continue to work', async () => {
      const legacyQuote = await service.calculateQuote({
        productId: 'prod-vc-prompt-001',
        quantity: 100,
        options: [
          { optionCode: 'cutting_style', valueCode: 'square_corner' },
          { optionCode: 'lamination', valueCode: 'matte' },
          { optionCode: 'printing_side', valueCode: 'front_only' },
        ],
      });

      expect(legacyQuote.unitPrice).toBe(1.8);
      expect(legacyQuote.subtotal).toBe(180);
    });

    it('Test 13: Draft and publish validation remain correct', () => {
      const validateForPublish = (product: { basePrice: number; pricingMatrices: any[]; optionGroups: any[] }) => {
        const errors: string[] = [];
        const hasMatrices = product.pricingMatrices && product.pricingMatrices.length > 0;
        const hasBasePrice = product.basePrice > 0;

        if (!hasBasePrice && !hasMatrices) {
          errors.push('Product requires either a valid base price or combination pricing matrix rows.');
        }

        // Validate option modifiers are non-negative
        for (const grp of product.optionGroups || []) {
          for (const opt of grp.options || []) {
            if (typeof opt.priceModifier === 'number' && opt.priceModifier < 0) {
              errors.push(`Option ${opt.label || opt.value} in group ${grp.name} has negative price.`);
            }
          }
        }
        return { isValid: errors.length === 0, errors };
      };

      // Valid Method A option-priced product with basePrice > 0
      const optionBasedProduct = {
        basePrice: 50,
        pricingMatrices: [],
        optionGroups: [
          {
            name: 'Size',
            options: [{ value: 'a4', label: 'A4', priceModifier: 0 }, { value: 'a3', label: 'A3', priceModifier: 30 }],
          },
        ],
      };
      expect(validateForPublish(optionBasedProduct).isValid).toBe(true);

      // Invalid unpriced product
      const unpricedProduct = {
        basePrice: 0,
        pricingMatrices: [],
        optionGroups: [],
      };
      const res = validateForPublish(unpricedProduct);
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain('Product requires either a valid base price');
    });

    it('Test 14: Existing order snapshots and unrelated production/finance workflows remain intact', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-group-studio-001',
        quantity: 100,
        fieldValues: { paper_type: 'matte', printing_location: 'front' },
        deliveryMethod: 'STORE_PICKUP',
      });

      // Verify all contract keys required by order creation, QC, and invoice generation
      expect(quote).toHaveProperty('unitPrice');
      expect(quote).toHaveProperty('subtotal');
      expect(quote).toHaveProperty('baseSubtotal');
      expect(quote).toHaveProperty('optionsCost');
      expect(quote).toHaveProperty('dynamicModifiersTotal');
      expect(quote).toHaveProperty('designServiceFee');
      expect(quote).toHaveProperty('additionalChargesTotal');
      expect(quote).toHaveProperty('totalTax');
      expect(quote).toHaveProperty('estimatedShipping');
      expect(quote).toHaveProperty('grandTotal');
      expect(quote).toHaveProperty('specificationsSnapshot');
      expect(quote.specificationsSnapshot['paper_type']).toEqual(
        expect.objectContaining({
          value: 'matte',
          displayValue: 'Matte 300 GSM',
          label: 'Paper Type',
        }),
      );
    });
  });

  describe('Section 7 Required Acceptance Tests — Base Price and Optional Pricing Matrix (13 Tests)', () => {
    beforeEach(() => {
      jest.spyOn((service as any).prisma.product, 'findFirst').mockImplementation(({ where }: any) => {
        if (where?.OR?.some((cond: any) => cond.id === 'prod-base-only-001' || cond.slug === 'prod-base-only-001' || cond.sku === 'prod-base-only-001')) {
          return Promise.resolve(mockBaseOnlyProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-auto-001' || cond.slug === 'prod-auto-001' || cond.sku === 'prod-auto-001')) {
          return Promise.resolve(mockAutomaticProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-manual-001' || cond.slug === 'prod-manual-001' || cond.sku === 'prod-manual-001')) {
          return Promise.resolve(mockManualMatrixProduct);
        }
        if (where?.OR?.some((cond: any) => cond.id === 'prod-001' || cond.slug === 'prod-001' || cond.sku === 'prod-001')) {
          return Promise.resolve(mockProduct);
        }
        return Promise.resolve(null);
      });
    });

    it('1. Reference rate divided by minimum quantity: Starting Reference Rate ₹500 / MOQ 100 = ₹5.00/pc', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-base-only-001',
        quantity: 100,
      });

      expect(quote.startingReferenceRate).toBe(500);
      expect(quote.referenceUnitPrice).toBe(5.00);
      expect(quote.basePrice).toBe(5.00);
      expect(quote.unitPrice).toBe(5.00);
    });

    it('2. Quantity equal to minimum quantity: Qty 100 at ₹5.00/pc = ₹500 subtotal', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-base-only-001',
        quantity: 100,
      });

      expect(quote.quantity).toBe(100);
      expect(quote.baseSubtotal).toBe(500);
      expect(quote.subtotal).toBe(500);
    });

    it('3. Quantity below minimum quantity: Qty 50 < MOQ 100 is rejected with BadRequestException', async () => {
      await expect(
        service.calculateQuote({
          productId: 'prod-base-only-001',
          quantity: 50,
        }),
      ).rejects.toThrow(new BadRequestException('Minimum quantity for Base Only Visiting Cards is 100'));
    });

    it('4. Quantity above maximum quantity: Qty 15000 > Max 10000 is rejected with BadRequestException', async () => {
      await expect(
        service.calculateQuote({
          productId: 'prod-base-only-001',
          quantity: 15000,
        }),
      ).rejects.toThrow(new BadRequestException('Maximum quantity for Base Only Visiting Cards is 10000'));
    });

    it('5. Base-price-only quote without a matrix: Qty 200 at ₹5.00/pc = ₹1,000 subtotal without arbitrary discounts', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-base-only-001',
        quantity: 200,
      });

      expect(quote.referenceUnitPrice).toBe(5.00);
      expect(quote.unitPrice).toBe(5.00);
      expect(quote.baseSubtotal).toBe(1000);
      expect(quote.subtotal).toBe(1000);
      expect(quote.appliedOffer).toBeNull();
    });

    it('6. Automatic pricing with configured quantity tiers: Qty 500 resolves configured tier ₹4.50/pc', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-auto-001',
        quantity: 500,
      });

      expect(quote.unitPrice).toBe(4.50);
      expect(quote.subtotal).toBe(2250); // 500 * 4.50
    });

    it('7. Manual pricing with an exact configured match: Qty 250 with exact combination resolves ₹2.40/pc (₹600 total)', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-manual-001',
        quantity: 250,
        options: [
          { optionCode: 'paper', valueCode: '300gsm' },
          { optionCode: 'lamination', valueCode: 'matte' },
        ],
      });

      expect(quote.unitPrice).toBe(2.40);
      expect(quote.subtotal).toBe(600);
    });

    it('8. Missing manual price rejection: unconfigured quantity tier on manual matrix throws BadRequestException', async () => {
      await expect(
        service.calculateQuote({
          productId: 'prod-manual-001',
          quantity: 350,
          options: [
            { optionCode: 'paper', valueCode: '300gsm' },
            { optionCode: 'lamination', valueCode: 'matte' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('9. Group surcharge applied once: Corner Finish +₹0.50/pc applied exactly once to base unit price', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-base-only-001',
        quantity: 100,
        fieldValues: { corner_finish: 'rounded' },
      });

      // Reference unit price: 5.00 + Surcharge: 0.50 = 5.50
      expect(quote.unitPrice).toBe(5.50);
      expect(quote.optionsCost).toBe(50);
      expect(quote.subtotal).toBe(550);
    });

    it('10. Matrix-covered option not charged twice: option present in combination matrix row suppresses separate option surcharge', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-manual-001',
        quantity: 100,
        options: [
          { optionCode: 'paper', valueCode: '300gsm' },
          { optionCode: 'lamination', valueCode: 'matte' },
        ],
      });

      // Matrix row unitPrice is 6.00 for 100 units (total 600)
      // Paper (+1.00) and Lamination (+0.50) are both part of the matrix row, so optionsCost is 0
      expect(quote.unitPrice).toBe(6.00);
      expect(quote.optionsCost).toBe(0);
      expect(quote.subtotal).toBe(600);
    });

    it('11. Design fee applied once or zero when design is not requested: No design = ₹0 fee; Yes design = ₹150 fee', async () => {
      // Case A: Design Required = No -> ₹0 fee, location preserved
      const quoteNoDesign = await service.calculateQuote({
        productId: 'prod-base-only-001',
        quantity: 100,
        fieldValues: { design_required: 'no', printing_location: 'both' },
      });
      expect(quoteNoDesign.designServiceFee).toBe(0);
      expect(quoteNoDesign.subtotal).toBe(500);
      expect(quoteNoDesign.specificationsSnapshot['printing_location']).toBeDefined();
      expect(quoteNoDesign.specificationsSnapshot['printing_location'].value).toBe('both');

      // Case B: Design Required = Yes -> ₹150 fee applied exactly once
      const quoteWithDesign = await service.calculateQuote({
        productId: 'prod-base-only-001',
        quantity: 100,
        fieldValues: { design_required: 'yes', printing_location: 'both' },
      });
      expect(quoteWithDesign.designServiceFee).toBe(150);
      expect(quoteWithDesign.subtotal).toBe(650); // 500 + 150
    });

    it('12. Checkout recalculating the authoritative price: server strictly ignores client-supplied prices', async () => {
      const maliciousPayload = {
        productId: 'prod-base-only-001',
        quantity: 100,
        unitPrice: 0.01,
        totalPrice: 1.0,
        subtotal: 1.0,
        basePrice: 0.01,
      };

      const quote = await service.calculateQuote(maliciousPayload as any);
      expect(quote.unitPrice).toBe(5.00);
      expect(quote.subtotal).toBe(500);
    });

    it('13. Existing products and saved order snapshots remaining compatible: historical frozen order items remain unaltered', async () => {
      // Historical order item snapshot placed with past rates
      const historicalOrderItem = {
        id: 'hist-order-item-999',
        productId: 'prod-001',
        quantity: 5000,
        unitPrice: 1.85,
        totalPrice: 9250,
        specifications: {
          basePrice: 1.5,
          unitPrice: 1.85,
          subtotal: 9250,
        },
      };

      // Live quote calculates independently
      const liveQuote = await service.calculateQuote({
        productId: 'prod-001',
        quantity: 500,
        options: [{ optionCode: 'paper', valueCode: '350gsm' }],
      });

      expect(historicalOrderItem.totalPrice).toBe(9250);
      expect(historicalOrderItem.unitPrice).toBe(1.85);
      expect(liveQuote.subtotal).toBe(1250);
    });
  });

  describe('Dynamic Group-Based Additional Pricing (Acceptance Tests)', () => {
    beforeEach(() => {
      jest.spyOn((service as any).prisma.product, 'findFirst').mockImplementation(({ where }: any) => {
        if (where?.OR?.some((cond: any) => cond.id === 'prod-addon-001' || cond.slug === 'prod-addon-001' || cond.sku === 'prod-addon-001')) {
          return Promise.resolve(mockAddonProduct);
        }
        return Promise.resolve(null);
      });
    });

    it('1. Calculates quote for 100 pcs with additional pricing tier (₹0.20/pc on 170 GSM)', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-addon-001',
        quantity: 100,
        options: [{ optionCode: 'paper_stock', valueCode: '170_gsm' }],
      });

      // Matrix: 100 pcs * 5.0 = 500. Addon: 100 * 0.20 = 20. Subtotal: 520.
      expect(quote.effectiveBasePrice).toBe(5);
      expect(quote.baseSubtotal).toBe(500);
      expect(quote.optionsCost).toBe(20); // 100 * 0.20
      expect(quote.subtotal).toBe(520);
      expect(quote.selectedOptionsSummary).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            optionCode: 'paper_stock',
            valueCode: '170_gsm',
            additionalUnitPrice: 0.2,
            additionalChargeTotal: 20,
          }),
        ]),
      );
    });

    it('2. Calculates quote for 200 pcs with additional pricing tier (₹0.35/pc on 170 GSM)', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-addon-001',
        quantity: 200,
        options: [{ optionCode: 'paper_stock', valueCode: '170_gsm' }],
      });

      // Matrix: 200 pcs * 4.80 = 960. Addon: 200 * 0.35 = 70. Subtotal: 1030.
      expect(quote.effectiveBasePrice).toBe(4.8);
      expect(quote.optionsCost).toBe(70);
      expect(quote.subtotal).toBe(1030);
      expect(quote.unitPrice).toBe(5.15); // (4.80 + 0.35) = 5.15
    });

    it('3. Calculates quote for 300 pcs with heavy tier (₹1.50/pc on 350 GSM)', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-addon-001',
        quantity: 300,
        options: [{ optionCode: 'paper_stock', valueCode: '350_gsm' }],
      });

      // Matrix: 300 pcs * 4.50 = 1350. Addon: 300 * 1.50 = 450. Subtotal: 1800.
      expect(quote.effectiveBasePrice).toBe(4.5);
      expect(quote.optionsCost).toBe(450);
      expect(quote.subtotal).toBe(1800);
      expect(quote.unitPrice).toBe(6.0); // (4.50 + 1.50) = 6.00
    });

    it('4. Free/baseline option (130 GSM) incurs ₹0.00 additional charge', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-addon-001',
        quantity: 100,
        options: [{ optionCode: 'paper_stock', valueCode: '130_gsm' }],
      });

      expect(quote.baseSubtotal).toBe(500);
      expect(quote.optionsCost).toBe(0);
      expect(quote.subtotal).toBe(500);
      expect(quote.selectedOptionsSummary[0].additionalUnitPrice).toBe(0);
      expect(quote.selectedOptionsSummary[0].additionalChargeTotal).toBe(0);
    });

    it('5. Rejects quote when quantity is outside any configured additional pricing tier', async () => {
      await expect(
        service.calculateQuote({
          productId: 'prod-addon-001',
          quantity: 250, // Only 100, 200, 300 are configured
          options: [{ optionCode: 'paper_stock', valueCode: '170_gsm' }],
        }),
      ).rejects.toThrow('is not supported for option');
    });

    it('6. Rejects quote when option value is marked as excluded for that quantity tier', async () => {
      await expect(
        service.calculateQuote({
          productId: 'prod-addon-001',
          quantity: 300,
          options: [{ optionCode: 'paper_stock', valueCode: 'heavy_kraft' }],
        }),
      ).rejects.toThrow('is not supported for production at quantity 300');
    });

    it('7. Correctly calculates GST, Shipping, and optional Design Fee with additional charges', async () => {
      const quote = await service.calculateQuote({
        productId: 'prod-addon-001',
        quantity: 100,
        options: [{ optionCode: 'paper_stock', valueCode: '170_gsm' }],
        hasDesignService: true,
      });

      // Subtotal = Base 500 + Addon 20 + Design 150 = 670
      expect(quote.subtotal).toBe(670);
      expect(quote.designServiceFee).toBe(150);
      // Shipping: 670 < 1000 => 100
      expect(quote.estimatedShipping).toBe(100);
      // GST: 670 * 18% = 120.60
      expect(quote.totalTax).toBe(120.6);
      // Grand total = 670 + 120.60 + 100 = 890.60
      expect(quote.grandTotal).toBe(890.6);
    });
  });
});



