"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const benchmarkOrders = [
    {
        orderNumber: 'PB-20261007-0042',
        customerName: 'Rohit Singhania (ABC Industries Ltd)',
        productName: 'Visiting Cards (Premium 350 GSM Velvet Touch)',
        sku: 'PRD-BC-001',
        quantity: 1000,
        dimensions: '3.5 x 2.0 in',
        substrate: '350 GSM Velvet',
        sides: 'Double Sided',
        artworkState: 'ARTWORK_APPROVED',
        status: client_1.OrderStatus.ARTWORK_APPROVED,
        priority: client_1.Priority.HIGH,
        totalAmount: 1850.0,
        artworkFile: {
            fileName: 'singhania_visiting_card_v3_pressready.pdf',
            version: 3,
            dimensions: '3.5 x 2.0 in @ 300 DPI CMYK',
        },
    },
    {
        orderNumber: 'PB-20261007-0043',
        customerName: 'Priya Sharma (GreenTech Solar)',
        productName: 'Brochure - Tri-Fold (Gloss 170 GSM)',
        sku: 'PRD-BR-002',
        quantity: 2500,
        dimensions: 'A4 (8.27 x 11.69 in)',
        substrate: '170 GSM Gloss Art',
        sides: 'Double Sided (6 Panels)',
        artworkState: 'DESIGN_REQUIRED',
        status: client_1.OrderStatus.DESIGN_REQUIRED,
        priority: client_1.Priority.NORMAL,
        totalAmount: 9450.0,
        artworkFile: null,
    },
    {
        orderNumber: 'PB-20261007-0044',
        customerName: 'Vikram Mehta (Apex Pharma)',
        productName: 'Medicine Packaging Box (Mono Carton 300 GSM)',
        sku: 'PRD-BX-003',
        quantity: 5000,
        dimensions: '120 x 60 x 40 mm',
        substrate: '300 GSM Food Grade SBS',
        sides: 'Single Side + Drip-off Coating',
        artworkState: 'ARTWORK_APPROVED',
        status: client_1.OrderStatus.ARTWORK_APPROVED,
        priority: client_1.Priority.URGENT,
        totalAmount: 38200.0,
        artworkFile: {
            fileName: 'apex_pharma_monocarton_diecut_cmyk_v2.pdf',
            version: 2,
            dimensions: 'Die-line exact vector CMYK',
        },
    },
    {
        orderNumber: 'PB-20261007-0045',
        customerName: 'Ananya Roy (Kolkata Sweet Hub)',
        productName: 'Sweet Box Sleeves with Gold Foiling',
        sku: 'PRD-SL-004',
        quantity: 1500,
        dimensions: '250 x 80 mm (Flat sleeve)',
        substrate: '280 GSM Kraft Board',
        sides: 'Single Side + Foil Stamp',
        artworkState: 'DESIGN_REQUIRED',
        status: client_1.OrderStatus.DESIGN_REQUIRED,
        priority: client_1.Priority.NORMAL,
        totalAmount: 12600.0,
        artworkFile: null,
    },
    {
        orderNumber: 'PB-20261007-0046',
        customerName: 'Deepak Patel (DP Logistics)',
        productName: 'Self-Adhesive Shipping Labels (Roll Form)',
        sku: 'PRD-LB-005',
        quantity: 10000,
        dimensions: '4 x 6 in',
        substrate: 'Chromo Direct Thermal',
        sides: 'Single Sided',
        artworkState: 'ARTWORK_APPROVED',
        status: client_1.OrderStatus.ARTWORK_APPROVED,
        priority: client_1.Priority.NORMAL,
        totalAmount: 14200.0,
        artworkFile: {
            fileName: 'dp_shipping_labels_barcode_template_v1.pdf',
            version: 1,
            dimensions: '4 x 6 in 300 DPI',
        },
    },
    {
        orderNumber: 'PB-20261007-0047',
        customerName: 'Kavita Menon (Zenith Tech Studio)',
        productName: 'Lanyards + ID Card Set with Dual Clip',
        sku: 'PRD-ID-006',
        quantity: 350,
        dimensions: '20mm Satin + Standard ID',
        substrate: 'Satin Ribbon + 800 Micron PVC',
        sides: 'Double Sided Sublimation',
        artworkState: 'DESIGN_REQUIRED',
        status: client_1.OrderStatus.DESIGN_REQUIRED,
        priority: client_1.Priority.URGENT,
        totalAmount: 8900.0,
        artworkFile: null,
    },
];
async function main() {
    console.log('Seeding benchmark operational orders into PostgreSQL database...');
    let category = await prisma.productCategory.findFirst({
        where: { slug: 'print-materials' },
    });
    if (!category) {
        category = await prisma.productCategory.create({
            data: {
                name: 'Print Materials',
                slug: 'print-materials',
                description: 'Standard print products category',
            },
        });
    }
    let product = await prisma.product.findFirst({
        where: {
            OR: [
                { sku: 'PRD-BC-001' },
                { slug: 'custom-visiting-cards' },
            ],
        },
    });
    if (!product) {
        product = await prisma.product.findFirst();
    }
    if (!product) {
        product = await prisma.product.create({
            data: {
                categoryId: category.id,
                name: 'Custom Visiting Cards',
                slug: 'custom-visiting-cards-bm',
                sku: 'PRD-BC-BM-001',
                description: 'Standard visiting cards',
                basePrice: 1.5,
                isActive: true,
            },
        });
    }
    let customer = await prisma.customer.findFirst({
        where: { email: 'customer@acme.com' },
    });
    if (!customer) {
        const user = await prisma.user.upsert({
            where: { email: 'customer@acme.com' },
            update: {},
            create: {
                email: 'customer@acme.com',
                fullName: 'Rohit Singhania',
                passwordHash: '$2b$10$epUnS6zX9i8vH2J...',
                role: client_1.UserRole.CUSTOMER,
            },
        });
        customer = await prisma.customer.create({
            data: {
                userId: user.id,
                fullName: 'Rohit Singhania',
                companyName: 'ABC Industries Ltd',
                email: 'customer@acme.com',
                phone: '+919876543210',
            },
        });
    }
    const userId = customer.userId || 'system-user';
    for (const bo of benchmarkOrders) {
        const existing = await prisma.order.findUnique({
            where: { orderNumber: bo.orderNumber },
        });
        if (existing) {
            await prisma.artworkVersion.deleteMany({
                where: {
                    orderItem: {
                        orderId: existing.id,
                    },
                },
            });
            await prisma.orderItem.deleteMany({ where: { orderId: existing.id } });
            await prisma.order.delete({ where: { id: existing.id } });
        }
        const createdOrder = await prisma.order.create({
            data: {
                orderNumber: bo.orderNumber,
                customerId: customer.id,
                status: bo.status,
                customerStatus: client_1.CustomerVisibleStatus.ORDER_CREATED,
                priority: bo.priority,
                paymentStatus: client_1.PaymentStatus.PAID,
                subtotal: bo.totalAmount * 0.82,
                taxAmount: bo.totalAmount * 0.18,
                shippingAmount: 0,
                discountAmount: 0,
                totalAmount: bo.totalAmount,
                paidAmount: bo.totalAmount,
                balanceAmount: 0,
                items: {
                    create: [
                        {
                            productId: product.id,
                            sku: bo.sku,
                            productName: bo.productName,
                            quantity: bo.quantity,
                            unitPrice: bo.totalAmount / bo.quantity,
                            totalPrice: bo.totalAmount,
                            specifications: {
                                dimensions: bo.dimensions,
                                paperGsm: bo.substrate,
                                sides: bo.sides,
                                finish: 'Matte Lamination',
                            },
                        },
                    ],
                },
            },
        });
        const items = await prisma.orderItem.findMany({
            where: { orderId: createdOrder.id },
        });
        const firstItem = items[0];
        if (bo.artworkFile && firstItem) {
            const artVersion = await prisma.artworkVersion.create({
                data: {
                    orderItemId: firstItem.id,
                    versionNumber: bo.artworkFile.version,
                    originalFileName: bo.artworkFile.fileName,
                    storageKey: `artwork/${bo.orderNumber}/${bo.artworkFile.fileName}`,
                    mimeType: 'application/pdf',
                    fileSize: 1024 * 1024 * 2,
                    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                    status: client_1.ArtworkStatus.PROOF_APPROVED,
                    isApproved: true,
                    approvedAt: new Date(),
                    uploadedBy: userId,
                },
            });
            await prisma.orderItem.update({
                where: { id: firstItem.id },
                data: { approvedArtworkVersionId: artVersion.id },
            });
        }
        console.log(`✅ Seeded order: ${bo.orderNumber} (ID: ${createdOrder.id}) - Status: ${bo.status}`);
    }
    console.log('🎉 All benchmark orders seeded successfully into PostgreSQL!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-benchmark-orders.js.map