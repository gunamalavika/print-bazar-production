import { PrismaClient, Department } from '@prisma/client';
import { UserRole } from '../src/common/types/roles';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load api/.env explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

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
  console.log('--- CLEARING ALL ORDERS & TRANSACTIONAL TABLES ---');
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
    console.log('✅ All orders, job cards, artwork versions, payments, invoices, and transaction records cleared!');
  } catch (err) {
    console.warn('⚠️ Notice during transactional wipe:', err);
  }

  console.log('--- SEEDING PRINT BAZZAR 2.0 USERS & ENTERPRISE ROLES ONLY ---');

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Admin@12345', salt);

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
      email: 'prodhead@printbazzar.com',
      fullName: 'Rajesh Sharma (Production Head)',
      role: UserRole.PRODUCTION_HEAD,
      department: Department.PRODUCTION,
      phone: '+919811223355',
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

  let seededCount = 0;
  for (const s of staffMembers) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {
        fullName: s.fullName,
        role: s.role,
        department: s.department,
        phone: s.phone || '+919800000000',
        isActive: true,
      },
      create: {
        email: s.email,
        passwordHash: defaultPasswordHash,
        fullName: s.fullName,
        phone: s.phone || '+919800000000',
        role: s.role,
        department: s.department,
        isActive: true,
      },
    });

    if (s.role === UserRole.CUSTOMER) {
      await prisma.customer.upsert({
        where: { userId: user.id },
        update: {
          fullName: s.fullName,
          phone: s.phone || '+919876543210',
        },
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

    seededCount++;
    console.log(`✓ Seeded user: ${s.email} [${s.role}]`);
  }

  const [orderCount, paymentCount, jobCardCount, userCount] = await Promise.all([
    prisma.order.count(),
    prisma.payment.count(),
    prisma.jobCard.count(),
    prisma.user.count(),
  ]);

  console.log(`\n🎉 Successfully seeded ${seededCount} users into production database!`);
  console.log(`📊 Verification -> Orders: ${orderCount}, Payments: ${paymentCount}, JobCards: ${jobCardCount}, Users: ${userCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during user seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
