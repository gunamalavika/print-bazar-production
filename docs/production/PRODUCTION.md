# Production & Job Card Automation Engine

## 1. Automatic Job Card Generation
When an order satisfies:
1. Payment confirmed (or authorized credit limit approved)
2. Artwork approved by customer
3. Pre-Production QC verified 100% PASS

The `JobCardEngineService` triggers atomically:
- Generates a unique Job Card Number (`JC-YYYYMMDD-XXXX`).
- Snapshots exact product configurations (size, GSM, material, finishing, quantity).
- Locks to `approvedArtworkVersionId`.
- Resolves machine routing sequence (e.g., Prepress -> Indigo 12000 -> Matt Thermal Lamination -> Polar Cutter).
- Calculates target completion SLA based on standard working minutes per process.
- Enqueues to `PRODUCTION_QUEUE`.

## 2. Pause & Resume Semantics
- When a job is paused (e.g., for paper stock out, mechanical breakdown, or color discrepancy), the system records `preHoldStatus` (e.g. `PRINTING` or `FINISHING`).
- The job status moves to `ON_HOLD` with a structured `JobIssue` reason code.
- When resumed, the system returns strictly to `preHoldStatus` without skipping or restarting completed operations.
