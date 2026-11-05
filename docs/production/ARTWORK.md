# Artwork Versioning & Approval System

## 1. Immutable Artwork Versions
- Artwork versions are versioned monotonically: `v1`, `v2`, `v3`...
- Source files are held in S3-compatible storage. Database retains cryptographic checksum (`sha256`), storageKey, dimensions, colorProfile, resolutionDpi, and pageCount.
- The `OrderItem` holds an explicit foreign key `approvedArtworkVersionId`.
- Later uploads do NOT overwrite or mutate an active production run.

## 2. Customer Proof Approval Protocol
- Customer receives digital soft proof (PDF/high-res PNG preview) with trim lines, bleed lines, and safety margins clearly annotated.
- Customer signs off with IP address, user timestamp, and declaration: *"I approve spelling, design, and layout."*
- Sign-off automatically unlocks order to `PRE_PRODUCTION_QC`.
