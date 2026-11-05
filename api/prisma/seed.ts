import { PrismaClient, UserRole, Department, ProductStatus, InventoryCategory, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- WIPING EXISTING TRANSACTIONS, ORDERS, PRODUCTS & USERS ---');
  try {
    await (prisma as any).operationalNote?.deleteMany();
    await (prisma as any).orderAssignment?.deleteMany();
    await prisma.jobIssue.deleteMany();
    await prisma.jobCard.deleteMany();
    await prisma.artworkVersion.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.qCChecklist.deleteMany();
    await prisma.package.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.orderStatusHistory.deleteMany();
    await prisma.slaRecord.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.order.deleteMany();
    await prisma.address.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();

    // Clear all catalog/product tables to leave only the seed products
    await prisma.stockMovement.deleteMany();
    await prisma.productConfigurationRule.deleteMany();
    await prisma.productAdditionalPricing.deleteMany();
    await prisma.pricingMatrix.deleteMany();
    await prisma.productOption.deleteMany();
    await prisma.productOptionGroup.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany();
    await prisma.productCategory.deleteMany();
    console.log('✅ Wiped all previous transactional data, test products, and custom test users.');
  } catch (err) {
    console.warn('⚠️ Notice during wipe:', err);
  }

  console.log('--- SEEDING PRINT BAZZAR 2.0 USERS & ENTERPRISE ROLES ---');

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Admin@12345', salt);

  // 1. Seed Core Staff Users for each Department & Role
  const staffMembers = [
    {
      email: 'admin@printbazzar.com',
      fullName: 'Vikram Mehta (Operations Director)',
      role: UserRole.ADMIN_MANAGER,
      department: Department.MANAGEMENT,
    },
    {
      email: 'sales@printbazzar.com',
      fullName: 'Pooja Sharma (Senior Sales Executive)',
      role: UserRole.SALES_OFFICE,
      department: Department.SALES,
    },
    {
      email: 'prepress@printbazzar.com',
      fullName: 'Rahul Verma (Lead Prepress Engineer)',
      role: UserRole.DESIGNER_PREPRESS,
      department: Department.DESIGN_PREPRESS,
    },
    {
      email: 'anjali.m@printbazzar.com',
      fullName: 'Anjali Mehta (Senior Graphic Designer)',
      role: UserRole.DESIGNER_PREPRESS,
      department: Department.DESIGN_PREPRESS,
    },
    {
      email: 'rahul.s@printbazzar.com',
      fullName: 'Rahul Sharma (Packaging & Prepress Designer)',
      role: UserRole.DESIGNER_PREPRESS,
      department: Department.DESIGN_PREPRESS,
    },
    {
      email: 'priya.n@printbazzar.com',
      fullName: 'Priya Nair (Visual & Proofing Designer)',
      role: UserRole.DESIGNER_PREPRESS,
      department: Department.DESIGN_PREPRESS,
    },
    {
      email: 'operator@printbazzar.com',
      fullName: 'Manoj Kumar (Chief Print Operator)',
      role: UserRole.PRODUCTION_OPERATOR,
      department: Department.PRODUCTION,
    },
    {
      email: 'arun.print@printbazzar.com',
      fullName: 'Arun Kumar (Digital & Sheetfed Press Lead)',
      role: UserRole.PRODUCTION_OPERATOR,
      department: Department.PRODUCTION,
    },
    {
      email: 'vijay.v@printbazzar.com',
      fullName: 'Vijay Verma (Packaging & Die-Cut Specialist)',
      role: UserRole.PRODUCTION_OPERATOR,
      department: Department.PRODUCTION,
    },
    {
      email: 'finalqc@printbazzar.com',
      fullName: 'Suresh Patil (Final QC Inspector)',
      role: UserRole.FINAL_QC_INSPECTOR,
      department: Department.QUALITY_ASSURANCE,
    },
    {
      email: 'packing@printbazzar.com',
      fullName: 'Deepak Nair (Packaging Specialist)',
      role: UserRole.PACKING_OPERATOR,
      department: Department.PACKAGING,
    },
    {
      email: 'dispatch@printbazzar.com',
      fullName: 'Ramesh Yadav (Logistics Coordinator)',
      role: UserRole.DISPATCH_LOGISTICS,
      department: Department.LOGISTICS,
    },
    {
      email: 'accounts@printbazzar.com',
      fullName: 'Kavita Sundaram (Accounts Manager)',
      role: UserRole.ACCOUNTS,
      department: Department.FINANCE,
    },
    {
      email: 'operations@printbazzar.com',
      fullName: 'Vikramaditya Rao (Operational Coordinator)',
      role: 'OPERATIONAL_MANAGER' as UserRole,
      department: 'OPERATIONS' as Department,
      phone: '+919811223344',
    },
    {
      email: 'customer@acme.com',
      fullName: 'Rohit Singhania',
      role: UserRole.CUSTOMER,
      department: null,
      phone: '+919876543210',
    },
  ];

  for (const s of staffMembers) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash: defaultPasswordHash,
        fullName: s.fullName,
        phone: s.phone || '+919800000000',
        role: s.role,
        department: s.department,
      },
    });

    if (s.role === UserRole.CUSTOMER) {
      await prisma.customer.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          fullName: s.fullName,
          email: s.email,
          phone: s.phone || '+919876543210',
          companyName: 'Acme Technologies Pvt Ltd',
          gstin: '29ABCDE1234F1Z5',
        },
      });
    }
  }

  // 2. Seed Machine Work Centers
  const machines = [
    { name: 'HP Indigo 12000 Digital Press', code: 'HP_INDIGO_12000', type: 'DIGITAL_SHEET', hourlyCapacity: 2500 },
    { name: 'Heidelberg Speedmaster XL 75', code: 'HEIDELBERG_XL75', type: 'OFFSET', hourlyCapacity: 15000 },
    { name: 'Roland TrueVIS VG3-640 Wide Format', code: 'ROLAND_VG3', type: 'WIDE_FORMAT', hourlyCapacity: 80 },
    { name: 'GMP Thermal Film Laminator', code: 'GMP_LAMINATOR', type: 'LAMINATION', hourlyCapacity: 3000 },
    { name: 'Polar 115 High-Speed Programmable Guillotine', code: 'POLAR_115', type: 'CUTTER', hourlyCapacity: 5000 },
    { name: 'Heidelberg Cylinder Die Cutter', code: 'CYLINDER_DIECUT', type: 'DIE_CUT', hourlyCapacity: 3500 },
  ];

  for (const m of machines) {
    await prisma.machineWorkCenter.upsert({
      where: { code: m.code },
      update: {},
      create: m,
    });
  }

  // 3. Seed Dynamic Categories
  const catVisitingCards = await prisma.productCategory.upsert({
    where: { slug: 'visiting-cards' },
    update: {},
    create: {
      name: 'Visiting Cards',
      slug: 'visiting-cards',
      description: 'Corporate business cards, velvet touch, raised spot UV, and luxury metallic finishes.',
      sortOrder: 1,
      isActive: true,
      image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80',
    },
  });

  const catPackaging = await prisma.productCategory.upsert({
    where: { slug: 'packaging' },
    update: {},
    create: {
      name: 'Packaging & Rigid Boxes',
      slug: 'packaging',
      description: 'Luxury rigid presentation boxes, mono cartons, corrugated shippers, and custom inserts.',
      sortOrder: 2,
      isActive: true,
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
    },
  });

  const catSignage = await prisma.productCategory.upsert({
    where: { slug: 'signs-banners' },
    update: {},
    create: {
      name: 'Signs & Banners',
      slug: 'signs-banners',
      description: 'Roll-up luxury standees, vinyl banners, acrylic signs, and promotional backdrops.',
      sortOrder: 3,
      isActive: true,
      image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80',
    },
  });

  const catMarketing = await prisma.productCategory.upsert({
    where: { slug: 'marketing-materials' },
    update: {},
    create: {
      name: 'Marketing Materials',
      slug: 'marketing-materials',
      description: 'Flyers, brochures, catalogues, folded leaflets, and direct mail inserts.',
      sortOrder: 4,
      isActive: true,
      image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80',
    },
  });

  // 4. Seed Product 1: Premium Visiting Cards (Admin-Defined Dynamic Fields & Media)
  const prodBizCards = await prisma.product.upsert({
    where: { slug: 'premium-visiting-cards' },
    update: {
      status: ProductStatus.PUBLISHED,
      basePrice: 1.5,
      minQuantity: 100,
      maxQuantity: 10000,
      productionDays: 2,
      defaultSize: '89 mm x 54 mm (Standard Visiting Card)',
      tags: ['Visiting Cards', 'Spot UV', 'Velvet', 'Corporate'],
    },
    create: {
      categoryId: catVisitingCards.id,
      name: 'Premium Visiting Cards',
      slug: 'premium-visiting-cards',
      sku: 'PRD-BC-001',
      description: 'Industrial-grade 4-Color digital offset press print with high-precision blade trimming, CMYK calibration, and soft-proof sign-off.',
      status: ProductStatus.PUBLISHED,
      pricingModel: 'MATRIX',
      basePrice: 1.5,
      minQuantity: 100,
      maxQuantity: 10000,
      productionDays: 2,
      defaultSize: '89 mm x 54 mm (Standard Visiting Card)',
      sortOrder: 1,
      isFeatured: true,
      tags: ['Visiting Cards', 'Spot UV', 'Velvet', 'Corporate'],
    },
  });

  // Multi-images for Business Cards
  await prisma.productImage.deleteMany({ where: { productId: prodBizCards.id } });
  await prisma.productImage.createMany({
    data: [
      {
        productId: prodBizCards.id,
        url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80',
        altText: 'Premium Business Card Stack Front View',
        caption: '350 GSM Velvet Touch with Raised Spot UV',
        sortOrder: 0,
        isPrimary: true,
      },
      {
        productId: prodBizCards.id,
        url: 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&w=800&q=80',
        altText: 'Matte Finish Texture Close-up',
        caption: 'Silky glare-free thermal lamination',
        sortOrder: 1,
        isPrimary: false,
      },
      {
        productId: prodBizCards.id,
        url: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=800&q=80',
        altText: 'Executive Gold Foil Detail',
        caption: 'Precision hot stamping foil',
        sortOrder: 2,
        isPrimary: false,
      },
    ],
  });

  // Dynamic Option Groups for Business Cards
  await prisma.productOptionGroup.deleteMany({ where: { productId: prodBizCards.id } });

  await prisma.productOptionGroup.create({
    data: {
      productId: prodBizCards.id,
      name: 'Paper Substrate',
      code: 'paper_stock',
      inputType: 'SELECT',
      description: 'Select your preferred paper weight and surface texture',
      isRequired: true,
      sortOrder: 1,
      options: {
        create: [
          { label: '350 GSM Heavy Art Card', value: '350gsm_art_card', priceModifier: 0.0, priceModifierType: 'FIXED', isDefault: true, sortOrder: 0 },
          { label: '400 GSM Ultra-Thick Velvet Board', value: '400gsm_velvet_board', priceModifier: 0.60, priceModifierType: 'FIXED', sortOrder: 1 },
          { label: '300 GSM Natural Uncoated Ivory', value: '300gsm_ivory', priceModifier: 0.40, priceModifierType: 'FIXED', sortOrder: 2 },
        ],
      },
    },
  });

  await prisma.productOptionGroup.create({
    data: {
      productId: prodBizCards.id,
      name: 'Lamination Finish',
      code: 'lamination',
      inputType: 'SELECT',
      description: 'Protective thermal coating applied to both sides',
      isRequired: true,
      sortOrder: 2,
      options: {
        create: [
          { label: 'Silky Thermal Matt Lamination', value: 'thermal_matt', priceModifier: 0.35, priceModifierType: 'FIXED', isDefault: true, sortOrder: 0 },
          { label: 'Feather Soft Velvet Touch', value: 'velvet_touch', priceModifier: 0.85, priceModifierType: 'FIXED', sortOrder: 1 },
          { label: 'High Gloss Lamination', value: 'gloss', priceModifier: 0.25, priceModifierType: 'FIXED', sortOrder: 2 },
          { label: 'None (Uncoated Natural)', value: 'none', priceModifier: 0.0, priceModifierType: 'FIXED', sortOrder: 3 },
        ],
      },
    },
  });

  await prisma.productOptionGroup.create({
    data: {
      productId: prodBizCards.id,
      name: 'Round Corners (Die Cut)',
      code: 'round_corners',
      inputType: 'TOGGLE',
      description: 'Smooth 5mm radius die-cut rounded edges',
      isRequired: false,
      sortOrder: 3,
      options: {
        create: [
          { label: 'No (Standard Square Corners)', value: 'no', priceModifier: 0.0, priceModifierType: 'FIXED', isDefault: true, sortOrder: 0 },
          { label: 'Yes (+₹0.15/unit)', value: 'yes', priceModifier: 0.15, priceModifierType: 'FIXED', sortOrder: 1 },
        ],
      },
    },
  });

  // Volume Pricing Rules / Matrices for Business Cards
  await prisma.pricingMatrix.deleteMany({ where: { productId: prodBizCards.id } });
  await prisma.pricingMatrix.createMany({
    data: [
      {
        productId: prodBizCards.id,
        minQty: 100,
        maxQty: 499,
        attributeCombination: { discountPercent: 0, label: 'Base Rate (100–499 pcs)' },
        unitPrice: 1.50,
      },
      {
        productId: prodBizCards.id,
        minQty: 500,
        maxQty: 999,
        attributeCombination: { discountPercent: 5, label: '5% OFF Volume Savings (500–999 pcs)' },
        unitPrice: 1.425,
      },
      {
        productId: prodBizCards.id,
        minQty: 1000,
        maxQty: 4999,
        attributeCombination: { discountPercent: 10, label: '10% OFF Volume Savings (1,000–4,999 pcs)' },
        unitPrice: 1.35,
      },
      {
        productId: prodBizCards.id,
        minQty: 5000,
        maxQty: 100000,
        attributeCombination: { discountPercent: 18, label: '18% OFF Bulk Fleet Savings (5,000+ pcs)' },
        unitPrice: 1.23,
      },
    ],
  });

  // 5. Seed Product 2: Custom Rigid Box (Completely different dynamic schema with Conditional Fields)
  const prodBox = await prisma.product.upsert({
    where: { slug: 'custom-rigid-box' },
    update: { status: ProductStatus.PUBLISHED },
    create: {
      categoryId: catPackaging.id,
      name: 'Custom Luxury Rigid Box',
      slug: 'custom-rigid-box',
      sku: 'PRD-PKG-002',
      description: 'Handcrafted luxury rigid presentation box with custom dimensions, wrapped in premium specialty paper with optional magnetic closure and hot foil stamping.',
      status: ProductStatus.PUBLISHED,
      pricingModel: 'FORMULA',
      basePrice: 65.0,
      minQuantity: 50,
      maxQuantity: 5000,
      productionDays: 5,
      sortOrder: 2,
      isFeatured: true,
      tags: ['Packaging', 'Rigid Box', 'Kappa Board', 'Luxury'],
    },
  });

  await prisma.productImage.deleteMany({ where: { productId: prodBox.id } });
  await prisma.productImage.createMany({
    data: [
      {
        productId: prodBox.id,
        url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
        altText: 'Custom Rigid Presentation Box',
        caption: '1200 GSM Kappa Board with Gold Foil Stamp',
        sortOrder: 0,
        isPrimary: true,
      },
      {
        productId: prodBox.id,
        url: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=800&q=80',
        altText: 'Custom Foam Insert View',
        caption: 'High-density EVA foam die-cut compartment',
        sortOrder: 1,
        isPrimary: false,
      },
    ],
  });

  await prisma.productOptionGroup.deleteMany({ where: { productId: prodBox.id } });

  await prisma.productOptionGroup.create({
    data: {
      productId: prodBox.id,
      name: 'Box Length (mm)',
      code: 'box_length_mm',
      inputType: 'NUMBER',
      description: 'External box length in millimeters (100mm to 500mm)',
      isRequired: true,
      sortOrder: 1,
    },
  });

  await prisma.productOptionGroup.create({
    data: {
      productId: prodBox.id,
      name: 'Box Width (mm)',
      code: 'box_width_mm',
      inputType: 'NUMBER',
      description: 'External box width in millimeters (100mm to 500mm)',
      isRequired: true,
      sortOrder: 2,
    },
  });

  await prisma.productOptionGroup.create({
    data: {
      productId: prodBox.id,
      name: 'Box Height (mm)',
      code: 'box_height_mm',
      inputType: 'NUMBER',
      description: 'External box depth/height in millimeters (30mm to 200mm)',
      isRequired: true,
      sortOrder: 3,
    },
  });

  await prisma.productOptionGroup.create({
    data: {
      productId: prodBox.id,
      name: 'Kappa Board Core Thickness',
      code: 'board_thickness',
      inputType: 'SELECT',
      description: 'Rigid board caliper for structural integrity',
      isRequired: true,
      sortOrder: 4,
      options: {
        create: [
          { label: '1000 GSM (1.5mm Thickness)', value: '1000gsm', priceModifier: 0.0, priceModifierType: 'FIXED', isDefault: true, sortOrder: 0 },
          { label: '1200 GSM Heavy (2.0mm Thickness)', value: '1200gsm', priceModifier: 8.0, priceModifierType: 'FIXED', sortOrder: 1 },
          { label: '1500 GSM Ultra-Rigid (2.5mm Thickness)', value: '1500gsm', priceModifier: 15.0, priceModifierType: 'FIXED', sortOrder: 2 },
        ],
      },
    },
  });

  // Conditional Option 1: Need Foil Stamping?
  await prisma.productOptionGroup.create({
    data: {
      productId: prodBox.id,
      name: 'Need Hot Foil Stamping?',
      code: 'need_foil',
      inputType: 'TOGGLE',
      description: 'Metallic foil monogram on box lid',
      isRequired: false,
      sortOrder: 5,
      options: {
        create: [
          { label: 'No Foil Stamping', value: 'no', priceModifier: 0.0, priceModifierType: 'FIXED', isDefault: true, sortOrder: 0 },
          { label: 'Yes, Add Foil Stamping (+₹12/box)', value: 'yes', priceModifier: 12.0, priceModifierType: 'FIXED', sortOrder: 1 },
        ],
      },
    },
  });

  // Conditional Option 2: Foil Color (ONLY visible IF need_foil = 'yes')
  await prisma.productOptionGroup.create({
    data: {
      productId: prodBox.id,
      name: 'Foil Stamping Color',
      code: 'foil_color',
      inputType: 'SELECT',
      description: 'Select hot stamping metallic foil pigment',
      isRequired: true,
      sortOrder: 6,
      options: {
        create: [
          { label: 'Crown Mirror Gold', value: 'mirror_gold', priceModifier: 0.0, priceModifierType: 'FIXED', isDefault: true, sortOrder: 0 },
          { label: 'Brilliant Silver', value: 'silver', priceModifier: 0.0, priceModifierType: 'FIXED', sortOrder: 1 },
          { label: 'Rose Gold Metallic', value: 'rose_gold', priceModifier: 2.5, priceModifierType: 'FIXED', sortOrder: 2 },
          { label: 'Holographic Rainbow', value: 'holographic', priceModifier: 4.0, priceModifierType: 'FIXED', sortOrder: 3 },
        ],
      },
    },
  });

  // Create configuration rule linking need_foil -> foil_color
  await prisma.productConfigurationRule.deleteMany({ where: { productId: prodBox.id } });
  await prisma.productConfigurationRule.create({
    data: {
      productId: prodBox.id,
      name: 'Show Foil Color only if Foil is chosen',
      conditionGroupCode: 'need_foil',
      conditionOperator: 'EQUALS',
      conditionOptionValue: 'yes',
      actionType: 'SHOW',
      targetGroupCode: 'foil_color',
      isActive: true,
    },
  });

  await prisma.productOptionGroup.create({
    data: {
      productId: prodBox.id,
      name: 'Special Fabrication Instructions',
      code: 'fabrication_notes',
      inputType: 'TEXTAREA',
      description: 'Enter any specific slot dimensions or ribbon puller preferences',
      isRequired: false,
      sortOrder: 7,
    },
  });

  // Tiered Volume Pricing Matrix for Custom Luxury Rigid Box
  await prisma.pricingMatrix.deleteMany({ where: { productId: prodBox.id } });
  await prisma.pricingMatrix.createMany({
    data: [
      { productId: prodBox.id, minQty: 50, maxQty: 99, unitPrice: 65.0, attributeCombination: { isBasePrice: true, label: '50 units tier' } },
      { productId: prodBox.id, minQty: 100, maxQty: 249, unitPrice: 58.0, attributeCombination: { isBasePrice: true, label: '100 units tier' } },
      { productId: prodBox.id, minQty: 250, maxQty: 499, unitPrice: 51.0, attributeCombination: { isBasePrice: true, label: '250 units tier' } },
      { productId: prodBox.id, minQty: 500, maxQty: 999, unitPrice: 45.0, attributeCombination: { isBasePrice: true, label: '500 units tier' } },
      { productId: prodBox.id, minQty: 1000, maxQty: 100000, unitPrice: 40.0, attributeCombination: { isBasePrice: true, label: '1000 units tier' } },
    ],
  });

  // 6. Seed Product 3: Luxury Roll-Up Standee (Signage & Banners)
  const prodStandee = await prisma.product.upsert({
    where: { slug: 'luxury-rollup-standee' },
    update: {
      status: ProductStatus.PUBLISHED,
      basePrice: 1250.0,
      minQuantity: 1,
      maxQuantity: 100,
      productionDays: 1,
      tags: ['Signage', 'Standee', 'Banners', 'Events'],
    },
    create: {
      categoryId: catSignage.id,
      name: 'Luxury Roll-Up Standee',
      slug: 'luxury-rollup-standee',
      sku: 'PRD-SGN-003',
      description: 'High-impact promotional pull-up banner stand with vibrant eco-solvent print, aluminum base cartridge, and padded carry bag.',
      status: ProductStatus.PUBLISHED,
      pricingModel: 'MATRIX',
      basePrice: 1250.0,
      minQuantity: 1,
      maxQuantity: 100,
      productionDays: 1,
      sortOrder: 3,
      isFeatured: true,
      tags: ['Signage', 'Standee', 'Banners', 'Events'],
    },
  });

  await prisma.productImage.deleteMany({ where: { productId: prodStandee.id } });
  await prisma.productImage.createMany({
    data: [
      {
        productId: prodStandee.id,
        url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80',
        altText: 'Luxury Roll Up Banner Standee',
        caption: 'Aluminum cartridge with high-resolution Star Flex graphic',
        sortOrder: 0,
        isPrimary: true,
      },
    ],
  });

  await prisma.productOptionGroup.deleteMany({ where: { productId: prodStandee.id } });

  await prisma.productOptionGroup.create({
    data: {
      productId: prodStandee.id,
      name: 'Standee Size',
      code: 'standee_size',
      inputType: 'SELECT',
      description: 'Select standard display dimension',
      isRequired: true,
      sortOrder: 1,
      options: {
        create: [
          { label: '2.5 × 6 ft (Standard)', value: '2.5x6ft', priceModifier: 0.0, priceModifierType: 'FIXED', isDefault: true, sortOrder: 0 },
          { label: '3.0 × 6 ft (Wide Display)', value: '3x6ft', priceModifier: 350.0, priceModifierType: 'FIXED', sortOrder: 1 },
        ],
      },
    },
  });

  await prisma.productOptionGroup.create({
    data: {
      productId: prodStandee.id,
      name: 'Media Substrate',
      code: 'media_type',
      inputType: 'SELECT',
      description: 'Print substrate quality & opacity',
      isRequired: true,
      sortOrder: 2,
      options: {
        create: [
          { label: 'Star Flex Matte 440 GSM', value: 'star_flex_matte', priceModifier: 0.0, priceModifierType: 'FIXED', isDefault: true, sortOrder: 0 },
          { label: 'Non-Tearable Polyester Fabric (+₹250)', value: 'fabric_non_tear', priceModifier: 250.0, priceModifierType: 'FIXED', sortOrder: 1 },
        ],
      },
    },
  });

  // 7. Seed Raw Materials & Inventory Items
  const inventoryItems = [
    {
      name: '350 GSM Art Card Sheets 25x36"',
      sku: 'RAW-PAP-350-01',
      category: InventoryCategory.SUBSTRATE,
      unit: 'SHEETS',
      currentStock: 15400,
      minStockThreshold: 2000,
      costPerUnit: 14.50,
      location: 'Paper Warehouse Bay A-1',
    },
    {
      name: '400 GSM Velvet Kappa Board Sheets',
      sku: 'RAW-PAP-400-01',
      category: InventoryCategory.SUBSTRATE,
      unit: 'SHEETS',
      currentStock: 8200,
      minStockThreshold: 1500,
      costPerUnit: 22.00,
      location: 'Paper Warehouse Bay A-2',
    },
    {
      name: '1200 GSM Rigid Greyboard 31x41"',
      sku: 'RAW-BRD-1200-01',
      category: InventoryCategory.BOARD,
      unit: 'SHEETS',
      currentStock: 3400,
      minStockThreshold: 800,
      costPerUnit: 48.00,
      location: 'Rigid Box Bay C-3',
    },
    {
      name: 'Thermal Matte Lamination Film Roll (320mm x 3000m)',
      sku: 'RAW-LAM-MATT-01',
      category: InventoryCategory.INK_CONSUMABLE,
      unit: 'ROLLS',
      currentStock: 24,
      minStockThreshold: 5,
      costPerUnit: 2850.00,
      location: 'Finishing Rack F-1',
    },
    {
      name: 'Kurz German Gold Hot Stamping Foil Roll 640mm',
      sku: 'RAW-FOL-GOLD-01',
      category: InventoryCategory.INK_CONSUMABLE,
      unit: 'ROLLS',
      currentStock: 12,
      minStockThreshold: 3,
      costPerUnit: 4500.00,
      location: 'Foil Stamping Vault V-2',
    },
    {
      name: 'Roll-Up Standee Aluminum Cartridge Base 2.5x6ft',
      sku: 'RAW-STN-ALU-01',
      category: InventoryCategory.PACKAGING,
      unit: 'PIECES',
      currentStock: 140,
      minStockThreshold: 25,
      costPerUnit: 480.00,
      location: 'Wide Format Bay W-1',
    },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: {},
      create: item,
    });
  }

  // 10. Seed Default Kanban Production Columns
  const defaultColumns = [
    {
      key: 'QC_APPROVED',
      name: 'QC APPROVED',
      description: 'Pre-Production QC 100% Passed. Ready for machine queue.',
      type: 'SYSTEM' as const,
      mappedStatus: OrderStatus.PRODUCTION_QUEUE,
      mappedStation: 'PRINTING',
      sortOrder: 10,
      color: '#3B82F6',
      isActive: true,
    },
    {
      key: 'PRINTING',
      name: 'PRINTING',
      description: 'Digital & Offset sheet press run in progress.',
      type: 'SYSTEM' as const,
      mappedStatus: OrderStatus.PRINTING,
      mappedStation: 'PRINTING',
      sortOrder: 20,
      color: '#F59E0B',
      isActive: true,
    },
    {
      key: 'FINISHING',
      name: 'FINISHING',
      description: 'Lamination, die-cutting, folding & blade trimming.',
      type: 'SYSTEM' as const,
      mappedStatus: OrderStatus.FINISHING,
      mappedStation: 'FINISHING',
      sortOrder: 30,
      color: '#8B5CF6',
      isActive: true,
    },
    {
      key: 'FINAL_QC',
      name: 'FINAL QC',
      description: 'Physical output inspection, color & registration audit.',
      type: 'SYSTEM' as const,
      mappedStatus: OrderStatus.QUALITY_CHECK,
      mappedStation: 'FINAL_QC',
      sortOrder: 40,
      color: '#10B981',
      isActive: true,
    },
    {
      key: 'PACKING',
      name: 'PACKING',
      description: 'Carton packaging, weigh station & shipping labeling.',
      type: 'SYSTEM' as const,
      mappedStatus: OrderStatus.PACKING,
      mappedStation: 'PACKING',
      sortOrder: 50,
      color: '#06B6D4',
      isActive: true,
    },
    {
      key: 'READY_FOR_DISPATCH',
      name: 'READY FOR DISPATCH',
      description: 'Packaged orders staged for courier manifest & pickup.',
      type: 'SYSTEM' as const,
      mappedStatus: OrderStatus.READY_FOR_DISPATCH,
      mappedStation: 'DISPATCH',
      sortOrder: 60,
      color: '#F97316',
      isActive: true,
    },
    {
      key: 'DISPATCHED',
      name: 'DISPATCHED',
      description: 'Waybill assigned and handed over to logistics carrier.',
      type: 'SYSTEM' as const,
      mappedStatus: OrderStatus.OUT_FOR_DELIVERY,
      mappedStation: 'DISPATCH',
      sortOrder: 70,
      color: '#64748B',
      isActive: true,
    },
  ];

  for (const col of defaultColumns) {
    await (prisma as any).productionColumn.upsert({
      where: { key: col.key },
      update: {
        name: col.name,
        description: col.description,
        sortOrder: col.sortOrder,
        color: col.color,
        mappedStatus: col.mappedStatus,
        mappedStation: col.mappedStation,
      },
      create: col,
    });
  }

  console.log('✅ PRINT BAZZAR 2.0 Dynamic Catalogue & Kanban Columns Seeded Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
