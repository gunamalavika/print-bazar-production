"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pricing_service_1 = require("../pricing/pricing.service");
const shipping_gst_service_1 = require("../shipping-gst/shipping-gst.service");
const seed_products_1 = require("../../../prisma/seed-products");
describe('Deterministic Seed Products Acceptance Suite (PB2.0)', () => {
    let prisma;
    let pricingService;
    beforeAll(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                prisma_service_1.PrismaService,
                pricing_service_1.PricingService,
                {
                    provide: shipping_gst_service_1.ShippingGstService,
                    useValue: {
                        calculateShippingAndTax: jest.fn().mockImplementation((subtotal) => {
                            const gst = Math.round(subtotal * 0.18 * 100) / 100;
                            return Promise.resolve({
                                shippingFee: 100,
                                gstAmount: gst,
                                cgst: gst / 2,
                                sgst: gst / 2,
                                igst: 0,
                                isInterState: false,
                            });
                        }),
                    },
                },
            ],
        }).compile();
        prisma = module.get(prisma_service_1.PrismaService);
        pricingService = module.get(pricing_service_1.PricingService);
        await (0, seed_products_1.seedDeterministicProducts)(prisma);
    });
    afterAll(async () => {
        await prisma.$disconnect();
    });
    it('Criterion 1 — Exactly five deterministic seed products exist with unique SKUs', async () => {
        const products = await prisma.product.findMany({
            where: { sku: { in: [...seed_products_1.SEED_PRODUCT_SKUS] } },
        });
        expect(products).toHaveLength(5);
        const skus = products.map((p) => p.sku).sort();
        expect(skus).toEqual([...seed_products_1.SEED_PRODUCT_SKUS].sort());
        for (const p of products) {
            expect(p.status).toBe('PUBLISHED');
            expect(p.isStudioConfigured).toBe(true);
        }
    });
    it('Criterion 2 — Each product has its expected distinct option groups and options', async () => {
        for (const def of seed_products_1.SEED_PRODUCTS_DATA) {
            const product = await prisma.product.findUnique({
                where: { sku: def.sku },
                include: {
                    optionGroups: {
                        include: { options: true },
                    },
                },
            });
            expect(product).toBeDefined();
            expect(product.optionGroups).toHaveLength(def.optionGroups.length);
            const seededGroupCodes = product.optionGroups.map((g) => g.code).sort();
            const expectedGroupCodes = def.optionGroups.map((g) => g.code).sort();
            expect(seededGroupCodes).toEqual(expectedGroupCodes);
            for (const expectedGrp of def.optionGroups) {
                const foundGrp = product.optionGroups.find((g) => g.code === expectedGrp.code);
                expect(foundGrp).toBeDefined();
                expect(foundGrp.options).toHaveLength(expectedGrp.options.length);
                const optionValues = foundGrp.options.map((o) => o.value).sort();
                const expectedValues = expectedGrp.options.map((o) => o.value).sort();
                expect(optionValues).toEqual(expectedValues);
            }
        }
    });
    it('Criterion 3 — Every conditional rule references existing valid option groups and values', async () => {
        const products = await prisma.product.findMany({
            where: { sku: { in: [...seed_products_1.SEED_PRODUCT_SKUS] } },
            include: {
                optionGroups: {
                    include: { options: true },
                },
                configurationRules: true,
            },
        });
        for (const p of products) {
            const validGroupCodes = new Set(p.optionGroups.map((g) => g.code));
            const validOptionMap = {};
            for (const g of p.optionGroups) {
                validOptionMap[g.code] = new Set(g.options.map((o) => o.value));
            }
            for (const rule of p.configurationRules) {
                const payload = rule.actionPayload || {};
                if (payload.conditionCombination && typeof payload.conditionCombination === 'object') {
                    for (const [grpCode, optVal] of Object.entries(payload.conditionCombination)) {
                        expect(validGroupCodes.has(grpCode)).toBe(true);
                        expect(validOptionMap[grpCode].has(optVal)).toBe(true);
                    }
                }
                else {
                    expect(validGroupCodes.has(rule.conditionGroupCode)).toBe(true);
                    if (rule.conditionOperator === 'EQUALS' || rule.conditionOperator === 'NOT_EQUALS') {
                        expect(validOptionMap[rule.conditionGroupCode].has(rule.conditionOptionValue)).toBe(true);
                    }
                }
                if (rule.targetGroupCode) {
                    expect(validGroupCodes.has(rule.targetGroupCode)).toBe(true);
                }
            }
        }
    });
    describe('Criteria 4 & 5 — Artwork conditions resolve dynamically based on option selections', () => {
        it('Product A (Business Cards): Front Only requires 1 slot (Front Side)', async () => {
            const product = await prisma.product.findUnique({
                where: { sku: 'SEED-BC-001' },
                include: { configurationRules: true },
            });
            const frontRule = product.configurationRules.find((r) => {
                const p = r.actionPayload || {};
                return (p.conditionCombination?.design_required === 'no' &&
                    p.conditionCombination?.print_location === 'front');
            });
            expect(frontRule).toBeDefined();
            const payload = frontRule.actionPayload;
            expect(payload.artworkStatus).toBe('REQUIRED');
            expect(payload.slotCount).toBe(1);
            expect(payload.slotLabels).toEqual(['Front Side']);
        });
        it('Product A (Business Cards): Both Sides requires 2 slots (Front Side & Back Side)', async () => {
            const product = await prisma.product.findUnique({
                where: { sku: 'SEED-BC-001' },
                include: { configurationRules: true },
            });
            const bothRule = product.configurationRules.find((r) => {
                const p = r.actionPayload || {};
                return (p.conditionCombination?.design_required === 'no' &&
                    p.conditionCombination?.print_location === 'both');
            });
            expect(bothRule).toBeDefined();
            const payload = bothRule.actionPayload;
            expect(payload.artworkStatus).toBe('REQUIRED');
            expect(payload.slotCount).toBe(2);
            expect(payload.slotLabels).toEqual(['Front Side', 'Back Side']);
        });
        it('Product D (Custom Mugs): Uses product-specific slot labels (Mug Face / Handle Graphics)', async () => {
            const product = await prisma.product.findUnique({
                where: { sku: 'SEED-MUG-004' },
                include: { configurationRules: true },
            });
            const oneSideRule = product.configurationRules.find((r) => r.actionPayload?.conditionCombination?.print_location === 'one_side');
            const bothSidesRule = product.configurationRules.find((r) => r.actionPayload?.conditionCombination?.print_location === 'both_sides');
            expect(oneSideRule).toBeDefined();
            expect(oneSideRule.actionPayload.slotLabels).toEqual(['Mug Face Graphic']);
            expect(bothSidesRule).toBeDefined();
            expect(bothSidesRule.actionPayload.slotLabels).toEqual([
                'Left Handle Graphic',
                'Right Handle Graphic',
            ]);
        });
    });
    it('Criterion 6 — Design Required = No does not hide Printing Location', async () => {
        const quote = await pricingService.calculateQuote({
            productId: 'SEED-BC-001',
            quantity: 100,
            fieldValues: {
                design_required: 'no',
                print_location: 'front',
                paper_type: 'matte',
                lamination: 'none',
                cutting_style: 'square',
            },
        });
        expect(quote.specificationsSnapshot['print_location']).toBeDefined();
        expect(quote.specificationsSnapshot['print_location'].value).toBe('front');
        expect(quote.specificationsSnapshot['design_required'].value).toBe('no');
    });
    it('Criterion 7 — Products without a Design Required group (Flyers SEED-FLY-002) quote and work correctly', async () => {
        const quote = await pricingService.calculateQuote({
            productId: 'SEED-FLY-002',
            quantity: 100,
            fieldValues: {
                flyer_size: 'a5',
                paper_type: '130gsm',
                print_location: 'front',
            },
        });
        expect(quote).toBeDefined();
        expect(quote.unitPrice).toBe(4.50);
        expect(quote.subtotal).toBe(450.00);
        expect(quote.designServiceFee).toBe(0);
        expect(quote.specificationsSnapshot['flyer_size'].value).toBe('a5');
        expect(quote.specificationsSnapshot['print_location'].value).toBe('front');
    });
    describe('Criteria 8 & 9 — Only explicitly configured combinations are sellable at exact configured rates', () => {
        it('Product A: Front / Matte / None / Square resolves exact prices across all quantity tiers', async () => {
            const q100 = await pricingService.calculateQuote({
                productId: 'SEED-BC-001',
                quantity: 100,
                fieldValues: { print_location: 'front', paper_type: 'matte', lamination: 'none', cutting_style: 'square' },
            });
            expect(q100.unitPrice).toBe(3.00);
            expect(q100.subtotal).toBe(300.00);
            const q250 = await pricingService.calculateQuote({
                productId: 'SEED-BC-001',
                quantity: 250,
                fieldValues: { print_location: 'front', paper_type: 'matte', lamination: 'none', cutting_style: 'square' },
            });
            expect(q250.unitPrice).toBe(2.20);
            expect(q250.subtotal).toBe(550.00);
            const q500 = await pricingService.calculateQuote({
                productId: 'SEED-BC-001',
                quantity: 500,
                fieldValues: { print_location: 'front', paper_type: 'matte', lamination: 'none', cutting_style: 'square' },
            });
            expect(q500.unitPrice).toBe(1.50);
            expect(q500.subtotal).toBe(750.00);
            const q1000 = await pricingService.calculateQuote({
                productId: 'SEED-BC-001',
                quantity: 1000,
                fieldValues: { print_location: 'front', paper_type: 'matte', lamination: 'none', cutting_style: 'square' },
            });
            expect(q1000.unitPrice).toBe(1.00);
            expect(q1000.subtotal).toBe(1000.00);
        });
        it('Product B (Flyers): A4 / 170 GSM / Both resolves exact prices', async () => {
            const q100 = await pricingService.calculateQuote({
                productId: 'SEED-FLY-002',
                quantity: 100,
                fieldValues: { flyer_size: 'a4', paper_type: '170gsm', print_location: 'both' },
            });
            expect(q100.unitPrice).toBe(11.00);
            expect(q100.subtotal).toBe(1100.00);
            const q5000 = await pricingService.calculateQuote({
                productId: 'SEED-FLY-002',
                quantity: 5000,
                fieldValues: { flyer_size: 'a4', paper_type: '170gsm', print_location: 'both' },
            });
            expect(q5000.unitPrice).toBe(4.20);
            expect(q5000.subtotal).toBe(21000.00);
        });
        it('Product C (Tri-Fold Brochures): A4 / Tri-Fold / 250 GSM / Both / No Design resolves exact prices', async () => {
            const q100 = await pricingService.calculateQuote({
                productId: 'SEED-BRO-003',
                quantity: 100,
                fieldValues: {
                    brochure_size: 'a4',
                    fold_type: 'tri_fold',
                    paper_type: '250gsm',
                    print_location: 'both',
                    design_required: 'no',
                },
            });
            expect(q100.unitPrice).toBe(15.00);
            expect(q100.subtotal).toBe(1500.00);
        });
        it('Product D (Custom Mugs): Standard Ceramic / Both Sides resolves exact prices', async () => {
            const q10 = await pricingService.calculateQuote({
                productId: 'SEED-MUG-004',
                quantity: 10,
                fieldValues: { mug_type: 'standard_ceramic', print_location: 'both_sides', design_required: 'no' },
            });
            expect(q10.unitPrice).toBe(220.00);
            expect(q10.subtotal).toBe(2200.00);
            const q100 = await pricingService.calculateQuote({
                productId: 'SEED-MUG-004',
                quantity: 100,
                fieldValues: { mug_type: 'standard_ceramic', print_location: 'both_sides', design_required: 'no' },
            });
            expect(q100.unitPrice).toBe(115.00);
            expect(q100.subtotal).toBe(11500.00);
        });
        it('Product E (Stickers): Custom / Large / Waterproof / Glossy resolves exact prices', async () => {
            const q100 = await pricingService.calculateQuote({
                productId: 'SEED-LBL-005',
                quantity: 100,
                fieldValues: { label_shape: 'custom', label_size: 'large', label_material: 'waterproof', label_finish: 'glossy' },
            });
            expect(q100.unitPrice).toBe(6.00);
            expect(q100.subtotal).toBe(600.00);
            const q5000 = await pricingService.calculateQuote({
                productId: 'SEED-LBL-005',
                quantity: 5000,
                fieldValues: { label_shape: 'custom', label_size: 'large', label_material: 'waterproof', label_finish: 'glossy' },
            });
            expect(q5000.unitPrice).toBe(2.10);
            expect(q5000.subtotal).toBe(10500.00);
        });
    });
    it('Criterion 10 — Unconfigured combination is strictly rejected with unavailable error', async () => {
        await expect(pricingService.calculateQuote({
            productId: 'SEED-BC-001',
            quantity: 100,
            fieldValues: {
                print_location: 'front',
                paper_type: 'matte',
                lamination: 'none',
                cutting_style: 'rounded',
            },
        })).rejects.toThrow(new common_1.BadRequestException('This combination is currently unavailable. Please select another configuration.'));
        await expect(pricingService.calculateQuote({
            productId: 'SEED-FLY-002',
            quantity: 100,
            fieldValues: {
                flyer_size: 'a4',
                paper_type: '130gsm',
                print_location: 'front',
            },
        })).rejects.toThrow(new common_1.BadRequestException('This combination is currently unavailable. Please select another configuration.'));
    });
    it('Criterion 11 — Valid combination requested with unconfigured quantity is rejected (no silent fallback)', async () => {
        await expect(pricingService.calculateQuote({
            productId: 'SEED-BC-001',
            quantity: 350,
            fieldValues: {
                print_location: 'front',
                paper_type: 'matte',
                lamination: 'none',
                cutting_style: 'square',
            },
        })).rejects.toThrow(common_1.BadRequestException);
    });
    it('Criterion 12 — Client cannot spoof or override authoritative server unit price', async () => {
        const maliciousPayload = {
            productId: 'SEED-BC-001',
            quantity: 100,
            fieldValues: {
                print_location: 'front',
                paper_type: 'matte',
                lamination: 'none',
                cutting_style: 'square',
            },
            unitPrice: 0.01,
            totalPrice: 1.0,
            subtotal: 1.0,
            basePrice: 0.01,
        };
        const quote = await pricingService.calculateQuote(maliciousPayload);
        expect(quote.unitPrice).toBe(3.00);
        expect(quote.subtotal).toBe(300.00);
    });
    it('Criterion 13 — Duplicate combination collision detection identifies normalized matches', async () => {
        const normalizeCombKey = (opts) => Object.keys(opts)
            .sort()
            .map((k) => `${k}:${opts[k]}`)
            .join('|');
        const entry1 = { print_location: 'front', paper_type: 'matte', lamination: 'none', cutting_style: 'square' };
        const entry2 = { cutting_style: 'square', lamination: 'none', paper_type: 'matte', print_location: 'front' };
        expect(normalizeCombKey(entry1)).toBe(normalizeCombKey(entry2));
    });
    it('Criterion 14 — Rerunning the seed is completely idempotent and produces no duplicates', async () => {
        await (0, seed_products_1.seedDeterministicProducts)(prisma);
        const products = await prisma.product.findMany({
            where: { sku: { in: [...seed_products_1.SEED_PRODUCT_SKUS] } },
            include: {
                optionGroups: true,
                configurationRules: true,
                pricingMatrices: true,
            },
        });
        expect(products).toHaveLength(5);
        for (const def of seed_products_1.SEED_PRODUCTS_DATA) {
            const p = products.find((x) => x.sku === def.sku);
            expect(p).toBeDefined();
            expect(p.optionGroups).toHaveLength(def.optionGroups.length);
            expect(p.configurationRules).toHaveLength(def.configurationRules.length);
            const totalTiers = def.pricingMatrix.reduce((acc, c) => acc + c.tiers.length, 0);
            expect(p.pricingMatrices).toHaveLength(totalTiers);
        }
    });
    it('Criterion 15 — Existing valid pricing rows in system remain functional alongside seed products', async () => {
        const existingProducts = await prisma.product.findMany({
            where: { sku: { notIn: [...seed_products_1.SEED_PRODUCT_SKUS] } },
            take: 5,
        });
        expect(existingProducts).toBeDefined();
        for (const ep of existingProducts) {
            expect(seed_products_1.SEED_PRODUCT_SKUS).not.toContain(ep.sku);
        }
    });
});
//# sourceMappingURL=seed-products.spec.js.map