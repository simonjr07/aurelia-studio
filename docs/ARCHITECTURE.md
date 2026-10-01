# Architecture

## System context

Local and initial application flow:

```text
Browser → Next.js App Router → server-side application/domain logic → Prisma → PostgreSQL
```

Planned production flow:

```text
Browser → Vercel / Next.js → server-side application/domain logic → Prisma → Supabase PostgreSQL
```

This is a modular monolith: one deployable application with deliberate internal boundaries. That keeps operations simple without mixing presentation, authorization, scheduling policy, and persistence.

## Boundaries

- **UI (`src/app`, `src/components`):** routes, layouts, server-rendered views, forms, and small interactive client components. UI may format view data but does not decide booking eligibility or authorization.
- **Server actions / route handlers:** trusted entry points for mutations and HTTP endpoints. They authenticate, parse inputs, invoke use cases, and translate known outcomes into responses. Public APIs use route handlers when an HTTP contract is useful; tightly coupled form mutations may use server actions.
- **Domain (`src/features/<feature>/domain`):** framework-independent rules such as slot calculation, status transitions, cancellation eligibility, and overlap semantics. It accepts typed data and clocks/timezones explicitly.
- **Application services (`src/features/<feature>/application`):** orchestrate domain rules, authorization, repositories, and transactions for one use case.
- **Repositories / database (`src/server/db`, feature repositories):** Prisma access, query composition, persistence mapping, and transaction boundaries. Prisma types should not become the public contract of every layer. `src/server/db/prisma.ts` is server-only and owns the pooled runtime singleton.
- **Authentication (`src/auth.ts`, `src/server/auth`):** Auth.js configuration, credential verification, login abuse controls, session shaping, database-backed current-actor resolution, and role policy.
- **Public services (`src/server/services`):** server-only public query entry points, explicit Prisma projections, visibility filtering, eligible-staff projection, and development catalogue bootstrap policy.
- **Availability (`src/server/availability`):** pure wall-clock slot generation plus a bounded Prisma adapter that supplies service, staff, recurring rules, blocks, and capacity-blocking bookings to the domain core.
- **Booking creation (`src/server/bookings`):** strict public validation, opaque references, persistent abuse controls, transactional scheduling revalidation, snapshot creation, and database-conflict translation.
- **Public booking lookup (`src/server/bookings`):** strict reference/email verification, shared persistent abuse controls, snapshot-backed safe projection, and generic anti-enumeration outcomes.
- **Authorization:** centralized policy checks called from every protected server entry point. Page visibility is not an authorization control.
- **Validation:** Zod schemas at trust boundaries. Validation shapes syntax; domain code still evaluates contextual business rules.

## Intended source organization

```text
src/
  app/                  # App Router routes, layouts, and route handlers
  components/           # Reusable, domain-neutral UI
  features/             # Booking, availability, services, staff, settings
    <feature>/
      application/      # Use cases and orchestration
      domain/           # Pure business rules and types
      infrastructure/   # Feature repositories/adapters
      ui/               # Feature-specific components
  server/auth/          # Credential, current-user, rate-limit, and role policy
  server/db/            # Server-only Prisma client and database constants
  lib/                  # Shared validation, time, and observability utilities
```

Folders should be created when their first real module exists; empty abstractions are not useful. Route groups may later separate public, staff, and admin shells without changing URLs.

## Authentication and authorization

`/admin/login` is the shared entry point for `STAFF` and `ADMIN`. Auth.js verifies normalized credentials with bcrypt and issues an eight-hour JWT containing only the user id, name, email, and role. JWT data is not the final access decision: every protected render resolves that id against PostgreSQL again and rejects missing or `DISABLED` users. This also makes current database role changes authoritative without waiting for the JWT to expire.

The `/admin` route group has a server-rendered protected layout and repeats the staff policy at its leaf page. Future Server Actions and Route Handlers must call the same server authorization helpers; hiding a navigation item is only presentation. `ADMIN` is reserved for management operations, while the exact appointment and blocked-time resource scope for `STAFF` remains a product decision.

Login attempts use fixed 15-minute PostgreSQL windows with a limit of ten attempts for both the normalized account identifier and an available network signal. Bucket keys are HMAC digests, so raw emails and network values are not stored in the limiter table.

## Public service catalogue

`/services` and `/services/[slug]` are Server Component routes that query Prisma directly through the public-service boundary. Both list and detail require `isPublished = true` and `isActive = true`; a missing or private slug produces `notFound()` before page content is rendered. Queries use allow-listed selections and deterministic name/slug ordering rather than serializing complete Prisma records.

Eligible professionals are fetched in the detail query, avoiding an N+1 pattern. Only explicitly assigned, `ACTIVE` users are eligible, and only `id` and `name` leave the repository. An assigned active `ADMIN` may appear because the assignment is deliberate and administrators already satisfy staff-level operational policy; role itself is never exposed publicly. Future availability logic will further determine who can serve a concrete time.

## Availability engine

`generateAvailabilitySlots()` is framework- and database-independent. It merges overlapping local availability windows, anchors starts to the studio-local midnight grid, rejects starts whose wall-clock time does not exist, measures service duration in elapsed instants, and applies half-open overlap checks for blocks and bookings. Fall-back ambiguous local times choose the earlier instant exactly once. The service layer performs one service/staff query followed by bounded rules, block, and booking queries for the requested local day; it aggregates identical start instants across eligible staff without assigning anyone.

The public endpoint uses the configured `BusinessSettings.timezone`, `bookingLeadMinutes`, `bookingHorizonDays`, and `slotIntervalMinutes`. Horizon boundaries are inclusive (`local today + bookingHorizonDays`), and a slot exactly at `now + lead time` is allowed. Availability remains an advisory snapshot.

## Public booking creation

`/book/[slug]` is a focused client-state flow for staff, date, time, details, review, and confirmation. The browser fetches candidate slots but submits only identifiers and contact input. `createPublicBooking()` validates again and opens one interactive Prisma transaction. Inside it, the service and settings are re-read, the existing availability adapter runs against the transaction client, a specific staff member is verified or an available staff member is selected, authoritative end time/snapshots are derived, and the `PENDING` booking plus initial status event are inserted atomically.

“Any available” sorts the slot’s currently eligible staff by stable UUID and chooses the first. Specific-staff requests never switch silently. The outer reference-collision loop retries the entire transaction because PostgreSQL aborts a transaction after a unique violation. A PostgreSQL active-overlap violation is translated to a safe domain conflict; the exclusion constraint remains authoritative when concurrent transactions both pass advisory revalidation.

## Public booking management

`/manage-booking` keeps credentials in transient client state and sends them only in a POST body. The lookup service normalizes email and performs one constant-shaped query matching both reference and email. A match is mapped to an allow-listed DTO using booking snapshots; nonmatches become one generic domain error. The page clears submitted credentials after success, retains only the safe DTO, stores nothing in browser persistence, is marked `noindex`, and exposes no mutation controls.

Lookup throttling reuses the shared fixed-window/HMAC primitive. PostgreSQL stores separate `PUBLIC_BOOKING_LOOKUP` counters for reference, normalized email, and available network identity at ten attempts per 15 minutes. Any exhausted dimension blocks the request.

## Request and mutation rules

1. Treat request data, search parameters, sessions, and database reads crossing a trust boundary as untrusted.
2. Validate input and resolve the actor server-side.
3. Authorize the action against both role and resource scope.
4. Execute the use case; critical booking mutations run in a database transaction.
5. Return a narrow result and invalidate affected cached data explicitly.

## Booking engine design notes

Availability generation will:

1. Resolve the studio timezone and requested local date.
2. Load active service duration, business opening windows, eligible staff, and each staff member’s availability rules.
3. Intersect business and staff windows.
4. Subtract blocked time and active bookings.
5. Apply lead time, booking horizon, slot interval, and boundary rules.
6. Keep only candidates whose entire service interval fits and return timezone-labeled results.

Slot results are advisory snapshots. Two customers can see the same slot before either submits. Final creation revalidates all rules on the server and atomically prevents overlapping active bookings at the PostgreSQL layer. The migration uses a half-open interval `[startAt, endAt)` and a partial PostgreSQL GiST exclusion constraint over staff and `tstzrange`, limited to `PENDING` and `CONFIRMED`; a UI check is never sufficient.

## Time and data conventions

- Store booking instants as timezone-aware PostgreSQL timestamps and operate on UTC instants internally.
- The bootstrap IANA studio timezone is `America/New_York`.
- Recurring availability stores local minutes after midnight, not UTC timestamps, and is converted for each concrete date in the studio timezone.
- Inject the current clock into testable policy code rather than reading it throughout the application.

## Rendering and dependencies

Server Components are the default. Client Components are limited to interactions that need browser state. Prisma 7 uses generated client code plus `PrismaPg`; runtime uses `DATABASE_URL`, while `prisma7.config.ts` prefers `DIRECT_URL` for CLI/migrations. The driver pool is bounded and created lazily through a development-safe singleton. Auth.js, bcrypt, and Zod are active server-side dependencies as of TASK-003; Luxon is used by TASK-005 for explicit IANA timezone and DST conversion.
