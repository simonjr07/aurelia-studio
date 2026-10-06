# API and Server Interface Conventions

The application exposes narrow HTTP interfaces for public booking workflows and authenticated operations. Server Components query internal read boundaries directly when a public JSON contract is unnecessary.

Authenticated `POST /api/admin/appointments/[id]/status` accepts the strict body `{ expectedStatus, status, note? }`. The active database-backed actor is resolved on every request. Staff scope is enforced by booking ownership, while administrators are unscoped. Invalid bodies return `400`, missing authentication returns `401`, missing or out-of-scope appointments return `404`, stale or forbidden transitions return `409`, and unexpected failures return a generic `500`.

Administrator-only management uses `POST /api/admin/services`, `PATCH /api/admin/services/[id]`, `POST /api/admin/staff`, `PATCH /api/admin/staff/[id]`, and `PUT /api/admin/staff/[id]/services`. Each route reloads the active database-backed user and returns `401` for missing authentication or `403` for a non-administrator before parsing or mutation. Validation failures return `400`, unique slug or email conflicts return `409`, missing managed resources return `404`, and unexpected failures return a generic `500`. Responses never contain password hashes or plaintext passwords.

Schedule management uses authenticated `POST /api/admin/availability`, `DELETE /api/admin/availability/[id]`, `POST /api/admin/blocked-times`, and `DELETE /api/admin/blocked-times/[id]`. ADMIN may target any STAFF account, while STAFF may target only themselves. Cross-scope or missing resources return `404`, validation returns `400`, overlaps or disabled targets return `409`, missing studio configuration returns `503`, and unexpected errors remain generic. Responses expose only schedule identifiers and never reveal blocked-time reasons beyond the authorized internal page.

Booking changes use verified `POST /api/bookings/cancel`, `POST /api/bookings/reschedule`, and authenticated `POST /api/admin/appointments/[id]/reschedule`. Public changes require the booking reference and normalized email on every request. Validation failures return `400`, generic verification or missing scope returns `404`, stale state or occupied capacity returns `409`, cutoff or state policy returns `422`, throttling returns `429`, and unexpected failures return a generic `500`.

## Interface choice

- Use **Server Actions** for first party form mutations tightly coupled to App Router views.
- Use **Route Handlers** under `/api` for public retrieval/mutation contracts, callbacks, or endpoints that benefit from normal HTTP semantics.
- Both are thin adapters over the same application use cases; neither contains booking policy or raw ad hoc database logic.

## Interface overview

### Active services

Server Components query the internal public-service boundary and expose public fields only. No separate JSON service endpoint is required.

### Availability

`GET /api/availability` accepts one validated date and returns dynamic, advisory availability.

### Booking creation

`POST /api/bookings` revalidates availability and enforces booking conflicts atomically.

### Public booking lookup

`POST /api/bookings/lookup` verifies the booking reference and normalized email and applies rate limiting.

### Public booking changes

`POST /api/bookings/reschedule` and `POST /api/bookings/cancel` enforce verification, policy, audit, and transaction boundaries.

### Staff and administrator operations

Authenticated route handlers support appointment operations and service, staff, and schedule management.

## Implemented public service interface

- `GET /services` is a server rendered public catalogue of published, active services.
- `GET /services/[slug]` returns a server rendered public detail view or a 404 for missing, unpublished, or inactive services.
- No JSON service API is introduced: Server Components call the narrow Prisma query boundary directly.
- Public service results include only name, slug, description, duration, price, and currency plus assigned active staff `{ id, name }` on detail pages.
- The detail CTA links to `/book/[slug]`; private/inactive services still resolve to 404.

## Implemented availability interface

`GET /api/availability?service=<slug>&date=YYYY-MM-DD&staff=<optional-uuid>` returns one date of advisory candidate slots. The response includes the service identity, studio IANA timezone, UTC `startAt`/`endAt`, a local time label, and eligible public staff `{ id, name }` for each slot. A missing/private service returns `404`; malformed or impossible dates and staff identifiers return `400`; unexpected database/configuration failures return a generic `500`.

The handler is explicitly dynamic and sends `Cache-Control: no-store` because slots depend on the current instant, blocked time, and bookings. It never creates or reserves a booking.

## Implemented booking interface

`POST /api/bookings` accepts only `serviceSlug`, optional `staffId`, `startAt`, `customerName`, `customerEmail`, `customerPhone`, and optional `customerNote`. The strict Zod boundary rejects unknown client fields, so price, duration, end time, snapshots, currency, and status cannot be assigned in bulk. A successful `201` response contains only reference, pending status, public service/staff names, start/end instants, timezone, duration, price, and currency.

Known outcomes are `400` with field errors, `404` for an unavailable service, `409` with `BOOKING_CONFLICT` for a stale/taken slot, `429` for throttling, and a generic `500`. Responses are `no-store`; raw Prisma/PostgreSQL details and customer PII are never returned. Booking creation consumes normalized email and available network HMAC buckets at five attempts per fixed 15 minute window.

## Implemented public booking lookup

`POST /api/bookings/lookup` accepts only `{ reference, email }`. The strict schema requires the exact `AUR-` reference pattern, bounds both fields, and normalizes email consistently with booking creation. Verification uses one query containing both values; unknown references and wrong emails receive the same `404` body. Malformed input returns `400`, the eleventh attempt within a fixed 15 minute identity window returns `429`, and internal failures return a generic `500`.

The `200` DTO contains reference, enum/friendly status, booking snapshot service facts, current booked professional identity/name, start/end instants, snapshot timezone, customer name, configured cutoff facts, and whether each public change is currently allowed. It excludes contact details, notes, event data, staff private account data, and rate limit metadata. Every response sends `Cache-Control: private, no-store, max-age=0` and `Pragma: no-cache`.

## Implemented booking change interfaces

`POST /api/bookings/cancel` accepts `{ reference, email, expectedStatus, expectedStartAt }`. It re-verifies the customer, rereads current state in a transaction, applies the configured cancellation cutoff, conditionally changes the status to `CANCELLED`, and appends an actorless status event.

`POST /api/bookings/reschedule` accepts the same verification and stale state fields plus `{ startAt, staffId? }`. It applies the configured reschedule cutoff, re runs availability using the booking's snapshot duration while excluding the booking itself, updates that same booking row, and appends an actorless reschedule event. Omitting `staffId` uses deterministic Any available selection.

`POST /api/admin/appointments/[id]/reschedule` accepts `{ expectedStatus, expectedStartAt, startAt, staffId?, note? }`. It re resolves the active actor. STAFF is own booking/self target only; ADMIN may operate across eligible staff. Customer cutoffs do not apply to authenticated operations, and the event records the actor and optional note. All change responses are not cacheable and expose narrow booking facts only.

## Implemented authentication interfaces

- `/admin/login` accepts email and password through a Server Action and always presents a generic failure message.
- `/api/auth/[...nextauth]` is owned by Auth.js and supplies the credentials/session endpoints.
- `/admin` is protected on the server. Missing, deleted, or disabled identities redirect to `/admin/login`.
- `requireStaff()` and `requireAdmin()` are the authoritative entry point policies for future pages, actions, and handlers. Every protected mutation must invoke an appropriate policy again, even when nested below a protected layout.
- Successful login redirects to the fixed internal `/admin` destination; untrusted form data does not choose a callback URL.

## Contract rules

- Validate parameters and bodies with Zod at the server boundary.
- Return only explicitly allowed fields; never serialize Prisma records directly to public clients.
- Use ISO 8601 timestamps with offsets/`Z` plus an explicit IANA timezone where local meaning matters.
- Use consistent errors with a stable machine code, safe user message, and optional field errors/correlation ID. Never expose stack traces, SQL, account existence, or conflict details about other customers.
- Use appropriate HTTP status codes: `400` malformed input, `401` unauthenticated, `403` unauthorized, `404` unavailable/hidden resource, `409` stale state or booking conflict, `422` valid shape but rejected policy, and `429` rate limited.
- Mutations verify identity, authorize the action, validate current state, and write audit information server-side.
- Use opaque idempotency keys for retry prone public booking creation if the delivery design can submit twice.
- Apply pagination and upper bounds to lists and availability windows.
- Do not cache user specific or staff operational data publicly. Invalidate catalog/schedule data after mutations.

## Versioning

The first party web application may evolve interfaces with the UI until an external contract exists. Any later public integration API must be explicitly versioned and documented separately.
