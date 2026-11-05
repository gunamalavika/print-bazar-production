import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.productCategory.upsert({
    where: { slug: 'rigid-presentation-boxes' },
    update: { parentId: null },
    create: {
      name: 'Rigid Presentation Boxes',
      slug: 'rigid-presentation-boxes',
      description: 'Luxury Kappa Board boxes with custom velvet and foil lining.',
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80',
      parentId: null,
      sortOrder: 4,
      isActive: true,
    },
  });

  await prisma.productCategory.upsert({
    where: { slug: 'mono-cartons' },
    update: { parentId: null },
    create: {
      name: 'Mono Cartons & Retail Boxes',
      slug: 'mono-cartons',
      description: 'Folding cartons for cosmetics, pharmaceuticals, and retail display.',
      image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80',
      parentId: null,
      sortOrder: 5,
      isActive: true,
    },
  });

  await prisma.productCategory.upsert({
    where: { slug: 'corrugated-mailers' },
    update: { parentId: null },
    create: {
      name: 'Corrugated Mailer Boxes',
      slug: 'corrugated-mailers',
      description: 'High-strength e-commerce dispatch mailers and shippers.',
      image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80',
      parentId: null,
      sortOrder: 6,
      isActive: true,
    },
  });

  await prisma.productCategory.upsert({
    where: { slug: 'roll-up-standees-sub' },
    update: { parentId: null },
    create: {
      name: 'Roll-Up Luxury Standees',
      slug: 'roll-up-standees-sub',
      description: 'Anodized aluminium pull-up exhibition display banners.',
      image: 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=600&auto=format&fit=crop&q=80',
      parentId: null,
      sortOrder: 7,
      isActive: true,
    },
  });

  await prisma.productCategory.upsert({
    where: { slug: 'vinyl-flex-banners' },
    update: { parentId: null },
    create: {
      name: 'Vinyl & Fabric Banners',
      slug: 'vinyl-flex-banners',
      description: 'Outdoor frontlit & backlit weather-resistant flex banners.',
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
      parentId: null,
      sortOrder: 8,
      isActive: true,
    },
  });

  console.log('✅ Standalone flat categories updated successfully!');
}

main().finally(() => prisma.$disconnect());
