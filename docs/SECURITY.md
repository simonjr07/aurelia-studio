# Security Baseline

## Identity and access

- Auth.js credentials authentication is restricted to staff users stored in PostgreSQL.
- Passwords are hashed with bcrypt work factor 12; plaintext passwords are never returned, persisted, or logged.
- Authentication failures are generic. The JWT expires after eight hours and contains only id, name, email, and role.
- Every protected request re-reads the user so deleted or disabled accounts are denied and role changes take effect without waiting for expiry.
- Authorize every protected server operation with `requireStaff()` or `requireAdmin()` plus the future resource-scope policy. UI visibility, route naming, and client state are not controls.
- Appointment queries and mutations enforce resource scope server-side: staff are limited to `booking.staffId === actor.id`; admins may access all. Out-of-scope ids use non-enumerating not-found behavior.
- Reserve service/staff/settings administration for `ADMIN`; document and test each `STAFF` permission.
- Service/staff management pages call `requireAdmin()`, and every management API plus server-only mutation independently asserts ADMIN. Staff links being hidden is only presentation.
- Ordinary management can create and edit STAFF only; role is forced server-side and ADMIN identities are outside the editable query boundary. Disablement takes effect through the existing database-backed current-user recheck.
- Schedule mutations re-resolve an active actor and authorize the target resource server-side: ADMIN may manage STAFF accounts, while STAFF may use only their own id. Cross-staff reads/deletes are hidden as not found, and disabled targets cannot receive new entries.
- Analytics navigation is ADMIN-only, and both the `/admin/analytics` page and its server-only query service independently assert an active ADMIN before reading aggregates. No public or STAFF analytics endpoint exists.

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
- Rate-limit login, booking creation, public lookup, reschedule, and cancellation. Combine trusted platform network signals with pseudonymous action identifiers where appropriate.
- Keep PostgreSQL overlap enforcement as the last line of defense against concurrent double booking.
- Public booking input is a strict allow-list; price, duration, end time, snapshots, status, and availability are always re-derived inside the transaction.
- Booking throttling permits five attempts per 15-minute window for both normalized email and available network identity. Only HMAC-SHA256 keys are persisted, and failures do not disclose prior bookings.
- Lookup throttling permits ten attempts per 15-minute window for reference, normalized email, and available network identity. No plaintext lookup identity is persisted.
- Public cancellation and rescheduling re-verify reference plus normalized email on every request and deliberately share the lookup's generic unknown/wrong-email response. Each action has its own five-attempt, 15-minute HMAC buckets for reference, email, and available network identity; those counters cannot affect login or booking creation.
- Customer change cutoffs and expected state/start are rechecked inside the transaction. A reschedule never trusts a client duration, end time, staff eligibility, or availability result; it excludes only the current booking before PostgreSQL enforces final overlap safety.

## PII and information exposure

- Collect only contact data required to deliver and manage an appointment.
- Restrict staff-visible customer fields to operational need; do not expose internal user data in public responses.
- Customer email, phone, and notes are visible only on an authorized internal appointment detail page, never lists, URLs, logs, or analytics.
- Redact emails, phone numbers, session values, tokens, notes, and credentials from logs/errors/analytics.
- Define retention and deletion policy before production. Backups inherit the same sensitivity.
- Avoid placing PII or secrets in URLs, cache keys, client telemetry, test fixtures, screenshots, or commit history.
- Verified booking responses are private/no-store, and `/manage-booking` is `noindex`. The browser clears verification credentials after success and does not persist them.
- Analytics DTOs are aggregate allow-lists: they exclude customer names, emails, phones, notes, booking references, rate-limit buckets, and revenue-like values. Raw database errors are not rendered. Date inputs are strictly validated and bounded to 365 inclusive days; raw SQL uses Prisma parameterization. The page is dynamically rendered with revalidation disabled so operational data cannot leak through a shared public cache.

## Secrets and environment

- Store secrets in ignored local environment files and Vercel/Supabase secret stores. Commit only a documented `.env.example` with empty/non-sensitive placeholders when variables exist.
- Use separate development, preview, and production credentials with least privilege and rotation support.
- Never commit database URLs, Auth.js secrets, passwords, tokens, or production customer data.
- Prevent public environment prefixes from being applied to server secrets.

`AUTH_SECRET` signs authentication state. `RATE_LIMIT_SECRET` independently HMACs login-limiter identities and must be at least 32 characters. Administrator provisioning reads credentials from process environment variables and refuses production execution unless both the documented mode flag and exact confirmation phrase are supplied.

Staff temporary passwords are accepted only by the create endpoint, bounded for bcrypt, hashed at cost 12 before persistence, omitted from all return selections, and never logged or displayed again. Unique email/slug database failures are translated to safe messages without raw Prisma details.

Blocked-time reasons remain internal to authorized schedule pages. Schedule DTOs exclude password data, customer data, booking details, and rate-limit state. Booking-overlap errors reveal only that an appointment conflicts, not its customer or identity.

## Operational hardening

Use HTTPS, secure headers, dependency review, protected branches/CI, migration backups, safe error pages, audit events, and actionable monitoring. Security review includes authorization bypass, ID enumeration, mass assignment, injection, sensitive caching, concurrency, and denial-of-service risks. Suspected incidents should support credential rotation, account disablement, log review, impact assessment, and recovery.

## Task #14 production hardening

The application sends a baseline policy on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a strict cross-origin referrer policy, a restrictive permissions policy, and CSP with same-origin resources, `form-action 'self'`, and `frame-ancestors 'none'`. `X-Powered-By` is disabled. The CSP permits inline scripts and styles because the current Next.js/React rendering path requires them; it does not permit `unsafe-eval`, remote scripts, frames, or plugins. A nonce-based CSP can be evaluated later if the rendering architecture changes.

Rate limits use independent HMAC-SHA256 buckets per action and never persist raw email, reference, or network values. On Vercel, network identity is read only from Vercel's trusted forwarding header. Outside Vercel, client-supplied forwarding headers are intentionally ignored; email/reference buckets remain the effective application-level defense. This is not a substitute for Vercel edge/WAF controls, DDoS protection, or abuse monitoring.

Public verification DTOs are explicit allow-lists. The verified-booking response includes the assigned staff UUID solely to preserve the existing "keep this professional" reschedule flow; it is not sufficient to access or change a booking, and the server re-verifies reference plus normalized email, scopes the booking, and independently validates staff eligibility. It excludes staff email, customer email/phone/note, internal notes, audit data, password/auth data, and limiter data.

All browser mutations use POST or protected server actions; there are no GET mutations. Authenticated browser requests use Auth.js cookies and same-origin application routes, while JSON mutation requests are not CORS-enabled. Login redirects use internal application destinations. React rendering escapes supplied text, and the repository contains no `dangerouslySetInnerHTML` use. Prisma calls are parameterized; analytics raw SQL uses Prisma parameters for values, including its validated timezone.

Sensitive API responses are `no-store`; verified booking management is `noindex`, and operational analytics are dynamically rendered without shared caching. Public marketing pages remain indexable. No file-upload surface exists in V1.

### Deployment and residual risks

Production requires HTTPS, independent `AUTH_SECRET` and `RATE_LIMIT_SECRET` values, a pooled TLS `DATABASE_URL` for runtime traffic, and a direct TLS `DIRECT_URL` for controlled migrations. Use separate preview/production credentials, least-privilege database roles, backups with restoration drills, and one migration runner per release.

Residual risks intentionally outside V1 include no MFA, password reset, CAPTCHA, customer account model, or edge/WAF rate limiting. JWTs have an eight-hour maximum lifetime; protected operations re-check the active user in PostgreSQL so role, disablement, and deletion changes take effect promptly, but an already-issued browser token cannot itself be centrally revoked. This review and its automated checks are not a substitute for hosted browser QA, penetration testing, monitoring, or incident-response exercises.

### Dependency audit (2026-10-02)

`npm audit` reported six findings: two moderate Vitest/@vitest-mocker findings in test tooling and four high findings through Prisma CLI's optional MySQL-related dependency chain (`@prisma/config` → `deepmerge-ts` and `mysql2`). The application uses PostgreSQL through `pg`, not MySQL, and Vitest is not shipped with the application runtime. The offered remediation downgrades Prisma to a breaking major version and upgrades Vitest across a breaking major version, so no automatic fix was applied in this hardening pass. Reassess after Prisma and Vitest publish compatible non-vulnerable updates; do not use `npm audit fix --force` blindly.

## Hosted verification status

No hosted security evidence is claimed yet. Before launch, verify the deployed production hostname—not merely a preview—for CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, framing protection, absence of `X-Powered-By`, no-store booking responses, and noindex private routes. Review Vercel logs and Supabase connection behavior without copying secrets, tokens, customer data, or connection strings into the repository.
