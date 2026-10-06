# Aurelia Studio Case Study

## Project overview

Aurelia Studio is a production-style, full-stack appointment booking and operations platform created for a fictional premium service business. It demonstrates a complete customer booking journey, secure customer self-service, role-aware internal operations, accurate schedule computation, and a verified Vercel and Supabase deployment.

[Open the live application](https://aurelia-studio-orcin.vercel.app)

## Business problem

A service business needs more than an attractive catalogue. Customers need to understand services, see genuine availability, and confidently manage a booking. Staff need a focused operational view. Administrators need control over the catalogue, team assignments, recurring schedules, exceptions, and reporting.

The difficult part is preserving correctness when availability depends on duration, assignment, local business time, blocked periods, existing appointments, policy cutoffs, and simultaneous requests.

## Solution

The public experience supports service discovery, professional selection, live availability, booking, confirmation, and verified booking management. Customers can cancel or reschedule eligible bookings without creating an account.

The authenticated workspace gives staff scoped access to their appointments and schedules. Administrators can manage services, staff, assignments, recurring availability, blocked time, appointment workflows, and aggregate analytics.

## User journeys

### Customer

The customer browses published services, chooses a specific professional or any eligible professional, selects an available time, enters contact details, reviews the appointment, and receives an opaque reference. The reference and booking email provide access to a private management view with policy-aware cancellation and rescheduling.

### Staff

Staff can view today's and upcoming appointments, open authorized appointment details, perform valid status transitions, and maintain their own schedule. Server-side scope prevents access to another professional's records.

### Administrator

Administrators can manage the catalogue, staff accounts, service assignments, recurring hours, blocked periods, all appointments, and analytics. Management permissions are enforced at the page, API, and service boundaries.

## Architecture and technical decisions

The application uses Next.js App Router and TypeScript on Vercel, Auth.js for staff authentication, Prisma 7 with `@prisma/adapter-pg`, and Supabase PostgreSQL. Zod validates untrusted input, bcrypt protects staff passwords, Vitest covers application behavior, and GitHub Actions provides repeatable quality gates.

Runtime database traffic uses the Supabase transaction pooler. Controlled migration commands use the direct session connection. This separates serverless connection management from schema ownership.

Business rules use `America/New_York`; persisted timestamps are UTC instants. Historical service name, duration, price, and currency are copied into booking snapshots so later catalogue edits cannot rewrite appointment history.

## Booking and availability system

Availability combines service duration, eligible staff assignments, recurring weekly windows, blocked time, active bookings, lead time, booking horizon, slot interval, and local time zone rules. Results shown in the interface are advisory until a booking transaction commits.

Create and reschedule operations recheck current state inside a transaction. Booking intervals follow half-open `[start, end)` semantics. A PostgreSQL GiST exclusion constraint is the final authority against overlapping active bookings, including concurrent requests. Expected status and expected start time protect customer changes from stale submissions.

## Admin and staff workflows

Appointments move through an explicit state machine with actor-aware audit events. Staff remain restricted to their assigned work, while administrators can operate across the studio. Service and staff deactivation preserves historical records. Assignment replacement is transactional, and schedule edits feed directly into public availability.

Analytics provide bounded date presets and custom ranges, current status totals, studio-local trends, popular services, and staff workload. Responses are aggregate allow lists with no customer contact details, booking references, notes, or fabricated revenue.

## Reliability and concurrency

The design uses validation, transactional rechecks, optimistic stale state inputs, database uniqueness, and exclusion constraints together. Tests exercise create races, reschedule races, cancellation versus reschedule races, adjacent intervals, terminal status behavior, and rollback paths against PostgreSQL rather than relying only on mocks.

## Security

Auth.js credentials authentication uses bcrypt and an eight-hour JWT lifetime. Protected operations recheck the active database user so disabled or deleted accounts lose access. ADMIN and STAFF permissions are enforced server-side.

Public booking management requires the exact case-sensitive reference and normalized email on every request. Generic verification failures reduce enumeration clues. Login, booking creation, lookup, cancellation, and rescheduling use isolated HMAC-based rate-limit buckets without storing raw identifiers. Explicit DTOs, input bounds, `no-store` responses, `noindex` private pages, CSP, and browser security headers further reduce exposure.

Secrets are held in provider environment storage. No database URL, authentication secret, rate limit secret, password, or token is committed or included in screenshots.

## Production deployment

The application is live at [aurelia-studio-orcin.vercel.app](https://aurelia-studio-orcin.vercel.app). Vercel hosts the Next.js application, and Supabase hosts PostgreSQL. Committed Prisma migrations were applied through the controlled direct connection before hosted QA.

Hosted QA verified public service browsing, availability, booking creation, lookup, rescheduling, cancellation, administrator login, appointment workflows, responsive layouts, keyboard focus, protected routes, and booking access through the reference and email. Customer changes appeared correctly in the administrator workspace.

## Testing

The final automated suite contains **151 passing tests across 32 files** with the PostgreSQL integration suites active. Coverage includes validation, authentication, authorization, time zones, DST, availability, database constraints, public booking, change policies, rate limiting, analytics, and concurrent writes.

The release gates also passed lint, TypeScript checking, the optimized production build, and Git whitespace validation. Manual hosted checks complemented the automated suite for responsive behavior, focus visibility, authentication boundaries, private booking access, and production workflow integration.

## Production debugging case study

Hosted QA uncovered a focused booking change defect: public lookup succeeded, but rescheduling and cancellation could reject the same valid reference and email.

The request payload and expected booking state were first verified. Minimal server-only diagnostics then isolated reference-only, email-only, and combined matching without logging either credential. The evidence showed that the email matched, but the submitted reference no longer equaled the stored reference.

References are generated with URL-safe base64, which is case-sensitive and may contain uppercase and lowercase characters. Lookup validation preserved that case, while booking-change validation called `.toUpperCase()`. That mutation changed a valid identifier before the transactional query.

The fix removed the case conversion, reused the shared `BOOKING_REFERENCE_PATTERN`, preserved exact reference and email verification, and left the generator and stored references unchanged. Regression coverage now exercises a deliberately mixed-case reference through lookup, rescheduling, and cancellation. The temporary diagnostics were removed after confirmation.

## Final outcome

Aurelia Studio now provides a coherent production deployment and a technically credible portfolio example across front-end design, relational modeling, scheduling logic, concurrency control, authentication, authorization, security hardening, testing, deployment, and real hosted debugging.

The project does not claim real customers, revenue, performance benchmarks, formal penetration testing, or accessibility certification. It remains a fictional portfolio application backed by real implementation and verification evidence.
