import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, UserRole, Department } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to PostgreSQL successfully');

      // Auto-migrate schema safety check: ensures required columns and default admin exist in production database
      await this.ensureSchemaSafety();
    } catch (err) {
      this.logger.warn(`Prisma connection warning: ${(err as Error).message}. Will retry on queries.`);
    }
  }

  private async ensureSchemaSafety() {
    try {
      // 1. Ensure Product.keyPoints column and UserRole.PRODUCTION_HEAD enum value exist in PostgreSQL
      await this.$executeRawUnsafe(
        'ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "keyPoints" text[] DEFAULT ARRAY[]::text[];'
      );
      await this.$executeRawUnsafe(
        'ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS \'PRODUCTION_HEAD\';'
      );
      this.logger.log('Database auto-migration: verified "Product.keyPoints" column and "UserRole.PRODUCTION_HEAD" enum exist');
    } catch (err: any) {
      this.logger.warn(`Database auto-migration warning: ${err?.message || err}`);
    }

    try {
      // 2. Ensure core seed role accounts exist without overwriting existing custom staff
      const defaultPasswordHash = await bcrypt.hash('Admin@12345', 10);
      const coreAccounts: Array<{
        email: string;
        fullName: string;
        role: UserRole;
        department: Department;
      }> = [
        { email: 'admin@printbazzar.com', fullName: 'Vikram Mehta (Operations Director)', role: UserRole.ADMIN_MANAGER, department: Department.MANAGEMENT },
        { email: 'operations@printbazzar.com', fullName: 'Karthik Rajan (Operational Manager)', role: UserRole.OPERATIONAL_MANAGER, department: Department.OPERATIONS },
        { email: 'prodhead@printbazzar.com', fullName: 'Rajesh Sharma (Production Head)', role: UserRole.PRODUCTION_HEAD, department: Department.PRODUCTION },
        { email: 'operator@printbazzar.com', fullName: 'Manoj Kumar (Chief Print Operator)', role: UserRole.PRODUCTION_OPERATOR, department: Department.PRODUCTION },
        { email: 'prepress@printbazzar.com', fullName: 'Rahul Verma (Lead Prepress Engineer)', role: UserRole.DESIGNER_PREPRESS, department: Department.DESIGN_PREPRESS },
        { email: 'finalqc@printbazzar.com', fullName: 'Suresh Patil (Final QC Inspector)', role: UserRole.FINAL_QC_INSPECTOR, department: Department.QUALITY_ASSURANCE },
        { email: 'packing@printbazzar.com', fullName: 'Deepak Nair (Packaging Specialist)', role: UserRole.PACKING_OPERATOR, department: Department.PACKAGING },
        { email: 'dispatch@printbazzar.com', fullName: 'Arun Singh (Dispatch & Logistics Lead)', role: UserRole.DISPATCH_LOGISTICS, department: Department.LOGISTICS },
        { email: 'sales@printbazzar.com', fullName: 'Pooja Sharma (Senior Sales Executive)', role: UserRole.SALES_OFFICE, department: Department.SALES },
        { email: 'accounts@printbazzar.com', fullName: 'Neha Gupta (Finance & Billing Head)', role: UserRole.ACCOUNTS, department: Department.FINANCE },
      ];

      for (const acc of coreAccounts) {
        const existing = await this.user.findUnique({ where: { email: acc.email } });
        if (!existing) {
          await this.user.create({
            data: {
              email: acc.email,
              fullName: acc.fullName,
              passwordHash: defaultPasswordHash,
              role: acc.role,
              department: acc.department,
              isActive: true,
            },
          });
        }
      }
      this.logger.log('Database auto-seed: verified core role accounts exist');
    } catch (err: any) {
      this.logger.warn(`Core account verification warning: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
