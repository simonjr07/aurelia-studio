import { DEFAULT_BUSINESS_SETTINGS } from "../src/server/db/business-settings";
import { createScriptDatabaseClient } from "../scripts/database-client";

const prisma = createScriptDatabaseClient();

async function main() {
  await prisma.businessSettings.upsert({
    where: { id: DEFAULT_BUSINESS_SETTINGS.id },
    create: DEFAULT_BUSINESS_SETTINGS,
    update: {},
  });

  console.info("Business settings bootstrap complete.");
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Database bootstrap failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
