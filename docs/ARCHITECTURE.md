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
- **Repositories / database (`src/lib/db`, feature repositories):** Prisma access, query composition, persistence mapping, and transaction boundaries. Prisma types should not become the public contract of every layer.
- **Authentication (`src/lib/auth`):** Auth.js configuration, credential verification, session shaping, and current-actor resolution.
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
  lib/                  # Auth, database, validation, time, observability
```

Folders should be created when their first real module exists; empty abstractions are not useful. Route groups may later separate public, staff, and admin shells without changing URLs.

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

Slot results are advisory snapshots. Two customers can see the same slot before either submits. Final creation must revalidate all rules on the server and atomically prevent overlapping active bookings at the PostgreSQL layer. The preferred design is a half-open interval `[startAt, endAt)` with a PostgreSQL exclusion constraint over staff and a timestamp range for conflict-participating statuses. Prisma migrations may require hand-written SQL for this constraint. A transaction and friendly conflict response complete the workflow; a UI check alone is never sufficient.

## Time and data conventions

- Store booking instants as timezone-aware PostgreSQL timestamps and operate on UTC instants internally.
- Store the IANA studio timezone (for example, `Africa/Lagos`) in business settings.
- Interpret recurring availability in the studio’s local civil time, then convert carefully for each date.
- Inject the current clock into testable policy code rather than reading it throughout the application.

## Rendering and dependencies

Server Components are the default. Client Components are limited to interactions that need browser state. Dependencies are added when a roadmap task needs them: Prisma/PostgreSQL in TASK-002, Auth.js/bcrypt in TASK-003, and Zod with the first validated boundary.
