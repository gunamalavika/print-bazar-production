"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ShippingCalculatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingCalculatorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const shipping_config_service_1 = require("./shipping-config.service");
const shipping_packaging_service_1 = require("./shipping-packaging.service");
let ShippingCalculatorService = ShippingCalculatorService_1 = class ShippingCalculatorService {
    prisma;
    configService;
    packagingService;
    logger = new common_1.Logger(ShippingCalculatorService_1.name);
    constructor(prisma, configService, packagingService) {
        this.prisma = prisma;
        this.configService = configService;
        this.packagingService = packagingService;
    }
    async calculateShipping(dto) {
        const config = await this.configService.getConfiguration();
        const deliveryMethod = dto.deliveryMethod || 'COURIER';
        const cleanPin = (dto.destinationPincode || '').trim().replace(/[^0-9]/g, '');
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
        const resolveSingleProductWeight = (prod, qty, customWeight) => {
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
                const sorted = [...bulkWeights].sort((a, b) => Number(a.minQty || 0) - Number(b.minQty || 0));
                const exactMatch = sorted.find((b) => Number(b.minQty) === cleanQty);
                if (exactMatch && (Number(exactMatch.totalProductWeightGrams) > 0 || Number(exactMatch.unitWeightGrams) > 0)) {
                    const totalW = Number(exactMatch.totalProductWeightGrams ?? exactMatch.unitWeightGrams);
                    return {
                        productWeightGrams: Math.round(totalW * 100) / 100,
                        unitWeightGrams: Math.round((totalW / cleanQty) * 1000) / 1000,
                        pricingModelUsed: model,
                        matchedBracketLabel: `${exactMatch.minQty} pcs (${Math.round(totalW * 100) / 100}g total)`,
                    };
                }
                const bracketMatch = sorted.find((b) => {
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
        let product = null;
        let productWeightGrams = 0;
        let unitWeightGrams = 2.0;
        let pricingModelUsed = 'MATRIX';
        let matchedBracketLabel = undefined;
        if (Array.isArray(dto.items) && dto.items.length > 0) {
            const prodIds = dto.items.map((it) => it.productId).filter(Boolean);
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
            const labels = [];
            for (const item of dto.items) {
                const dbP = item.productId ? prodMap.get(item.productId) : null;
                const itemQty = Math.max(1, Number(item.quantity) || 1);
                totalQty += itemQty;
                const resolved = resolveSingleProductWeight(dbP, itemQty, item.weightGrams);
                productWeightGrams += resolved.productWeightGrams;
                pricingModelUsed = resolved.pricingModelUsed;
                if (resolved.matchedBracketLabel)
                    labels.push(resolved.matchedBracketLabel);
            }
            productWeightGrams = Math.round(productWeightGrams * 100) / 100;
            unitWeightGrams = totalQty > 0 ? Math.round((productWeightGrams / totalQty) * 1000) / 1000 : 2.0;
            matchedBracketLabel = labels.join(' + ');
        }
        else {
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
        let packagingProfile = null;
        if (dto.packagingProfileId) {
            packagingProfile = await this.packagingService.getProfile(dto.packagingProfileId).catch(() => null);
        }
        else if (product?.packagingProfile) {
            packagingProfile = {
                ...product.packagingProfile,
                packagingCharge: Number(product.packagingProfile.packagingCharge),
            };
        }
        else {
            packagingProfile = await this.packagingService.getDefaultProfile();
        }
        const packagingWeightGrams = packagingProfile
            ? Number(packagingProfile.weightGrams)
            : Number(config.defaultPackagingWeightGrams || 200);
        const packagingCharge = packagingProfile ? Number(packagingProfile.packagingCharge || 0) : 0;
        const actualWeightGrams = Math.round((productWeightGrams + packagingWeightGrams) * 100) / 100;
        let volumetricWeightGrams = null;
        if (config.isVolumetricEnabled && packagingProfile?.lengthMm && packagingProfile?.widthMm && packagingProfile?.heightMm) {
            const divisor = Number(config.volumetricDivisor || 5000);
            const lCm = packagingProfile.lengthMm / 10;
            const wCm = packagingProfile.widthMm / 10;
            const hCm = packagingProfile.heightMm / 10;
            const volKg = (lCm * wCm * hCm) / divisor;
            volumetricWeightGrams = Math.round(volKg * 1000 * 100) / 100;
        }
        const billableWeightGrams = volumetricWeightGrams
            ? Math.max(actualWeightGrams, volumetricWeightGrams)
            : actualWeightGrams;
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
        let resolvedZone = null;
        let pincodeSurcharge = 0;
        let isServiceable = true;
        let serviceabilityMessage = undefined;
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
        }
        else {
            const allZones = await this.prisma.shippingZone.findMany({ where: { isActive: true } });
            const prefixMatches = allZones
                .filter((z) => z.pincodePrefix && cleanPin.startsWith(z.pincodePrefix))
                .sort((a, b) => (b.pincodePrefix?.length || 0) - (a.pincodePrefix?.length || 0));
            if (prefixMatches.length > 0) {
                resolvedZone = prefixMatches[0];
            }
            else {
                resolvedZone =
                    allZones.find((z) => z.zoneCode === 'NATIONAL') ||
                        allZones[0];
            }
        }
        if (!resolvedZone) {
            throw new common_1.BadRequestException('No active shipping zone configured for destination');
        }
        const zoneSurcharge = Number(resolvedZone.zoneSurcharge || 0);
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
        let matchedSlabInfo = null;
        let rateCardInfo = null;
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
            const matchedSlab = slabs.find((s) => billableWeightGrams >= s.minWeightGrams && billableWeightGrams <= s.maxWeightGrams) ||
                slabs.find((s) => billableWeightGrams <= s.maxWeightGrams);
            if (matchedSlab) {
                baseShippingCharge = Number(matchedSlab.rate);
                matchedSlabInfo = {
                    id: matchedSlab.id,
                    minWeightGrams: matchedSlab.minWeightGrams,
                    maxWeightGrams: matchedSlab.maxWeightGrams,
                    rate: Number(matchedSlab.rate),
                };
            }
            else {
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
        let calculatedShipping = baseShippingCharge + additionalWeightCharge + zoneSurcharge + pincodeSurcharge + packagingCharge;
        if (!matchedSlabInfo) {
            const minCharge = Number(config.minShippingCharge || 40);
            calculatedShipping = Math.max(minCharge, calculatedShipping);
        }
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
    async checkServiceability(pincode) {
        const cleanPin = pincode.trim().replace(/[^0-9]/g, '');
        if (cleanPin.length !== 6) {
            throw new common_1.BadRequestException('Pincode must be 6 digits');
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
};
exports.ShippingCalculatorService = ShippingCalculatorService;
exports.ShippingCalculatorService = ShippingCalculatorService = ShippingCalculatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shipping_config_service_1.ShippingConfigService,
        shipping_packaging_service_1.ShippingPackagingService])
], ShippingCalculatorService);
//# sourceMappingURL=shipping-calculator.service.js.map