"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const pricing_service_1 = require("./pricing.service");
const prisma_service_1 = require("../prisma/prisma.service");
const common_1 = require("@nestjs/common");
const shipping_gst_service_1 = require("../shipping-gst/shipping-gst.service");
describe('Multi-Variant Product Ordering & Selection Behavior Tests', () => {
    let service;
    const mockTShirtProduct = {
        id: 'prod-tshirt-001',
        name: 'Custom Premium Crewneck T-Shirt',
        sku: 'TSHIRT-CREW-01',
        pricingModel: 'VOLUME_TIER',
        basePrice: 500.0,
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
                    { id: 'opt-3xl', value: '3xl', label: 'Triple XL (3XL)', priceModifierType: 'FIXED', priceModifier: 80, isActive: false },
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
                const idCond = orConditions.find((c) => c.id);
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
        const module = await testing_1.Test.createTestingModule({
            providers: [
                pricing_service_1.PricingService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrismaService },
                { provide: shipping_gst_service_1.ShippingGstService, useValue: mockShippingGstService },
            ],
        }).compile();
        service = module.get(pricing_service_1.PricingService);
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
        expect(quote.quantity).toBe(5);
        expect(quote.variantLines).toHaveLength(3);
        expect(quote.variantLines[0].quantity).toBe(2);
        expect(quote.variantLines[0].unitPrice).toBe(300);
        expect(quote.variantLines[0].lineSubtotal).toBe(600);
        expect(quote.variantLines[1].quantity).toBe(2);
        expect(quote.variantLines[1].unitPrice).toBe(300);
        expect(quote.variantLines[1].lineSubtotal).toBe(600);
        expect(quote.variantLines[2].quantity).toBe(1);
        expect(quote.variantLines[2].unitPrice).toBe(350);
        expect(quote.variantLines[2].lineSubtotal).toBe(350);
        expect(quote.subtotal).toBe(1550);
    });
    it('3. Volume tier bracket is determined by total order quantity (e.g. 10 pcs unlocks 10-49 tier rate)', async () => {
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
        expect(quote.variantLines[0].unitPrice).toBe(250);
        expect(quote.variantLines[0].lineSubtotal).toBe(1250);
        expect(quote.variantLines[1].unitPrice).toBe(250);
        expect(quote.variantLines[1].lineSubtotal).toBe(1250);
        expect(quote.subtotal).toBe(2500);
    });
    it('4. Duplicate variant combinations are merged into a single consolidated line', async () => {
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
        expect(quote.variantLines[0].quantity).toBe(5);
        expect(quote.variantLines[0].lineSubtotal).toBe(1500);
        expect(quote.quantity).toBe(5);
    });
    it('5. Shared design fee is charged once per product order and not multiplied per variant line', async () => {
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
        expect(quote.designServiceFee).toBe(150);
        expect(quote.subtotal).toBe(1650);
    });
    it('6. Rejects order when total variant quantity is below product minimum order quantity', async () => {
        await expect(service.calculateQuote({
            productId: mockTShirtProduct.id,
            quantity: 3,
            options: [{ optionCode: 'fabric', valueCode: 'cotton_100' }],
            variantLines: [
                { combination: { size: 'm', color: 'black' }, quantity: 2 },
                { combination: { size: 'xl', color: 'white' }, quantity: 1 },
            ],
        })).rejects.toThrow(common_1.BadRequestException);
    });
    it('7. Inactive options cannot be ordered in variant combinations', async () => {
        await expect(service.calculateQuote({
            productId: mockTShirtProduct.id,
            quantity: 5,
            options: [{ optionCode: 'fabric', valueCode: 'cotton_100' }],
            variantLines: [
                { combination: { size: '3xl', color: 'black' }, quantity: 5 },
            ],
        })).rejects.toThrow(common_1.BadRequestException);
    });
    it('8. Server-side validation rejects invalid negative or zero quantities', async () => {
        await expect(service.calculateQuote({
            productId: mockTShirtProduct.id,
            quantity: 5,
            options: [{ optionCode: 'fabric', valueCode: 'cotton_100' }],
            variantLines: [
                { combination: { size: 'm', color: 'black' }, quantity: 0 },
            ],
        })).rejects.toThrow(common_1.BadRequestException);
    });
});
//# sourceMappingURL=multi-variant-pricing.spec.js.map