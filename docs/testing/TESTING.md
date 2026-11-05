# Quality Assurance & Automated Testing Architecture

## 1. Automated Test Levels
1. **Unit Tests (`*.spec.ts`)**:
   - Pricing formula & matrix tier calculation.
   - State transition rules and guard evaluation in `WorkflowStateService`.
   - SLA duration & risk calculation algorithms.
2. **Integration / API Tests (`*.e2e-spec.ts`)**:
   - NestJS supertest suites covering `/api/v1/pricing`, `/api/v1/orders`, `/api/v1/workflow`, `/api/v1/payments`.
   - Webhook idempotency and signature verification.
3. **End-to-End Tests**:
   - Complete customer-to-production journey validation with Playwright:
     Customer Order -> Razorpay Payment -> Proof Approval -> Pre-Production QC Pass -> Job Card Creation -> Production Printing & Finishing -> Final QC -> Packaging -> Dispatch Handover.
