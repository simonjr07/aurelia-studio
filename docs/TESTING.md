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

TASK-005 adds pure slot-engine coverage for duration, interval-grid alignment, merged windows, gaps, half-open blocks, lead-time and horizon boundaries, spring-forward gaps, fall-back ambiguity, unique instants, and shared blocking statuses. Live PostgreSQL/API coverage verifies service visibility, active assigned staff, disabled/unassigned staff exclusion, pending versus completed bookings, selected staff behavior, safe DTO fields, and endpoint validation.

TASK-006 adds deterministic reference and booking-limiter unit tests plus live PostgreSQL booking-service/API integration. Coverage proves authoritative snapshots/end time, normalized contact data, atomic initial status history, specific-staff rejection, deterministic any-available fallback, unavailable-service hiding, whole-transaction collision retry, safe response fields/statuses, and throttling. Its concurrency test launches two real creates for the same staff/instant and asserts exactly one booking commits while the loser becomes `BookingConflictError`.

TASK-007 adds lookup limiter/status-label unit coverage and live PostgreSQL service/API verification. Tests change the live service facts while retaining original booking snapshots, prove normalized two-factor matching, compare wrong-email and unknown-reference failures, inspect the exact safe DTO, cover all five status labels, enforce private no-store headers, verify generic internal errors, and inspect persisted limiter rows for HMAC-only identities.

The current suite contains 78 passing tests across 18 files when PostgreSQL is configured; database suites run against the real local database rather than mocks.

TASK-008 adds full state-machine unit coverage plus live PostgreSQL operations tests for New York today/upcoming boundaries, deterministic ordering, staff/admin list and detail scope, chronological actor-safe history, own/admin mutation, cross-staff denial, invalid-transition rollback, audit facts, and two concurrent transitions from one expected state. Existing current-user tests continue proving disabled accounts lose access.

Before TASK-009, the complete suite contained 96 passing tests across 20 files with all database integration suites active.

TASK-009 adds exact money/slug unit tests, direct management-route authentication tests, and live PostgreSQL coverage for ADMIN versus STAFF mutation authority, slug/email uniqueness, normalized email, bcrypt persistence, forced role/status, disabled authentication, service visibility toggles, transactional assignment replacement, public eligible-staff effects, and booking snapshot preservation. Manual QA covers the responsive admin forms and direct STAFF access denial; schedule-based availability editing remains TASK-010.

The complete TASK-009 suite contains 114 passing tests across 23 files with PostgreSQL configured; none of the database suites are skipped.

The live PostgreSQL integration suite covers `StaffService` uniqueness and the manual overlap constraint. It proves adjacent half-open bookings succeed, overlapping active bookings fail, and `CANCELLED`/`COMPLETED` rows do not block replacements. It skips only when neither `DIRECT_URL` nor `DATABASE_URL` is present; CI and a configured local `.env` run it against PostgreSQL rather than mocking the constraint.

Manual authentication QA should verify keyboard/paste-friendly sign-in, generic invalid-credential feedback, successful redirect to `/admin`, sign-out, responsive layout, and direct signed-out `/admin` redirection. A temporary development administrator may be created with `npm run admin:provision`; never record its password in logs or committed fixtures.

Public catalogue QA runs `npm run db:bootstrap:services`, then checks `/`, `/services`, a real detail slug, invalid/private slugs, keyboard-visible links, responsive layouts, and the deliberately disabled booking CTA. Integration fixtures must be deleted after each run and must not use production data.

Availability QA uses a deterministic fixed clock in tests and checks `/api/availability` with a real service/date, an invalid date, a private service, and optional staff id. DST tests use `America/New_York` explicitly and never depend on the machine timezone. Results are advisory and must not be described as reservations.

Booking UI QA may use `npm run db:bootstrap:services` followed by `npm run db:bootstrap:booking-demo`. Verify specific and any-professional paths, date/time reloads, contact field errors, review, pending confirmation/reference, persisted booking/event, disappearance of the occupied slot, keyboard focus, mobile layout, pending-button lockout, and friendly stale-slot recovery. Demo bootstrap data is development-only and must never target production.

Public lookup QA uses a development booking at `/manage-booking`. Verify reference plus normalized email succeeds, wrong email and unknown reference render identical generic text, malformed fields remain specific, snapshots and studio-local time display correctly, the URL remains credential-free after lookup/reload, response headers prohibit storage, and no cancel/reschedule controls appear.

Appointment workflow QA can use `db:bootstrap:appointment-workflow` after supplying three local passwords through the shell. Check admin-wide and staff-owned views, direct cross-staff denial, valid status changes, terminal actions, audit actor/note display, logout, and disabled-user denial. The command is create-only and production-blocked.

Local database test sequence:

```bash
docker compose up -d db
npm run db:deploy
npm run db:smoke
npm test
```
