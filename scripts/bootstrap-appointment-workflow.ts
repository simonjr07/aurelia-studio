import "dotenv/config";

import bcrypt from "bcrypt";
import { DateTime } from "luxon";

import { createScriptDatabaseClient } from "./database-client";

if (process.env.NODE_ENV === "production") {
  throw new Error("Appointment workflow bootstrap is for development only.");
}

const credentials = [
  { email: "workflow.admin@aurelia.local", name: "Workflow Admin", role: "ADMIN" as const, password: process.env.WORKFLOW_ADMIN_PASSWORD },
  { email: "workflow.staff.a@aurelia.local", name: "Workflow Staff A", role: "STAFF" as const, password: process.env.WORKFLOW_STAFF_A_PASSWORD },
  { email: "workflow.staff.b@aurelia.local", name: "Workflow Staff B", role: "STAFF" as const, password: process.env.WORKFLOW_STAFF_B_PASSWORD },
];

if (credentials.some((credential) => !credential.password || credential.password.length < 12)) {
  throw new Error("Set all WORKFLOW_*_PASSWORD values to at least 12 characters.");
}

const prisma = createScriptDatabaseClient();

async function run() {
  const users = new Map<string, string>();
  for (const credential of credentials) {
    const user = await prisma.user.upsert({
      where: { email: credential.email },
      create: {
        email: credential.email,
        name: credential.name,
        role: credential.role,
        status: "ACTIVE",
        passwordHash: await bcrypt.hash(credential.password!, 12),
      },
      update: {},
      select: { id: true },
    });
    users.set(credential.email, user.id);
  }

  const service = await prisma.service.findFirst({
    where: { isPublished: true, isActive: true },
    orderBy: { slug: "asc" },
  });
  if (!service) throw new Error("Bootstrap development services first.");

  const staff = credentials.filter((credential) => credential.role === "STAFF");
  for (const member of staff) {
    await prisma.staffService.upsert({
      where: { staffId_serviceId: { staffId: users.get(member.email)!, serviceId: service.id } },
      create: { staffId: users.get(member.email)!, serviceId: service.id },
      update: {},
    });
  }

  const timezone = (await prisma.businessSettings.findUniqueOrThrow({ where: { id: "default" } })).timezone;
  const localNow = DateTime.now().setZone(timezone);
  const starts = [
    localNow.plus({ hours: 2 }).startOf("hour"),
    localNow.plus({ days: 1 }).startOf("day").plus({ hours: 10 }),
  ];
  const fixtureBookings = [
    { reference: "AUR-WORKFLOWSTAFFA01", staffId: users.get("workflow.staff.a@aurelia.local")!, start: starts[0] },
    { reference: "AUR-WORKFLOWSTAFFB01", staffId: users.get("workflow.staff.b@aurelia.local")!, start: starts[1] },
  ];

  for (const fixture of fixtureBookings) {
    const existing = await prisma.booking.findUnique({ where: { publicReference: fixture.reference } });
    if (existing) continue;
    await prisma.booking.create({
      data: {
        publicReference: fixture.reference,
        status: "PENDING",
        serviceId: service.id,
        staffId: fixture.staffId,
        customerName: "Development Workflow Guest",
        customerEmail: "workflow-guest@example.test",
        customerPhone: "+1 555 010 8080",
        startAt: fixture.start.toUTC().toJSDate(),
        endAt: fixture.start.plus({ minutes: service.durationMinutes }).toUTC().toJSDate(),
        timezoneSnapshot: timezone,
        serviceNameSnapshot: service.name,
        serviceDurationSnapshot: service.durationMinutes,
        priceCentsSnapshot: service.priceCents,
        currencySnapshot: service.currency,
        statusEvents: { create: { fromStatus: null, toStatus: "PENDING" } },
      },
    });
  }
}

run()
  .then(() => console.info("Development appointment workflow bootstrap complete."))
  .catch(() => {
    console.error("Development appointment workflow bootstrap failed.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

