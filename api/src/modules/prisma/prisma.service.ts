import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to PostgreSQL successfully');

      // Auto-migrate schema safety check: ensures required columns exist in production database
      await this.ensureSchemaSafety();
    } catch (err) {
      this.logger.warn(`Prisma connection warning: ${(err as Error).message}. Will retry on queries.`);
    }
  }

  private async ensureSchemaSafety() {
    try {
      // 1. Ensure Product.keyPoints column exists in PostgreSQL
      await this.$executeRawUnsafe(
        'ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "keyPoints" text[] DEFAULT ARRAY[]::text[];'
      );
      this.logger.log('Database auto-migration: verified "Product.keyPoints" column exists');
    } catch (err: any) {
      this.logger.warn(`Database auto-migration warning: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
