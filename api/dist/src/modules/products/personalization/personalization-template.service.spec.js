"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const personalization_template_service_1 = require("./personalization-template.service");
const prisma_service_1 = require("../../prisma/prisma.service");
describe('PersonalizationTemplateService', () => {
    let service;
    let prisma;
    beforeEach(async () => {
        prisma = {
            personalizationTemplate: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            personalizationField: {
                createMany: jest.fn(),
                deleteMany: jest.fn(),
            },
            $transaction: jest.fn(async (callback) => {
                if (typeof callback === 'function') {
                    return callback(prisma);
                }
                return callback;
            }),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                personalization_template_service_1.PersonalizationTemplateService,
                { provide: prisma_service_1.PrismaService, useValue: prisma },
            ],
        }).compile();
        service = module.get(personalization_template_service_1.PersonalizationTemplateService);
    });
    describe('Template Management & CRUD', () => {
        it('should create a template with PER_ORDER and PER_ITEM fields', async () => {
            const mockCreated = {
                id: 'tmpl-wedding',
                name: 'Wedding Keepsake Frame',
                code: 'WEDDING_FRAME_V1',
                description: 'Couple names and per-guest seating frame',
                category: 'Frames',
                isActive: true,
                fields: [
                    {
                        id: 'f1',
                        templateId: 'tmpl-wedding',
                        name: 'Couple Names',
                        code: 'couple_names',
                        inputType: 'TEXT',
                        scope: 'PER_ORDER',
                        isRequired: true,
                    },
                    {
                        id: 'f2',
                        templateId: 'tmpl-wedding',
                        name: 'Recipient Name',
                        code: 'recipient_name',
                        inputType: 'TEXT',
                        scope: 'PER_ITEM',
                        isRequired: true,
                    },
                ],
            };
            prisma.personalizationTemplate.create.mockResolvedValue(mockCreated);
            const result = await service.createTemplate({
                name: 'Wedding Keepsake Frame',
                code: 'wedding_frame_v1',
                description: 'Couple names and per-guest seating frame',
                category: 'Frames',
                isActive: true,
                fields: [
                    {
                        name: 'Couple Names',
                        code: 'couple_names',
                        inputType: 'TEXT',
                        scope: 'PER_ORDER',
                        isRequired: true,
                    },
                    {
                        name: 'Recipient Name',
                        code: 'recipient_name',
                        inputType: 'TEXT',
                        scope: 'PER_ITEM',
                        isRequired: true,
                    },
                ],
            });
            expect(prisma.personalizationTemplate.create).toHaveBeenCalled();
            expect(result.id).toBe('tmpl-wedding');
            expect(result.fields).toHaveLength(2);
        });
        it('should duplicate an existing template with a new code and copied fields', async () => {
            const mockOriginal = {
                id: 'tmpl-wedding',
                name: 'Wedding Keepsake Frame',
                code: 'WEDDING_FRAME_V1',
                description: 'Original description',
                category: 'Frames',
                isActive: true,
                fields: [
                    {
                        name: 'Couple Names',
                        code: 'couple_names',
                        inputType: 'TEXT',
                        scope: 'PER_ORDER',
                        isRequired: true,
                        sortOrder: 0,
                    },
                    {
                        name: 'Guest Name',
                        code: 'guest_name',
                        inputType: 'TEXT',
                        scope: 'PER_ITEM',
                        isRequired: true,
                        sortOrder: 1,
                    },
                ],
            };
            prisma.personalizationTemplate.findUnique.mockImplementation((args) => {
                if (args?.where?.id === 'tmpl-wedding') {
                    return Promise.resolve(mockOriginal);
                }
                return Promise.resolve(null);
            });
            prisma.personalizationTemplate.create.mockImplementation((args) => ({
                id: 'tmpl-wedding-copy',
                ...args.data,
                fields: args.data.fields.create,
            }));
            const copy = await service.duplicateTemplate('tmpl-wedding', 'Wedding Frame (Clone)');
            expect(copy.name).toBe('Wedding Frame (Clone)');
            expect(copy.code).toContain('wedding_frame_v1_copy');
            expect(copy.fields).toHaveLength(2);
        });
    });
    describe('Authoritative Personalization Validation', () => {
        const mockTemplate = {
            id: 'tmpl-1',
            name: 'Custom Frame Template',
            code: 'FRAME_CUSTOM',
            isActive: true,
            fields: [
                {
                    id: 'f_bride',
                    name: 'Bride Name',
                    code: 'bride_name',
                    inputType: 'TEXT',
                    scope: 'PER_ORDER',
                    isRequired: true,
                    validationRules: { minLength: 2, maxLength: 50 },
                },
                {
                    id: 'f_groom',
                    name: 'Groom Name',
                    code: 'groom_name',
                    inputType: 'TEXT',
                    scope: 'PER_ORDER',
                    isRequired: true,
                    validationRules: { minLength: 2, maxLength: 50 },
                },
                {
                    id: 'f_date',
                    name: 'Wedding Date',
                    code: 'wedding_date',
                    inputType: 'DATE',
                    scope: 'PER_ORDER',
                    isRequired: true,
                },
                {
                    id: 'f_recipient',
                    name: 'Recipient Name',
                    code: 'recipient_name',
                    inputType: 'TEXT',
                    scope: 'PER_ITEM',
                    isRequired: true,
                },
                {
                    id: 'f_table',
                    name: 'Table Number',
                    code: 'table_no',
                    inputType: 'NUMBER',
                    scope: 'PER_ITEM',
                    isRequired: false,
                },
            ],
        };
        it('should validate successfully when all PER_ORDER and exact count of PER_ITEM entries match quantity', () => {
            const quantity = 3;
            const payload = {
                templateId: 'tmpl-1',
                templateCode: 'FRAME_CUSTOM',
                sharedValues: {
                    bride_name: 'Priya',
                    groom_name: 'Rahul',
                    wedding_date: '2026-12-15',
                },
                perItemEntries: [
                    { itemIndex: 1, values: { recipient_name: 'Aarav Sharma', table_no: 4 } },
                    { itemIndex: 2, values: { recipient_name: 'Diya Patel', table_no: 4 } },
                    { itemIndex: 3, values: { recipient_name: 'Vikram Singh' } },
                ],
            };
            const result = service.validatePersonalization(mockTemplate, quantity, payload);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.sanitized.sharedValues.bride_name).toBe('Priya');
            expect(result.sanitized.perItemEntries).toHaveLength(3);
        });
        it('should fail validation when required PER_ORDER field is missing', () => {
            const quantity = 2;
            const payload = {
                templateId: 'tmpl-1',
                sharedValues: {
                    bride_name: 'Priya',
                    wedding_date: '2026-12-15',
                },
                perItemEntries: [
                    { itemIndex: 1, values: { recipient_name: 'Guest 1' } },
                    { itemIndex: 2, values: { recipient_name: 'Guest 2' } },
                ],
            };
            const result = service.validatePersonalization(mockTemplate, quantity, payload);
            expect(result.isValid).toBe(false);
            expect(result.errors.some((e) => e.includes('Groom Name'))).toBe(true);
        });
        it('should fail validation when perItemEntries count does NOT match ordered quantity', () => {
            const quantity = 5;
            const payload = {
                templateId: 'tmpl-1',
                sharedValues: {
                    bride_name: 'Priya',
                    groom_name: 'Rahul',
                    wedding_date: '2026-12-15',
                },
                perItemEntries: [
                    { itemIndex: 1, values: { recipient_name: 'Guest 1' } },
                    { itemIndex: 2, values: { recipient_name: 'Guest 2' } },
                    { itemIndex: 3, values: { recipient_name: 'Guest 3' } },
                ],
            };
            const result = service.validatePersonalization(mockTemplate, quantity, payload);
            expect(result.isValid).toBe(false);
            expect(result.errors.some((e) => e.includes('requires exactly 5 entries to match product quantity (received 3)'))).toBe(true);
        });
        it('should fail validation if an individual item row is missing a required PER_ITEM field', () => {
            const quantity = 2;
            const payload = {
                templateId: 'tmpl-1',
                sharedValues: {
                    bride_name: 'Priya',
                    groom_name: 'Rahul',
                    wedding_date: '2026-12-15',
                },
                perItemEntries: [
                    { itemIndex: 1, values: { recipient_name: 'Guest 1' } },
                    { itemIndex: 2, values: { recipient_name: '' } },
                ],
            };
            const result = service.validatePersonalization(mockTemplate, quantity, payload);
            expect(result.isValid).toBe(false);
            expect(result.errors.some((e) => e.includes("Item #2: 'Recipient Name' is required"))).toBe(true);
        });
        it('should enforce product-specific field overrides (e.g. making an optional field required on a specific product)', () => {
            const quantity = 1;
            const productConfigOverride = {
                fieldOverrides: {
                    table_no: { isRequired: true },
                },
            };
            const payload = {
                templateId: 'tmpl-1',
                sharedValues: {
                    bride_name: 'Priya',
                    groom_name: 'Rahul',
                    wedding_date: '2026-12-15',
                },
                perItemEntries: [
                    { itemIndex: 1, values: { recipient_name: 'Guest 1' } },
                ],
            };
            const result = service.validatePersonalization(mockTemplate, quantity, payload, productConfigOverride);
            expect(result.isValid).toBe(false);
            expect(result.errors.some((e) => e.includes("Item #1: 'Table Number' is required"))).toBe(true);
        });
    });
    describe('Print-ready CSV Export for Production', () => {
        it('should generate a properly formatted CSV with order, item, shared, and per-item columns', () => {
            const mockOrder = { orderNumber: 'ORD-2026-0042' };
            const mockOrderItem = {
                sku: 'FRAME-A4-WOOD',
                productName: 'Custom Wooden Photo Frame',
                quantity: 2,
                personalizationData: {
                    templateName: 'Wedding Keepsake',
                    sharedValues: {
                        bride_name: 'Ananya',
                        groom_name: 'Rohan',
                        wedding_date: '2026-11-20',
                    },
                },
            };
            const mockRecords = [
                {
                    itemIndex: 1,
                    variantCombination: { size: 'A4', finish: 'Teak Wood' },
                    fieldValues: { recipient_name: 'Uncle David', message: 'Best wishes, with love!' },
                    status: 'PENDING',
                },
                {
                    itemIndex: 2,
                    variantCombination: { size: 'A4', finish: 'Rosewood' },
                    fieldValues: { recipient_name: 'Aunt Sarah', message: 'Congratulations!' },
                    status: 'PENDING',
                },
            ];
            const csv = service.generatePersonalizationCsv(mockOrder, mockOrderItem, mockRecords);
            expect(csv).toContain('Item #');
            expect(csv).toContain('Variant');
            expect(csv).toContain('recipient_name');
            expect(csv).toContain('message');
            expect(csv).toContain('Shared: bride_name');
            expect(csv).toContain('Ananya');
            expect(csv).toContain('Uncle David');
            expect(csv).toContain('Rosewood');
        });
    });
});
//# sourceMappingURL=personalization-template.service.spec.js.map