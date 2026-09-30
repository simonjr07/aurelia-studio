# Architecture Decision Log

## Accepted

### ADR-001 — Modular monolith

Use one Next.js application with explicit UI, application, domain, infrastructure, auth, and validation boundaries. This is simpler to deploy and transact than distributed services while keeping scheduling rules independently testable.

### ADR-002 — Server-first App Router

Use Server Components by default and Client Components only for browser interaction. Mutations enter through thin Server Actions or Route Handlers and share application use cases.

### ADR-003 — PostgreSQL is the booking-conflict authority

Availability checks improve UX but are stale by nature. Active staff intervals use `[startAt, endAt)` semantics, and a PostgreSQL exclusion constraint plus transactional mutation will be the final overlap guard.

### ADR-004 — UTC instants plus an IANA business timezone

Persist actual appointment instants with timezone-aware types. Evaluate recurring hours in the configured IANA timezone and return timezone context to clients.

### ADR-005 — Preserve operational history

Deactivate catalog/staff records rather than destroying referenced history. Snapshot booking-critical service values and append status events.

### ADR-006 — Defer dependencies until their task

Dependencies arrive with the first task that uses them. TASK-002 added Prisma 7, the PostgreSQL adapter/driver, dotenv, and TS script tooling; Auth.js, bcrypt, and Zod remain deferred.

### ADR-007 — Separate runtime and migration URLs

`DATABASE_URL` is reserved for the application’s pooled runtime connection. Prisma CLI operations prefer `DIRECT_URL` through `prisma7.config.ts`. They are identical locally but can diverge for a future Supabase pooler.

### ADR-008 — Represent weekly availability as local minutes

Recurring availability uses integer minutes after midnight with a weekday, interpreted in the business IANA timezone. A weekly wall-clock rule is not a UTC instant; this representation avoids misleading timestamp conversions and is straightforward to constrain.

### ADR-009 — Active overlap is a database invariant

The initial migration enables `btree_gist` and excludes overlapping `[startAt, endAt)` ranges for the same staff member when status is `PENDING` or `CONFIRMED`. Terminal/historical states do not occupy capacity.

## Human approval required

| Decision | Options / impact |
| --- | --- |
| Studio timezone and default currency | Bootstrap is set by TASK-002 to `America/New_York` and USD; business confirmation is still required before production. |
| Pending hold expiry | `PENDING` currently occupies capacity. Define its expiry/cleanup policy before public booking creation. |
| Public lookup verification | Reference + email, reference + phone fragment, or signed management token; balance convenience and privacy. |
| Reschedule history model | Mutate one booking with structured events, or cancel/replace with linked bookings; replacement gives clearer immutable history. |
| Staff appointment scope | Assigned appointments only, all operational appointments, or configurable permission. |
| Staff blocked-time scope | Own time only versus manager-approved broader access. |
| Cancellation/reschedule cutoffs | Define customer and staff policies, reasons, and override authority. |
| Data retention | Retention/deletion periods for contact data, audit events, logs, and expired rate-limit records. |
| Opening-hours model | Structured child rows are normalized; JSON settings are simpler but harder to constrain/query. |
| “Any available” assignment | Earliest slot, fair rotation, deterministic ordering, or another business preference. |
