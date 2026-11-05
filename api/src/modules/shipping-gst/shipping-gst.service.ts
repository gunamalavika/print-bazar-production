import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  UpdateShippingGstSettingsDto,
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
  ShippingCalculationItemDto,
} from './dto/shipping-gst.dto';

export interface ShippingGstSettingsRecord {
  id: string;
  baseShippingFee: number;
  gstRate: number;
  freeShippingThreshold: number;
  isFreeShippingEnabled: boolean;
  enableWeightCharges: boolean;
  baseWeightKg: number;
  weightRatePerKg: number;
  enableQuantityCharges: boolean;
  quantityStep: number;
  quantitySurchargePerStep: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingZoneRecord {
  id: string;
  zoneName: string;
  pincodePrefix: string | null;
  shippingCharge: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingTaxCalculationResult {
  subtotal: number;
  shippingFee: number;
  baseShippingFee: number;
  locationCharge: number;
  weightCharge: number;
  quantityCharge: number;
  totalWeightKg: number;
  totalQuantity: number;
  calculationBasis: string;
  isFreeShippingApplied: boolean;
  freeShippingThreshold: number;
  isFreeShippingEnabled: boolean;
  matchedZone: {
    id: string;
    zoneName: string;
    pincodePrefix: string | null;
    shippingCharge: number;
  } | null;
  gstRatePercent: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  deliveryMethod: string;
  grandTotal: number;
}

@Injectable()
export class ShippingGstService {
  private readonly logger = new Logger(ShippingGstService.name);
  private static readonly SETTING_ID = 'default';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get current persisted settings or initialize defaults once without overwriting existing data.
   */
  async getSettings(): Promise<ShippingGstSettingsRecord> {
    let setting = await this.prisma.shippingGstSetting.findUnique({
      where: { id: ShippingGstService.SETTING_ID },
    });

    if (!setting) {
      setting = await this.prisma.shippingGstSetting.create({
        data: {
          id: ShippingGstService.SETTING_ID,
          baseShippingFee: 150.0,
          gstRate: 18.0,
          freeShippingThreshold: 2000.0,
          isFreeShippingEnabled: true,
          enableWeightCharges: true,
          baseWeightKg: 1.0,
          weightRatePerKg: 50.0,
          enableQuantityCharges: true,
          quantityStep: 500,
          quantitySurchargePerStep: 30.0,
        } as any,
      });
    }

    return {
      id: setting.id,
      baseShippingFee: Number(setting.baseShippingFee ?? 150),
      gstRate: Number(setting.gstRate ?? 18),
      freeShippingThreshold: Number(setting.freeShippingThreshold ?? 2000),
      isFreeShippingEnabled: Boolean(setting.isFreeShippingEnabled),
      enableWeightCharges: Boolean((setting as any).enableWeightCharges ?? true),
      baseWeightKg: Number((setting as any).baseWeightKg ?? 1.0),
      weightRatePerKg: Number((setting as any).weightRatePerKg ?? 50.0),
      enableQuantityCharges: Boolean((setting as any).enableQuantityCharges ?? true),
      quantityStep: Number((setting as any).quantityStep ?? 500),
      quantitySurchargePerStep: Number((setting as any).quantitySurchargePerStep ?? 30.0),
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }

  /**
   * Update core rates, weight-wise, and quantity-wise parameters
   */
  async updateSettings(
    dto: UpdateShippingGstSettingsDto,
    actorId?: string,
  ): Promise<ShippingGstSettingsRecord> {
    const current = await this.getSettings();

    const dataToSave: any = {
      baseShippingFee: dto.baseShippingFee,
      gstRate: dto.gstRate,
      freeShippingThreshold: dto.freeShippingThreshold,
      isFreeShippingEnabled: dto.isFreeShippingEnabled,
      ...(dto.enableWeightCharges !== undefined ? { enableWeightCharges: dto.enableWeightCharges } : {}),
      ...(dto.baseWeightKg !== undefined ? { baseWeightKg: dto.baseWeightKg } : {}),
      ...(dto.weightRatePerKg !== undefined ? { weightRatePerKg: dto.weightRatePerKg } : {}),
      ...(dto.enableQuantityCharges !== undefined ? { enableQuantityCharges: dto.enableQuantityCharges } : {}),
      ...(dto.quantityStep !== undefined ? { quantityStep: dto.quantityStep } : {}),
      ...(dto.quantitySurchargePerStep !== undefined ? { quantitySurchargePerStep: dto.quantitySurchargePerStep } : {}),
    };

    const updated = await this.prisma.shippingGstSetting.upsert({
      where: { id: ShippingGstService.SETTING_ID },
      create: {
        id: ShippingGstService.SETTING_ID,
        ...dataToSave,
      },
      update: dataToSave,
    });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_GST_SETTINGS_UPDATED',
      entity: 'ShippingGstSetting',
      entityId: ShippingGstService.SETTING_ID,
      previousState: current,
      newState: updated,
    });

    return {
      id: updated.id,
      baseShippingFee: Number(updated.baseShippingFee),
      gstRate: Number(updated.gstRate),
      freeShippingThreshold: Number(updated.freeShippingThreshold),
      isFreeShippingEnabled: Boolean(updated.isFreeShippingEnabled),
      enableWeightCharges: Boolean((updated as any).enableWeightCharges ?? true),
      baseWeightKg: Number((updated as any).baseWeightKg ?? 1.0),
      weightRatePerKg: Number((updated as any).weightRatePerKg ?? 50.0),
      enableQuantityCharges: Boolean((updated as any).enableQuantityCharges ?? true),
      quantityStep: Number((updated as any).quantityStep ?? 500),
      quantitySurchargePerStep: Number((updated as any).quantitySurchargePerStep ?? 30.0),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * List all configured shipping zones (Location-based)
   */
  async listZones(): Promise<ShippingZoneRecord[]> {
    const zones = await this.prisma.shippingZone.findMany({
      orderBy: [{ pincodePrefix: 'asc' }, { createdAt: 'desc' }],
    });

    return zones.map((z: any) => ({
      id: z.id,
      zoneName: z.zoneName,
      pincodePrefix: z.pincodePrefix,
      shippingCharge: Number(z.shippingCharge),
      isActive: Boolean(z.isActive),
      createdAt: z.createdAt,
      updatedAt: z.updatedAt,
    }));
  }

  /**
   * Create a new regional pincode zone rate
   */
  async createZone(
    dto: CreateShippingZoneDto,
    actorId?: string,
  ): Promise<ShippingZoneRecord> {
    const cleanPrefix = dto.pincodePrefix.trim();
    if (!/^[0-9]{1,6}$/.test(cleanPrefix)) {
      throw new BadRequestException('Pincode or prefix must be 1 to 6 digits');
    }

    const existing = await this.prisma.shippingZone.findUnique({
      where: { pincodePrefix: cleanPrefix },
    });
    if (existing) {
      throw new ConflictException(
        `A shipping zone for pincode prefix '${cleanPrefix}' already exists (${existing.zoneName})`,
      );
    }

    const created = await this.prisma.shippingZone.create({
      data: {
        zoneName: dto.zoneName.trim(),
        pincodePrefix: cleanPrefix,
        shippingCharge: dto.shippingCharge,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_ZONE_CREATED',
      entity: 'ShippingZone',
      entityId: created.id,
      newState: created,
    });

    return {
      id: created.id,
      zoneName: created.zoneName,
      pincodePrefix: created.pincodePrefix,
      shippingCharge: Number(created.shippingCharge),
      isActive: Boolean(created.isActive),
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  /**
   * Update an existing shipping zone
   */
  async updateZone(
    id: string,
    dto: UpdateShippingZoneDto,
    actorId?: string,
  ): Promise<ShippingZoneRecord> {
    const current = await this.prisma.shippingZone.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException(`Shipping zone with ID '${id}' not found`);
    }

    let cleanPrefix = current.pincodePrefix;
    if (dto.pincodePrefix !== undefined) {
      cleanPrefix = dto.pincodePrefix.trim();
      if (!/^[0-9]{1,6}$/.test(cleanPrefix)) {
        throw new BadRequestException('Pincode or prefix must be 1 to 6 digits');
      }

      if (cleanPrefix !== current.pincodePrefix) {
        const existing = await this.prisma.shippingZone.findUnique({
          where: { pincodePrefix: cleanPrefix },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `A shipping zone for pincode prefix '${cleanPrefix}' already exists (${existing.zoneName})`,
          );
        }
      }
    }

    const updated = await this.prisma.shippingZone.update({
      where: { id },
      data: {
        ...(dto.zoneName !== undefined ? { zoneName: dto.zoneName.trim() } : {}),
        pincodePrefix: cleanPrefix,
        ...(dto.shippingCharge !== undefined ? { shippingCharge: dto.shippingCharge } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_ZONE_UPDATED',
      entity: 'ShippingZone',
      entityId: id,
      previousState: current,
      newState: updated,
    });

    return {
      id: updated.id,
      zoneName: updated.zoneName,
      pincodePrefix: updated.pincodePrefix,
      shippingCharge: Number(updated.shippingCharge),
      isActive: Boolean(updated.isActive),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete a shipping zone
   */
  async deleteZone(id: string, actorId?: string): Promise<{ success: boolean; message: string }> {
    const current = await this.prisma.shippingZone.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException(`Shipping zone with ID '${id}' not found`);
    }

    await this.prisma.shippingZone.delete({ where: { id } });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_ZONE_DELETED',
      entity: 'ShippingZone',
      entityId: id,
      previousState: current,
    });

    return { success: true, message: `Zone '${current.zoneName}' deleted successfully` };
  }

  /**
   * List all products with their courier settings for product configuration administration
   */
  async listProductShippingSettings(): Promise<any[]> {
    const products = await this.prisma.product.findMany({
      select: {
        id: true,
        categoryId: true,
        name: true,
        slug: true,
        sku: true,
        basePrice: true,
        shippingChargeType: true,
        unitWeightGrams: true,
        courierCharge: true,
        perAdditionalQtyRate: true,
        freeShippingThreshold: true,
        quantityStep: true,
        quantityCourierSlabs: true,
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p: any) => ({
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      categoryName: p.category?.name || 'General',
      basePrice: Number(p.basePrice || 0),
      shippingChargeType: p.shippingChargeType || 'DEFAULT',
      unitWeightGrams: Number(p.unitWeightGrams || 0),
      courierCharge: Number(p.courierCharge || 100),
      perAdditionalQtyRate: Number(p.perAdditionalQtyRate || 0),
      freeShippingThreshold: Number(p.freeShippingThreshold || 1000),
      quantityStep: Number(p.quantityStep || 100),
      quantityCourierSlabs: Array.isArray(p.quantityCourierSlabs) ? p.quantityCourierSlabs : [],
    }));
  }

  /**
   * Update courier settings for a specific product
   */
  async updateProductShippingSettings(
    productId: string,
    dto: {
      shippingChargeType?: string;
      unitWeightGrams?: number;
      courierCharge?: number;
      perAdditionalQtyRate?: number;
      freeShippingThreshold?: number;
      quantityCourierSlabs?: any[];
    },
    actorId?: string,
  ): Promise<any> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(dto.shippingChargeType !== undefined ? { shippingChargeType: dto.shippingChargeType } : {}),
        ...(dto.unitWeightGrams !== undefined ? { unitWeightGrams: dto.unitWeightGrams } : {}),
        ...(dto.courierCharge !== undefined ? { courierCharge: dto.courierCharge } : {}),
        ...(dto.perAdditionalQtyRate !== undefined ? { perAdditionalQtyRate: dto.perAdditionalQtyRate } : {}),
        ...(dto.freeShippingThreshold !== undefined ? { freeShippingThreshold: dto.freeShippingThreshold } : {}),
        ...(dto.quantityCourierSlabs !== undefined ? { quantityCourierSlabs: dto.quantityCourierSlabs as any } : {}),
      } as any,
    });

    await this.auditService.log({
      actorId,
      action: 'PRODUCT_SHIPPING_SETTINGS_UPDATED',
      entity: 'Product',
      entityId: productId,
      previousState: product,
      newState: updated,
    });

    return updated;
  }

  /**
   * Bulk update courier settings across multiple products or an entire category
   */
  async batchUpdateCategoryShippingSettings(
    dto: {
      categoryId?: string;
      productIds?: string[];
      shippingChargeType?: string;
      unitWeightGrams?: number;
      courierCharge?: number;
      perAdditionalQtyRate?: number;
      freeShippingThreshold?: number;
      quantityCourierSlabs?: any[];
    },
    actorId?: string,
  ): Promise<{ updatedCount: number; message: string }> {
    const updateData: any = {
      ...(dto.shippingChargeType !== undefined ? { shippingChargeType: dto.shippingChargeType } : {}),
      ...(dto.unitWeightGrams !== undefined ? { unitWeightGrams: dto.unitWeightGrams } : {}),
      ...(dto.courierCharge !== undefined ? { courierCharge: dto.courierCharge } : {}),
      ...(dto.perAdditionalQtyRate !== undefined ? { perAdditionalQtyRate: dto.perAdditionalQtyRate } : {}),
      ...(dto.freeShippingThreshold !== undefined ? { freeShippingThreshold: dto.freeShippingThreshold } : {}),
      ...(dto.quantityCourierSlabs !== undefined ? { quantityCourierSlabs: dto.quantityCourierSlabs as any } : {}),
    };

    let targetProductIds: string[] = [];

    if (dto.productIds && dto.productIds.length > 0) {
      targetProductIds = dto.productIds;
    } else if (dto.categoryId) {
      const prods = await this.prisma.product.findMany({
        where: { categoryId: dto.categoryId },
        select: { id: true },
      });
      targetProductIds = prods.map((p) => p.id);
    } else {
      throw new BadRequestException('Either categoryId or productIds array must be provided');
    }

    if (targetProductIds.length === 0) {
      return { updatedCount: 0, message: 'No matching products found to update' };
    }

    const res = await this.prisma.product.updateMany({
      where: { id: { in: targetProductIds } },
      data: updateData,
    });

    await this.auditService.log({
      actorId,
      action: 'BATCH_PRODUCT_SHIPPING_SETTINGS_UPDATED',
      entity: 'Product',
      entityId: dto.categoryId || targetProductIds[0],
      newState: { targetProductIds, updateData, count: res.count },
    });

    return {
      updatedCount: res.count,
      message: `Successfully updated courier settings for ${res.count} product(s)`,
    };
  }

  /**
   * Authoritative server calculation supporting:
   * 1. Location-based courier charges (Pincode zone matching)
   * 2. Weight-wise courier charges (Base weight + weight rate per kg)
   * 3. Quantity-wise courier charges (Quantity step surcharge)
   * 4. Product-level configuration overrides (DEFAULT, FIXED, FREE, WEIGHT_BASED, QUANTITY_BASED)
   * 5. Free shipping threshold application
   * 6. Dynamic GST calculation
   */
  async calculateShippingAndTax(
    subtotal: number,
    postalCode?: string,
    deliveryMethod: 'COURIER' | 'STORE_PICKUP' = 'COURIER',
    isInterState: boolean = false,
    items?: ShippingCalculationItemDto[],
    totalQuantityOverride?: number,
    totalWeightKgOverride?: number,
  ): Promise<ShippingTaxCalculationResult> {
    const settings = await this.getSettings();
    const cleanSubtotal = Math.max(0, Number(subtotal) || 0);

    let locationCharge = settings.baseShippingFee;
    let matchedZone: ShippingTaxCalculationResult['matchedZone'] = null;
    let weightCharge = 0;
    let quantityCharge = 0;
    let totalWeightKg = 0;
    let totalQuantity = 0;
    const basisParts: string[] = [];
    let productMap = new Map<string, any>();

    // Calculate aggregated quantity & weight from items or overrides
    if (items && items.length > 0) {
      // Gather product info if productIds present
      const productIds = items.map((it) => it.productId).filter(Boolean) as string[];
      if (productIds.length > 0) {
        const dbProducts = await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            shippingChargeType: true,
            unitWeightGrams: true,
            courierCharge: true,
            perAdditionalQtyRate: true,
            freeShippingThreshold: true,
            quantityStep: true,
            quantityCourierSlabs: true,
          },
        });
        productMap = new Map(dbProducts.map((p: any) => [p.id, p]));
      }

      for (const item of items) {
        const qty = Math.max(1, Number(item.quantity) || 1);
        totalQuantity += qty;

        const dbProd = item.productId ? productMap.get(item.productId) : null;
        const unitWeight = item.weightGrams !== undefined && item.weightGrams > 0
          ? Number(item.weightGrams)
          : dbProd && dbProd.unitWeightGrams > 0
          ? Number(dbProd.unitWeightGrams)
          : 2.5; // Standard 2.5g default per paper card/print piece

        totalWeightKg += (qty * unitWeight) / 1000;
      }
    } else {
      totalQuantity = totalQuantityOverride !== undefined && totalQuantityOverride > 0
        ? totalQuantityOverride
        : 500;
      totalWeightKg = totalWeightKgOverride !== undefined && totalWeightKgOverride > 0
        ? totalWeightKgOverride
        : (totalQuantity * 2.5) / 1000;
    }

    totalWeightKg = Math.round(totalWeightKg * 100) / 100;

    let shippingFee = 0;

    if (deliveryMethod === 'STORE_PICKUP') {
      locationCharge = 0;
      weightCharge = 0;
      quantityCharge = 0;
      shippingFee = 0;
      basisParts.push('Plant Store Pickup (₹0)');
    } else {
      // 1. Location-based resolution
      const cleanPincode = (postalCode || '').trim().replace(/[^0-9]/g, '');
      if (cleanPincode.length > 0) {
        const activeZones = await this.prisma.shippingZone.findMany({
          where: { isActive: true },
        });

        const matchingZones = (activeZones || []).filter((z: any) =>
          cleanPincode.startsWith(z.pincodePrefix),
        );

        if (matchingZones.length > 0) {
          matchingZones.sort(
            (a: any, b: any) => b.pincodePrefix.length - a.pincodePrefix.length,
          );
          const bestMatch = matchingZones[0];
          locationCharge = Number(bestMatch.shippingCharge);
          matchedZone = {
            id: bestMatch.id,
            zoneName: bestMatch.zoneName,
            pincodePrefix: bestMatch.pincodePrefix,
            shippingCharge: Number(bestMatch.shippingCharge),
          };
          basisParts.push(`Zone: ${bestMatch.zoneName} (₹${locationCharge})`);
        } else {
          locationCharge = settings.baseShippingFee;
          basisParts.push(`Base Location Rate (₹${locationCharge})`);
        }
      } else {
        locationCharge = settings.baseShippingFee;
        basisParts.push(`Base Courier Rate (₹${locationCharge})`);
      }

      // 2. Weight-wise resolution
      if (settings.enableWeightCharges && totalWeightKg > settings.baseWeightKg) {
        const extraWeight = totalWeightKg - settings.baseWeightKg;
        const extraKgBilled = Math.ceil(extraWeight);
        weightCharge = extraKgBilled * settings.weightRatePerKg;
        basisParts.push(`Weight: ${totalWeightKg}kg (+₹${weightCharge})`);
      }

      // 3. Quantity-wise resolution
      if (settings.enableQuantityCharges && totalQuantity > settings.quantityStep) {
        const extraSteps = Math.floor((totalQuantity - 1) / settings.quantityStep);
        if (extraSteps > 0) {
          quantityCharge = extraSteps * settings.quantitySurchargePerStep;
          basisParts.push(`Quantity: ${totalQuantity} pcs (+₹${quantityCharge})`);
        }
      }

      // 4. Product-Level Custom Courier Evaluation (Quantity Slabs & Fixed Fees)
      let productCustomFeeTotal = 0;
      let hasProductCustomRules = false;

      if (items && items.length > 0) {
        for (const item of items) {
          const qty = Math.max(1, Number(item.quantity) || 1);
          const dbProd = item.productId ? productMap.get(item.productId) : null;
          if (!dbProd) continue;

          if (dbProd.shippingChargeType === 'FREE') {
            hasProductCustomRules = true;
            basisParts.push(`${item.productName || 'Item'}: Free Shipping (₹0)`);
          } else if (dbProd.shippingChargeType === 'FIXED') {
            hasProductCustomRules = true;
            const fee = Number(dbProd.courierCharge || 0);
            productCustomFeeTotal += fee;
            basisParts.push(`${item.productName || 'Item'}: Fixed Courier Fee (₹${fee})`);
          } else if (dbProd.shippingChargeType === 'QUANTITY_BASED') {
            const slabs = Array.isArray(dbProd.quantityCourierSlabs) ? dbProd.quantityCourierSlabs : [];
            if (slabs.length > 0) {
              hasProductCustomRules = true;
              const sorted = [...slabs].sort((a: any, b: any) => Number(a.minQty || 0) - Number(b.minQty || 0));
              let matchedSlab = sorted[0];
              for (const s of sorted) {
                if (qty >= Number(s.minQty || 0)) {
                  if (s.maxQty && qty > Number(s.maxQty)) {
                    continue;
                  }
                  matchedSlab = s;
                }
              }
              const slabCharge = Number(matchedSlab.charge || 0);
              productCustomFeeTotal += slabCharge;
              basisParts.push(`${item.productName || 'Item'}: ${qty} pcs Qty Slab (+₹${slabCharge})`);
            }
          }
        }
      }

      if (hasProductCustomRules && productCustomFeeTotal > 0) {
        shippingFee = productCustomFeeTotal;
      } else {
        shippingFee = Math.max(0, locationCharge + weightCharge + quantityCharge);
      }

      // 4. Automatic Free Shipping Threshold Evaluation
      if (
        settings.isFreeShippingEnabled &&
        settings.freeShippingThreshold > 0 &&
        cleanSubtotal >= settings.freeShippingThreshold
      ) {
        shippingFee = 0;
        basisParts.push(`Free Delivery Threshold Applied (₹0)`);
      }
    }

    const isFreeShippingApplied =
      deliveryMethod !== 'STORE_PICKUP' &&
      settings.isFreeShippingEnabled &&
      settings.freeShippingThreshold > 0 &&
      cleanSubtotal >= settings.freeShippingThreshold;

    // Dynamic GST Calculation
    const taxRate = settings.gstRate / 100;
    const gstAmount = Math.round(cleanSubtotal * taxRate * 100) / 100;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = gstAmount;
    } else {
      cgst = Math.round((gstAmount / 2) * 100) / 100;
      sgst = Math.round((gstAmount - cgst) * 100) / 100;
    }

    const grandTotal = Math.round((cleanSubtotal + gstAmount + shippingFee) * 100) / 100;

    return {
      subtotal: cleanSubtotal,
      shippingFee,
      baseShippingFee: settings.baseShippingFee,
      locationCharge,
      weightCharge,
      quantityCharge,
      totalWeightKg,
      totalQuantity,
      calculationBasis: basisParts.join(' • '),
      isFreeShippingApplied,
      freeShippingThreshold: settings.freeShippingThreshold,
      isFreeShippingEnabled: settings.isFreeShippingEnabled,
      matchedZone,
      gstRatePercent: settings.gstRate,
      gstAmount,
      cgst,
      sgst,
      igst,
      deliveryMethod,
      grandTotal,
    };
  }
}
