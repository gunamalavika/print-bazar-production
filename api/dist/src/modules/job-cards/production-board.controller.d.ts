import { ProductionBoardService, BoardFiltersDto, TransitionJobDto, CreateColumnDto, UpdateColumnDto } from './production-board.service';
import { JwtPayload } from '../../common/types/roles';
export declare class ProductionBoardController {
    private readonly boardService;
    constructor(boardService: ProductionBoardService);
    getBoard(filters: BoardFiltersDto, user: JwtPayload): Promise<{
        columns: import("./production-board.service").KanbanColumnResponse[];
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
    transitionJob(id: string, dto: TransitionJobDto, user: JwtPayload): Promise<{
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
        operationSequence: import("@prisma/client/runtime/library").JsonValue;
        technicalSpecs: import("@prisma/client/runtime/library").JsonValue;
        startedAt: Date | null;
        completedAt: Date | null;
    }>;
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
    reorderColumns(columnOrders: Array<{
        id: string;
        sortOrder: number;
    }>, user: JwtPayload): Promise<{
        success: boolean;
        message: string;
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
}
