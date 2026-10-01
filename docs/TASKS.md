# Delivery Roadmap

Tasks are sequential enough to manage risk but may overlap when their contracts are settled.

## TASK-001 — Foundation and documentation

- **Objective:** establish a trustworthy project baseline.
- **Deliverables:** Next.js foundation, scripts, CI, placeholder homepage, product/technical documentation.
- **Acceptance:** lint, typecheck, test command, build, and diff checks pass; docs describe scope and unresolved decisions; no booking feature is implied complete.

## TASK-002 — Database foundation

- **Objective:** create the PostgreSQL/Prisma persistence baseline.
- **Deliverables:** local Docker Compose database, Prisma schema/migrations/seed, connection utilities, overlap constraint migration.
- **Acceptance:** fresh setup and migration succeed; core constraints and representative repository integration tests pass.
- **Status:** implementation complete; migrations and integration tests validated against local PostgreSQL.

## TASK-003 — Authentication and authorization

- **Objective:** secure staff/admin access.
- **Deliverables:** Auth.js credentials flow, bcrypt hashes, session types, role/resource policies, protected shells.
- **Acceptance:** inactive/invalid users are rejected; staff/admin permissions are server-enforced and tested.
- **Status:** implementation complete; credential, current-user, role-policy, rate-limit, and provisioning tests pass. Hosted QA remains part of deployment work.

## TASK-004 — Public services

- **Objective:** let customers discover bookable services.
- **Deliverables:** responsive service list/detail pages and active service queries.
- **Acceptance:** only public active data is exposed; loading/empty/error states and accessibility checks pass.
- **Status:** implementation complete; public queries, development catalogue, responsive list/detail UI, metadata, formatter tests, and live PostgreSQL visibility tests pass. Availability and booking remain intentionally unavailable.

## TASK-005 — Availability engine

- **Objective:** calculate accurate candidate slots.
- **Deliverables:** pure slot generator covering duration, hours, staff rules, blocks, bookings, lead time, horizon, interval, and timezone.
- **Acceptance:** deterministic unit/integration tests cover boundaries and daylight-saving behavior; results never imply a guarantee.
- **Status:** implementation complete; pure timezone-aware engine, dynamic public endpoint, live PostgreSQL integration, DST tests, and advisory aggregation are validated. Booking creation remains TASK-006.

## TASK-006 — Booking creation

- **Objective:** safely create public bookings.
- **Deliverables:** validated details/review flow, transactional creation, public reference, status event, rate limiting.
- **Acceptance:** concurrent requests cannot overlap the same staff member; errors are safe; happy and failure paths are tested.
- **Status:** implementation complete; staged responsive UI, transactional revalidation, deterministic assignment, snapshots, initial event, opaque reference, persistent throttling, API outcomes, and a real concurrent PostgreSQL race are covered. Public management remains TASK-007.

## TASK-007 — Public booking management

- **Objective:** securely retrieve customer booking details.
- **Deliverables:** reference/verification lookup and customer-safe detail page.
- **Acceptance:** references are non-enumerable, attempts are rate-limited, and internal/customer-extraneous data is absent.
- **Status:** implementation complete; reference-plus-email verification, generic anti-enumeration failures, snapshot-backed DTO, status labels, persistent HMAC throttling, no-store/noindex behavior, and responsive read-only UI are tested. Cancellation and rescheduling remain later tasks.

## TASK-008 — Staff appointment workflow

- **Objective:** support daily appointment operations.
- **Deliverables:** today/upcoming/calendar views, detail view, valid confirm/complete/cancel/no-show actions.
- **Acceptance:** transitions and resource scope are enforced server-side, audited, responsive, and tested.
- **Status:** implementation complete; operational overview, today/upcoming lists, scoped detail, explicit transitions, transactional audit events, stale-write conflicts, and PostgreSQL authorization/concurrency tests are included.

## TASK-009 — Service and staff management

- **Objective:** give administrators catalog and team controls.
- **Deliverables:** service/staff CRUD, activation, and staff-service assignments.
- **Acceptance:** admin-only mutations validate dependencies and preserve historical booking data.
- **Status:** implementation complete; admin-only service/staff pages, safe catalogue and account mutations, status controls, transactional service assignments, public-effect checks, and PostgreSQL tests are included. Services/staff are deactivated rather than deleted; schedule editing remains TASK-010.

## TASK-010 — Availability and blocked-time management

- **Objective:** maintain regular and exceptional schedules.
- **Deliverables:** opening/staff availability editors and blocked-time workflows.
- **Acceptance:** invalid ranges are rejected; authorization and downstream slot changes are tested.

## TASK-011 — Rescheduling and cancellation

- **Objective:** apply customer and staff change policies safely.
- **Deliverables:** cutoff rules, transactional rescheduling/cancellation, audit history, notifications placeholder boundary.
- **Acceptance:** rescheduling enforces the overlap invariant and stale-state handling; cancellation/reschedule policies are tested.

## TASK-012 — Dashboard analytics

- **Objective:** show simple, actionable booking indicators.
- **Deliverables:** date-filtered counts/trends for bookings, status, utilization, and popular services.
- **Acceptance:** admin-only aggregates match database fixtures, handle timezone boundaries, and expose no unnecessary PII.

## TASK-013 — Frontend polish

- **Objective:** make all flows cohesive and accessible.
- **Deliverables:** design-system refinements, responsive states, accessibility remediation, purposeful motion.
- **Acceptance:** key journeys pass keyboard, screen-reader spot, contrast, mobile, and desktop QA.

## TASK-014 — Security and production hardening

- **Objective:** reduce production risk.
- **Deliverables:** security headers, rate-limit review, logging/redaction, dependency/config audit, backup/recovery and incident notes.
- **Acceptance:** threat checklist is closed or risk-accepted; authorization regression tests and production build pass.

## TASK-015 — Deployment, hosted QA, and case study

- **Objective:** ship and document a verified hosted release.
- **Deliverables:** Vercel/Supabase environments, migration process, hosted smoke/accessibility/responsive QA, screenshots, case study.
- **Acceptance:** production checks pass, rollback/backup paths are recorded, no secrets are committed, and evidence reflects the actual product.
