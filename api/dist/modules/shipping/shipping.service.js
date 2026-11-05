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
var ShippingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const shipping_config_service_1 = require("./shipping-config.service");
let ShippingService = ShippingService_1 = class ShippingService {
    prisma;
    configService;
    logger = new common_1.Logger(ShippingService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async getOverview() {
        const config = await this.configService.getConfiguration();
        const [totalZones, totalPincodes, serviceablePincodes, nonServiceablePincodes, activeRateCards, ordersAwaitingDispatch, allShippingOrders, activeZones, productsWithZeroWeight,] = await Promise.all([
            this.prisma.shippingZone.count(),
            this.prisma.shippingPincode.count(),
            this.prisma.shippingPincode.count({ where: { isServiceable: true } }),
            this.prisma.shippingPincode.count({ where: { isServiceable: false } }),
            this.prisma.shippingRateCard.count({ where: { isActive: true } }),
            this.prisma.order.count({ where: { status: { in: ['PAYMENT_CONFIRMED', 'PRINTING', 'FINISHING'] } } }),
            this.prisma.order.findMany({
                where: { shippingAmount: { gt: 0 } },
                select: { shippingAmount: true },
            }),
            this.prisma.shippingZone.findMany({
                where: { isActive: true },
                include: {
                    _count: {
                        select: { pincodes: true, rateCards: true },
                    },
                },
            }),
            this.prisma.product.count({
                where: {
                    isActive: true,
                    isShippable: true,
                    unitWeightGrams: { lte: 0 },
                },
            }),
        ]);
        const totalShippingRevenue = allShippingOrders.reduce((sum, o) => sum + Number(o.shippingAmount || 0), 0);
        const avgShippingCost = allShippingOrders.length > 0
            ? Math.round((totalShippingRevenue / allShippingOrders.length) * 100) / 100
            : 0;
        const recentOrders = await this.prisma.order.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                orderNumber: true,
                status: true,
                subtotal: true,
                shippingAmount: true,
                totalAmount: true,
                createdAt: true,
                shippingAddress: {
                    select: {
                        city: true,
                        state: true,
                        postalCode: true,
                    },
                },
                items: {
                    take: 3,
                    select: {
                        id: true,
                        quantity: true,
                        unitPrice: true,
                        specifications: true,
                        product: {
                            select: {
                                id: true,
                                name: true,
                                unitWeightGrams: true,
                            },
                        },
                    },
                },
            },
        });
        const alerts = [];
        if (totalPincodes === 0) {
            alerts.push({
                id: 'no-pincodes',
                type: 'warning',
                message: 'No delivery PIN codes configured. System is operating on default fallback zone mapping.',
            });
        }
        if (activeRateCards === 0) {
            alerts.push({
                id: 'no-rate-cards',
                type: 'error',
                message: 'No active shipping rate cards found. Courier pricing will default to base fallback charge.',
            });
        }
        if (productsWithZeroWeight > 0) {
            alerts.push({
                id: 'zero-weight-products',
                type: 'warning',
                message: `${productsWithZeroWeight} active shippable product(s) have weight set to 0 grams. Configure weight in Stage 5.`,
            });
        }
        for (const z of activeZones) {
            if (z._count.rateCards === 0) {
                alerts.push({
                    id: `no-rate-${z.id}`,
                    type: 'warning',
                    message: `Zone '${z.zoneName}' (${z.zoneCode}) has no active rate cards configured.`,
                });
            }
        }
        return {
            stats: {
                totalShippedOrders: ordersAwaitingDispatch,
                activeZones: totalZones,
                totalPincodes,
                activeRateCards,
            },
            kpis: {
                totalZones,
                totalPincodes,
                serviceablePincodes,
                nonServiceablePincodes,
                activeRateCards,
                ordersAwaitingDispatch,
                totalShippingRevenue: Math.round(totalShippingRevenue * 100) / 100,
                avgShippingCost,
            },
            configurationStatus: {
                businessName: config.businessName,
                originCity: config.originCity,
                originState: config.originState,
                originPincode: config.originPincode,
                weightUnit: config.weightUnit,
                roundingMethod: config.weightRoundingMethod,
                isWeightBasedEnabled: config.isWeightBasedEnabled,
                isVolumetricEnabled: config.isVolumetricEnabled,
                freeShippingThreshold: Number(config.freeShippingThreshold),
            },
            zones: activeZones.map((z, idx) => ({
                id: z.id,
                zoneCode: z.zoneCode || z.pincodePrefix || `ZONE-${idx + 1}`,
                name: z.zoneName,
                zoneName: z.zoneName,
                description: z.description,
                estimatedDeliveryDays: z.estimatedDeliveryDays || '2-4 Days',
                baseSurcharge: Number(z.zoneSurcharge || 0),
                pincodeCount: z._count?.pincodes || 0,
                rateCardCount: z._count?.rateCards || 0,
                shippingCharge: Number(z.shippingCharge || 0),
            })),
            recentOrders: recentOrders.map((o) => {
                let estWeightGrams = 0;
                for (const item of o.items) {
                    const itemWeight = Number(item.product?.unitWeightGrams || 2.5);
                    estWeightGrams += item.quantity * itemWeight;
                }
                estWeightGrams += 200;
                return {
                    id: o.id,
                    orderNumber: o.orderNumber,
                    status: o.status,
                    city: o.shippingAddress?.city || 'Direct',
                    state: o.shippingAddress?.state || '',
                    pincode: o.shippingAddress?.postalCode || '—',
                    billableWeightGrams: estWeightGrams,
                    shippingAmount: Number(o.shippingAmount || 0),
                    totalAmount: Number(o.totalAmount || 0),
                    createdAt: o.createdAt,
                };
            }),
            alerts,
        };
    }
    async getOrders(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.status) {
            where.status = query.status;
        }
        if (query.pincode) {
            where.shippingAddress = { postalCode: { startsWith: query.pincode.trim() } };
        }
        if (query.search && query.search.trim()) {
            const q = query.search.trim();
            where.OR = [
                { orderNumber: { contains: q, mode: 'insensitive' } },
                { customer: { fullName: { contains: q, mode: 'insensitive' } } },
                { customer: { email: { contains: q, mode: 'insensitive' } } },
                { shippingAddress: { postalCode: { contains: q } } },
                { shippingAddress: { city: { contains: q, mode: 'insensitive' } } },
            ];
        }
        const [total, orders] = await Promise.all([
            this.prisma.order.count({ where }),
            this.prisma.order.findMany({
                where,
                include: {
                    customer: {
                        select: { id: true, fullName: true, email: true, phone: true },
                    },
                    shippingAddress: true,
                    items: {
                        include: {
                            product: {
                                select: { id: true, name: true, sku: true, unitWeightGrams: true },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
        ]);
        return {
            orders: orders.map((o) => {
                let totalItemsWeight = 0;
                for (const item of o.items) {
                    const w = Number(item.product?.unitWeightGrams || 2.5);
                    totalItemsWeight += item.quantity * w;
                }
                const billableWeightGrams = Math.round(totalItemsWeight + 200);
                return {
                    id: o.id,
                    orderNumber: o.orderNumber,
                    customerName: o.customer?.fullName || 'Guest Customer',
                    customerEmail: o.customer?.email,
                    city: o.shippingAddress?.city || '—',
                    state: o.shippingAddress?.state || '—',
                    destinationPincode: o.shippingAddress?.postalCode || '—',
                    status: o.status,
                    subtotal: Number(o.subtotal || 0),
                    shippingCharge: Number(o.shippingAmount || 0),
                    taxAmount: Number(o.taxAmount || 0),
                    grandTotal: Number(o.totalAmount || 0),
                    actualWeightGrams: Math.round(totalItemsWeight),
                    packagingWeightGrams: 200,
                    billableWeightGrams,
                    createdAt: o.createdAt,
                };
            }),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getReports() {
        const orders = await this.prisma.order.findMany({
            select: {
                id: true,
                subtotal: true,
                shippingAmount: true,
                totalAmount: true,
                createdAt: true,
                shippingAddress: {
                    select: { postalCode: true, city: true, state: true },
                },
                items: {
                    select: {
                        quantity: true,
                        product: {
                            select: {
                                unitWeightGrams: true,
                                category: { select: { name: true } },
                            },
                        },
                    },
                },
            },
        });
        const totalOrders = orders.length;
        let totalRevenue = 0;
        let freeShippingOrders = 0;
        const categoryShippingMap = new Map();
        const stateShippingMap = new Map();
        const weightBuckets = {
            '0–500g': 0,
            '501g–1kg': 0,
            '1kg–2.5kg': 0,
            '2.5kg–5kg': 0,
            '5kg+': 0,
        };
        for (const o of orders) {
            const shipAmt = Number(o.shippingAmount || 0);
            totalRevenue += shipAmt;
            if (shipAmt === 0)
                freeShippingOrders++;
            const st = o.shippingAddress?.state || 'Other';
            const existingState = stateShippingMap.get(st) || { count: 0, revenue: 0 };
            existingState.count++;
            existingState.revenue += shipAmt;
            stateShippingMap.set(st, existingState);
            let orderWeight = 0;
            for (const item of o.items) {
                const catName = item.product?.category?.name || 'General';
                const curCat = categoryShippingMap.get(catName) || 0;
                categoryShippingMap.set(catName, curCat + shipAmt);
                orderWeight += item.quantity * Number(item.product?.unitWeightGrams || 2.5);
            }
            orderWeight += 200;
            if (orderWeight <= 500)
                weightBuckets['0–500g']++;
            else if (orderWeight <= 1000)
                weightBuckets['501g–1kg']++;
            else if (orderWeight <= 2500)
                weightBuckets['1kg–2.5kg']++;
            else if (orderWeight <= 5000)
                weightBuckets['2.5kg–5kg']++;
            else
                weightBuckets['5kg+']++;
        }
        return {
            summary: {
                totalShipments: totalOrders,
                totalShippingRevenue: Math.round(totalRevenue * 100) / 100,
                averageShippingCharge: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
                freeShippingOrdersCount: freeShippingOrders,
                paidShippingOrdersCount: totalOrders - freeShippingOrders,
            },
            weightDistribution: Object.entries(weightBuckets).map(([slab, count]) => ({ slab, count })),
            stateAnalytics: Array.from(stateShippingMap.entries())
                .map(([state, data]) => ({ state, shipments: data.count, revenue: Math.round(data.revenue * 100) / 100 }))
                .sort((a, b) => b.shipments - a.shipments),
            categoryAnalytics: Array.from(categoryShippingMap.entries()).map(([category, revenue]) => ({
                category,
                revenue: Math.round(revenue * 100) / 100,
            })),
        };
    }
};
exports.ShippingService = ShippingService;
exports.ShippingService = ShippingService = ShippingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shipping_config_service_1.ShippingConfigService])
], ShippingService);
//# sourceMappingURL=shipping.service.js.map