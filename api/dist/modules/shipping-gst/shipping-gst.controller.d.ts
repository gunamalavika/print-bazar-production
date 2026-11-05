import { ShippingGstService } from './shipping-gst.service';
import { UpdateShippingGstSettingsDto, CreateShippingZoneDto, UpdateShippingZoneDto, CalculateShippingAndTaxDto, UpdateProductShippingSettingsDto, BatchUpdateCategoryShippingSettingsDto } from './dto/shipping-gst.dto';
import { JwtPayload } from '../../common/types/roles';
export declare class ShippingGstController {
    private readonly shippingGstService;
    constructor(shippingGstService: ShippingGstService);
    calculateQuote(dto: CalculateShippingAndTaxDto): Promise<import("./shipping-gst.service").ShippingTaxCalculationResult>;
    getSettings(): Promise<import("./shipping-gst.service").ShippingGstSettingsRecord>;
    updateSettings(dto: UpdateShippingGstSettingsDto, user?: JwtPayload): Promise<import("./shipping-gst.service").ShippingGstSettingsRecord>;
    listZones(): Promise<import("./shipping-gst.service").ShippingZoneRecord[]>;
    createZone(dto: CreateShippingZoneDto, user?: JwtPayload): Promise<import("./shipping-gst.service").ShippingZoneRecord>;
    updateZone(id: string, dto: UpdateShippingZoneDto, user?: JwtPayload): Promise<import("./shipping-gst.service").ShippingZoneRecord>;
    deleteZone(id: string, user?: JwtPayload): Promise<{
        success: boolean;
        message: string;
    }>;
    listProductShippingSettings(): Promise<any[]>;
    batchUpdateCategoryShippingSettings(dto: BatchUpdateCategoryShippingSettingsDto, user?: JwtPayload): Promise<{
        updatedCount: number;
        message: string;
    }>;
    updateProductShippingSettings(id: string, dto: UpdateProductShippingSettingsDto, user?: JwtPayload): Promise<any>;
}
