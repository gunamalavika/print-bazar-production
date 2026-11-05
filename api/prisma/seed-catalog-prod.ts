import { PrismaClient, ProductStatus, InventoryCategory, OrderStatus } from '@prisma/client';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Explicitly load api/.env.production
dotenv.config({ path: path.resolve(__dirname, '../.env.production'), override: true });

const dbUrl = process.env.DATABASE_URL;
console.log('Connecting to database:', dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'UNDEFINED');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  console.log('--- SEEDING PRODUCTION CATEGORIES & CATALOG PRODUCTS (NON-DESTRUCTIVE) ---');

  // 0. Seed Machine Work Centers
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
  console.log('✓ Seeded 6 Machine Work Centers');

  // 1. Categories
  const catVisitingCards = await prisma.productCategory.upsert({
    where: { slug: 'visiting-cards' },
    update: {
      name: 'Visiting Cards',
      description: 'Corporate business cards, velvet touch, raised spot UV, and luxury metallic finishes.',
      sortOrder: 1,
      isActive: true,
      image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80',
    },
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
    update: {
      name: 'Packaging & Rigid Boxes',
      description: 'Luxury rigid presentation boxes, mono cartons, corrugated shippers, and custom inserts.',
      sortOrder: 2,
      isActive: true,
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
    },
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
    update: {
      name: 'Signs & Banners',
      description: 'Roll-up luxury standees, vinyl banners, acrylic signs, and promotional backdrops.',
      sortOrder: 3,
      isActive: true,
      image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80',
    },
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
    update: {
      name: 'Marketing Materials',
      description: 'Flyers, brochures, catalogues, folded leaflets, and direct mail inserts.',
      sortOrder: 4,
      isActive: true,
      image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80',
    },
    create: {
      name: 'Marketing Materials',
      slug: 'marketing-materials',
      description: 'Flyers, brochures, catalogues, folded leaflets, and direct mail inserts.',
      sortOrder: 4,
      isActive: true,
      image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80',
    },
  });

  console.log('✓ Seeded 4 Categories');

  // 2. Product 1: Premium Visiting Cards
  const prodBizCards = await prisma.product.upsert({
    where: { slug: 'premium-visiting-cards' },
    update: {
      status: ProductStatus.PUBLISHED,
      basePrice: 1.5,
      minQuantity: 100,
      maxQuantity: 10000,
      productionDays: 2,
      defaultSize: '89 mm x 54 mm (Standard Visiting Card)',
      isFeatured: true,
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
    ],
  });

  // Product 2: Custom Luxury Rigid Box
  const prodBox = await prisma.product.upsert({
    where: { slug: 'custom-rigid-box' },
    update: {
      status: ProductStatus.PUBLISHED,
      basePrice: 65.0,
      minQuantity: 50,
      maxQuantity: 5000,
      productionDays: 5,
      isFeatured: true,
      tags: ['Packaging', 'Rigid Box', 'Kappa Board', 'Luxury'],
    },
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
    ],
  });

  // Product 3: Luxury Roll-Up Standee
  const prodStandee = await prisma.product.upsert({
    where: { slug: 'luxury-rollup-standee' },
    update: {
      status: ProductStatus.PUBLISHED,
      basePrice: 1250.0,
      minQuantity: 1,
      maxQuantity: 100,
      productionDays: 1,
      isFeatured: true,
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

  console.log('✓ Seeded 3 Published Featured Products with Media');
  console.log('🎉 Production Catalog Seeding Complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during catalog seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

