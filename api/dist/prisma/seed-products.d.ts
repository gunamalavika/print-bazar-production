import { PrismaClient } from '@prisma/client';
export declare const SEED_PRODUCT_SKUS: readonly ["SEED-BC-001", "SEED-FLY-002", "SEED-BRO-003", "SEED-MUG-004", "SEED-LBL-005"];
export type SeedProductSku = (typeof SEED_PRODUCT_SKUS)[number];
export interface SeedProductDefinition {
    sku: SeedProductSku;
    slug: string;
    name: string;
    categorySlug: string;
    categoryName: string;
    description: string;
    defaultSize?: string;
    basePrice: number;
    minQuantity: number;
    maxQuantity: number;
    quantityStep: number;
    productionDays: number;
    artworkRequirement: 'REQUIRED' | 'OPTIONAL' | 'DISABLED';
    minimumArtworkMegapixels?: number;
    designServiceRequirement: 'REQUIRED' | 'OPTIONAL' | 'DISABLED';
    designServicePrice?: number;
    designServiceFee?: number;
    tags: string[];
    images: Array<{
        url: string;
        altText: string;
        isPrimary?: boolean;
        sortOrder: number;
    }>;
    optionGroups: Array<{
        name: string;
        code: string;
        inputType: string;
        description?: string;
        isRequired: boolean;
        sortOrder: number;
        options: Array<{
            label: string;
            value: string;
            isDefault?: boolean;
            sortOrder: number;
            fileCount?: number;
            fileSlotLabels?: string[];
            minMegapixels?: number;
        }>;
    }>;
    configurationRules: Array<{
        name: string;
        conditionGroupCode: string;
        conditionOperator: string;
        conditionOptionValue: string;
        actionType: string;
        targetGroupCode?: string;
        targetOptionValue?: string;
        actionPayload?: any;
    }>;
    pricingMatrix: Array<{
        combination: Record<string, string>;
        tiers: Array<{
            quantity: number;
            unitPrice: number;
        }>;
    }>;
}
export declare const SEED_PRODUCTS_DATA: SeedProductDefinition[];
export declare function seedDeterministicProducts(prismaClient?: PrismaClient): Promise<any[]>;
export declare function cleanupSeedProducts(prismaClient?: PrismaClient): Promise<number>;
