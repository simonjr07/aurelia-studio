# Security Baseline

## Identity and access

- Auth.js credentials authentication is restricted to staff users stored in PostgreSQL.
- Passwords are hashed with bcrypt work factor 12; plaintext passwords are never returned, persisted, or logged.
- Authentication failures are generic. The JWT expires after eight hours and contains only id, name, email, and role.
- Every protected request re-reads the user so deleted or disabled accounts are denied and role changes take effect without waiting for expiry.
- Authorize every protected server operation with `requireStaff()` or `requireAdmin()` plus the future resource-scope policy. UI visibility, route naming, and client state are not controls.
- Appointment queries and mutations enforce resource scope server-side: staff are limited to `booking.staffId === actor.id`; admins may access all. Out-of-scope ids use non-enumerating not-found behavior.
- Reserve service/staff/settings administration for `ADMIN`; document and test each `STAFF` permission.

## Input and mutation safety

- Validate all untrusted input server-side with strict Zod schemas, normalization, size limits, and allow-lists.
- Use Prisma parameterization and avoid interpolated raw SQL. Review any hand-written migration SQL.
- Protect state changes against cross-site request abuse using framework/Auth.js mechanisms and same-origin design.
- Re-read relevant state inside transactions; never trust a client-supplied price, duration, role, status, or availability result.
- Status actors and audit `fromStatus` always come from the active session/database state. Client expected status is used only to detect staleness, never as the audit fact.

## Public bookings and abuse controls

- Generate public booking references with cryptographically secure randomness and enough entropy to resist enumeration.
- Booking references use a recognizable `AUR-` prefix plus 96 bits from `randomBytes`, encoded as URL-safe base64 without sequential/customer-derived material.
- Require a second verification factor or signed management token for booking details/changes; do not reveal whether a guessed reference exists.
- Read-only public lookup requires the exact opaque reference plus normalized booking email in a POST body. Wrong-email and unknown-reference attempts share one response and one query shape.
- Rate-limit login, availability abuse, booking creation, public lookup, reschedule, and cancellation. Combine coarse IP/network signals with pseudonymous action identifiers where appropriate.
- Keep PostgreSQL overlap enforcement as the last line of defense against concurrent double booking.
- Public booking input is a strict allow-list; price, duration, end time, snapshots, status, and availability are always re-derived inside the transaction.
- Booking throttling permits five attempts per 15-minute window for both normalized email and available network identity. Only HMAC-SHA256 keys are persisted, and failures do not disclose prior bookings.
- Lookup throttling permits ten attempts per 15-minute window for reference, normalized email, and available network identity. No plaintext lookup identity is persisted.

## PII and information exposure

- Collect only contact data required to deliver and manage an appointment.
- Restrict staff-visible customer fields to operational need; do not expose internal user data in public responses.
- Customer email, phone, and notes are visible only on an authorized internal appointment detail page, never lists, URLs, logs, or analytics.
- Redact emails, phone numbers, session values, tokens, notes, and credentials from logs/errors/analytics.
- Define retention and deletion policy before production. Backups inherit the same sensitivity.
- Avoid placing PII or secrets in URLs, cache keys, client telemetry, test fixtures, screenshots, or commit history.
- Verified booking responses are private/no-store, and `/manage-booking` is `noindex`. The browser clears verification credentials after success and does not persist them.

## Secrets and environment

- Store secrets in ignored local environment files and Vercel/Supabase secret stores. Commit only a documented `.env.example` with empty/non-sensitive placeholders when variables exist.
- Use separate development, preview, and production credentials with least privilege and rotation support.
- Never commit database URLs, Auth.js secrets, passwords, tokens, or production customer data.
- Prevent public environment prefixes from being applied to server secrets.

`AUTH_SECRET` signs authentication state. `RATE_LIMIT_SECRET` independently HMACs login-limiter identities and must be at least 32 characters. Administrator provisioning reads credentials from process environment variables and refuses production execution unless both the documented mode flag and exact confirmation phrase are supplied.

## Operational hardening

Use HTTPS, secure headers, dependency review, protected branches/CI, migration backups, safe error pages, audit events, and actionable monitoring. Security review includes authorization bypass, ID enumeration, mass assignment, injection, sensitive caching, concurrency, and denial-of-service risks. Suspected incidents should support credential rotation, account disablement, log review, impact assessment, and recovery.
