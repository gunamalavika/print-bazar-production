import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getInvoiceByNumber(invoiceNumber: string) {
    let invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        order: {
          include: {
            customer: true,
            shippingAddress: true,
            billingAddress: true,
            items: true,
          },
        },
      },
    });

    if (!invoice) {
      invoice = await this.prisma.invoice.findFirst({
        where: {
          OR: [
            { invoiceNumber: `INV-${invoiceNumber}` },
            { order: { orderNumber: invoiceNumber } },
          ],
        },
        include: {
          order: {
            include: {
              customer: true,
              shippingAddress: true,
              billingAddress: true,
              items: true,
            },
          },
        },
      });
    }

    if (!invoice) throw new NotFoundException(`Invoice '${invoiceNumber}' not found`);

    return invoice;
  }

  async getInvoicesForOrder(orderId: string) {
    return this.prisma.invoice.findMany({
      where: { orderId },
      orderBy: { issuedAt: 'desc' },
    });
  }
}
