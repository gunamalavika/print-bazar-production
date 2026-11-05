import { Response } from 'express';
import { PersonalizationTemplateService } from './personalization-template.service';
import { CreatePersonalizationTemplateDto, UpdatePersonalizationTemplateDto, PersonalizationPayload } from './personalization-template.dto';
import { PrismaService } from '../../prisma/prisma.service';
export declare class PersonalizationTemplateController {
    private readonly service;
    private readonly prisma;
    constructor(service: PersonalizationTemplateService, prisma: PrismaService);
    listAdminTemplates(search?: string, category?: string, isActive?: string): Promise<{
        productCount: number;
        sharedFieldsCount: number;
        perItemFieldsCount: number;
        _count: {
            products: number;
        };
        fields: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            sortOrder: number;
            code: string;
            inputType: string;
            isRequired: boolean;
            options: import("@prisma/client/runtime/library").JsonValue | null;
            scope: string;
            placeholder: string | null;
            helperText: string | null;
            defaultValue: string | null;
            validationRules: import("@prisma/client/runtime/library").JsonValue | null;
            templateId: string;
        }[];
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        category: string | null;
        code: string;
    }[]>;
    getAdminTemplate(id: string): Promise<{
        products: {
            id: string;
            name: string;
            isActive: boolean;
            slug: string;
            sku: string;
        }[];
        fields: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            sortOrder: number;
            code: string;
            inputType: string;
            isRequired: boolean;
            options: import("@prisma/client/runtime/library").JsonValue | null;
            scope: string;
            placeholder: string | null;
            helperText: string | null;
            defaultValue: string | null;
            validationRules: import("@prisma/client/runtime/library").JsonValue | null;
            templateId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        category: string | null;
        code: string;
    }>;
    createTemplate(dto: CreatePersonalizationTemplateDto, req: any): Promise<{
        fields: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            sortOrder: number;
            code: string;
            inputType: string;
            isRequired: boolean;
            options: import("@prisma/client/runtime/library").JsonValue | null;
            scope: string;
            placeholder: string | null;
            helperText: string | null;
            defaultValue: string | null;
            validationRules: import("@prisma/client/runtime/library").JsonValue | null;
            templateId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        category: string | null;
        code: string;
    }>;
    updateTemplate(id: string, dto: UpdatePersonalizationTemplateDto, req: any): Promise<({
        fields: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            sortOrder: number;
            code: string;
            inputType: string;
            isRequired: boolean;
            options: import("@prisma/client/runtime/library").JsonValue | null;
            scope: string;
            placeholder: string | null;
            helperText: string | null;
            defaultValue: string | null;
            validationRules: import("@prisma/client/runtime/library").JsonValue | null;
            templateId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        category: string | null;
        code: string;
    }) | null>;
    deleteTemplate(id: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        category: string | null;
        code: string;
    }>;
    duplicateTemplate(id: string, req: any, newName?: string): Promise<{
        fields: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            sortOrder: number;
            code: string;
            inputType: string;
            isRequired: boolean;
            options: import("@prisma/client/runtime/library").JsonValue | null;
            scope: string;
            placeholder: string | null;
            helperText: string | null;
            defaultValue: string | null;
            validationRules: import("@prisma/client/runtime/library").JsonValue | null;
            templateId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        category: string | null;
        code: string;
    }>;
    getPublicTemplate(id: string): Promise<{
        products: {
            id: string;
            name: string;
            isActive: boolean;
            slug: string;
            sku: string;
        }[];
        fields: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            sortOrder: number;
            code: string;
            inputType: string;
            isRequired: boolean;
            options: import("@prisma/client/runtime/library").JsonValue | null;
            scope: string;
            placeholder: string | null;
            helperText: string | null;
            defaultValue: string | null;
            validationRules: import("@prisma/client/runtime/library").JsonValue | null;
            templateId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        category: string | null;
        code: string;
    }>;
    validatePublicPayload(id: string, body: {
        quantity: number;
        payload: PersonalizationPayload;
        productConfigOverride?: any;
    }): Promise<{
        isValid: boolean;
        errors: string[];
        sanitized: PersonalizationPayload;
    }>;
    getItemPersonalizationRecords(orderId: string, itemId: string): Promise<{
        orderId: string;
        itemId: string;
        productName: string;
        sku: string;
        quantity: number;
        personalizationData: import("@prisma/client/runtime/library").JsonValue;
        records: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            itemIndex: number;
            orderItemId: string;
            variantCombination: import("@prisma/client/runtime/library").JsonValue | null;
            fieldValues: import("@prisma/client/runtime/library").JsonValue;
            sharedValues: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
    }>;
    exportItemPersonalizationCsv(orderId: string, itemId: string, res: Response): Promise<void>;
}
