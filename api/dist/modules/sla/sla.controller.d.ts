import { SlaService } from './sla.service';
export declare class SlaController {
    private readonly slaService;
    constructor(slaService: SlaService);
    getOverview(): Promise<{
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
