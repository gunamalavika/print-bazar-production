import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to PostgreSQL successfully');
    } catch (err) {
      this.logger.warn(`Prisma connection warning: ${(err as Error).message}. Will retry on queries.`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
