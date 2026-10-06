# Delivery Roadmap

Tasks are sequential enough to manage risk but may overlap when their contracts are settled.

## TASK-001: Foundation and documentation

- **Objective:** establish a trustworthy project baseline.
- **Deliverables:** Next.js foundation, scripts, CI, placeholder homepage, product/technical documentation.
- **Acceptance:** lint, typecheck, test command, build, and diff checks pass; docs describe scope and unresolved decisions; no booking feature is implied complete.

## TASK-002: Database foundation

- **Objective:** create the PostgreSQL/Prisma persistence baseline.
- **Deliverables:** local Docker Compose database, Prisma schema/migrations/seed, connection utilities, overlap constraint migration.
- **Acceptance:** fresh setup and migration succeed; core constraints and representative repository integration tests pass.
- **Status:** implementation complete; migrations and integration tests validated against local PostgreSQL.

## TASK-003: Authentication and authorization

- **Objective:** secure staff/admin access.
- **Deliverables:** Auth.js credentials flow, bcrypt hashes, session types, role/resource policies, protected shells.
- **Acceptance:** inactive/invalid users are rejected; staff/admin permissions are server enforced and tested.
- **Status:** implementation complete; credential, current-user, role-policy, rate-limit, and provisioning tests pass. Hosted QA was completed during TASK-015.

## TASK-004: Public services

- **Objective:** let customers discover bookable services.
- **Deliverables:** responsive service list/detail pages and active service queries.
- **Acceptance:** only public active data is exposed; loading/empty/error states and accessibility checks pass.
- **Status:** implementation complete; public queries, development catalogue, responsive list and detail UI, metadata, formatter tests, and live PostgreSQL visibility tests pass. Availability and booking were delivered in later tasks.

## TASK-005: Availability engine

- **Objective:** calculate accurate candidate slots.
- **Deliverables:** pure slot generator covering duration, hours, staff rules, blocks, bookings, lead time, horizon, interval, and timezone.
- **Acceptance:** deterministic unit/integration tests cover boundaries and daylight saving behavior; results never imply a guarantee.
- **Status:** implementation complete; the pure time-zone-aware engine, dynamic public endpoint, live PostgreSQL integration, DST tests, and advisory aggregation are validated. Booking creation followed in TASK-006.

## TASK-006: Booking creation

- **Objective:** safely create public bookings.
- **Deliverables:** validated details/review flow, transactional creation, public reference, status event, rate limiting.
- **Acceptance:** concurrent requests cannot overlap the same staff member; errors are safe; happy and failure paths are tested.
- **Status:** implementation complete; staged responsive UI, transactional revalidation, deterministic assignment, snapshots, initial event, opaque reference, persistent throttling, API outcomes, and a real concurrent PostgreSQL race are covered. Public management followed in TASK-007.

## TASK-007: Public booking management

- **Objective:** securely retrieve customer booking details.
- **Deliverables:** reference/verification lookup and customer safe detail page.
- **Acceptance:** references are not enumerable, attempts are rate limited, and internal/unnecessary customer data is absent.
- **Status:** implementation complete; booking-reference and email verification, generic enumeration-resistant failures, snapshot-backed DTOs, status labels, persistent HMAC throttling, `no-store` and `noindex` behavior, and a responsive read-only UI are tested. Cancellation and rescheduling followed in TASK-011.

## TASK-008: Staff appointment workflow

- **Objective:** support daily appointment operations.
- **Deliverables:** today/upcoming/calendar views, detail view, valid confirm/complete/cancel/no show actions.
- **Acceptance:** transitions and resource scope are enforced server-side, audited, responsive, and tested.
- **Status:** implementation complete; operational overview, today/upcoming lists, scoped detail, explicit transitions, transactional audit events, stale write conflicts, and PostgreSQL authorization/concurrency tests are included.

## TASK-009: Service and staff management

- **Objective:** give administrators catalogue and team controls.
- **Deliverables:** service/staff CRUD, activation, and staff service assignments.
- **Acceptance:** administrator only mutations validate dependencies and preserve historical booking data.
- **Status:** implementation complete; administrator-only service and staff pages, safe catalogue and account mutations, status controls, transactional service assignments, public-effect checks, and PostgreSQL tests are included. Services and staff are deactivated rather than deleted. Schedule editing followed in TASK-010.

## TASK-010: Availability and blocked time management

- **Objective:** maintain regular and exceptional schedules.
- **Deliverables:** opening/staff availability editors and blocked time workflows.
- **Acceptance:** invalid ranges are rejected; authorization and downstream slot changes are tested.
- **Status:** implementation complete; role-scoped weekly-window and blocked-time workflows, studio time-zone conversion, overlap and active-booking protection, disabled-staff policy, and real availability-engine effect tests are included.

## TASK-011: Rescheduling and cancellation

- **Objective:** apply customer and staff change policies safely.
- **Deliverables:** cutoff rules, transactional rescheduling/cancellation, audit history, notifications placeholder boundary.
- **Acceptance:** rescheduling enforces the overlap invariant and stale state handling; cancellation/reschedule policies are tested.
- **Status:** implementation complete; verified public cancellation and rescheduling, settings-derived inclusive cutoffs, immutable reschedule history on the same booking, role-scoped internal rescheduling, separate HMAC throttles, transactional availability revalidation, PostgreSQL overlap authority, and live concurrency tests are included.

## TASK-011.5: Public UI/UX refresh

- **Objective:** give the complete public customer journey a cohesive boutique beauty/wellness identity.
- **Deliverables:** responsive public navigation/footer, editorial homepage and catalogue, refined service detail, accessible five step booking, polished confirmation, and consistent lookup/cancellation/rescheduling presentation.
- **Acceptance:** existing business behavior and security contracts remain unchanged; public flows retain labels, keyboard focus, non-color selected states, responsive tap targets, safe errors, loading and empty states, and reduced-motion support.
- **Status:** implementation complete; shared typography, color, and control tokens; code-native visual composition; responsive customer journeys; and relevant documentation are included without back-end, schema, or API changes.

## TASK-012: Dashboard analytics

- **Objective:** show simple, actionable booking indicators.
- **Deliverables:** date filtered booking/status counts, studio local trend, popular services, and staff workload.
- **Acceptance:** administrator only aggregates match database fixtures, handle timezone boundaries, and expose no unnecessary PII.
- **Status:** implementation complete; ADMIN only dynamic analytics, validated 7/30/90 day and bounded custom ranges, current status summaries, studio local daily trend, historical service ranking, not cancelled staff workload, accessible responsive presentation, and live PostgreSQL integration coverage are included. No schema or public API was added.

## TASK-013: Front-end polish

- **Objective:** make all flows cohesive and accessible.
- **Deliverables:** design system refinements, responsive states, accessibility remediation, purposeful motion.
- **Acceptance:** key journeys pass keyboard, screen reader spot, contrast, mobile, and desktop QA.
- **Status:** implementation complete; the public palette and typography are preserved while the internal shell, active role-aware navigation, overview, appointments, analytics, management forms, availability editor, login, status badges, shared controls, empty states, focus treatment, reduced-motion behavior, and mobile layouts are refined. No back-end behavior, schema, API, authorization, or analytics semantics changed. Final hosted visual QA and portfolio screenshots were completed in TASK-015.

## TASK-014: Security and production hardening

- **Objective:** reduce production risk.
- **Deliverables:** security headers, rate limit review, logging/redaction, dependency/config audit, backup/recovery and incident notes.
- **Acceptance:** threat checklist is closed or risk accepted; authorization regression tests and production build pass.
- **Status:** implementation complete; trust boundaries, Auth.js and JWT behavior, role and resource scope, explicit public DTOs, HMAC rate-limit isolation, Vercel proxy handling, parameterized analytics, transaction and constraint safety, logging, environment assumptions, deployment controls, safe failure UI, response headers, caching, indexing, and dependency review are documented and regression tested. Production deployment followed in TASK-015. Hosted WAF configuration and penetration testing remain outside V1.

## TASK-015: Deployment, hosted QA, and case study

- **Objective:** ship and document a verified hosted release.
- **Deliverables:** Vercel and Supabase environments, migration process, hosted smoke testing, accessibility and responsive QA, screenshots, and a case study.
- **Acceptance:** production checks pass, rollback/backup paths are recorded, no secrets are committed, and evidence reflects the actual product.
- **Status:** complete. The application is deployed on Vercel with Supabase PostgreSQL at [aurelia-studio-orcin.vercel.app](https://aurelia-studio-orcin.vercel.app). Controlled migrations, public and authenticated hosted QA, responsive and keyboard spot checks, screenshots, deployment evidence, testing documentation, and the portfolio case study are recorded. The suite contains 151 passing tests across 32 files with PostgreSQL integration active. Hosted debugging also identified and fixed case mutation in public booking-change validation, with mixed-case lookup, rescheduling, and cancellation regression coverage. Temporary diagnostics were removed.
