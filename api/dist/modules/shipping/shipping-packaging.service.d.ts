import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePackagingProfileDto, UpdatePackagingProfileDto } from './dto/shipping.dto';
export declare class ShippingPackagingService {
    private readonly prisma;
    private readonly auditService;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService);
    listProfiles(isActive?: boolean): Promise<{
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
    getProfile(id: string): Promise<{
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
    getDefaultProfile(): Promise<{
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
    } | null>;
    createProfile(dto: CreatePackagingProfileDto, actorId?: string): Promise<{
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
    updateProfile(id: string, dto: UpdatePackagingProfileDto, actorId?: string): Promise<{
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
    deleteProfile(id: string, actorId?: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
