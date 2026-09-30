# Aurelia Studio

Aurelia Studio is a fictional premium beauty and wellness studio. This repository will become a production-style appointment platform for public booking and role-aware staff operations.

## Planned capabilities

- Service discovery and guided appointment booking
- Staff selection, availability, rescheduling, and cancellation
- Staff appointment workflows and schedule management
- Administrative service, staff, hours, rules, and analytics controls
- Timezone-aware scheduling with server- and database-enforced conflict protection

The project is currently at **Task 001: foundation and documentation**. Booking, authentication, persistence, and administration are planned; they are not implemented yet.

## Architecture and stack

The planned request path is Browser → Next.js App Router → server-side application/domain logic → Prisma → PostgreSQL. Production will use Vercel and Supabase PostgreSQL. The stack also includes TypeScript, Tailwind CSS, Auth.js, bcrypt, Zod, Vitest, Docker Compose, and GitHub Actions as their roadmap tasks are introduced.

## Local development

Requires Node.js 20.9 or newer. PostgreSQL setup will be added with the database foundation task.

```bash
npm install
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

Foundation in progress. No production services or credentials are required at this stage.
