# PRINT BAZZAR 2.0
> **Customer-to-Production Operating System**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015%20App%20Router-black.svg)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2010+-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20+%20Prisma-blue.svg)](https://www.prisma.io/)
[![BullMQ](https://img.shields.io/badge/Queue-Redis%20+%20BullMQ-critical.svg)](https://bullmq.io/)

---

## 1. Project Overview

**PRINT BAZZAR 2.0** is not merely an e-commerce website; it is an integrated, industrial-grade **Customer-to-Production Operating System** specifically architected for print manufacturing, signage, custom branding, apparel, corporate gifts, and packaging.

The platform provides a simple, modern self-service storefront for customers while driving sophisticated, automated shop-floor operations behind strict workflow gates, automated Job Cards, quality control (QC) checks, packaging sequences, and courier dispatch.

---

## 2. Core Architectural Principles

1. **One Order = One Master Record**: Every customer order maintains a single authoritative lifecycle thread connecting Customer → Order → Order Items → Artwork Versions → Customer Proof Approval → Pre-Production QC → Automatic Job Cards → Production Stations (Printing, Finishing) → Final QC → Packaging → Shipping/AWB → Delivery.
2. **Strict TypeScript Only**: 100% strongly typed with `.ts` and `.tsx`. No legacy JavaScript, no implicit `any`.
3. **No Direct Production Bypass**: Orders cannot jump from payment or customer approval directly into printing. Mandatory Pre-Production QC gates validate artwork resolution, bleed, margins, materials, GSM, and finishing before releasing Job Cards to the shop floor.
4. **Server-Side Authoritative Pricing**: Pricing matrices, variant formulas, finishings, quantities, and tiers are evaluated strictly on the backend.
5. **Event-Driven Shop Floor Automation**: State transitions emit strongly typed domain events (e.g., `PaymentConfirmed`, `ProofApproved`, `PreProductionQCPassed`, `QCPassed`, `ShipmentCreated`) that automatically populate downstream department queues.
6. **Immutable Artwork Versioning**: Artwork source of truth is locked via `approvedArtworkVersionId`. Post-approval customer uploads generate revisions requiring re-approval without corrupting in-progress runs.
7. **Comprehensive Audit Trail**: Sensitive transitions, status changes, and manager overrides enforce **User + Role + Department + Reason + Audit Record**.

---

## 3. Directory Layout

```
PRINT-BAZZAR-2.0/
├── api/                    # NestJS REST API, Prisma ORM, BullMQ workers
│   ├── prisma/             # Database schema, migrations, seeders
│   └── src/                # Modules, common guards/interceptors, domain engines
├── web/                    # Next.js App Router (Storefront + ERP / Admin Console)
│   ├── src/app/            # (store), (account), admin/ routes
│   └── src/components/     # UI design system & feature components
├── docs/                   # Architectural & technical documentation
│   ├── architecture/       # ARCHITECTURE.md, RBAC.md
│   ├── workflow/           # WORKFLOW.md (16-stage state machine)
│   ├── database/           # DATABASE.md (ERD, data dictionary)
│   ├── api/                # API.md (REST contracts, OpenAPI)
│   ├── production/         # PRODUCTION.md, ARTWORK.md, QC.md
│   └── shipping/           # SHIPPING.md, PAYMENT.md
├── docker/                 # Container configs
├── scripts/                # Database seeding, operational maintenance scripts
├── docker-compose.yml      # Local dev stack (PostgreSQL, Redis, MinIO, MailHog)
└── .env.example            # Environment variables template
```

---

## 4. Master 16-Stage Order Workflow

| Stage | Internal Status | Customer-Facing Status | Department Responsible | Mandatory Gates |
|---|---|---|---|---|
| 1 | `ORDER_CREATED` | Order Created | System / Sales | Order draft created |
| 2 | `PAYMENT_PENDING` | Payment Pending | Customer / Accounts | Razorpay intent initialized |
| 3 | `PAYMENT_CONFIRMED` | Payment Confirmed | Accounts / System | Verified Razorpay signature / offline approval |
| 4 | `ORDER_REVIEW` | Order Received | Sales / Prepress | Technical & order spec verification |
| 5 | `ARTWORK_REVIEW` | Artwork Being Checked | Designer / Prepress | Dimension, DPI, color space & bleed verification |
| 6 | `DESIGN_REQUIRED` / `ARTWORK_APPROVED` | Design in Progress / Ready | Designer | Customer proof PDF generated |
| 7 | `CUSTOMER_APPROVAL_REQUIRED` | Approval Required | Customer | Customer explicitly reviews and digital-signs proof |
| 8 | `PRE_PRODUCTION_QC` | Preparing Order | Pre-Production QC | 12-point technical release checklist verified |
| 9 | `PRODUCTION_QUEUE` | Preparing Order | Production Planner | Auto Job Card generated & scheduled to work center |
| 10 | `PRINTING` | In Production | Production Operator | Machine assignment, material check, printing run |
| 11 | `FINISHING` | In Production | Finishing Department | Lamination, die cutting, binding, foil, eyeletting |
| 12 | `QUALITY_CHECK` | Final Quality Inspection | Final QC Inspector | Physical inspection, defect checks, PASS/FAIL |
| 13 | `PACKING` | Packaging in Progress | Packing Team | Count verification, weigh-in, dimensions, parcel barcode |
| 14 | `READY_FOR_DISPATCH` | Ready to Ship / Ready for Pickup | Dispatch / Counter | Courier manifest generated, AWB printed |
| 15 | `OUT_FOR_DELIVERY` | Out for Delivery | Courier / Logistics | Courier handover scan, live tracking link active |
| 16 | `DELIVERED` | Delivered | Logistics / Customer | Proof of Delivery (POD) confirmed |

---

## 5. Quick Start Guide

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- PostgreSQL >= 15 (or via Docker Compose)
- Redis >= 7 (optional for queues, in-memory mock fallback supported in dev)

### Setup & Run
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
cp .env.example api/.env
cp .env.example web/.env.local

# 3. Start local databases & caches (optional if local PostgreSQL is installed)
docker compose up -d

# 4. Generate Prisma Client & Run Database Migrations
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 5. Start Backend API & Frontend Web Console
npm run dev
```

- API Server: `http://localhost:4000/api/v1`
- Swagger Docs: `http://localhost:4000/api/docs`
- Web Storefront & ERP: `http://localhost:3000`
