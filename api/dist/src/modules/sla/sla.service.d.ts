import { PrismaService } from '../prisma/prisma.service';
export declare class SlaService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getSlaOverview(): Promise<{
        metrics: {
            totalActiveOrders: number;
            activeJobCards: number;
            onTime: number;
            atRisk: number;
            delayed: number;
            breachedCount: number;
        };
        delayedOrders: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            orderNumber: string;
            priority: import(".prisma/client").$Enums.Priority;
            slaStatus: import(".prisma/client").$Enums.SlaStatus;
            dueAt: Date | null;
        }[];
        atRiskOrders: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            orderNumber: string;
            priority: import(".prisma/client").$Enums.Priority;
            slaStatus: import(".prisma/client").$Enums.SlaStatus;
            dueAt: Date | null;
        }[];
    }>;
}
