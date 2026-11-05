import { PrismaService } from '../../prisma/prisma.service';
import { CreatePersonalizationTemplateDto, UpdatePersonalizationTemplateDto, PersonalizationPayload } from './personalization-template.dto';
import { Prisma } from '@prisma/client';
export declare class PersonalizationTemplateService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listTemplates(filters?: {
        search?: string;
        category?: string;
        isActive?: boolean;
    }): Promise<{
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
            options: Prisma.JsonValue | null;
            scope: string;
            placeholder: string | null;
            helperText: string | null;
            defaultValue: string | null;
            validationRules: Prisma.JsonValue | null;
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
    getTemplateById(id: string): Promise<{
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
            options: Prisma.JsonValue | null;
            scope: string;
            placeholder: string | null;
            helperText: string | null;
            defaultValue: string | null;
            validationRules: Prisma.JsonValue | null;
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
    getTemplateByCode(code: string): Promise<{
        fields: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            sortOrder: number;
            code: string;
            inputType: string;
            isRequired: boolean;
            options: Prisma.JsonValue | null;
            scope: string;
            placeholder: string | null;
            helperText: string | null;
            defaultValue: string | null;
            validationRules: Prisma.JsonValue | null;
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
    createTemplate(dto: CreatePersonalizationTemplateDto, actorId?: string): Promise<{
        fields: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            sortOrder: number;
            code: string;
            inputType: string;
            isRequired: boolean;
            options: Prisma.JsonValue | null;
            scope: string;
            placeholder: string | null;
            helperText: string | null;
            defaultValue: string | null;
            validationRules: Prisma.JsonValue | null;
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
    updateTemplate(id: string, dto: UpdatePersonalizationTemplateDto, actorId?: string): Promise<({
        fields: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            sortOrder: number;
            code: string;
            inputType: string;
            isRequired: boolean;
            options: Prisma.JsonValue | null;
            scope: string;
            placeholder: string | null;
            helperText: string | null;
            defaultValue: string | null;
            validationRules: Prisma.JsonValue | null;
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
    deleteTemplate(id: string, actorId?: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        description: string | null;
        category: string | null;
        code: string;
    }>;
    duplicateTemplate(id: string, newName?: string, actorId?: string): Promise<{
        fields: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            sortOrder: number;
            code: string;
            inputType: string;
            isRequired: boolean;
            options: Prisma.JsonValue | null;
            scope: string;
            placeholder: string | null;
            helperText: string | null;
            defaultValue: string | null;
            validationRules: Prisma.JsonValue | null;
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
    validatePersonalization(template: {
        id: string;
        name: string;
        code: string;
        fields: Array<{
            id: string;
            name: string;
            code: string;
            inputType: string;
            scope: string;
            isRequired: boolean;
            validationRules?: any;
            options?: any;
        }>;
    }, quantity: number, payload: PersonalizationPayload | null | undefined, productOverrideConfig?: any): {
        isValid: boolean;
        errors: string[];
        sanitized: PersonalizationPayload;
    };
    private validateFieldValue;
    generatePersonalizationCsv(order: {
        orderNumber: string;
    }, orderItem: {
        productName: string;
        sku: string;
        quantity: number;
        specifications?: any;
        personalizationData?: any;
    }, records: Array<{
        itemIndex: number;
        variantCombination?: any;
        fieldValues: any;
        sharedValues?: any;
        status: string;
    }>): string;
}
