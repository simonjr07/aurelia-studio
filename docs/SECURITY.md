# Security Baseline

## Identity and access

- Use Auth.js credentials authentication for staff users only.
- Hash passwords with bcrypt using an intentionally selected work factor; never encrypt or log plaintext passwords.
- Use generic authentication errors, secure session cookies, session rotation/expiry, and inactive-account checks.
- Authorize every protected server operation by role and resource scope. UI visibility, route naming, and client state are not controls.
- Reserve service/staff/settings administration for `ADMIN`; document and test each `STAFF` permission.

## Input and mutation safety

- Validate all untrusted input server-side with strict Zod schemas, normalization, size limits, and allow-lists.
- Use Prisma parameterization and avoid interpolated raw SQL. Review any hand-written migration SQL.
- Protect state changes against cross-site request abuse using framework/Auth.js mechanisms and same-origin design.
- Re-read relevant state inside transactions; never trust a client-supplied price, duration, role, status, or availability result.

## Public bookings and abuse controls

- Generate public booking references with cryptographically secure randomness and enough entropy to resist enumeration.
- Require a second verification factor or signed management token for booking details/changes; do not reveal whether a guessed reference exists.
- Rate-limit login, availability abuse, booking creation, public lookup, reschedule, and cancellation. Combine coarse IP/network signals with pseudonymous action identifiers where appropriate.
- Keep PostgreSQL overlap enforcement as the last line of defense against concurrent double booking.

## PII and information exposure

- Collect only contact data required to deliver and manage an appointment.
- Restrict staff-visible customer fields to operational need; do not expose internal user data in public responses.
- Redact emails, phone numbers, session values, tokens, notes, and credentials from logs/errors/analytics.
- Define retention and deletion policy before production. Backups inherit the same sensitivity.
- Avoid placing PII or secrets in URLs, cache keys, client telemetry, test fixtures, screenshots, or commit history.

## Secrets and environment

- Store secrets in ignored local environment files and Vercel/Supabase secret stores. Commit only a documented `.env.example` with empty/non-sensitive placeholders when variables exist.
- Use separate development, preview, and production credentials with least privilege and rotation support.
- Never commit database URLs, Auth.js secrets, passwords, tokens, or production customer data.
- Prevent public environment prefixes from being applied to server secrets.

## Operational hardening

Use HTTPS, secure headers, dependency review, protected branches/CI, migration backups, safe error pages, audit events, and actionable monitoring. Security review includes authorization bypass, ID enumeration, mass assignment, injection, sensitive caching, concurrency, and denial-of-service risks. Suspected incidents should support credential rotation, account disablement, log review, impact assessment, and recovery.
