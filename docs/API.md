# API and Server Interface Conventions

No application API is implemented in TASK-001. This document establishes the intended contracts.

## Interface choice

- Use **Server Actions** for first-party form mutations tightly coupled to App Router views.
- Use **Route Handlers** under `/api` for public retrieval/mutation contracts, callbacks, or endpoints that benefit from normal HTTP semantics.
- Both are thin adapters over the same application use cases; neither contains booking policy or raw ad hoc database logic.

## Planned public surface

| Capability | Likely interface | Notes |
| --- | --- | --- |
| List/view active services | Server Component query or `GET /api/services` | Public fields only |
| Query availability | `GET /api/availability` | Bounded date range; rate limited; advisory |
| Create booking | `POST /api/bookings` or Server Action | Revalidate and enforce conflict atomically |
| Retrieve public booking | `POST /api/bookings/lookup` | Reference plus verification factor; rate limited |
| Reschedule/cancel | Server Action or scoped route | Policy, verification, audit, transaction |
| Staff/admin operations | Server Actions by default | Authenticated and resource-authorized |

Final paths will be documented when implemented rather than treated as stable now.

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
