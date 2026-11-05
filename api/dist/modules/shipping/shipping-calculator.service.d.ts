import { PrismaService } from '../prisma/prisma.service';
import { ShippingConfigService } from './shipping-config.service';
import { ShippingPackagingService } from './shipping-packaging.service';
import { ShippingCalculationRequestDto } from './dto/shipping.dto';
export interface AuthoritativeShippingBreakdown {
    status: 'CALCULATED' | 'FREE' | 'STORE_PICKUP' | 'NON_SERVICEABLE' | 'PENDING';
    destinationPincode: string;
    isServiceable: boolean;
    serviceabilityMessage?: string;
    pincodeLocation?: {
        city: string;
        district?: string;
        state: string;
        estimatedDays?: string;
    } | null;
    zone: {
        id: string;
        code: string;
        name: string;
        estimatedDeliveryDays?: string;
    } | null;
    pricingModelUsed: string;
    matchedBracketLabel?: string;
    unitWeightGrams: number;
    productWeightGrams: number;
    packaging: {
        id?: string;
        name: string;
        weightGrams: number;
        packagingCharge: number;
    };
    actualWeightGrams: number;
    volumetricWeightGrams: number | null;
    billableWeightGrams: number;
    rateCard: {
        id?: string;
        name: string;
        additionalWeightPerKg?: number;
        slabs?: Array<{
            id: string;
            minWeightGrams: number;
            maxWeightGrams: number;
            rate: number;
        }>;
    } | null;
    matchedSlab: {
        id?: string;
        minWeightGrams: number;
        maxWeightGrams: number;
        rate: number;
    } | null;
    baseShippingCharge: number;
    additionalWeightCharge: number;
    zoneSurcharge: number;
    pincodeSurcharge: number;
    packagingCharge: number;
    isFreeShippingApplied: boolean;
    freeShippingThreshold: number;
    finalShippingAmount: number;
    deliveryMethod: string;
    calculationBasis: string;
}
export declare class ShippingCalculatorService {
    private readonly prisma;
    private readonly configService;
    private readonly packagingService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ShippingConfigService, packagingService: ShippingPackagingService);
    calculateShipping(dto: ShippingCalculationRequestDto): Promise<AuthoritativeShippingBreakdown>;
    checkServiceability(pincode: string): Promise<{
        pincode: string;
        city: string;
        state: string;
        zone: {
            id: string;
            zoneName: string;
            zoneCode: string | null;
            estimatedDeliveryDays: string | null;
        };
        isServiceable: boolean;
        estimatedDays: string;
        additionalSurcharge: number;
        message: string;
    }>;
}
