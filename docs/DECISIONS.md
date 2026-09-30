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

The foundation includes only current UI/tooling dependencies and Vitest. Prisma, Auth.js, bcrypt, Zod, and database infrastructure arrive with the first task that uses them, avoiding unused configuration.

## Human approval required

| Decision | Options / impact |
| --- | --- |
| Studio timezone and default currency | Required before seed data and local-time behavior are finalized. |
| Pending bookings occupy schedule | Decide whether `PENDING` blocks indefinitely, expires as a short hold, or is omitted in favor of immediate confirmation. This changes the exclusion predicate. |
| Public lookup verification | Reference + email, reference + phone fragment, or signed management token; balance convenience and privacy. |
| Reschedule history model | Mutate one booking with structured events, or cancel/replace with linked bookings; replacement gives clearer immutable history. |
| Staff appointment scope | Assigned appointments only, all operational appointments, or configurable permission. |
| Staff blocked-time scope | Own time only versus manager-approved broader access. |
| Cancellation/reschedule cutoffs | Define customer and staff policies, reasons, and override authority. |
| Data retention | Retention/deletion periods for contact data, audit events, logs, and expired rate-limit records. |
| Opening-hours model | Structured child rows are normalized; JSON settings are simpler but harder to constrain/query. |
| “Any available” assignment | Earliest slot, fair rotation, deterministic ordering, or another business preference. |
