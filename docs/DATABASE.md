# Database Foundation

TASK-002 implements PostgreSQL 17 with Prisma ORM 7.10. The local container listens on PostgreSQL’s normal port `5432` and is published to host port `5434` to avoid collision with other projects.

## Connections and tooling

- `DATABASE_URL` is the runtime URL consumed only by the server-side Prisma client.
- `DIRECT_URL` is preferred by `prisma7.config.ts` for migrations, deployment, status, Studio, and other CLI operations. Locally both URLs point to the same container; a future pooled production runtime URL can differ from the direct migration URL.
- Prisma 7 keeps connection URLs out of `schema.prisma` and requires the `@prisma/adapter-pg` driver adapter at runtime.
- Copy `.env.example` to an ignored `.env` for local commands. No production secrets belong in Git.

Useful commands are `db:generate`, `db:migrate`, `db:deploy`, `db:status`, `db:bootstrap`, `db:smoke`, and `db:studio`.

## Models and enums

The schema defines:

- `User` with `ADMIN`/`STAFF` roles and `ACTIVE`/`DISABLED` status.
- `Service` with public catalog state, duration, integer-cent price, and currency.
- `StaffService` as the unique `(staffId, serviceId)` assignment join.
- `AvailabilityRule` for recurring weekly staff availability.
- `BlockedTime` for one-off staff unavailability.
- `Booking` with `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, and `NO_SHOW` states.
- Append-only `BookingStatusEvent` rows with an optional authenticated actor.
- Append-only `BookingRescheduleEvent` rows preserving old/new staff and interval facts plus an optional authenticated actor and note.
- Singleton `BusinessSettings` for timezone, currency, booking rules, and public contacts.
- `RateLimitBucket` keyed by action, an HMAC identity, and window start. Login, booking creation, lookup, public cancellation, and public rescheduling use distinct actions.

Internal identifiers are UUIDs. Customer accounts are intentionally absent. Services and staff referenced by bookings use restrictive deletion, while every booking snapshots the service name, duration, price, currency, and timezone so catalog changes cannot rewrite history.

## Time representation

Bookings and blocks use PostgreSQL `TIMESTAMPTZ(3)` instants and are handled as UTC instants by application code. `timezoneSnapshot` records the IANA zone used when a booking was made.

Recurring `AvailabilityRule` values are deliberately not timestamps. `startLocalMinutes` and `endLocalMinutes` store minutes after local midnight (`0` through `1440`) in `BusinessSettings.timezone`; the end is exclusive. A migration check enforces a same-day non-empty range. This avoids pretending a weekly wall-clock rule is a UTC instant and leaves DST conversion to the future availability engine for a concrete date.

## Constraints and indexes

The initial migration adds database checks for positive durations, nonnegative prices, valid intervals, valid availability minutes, viable business rules, and rate-limit windows. It creates indexes for users, public services, both staff-service lookup directions, availability, block intervals, booking staff/service/status time queries, status history, public references, and rate-limit expiry.

### Authoritative overlap protection

The migration enables `btree_gist` and adds `Booking_staff_active_time_no_overlap`:

```sql
EXCLUDE USING gist (
  "staffId" WITH =,
  tstzrange("startAt", "endAt", '[)') WITH &&
)
WHERE ("status" IN ('PENDING', 'CONFIRMED'))
```

The half-open `[startAt, endAt)` range allows adjacent appointments. PostgreSQL evaluates the constraint atomically under concurrency, so overlapping `PENDING` or `CONFIRMED` rows for one staff member cannot both commit. `COMPLETED`, `CANCELLED`, and `NO_SHOW` rows preserve history without occupying future schedule capacity. Application availability checks remain advisory and must translate a constraint failure into a safe conflict response.

## Business settings bootstrap

The migration inserts the fixed `default` settings row with `ON CONFLICT DO NOTHING`: Aurelia Studio, `America/New_York`, USD, 60-minute lead time, 60-day horizon, 15-minute interval, 120-minute cancellation cutoff, and 240-minute reschedule cutoff. `npm run db:bootstrap` performs an idempotent create-only upsert and never overwrites later administrative changes.

## Development service catalogue

`npm run db:bootstrap:services` creates six realistic development services by unique slug. It is idempotent, uses empty-update upserts, never deletes records, and never overwrites a manually customized service. The command refuses `NODE_ENV=production` and is not run automatically during application startup. No user or credential records are created.

Public service queries require both `isPublished` and `isActive`. Detail queries join `StaffService` in the same database request, keep only assigned `ACTIVE` users, and select only their public-safe `id` and `name` fields.

## Availability reads

TASK-005 uses the existing `Service`, `StaffService`, `User`, `AvailabilityRule`, `BlockedTime`, `Booking`, and `BusinessSettings` models; no schema or migration change was required. The Prisma adapter fetches the active published service and assigned active staff, then loads only matching weekday rules and intervals intersecting the requested studio-local day. Booking reads filter to `PENDING` and `CONFIRMED`, matching the existing PostgreSQL exclusion constraint; `COMPLETED`, `CANCELLED`, and `NO_SHOW` do not block candidates.

## Booking writes and snapshots

TASK-006 also requires no schema or migration change. A single database transaction creates the `PENDING` `Booking` and its `BookingStatusEvent` (`null → PENDING`, no actor). The booking stores service name, duration, price, currency, and business timezone read inside that transaction; client values cannot populate snapshots. The unique opaque reference is retried by rerunning the whole transaction on the extremely unlikely collision. The GiST exclusion constraint converts the losing concurrent insert into a public conflict without leaving a booking or orphan event.

`npm run db:bootstrap:booking-demo` is an optional development-only, create-only bootstrap. It creates two non-login demo staff with undisclosed random credential material, assigns public active services, and adds missing weekday 09:00–17:00 rules. It refuses production and never overwrites existing records.

## Login rate-limit persistence

The authentication adapter stores fixed-window login counters in `RateLimitBucket`. Account and available network identifiers are separately HMAC-SHA256 digested with `RATE_LIMIT_SECRET`; plaintext emails and network values are never bucket keys. Atomic PostgreSQL upserts increment each counter, and authentication is rejected once either identity reaches ten attempts in a 15-minute window. Expired buckets are safe to remove in future maintenance work.

Booking creation uses the same persistence pattern with separate `BOOKING_CREATE` buckets: five attempts per 15-minute fixed window for normalized email and available network identity.

Public lookup adds no schema or migration. It reads `Booking` by the combined public reference and normalized customer email and explicitly projects only snapshots plus the related staff name. `PUBLIC_BOOKING_LOOKUP` uses separate HMAC buckets for reference, normalized email, and available network identity with ten attempts per 15-minute fixed window.

TASK-008 adds no schema or migration. Appointment list/detail queries use existing booking snapshots, staff relation, and chronologically ordered status events. Status mutation updates `Booking.status` and inserts `BookingStatusEvent` in one transaction; a conditional `id + current status` update prevents stale writes from silently overwriting a winner.

TASK-009 adds no schema or migration. It uses `Service`, STAFF `User`, and `StaffService` as designed. Database uniqueness on `Service.slug`, `User.email`, and `(staffId, serviceId)` remains authoritative. Assignment-set replacement is transactional. Service/staff deactivation replaces hard deletion, preserving restrictive booking relations and immutable service name/duration/price/currency snapshots. Staff names remain live relation data and therefore change on historical internal displays when renamed.

TASK-010 adds no schema or migration. `AvailabilityRule` continues storing weekday-local half-open minute ranges; `BlockedTime` stores timezone-resolved `TIMESTAMPTZ` instants. Application-level serializable transactions reject overlaps and active-booking conflicts. Removing rules or blocks deletes only those schedule rows and never rewrites existing bookings.

TASK-011 adds the `PUBLIC_BOOKING_CANCEL` and `PUBLIC_BOOKING_RESCHEDULE` limiter actions plus `BookingRescheduleEvent`. Rescheduling mutates only the existing booking's `staffId`, `startAt`, `endAt`, and `updatedAt`; its id, public reference, status, and service snapshots remain unchanged. Each successful move inserts an immutable event containing the former and new staff/interval, optional internal actor/note, and creation time. Public cancellation uses the existing append-only status history with a null actor.

The change transaction re-reads the booking, settings, service eligibility, schedule, blocks, and active bookings. Its availability read excludes the booking being moved, while the GiST exclusion constraint still decides overlapping active intervals under concurrency. Separate HMAC-only rate-limit buckets allow cancellation and rescheduling policy to evolve without altering login, creation, or lookup counters.

TASK-012 adds no schema or migration. Analytics reads existing `Booking`, `Service`, `User`, and `BusinessSettings` data through bounded aggregate queries. The range uses appointment `startAt` and studio-local half-open calendar boundaries. Daily buckets are computed in PostgreSQL with the parameterized configured IANA timezone rather than raw UTC dates. Status totals reflect current `Booking.status`; popular services group by stable service id and display the most recent in-range `serviceNameSnapshot`; staff workload excludes cancelled bookings and sums `durationMinutesSnapshot`. Historical inactive services and disabled staff remain visible, with the current live staff name used because staff names are not snapshotted.

## Remaining design decisions

Opening-hours storage, pending-hold expiry, notification delivery, retention, and any broader staff resource scope remain later-task decisions in [DECISIONS.md](DECISIONS.md).
