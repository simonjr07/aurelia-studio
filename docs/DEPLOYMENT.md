# Deployment Plan

Deployment is planned for TASK-015; no Vercel project, Supabase project, production credential, or hosted environment is created in TASK-001.

## Environments

- **Local:** Next.js development server and PostgreSQL 17 in Docker Compose at `localhost:5434` (`5432` inside the container).
- **Preview:** Vercel preview deployment with an isolated/non-production database strategy and synthetic data.
- **Production:** Vercel-hosted Next.js connected over TLS to Supabase PostgreSQL in a compatible region.

Each environment receives separate database/auth secrets, uses the same committed migrations, and must not share production customer data with development or preview.

## CI and release path

GitHub Actions provisions a PostgreSQL 17 service, applies committed migrations, runs the smoke and real database tests, then runs lint, typecheck, Vitest, and the production build. Before production:

1. Review dependency and migration changes.
2. Back up the database and verify migration rollback/recovery notes.
3. Apply migrations once through a controlled release step; do not let every serverless instance race migrations.
4. Deploy the immutable application build.
5. Run hosted smoke tests for public and authenticated critical paths.
6. Verify logs, security headers, redirects, timezone display, responsive layout, and accessibility.
7. Roll back the application and restore/forward-fix data according to the migration’s documented recovery plan if verification fails.

## Environment variables

- `DATABASE_URL`: runtime application connection, pooled in production when appropriate.
- `DIRECT_URL`: direct Prisma CLI and migration connection.
- `DATABASE_POOL_MAX`, `DATABASE_POOL_IDLE_TIMEOUT_MS`, and `DATABASE_POOL_CONNECTION_TIMEOUT_MS`: optional bounded runtime pool tuning.

The committed `.env.example` contains development-only local values. Real environment files remain ignored. Future Auth.js and observability variables will be documented when introduced.

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
