# Aurelia Studio

Aurelia Studio is a fictional premium beauty and wellness studio. This repository will become a production-style appointment platform for public booking and role-aware staff operations.

## Planned capabilities

- Service discovery and guided appointment booking
- Staff selection, availability, rescheduling, and cancellation
- Staff appointment workflows and schedule management
- Administrative service, staff, hours, rules, and analytics controls
- Timezone-aware scheduling with server- and database-enforced conflict protection

The project currently includes the **Task 002 database foundation**. Booking UI, availability calculation, authentication, and administration are not implemented yet.

## Architecture and stack

The planned request path is Browser → Next.js App Router → server-side application/domain logic → Prisma → PostgreSQL. Production will use Vercel and Supabase PostgreSQL. The stack also includes TypeScript, Tailwind CSS, Auth.js, bcrypt, Zod, Vitest, Docker Compose, and GitHub Actions as their roadmap tasks are introduced.

## Local development

Requires Node.js 20.9 or newer and Docker Compose. Local PostgreSQL uses host port `5434`.

```bash
npm install
Copy-Item .env.example .env # PowerShell; keep .env uncommitted
docker compose up -d db
npm run db:migrate
npm run db:smoke
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

Database commands are available as `db:generate`, `db:migrate`, `db:deploy`, `db:status`, `db:bootstrap`, `db:smoke`, and `db:studio`.

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

Database foundation implemented. Local migration/integration validation requires PostgreSQL; no production services or credentials are required at this stage.
