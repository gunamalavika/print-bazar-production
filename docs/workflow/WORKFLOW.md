# Master 16-Stage Order Workflow Specification

## 1. Complete Workflow States

1. `ORDER_CREATED`: Order placed via Web/Walk-in/Corporate API.
2. `PAYMENT_PENDING`: Payment gateway order created; waiting for settlement.
3. `PAYMENT_CONFIRMED`: Verified payment received or authorized advance recorded.
4. `ORDER_REVIEW`: Sales/Technical review of specs, paper type, quantity, special instructions.
5. `ARTWORK_REVIEW`: Prepress checks resolution (DPI), color mode (CMYK), bleed, and safe margins.
6. `DESIGN_REQUIRED` / `ARTWORK_APPROVED`: Artwork passes preflight, proof generated, or custom graphic design scheduled.
7. `CUSTOMER_APPROVAL_REQUIRED`: Digital soft-proof presented to customer for approval.
8. `PRE_PRODUCTION_QC`: Mandatory 12-point release checklist (correct version, bleed, size, GSM, finishing).
9. `PRODUCTION_QUEUE`: Job Card automatically created and queued for physical scheduling.
10. `PRINTING`: Machine assigned and active printing underway.
11. `FINISHING`: Lamination, die cutting, creasing, foil stamping, eyeletting, binding.
12. `QUALITY_CHECK`: Physical final inspection against job card specs and color proof.
13. `PACKING`: Count verification, carton boxing, weighing, dimension capture, barcode tagging.
14. `READY_FOR_DISPATCH`: Courier label/AWB printed or counter package ready for pickup.
15. `OUT_FOR_DELIVERY`: Manifest signed, courier handover completed, transit in progress.
16. `DELIVERED`: Proof of Delivery (POD) signed and recorded.

---

## 2. Transition Guard Matrix

| Source State | Target State | Authorized Department | Guard Precondition |
|---|---|---|---|
| `ORDER_CREATED` | `PAYMENT_PENDING` | System / Customer | Valid cart & server quote |
| `PAYMENT_PENDING` | `PAYMENT_CONFIRMED` | System / Accounts | Verified Razorpay signature or manual counter payment entry |
| `PAYMENT_CONFIRMED` | `ORDER_REVIEW` | System / Sales | Order specifications verified |
| `ORDER_REVIEW` | `ARTWORK_REVIEW` | Prepress / Sales | Artwork uploaded or design request submitted |
| `ARTWORK_REVIEW` | `DESIGN_REQUIRED` | Prepress / Designer | Customer requested custom design assistance |
| `ARTWORK_REVIEW` | `CUSTOMER_APPROVAL_REQUIRED` | Prepress / Designer | Prepress proof uploaded and locked |
| `DESIGN_REQUIRED` | `CUSTOMER_APPROVAL_REQUIRED` | Designer | Design proof generated and uploaded |
| `CUSTOMER_APPROVAL_REQUIRED` | `PRE_PRODUCTION_QC` | Customer / Manager Override | Customer explicit sign-off; cannot jump directly to PRINTING |
| `CUSTOMER_APPROVAL_REQUIRED` | `DESIGN_REQUIRED` | Customer | Rejection with customer feedback notes |
| `PRE_PRODUCTION_QC` | `PRODUCTION_QUEUE` | Pre-Production QC | 100% of required checklist items passed |
| `PRODUCTION_QUEUE` | `PRINTING` | Production Operator | Job Card claimed, machine selected |
| `PRINTING` | `FINISHING` | Production Operator | Printing run complete, sheets dried/transferred |
| `FINISHING` | `QUALITY_CHECK` | Finishing Team | Finishing operations completed |
| `QUALITY_CHECK` | `PACKING` | Final QC Inspector | Final physical inspection PASS recorded |
| `QUALITY_CHECK` | `PRODUCTION_QUEUE` / `REWORK` | Final QC Inspector | Final physical inspection FAIL recorded with defect notes |
| `PACKING` | `READY_FOR_DISPATCH` | Packing Team | All packages weighed, dimensions recorded, shipping label printed |
| `READY_FOR_DISPATCH` | `OUT_FOR_DELIVERY` | Dispatch / Logistics | Courier manifest generated, scan verified |
| `READY_FOR_DISPATCH` | `DELIVERED` | Store Counter Staff | (Store Pickup) Payment cleared, recipient identity logged |
| `OUT_FOR_DELIVERY` | `DELIVERED` | Logistics / Courier Sync | Courier POD webhook or counter delivery confirmation |

---

## 3. Forbidden Transitions (Hard Constraints)
- `PAYMENT_PENDING` ➔ `PRINTING` (FORBIDDEN: Unfunded production release is strictly blocked)
- `CUSTOMER_APPROVAL_REQUIRED` ➔ `PRINTING` (FORBIDDEN: Must pass through `PRE_PRODUCTION_QC`)
- `QUALITY_CHECK` ➔ `READY_FOR_DISPATCH` (FORBIDDEN: Must pass through `PACKING` with verified weights & labels)
- `QUALITY_CHECK (FAIL)` ➔ `DELIVERED` (FORBIDDEN: Rejects can never be dispatched)

---

## 4. Operational Manager (OE) Role in Workflow
- **Coordinating Role**: The `OPERATIONAL_MANAGER` monitors the entire 16-stage pipeline in real-time, assigns Prepress Designers and Production Operators, manages internal notes, escalates priorities, and resolves departmental blockers.
- **Strict Gate Invariance**: The OE operates within existing workflow rules and **cannot** force illegal transitions, bypass Pre-QC/Final QC checklists, clear payment overrides, or bypass packing and dispatch checkpoints. Special emergency workflow overrides remain exclusive to `ADMIN_MANAGER` with logged structured audit reasons.
