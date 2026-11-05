import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobCardStatus, OrderStatus, ProductionColumnType, Priority, Prisma } from '@prisma/client';
import { JwtPayload } from '../../common/types/roles';
export interface BoardFiltersDto {
    search?: string;
    machineId?: string;
    operatorId?: string;
    priority?: Priority;
    slaStatus?: 'ON_TIME' | 'DUE_SOON' | 'OVERDUE';
    columnKey?: string;
}
export interface TransitionJobDto {
    targetColumnKey: string;
    targetStatus?: string;
    reason?: string;
    machineId?: string;
    operatorId?: string;
    managerOverrideReason?: string;
}
export interface CreateColumnDto {
    name: string;
    key?: string;
    description?: string;
    type?: ProductionColumnType;
    mappedStatus?: OrderStatus;
    mappedStation?: string;
    sortOrder?: number;
    color?: string;
}
export interface UpdateColumnDto {
    name?: string;
    description?: string;
    type?: ProductionColumnType;
    mappedStatus?: OrderStatus;
    mappedStation?: string;
    sortOrder?: number;
    color?: string;
    isActive?: boolean;
}
export interface KanbanCard {
    id: string;
    jobNumber: string;
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerCompany?: string;
    productName: string;
    quantity: number;
    specifications: {
        paperGsm?: string;
        finish?: string;
        printMode?: string;
        dimensions?: string;
        sides?: string;
        raw?: Record<string, unknown>;
    };
    machine?: {
        id: string;
        name: string;
        code: string;
        type: string;
    } | null;
    operator?: {
        id: string;
        fullName: string;
        role: string;
    } | null;
    status: JobCardStatus;
    orderStatus: OrderStatus;
    currentStation: string;
    priority: Priority;
    dueAt: Date;
    startedAt?: Date | null;
    completedAt?: Date | null;
    slaStatus: 'ON_TIME' | 'DUE_SOON' | 'OVERDUE';
    slaBadgeText: string;
    timeInfo: {
        label: string;
        text: string;
    };
    allowedTransitions: string[];
    allowedActions: string[];
    holdReason?: string;
    isHeld: boolean;
    version: number;
    artwork?: {
        id: string;
        storageKey: string;
        fileUrl: string;
        originalFileName: string;
        mimeType: string;
        fileSize: number;
        status: string;
        isApproved: boolean;
        proofUrl?: string | null;
    } | null;
}
export interface KanbanColumnResponse {
    id: string;
    key: string;
    name: string;
    description?: string | null;
    type: ProductionColumnType;
    sortOrder: number;
    color?: string | null;
    mappedStatus?: OrderStatus | null;
    mappedStation?: string | null;
    cards: KanbanCard[];
    cardCount: number;
}
export declare class ProductionBoardService {
    private readonly prisma;
    private readonly auditService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService, eventEmitter: EventEmitter2);
    getBoardData(filters: BoardFiltersDto, user: JwtPayload): Promise<{
        columns: KanbanColumnResponse[];
        metrics: {
            activeJobs: number;
            printing: number;
            finishing: number;
            finalQc: number;
            packing: number;
            readyForDispatch: number;
            dispatched: number;
            onHold: number;
        };
        shiftInfo: {
            shiftName: string;
            liveStatus: string;
            activePressCount: number;
            operatorCount: number;
        };
        availableMachines: {
            id: string;
            name: string;
            code: string;
            type: string;
        }[];
        availableOperators: {
            id: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
            department: import(".prisma/client").$Enums.Department | null;
        }[];
    }>;
    private isCardInColumn;
    private resolveRoleCapabilities;
    transitionJob(jobId: string, dto: TransitionJobDto, user: JwtPayload): Promise<{
        id: string;
        createdAt: Date;
        orderId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.JobCardStatus;
        approvedArtworkVersionId: string | null;
        orderItemId: string;
        priority: import(".prisma/client").$Enums.Priority;
        dueAt: Date;
        jobNumber: string;
        preHoldStatus: import(".prisma/client").$Enums.JobCardStatus | null;
        currentStation: string;
        machineId: string | null;
        operatorId: string | null;
        operationSequence: Prisma.JsonValue;
        technicalSpecs: Prisma.JsonValue;
        startedAt: Date | null;
        completedAt: Date | null;
    }>;
    private validateTransitionPermissions;
    createColumn(dto: CreateColumnDto, user: JwtPayload): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        sortOrder: number;
        type: import(".prisma/client").$Enums.ProductionColumnType;
        key: string;
        mappedStatus: import(".prisma/client").$Enums.OrderStatus | null;
        mappedStation: string | null;
        color: string | null;
        createdById: string | null;
    }>;
    updateColumn(id: string, dto: UpdateColumnDto, user: JwtPayload): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        sortOrder: number;
        type: import(".prisma/client").$Enums.ProductionColumnType;
        key: string;
        mappedStatus: import(".prisma/client").$Enums.OrderStatus | null;
        mappedStation: string | null;
        color: string | null;
        createdById: string | null;
    }>;
    reorderColumns(columnOrders: Array<{
        id: string;
        sortOrder: number;
    }>, user: JwtPayload): Promise<{
        success: boolean;
        message: string;
    }>;
    archiveColumn(id: string, user: JwtPayload): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        sortOrder: number;
        type: import(".prisma/client").$Enums.ProductionColumnType;
        key: string;
        mappedStatus: import(".prisma/client").$Enums.OrderStatus | null;
        mappedStation: string | null;
        color: string | null;
        createdById: string | null;
    }>;
    private seedDefaultColumns;
}
