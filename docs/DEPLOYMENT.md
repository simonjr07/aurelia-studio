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
- `AUTH_SECRET`: high-entropy Auth.js signing secret.
- `RATE_LIMIT_SECRET`: independent high-entropy HMAC key for pseudonymous login limiter identities; at least 32 characters.
- `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`: short-lived operator inputs for `npm run admin:provision`; unset after use.
- `ADMIN_PROVISION_MODE=production` and `ADMIN_PROVISION_CONFIRM=PROVISION_AURELIA_ADMIN_IN_PRODUCTION`: explicit dual guard required only when provisioning with `NODE_ENV=production`.

The committed `.env.example` contains development-only local database values and empty secret placeholders. Real environment files remain ignored. Auth.js trusts the deployment's validated host headers rather than requiring a hard-coded `AUTH_URL`; the platform must therefore reject arbitrary host headers at its edge. Preview and production secrets must be generated independently.

Provision the first production administrator as a controlled one-off operation after migrations and before staff QA. Supply the guarded variables only for that process, verify the generic success message, then remove them from the operator environment. The command refuses duplicate emails and does not print the password.

## Database considerations

- Confirm Prisma/Supabase connection pooling and serverless connection limits.
- Keep the database region close to Vercel execution.
- Apply least-privilege roles and TLS requirements.
- Enable automated backups and test restoration before launch.
- Monitor failed constraints, slow scheduling queries, connection saturation, and migration health without logging PII.

## Security release checks

Vercel terminates HTTPS; keep HSTS behavior at the platform/domain layer rather than forcing it during local development. The application supplies CSP, anti-framing, MIME, referrer, and permissions headers, and disables `X-Powered-By`. Verify those headers in a preview deployment after any Next.js upgrade.

The runtime rate limiter accepts a network signal only from Vercel's trusted forwarding header. It deliberately ignores generic forwarding headers outside that platform, so application HMAC buckets based on email/reference remain the fallback defense. Configure platform-level WAF/rate controls separately before launch.

Run database migrations from the direct TLS connection in one controlled release job. Application instances use the pooled runtime connection and must never run migrations at startup. Confirm Supabase SSL options and serverless connection caps in the actual project configuration before deployment.

## Hosted QA checklist

- Public service → availability → booking → lookup journey
- Staff/admin authentication, role boundaries, and appointment workflows
- Concurrent booking conflict behavior
- Mobile and desktop layout; keyboard and screen-reader spot checks
- Error/empty/loading states and rate limiting
- UTC/local timezone boundaries and configured business hours
- No source maps, responses, headers, logs, or pages leak secrets/internal data

## Task #15 operator runbook (pending account access)

No Supabase or Vercel account/project has been accessed from this repository. Complete the following only in a dedicated Aurelia Studio production project—never in another application's database.

1. Create an isolated Supabase PostgreSQL project in the intended region and enable the connection mode required by the project. Record no password or hostname in Git.
2. Set `DATABASE_URL` in Vercel Production to Supabase's pooled TLS connection string suitable for application traffic. Set `DIRECT_URL` only for the controlled migration environment to Supabase's direct/session TLS connection string. Keep both server-only.
3. Generate independent high-entropy `AUTH_SECRET` and `RATE_LIMIT_SECRET` values in the secret manager. Do not reuse local, preview, or unrelated-project values.
4. Create a dedicated Vercel project for `simonjr07/aurelia-studio`, select Next.js, and configure `main` as the sole production source. Previews must use an isolated database or intentionally limited database functionality; they must not mutate production data by default.
5. From one controlled runner with `DIRECT_URL`, run `npm run db:deploy`. Confirm every committed migration, including the GiST extension and booking exclusion constraint, completes before deploying application instances. Never use `prisma db push` in production and never migrate at runtime.
6. Confirm the singleton business settings row exists before editing it. Its expected portfolio baseline is `America/New_York`, `USD`, 60-minute lead time, 60-day horizon, 15-minute interval, 120-minute cancellation cutoff, and 240-minute reschedule cutoff. Do not overwrite an existing row blindly.
7. Bootstrap only the fictional service catalogue through a create-only production-safe process. Create fictional staff, assignments, and recurring availability through authorized administration; never seed test bookings or real customer data.
8. Provision the minimum active ADMIN with `ADMIN_PROVISION_MODE=production` and `ADMIN_PROVISION_CONFIRM=PROVISION_AURELIA_ADMIN_IN_PRODUCTION`, plus short-lived `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` environment values. Run `npm run admin:provision`, then remove those operator values. The password must never be printed, committed, or shown in screenshots.
9. Deploy the merged `main` commit. Record the real URL, timestamp, and SHA only after Vercel shows that exact production deployment.
10. Run the hosted QA checklist, inspect headers/logs/connection behavior, capture screenshots with fictional data only, then cancel or clean up temporary QA bookings according to the application’s normal workflow.

## Rollback and secret response

Roll back the immutable Vercel deployment only after identifying whether the failure is application-only or migration/data-related. Do not roll back database schema by guesswork; prefer a documented forward fix or a tested restore path. If a secret is suspected exposed, rotate it in the provider, redeploy, invalidate affected sessions as appropriate, review access/logs without copying sensitive payloads, and document the incident privately.

## Hosted evidence status

As of this repository update, hosted deployment, migration execution, provider logs, screenshots, and hosted QA are **not yet performed**. This document is a runbook, not evidence that those actions succeeded.
