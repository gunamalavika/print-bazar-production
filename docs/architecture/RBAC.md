# Role-Based Access Control (RBAC) & Department Authorization

## 1. Core Business Roles & Responsibilities

| Role | Primary Department | Scope of Authority | Hard Restrictions |
|---|---|---|---|
| `CUSTOMER` | External | Browse catalog, configure products, upload artwork, pay, approve proofs, track order. | Cannot view internal Job Cards, machine queues, or internal margin notes. |
| `SALES_OFFICE` | Sales & Customer Support | Create walk-in/POS orders, issue quotations, review orders, assist customer queries. | Cannot release orders to production without required gates. |
| `DESIGNER_PREPRESS` | Prepress & Design Studio | Inspect raw artwork, generate customer proofs, manage artwork revisions. | Cannot trigger physical printing or alter order prices. |
| `PRE_PRODUCTION_QC` | Quality Engineering | Execute 12-point pre-flight checklist, approve/reject production release. | Cannot alter commercial invoice totals or skip checks. |
| `PRODUCTION_OPERATOR` | Production Floor | Claim Job Cards, assign machines, start/pause/resume print jobs, handover to finishing. | Cannot edit payments, change order specs, or mark orders delivered. |
| `FINAL_QC_INSPECTOR` | Quality Engineering | Physical output inspection, PASS/FAIL determination, defect categorization, rework trigger. | Cannot dispatch rejected or uninspected items. |
| `PACKING_OPERATOR` | Packaging & Fulfillment | Verify piece count, carton packing, measure weights & dimensions, generate shipping labels. | Cannot bypass QC gates or override unpaid balances. |
| `DISPATCH_LOGISTICS` | Dispatch & Shipping | Package barcode scanning, courier manifest creation, courier handover, store pickup delivery. | Cannot alter product pricing or production results. |
| `ACCOUNTS` | Finance | Payment verification, manual bank reconciliations, credit notes, refunds, invoices. | Cannot bypass production or QC gates. |
| `OPERATIONAL_MANAGER` | Operations Coordination | Central order intake, designer & press operator assignment, operational blockers monitoring, internal notes, priority escalation. | Strictly coordinator role: CANNOT approve QC, clear payments, bypass customer approvals, or force workflow state transitions. |
| `ADMIN_MANAGER` | Executive Management | Full administrative access, SLA overrides, assignment reassignment, workflow unlocks. | Every override requires a mandatory structured reason and produces an immutable audit record. |

---

## 2. Operational Manager (OE) Coordination Matrix
- **Authority**: High-visibility coordinator across the entire manufacturing lifecycle.
- **Assignments**: Assigns/reassigns `DESIGNER_PREPRESS` staff to `DESIGN_REQUIRED` orders; assigns/reassigns `PRODUCTION_OPERATOR` staff to `PRODUCTION_QUEUE` Job Cards.
- **Auditing**: All allocations, priority modifications, and internal notes are immutably logged to `AuditLog`.
- **Gate Safety**: OE adheres strictly to the 16-stage workflow engine. Quality, Finance, Packing, and Dispatch departmental gates remain exclusively actionable by their respective specialists.

---

## 3. Manager Overrides
Manager overrides require:
1. `ADMIN_MANAGER` role.
2. A required `overrideReason` string (minimum 10 characters).
3. Automatic creation of an `AuditLog` entry detailing actor, previous state, new state, reason, and IP timestamp.
