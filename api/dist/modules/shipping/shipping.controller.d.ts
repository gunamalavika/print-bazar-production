import { ShippingService } from './shipping.service';
import { ShippingConfigService } from './shipping-config.service';
import { ShippingZoneService } from './shipping-zone.service';
import { ShippingPincodeService } from './shipping-pincode.service';
import { ShippingRateService } from './shipping-rate.service';
import { ShippingPackagingService } from './shipping-packaging.service';
import { ShippingCalculatorService } from './shipping-calculator.service';
import { UpdateShippingConfigurationDto, CreateShippingZoneDto, UpdateShippingZoneDto, CreateShippingPincodeDto, UpdateShippingPincodeDto, BulkImportPincodesDto, CreateShippingRateCardDto, UpdateShippingRateCardDto, CreatePackagingProfileDto, UpdatePackagingProfileDto, ShippingCalculationRequestDto, CheckServiceabilityDto } from './dto/shipping.dto';
export declare class ShippingController {
    private readonly shippingService;
    private readonly configService;
    private readonly zoneService;
    private readonly pincodeService;
    private readonly rateService;
    private readonly packagingService;
    private readonly calculatorService;
    constructor(shippingService: ShippingService, configService: ShippingConfigService, zoneService: ShippingZoneService, pincodeService: ShippingPincodeService, rateService: ShippingRateService, packagingService: ShippingPackagingService, calculatorService: ShippingCalculatorService);
    getOverview(): Promise<{
        stats: {
            totalShippedOrders: number;
            activeZones: number;
            totalPincodes: number;
            activeRateCards: number;
        };
        kpis: {
            totalZones: number;
            totalPincodes: number;
            serviceablePincodes: number;
            nonServiceablePincodes: number;
            activeRateCards: number;
            ordersAwaitingDispatch: number;
            totalShippingRevenue: number;
            avgShippingCost: number;
        };
        configurationStatus: {
            businessName: string;
            originCity: string;
            originState: string;
            originPincode: string;
            weightUnit: string;
            roundingMethod: string;
            isWeightBasedEnabled: boolean;
            isVolumetricEnabled: boolean;
            freeShippingThreshold: number;
        };
        zones: {
            id: string;
            zoneCode: string;
            name: string;
            zoneName: string;
            description: string | null;
            estimatedDeliveryDays: string;
            baseSurcharge: number;
            pincodeCount: number;
            rateCardCount: number;
            shippingCharge: number;
        }[];
        recentOrders: {
            id: string;
            orderNumber: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            city: string;
            state: string;
            pincode: string;
            billableWeightGrams: number;
            shippingAmount: number;
            totalAmount: number;
            createdAt: Date;
        }[];
        alerts: {
            id: string;
            type: "warning" | "info" | "error";
            message: string;
        }[];
    }>;
    getOrders(search?: string, pincode?: string, status?: string, page?: string, limit?: string): Promise<{
        orders: {
            id: string;
            orderNumber: string;
            customerName: string;
            customerEmail: string;
            city: string;
            state: string;
            destinationPincode: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            subtotal: number;
            shippingCharge: number;
            taxAmount: number;
            grandTotal: number;
            actualWeightGrams: number;
            packagingWeightGrams: number;
            billableWeightGrams: number;
            createdAt: Date;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getReports(): Promise<{
        summary: {
            totalShipments: number;
            totalShippingRevenue: number;
            averageShippingCharge: number;
            freeShippingOrdersCount: number;
            paidShippingOrdersCount: number;
        };
        weightDistribution: {
            slab: string;
            count: number;
        }[];
        stateAnalytics: {
            state: string;
            shipments: number;
            revenue: number;
        }[];
        categoryAnalytics: {
            category: string;
            revenue: number;
        }[];
    }>;
    getConfiguration(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        freeShippingThreshold: import("@prisma/client/runtime/library").Decimal;
        gstRate: import("@prisma/client/runtime/library").Decimal;
        isFreeShippingEnabled: boolean;
        businessName: string;
        originAddress: string;
        originCity: string;
        originState: string;
        originCountry: string;
        originPincode: string;
        originPhone: string | null;
        originEmail: string | null;
        isWeightBasedEnabled: boolean;
        isFixedShippingEnabled: boolean;
        isPincodeZoneEnabled: boolean;
        isVolumetricEnabled: boolean;
        volumetricDivisor: number;
        weightUnit: string;
        weightRoundingMethod: string;
        minShippingCharge: import("@prisma/client/runtime/library").Decimal;
        defaultPackagingWeightGrams: number;
        defaultPackagingProfileId: string | null;
    }>;
    updateConfiguration(dto: UpdateShippingConfigurationDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        freeShippingThreshold: import("@prisma/client/runtime/library").Decimal;
        gstRate: import("@prisma/client/runtime/library").Decimal;
        isFreeShippingEnabled: boolean;
        businessName: string;
        originAddress: string;
        originCity: string;
        originState: string;
        originCountry: string;
        originPincode: string;
        originPhone: string | null;
        originEmail: string | null;
        isWeightBasedEnabled: boolean;
        isFixedShippingEnabled: boolean;
        isPincodeZoneEnabled: boolean;
        isVolumetricEnabled: boolean;
        volumetricDivisor: number;
        weightUnit: string;
        weightRoundingMethod: string;
        minShippingCharge: import("@prisma/client/runtime/library").Decimal;
        defaultPackagingWeightGrams: number;
        defaultPackagingProfileId: string | null;
    }>;
    listZones(search?: string, isActive?: string): Promise<{
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
    createZone(dto: CreateShippingZoneDto, req: any): Promise<{
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
    updateZone(id: string, dto: UpdateShippingZoneDto, req: any): Promise<{
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
    deleteZone(id: string, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    listPincodes(search?: string, pincode?: string, city?: string, state?: string, zoneId?: string, isServiceable?: string, page?: string, limit?: string): Promise<{
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
    createPincode(dto: CreateShippingPincodeDto, req: any): Promise<{
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
    bulkImportPincodes(dto: BulkImportPincodesDto, req: any): Promise<{
        totalReceived: number;
        importedCount: number;
        updatedCount: number;
        skippedCount: number;
        errors: {
            row: number;
            pincode?: string;
            error: string;
        }[];
    }>;
    updatePincode(id: string, dto: UpdateShippingPincodeDto, req: any): Promise<{
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
    deletePincode(id: string, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    listRateCards(zoneId?: string, isActive?: string): Promise<{
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
    createRateCard(dto: CreateShippingRateCardDto, req: any): Promise<{
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
    updateRateCard(id: string, dto: UpdateShippingRateCardDto, req: any): Promise<{
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
    deleteRateCard(id: string, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    listPackagingProfiles(isActive?: string): Promise<{
        packagingCharge: number;
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        isDefault: boolean;
        type: string;
        weightGrams: number;
        lengthMm: number | null;
        widthMm: number | null;
        heightMm: number | null;
        maxWeightCapacityGrams: number | null;
    }[]>;
    createPackagingProfile(dto: CreatePackagingProfileDto, req: any): Promise<{
        packagingCharge: number;
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        isDefault: boolean;
        type: string;
        weightGrams: number;
        lengthMm: number | null;
        widthMm: number | null;
        heightMm: number | null;
        maxWeightCapacityGrams: number | null;
    }>;
    updatePackagingProfile(id: string, dto: UpdatePackagingProfileDto, req: any): Promise<{
        packagingCharge: number;
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        isDefault: boolean;
        type: string;
        weightGrams: number;
        lengthMm: number | null;
        widthMm: number | null;
        heightMm: number | null;
        maxWeightCapacityGrams: number | null;
    }>;
    deletePackagingProfile(id: string, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    calculateShipping(dto: ShippingCalculationRequestDto): Promise<import("./shipping-calculator.service").AuthoritativeShippingBreakdown>;
    checkServiceability(dto: CheckServiceabilityDto): Promise<{
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
