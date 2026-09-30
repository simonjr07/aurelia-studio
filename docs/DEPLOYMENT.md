# Deployment Plan

Deployment is planned for TASK-015; no Vercel project, Supabase project, production credential, or hosted environment is created in TASK-001.

## Environments

- **Local:** Next.js development server and, from TASK-002, Docker Compose PostgreSQL.
- **Preview:** Vercel preview deployment with an isolated/non-production database strategy and synthetic data.
- **Production:** Vercel-hosted Next.js connected over TLS to Supabase PostgreSQL in a compatible region.

Each environment receives separate database/auth secrets, uses the same committed migrations, and must not share production customer data with development or preview.

## CI and release path

GitHub Actions currently runs `npm ci`, lint, typecheck, Vitest, and the production build on pull requests and pushes to `main`. Before production:

1. Review dependency and migration changes.
2. Back up the database and verify migration rollback/recovery notes.
3. Apply migrations once through a controlled release step; do not let every serverless instance race migrations.
4. Deploy the immutable application build.
5. Run hosted smoke tests for public and authenticated critical paths.
6. Verify logs, security headers, redirects, timezone display, responsive layout, and accessibility.
7. Roll back the application and restore/forward-fix data according to the migration’s documented recovery plan if verification fails.

## Planned environment variables

Names will be finalized with their implementation tasks. Expected categories include a pooled runtime database URL, direct migration URL if required, Auth.js secret/origin configuration, and rate-limit/observability credentials if external services are later approved. A safe `.env.example` will be added only when variables are used.

## Database considerations

- Confirm Prisma/Supabase connection pooling and serverless connection limits.
- Keep the database region close to Vercel execution.
- Apply least-privilege roles and TLS requirements.
- Enable automated backups and test restoration before launch.
- Monitor failed constraints, slow scheduling queries, connection saturation, and migration health without logging PII.

## Hosted QA checklist

- Public service → availability → booking → lookup journey
- Staff/admin authentication, role boundaries, and appointment workflows
- Concurrent booking conflict behavior
- Mobile and desktop layout; keyboard and screen-reader spot checks
- Error/empty/loading states and rate limiting
- UTC/local timezone boundaries and configured business hours
- No source maps, responses, headers, logs, or pages leak secrets/internal data
