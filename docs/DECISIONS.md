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

### ADR-006 — Add dependencies only when their boundary exists

Dependencies arrive with the first task that uses them. TASK-002 added Prisma 7, the PostgreSQL adapter/driver, dotenv, and TS script tooling. TASK-003 added Auth.js, bcrypt, and Zod for implemented authentication boundaries.

### ADR-007 — Separate runtime and migration URLs

`DATABASE_URL` is reserved for the application’s pooled runtime connection. Prisma CLI operations prefer `DIRECT_URL` through `prisma7.config.ts`. They are identical locally but can diverge for a future Supabase pooler.

### ADR-008 — Represent weekly availability as local minutes

Recurring availability uses integer minutes after midnight with a weekday, interpreted in the business IANA timezone. A weekly wall-clock rule is not a UTC instant; this representation avoids misleading timestamp conversions and is straightforward to constrain.

### ADR-009 — Active overlap is a database invariant

The initial migration enables `btree_gist` and excludes overlapping `[startAt, endAt)` ranges for the same staff member when status is `PENDING` or `CONFIRMED`. Terminal/historical states do not occupy capacity.

### ADR-010 — Short JWT session plus database-backed current identity

Use an eight-hour Auth.js JWT containing a narrow identity snapshot, but re-read the user on every protected request. This avoids a session table while making account deletion, disablement, and role changes authoritative immediately at the application boundary.

### ADR-011 — One staff login and one protected workspace

`STAFF` and `ADMIN` share `/admin/login` and `/admin`. Server policy determines access; role-filtered navigation is only a convenience. Separate login surfaces would duplicate identity handling without strengthening authorization.

### ADR-012 — Pseudonymous persistent login throttling

Enforce ten attempts per 15-minute fixed window for both normalized account and available network identity. Store only HMAC-SHA256 identities and counters in PostgreSQL so throttling works across application instances without persisting raw emails or network values.

### ADR-013 — Public visibility is a query invariant

Every public service list, detail, and metadata lookup applies both `isPublished = true` and `isActive = true`. Direct private slugs return 404 rather than relying on UI filtering. Public projections are explicit and never expose complete database records.

### ADR-014 — Explicit assignment makes an active user service-eligible

`StaffService` is the deliberate bookability signal for the current schema. An assigned active `STAFF` or `ADMIN` may be named publicly; an administrator is never included merely because of role. Availability rules will add time-specific eligibility in TASK-005.

### ADR-015 — Development catalogue bootstrap is create-only

Keep demo services out of migrations and runtime startup. A dedicated development-only command creates missing unique slugs with empty updates, preserving manual edits and refusing production execution.

### ADR-016 — Luxon owns wall-clock and DST conversion

Use Luxon for IANA-zone conversion rather than JavaScript machine-local `Date` arithmetic or hand-written offset tables. A local grid position that does not exist during spring-forward is skipped; an ambiguous fall-back position deterministically chooses the earlier instant and is emitted once. Candidate durations remain elapsed instant minutes, while local window fit is checked against the requested wall-clock range.

### ADR-017 — Availability is dynamic and advisory

Expose one validated local date through a dynamic `GET /api/availability` route with `no-store` responses. The service aggregates eligible staff by start instant but never assigns or reserves a staff member; TASK-006 performs transactional revalidation and creation separately.

### ADR-018 — Revalidate and create within one booking transaction

The availability response is never trusted at submission. Re-run the TASK-005 engine against the transaction client, then derive end time and snapshots and create the booking plus initial event in the same transaction. PostgreSQL’s exclusion constraint resolves races after application revalidation.

### ADR-019 — Deterministic any-available assignment

For the requested instant, sort currently available eligible staff by stable UUID and choose the first. This is predictable and race-safe with the overlap constraint; fairness/rotation can be introduced later if the business chooses it.

### ADR-020 — Opaque references and pseudonymous booking throttling

Use `AUR-` plus 96 cryptographically random URL-safe bits (20 characters total), retrying the whole transaction on unique collision. Enforce five attempts per 15 minutes for both normalized email and available network identity, persisted only as HMAC-SHA256 bucket keys.

### ADR-021 — Verify public lookup with reference plus email

Require both the opaque reference and normalized booking email in one POST-only lookup. Query both together and return the same failure for unknown reference and wrong email. Keep successful detail in transient page state rather than issuing a customer session for this read-only V1.

### ADR-022 — Snapshot-backed, non-cacheable public detail

Return an allow-listed DTO using booking snapshots for service name, duration, price, currency, and timezone. Current staff name is the only related-user field. Mark the management route `noindex` and every lookup response private/no-store. Lookup is deliberately read-only until cancellation and rescheduling policy is implemented.

### ADR-023 — Staff ownership is the appointment resource boundary

Staff may query and mutate only bookings whose `staffId` equals their active database identity; admins may operate across staff. Return not-found for out-of-scope direct access so appointment existence is not disclosed.

### ADR-024 — Explicit state machine with expected-state writes

Centralize allowed transitions and require the client’s rendered status as an optimistic concurrency token. Inside one transaction, re-read authoritative status, validate it, conditionally update the same status, and create the audit event. Stale requests receive a conflict and cannot create impossible history.

## Human approval required

| Decision | Options / impact |
| --- | --- |
| Studio timezone and default currency | Bootstrap is set by TASK-002 to `America/New_York` and USD; business confirmation is still required before production. |
| Pending hold expiry | `PENDING` currently occupies capacity. Define its expiry/cleanup policy before public booking creation. |
| Reschedule history model | Mutate one booking with structured events, or cancel/replace with linked bookings; replacement gives clearer immutable history. |
| Staff appointment scope | Assigned appointments only, all operational appointments, or configurable permission. |
| Staff blocked-time scope | Own time only versus manager-approved broader access. |
| Cancellation/reschedule cutoffs | Define customer and staff policies, reasons, and override authority. |
| Data retention | Retention/deletion periods for contact data, audit events, logs, and expired rate-limit records. |
| Opening-hours model | Structured child rows are normalized; JSON settings are simpler but harder to constrain/query. |
