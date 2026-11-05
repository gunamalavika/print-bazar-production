import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get(':invoiceNumber')
  @ApiOperation({ summary: 'Get official tax invoice details' })
  async getInvoice(@Param('invoiceNumber') invoiceNumber: string) {
    return this.invoicesService.getInvoiceByNumber(invoiceNumber);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tax invoices for an order' })
  async getInvoicesForOrder(@Param('orderId') orderId: string) {
    return this.invoicesService.getInvoicesForOrder(orderId);
  }
}
