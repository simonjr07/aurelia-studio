import { createScriptDatabaseClient } from "./database-client";

const prisma = createScriptDatabaseClient();

async function main() {
  await prisma.$queryRaw`SELECT 1`;

  const [settings, users, services, bookings] = await Promise.all([
    prisma.businessSettings.findUnique({
      where: { id: "default" },
      select: { businessName: true, timezone: true, currency: true },
    }),
    prisma.user.count(),
    prisma.service.count(),
    prisma.booking.count(),
  ]);

  if (!settings) {
    throw new Error("Required BusinessSettings record is missing.");
  }

  console.info("Database smoke check passed.", {
    business: settings.businessName,
    timezone: settings.timezone,
    currency: settings.currency,
    counts: { users, services, bookings },
  });
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Database smoke check failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
