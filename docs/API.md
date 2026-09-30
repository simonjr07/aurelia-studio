# API and Server Interface Conventions

TASK-005 introduces the public advisory availability endpoint at `/api/availability`; booking mutations are still not implemented.

## Interface choice

- Use **Server Actions** for first-party form mutations tightly coupled to App Router views.
- Use **Route Handlers** under `/api` for public retrieval/mutation contracts, callbacks, or endpoints that benefit from normal HTTP semantics.
- Both are thin adapters over the same application use cases; neither contains booking policy or raw ad hoc database logic.

## Planned public surface

| Capability | Likely interface | Notes |
| --- | --- | --- |
| List/view active services | Server Component query or `GET /api/services` | Public fields only |
| Query availability | `GET /api/availability` | One date; validated; dynamic; advisory |
| Create booking | `POST /api/bookings` or Server Action | Revalidate and enforce conflict atomically |
| Retrieve public booking | `POST /api/bookings/lookup` | Reference plus verification factor; rate limited |
| Reschedule/cancel | Server Action or scoped route | Policy, verification, audit, transaction |
| Staff/admin operations | Server Actions by default | Authenticated and resource-authorized |

Final paths will be documented when implemented rather than treated as stable now.

## Implemented public service interface

- `GET /services` is a server-rendered public catalogue of published, active services.
- `GET /services/[slug]` returns a server-rendered public detail view or a 404 for missing, unpublished, or inactive services.
- No JSON service API is introduced: Server Components call the narrow Prisma query boundary directly.
- Public service results include only name, slug, description, duration, price, and currency plus assigned active staff `{ id, name }` on detail pages.
- The current CTA is intentionally non-interactive because booking creation does not exist yet; availability is exposed separately through `/api/availability`.

## Implemented availability interface

`GET /api/availability?service=<slug>&date=YYYY-MM-DD&staff=<optional-uuid>` returns one date of advisory candidate slots. The response includes the service identity, studio IANA timezone, UTC `startAt`/`endAt`, a local time label, and eligible public staff `{ id, name }` for each slot. A missing/private service returns `404`; malformed or impossible dates and staff identifiers return `400`; unexpected database/configuration failures return a generic `500`.

The handler is explicitly dynamic and sends `Cache-Control: no-store` because slots depend on the current instant, blocked time, and bookings. It never creates or reserves a booking.

## Implemented authentication interfaces

- `/admin/login` accepts email and password through a Server Action and always presents a generic failure message.
- `/api/auth/[...nextauth]` is owned by Auth.js and supplies the credentials/session endpoints.
- `/admin` is protected on the server. Missing, deleted, or disabled identities redirect to `/admin/login`.
- `requireStaff()` and `requireAdmin()` are the authoritative entry-point policies for future pages, actions, and handlers. Every protected mutation must invoke an appropriate policy again, even when nested below a protected layout.
- Successful login redirects to the fixed internal `/admin` destination; untrusted form data does not choose a callback URL.

## Contract rules

- Validate parameters and bodies with Zod at the server boundary.
- Return only allow-listed fields; never serialize Prisma records directly to public clients.
- Use ISO 8601 timestamps with offsets/`Z` plus an explicit IANA timezone where local meaning matters.
- Use consistent errors with a stable machine code, safe user message, and optional field errors/correlation ID. Never expose stack traces, SQL, account existence, or conflict details about other customers.
- Use appropriate HTTP status codes: `400` malformed input, `401` unauthenticated, `403` unauthorized, `404` unavailable/hidden resource, `409` stale state or booking conflict, `422` valid shape but rejected policy, and `429` rate limited.
- Mutations authenticate/verify, authorize, validate current state, and write audit information server-side.
- Use opaque idempotency keys for retry-prone public booking creation if the delivery design can submit twice.
- Apply pagination and upper bounds to lists and availability windows.
- Do not cache user-specific or staff operational data publicly. Invalidate catalog/schedule data after mutations.

## Versioning

The first-party web application may evolve interfaces with the UI until an external contract exists. Any later public integration API must be explicitly versioned and documented separately.
