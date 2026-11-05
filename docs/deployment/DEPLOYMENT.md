# Deployment & Environment Strategy

## 1. Multi-Tier Environments
- **Local Development**: Docker Compose (Postgres, Redis, MinIO, MailHog) + `npm run dev`
- **Staging / QA**: Dockerized containers, staging Razorpay credentials, sandbox courier APIs, automated regression test runs.
- **Production**: High-availability PostgreSQL cluster with automated daily WAL backups, Redis Sentinel/Cluster for queues, AWS S3 / Cloudflare R2 for artwork files, multi-region CDN for Next.js assets.

## 2. Zero-Downtime Migration Policy
- Database changes must be non-destructive (expand-and-contract pattern).
- Prisma migrations are run in CI/CD pipeline prior to application container cutover.
