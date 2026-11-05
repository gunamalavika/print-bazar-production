import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, isActive: true },
  });
  console.log('USERS IN DB:', JSON.stringify(users, null, 2));

  const orders = await prisma.order.findMany({
    take: 5,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      assignments: {
        select: {
          id: true,
          taskType: true,
          status: true,
          assignedUserId: true,
        },
      },
    },
  });
  console.log('SAMPLE ORDERS:', JSON.stringify(orders, null, 2));
}

main().finally(() => prisma.$disconnect());
