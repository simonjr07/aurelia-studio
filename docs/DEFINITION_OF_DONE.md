# Definition of Done

A task or release is done only when all applicable conditions below are met. An inapplicable item should be explicitly noted, not silently skipped.

## Functionality and data

- Acceptance criteria and relevant unhappy paths work with no knowingly fake completed behavior.
- Business invariants are enforced in trusted server/domain code; database constraints protect critical data invariants.
- Inputs are validated server-side and errors are safe, useful, and consistent.
- Mutations are atomic where partial success would corrupt state and are auditable where required.

## Security and authorization

- Authentication and role/resource authorization are enforced server-side and covered by negative tests.
- Least privilege and data minimization are applied; public responses and logs expose no unnecessary PII.
- Abuse controls are present for sensitive public/auth endpoints.
- No secrets, real credentials, or production data exist in code, fixtures, screenshots, commits, or build output.

## Quality

- New/changed behavior has risk-appropriate unit, integration, and/or end-to-end tests.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check` pass locally and in CI.
- Database changes include reviewed migrations, constraints/indexes, seed impact, and rollback/recovery notes.
- No unexplained console errors, failing requests, dead controls, or stale generated artifacts remain.

## User experience

- The experience works at agreed mobile, tablet, and desktop widths without hidden essential actions or horizontal overflow.
- Semantic structure, labels, keyboard access, focus behavior, contrast, error communication, and reduced-motion behavior meet WCAG 2.2 AA expectations.
- Loading, empty, validation, success, unavailable/stale, and server-error states are intentionally handled.

## Delivery

- Relevant README, architecture, API, database, security, testing, deployment, and user-facing notes reflect the implementation.
- Reviewable changes stay within scope and include a clear validation report.
- Production-bound work passes preview/hosted QA, including critical journeys and role checks.
- Production deployment is verified, monitoring is healthy, and rollback/recovery instructions are available.
- Case-study statements and screenshots show only verified, shipped behavior with synthetic/redacted data.
