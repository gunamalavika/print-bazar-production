import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PricingService, QuoteCalculationRequestDto } from './pricing.service';

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate-quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate authoritative server-side quote for a product configuration' })
  @ApiResponse({ status: 200, description: 'Authoritative price quote calculated' })
  async calculateQuote(@Body() body: QuoteCalculationRequestDto) {
    return this.pricingService.calculateQuote(body);
  }
}
