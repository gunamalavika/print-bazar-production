import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateShippingPincodeDto, UpdateShippingPincodeDto, BulkImportPincodesDto } from './dto/shipping.dto';
export declare class ShippingPincodeService {
    private readonly prisma;
    private readonly auditService;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService);
    listPincodes(query: {
        search?: string;
        pincode?: string;
        city?: string;
        state?: string;
        zoneId?: string;
        isServiceable?: boolean;
        page?: number;
        limit?: number;
    }): Promise<{
        pincodes: {
            additionalSurcharge: number;
            zone: {
                shippingCharge: number;
                id: string;
                isActive: boolean;
                zoneName: string;
                zoneCode: string | null;
            } | null;
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
            deliveryRestrictions: string | null;
            estimatedDays: string | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getPincode(pincode: string): Promise<{
        additionalSurcharge: number;
        zone: {
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
        } & {
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
        updatedAt: Date;
        pincode: string;
        city: string;
        district: string | null;
        state: string;
        country: string;
        zoneId: string;
        isServiceable: boolean;
        deliveryRestrictions: string | null;
        estimatedDays: string | null;
    }>;
    createPincode(dto: CreateShippingPincodeDto, actorId?: string): Promise<{
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
    } & {
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
    }>;
    updatePincode(id: string, dto: UpdateShippingPincodeDto, actorId?: string): Promise<{
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
    } & {
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
    }>;
    deletePincode(id: string, actorId?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    bulkImport(dto: BulkImportPincodesDto, actorId?: string): Promise<{
        totalReceived: number;
        importedCount: number;
        updatedCount: number;
        skippedCount: number;
        errors: Array<{
            row: number;
            pincode?: string;
            error: string;
        }>;
    }>;
    exportPincodes(): Promise<{
        pincode: string;
        city: string;
        district: string;
        state: string;
        zoneCode: string;
        zoneName: string;
        isServiceable: string;
        additionalSurcharge: number;
        deliveryRestrictions: string;
    }[]>;
}
