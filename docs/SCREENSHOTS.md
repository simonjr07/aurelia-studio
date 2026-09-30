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
- Capture the entire relevant component without browser/private-account clutter.
- Use descriptive filenames such as `booking-time-mobile.png` and maintain useful alt text/captions.
- Keep color/profile and viewport consistent across comparison images.
- Redact or recapture rather than blur real PII; never include secrets, URLs containing tokens, logs, or developer tools with sensitive values.
- Record the build/commit and viewport used so images can be reproduced.
- Remove outdated images when UI behavior materially changes.

## Current state

The TASK-001 homepage is a foundation placeholder. Final portfolio screenshots wait until the relevant flows are implemented; no mock screen should be presented as shipped functionality.
