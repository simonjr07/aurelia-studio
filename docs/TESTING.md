# Testing Strategy

Vitest is the test runner. Tests should target behavior at the cheapest reliable layer; critical database invariants also need real PostgreSQL integration tests. Browser journeys will be added when customer and internal flows exist.

## Test layers

- **Unit:** Zod validation, pure authorization policy, status transitions, cancellation rules, timezone conversion, and slot generation.
- **Component:** accessible form states, calendars/time selection, error messaging, and role-sensitive controls where UI behavior warrants it.
- **Repository integration:** Prisma against disposable PostgreSQL for query mapping, transactions, migrations, constraints, and indexes.
- **Application integration:** authenticated use cases with real repositories at important boundaries.
- **End-to-end:** public discovery/booking/manage flow and staff/admin workflows in a production-like build.

Mock external boundaries and clocks, not the scheduling rules under test. Use factories with explicit times and timezones; avoid fixtures that depend on the machine’s locale or current date.

## Required coverage by risk

- **Validation:** malformed, missing, normalized, boundary, and unexpected input.
- **Authentication:** correct/incorrect credentials, inactive users, secure session shape, logout, and generic errors.
- **Authorization:** every protected mutation for public/staff/admin plus resource ownership/scope; directly call server entry points rather than testing navigation alone.
- **Slot generation:** duration/buffers, opening and staff windows, blocks, active bookings, interval alignment, lead time, horizon, “Any available,” and no partial-fit slots.
- **Timezone:** UTC offsets, local date boundaries, ambiguous/nonexistent daylight-saving times using representative IANA zones, and configured studio timezone changes.
- **Double booking:** simultaneous create/create and create/reschedule conflicts, adjacent non-overlapping intervals, transaction rollback, and constraint-to-domain-error mapping.
- **Rescheduling:** policy cutoff, same/new staff, stale state, conflict, audit lineage, and atomicity.
- **Cancellation:** role/customer permissions, cutoff/override, already-terminal booking, released availability, and event history.
- **Status transitions:** valid matrix plus forbidden transitions and repeated requests.
- **Public booking:** service through confirmation and management lookup, including unavailable/stale slot and rate-limit paths.
- **Permissions:** staff scope cannot reach admin management or data outside policy; administrators can perform intended actions.

## Quality gates

Pull requests run install, lint, typecheck, tests, and production build. Feature work must include regression tests proportional to risk. Coverage percentages may be monitored, but meaningful boundary and concurrency cases are the gate—not a percentage alone. Accessibility needs automated scans plus manual keyboard and screen-reader spot checks. Hosted QA is required before production completion.

## Current state

TASK-002 adds unit checks for the approved business defaults and live PostgreSQL integration coverage for `StaffService` uniqueness and the manual overlap constraint. The database suite proves adjacent half-open bookings succeed, overlapping active bookings fail, and `CANCELLED`/`COMPLETED` rows do not block replacements. It skips only when neither `DIRECT_URL` nor `DATABASE_URL` is present; CI and a configured local `.env` run it against PostgreSQL rather than mocking the constraint.

Local database test sequence:

```bash
docker compose up -d db
npm run db:deploy
npm run db:smoke
npm test
```
