import { PrismaService } from '../prisma/prisma.service';
import { ShippingGstService } from '../shipping-gst/shipping-gst.service';
export interface OptionSelectionDto {
    optionCode: string;
    valueCode: string;
}
export interface VariantLineInput {
    id?: string;
    sku?: string;
    combination: Record<string, string>;
    quantity: number;
    artworkUrl?: string;
    artworkStorageKey?: string;
    artworkFile?: any;
}
export interface VariantLineQuote {
    id?: string;
    sku?: string;
    combination: Record<string, string>;
    optionsSummary: Array<{
        optionName: string;
        optionCode: string;
        valueName: string;
        valueCode: string;
        priceModifier: number;
        additionalUnitPrice?: number;
        additionalChargeTotal?: number;
    }>;
    quantity: number;
    unitPrice: number;
    lineSubtotal: number;
    artworkUrl?: string;
}
export interface QuoteCalculationRequestDto {
    productId: string;
    quantity: number;
    options?: OptionSelectionDto[];
    fieldValues?: Record<string, any>;
    variantLines?: VariantLineInput[];
    hasArtwork?: boolean;
    hasDesignService?: boolean;
    hasReferenceImage?: boolean;
    shippingPincode?: string;
    isInterState?: boolean;
    deliveryMethod?: 'COURIER' | 'STORE_PICKUP' | 'LOCAL_EXPRESS_BIKE';
    paymentMethod?: 'FULL' | 'SPLIT_50' | 'COD' | 'ONLINE';
    isCod?: boolean;
}
export interface QuoteItemBreakdown {
    isMultiVariant?: boolean;
    totalVariantQuantity?: number;
    variantLines?: VariantLineQuote[];
    startingReferenceRate?: number;
    referenceUnitPrice?: number;
    basePrice: number;
    originalBasePrice: number;
    effectiveBasePrice: number;
    quantity: number;
    baseSubtotal: number;
    optionsCost: number;
    dynamicModifiersTotal: number;
    discountAmount: number;
    discountPercent: number;
    artworkFee: number;
    designServiceFee: number;
    additionalChargesTotal?: number;
    appliedCharges?: Array<{
        chargeId: string;
        name: string;
        amount: number;
        calculationType: 'FIXED' | 'PER_UNIT' | 'PERCENTAGE';
        description?: string;
    }>;
    artworkRequirement: string;
    designServiceRequirement: string;
    referenceImageRequirement: string;
    unitPrice: number;
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    courierCharge: number;
    freeShippingThreshold: number;
    estimatedShipping: number;
    matchedZone?: {
        id: string;
        zoneName: string;
        pincodePrefix: string;
        shippingCharge: number;
    } | null;
    isFreeShippingApplied?: boolean;
    gstRatePercent?: number;
    allowCod: boolean;
    codSurcharge: number;
    codCharge: number;
    deliveryMethod: string;
    paymentMethod: string;
    grandTotal: number;
    productionDays: number;
    appliedOffer?: {
        offerId: string;
        minQty: number;
        maxQty: number;
        discountPercent: number;
        offerName: string;
        savingsAmount: number;
    } | null;
    availableOffers?: Array<{
        id: string;
        minQty: number;
        maxQty: number;
        discountPercent: number;
        unitPrice: number;
        label: string;
    }>;
    selectedOptionsSummary: Array<{
        optionName: string;
        optionCode: string;
        valueName: string;
        valueCode: string;
        priceModifier: number;
        additionalUnitPrice?: number;
        additionalChargeTotal?: number;
    }>;
    specificationsSnapshot: Record<string, any>;
}
export declare class PricingService {
    private readonly prisma;
    private readonly shippingGstService;
    constructor(prisma: PrismaService, shippingGstService: ShippingGstService);
    evaluateCombinationPricing(product: any, initialSelections: Record<string, any>, effectiveOrderQty: number, lineQty: number): {
        startingReferenceRate: number;
        unitPrice: number;
        baseUnitPrice: number;
        optionsUnitModifier: number;
        lineSubtotal: number;
        selectedOptionsSummary: {
            optionName: string;
            optionCode: string;
            valueName: string;
            valueCode: string;
            priceModifier: number;
            additionalUnitPrice?: number;
            additionalChargeTotal?: number;
        }[];
        specificationsSnapshot: Record<string, any>;
        appliedOffer: {
            offerId: string;
            minQty: number;
            maxQty: number;
            discountPercent: number;
            offerName: string;
            savingsAmount: number;
        } | null;
        availableOffers: {
            id: string;
            minQty: number;
            maxQty: number;
            discountPercent: number;
            unitPrice: number;
            label: string;
        }[];
        groupOptionModifiers: Map<string, {
            modVal: number;
            type: string;
            isAdditionalTierPricing?: boolean;
        }>;
        bestMatchingRule: any;
        referenceUnitPrice: number;
        originalBasePrice: number;
        userSelections: Record<string, any>;
    };
    calculateQuote(dto: QuoteCalculationRequestDto): Promise<QuoteItemBreakdown>;
}
