import "dotenv/config";

import { randomBytes } from "node:crypto";

import bcrypt from "bcrypt";

import { createScriptDatabaseClient } from "./database-client";

if (process.env.NODE_ENV === "production") {
  throw new Error("Booking demo bootstrap is for development only.");
}

const prisma = createScriptDatabaseClient();
const demoStaff = [
  { email: "demo.stylist.one@aurelia.local", name: "Maya Bennett" },
  { email: "demo.stylist.two@aurelia.local", name: "Elena Rossi" },
] as const;
const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;

async function bootstrapBookingDemo() {
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
  const staff = [];

  for (const fixture of demoStaff) {
    staff.push(
      await prisma.user.upsert({
        where: { email: fixture.email },
        create: {
          ...fixture,
          passwordHash,
          role: "STAFF",
          status: "ACTIVE",
        },
        update: {},
        select: { id: true },
      }),
    );
  }

  const services = await prisma.service.findMany({
    where: { isPublished: true, isActive: true },
    select: { id: true },
  });

  for (const member of staff) {
    for (const service of services) {
      await prisma.staffService.upsert({
        where: {
          staffId_serviceId: { staffId: member.id, serviceId: service.id },
        },
        create: { staffId: member.id, serviceId: service.id },
        update: {},
      });
    }

    for (const weekday of weekdays) {
      const existing = await prisma.availabilityRule.findFirst({
        where: {
          staffId: member.id,
          weekday,
          startLocalMinutes: 540,
          endLocalMinutes: 1020,
        },
        select: { id: true },
      });

      if (!existing) {
        await prisma.availabilityRule.create({
          data: {
            staffId: member.id,
            weekday,
            startLocalMinutes: 540,
            endLocalMinutes: 1020,
          },
        });
      }
    }
  }
}

bootstrapBookingDemo()
  .then(() => console.info("Development booking demo bootstrap complete."))
  .catch(() => {
    console.error("Development booking demo bootstrap failed.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

