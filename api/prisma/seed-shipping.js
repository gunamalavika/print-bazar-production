const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding initial enterprise shipping configuration...');

  // 1. Config
  await prisma.shippingConfiguration.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      businessName: 'PRINT BAZAAR 2.0',
      originAddress: '10/24 Industrial Estate, Peelamedu',
      originCity: 'Coimbatore',
      originState: 'Tamil Nadu',
      originCountry: 'India',
      originPincode: '641004',
      isWeightBasedEnabled: true,
      isPincodeZoneEnabled: true,
      minShippingCharge: 40,
      freeShippingThreshold: 2000,
      isFreeShippingEnabled: true,
      defaultPackagingWeightGrams: 200,
      gstRate: 18,
    },
  });

  // 2. Packaging profiles
  await prisma.shippingPackagingProfile.upsert({
    where: { id: 'pkg-small-carton' },
    update: {},
    create: {
      id: 'pkg-small-carton',
      name: 'Small Carton (Up to 2.5 kg)',
      type: 'CARTON',
      weightGrams: 200,
      lengthMm: 220,
      widthMm: 160,
      heightMm: 120,
      maxWeightCapacityGrams: 2500,
      isDefault: true,
      isActive: true,
    },
  });

  await prisma.shippingPackagingProfile.upsert({
    where: { id: 'pkg-medium-carton' },
    update: {},
    create: {
      id: 'pkg-medium-carton',
      name: 'Medium Carton (Up to 5 kg)',
      type: 'CARTON',
      weightGrams: 400,
      lengthMm: 320,
      widthMm: 240,
      heightMm: 180,
      maxWeightCapacityGrams: 5000,
      isDefault: false,
      isActive: true,
    },
  });

  await prisma.shippingPackagingProfile.upsert({
    where: { id: 'pkg-large-carton' },
    update: {},
    create: {
      id: 'pkg-large-carton',
      name: 'Large Heavy Carton (Up to 15 kg)',
      type: 'CARTON',
      weightGrams: 750,
      lengthMm: 450,
      widthMm: 350,
      heightMm: 280,
      maxWeightCapacityGrams: 15000,
      isDefault: false,
      isActive: true,
    },
  });

  await prisma.shippingPackagingProfile.upsert({
    where: { id: 'pkg-paper-bundle' },
    update: {},
    create: {
      id: 'pkg-paper-bundle',
      name: 'Paper Bundle / Envelope',
      type: 'BUNDLE',
      weightGrams: 80,
      lengthMm: 250,
      widthMm: 180,
      heightMm: 30,
      maxWeightCapacityGrams: 1000,
      isDefault: false,
      isActive: true,
    },
  });

  await prisma.shippingPackagingProfile.upsert({
    where: { id: 'pkg-poster-tube' },
    update: {},
    create: {
      id: 'pkg-poster-tube',
      name: 'Rigid Poster Tube',
      type: 'TUBE',
      weightGrams: 180,
      lengthMm: 650,
      widthMm: 80,
      heightMm: 80,
      maxWeightCapacityGrams: 2000,
      isDefault: false,
      isActive: true,
    },
  });

  // 3. Zones & Rate Cards
  const zoneDefs = [
    {
      code: 'LOCAL',
      name: 'Local Delivery (Intra-City & Plant Radius)',
      desc: 'Same-day or next-day courier delivery within intra-city plant zone',
      estDays: '1-2 business days',
      slabs: [
        { min: 0, max: 500, rate: 40 },
        { min: 501, max: 1000, rate: 55 },
        { min: 1001, max: 2500, rate: 75 },
        { min: 2501, max: 5000, rate: 100 },
      ],
      extraKg: 20,
    },
    {
      code: 'REGIONAL',
      name: 'Regional Delivery (South Zone / State)',
      desc: 'Ground & express transit across Tamil Nadu, Karnataka, Kerala, AP, Telangana',
      estDays: '2-3 business days',
      slabs: [
        { min: 0, max: 500, rate: 55 },
        { min: 501, max: 1000, rate: 75 },
        { min: 1001, max: 2500, rate: 100 },
        { min: 2501, max: 5000, rate: 140 },
      ],
      extraKg: 25,
    },
    {
      code: 'NATIONAL',
      name: 'National Delivery (Pan-India Metro & Tier 1/2)',
      desc: 'Air & surface express delivery across all major Indian commercial hubs',
      estDays: '3-5 business days',
      slabs: [
        { min: 0, max: 500, rate: 70 },
        { min: 501, max: 1000, rate: 95 },
        { min: 1001, max: 2500, rate: 130 },
        { min: 2501, max: 5000, rate: 180 },
      ],
      extraKg: 35,
    },
    {
      code: 'REMOTE',
      name: 'Remote / Special Delivery (Hill & Special Terrains)',
      desc: 'Special logistics delivery for J&K, Northeast states, Andaman, Lakshadweep',
      estDays: '5-8 business days',
      slabs: [
        { min: 0, max: 500, rate: 90 },
        { min: 501, max: 1000, rate: 120 },
        { min: 1001, max: 2500, rate: 160 },
        { min: 2501, max: 5000, rate: 220 },
      ],
      extraKg: 50,
    },
  ];

  const createdZones = {};

  for (const zd of zoneDefs) {
    let zone = await prisma.shippingZone.findUnique({ where: { zoneCode: zd.code } });
    if (!zone) {
      zone = await prisma.shippingZone.create({
        data: {
          zoneCode: zd.code,
          zoneName: zd.name,
          description: zd.desc,
          estimatedDeliveryDays: zd.estDays,
          shippingCharge: zd.slabs[0].rate,
          isActive: true,
        },
      });
    }
    createdZones[zd.code] = zone;

    // Rate card
    let rateCard = await prisma.shippingRateCard.findFirst({
      where: { zoneId: zone.id, name: zd.code + ' Standard Rate Card 2026' },
    });
    if (!rateCard) {
      rateCard = await prisma.shippingRateCard.create({
        data: {
          name: zd.code + ' Standard Rate Card 2026',
          zoneId: zone.id,
          minShippingCharge: zd.slabs[0].rate,
          additionalWeightPerKg: zd.extraKg,
          isActive: true,
          slabs: {
            create: zd.slabs.map((s, idx) => ({
              minWeightGrams: s.min,
              maxWeightGrams: s.max,
              rate: s.rate,
              sortOrder: idx + 1,
            })),
          },
        },
      });
    }
  }

  // 4. Sample Pincodes
  const samplePincodes = [
    // Local (Coimbatore)
    { pin: '641001', city: 'Coimbatore', dist: 'Coimbatore', state: 'Tamil Nadu', zone: 'LOCAL' },
    { pin: '641002', city: 'Coimbatore', dist: 'Coimbatore', state: 'Tamil Nadu', zone: 'LOCAL' },
    { pin: '641004', city: 'Coimbatore', dist: 'Coimbatore', state: 'Tamil Nadu', zone: 'LOCAL' },
    { pin: '641014', city: 'Coimbatore', dist: 'Coimbatore', state: 'Tamil Nadu', zone: 'LOCAL' },
    { pin: '641018', city: 'Coimbatore', dist: 'Coimbatore', state: 'Tamil Nadu', zone: 'LOCAL' },
    { pin: '641028', city: 'Coimbatore', dist: 'Coimbatore', state: 'Tamil Nadu', zone: 'LOCAL' },
    { pin: '641035', city: 'Coimbatore', dist: 'Coimbatore', state: 'Tamil Nadu', zone: 'LOCAL' },
    // Regional (South)
    { pin: '600001', city: 'Chennai', dist: 'Chennai', state: 'Tamil Nadu', zone: 'REGIONAL' },
    { pin: '600028', city: 'Chennai', dist: 'Chennai', state: 'Tamil Nadu', zone: 'REGIONAL' },
    { pin: '600122', city: 'Chennai', dist: 'Kanchipuram', state: 'Tamil Nadu', zone: 'REGIONAL' },
    { pin: '560001', city: 'Bangalore', dist: 'Bangalore Urban', state: 'Karnataka', zone: 'REGIONAL' },
    { pin: '560034', city: 'Bangalore', dist: 'Bangalore Urban', state: 'Karnataka', zone: 'REGIONAL' },
    { pin: '682001', city: 'Kochi', dist: 'Ernakulam', state: 'Kerala', zone: 'REGIONAL' },
    { pin: '500001', city: 'Hyderabad', dist: 'Hyderabad', state: 'Telangana', zone: 'REGIONAL' },
    // National
    { pin: '400001', city: 'Mumbai', dist: 'Mumbai City', state: 'Maharashtra', zone: 'NATIONAL' },
    { pin: '400021', city: 'Mumbai', dist: 'Mumbai City', state: 'Maharashtra', zone: 'NATIONAL' },
    { pin: '110001', city: 'New Delhi', dist: 'Central Delhi', state: 'Delhi', zone: 'NATIONAL' },
    { pin: '110020', city: 'New Delhi', dist: 'South Delhi', state: 'Delhi', zone: 'NATIONAL' },
    { pin: '700001', city: 'Kolkata', dist: 'Kolkata', state: 'West Bengal', zone: 'NATIONAL' },
    { pin: '380001', city: 'Ahmedabad', dist: 'Ahmedabad', state: 'Gujarat', zone: 'NATIONAL' },
    { pin: '302001', city: 'Jaipur', dist: 'Jaipur', state: 'Rajasthan', zone: 'NATIONAL' },
    { pin: '226001', city: 'Lucknow', dist: 'Lucknow', state: 'Uttar Pradesh', zone: 'NATIONAL' },
    // Remote
    { pin: '190001', city: 'Srinagar', dist: 'Srinagar', state: 'Jammu and Kashmir', zone: 'REMOTE' },
    { pin: '795001', city: 'Imphal', dist: 'Imphal West', state: 'Manipur', zone: 'REMOTE' },
    { pin: '737101', city: 'Gangtok', dist: 'East Sikkim', state: 'Sikkim', zone: 'REMOTE' },
    { pin: '744101', city: 'Port Blair', dist: 'South Andaman', state: 'Andaman and Nicobar Islands', zone: 'REMOTE' },
  ];

  for (const sp of samplePincodes) {
    const zone = createdZones[sp.zone];
    if (!zone) continue;
    await prisma.shippingPincode.upsert({
      where: { pincode: sp.pin },
      update: {
        zoneId: zone.id,
        city: sp.city,
        state: sp.state,
      },
      create: {
        pincode: sp.pin,
        city: sp.city,
        district: sp.dist,
        state: sp.state,
        zoneId: zone.id,
        isServiceable: true,
      },
    });
  }

  console.log('Enterprise shipping data successfully seeded!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

