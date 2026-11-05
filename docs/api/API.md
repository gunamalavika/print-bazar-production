# RESTful API Architecture & Endpoints

All API endpoints reside under `/api/v1` and follow standard REST conventions.

## 1. Domain Groupings

| Domain Prefix | Primary Operations |
|---|---|
| `/auth` | `/login`, `/register`, `/refresh`, `/me`, `/logout` |
| `/users` | Staff directory, department assignments, role management |
| `/customers` | Customer profiles, address book, corporate accounts, GSTIN |
| `/products` | Catalog listing, product options, configurations, routes |
| `/pricing` | `/calculate-quote` (authoritative pricing engine) |
| `/orders` | Omnichannel order creation, search, filter, order details, cancel |
| `/payments` | `/create-order` (Razorpay order intent), `/verify`, `/webhook` |
| `/artwork` | Signed upload URLs, version history, prepress preflight, proof generation |
| `/approvals` | Proof review, customer sign-off / revision request |
| `/workflow` | `/transition`, `/available-transitions`, `/override` |
| `/production` | Work center queues, claim job, assign machine, start, pause, resume, finish |
| `/job-cards` | Auto-generation, print job card PDF, route milestones, status updates |
| `/qc` | `/pre-production/checklist`, `/final/checklist`, submit inspection, report defect |
| `/packing` | Open packaging task, scan item, register packages (1 of N), capture weight/dimensions |
| `/packages` | Barcode label generation, package details |
| `/shipments` | Courier manifest creation, AWB generation, live tracking webhooks |
| `/dispatch` | Pre-dispatch barcode scan, courier handover verification, store pickup handover |
| `/invoices` | Tax invoice generation, download PDF, accounts reconciliation |
| `/sla` | SLA health dashboard, breach alerts, delayed orders queue |
| `/audit` | Audit log queries, actor trails, override records |
