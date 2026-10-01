# Aurelia Studio

Aurelia Studio is a fictional premium beauty and wellness studio. This repository will become a production-style appointment platform for public booking and role-aware staff operations.

## Planned capabilities

- Service discovery and guided appointment booking
- Staff selection, availability, rescheduling, and cancellation
- Staff appointment workflows and schedule management
- Administrative service, staff, hours, rules, and analytics controls
- Timezone-aware scheduling with server- and database-enforced conflict protection

The project currently includes the **Task 011.5 public experience refresh** and **Task 012 dashboard analytics workflow**: a cohesive responsive studio identity across discovery, booking, confirmation, and verified booking management, backed by the complete Task 011 transactional workflow, plus privacy-conscious operational analytics for administrators.

The public interface uses a restrained ivory, charcoal, sage, and clay palette; an editorial display face paired with a readable interface sans; shared controls and surface styles; responsive navigation; explicit selected/loading/empty/error states; and reduced-motion-aware transitions. This presentation layer does not alter booking policies, API contracts, authentication, or persistence behavior.

## Architecture and stack

The request path is Browser → Next.js App Router/Auth.js → server-side application/domain logic → Prisma → PostgreSQL. Production will use Vercel and Supabase PostgreSQL. The stack includes TypeScript, Tailwind CSS, Auth.js, bcrypt, Zod, Vitest, Docker Compose, and GitHub Actions.

## Local development

Requires Node.js 20.9 or newer and Docker Compose. Local PostgreSQL uses host port `5434`.

```bash
npm install
Copy-Item .env.example .env # PowerShell; keep .env uncommitted
docker compose up -d db
npm run db:migrate
npm run db:smoke
npm run db:bootstrap:services # create missing development catalogue entries
npm run db:bootstrap:booking-demo # optional create-only staff/schedule demo data
# Optionally set WORKFLOW_ADMIN_PASSWORD, WORKFLOW_STAFF_A_PASSWORD, and
# WORKFLOW_STAFF_B_PASSWORD, then create appointment workflow QA fixtures:
npm run db:bootstrap:appointment-workflow
# Add development AUTH_SECRET and RATE_LIMIT_SECRET values to .env.
# Then provide ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in your shell:
npm run admin:provision
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Database commands are available as `db:generate`, `db:migrate`, `db:deploy`, `db:status`, `db:bootstrap`, `db:bootstrap:services`, `db:bootstrap:booking-demo`, `db:smoke`, and `db:studio`. Both catalogue/demo bootstraps are development-only and create missing data without overwriting existing records. Demo staff receive random, undisclosed credential material and are for scheduling QA, not sign-in. `admin:provision` creates the first active administrator without printing the supplied password.

## Documentation

- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database design](docs/DATABASE.md)
- [API conventions](docs/API.md)
- [Task roadmap](docs/TASKS.md)
- [Architecture decisions](docs/DECISIONS.md)
- [Testing strategy](docs/TESTING.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Definition of done](docs/DEFINITION_OF_DONE.md)
- [Case study plan](docs/CASE_STUDY.md)
- [Screenshot plan](docs/SCREENSHOTS.md)

## Status

Database, the refreshed public experience, verified customer changes, scoped appointment operations, admin service/staff management, staff schedule management, and administrator analytics are implemented. Analytics use appointment dates, studio-local calendar boundaries, current booking status, historical service snapshots, and non-cancelled staff workload; they expose aggregate data only and are dynamically rendered without public caching.
