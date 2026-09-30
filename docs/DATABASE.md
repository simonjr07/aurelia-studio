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
- Singleton `BusinessSettings` for timezone, currency, booking rules, and public contacts.
- `RateLimitBucket` keyed by action, an HMAC identity, and window start for login, booking creation, and public lookup. TASK-003 actively uses `LOGIN`; other actions remain future work.

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

## Login rate-limit persistence

The authentication adapter stores fixed-window login counters in `RateLimitBucket`. Account and available network identifiers are separately HMAC-SHA256 digested with `RATE_LIMIT_SECRET`; plaintext emails and network values are never bucket keys. Atomic PostgreSQL upserts increment each counter, and authentication is rejected once either identity reaches ten attempts in a 15-minute window. Expired buckets are safe to remove in future maintenance work.

## Remaining design decisions

Opening-hours storage, pending-hold expiry, reschedule lineage, customer verification, retention, and staff resource scope remain later-task decisions in [DECISIONS.md](DECISIONS.md).
