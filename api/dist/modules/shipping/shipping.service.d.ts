import { PrismaService } from '../prisma/prisma.service';
import { ShippingConfigService } from './shipping-config.service';
export declare class ShippingService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ShippingConfigService);
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
    getOrders(query: {
        search?: string;
        pincode?: string;
        zoneId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
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
}
