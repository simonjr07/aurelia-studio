# Testing Strategy and Evidence

## Overview

Aurelia Studio uses Vitest for automated testing and PostgreSQL for integration tests that depend on real database behavior. The final verified suite contains **151 passing tests across 32 files**, with every PostgreSQL suite active.

Tests are placed at the least expensive layer that can prove the required behavior. Pure policies and transformations use unit tests. Transactions, constraints, authorization scope, and concurrency use the real database. Hosted QA covers complete browser journeys, responsive behavior, and keyboard interaction.

## Automated test layers

### Unit tests

Unit coverage includes:

1. Zod validation and normalization
2. Authentication and authorization policies
3. Appointment status transitions
4. Booking references and rate limits
5. Time-zone conversion and daylight saving boundaries
6. Slot generation, lead time, booking horizon, and interval alignment
7. Analytics date ranges and formatting
8. Production security header configuration and trusted network identity handling

Clocks and external boundaries are controlled in tests. Scheduling rules are not mocked, and date-sensitive tests use explicit times rather than the machine clock.

### PostgreSQL integration tests

Database tests exercise the application through Prisma against PostgreSQL. They verify:

1. Migrations, indexes, and relational constraints
2. Staff and service assignments
3. Public service visibility
4. Recurring availability and blocked time
5. Booking creation, authoritative snapshots, and audit events
6. Public lookup, cancellation, and rescheduling
7. Staff and administrator resource scope
8. Analytics across studio-local dates and DST boundaries
9. Safe public DTOs and generic verification failures

The PostgreSQL suites run whenever `DIRECT_URL` or `DATABASE_URL` is configured. CI and the documented local workflow provide a database, so constraint behavior is tested rather than simulated.

### Concurrency and integrity tests

The suite launches real competing transactions for high-risk scheduling paths. It proves that:

1. Two customers cannot book overlapping active appointments for the same professional.
2. Adjacent half-open intervals remain valid.
3. Reschedule races produce one coherent winner.
4. Cancellation and rescheduling cannot create impossible state or audit history.
5. PostgreSQL exclusion failures are translated into safe domain conflicts.
6. Failed writes roll back without leaving orphan events.

### Security and authorization regression tests

Regression coverage verifies generic credential failures, disabled account denial, server-side ADMIN and STAFF boundaries, staff ownership scope, explicit public projections, private response headers, limiter action isolation, HMAC-only stored identities, and trusted Vercel network identity derivation.

Login, booking creation, lookup, cancellation, and rescheduling use independent limiter actions. Tests confirm that one public action cannot consume another action's allowance.

## Mixed-case booking reference regression

Production QA uncovered a mismatch between public lookup and booking changes for mixed-case references. The regression suite now uses a deliberately mixed-case reference and proves that:

1. Public lookup succeeds with the exact stored reference.
2. Surrounding whitespace is trimmed without changing letter case.
3. Transactional rescheduling succeeds.
4. Transactional cancellation succeeds.
5. The stored and returned reference remains unchanged.

The temporary production diagnostics used to isolate the mismatch were removed after the fix was confirmed.

## Manual hosted QA

Hosted QA was completed at [aurelia-studio-orcin.vercel.app](https://aurelia-studio-orcin.vercel.app). The verified journeys include:

1. Public service browsing and service details
2. Availability and professional eligibility
3. Public booking creation and confirmation
4. Booking lookup with the correct reference and email
5. Customer rescheduling and cancellation
6. Administrator login and protected route behavior
7. Appointment progression from `PENDING` to `CONFIRMED` to `COMPLETED`
8. Customer changes appearing correctly in the administrator workspace

Wrong-email and unknown-reference attempts were checked for the same generic response. Protected administrator routes required authentication, and reviewed public responses did not expose obvious secrets or private data.

## Responsive and accessibility checks

Desktop and mobile layouts received responsive spot checks across the public catalogue, service details, booking management, and administrator workspace. Keyboard navigation and visible focus were also checked on critical journeys.

The interface includes semantic headings, labeled controls, non-color state indicators, text equivalents for analytics bars, purposeful empty states, reduced-motion support, and responsive overflow safeguards. These checks are practical release evidence, not a formal accessibility certification or complete screen-reader audit.

## Local validation

Start the local database, apply migrations, and run the quality gates:

```bash
docker compose up -d db
npm run db:deploy
npm run db:smoke
npm test
npm run lint
npm run typecheck
npm run build
git diff --check
```

The final documented run passed all commands. Integration fixtures use synthetic data and are removed after each suite.

## Testing principles

1. Verify behavior at trust boundaries, not only interface visibility.
2. Use explicit dates, time zones, and clocks.
3. Keep database invariants covered by real database tests.
4. Test failure paths and concurrency in proportion to risk.
5. Treat availability shown in the browser as advisory until a transaction commits.
6. Keep fixtures synthetic and production data outside the test process.
