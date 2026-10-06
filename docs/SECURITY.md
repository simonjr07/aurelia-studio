# Security Baseline

## Scope

This document describes protections implemented in Aurelia Studio, the assumptions required in production, and the risks intentionally left outside V1. It is an engineering security baseline, not a penetration test, compliance certification, or external security audit.

## Identity and access

Auth.js credentials authentication is limited to staff records stored in PostgreSQL. Passwords are hashed with bcrypt at cost 12 and are never returned, persisted as plaintext, or logged. Authentication failures use generic messages.

The JWT has an eight-hour maximum lifetime and contains only the user id, name, email, and role. Every protected request reloads the current user from PostgreSQL, so deleted or disabled accounts are denied and role changes take effect without waiting for token expiry.

Authorization is enforced at server boundaries:

1. ADMIN users can manage services, staff, assignments, schedules, appointments, and analytics.
2. STAFF users can access only appointments and schedule resources within their assigned scope.
3. Out-of-scope resource requests use non-enumerating not-found behavior.
4. Management APIs and domain services repeat authorization checks beside each mutation.
5. Navigation visibility is a convenience, not a security control.

Ordinary staff management can create and edit STAFF accounts only. The server forces the role and permits only `ACTIVE` or `DISABLED` status. ADMIN identities remain outside that mutation boundary.

## Input and mutation safety

All untrusted input is validated on the server with strict Zod schemas, normalization, length bounds, and allow lists. Prisma parameterizes queries, including raw analytics queries that accept validated values.

Critical mutations reload authoritative state inside a transaction. Client input cannot set prices, duration, end time, booking snapshots, roles, authoritative status, or availability results. Expected status and start time are used only to detect stale requests.

Browser mutations use POST requests or protected server actions. JSON mutation routes are not CORS enabled, authenticated routes use Auth.js cookies, and login redirects are restricted to internal destinations.

## Public booking protection

Booking references contain an `AUR-` prefix and 96 cryptographically random bits encoded with URL-safe base64. They are opaque, case-sensitive identifiers rather than sequential or customer-derived values.

Public lookup and every customer change require the exact booking reference and normalized booking email. Unknown references and incorrect emails return the same generic verification failure. Credentials are sent in POST bodies, never placed in page URLs, and are not persisted in browser storage after successful verification.

Login, booking creation, lookup, cancellation, and rescheduling use separate fixed-window rate limits. PostgreSQL stores only HMAC SHA-256 bucket identities, not raw email addresses, references, or network values. On Vercel, network identity is accepted only from the platform's trusted forwarding header. Outside Vercel, generic forwarding headers are ignored.

Customer cancellation and rescheduling recheck policy cutoffs, expected state, and expected start time inside the transaction. Rescheduling recalculates staff eligibility and availability and never trusts client-provided duration or end time.

## Data privacy and response safety

Public DTOs are explicit allow lists. They exclude customer email, phone, notes, staff email, authentication data, rate-limit records, and internal audit details. The verified booking response includes the assigned staff id only to support the existing professional selection during rescheduling. The server still requires the booking reference and email before any read or change.

Customer contact details appear only on authorized internal appointment details. They are excluded from appointment lists, analytics, URLs, logs, and screenshots. Analytics return aggregate data without booking references, customer PII, rate-limit facts, or revenue claims.

Sensitive API responses use `no-store`, verified booking management is marked `noindex`, and operational analytics are rendered dynamically without shared caching.

## Browser and application hardening

The application sends the following baseline protections:

1. Content Security Policy with same-origin resources, `form-action 'self'`, and `frame-ancestors 'none'`
2. `X-Content-Type-Options: nosniff`
3. `X-Frame-Options: DENY`
4. A restrictive referrer policy
5. A restrictive permissions policy
6. Disabled `X-Powered-By`

The current Next.js rendering path requires inline scripts and styles. The policy does not permit `unsafe-eval`, remote scripts, frames, or plugins in production. React escapes rendered text, and the repository does not use `dangerouslySetInnerHTML`.

No file upload surface exists in V1.

## Database and concurrency protection

PostgreSQL remains the final authority for active booking overlap. A GiST exclusion constraint prevents overlapping `PENDING` or `CONFIRMED` appointments for the same professional, even when concurrent requests both pass advisory availability checks.

Booking creation and rescheduling use transactional revalidation. Status transitions use conditional writes and append audit events. Schedule changes cannot silently rewrite existing bookings.

## Secrets and production configuration

Secrets are stored in ignored local environment files and in Vercel or Supabase secret storage. The repository does not contain production database URLs, authentication secrets, rate-limit secrets, passwords, or tokens.

Production uses:

1. A pooled TLS `DATABASE_URL` for application traffic
2. A direct or session TLS `DIRECT_URL` for controlled migrations
3. An independent high-entropy `AUTH_SECRET`
4. An independent high-entropy `RATE_LIMIT_SECRET`

Administrator provisioning accepts short-lived environment inputs, requires explicit production confirmation, refuses duplicate emails, and does not print the supplied password.

## Production debugging hygiene

The mixed-case booking reference investigation used temporary server-only diagnostics. Those diagnostics reported only boolean match facts, lengths, prefix checks, and safe error classifications. They never included raw references, email addresses, request bodies, cookies, tokens, connection strings, or environment values.

The validation defect was fixed, regression coverage was added, and the temporary diagnostics were removed.

## Hosted verification

Production QA at [aurelia-studio-orcin.vercel.app](https://aurelia-studio-orcin.vercel.app) verified protected administrator routes, reference and email booking access, public booking changes, authenticated appointment workflows, and the absence of obvious secret or private data exposure in the reviewed journeys.

These checks provide release evidence but do not replace ongoing monitoring, provider-level abuse controls, backup restoration exercises, or professional security assessment.

## Dependency review

The dependency audit recorded on 2026-10-02 reported six findings. Two moderate findings were in Vitest test tooling. Four high findings were inherited through Prisma CLI's optional MySQL dependency chain. Aurelia Studio uses PostgreSQL through `pg`, not MySQL, and Vitest is not shipped in the application runtime.

The available automatic remediation required breaking Prisma and Vitest version changes, so it was not applied blindly. Dependencies should be reassessed when compatible fixed releases are available.

## Residual risks and V1 exclusions

V1 does not include MFA, password reset, CAPTCHA, customer accounts, edge WAF rules, centralized JWT revocation, formal retention automation, or automated incident response. The JWT itself cannot be centrally revoked after issue, although every protected operation rechecks the current PostgreSQL user.

Production operations should maintain independent credentials, least-privilege database roles, monitored connection limits, tested backups, secret rotation procedures, and one controlled migration runner per release.
