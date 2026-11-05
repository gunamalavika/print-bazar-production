# PRINT BAZZAR 2.0 - Core System Architecture

## 1. System Vision & Paradigm
PRINT BAZZAR 2.0 is a unified Customer-to-Production Operating System built for print manufacturing, signage, custom branding, and corporate gifts. Unlike standard e-commerce carts, print manufacturing requires continuous customer-to-shop-floor coordination: artwork file preflighting, proof generation, approval sign-offs, production route resolution, physical work center scheduling, multi-stage QC inspections, multi-parcel packaging, and automated courier integration.

```mermaid
graph TD
    Cust[Customer Storefront / POS] -->|1. Config & Order| OrdEngine[Order Engine]
    OrdEngine -->|2. Verify Amount| PayGateway[Razorpay Payment Gateway]
    PayGateway -->|3. Webhook Signature Verified| PayService[Payment Service]
    PayService -->|4. Transition PAYMENT_CONFIRMED| WF[Workflow Engine]
    WF -->|5. Artwork Review| Prepress[Designer / Prepress Queue]
    Prepress -->|6. Upload Proof| ProofQueue[Customer Approval Gate]
    ProofQueue -->|7. Customer Approves Proof| PreQC[Pre-Production QC Gate]
    PreQC -->|8. Release PASS| AutoJC[Automatic Job Card Engine]
    AutoJC -->|9. Route & Assign| ProdStation[Production Stations: Print & Finishing]
    ProdStation -->|10. Finishing Handover| FinalQC[Final QC Gate]
    FinalQC -->|11. QC Pass| PackStation[Packing & Packaging Queue]
    PackStation -->|12. Weigh & Measure| ShipEngine[Shipping & Dispatch Provider]
    ShipEngine -->|13. AWB & Label| DispStation[Dispatch Station & Handover]
    DispStation -->|14. Track Live Status| Deliv[Customer Delivered]
```

## 2. Core Architectural Tenets
1. **Single Source of Truth**:
   The `Order` entity forms the root aggregate. All child concepts (`OrderItem`, `ArtworkVersion`, `JobCard`, `QCChecklist`, `Package`, `Shipment`, `Invoice`) reference the master `Order` and maintain strict referential integrity.
2. **Deterministic State Machine**:
   Transitions across the 16 order workflow stages are validated by `OrderWorkflowService`. No frontend or controller can mutate order states arbitrarily. Transitions verify current state, required user department, role permissions, gate preconditions (e.g. proof approval or QC pass), and commit an immutable `AuditLog` entry atomically.
3. **Decoupled Asynchronous Workers**:
   Time-consuming workloads (document generation, email/SMS/WhatsApp notifications, courier API sync, SLA breach polling) are dispatched via Redis and BullMQ queues, keeping API response latency under 50ms.
4. **Resilient Offline / Walk-in Operations**:
   Walk-in store orders, B2B corporate purchase orders, and sales quotation conversions pass through the identical unified Order Engine and master workflow, preventing disparate shadow databases.
