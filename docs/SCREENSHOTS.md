# Screenshot Plan

Screenshots will be captured after each represented feature is implemented and verified. Use synthetic names/contact details, no credentials or session data, and a consistent seeded dataset.

## Planned set

| Area | View / state | Widths |
| --- | --- | --- |
| Brand | Homepage | Mobile, desktop |
| Services | List and detail | Mobile, desktop |
| Booking | Staff choice, date/time, details, review, confirmation | Mobile, desktop key steps |
| Public management | Lookup, booking detail, reschedule, cancellation | Mobile |
| Staff | Today, upcoming, calendar, appointment detail | Tablet, desktop |
| Admin | Services, staff, hours/rules, blocked time, analytics | Desktop |
| Quality | Empty, validation, stale slot/conflict, forbidden, error | Relevant width |
| Accessibility | Visible focus and zoom/reflow evidence | Desktop/mobile |

## Capture standards

- Use a stable hosted preview or production build with deterministic seed data.
- Capture the entire relevant component without browser/private account clutter.
- Use descriptive filenames such as `booking-time-mobile.png` and maintain useful alt text/captions.
- Keep color/profile and viewport consistent across comparison images.
- Redact or recapture rather than blur real PII; never include secrets, URLs containing tokens, logs, or developer tools with sensitive values.
- Record the build/commit and viewport used so images can be reproduced.
- Remove outdated images when UI behavior materially changes.

## Curated capture list

When a verified hosted environment is available, capture these portfolio views with fictional data only:

1. `01-home-desktop.png`: homepage at 1440px
2. `02-services.png`: public catalogue
3. `03-service-detail.png`: service detail
4. `04-booking-flow.png`: professional/date/time selection
5. `05-booking-confirmation.png`: confirmation without contact details
6. `06-manage-booking.png`: verified booking view without credentials
7. `07-admin-overview.png`: administrator overview
8. `08-appointment-detail.png`: appointment workflow/audit view
9. `09-service-management.png`: catalogue management
10. `10-availability-management.png`: recurring/blocked time management
11. `11-analytics.png`: aggregate analytics
12. `12-home-mobile.png`: homepage at approximately 390px

Optional staff management and mobile admin views may be added only when they meet the same standard. Record the real deployed commit and viewport alongside the capture set; embed only a small best of selection in the README.

## Current status

No screenshots have been captured or added under `docs/screenshots/`. Hosted account access and a verified deployment were unavailable during Task #15 preparation, so this is an honest capture checklist rather than fabricated portfolio evidence.
