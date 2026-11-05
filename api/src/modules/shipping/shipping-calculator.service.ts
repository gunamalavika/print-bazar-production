import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingConfigService } from './shipping-config.service';
import { ShippingPackagingService } from './shipping-packaging.service';
import { ShippingCalculationRequestDto } from './dto/shipping.dto';

export interface AuthoritativeShippingBreakdown {
  status: 'CALCULATED' | 'FREE' | 'STORE_PICKUP' | 'NON_SERVICEABLE' | 'PENDING';
  destinationPincode: string;
  isServiceable: boolean;
  serviceabilityMessage?: string;
  pincodeLocation?: {
    city: string;
    district?: string;
    state: string;
    estimatedDays?: string;
  } | null;
  zone: {
    id: string;
    code: string;
    name: string;
    estimatedDeliveryDays?: string;
  } | null;
  pricingModelUsed: string;
  matchedBracketLabel?: string;
  unitWeightGrams: number;
  productWeightGrams: number;
  packaging: {
    id?: string;
    name: string;
    weightGrams: number;
    packagingCharge: number;
  };
  actualWeightGrams: number;
  volumetricWeightGrams: number | null;
  billableWeightGrams: number;
  rateCard: {
    id?: string;
    name: string;
    additionalWeightPerKg?: number;
    slabs?: Array<{
      id: string;
      minWeightGrams: number;
      maxWeightGrams: number;
      rate: number;
    }>;
  } | null;
  matchedSlab: {
    id?: string;
    minWeightGrams: number;
    maxWeightGrams: number;
    rate: number;
  } | null;
  baseShippingCharge: number;
  additionalWeightCharge: number;
  zoneSurcharge: number;
  pincodeSurcharge: number;
  packagingCharge: number;
  isFreeShippingApplied: boolean;
  freeShippingThreshold: number;
  finalShippingAmount: number;
  deliveryMethod: string;
  calculationBasis: string;
}

@Injectable()
export class ShippingCalculatorService {
  private readonly logger = new Logger(ShippingCalculatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ShippingConfigService,
    private readonly packagingService: ShippingPackagingService,
  ) {}

  async calculateShipping(dto: ShippingCalculationRequestDto): Promise<AuthoritativeShippingBreakdown> {
    const config = await this.configService.getConfiguration();
    const deliveryMethod = dto.deliveryMethod || 'COURIER';
    const cleanPin = (dto.destinationPincode || '').trim().replace(/[^0-9]/g, '');

    // 1. Store Pickup fast path
    if (deliveryMethod === 'STORE_PICKUP') {
      return {
        status: 'STORE_PICKUP',
        destinationPincode: cleanPin,
        isServiceable: true,
        zone: null,
        pricingModelUsed: 'FIXED',
        unitWeightGrams: 0,
        productWeightGrams: 0,
        packaging: { name: 'Customer Plant Pickup', weightGrams: 0, packagingCharge: 0 },
        actualWeightGrams: 0,
        volumetricWeightGrams: null,
        billableWeightGrams: 0,
        rateCard: null,
        matchedSlab: null,
        baseShippingCharge: 0,
        additionalWeightCharge: 0,
        zoneSurcharge: 0,
        pincodeSurcharge: 0,
        packagingCharge: 0,
        isFreeShippingApplied: true,
        freeShippingThreshold: Number(config.freeShippingThreshold),
        finalShippingAmount: 0,
        deliveryMethod: 'STORE_PICKUP',
        calculationBasis: 'Plant Store Pickup (₹0)',
      };
    }

    // 2. Resolve Product & Weight Configuration (supports single productId OR multi-item cart array)
    const resolveSingleProductWeight = (prod: any, qty: number, customWeight?: number) => {
      const cleanQty = Math.max(1, Number(qty) || 1);
      if (customWeight !== undefined && customWeight > 0) {
        const uW = Number(customWeight);
        return {
          productWeightGrams: Math.round(cleanQty * uW * 100) / 100,
          unitWeightGrams: uW,
          pricingModelUsed: prod?.pricingModel || 'MATRIX',
          matchedBracketLabel: `${cleanQty} pcs @ ${uW}g/pc`,
        };
      }
      if (!prod) {
        const uW = 2.0;
        return {
          productWeightGrams: Math.round(cleanQty * uW * 100) / 100,
          unitWeightGrams: uW,
          pricingModelUsed: 'MATRIX',
          matchedBracketLabel: `${cleanQty} pcs @ ${uW}g/pc`,
        };
      }

      const model = prod.pricingModel || 'MATRIX';
      if (model === 'BULK_RANGE') {
        const bulkWeights = Array.isArray(prod.bulkTierWeights) ? prod.bulkTierWeights : [];
        const sorted = [...bulkWeights].sort((a: any, b: any) => Number(a.minQty || 0) - Number(b.minQty || 0));

        const exactMatch = sorted.find((b: any) => Number(b.minQty) === cleanQty);
        if (exactMatch && (Number(exactMatch.totalProductWeightGrams) > 0 || Number(exactMatch.unitWeightGrams) > 0)) {
          const totalW = Number(exactMatch.totalProductWeightGrams ?? exactMatch.unitWeightGrams);
          return {
            productWeightGrams: Math.round(totalW * 100) / 100,
            unitWeightGrams: Math.round((totalW / cleanQty) * 1000) / 1000,
            pricingModelUsed: model,
            matchedBracketLabel: `${exactMatch.minQty} pcs (${Math.round(totalW * 100) / 100}g total)`,
          };
        }

        const bracketMatch = sorted.find((b: any) => {
          const minQ = Number(b.minQty || 0);
          const maxQ = b.maxQty ? Number(b.maxQty) : Infinity;
          return cleanQty >= minQ && cleanQty <= maxQ;
        }) || (sorted.length > 0 ? sorted[sorted.length - 1] : null);

        if (bracketMatch && (Number(bracketMatch.totalProductWeightGrams) > 0 || Number(bracketMatch.unitWeightGrams) > 0)) {
          const baseTierWeight = Number(bracketMatch.totalProductWeightGrams ?? bracketMatch.unitWeightGrams);
          const baseTierQty = Math.max(1, Number(bracketMatch.minQty || 1));
          const effectiveUnitRate = baseTierWeight / baseTierQty;
          const pW = Math.round(cleanQty * effectiveUnitRate * 100) / 100;
          return {
            productWeightGrams: pW,
            unitWeightGrams: Math.round(effectiveUnitRate * 1000) / 1000,
            pricingModelUsed: model,
            matchedBracketLabel: `${bracketMatch.minQty} pcs tier (${pW}g scaled)`,
          };
        }
      }

      const uW = Number(prod.unitWeightGrams) > 0 ? Number(prod.unitWeightGrams) : 2.0;
      return {
        productWeightGrams: Math.round(cleanQty * uW * 100) / 100,
        unitWeightGrams: uW,
        pricingModelUsed: model,
        matchedBracketLabel: `${cleanQty} pcs @ ${uW}g/pc`,
      };
    };

    let product: any = null;
    let productWeightGrams = 0;
    let unitWeightGrams = 2.0;
    let pricingModelUsed = 'MATRIX';
    let matchedBracketLabel: string | undefined = undefined;

    if (Array.isArray(dto.items) && dto.items.length > 0) {
      const prodIds = dto.items.map((it) => it.productId).filter(Boolean) as string[];
      const dbProds = prodIds.length > 0
        ? await this.prisma.product.findMany({
            where: { id: { in: prodIds } },
            include: { packagingProfile: true },
          })
        : [];
      const prodMap = new Map(dbProds.map((p) => [p.id, p]));
      if (dbProds.length > 0) {
        product = dbProds[0];
      }

      let totalQty = 0;
      const labels: string[] = [];
      for (const item of dto.items) {
        const dbP = item.productId ? prodMap.get(item.productId) : null;
        const itemQty = Math.max(1, Number(item.quantity) || 1);
        totalQty += itemQty;
        const resolved = resolveSingleProductWeight(dbP, itemQty, item.weightGrams);
        productWeightGrams += resolved.productWeightGrams;
        pricingModelUsed = resolved.pricingModelUsed;
        if (resolved.matchedBracketLabel) labels.push(resolved.matchedBracketLabel);
      }
      productWeightGrams = Math.round(productWeightGrams * 100) / 100;
      unitWeightGrams = totalQty > 0 ? Math.round((productWeightGrams / totalQty) * 1000) / 1000 : 2.0;
      matchedBracketLabel = labels.join(' + ');
    } else {
      if (dto.productId) {
        product = await this.prisma.product.findUnique({
          where: { id: dto.productId },
          include: { packagingProfile: true },
        });
      }
      const requestedQty = Math.max(1, Number(dto.quantity) || 1);
      const resolved = resolveSingleProductWeight(product, requestedQty, dto.customUnitWeightGrams);
      productWeightGrams = resolved.productWeightGrams;
      unitWeightGrams = resolved.unitWeightGrams;
      pricingModelUsed = resolved.pricingModelUsed;
      matchedBracketLabel = resolved.matchedBracketLabel;
    }

    // 3. Resolve Packaging Profile
    let packagingProfile: any = null;
    if (dto.packagingProfileId) {
      packagingProfile = await this.packagingService.getProfile(dto.packagingProfileId).catch(() => null);
    } else if (product?.packagingProfile) {
      packagingProfile = {
        ...product.packagingProfile,
        packagingCharge: Number(product.packagingProfile.packagingCharge),
      };
    } else {
      packagingProfile = await this.packagingService.getDefaultProfile();
    }

    const packagingWeightGrams = packagingProfile
      ? Number(packagingProfile.weightGrams)
      : Number(config.defaultPackagingWeightGrams || 200);
    const packagingCharge = packagingProfile ? Number(packagingProfile.packagingCharge || 0) : 0;

    // Actual Shipment Weight = Product Weight + Packaging Weight (added once per shipment)
    const actualWeightGrams = Math.round((productWeightGrams + packagingWeightGrams) * 100) / 100;

    // 4. Volumetric Weight Calculation
    let volumetricWeightGrams: number | null = null;
    if (config.isVolumetricEnabled && packagingProfile?.lengthMm && packagingProfile?.widthMm && packagingProfile?.heightMm) {
      const divisor = Number(config.volumetricDivisor || 5000);
      const lCm = packagingProfile.lengthMm / 10;
      const wCm = packagingProfile.widthMm / 10;
      const hCm = packagingProfile.heightMm / 10;
      // Formula: (L cm * W cm * H cm) / Divisor = Volumetric Weight in Kg
      const volKg = (lCm * wCm * hCm) / divisor;
      volumetricWeightGrams = Math.round(volKg * 1000 * 100) / 100;
    }

    // Billable Weight = Maximum of actual and volumetric
    const billableWeightGrams = volumetricWeightGrams
      ? Math.max(actualWeightGrams, volumetricWeightGrams)
      : actualWeightGrams;

    // 5. Destination Pincode & Delivery Zone Resolution
    if (!cleanPin || cleanPin.length !== 6) {
      return {
        status: 'PENDING',
        destinationPincode: cleanPin,
        isServiceable: false,
        serviceabilityMessage: 'Please enter a valid 6-digit Indian PIN code to calculate shipping',
        zone: null,
        pricingModelUsed,
        matchedBracketLabel,
        unitWeightGrams,
        productWeightGrams,
        packaging: {
          id: packagingProfile?.id,
          name: packagingProfile?.name || 'Standard Carton',
          weightGrams: packagingWeightGrams,
          packagingCharge,
        },
        actualWeightGrams,
        volumetricWeightGrams,
        billableWeightGrams,
        rateCard: null,
        matchedSlab: null,
        baseShippingCharge: 0,
        additionalWeightCharge: 0,
        zoneSurcharge: 0,
        pincodeSurcharge: 0,
        packagingCharge,
        isFreeShippingApplied: false,
        freeShippingThreshold: Number(config.freeShippingThreshold),
        finalShippingAmount: 0,
        deliveryMethod: 'COURIER',
        calculationBasis: 'Pincode required for authoritative courier quote',
      };
    }

    let resolvedZone: any = null;
    let pincodeSurcharge = 0;
    let isServiceable = true;
    let serviceabilityMessage: string | undefined = undefined;

    // Direct 6-digit pincode database lookup
    const pinRecord = await this.prisma.shippingPincode.findUnique({
      where: { pincode: cleanPin },
      include: { zone: true },
    });

    const pincodeLocation = pinRecord
      ? {
          city: pinRecord.city,
          district: pinRecord.district || undefined,
          state: pinRecord.state,
          estimatedDays: pinRecord.estimatedDays || pinRecord.zone?.estimatedDeliveryDays || undefined,
        }
      : null;

    if (pinRecord) {
      if (!pinRecord.isServiceable) {
        return {
          status: 'NON_SERVICEABLE',
          destinationPincode: cleanPin,
          isServiceable: false,
          serviceabilityMessage: `PIN code ${cleanPin} (${pinRecord.city}, ${pinRecord.state}) is currently non-serviceable for courier delivery.`,
          pincodeLocation,
          zone: {
            id: pinRecord.zone.id,
            code: pinRecord.zone.zoneCode || 'CUSTOM',
            name: pinRecord.zone.zoneName,
            estimatedDeliveryDays: pinRecord.zone.estimatedDeliveryDays || undefined,
          },
          pricingModelUsed,
          matchedBracketLabel,
          unitWeightGrams,
          productWeightGrams,
          packaging: {
            id: packagingProfile?.id,
            name: packagingProfile?.name || 'Standard Carton',
            weightGrams: packagingWeightGrams,
            packagingCharge,
          },
          actualWeightGrams,
          volumetricWeightGrams,
          billableWeightGrams,
          rateCard: null,
          matchedSlab: null,
          baseShippingCharge: 0,
          additionalWeightCharge: 0,
          zoneSurcharge: 0,
          pincodeSurcharge: 0,
          packagingCharge,
          isFreeShippingApplied: false,
          freeShippingThreshold: Number(config.freeShippingThreshold),
          finalShippingAmount: 0,
          deliveryMethod: 'COURIER',
          calculationBasis: 'PIN code not serviceable for delivery',
        };
      }
      resolvedZone = pinRecord.zone;
      pincodeSurcharge = Number(pinRecord.additionalSurcharge || 0);
    } else {
      // Zone fallback: longest prefix match, or zone with active Rate Card, or NATIONAL
      const allZones = await this.prisma.shippingZone.findMany({ where: { isActive: true } });
      const prefixMatches = allZones
        .filter((z) => z.pincodePrefix && cleanPin.startsWith(z.pincodePrefix))
        .sort((a, b) => (b.pincodePrefix?.length || 0) - (a.pincodePrefix?.length || 0));

      if (prefixMatches.length > 0) {
        resolvedZone = prefixMatches[0];
      } else {
        resolvedZone =
          allZones.find((z) => z.zoneCode === 'NATIONAL') ||
          allZones[0];
      }
    }

    if (!resolvedZone) {
      throw new BadRequestException('No active shipping zone configured for destination');
    }

    const zoneSurcharge = Number(resolvedZone.zoneSurcharge || 0);

    // 6. Rate Card & Slab Matching (Replicates /admin/shipping/rates)
    let rateCard = await this.prisma.shippingRateCard.findFirst({
      where: {
        zoneId: resolvedZone.id,
        isActive: true,
      },
      include: {
        slabs: { orderBy: { minWeightGrams: 'asc' } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    // Fallback to top active Rate Card if this zone has no dedicated Rate Card yet
    if (!rateCard || rateCard.slabs.length === 0) {
      rateCard = await this.prisma.shippingRateCard.findFirst({
        where: { isActive: true },
        include: {
          slabs: { orderBy: { minWeightGrams: 'asc' } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });
    }

    let baseShippingCharge = Number(resolvedZone.shippingCharge || 100);
    let additionalWeightCharge = 0;
    let matchedSlabInfo: AuthoritativeShippingBreakdown['matchedSlab'] = null;
    let rateCardInfo: AuthoritativeShippingBreakdown['rateCard'] = null;

    if (rateCard && rateCard.slabs.length > 0) {
      rateCardInfo = {
        id: rateCard.id,
        name: rateCard.name,
        additionalWeightPerKg: Number(rateCard.additionalWeightPerKg || 0),
        slabs: rateCard.slabs.map((s) => ({
          id: s.id,
          minWeightGrams: s.minWeightGrams,
          maxWeightGrams: s.maxWeightGrams,
          rate: Number(s.rate),
        })),
      };
      const slabs = rateCard.slabs;
      const highestSlab = slabs[slabs.length - 1];

      // Match slab where billableWeightGrams <= slab.maxWeightGrams
      const matchedSlab =
        slabs.find((s) => billableWeightGrams >= s.minWeightGrams && billableWeightGrams <= s.maxWeightGrams) ||
        slabs.find((s) => billableWeightGrams <= s.maxWeightGrams);

      if (matchedSlab) {
        baseShippingCharge = Number(matchedSlab.rate);
        matchedSlabInfo = {
          id: matchedSlab.id,
          minWeightGrams: matchedSlab.minWeightGrams,
          maxWeightGrams: matchedSlab.maxWeightGrams,
          rate: Number(matchedSlab.rate),
        };
      } else {
        // Exceeds highest slab -> calculate additional weight per kg
        baseShippingCharge = Number(highestSlab.rate);
        matchedSlabInfo = {
          id: highestSlab.id,
          minWeightGrams: highestSlab.minWeightGrams,
          maxWeightGrams: highestSlab.maxWeightGrams,
          rate: Number(highestSlab.rate),
        };

        const extraGrams = billableWeightGrams - highestSlab.maxWeightGrams;
        const extraKg = Math.ceil(extraGrams / 1000);
        additionalWeightCharge = Math.round(extraKg * Number(rateCard.additionalWeightPerKg || 25) * 100) / 100;
      }
    }

    // Subtotal before free shipping check
    let calculatedShipping =
      baseShippingCharge + additionalWeightCharge + zoneSurcharge + pincodeSurcharge + packagingCharge;

    // Only enforce global minShippingCharge if no rate card slab matched
    if (!matchedSlabInfo) {
      const minCharge = Number(config.minShippingCharge || 40);
      calculatedShipping = Math.max(minCharge, calculatedShipping);
    }

    // 7. Free Shipping Threshold Check
    const orderSubtotal = Math.max(0, Number(dto.orderSubtotal || 0));
    const freeThreshold = Number(config.freeShippingThreshold || 2000);
    const isFreeEligible = config.isFreeShippingEnabled && freeThreshold > 0 && orderSubtotal >= freeThreshold;

    let finalShippingAmount = isFreeEligible ? 0 : calculatedShipping;
    finalShippingAmount = Math.round(finalShippingAmount * 100) / 100;

    const basisParts = [
      `Zone: ${resolvedZone.zoneName}`,
      matchedSlabInfo
        ? `Slab: ${matchedSlabInfo.minWeightGrams}g–${matchedSlabInfo.maxWeightGrams >= 1000 ? `${(matchedSlabInfo.maxWeightGrams / 1000).toFixed(1)}kg` : `${matchedSlabInfo.maxWeightGrams}g`} (₹${baseShippingCharge})`
        : `Base Rate (₹${baseShippingCharge})`,
    ];
    if (additionalWeightCharge > 0) {
      basisParts.push(`Extra Weight: +₹${additionalWeightCharge}`);
    }
    if (zoneSurcharge > 0) {
      basisParts.push(`Zone Surcharge: +₹${zoneSurcharge}`);
    }
    if (pincodeSurcharge > 0) {
      basisParts.push(`Pincode Surcharge: +₹${pincodeSurcharge}`);
    }
    if (packagingCharge > 0) {
      basisParts.push(`Packaging: +₹${packagingCharge}`);
    }
    if (isFreeEligible) {
      basisParts.push(`Free Shipping Applied (Subtotal ≥ ₹${freeThreshold})`);
    }

    return {
      status: isFreeEligible ? 'FREE' : 'CALCULATED',
      destinationPincode: cleanPin,
      isServiceable: true,
      serviceabilityMessage: pinRecord ? `Serviceable delivery to ${pinRecord.city}, ${pinRecord.state}` : `Standard courier coverage for PIN ${cleanPin}`,
      pincodeLocation,
      zone: {
        id: resolvedZone.id,
        code: resolvedZone.zoneCode || 'CUSTOM',
        name: resolvedZone.zoneName,
        estimatedDeliveryDays: resolvedZone.estimatedDeliveryDays || undefined,
      },
      pricingModelUsed,
      matchedBracketLabel,
      unitWeightGrams,
      productWeightGrams,
      packaging: {
        id: packagingProfile?.id,
        name: packagingProfile?.name || 'Standard Carton',
        weightGrams: packagingWeightGrams,
        packagingCharge,
      },
      actualWeightGrams,
      volumetricWeightGrams,
      billableWeightGrams,
      rateCard: rateCardInfo,
      matchedSlab: matchedSlabInfo,
      baseShippingCharge,
      additionalWeightCharge,
      zoneSurcharge,
      pincodeSurcharge,
      packagingCharge,
      isFreeShippingApplied: isFreeEligible,
      freeShippingThreshold: freeThreshold,
      finalShippingAmount,
      deliveryMethod: 'COURIER',
      calculationBasis: basisParts.join(' • '),
    };
  }

  async checkServiceability(pincode: string) {
    const cleanPin = pincode.trim().replace(/[^0-9]/g, '');
    if (cleanPin.length !== 6) {
      throw new BadRequestException('Pincode must be 6 digits');
    }

    const pinRecord = await this.prisma.shippingPincode.findUnique({
      where: { pincode: cleanPin },
      include: {
        zone: {
          select: {
            id: true,
            zoneCode: true,
            zoneName: true,
            estimatedDeliveryDays: true,
          },
        },
      },
    });

    if (pinRecord) {
      return {
        pincode: cleanPin,
        city: pinRecord.city,
        state: pinRecord.state,
        zone: pinRecord.zone,
        isServiceable: pinRecord.isServiceable,
        estimatedDays: pinRecord.estimatedDays || pinRecord.zone.estimatedDeliveryDays || '2-4 business days',
        additionalSurcharge: Number(pinRecord.additionalSurcharge || 0),
        message: pinRecord.isServiceable
          ? `Delivery available to ${pinRecord.city}, ${pinRecord.state}`
          : `Delivery not currently available to ${pinRecord.city}, ${pinRecord.state}`,
      };
    }

    // Default pan-India serviceability fallback
    return {
      pincode: cleanPin,
      city: 'India',
      state: '',
      zone: {
        id: 'national',
        zoneCode: 'NATIONAL',
        zoneName: 'National Delivery',
        estimatedDeliveryDays: '3-5 business days',
      },
      isServiceable: true,
      estimatedDays: '3-5 business days',
      additionalSurcharge: 0,
      message: `Standard national courier coverage available for ${cleanPin}`,
    };
  }
}
