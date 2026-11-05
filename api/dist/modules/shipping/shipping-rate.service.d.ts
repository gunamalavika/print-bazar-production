import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateShippingRateCardDto, UpdateShippingRateCardDto } from './dto/shipping.dto';
export declare class ShippingRateService {
    private readonly prisma;
    private readonly auditService;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService);
    private validateSlabs;
    listRateCards(zoneId?: string, isActive?: boolean): Promise<{
        minShippingCharge: number;
        additionalWeightPerKg: number;
        slabs: {
            rate: number;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            sortOrder: number;
            minWeightGrams: number;
            maxWeightGrams: number;
            rateCardId: string;
        }[];
        zone: {
            id: string;
            zoneName: string;
            zoneCode: string | null;
        };
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        priority: number;
        zoneId: string;
        effectiveFrom: Date;
        effectiveTo: Date | null;
    }[]>;
    getRateCard(id: string): Promise<{
        minShippingCharge: number;
        additionalWeightPerKg: number;
        slabs: {
            rate: number;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            sortOrder: number;
            minWeightGrams: number;
            maxWeightGrams: number;
            rateCardId: string;
        }[];
        zone: {
            id: string;
            createdAt: Date;
            isActive: boolean;
            updatedAt: Date;
            description: string | null;
            zoneName: string;
            pincodePrefix: string | null;
            shippingCharge: import("@prisma/client/runtime/library").Decimal;
            zoneCode: string | null;
            zoneSurcharge: import("@prisma/client/runtime/library").Decimal;
            estimatedDeliveryDays: string | null;
        };
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        priority: number;
        zoneId: string;
        effectiveFrom: Date;
        effectiveTo: Date | null;
    }>;
    createRateCard(dto: CreateShippingRateCardDto, actorId?: string): Promise<{
        minShippingCharge: number;
        additionalWeightPerKg: number;
        slabs: {
            rate: number;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            sortOrder: number;
            minWeightGrams: number;
            maxWeightGrams: number;
            rateCardId: string;
        }[];
        zone: {
            id: string;
            createdAt: Date;
            isActive: boolean;
            updatedAt: Date;
            description: string | null;
            zoneName: string;
            pincodePrefix: string | null;
            shippingCharge: import("@prisma/client/runtime/library").Decimal;
            zoneCode: string | null;
            zoneSurcharge: import("@prisma/client/runtime/library").Decimal;
            estimatedDeliveryDays: string | null;
        };
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        priority: number;
        zoneId: string;
        effectiveFrom: Date;
        effectiveTo: Date | null;
    }>;
    updateRateCard(id: string, dto: UpdateShippingRateCardDto, actorId?: string): Promise<{
        minShippingCharge: number;
        additionalWeightPerKg: number;
        slabs: {
            rate: number;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            sortOrder: number;
            minWeightGrams: number;
            maxWeightGrams: number;
            rateCardId: string;
        }[];
        zone: {
            id: string;
            createdAt: Date;
            isActive: boolean;
            updatedAt: Date;
            description: string | null;
            zoneName: string;
            pincodePrefix: string | null;
            shippingCharge: import("@prisma/client/runtime/library").Decimal;
            zoneCode: string | null;
            zoneSurcharge: import("@prisma/client/runtime/library").Decimal;
            estimatedDeliveryDays: string | null;
        };
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        priority: number;
        zoneId: string;
        effectiveFrom: Date;
        effectiveTo: Date | null;
    }>;
    deleteRateCard(id: string, actorId?: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
