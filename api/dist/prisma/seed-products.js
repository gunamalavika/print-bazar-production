"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEED_PRODUCTS_DATA = exports.SEED_PRODUCT_SKUS = void 0;
exports.seedDeterministicProducts = seedDeterministicProducts;
exports.cleanupSeedProducts = cleanupSeedProducts;
const client_1 = require("@prisma/client");
exports.SEED_PRODUCT_SKUS = [
    'SEED-BC-001',
    'SEED-FLY-002',
    'SEED-BRO-003',
    'SEED-MUG-004',
    'SEED-LBL-005',
];
exports.SEED_PRODUCTS_DATA = [
    {
        sku: 'SEED-BC-001',
        slug: 'seed-premium-business-cards',
        name: 'Premium Business Cards',
        categorySlug: 'business-cards',
        categoryName: 'Visiting Cards & Stationery',
        description: 'High-definition industrial offset business cards with custom paper stock, lamination, and blade cutting.',
        defaultSize: '89 mm x 54 mm (Standard Visiting Card)',
        basePrice: 1.50,
        minQuantity: 100,
        maxQuantity: 10000,
        quantityStep: 100,
        productionDays: 2,
        artworkRequirement: 'REQUIRED',
        minimumArtworkMegapixels: 2.0,
        designServiceRequirement: 'OPTIONAL',
        designServicePrice: 250.00,
        designServiceFee: 250.00,
        tags: ['Visiting Cards', 'Business Cards', 'Offset', 'Corporate', 'Seed'],
        images: [
            {
                url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80',
                altText: 'Premium Business Cards Stack Front View',
                isPrimary: true,
                sortOrder: 0,
            },
        ],
        optionGroups: [
            {
                name: 'Design Required',
                code: 'design_required',
                inputType: 'RADIO',
                description: 'Choose whether you have finished artwork or need design service',
                isRequired: true,
                sortOrder: 1,
                options: [
                    { label: 'No (I have print-ready artwork)', value: 'no', isDefault: true, sortOrder: 0 },
                    { label: 'Yes (PB Design Studio Assistance)', value: 'yes', isDefault: false, sortOrder: 1 },
                ],
            },
            {
                name: 'Printing Location',
                code: 'print_location',
                inputType: 'PILL',
                description: 'Select which sides of the card are printed',
                isRequired: true,
                sortOrder: 2,
                options: [
                    { label: 'Front Only', value: 'front', isDefault: true, sortOrder: 0 },
                    { label: 'Back Only', value: 'back', isDefault: false, sortOrder: 1 },
                    { label: 'Both Sides', value: 'both', isDefault: false, sortOrder: 2 },
                ],
            },
            {
                name: 'Paper Substrate',
                code: 'paper_type',
                inputType: 'SELECT',
                description: 'Premium paper stock weight and coating',
                isRequired: true,
                sortOrder: 3,
                options: [
                    { label: '350 GSM Matte Art Card', value: 'matte', isDefault: true, sortOrder: 0 },
                    { label: '350 GSM Glossy Art Card', value: 'glossy', isDefault: false, sortOrder: 1 },
                ],
            },
            {
                name: 'Lamination Finish',
                code: 'lamination',
                inputType: 'SELECT',
                description: 'Protective thermal lamination coating',
                isRequired: true,
                sortOrder: 4,
                options: [
                    { label: 'None (Uncoated)', value: 'none', isDefault: true, sortOrder: 0 },
                    { label: 'Thermal Matte Lamination', value: 'matte', isDefault: false, sortOrder: 1 },
                    { label: 'High Gloss Lamination', value: 'gloss', isDefault: false, sortOrder: 2 },
                ],
            },
            {
                name: 'Cutting Style',
                code: 'cutting_style',
                inputType: 'SELECT',
                description: 'Corner profile and blade trimming',
                isRequired: true,
                sortOrder: 5,
                options: [
                    { label: 'Standard Square Cut', value: 'square', isDefault: true, sortOrder: 0 },
                    { label: 'Die-Cut Rounded Corners', value: 'rounded', isDefault: false, sortOrder: 1 },
                ],
            },
        ],
        configurationRules: [
            {
                name: 'BC Artwork: No Design + Front Only',
                conditionGroupCode: 'print_location',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'front',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    conditionCombination: { design_required: 'no', print_location: 'front' },
                    artworkStatus: 'REQUIRED',
                    slotCount: 1,
                    slotLabels: ['Front Side'],
                    minMegapixels: 2.0,
                    maxFileSizeMb: 50,
                    requireDesignBrief: false,
                    customerSuppliedSides: ['Front Side'],
                },
            },
            {
                name: 'BC Artwork: No Design + Back Only',
                conditionGroupCode: 'print_location',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'back',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    conditionCombination: { design_required: 'no', print_location: 'back' },
                    artworkStatus: 'REQUIRED',
                    slotCount: 1,
                    slotLabels: ['Back Side'],
                    minMegapixels: 2.0,
                    maxFileSizeMb: 50,
                    requireDesignBrief: false,
                    customerSuppliedSides: ['Back Side'],
                },
            },
            {
                name: 'BC Artwork: No Design + Both Sides',
                conditionGroupCode: 'print_location',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'both',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    conditionCombination: { design_required: 'no', print_location: 'both' },
                    artworkStatus: 'REQUIRED',
                    slotCount: 2,
                    slotLabels: ['Front Side', 'Back Side'],
                    minMegapixels: 2.0,
                    maxFileSizeMb: 50,
                    requireDesignBrief: false,
                    customerSuppliedSides: ['Front Side', 'Back Side'],
                },
            },
            {
                name: 'BC Artwork: Design Assistance Required',
                conditionGroupCode: 'design_required',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'yes',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    artworkStatus: 'OPTIONAL',
                    slotCount: 2,
                    slotLabels: ['Front Side Reference', 'Back Side Reference'],
                    requireDesignBrief: true,
                    showDesignBrief: true,
                    designServicePolicy: 'REQUIRE_BRIEF',
                    customerSuppliedSides: [],
                },
            },
        ],
        pricingMatrix: [
            {
                combination: { print_location: 'front', paper_type: 'matte', lamination: 'none', cutting_style: 'square' },
                tiers: [
                    { quantity: 100, unitPrice: 3.00 },
                    { quantity: 250, unitPrice: 2.20 },
                    { quantity: 500, unitPrice: 1.50 },
                    { quantity: 1000, unitPrice: 1.00 },
                ],
            },
            {
                combination: { print_location: 'both', paper_type: 'matte', lamination: 'none', cutting_style: 'square' },
                tiers: [
                    { quantity: 100, unitPrice: 4.00 },
                    { quantity: 250, unitPrice: 3.00 },
                    { quantity: 500, unitPrice: 2.20 },
                    { quantity: 1000, unitPrice: 1.60 },
                ],
            },
            {
                combination: { print_location: 'both', paper_type: 'glossy', lamination: 'gloss', cutting_style: 'rounded' },
                tiers: [
                    { quantity: 100, unitPrice: 5.00 },
                    { quantity: 250, unitPrice: 4.00 },
                    { quantity: 500, unitPrice: 3.00 },
                    { quantity: 1000, unitPrice: 2.20 },
                ],
            },
        ],
    },
    {
        sku: 'SEED-FLY-002',
        slug: 'seed-promotional-flyers',
        name: 'Promotional Flyers',
        categorySlug: 'marketing-materials',
        categoryName: 'Marketing Materials',
        description: 'Vibrant full-color commercial advertising flyers printed on silk or gloss text paper. No design service option.',
        defaultSize: 'A5 (148 mm x 210 mm)',
        basePrice: 2.50,
        minQuantity: 100,
        maxQuantity: 50000,
        quantityStep: 100,
        productionDays: 2,
        artworkRequirement: 'REQUIRED',
        minimumArtworkMegapixels: 1.5,
        designServiceRequirement: 'DISABLED',
        tags: ['Flyers', 'Leaflets', 'Marketing', 'Promotions', 'Seed'],
        images: [
            {
                url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80',
                altText: 'Promotional Flyers Stack',
                isPrimary: true,
                sortOrder: 0,
            },
        ],
        optionGroups: [
            {
                name: 'Flyer Format Size',
                code: 'flyer_size',
                inputType: 'PILL',
                description: 'Standard trimmed international paper format',
                isRequired: true,
                sortOrder: 1,
                options: [
                    { label: 'A5 (148 × 210 mm)', value: 'a5', isDefault: true, sortOrder: 0 },
                    { label: 'A4 (210 × 297 mm)', value: 'a4', isDefault: false, sortOrder: 1 },
                ],
            },
            {
                name: 'Paper Weight',
                code: 'paper_type',
                inputType: 'SELECT',
                description: 'Paper stock density',
                isRequired: true,
                sortOrder: 2,
                options: [
                    { label: '130 GSM Gloss Art Paper', value: '130gsm', isDefault: true, sortOrder: 0 },
                    { label: '170 GSM Premium Silk Paper', value: '170gsm', isDefault: false, sortOrder: 1 },
                ],
            },
            {
                name: 'Printing Location',
                code: 'print_location',
                inputType: 'RADIO',
                description: 'Single or double sided printing',
                isRequired: true,
                sortOrder: 3,
                options: [
                    { label: 'Single Side (Front Only)', value: 'front', isDefault: true, sortOrder: 0 },
                    { label: 'Both Sides (Front & Back)', value: 'both', isDefault: false, sortOrder: 1 },
                ],
            },
        ],
        configurationRules: [
            {
                name: 'Flyer Artwork: Front Only',
                conditionGroupCode: 'print_location',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'front',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    conditionCombination: { print_location: 'front' },
                    artworkStatus: 'REQUIRED',
                    slotCount: 1,
                    slotLabels: ['Front Artwork File'],
                    minMegapixels: 1.5,
                    maxFileSizeMb: 50,
                    requireDesignBrief: false,
                },
            },
            {
                name: 'Flyer Artwork: Both Sides',
                conditionGroupCode: 'print_location',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'both',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    conditionCombination: { print_location: 'both' },
                    artworkStatus: 'REQUIRED',
                    slotCount: 2,
                    slotLabels: ['Front Artwork File', 'Back Artwork File'],
                    minMegapixels: 1.5,
                    maxFileSizeMb: 50,
                    requireDesignBrief: false,
                },
            },
        ],
        pricingMatrix: [
            {
                combination: { flyer_size: 'a5', paper_type: '130gsm', print_location: 'front' },
                tiers: [
                    { quantity: 100, unitPrice: 4.50 },
                    { quantity: 500, unitPrice: 3.00 },
                    { quantity: 1000, unitPrice: 2.20 },
                    { quantity: 5000, unitPrice: 1.40 },
                ],
            },
            {
                combination: { flyer_size: 'a5', paper_type: '170gsm', print_location: 'both' },
                tiers: [
                    { quantity: 100, unitPrice: 7.00 },
                    { quantity: 500, unitPrice: 4.80 },
                    { quantity: 1000, unitPrice: 3.60 },
                    { quantity: 5000, unitPrice: 2.40 },
                ],
            },
            {
                combination: { flyer_size: 'a4', paper_type: '170gsm', print_location: 'both' },
                tiers: [
                    { quantity: 100, unitPrice: 11.00 },
                    { quantity: 500, unitPrice: 8.00 },
                    { quantity: 1000, unitPrice: 6.00 },
                    { quantity: 5000, unitPrice: 4.20 },
                ],
            },
        ],
    },
    {
        sku: 'SEED-BRO-003',
        slug: 'seed-trifold-brochures',
        name: 'Tri-Fold Brochures',
        categorySlug: 'marketing-materials',
        categoryName: 'Marketing Materials',
        description: 'Corporate presentation brochures scored and folded with precision into multi-panel layouts.',
        defaultSize: 'A4 Folded (Open 297 mm x 210 mm)',
        basePrice: 8.00,
        minQuantity: 100,
        maxQuantity: 20000,
        quantityStep: 100,
        productionDays: 3,
        artworkRequirement: 'REQUIRED',
        minimumArtworkMegapixels: 2.0,
        designServiceRequirement: 'OPTIONAL',
        designServicePrice: 500.00,
        designServiceFee: 500.00,
        tags: ['Brochures', 'Tri-Fold', 'Panels', 'Corporate', 'Seed'],
        images: [
            {
                url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80',
                altText: 'Tri-Fold Brochure Display',
                isPrimary: true,
                sortOrder: 0,
            },
        ],
        optionGroups: [
            {
                name: 'Brochure Size',
                code: 'brochure_size',
                inputType: 'PILL',
                description: 'Open flat dimensions before scoring',
                isRequired: true,
                sortOrder: 1,
                options: [
                    { label: 'A4 Open (297 × 210 mm)', value: 'a4', isDefault: true, sortOrder: 0 },
                    { label: 'A3 Open (420 × 297 mm)', value: 'a3', isDefault: false, sortOrder: 1 },
                ],
            },
            {
                name: 'Folding Configuration',
                code: 'fold_type',
                inputType: 'SELECT',
                description: 'Scoring lines and folding architecture',
                isRequired: true,
                sortOrder: 2,
                options: [
                    { label: 'Half Fold (4 Panels)', value: 'half_fold', isDefault: false, sortOrder: 0 },
                    { label: 'Tri-Fold / C-Fold (6 Panels)', value: 'tri_fold', isDefault: true, sortOrder: 1 },
                ],
            },
            {
                name: 'Paper Stock',
                code: 'paper_type',
                inputType: 'SELECT',
                description: 'Paper weight and coating',
                isRequired: true,
                sortOrder: 3,
                options: [
                    { label: '170 GSM Silk Art Paper', value: '170gsm', isDefault: true, sortOrder: 0 },
                    { label: '250 GSM Stiff Cover Board', value: '250gsm', isDefault: false, sortOrder: 1 },
                ],
            },
            {
                name: 'Printing Location',
                code: 'print_location',
                inputType: 'PILL',
                description: 'Brochures require both side printing across all panels',
                isRequired: true,
                sortOrder: 4,
                options: [
                    { label: 'Both Sides (Outer & Inner Panels)', value: 'both', isDefault: true, sortOrder: 0 },
                ],
            },
            {
                name: 'Design Required',
                code: 'design_required',
                inputType: 'RADIO',
                description: 'Customer artwork upload or PB Studio multi-panel typesetting',
                isRequired: true,
                sortOrder: 5,
                options: [
                    { label: 'No (I have print-ready artwork spreads)', value: 'no', isDefault: true, sortOrder: 0 },
                    { label: 'Yes (PB Creative Studio Typesetting)', value: 'yes', isDefault: false, sortOrder: 1 },
                ],
            },
        ],
        configurationRules: [
            {
                name: 'Brochure Artwork: Customer Supplied Spreads',
                conditionGroupCode: 'design_required',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'no',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    conditionCombination: { design_required: 'no', print_location: 'both' },
                    artworkStatus: 'REQUIRED',
                    slotCount: 2,
                    slotLabels: ['Outer Panels Spread', 'Inner Panels Spread'],
                    minMegapixels: 2.0,
                    maxFileSizeMb: 80,
                    requireDesignBrief: false,
                    customerSuppliedSides: ['Outer Panels Spread', 'Inner Panels Spread'],
                },
            },
            {
                name: 'Brochure Artwork: Design Service Required',
                conditionGroupCode: 'design_required',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'yes',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    artworkStatus: 'OPTIONAL',
                    requireDesignBrief: true,
                    showDesignBrief: true,
                    designServicePolicy: 'REQUIRE_BRIEF',
                    customerSuppliedSides: [],
                },
            },
        ],
        pricingMatrix: [
            {
                combination: { brochure_size: 'a4', fold_type: 'tri_fold', paper_type: '170gsm', print_location: 'both', design_required: 'no' },
                tiers: [
                    { quantity: 100, unitPrice: 12.00 },
                    { quantity: 250, unitPrice: 9.50 },
                    { quantity: 500, unitPrice: 7.20 },
                    { quantity: 1000, unitPrice: 5.50 },
                ],
            },
            {
                combination: { brochure_size: 'a4', fold_type: 'tri_fold', paper_type: '250gsm', print_location: 'both', design_required: 'no' },
                tiers: [
                    { quantity: 100, unitPrice: 15.00 },
                    { quantity: 250, unitPrice: 12.00 },
                    { quantity: 500, unitPrice: 9.00 },
                    { quantity: 1000, unitPrice: 7.00 },
                ],
            },
            {
                combination: { brochure_size: 'a3', fold_type: 'half_fold', paper_type: '250gsm', print_location: 'both', design_required: 'yes' },
                tiers: [
                    { quantity: 100, unitPrice: 22.00 },
                    { quantity: 250, unitPrice: 18.00 },
                    { quantity: 500, unitPrice: 14.00 },
                    { quantity: 1000, unitPrice: 11.00 },
                ],
            },
        ],
    },
    {
        sku: 'SEED-MUG-004',
        slug: 'seed-custom-printed-mugs',
        name: 'Custom Printed Mugs',
        categorySlug: 'packaging',
        categoryName: 'Packaging & Promotional',
        description: 'High-gloss ceramic sublimation mugs with vivid photo-quality prints. Dishwasher and microwave resistant.',
        defaultSize: '11 oz Standard Coffee Mug',
        basePrice: 120.00,
        minQuantity: 10,
        maxQuantity: 1000,
        quantityStep: 10,
        productionDays: 3,
        artworkRequirement: 'REQUIRED',
        minimumArtworkMegapixels: 1.5,
        designServiceRequirement: 'OPTIONAL',
        designServicePrice: 200.00,
        designServiceFee: 200.00,
        tags: ['Mugs', 'Ceramic', 'Sublimation', 'Gifts', 'Seed'],
        images: [
            {
                url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
                altText: 'Custom Printed Ceramic Mug',
                isPrimary: true,
                sortOrder: 0,
            },
        ],
        optionGroups: [
            {
                name: 'Mug Ceramic Grade',
                code: 'mug_type',
                inputType: 'RADIO',
                description: 'Ceramic material grade',
                isRequired: true,
                sortOrder: 1,
                options: [
                    { label: 'Standard 11oz White Ceramic', value: 'standard_ceramic', isDefault: true, sortOrder: 0 },
                    { label: 'Premium Heavy Gloss Ceramic', value: 'premium_ceramic', isDefault: false, sortOrder: 1 },
                ],
            },
            {
                name: 'Print Placement',
                code: 'print_location',
                inputType: 'PILL',
                description: 'Placement relative to mug handle',
                isRequired: true,
                sortOrder: 2,
                options: [
                    { label: 'One Side (Facing Drinker)', value: 'one_side', isDefault: true, sortOrder: 0 },
                    { label: 'Both Sides (Front & Back Faces)', value: 'both_sides', isDefault: false, sortOrder: 1 },
                ],
            },
            {
                name: 'Design Required',
                code: 'design_required',
                inputType: 'RADIO',
                description: 'Upload your graphic or request PB Custom Mockup',
                isRequired: true,
                sortOrder: 3,
                options: [
                    { label: 'No (I have graphic file)', value: 'no', isDefault: true, sortOrder: 0 },
                    { label: 'Yes (PB Mug Mockup Assistance)', value: 'yes', isDefault: false, sortOrder: 1 },
                ],
            },
        ],
        configurationRules: [
            {
                name: 'Mug Artwork: One Side Print',
                conditionGroupCode: 'print_location',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'one_side',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    conditionCombination: { design_required: 'no', print_location: 'one_side' },
                    artworkStatus: 'REQUIRED',
                    slotCount: 1,
                    slotLabels: ['Mug Face Graphic'],
                    minMegapixels: 1.5,
                    maxFileSizeMb: 30,
                    requireDesignBrief: false,
                    customerSuppliedSides: ['Mug Face Graphic'],
                },
            },
            {
                name: 'Mug Artwork: Both Sides Print',
                conditionGroupCode: 'print_location',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'both_sides',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    conditionCombination: { design_required: 'no', print_location: 'both_sides' },
                    artworkStatus: 'REQUIRED',
                    slotCount: 2,
                    slotLabels: ['Left Handle Graphic', 'Right Handle Graphic'],
                    minMegapixels: 1.5,
                    maxFileSizeMb: 30,
                    requireDesignBrief: false,
                    customerSuppliedSides: ['Left Handle Graphic', 'Right Handle Graphic'],
                },
            },
            {
                name: 'Mug Artwork: Design Assistance Required',
                conditionGroupCode: 'design_required',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'yes',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    artworkStatus: 'OPTIONAL',
                    requireDesignBrief: true,
                    showDesignBrief: true,
                    designServicePolicy: 'REQUIRE_BRIEF',
                    customerSuppliedSides: [],
                },
            },
        ],
        pricingMatrix: [
            {
                combination: { mug_type: 'standard_ceramic', print_location: 'one_side', design_required: 'no' },
                tiers: [
                    { quantity: 10, unitPrice: 180.00 },
                    { quantity: 25, unitPrice: 150.00 },
                    { quantity: 50, unitPrice: 120.00 },
                    { quantity: 100, unitPrice: 95.00 },
                ],
            },
            {
                combination: { mug_type: 'standard_ceramic', print_location: 'both_sides', design_required: 'no' },
                tiers: [
                    { quantity: 10, unitPrice: 220.00 },
                    { quantity: 25, unitPrice: 180.00 },
                    { quantity: 50, unitPrice: 145.00 },
                    { quantity: 100, unitPrice: 115.00 },
                ],
            },
            {
                combination: { mug_type: 'premium_ceramic', print_location: 'both_sides', design_required: 'no' },
                tiers: [
                    { quantity: 10, unitPrice: 280.00 },
                    { quantity: 25, unitPrice: 230.00 },
                    { quantity: 50, unitPrice: 190.00 },
                    { quantity: 100, unitPrice: 150.00 },
                ],
            },
        ],
    },
    {
        sku: 'SEED-LBL-005',
        slug: 'seed-product-labels-stickers',
        name: 'Product Labels & Stickers',
        categorySlug: 'packaging',
        categoryName: 'Packaging & Promotional',
        description: 'Precision contour die-cut product packaging labels and vinyl stickers on paper or waterproof vinyl.',
        defaultSize: 'Custom Die-Cut Format',
        basePrice: 1.00,
        minQuantity: 100,
        maxQuantity: 100000,
        quantityStep: 100,
        productionDays: 2,
        artworkRequirement: 'REQUIRED',
        minimumArtworkMegapixels: 2.0,
        designServiceRequirement: 'DISABLED',
        tags: ['Labels', 'Stickers', 'Die-Cut', 'Packaging', 'Vinyl', 'Seed'],
        images: [
            {
                url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
                altText: 'Custom Product Labels Display',
                isPrimary: true,
                sortOrder: 0,
            },
        ],
        optionGroups: [
            {
                name: 'Label Shape Profile',
                code: 'label_shape',
                inputType: 'PILL',
                description: 'Physical perimeter shape and cutline',
                isRequired: true,
                sortOrder: 1,
                options: [
                    { label: 'Circular Cut', value: 'circle', isDefault: true, sortOrder: 0 },
                    { label: 'Square Cut', value: 'square', isDefault: false, sortOrder: 1 },
                    { label: 'Custom Contour Die-Cut', value: 'custom', isDefault: false, sortOrder: 2 },
                ],
            },
            {
                name: 'Dimension Scale',
                code: 'label_size',
                inputType: 'SELECT',
                description: 'Overall dimension bracket',
                isRequired: true,
                sortOrder: 2,
                options: [
                    { label: 'Small (30 × 30 mm)', value: 'small', isDefault: false, sortOrder: 0 },
                    { label: 'Medium (50 × 50 mm)', value: 'medium', isDefault: true, sortOrder: 1 },
                    { label: 'Large (80 × 80 mm)', value: 'large', isDefault: false, sortOrder: 2 },
                ],
            },
            {
                name: 'Substrate Material',
                code: 'label_material',
                inputType: 'RADIO',
                description: 'Adhesive backing substrate',
                isRequired: true,
                sortOrder: 3,
                options: [
                    { label: 'Chromo Art Paper Sticker', value: 'paper', isDefault: true, sortOrder: 0 },
                    { label: 'Waterproof Polypropylene (PP) Vinyl', value: 'waterproof', isDefault: false, sortOrder: 1 },
                ],
            },
            {
                name: 'Surface Coating',
                code: 'label_finish',
                inputType: 'SELECT',
                description: 'Surface finish laminate',
                isRequired: true,
                sortOrder: 4,
                options: [
                    { label: 'High Gloss UV Finish', value: 'glossy', isDefault: true, sortOrder: 0 },
                    { label: 'Silk Matte Finish', value: 'matte', isDefault: false, sortOrder: 1 },
                ],
            },
        ],
        configurationRules: [
            {
                name: 'Custom Shape: Vector Die-Line Requirement',
                conditionGroupCode: 'label_shape',
                conditionOperator: 'EQUALS',
                conditionOptionValue: 'custom',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    conditionCombination: { label_shape: 'custom' },
                    artworkStatus: 'REQUIRED',
                    slotCount: 1,
                    slotLabels: ['Contour Vector Die-Line & Artwork (PDF/AI)'],
                    minMegapixels: 2.0,
                    maxFileSizeMb: 50,
                },
            },
            {
                name: 'Standard Shape: Standard Sticker Artwork',
                conditionGroupCode: 'label_shape',
                conditionOperator: 'NOT_EQUALS',
                conditionOptionValue: 'custom',
                actionType: 'CONFIGURE_ARTWORK',
                actionPayload: {
                    artworkStatus: 'REQUIRED',
                    slotCount: 1,
                    slotLabels: ['Sticker Artwork File'],
                    minMegapixels: 2.0,
                    maxFileSizeMb: 50,
                },
            },
        ],
        pricingMatrix: [
            {
                combination: { label_shape: 'circle', label_size: 'small', label_material: 'paper', label_finish: 'glossy' },
                tiers: [
                    { quantity: 100, unitPrice: 2.00 },
                    { quantity: 500, unitPrice: 1.40 },
                    { quantity: 1000, unitPrice: 0.90 },
                    { quantity: 5000, unitPrice: 0.60 },
                ],
            },
            {
                combination: { label_shape: 'circle', label_size: 'medium', label_material: 'waterproof', label_finish: 'matte' },
                tiers: [
                    { quantity: 100, unitPrice: 3.50 },
                    { quantity: 500, unitPrice: 2.50 },
                    { quantity: 1000, unitPrice: 1.80 },
                    { quantity: 5000, unitPrice: 1.20 },
                ],
            },
            {
                combination: { label_shape: 'square', label_size: 'medium', label_material: 'paper', label_finish: 'matte' },
                tiers: [
                    { quantity: 100, unitPrice: 2.80 },
                    { quantity: 500, unitPrice: 1.90 },
                    { quantity: 1000, unitPrice: 1.30 },
                    { quantity: 5000, unitPrice: 0.85 },
                ],
            },
            {
                combination: { label_shape: 'custom', label_size: 'large', label_material: 'waterproof', label_finish: 'glossy' },
                tiers: [
                    { quantity: 100, unitPrice: 6.00 },
                    { quantity: 500, unitPrice: 4.50 },
                    { quantity: 1000, unitPrice: 3.20 },
                    { quantity: 5000, unitPrice: 2.10 },
                ],
            },
        ],
    },
];
async function seedDeterministicProducts(prismaClient) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('SAFETY CHECK FAILED: Seed products cannot be executed in production (NODE_ENV=production).');
    }
    const prisma = prismaClient || new client_1.PrismaClient();
    console.log(`[SEED] Initializing 5 deterministic test products in ${process.env.NODE_ENV || 'development'} mode...`);
    const seededProducts = [];
    for (const def of exports.SEED_PRODUCTS_DATA) {
        const category = await prisma.productCategory.upsert({
            where: { slug: def.categorySlug },
            update: { name: def.categoryName },
            create: {
                name: def.categoryName,
                slug: def.categorySlug,
                description: `Automated test category for ${def.categoryName}`,
                isActive: true,
            },
        });
        const existing = await prisma.product.findUnique({
            where: { sku: def.sku },
            select: { id: true },
        });
        let product;
        if (existing) {
            await prisma.pricingMatrix.deleteMany({ where: { productId: existing.id } });
            await prisma.productConfigurationRule.deleteMany({ where: { productId: existing.id } });
            await prisma.productOptionGroup.deleteMany({ where: { productId: existing.id } });
            await prisma.productImage.deleteMany({ where: { productId: existing.id } });
            product = await prisma.product.update({
                where: { id: existing.id },
                data: {
                    name: def.name,
                    slug: def.slug,
                    description: def.description,
                    defaultSize: def.defaultSize,
                    categoryId: category.id,
                    status: client_1.ProductStatus.PUBLISHED,
                    pricingModel: 'MATRIX',
                    basePrice: def.basePrice,
                    minQuantity: def.minQuantity,
                    maxQuantity: def.maxQuantity,
                    quantityStep: def.quantityStep,
                    productionDays: def.productionDays,
                    artworkRequirement: def.artworkRequirement,
                    minimumArtworkMegapixels: def.minimumArtworkMegapixels,
                    designServiceRequirement: def.designServiceRequirement,
                    designServicePrice: def.designServicePrice,
                    designServiceFee: def.designServiceFee,
                    tags: def.tags,
                    isActive: true,
                    isStudioConfigured: true,
                },
            });
        }
        else {
            product = await prisma.product.create({
                data: {
                    sku: def.sku,
                    slug: def.slug,
                    name: def.name,
                    description: def.description,
                    defaultSize: def.defaultSize,
                    categoryId: category.id,
                    status: client_1.ProductStatus.PUBLISHED,
                    pricingModel: 'MATRIX',
                    basePrice: def.basePrice,
                    minQuantity: def.minQuantity,
                    maxQuantity: def.maxQuantity,
                    quantityStep: def.quantityStep,
                    productionDays: def.productionDays,
                    artworkRequirement: def.artworkRequirement,
                    minimumArtworkMegapixels: def.minimumArtworkMegapixels,
                    designServiceRequirement: def.designServiceRequirement,
                    designServicePrice: def.designServicePrice,
                    designServiceFee: def.designServiceFee,
                    tags: def.tags,
                    isActive: true,
                    isStudioConfigured: true,
                },
            });
        }
        if (def.images && def.images.length > 0) {
            await prisma.productImage.createMany({
                data: def.images.map((img) => ({
                    productId: product.id,
                    url: img.url,
                    altText: img.altText,
                    isPrimary: Boolean(img.isPrimary),
                    sortOrder: img.sortOrder,
                })),
            });
        }
        for (const grp of def.optionGroups) {
            await prisma.productOptionGroup.create({
                data: {
                    productId: product.id,
                    name: grp.name,
                    code: grp.code,
                    inputType: grp.inputType,
                    description: grp.description,
                    isRequired: grp.isRequired,
                    sortOrder: grp.sortOrder,
                    isActive: true,
                    isCustomerVisible: true,
                    options: {
                        create: grp.options.map((opt) => ({
                            label: opt.label,
                            value: opt.value,
                            isDefault: Boolean(opt.isDefault),
                            sortOrder: opt.sortOrder,
                            fileCount: opt.fileCount || 0,
                            fileSlotLabels: opt.fileSlotLabels || [],
                            minMegapixels: opt.minMegapixels,
                            isActive: true,
                        })),
                    },
                },
            });
        }
        if (def.configurationRules && def.configurationRules.length > 0) {
            for (const rule of def.configurationRules) {
                await prisma.productConfigurationRule.create({
                    data: {
                        productId: product.id,
                        name: rule.name,
                        conditionGroupCode: rule.conditionGroupCode,
                        conditionOperator: rule.conditionOperator,
                        conditionOptionValue: rule.conditionOptionValue,
                        actionType: rule.actionType,
                        targetGroupCode: rule.targetGroupCode,
                        targetOptionValue: rule.targetOptionValue,
                        actionPayload: rule.actionPayload,
                        isActive: true,
                    },
                });
            }
        }
        const matrixEntries = [];
        for (const comboItem of def.pricingMatrix) {
            for (const tier of comboItem.tiers) {
                matrixEntries.push({
                    productId: product.id,
                    minQty: tier.quantity,
                    maxQty: tier.quantity,
                    unitPrice: tier.unitPrice,
                    attributeCombination: {
                        ...comboItem.combination,
                        quantity: tier.quantity,
                        totalPrice: Math.round(tier.unitPrice * tier.quantity * 100) / 100,
                    },
                });
            }
        }
        if (matrixEntries.length > 0) {
            await prisma.pricingMatrix.createMany({
                data: matrixEntries,
            });
        }
        console.log(`[SEED] ✓ Seeded ${def.name} (${def.sku}) with ${def.optionGroups.length} groups and ${matrixEntries.length} matrix rows.`);
        seededProducts.push(product);
    }
    console.log(`[SEED] Successfully seeded all 5 deterministic products without affecting unrelated data.`);
    return seededProducts;
}
async function cleanupSeedProducts(prismaClient) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('SAFETY CHECK FAILED: Cleanup cannot be executed in production (NODE_ENV=production).');
    }
    const prisma = prismaClient || new client_1.PrismaClient();
    console.log(`[CLEANUP] Cleaning up seed products with SKUs:`, exports.SEED_PRODUCT_SKUS);
    const products = await prisma.product.findMany({
        where: { sku: { in: [...exports.SEED_PRODUCT_SKUS] } },
        select: { id: true, sku: true, name: true },
    });
    for (const prod of products) {
        await prisma.pricingMatrix.deleteMany({ where: { productId: prod.id } });
        await prisma.productConfigurationRule.deleteMany({ where: { productId: prod.id } });
        await prisma.productOptionGroup.deleteMany({ where: { productId: prod.id } });
        await prisma.productImage.deleteMany({ where: { productId: prod.id } });
        await prisma.product.delete({ where: { id: prod.id } });
        console.log(`[CLEANUP] Removed seed product: ${prod.name} (${prod.sku})`);
    }
    console.log(`[CLEANUP] Cleaned up ${products.length} seed products. All other records remain intact.`);
    return products.length;
}
if (require.main === module) {
    const isCleanup = process.argv.includes('--cleanup');
    const prisma = new client_1.PrismaClient();
    const runner = isCleanup ? cleanupSeedProducts(prisma) : seedDeterministicProducts(prisma);
    runner
        .catch((err) => {
        console.error('[SEED_ERROR]', err);
        process.exit(1);
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
//# sourceMappingURL=seed-products.js.map