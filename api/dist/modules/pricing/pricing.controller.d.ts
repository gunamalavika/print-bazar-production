import { PricingService, QuoteCalculationRequestDto } from './pricing.service';
export declare class PricingController {
    private readonly pricingService;
    constructor(pricingService: PricingService);
    calculateQuote(body: QuoteCalculationRequestDto): Promise<import("./pricing.service").QuoteItemBreakdown>;
}
