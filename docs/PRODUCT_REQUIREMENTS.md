# Product Requirements

## Purpose

Aurelia Studio is a premium, single location beauty and wellness appointment platform. It should make booking calm and trustworthy for customers while giving staff a focused operational workspace and administrators complete business control.

## Users

- **Customer:** browses without an account, books a suitable service and time, then manages that booking using a high entropy reference plus verification information.
- **Staff member:** signs in to perform day to day appointment work and manage only the schedule capabilities granted to staff.
- **Administrator:** signs in with full control over appointments, catalog, staff, availability, business rules, and analytics.

## Core journeys

### Public booking

1. Browse active services and view service details.
2. Choose an eligible staff member or “Any available.”
3. Choose a date and an available time slot.
4. Enter and validate contact details.
5. Review and confirm the booking.
6. Receive a safe public booking reference.
7. Retrieve booking details and, when policy permits, reschedule or cancel.

### Staff operations

1. Sign in with credentials.
2. View today’s and upcoming appointments or the schedule calendar.
3. Open appointment details appropriate to the staff role.
4. Confirm, complete, cancel, or mark an appointment as a no show when the transition is valid.
5. View and manage permitted blocked time entries.

### Administration

Administrators can perform all operational workflows and manage services, staff, service assignments, regular availability, exceptional blocked time, opening hours, booking rules, and simple booking analytics.

## Booking lifecycle

`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, and `NO_SHOW` are the initial statuses. Every status change must be validated on the server and appended to an audit history. Transition rules will be finalized with the booking workflow; terminal records remain available for historical reporting.

## Initial permissions

| Capability | Public | Staff | Admin |
| --- | :---: | :---: | :---: |
| Browse active services and availability | Yes | Yes | Yes |
| Create/manage own booking via secure public flow | Yes | Not applicable |: |
| View operational appointments | No | Scoped | Yes |
| Change appointment status | No | Scoped | Yes |
| Manage own/permitted blocked time | No | Scoped | Yes |
| Manage services, staff, hours, and rules | No | No | Yes |
| View analytics | No | No | Yes |

“Scoped” means authorization is enforced for the requested resource, not merely hidden in the interface. The exact staff visibility policy requires approval; see [Decisions](DECISIONS.md).

## Functional requirements

- Display active services with duration, price, description, and eligible staff.
- Generate availability from business hours, staff rules, service duration, blocks, existing appointments, and booking policies.
- Store appointment instants consistently and display them in the studio timezone.
- Prevent overlapping active bookings for the same staff member under concurrent requests.
- Support audited booking creation, status changes, rescheduling, and cancellation.
- Provide credential based Auth.js sessions and explicit `ADMIN`/`STAFF` authorization.
- Validate all untrusted input on the server with Zod.
- Rate limit sensitive public and authentication operations.
- Provide operational list/calendar views and basic aggregate analytics.

## Non functional requirements

- **Correctness:** scheduling invariants hold under concurrency and timezone edge cases.
- **Security/privacy:** least privilege, minimal PII collection, redacted logs, secure secrets, and not enumerable public identifiers.
- **Reliability:** atomic state changes, idempotency where retries are plausible, clear failure states, and recoverable migrations.
- **Performance:** responsive common pages, indexed scheduling queries, bounded availability windows, and no avoidable client JavaScript.
- **Maintainability:** strict TypeScript, clear boundaries, automated checks, migrations, focused tests, and current documentation.
- **Observability:** actionable server errors and audit events without exposing customer data.

## Accessibility

Target WCAG 2.2 AA: semantic landmarks and headings, full keyboard access, visible focus, labels and useful errors, adequate contrast, appropriate status announcements, reduced motion support, and accessible calendar/time selection. Automated checks supplement, but do not replace, keyboard and screen reader review.

## Responsive design

All public and internal workflows must work from narrow mobile screens through desktop. Touch targets should be comfortable, critical actions must not depend on hover, dense schedules should offer mobile appropriate views, and zoom/reflow must not hide content or actions.

## Out of scope for V1

Real payments, SMS, Google Calendar, multiple locations, customer accounts, multi tenancy, a marketplace, loyalty/rewards, and video appointments are explicitly excluded.
