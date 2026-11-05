import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateShippingZoneDto, UpdateShippingZoneDto } from './dto/shipping.dto';
export declare class ShippingZoneService {
    private readonly prisma;
    private readonly auditService;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService);
    listZones(search?: string, isActive?: boolean): Promise<{
        shippingCharge: number;
        zoneSurcharge: number;
        pincodeCount: number;
        rateCardCount: number;
        _count: {
            pincodes: number;
            rateCards: number;
        };
        rateCards: {
            id: string;
            name: string;
            minShippingCharge: import("@prisma/client/runtime/library").Decimal;
            additionalWeightPerKg: import("@prisma/client/runtime/library").Decimal;
            slabs: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                sortOrder: number;
                minWeightGrams: number;
                maxWeightGrams: number;
                rate: import("@prisma/client/runtime/library").Decimal;
                rateCardId: string;
            }[];
        }[];
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        zoneName: string;
        pincodePrefix: string | null;
        zoneCode: string | null;
        estimatedDeliveryDays: string | null;
    }[]>;
    getZone(id: string): Promise<{
        shippingCharge: number;
        zoneSurcharge: number;
        pincodes: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pincode: string;
            city: string;
            district: string | null;
            state: string;
            country: string;
            zoneId: string;
            isServiceable: boolean;
            additionalSurcharge: import("@prisma/client/runtime/library").Decimal;
            deliveryRestrictions: string | null;
            estimatedDays: string | null;
        }[];
        rateCards: ({
            slabs: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                sortOrder: number;
                minWeightGrams: number;
                maxWeightGrams: number;
                rate: import("@prisma/client/runtime/library").Decimal;
                rateCardId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            priority: number;
            minShippingCharge: import("@prisma/client/runtime/library").Decimal;
            zoneId: string;
            additionalWeightPerKg: import("@prisma/client/runtime/library").Decimal;
            effectiveFrom: Date;
            effectiveTo: Date | null;
        })[];
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        zoneName: string;
        pincodePrefix: string | null;
        zoneCode: string | null;
        estimatedDeliveryDays: string | null;
    }>;
    createZone(dto: CreateShippingZoneDto, actorId?: string): Promise<{
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
    }>;
    updateZone(id: string, dto: UpdateShippingZoneDto, actorId?: string): Promise<{
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
    }>;
    deleteZone(id: string, actorId?: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
