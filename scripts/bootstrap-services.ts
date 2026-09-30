import "dotenv/config";

import {
  assertDevelopmentServiceBootstrap,
  bootstrapDevelopmentServices,
} from "../src/server/services/catalogue-bootstrap";
import { createScriptDatabaseClient } from "./database-client";

assertDevelopmentServiceBootstrap(process.env.NODE_ENV);

const prisma = createScriptDatabaseClient();

bootstrapDevelopmentServices({
  createIfMissing(service) {
    return prisma.service.upsert({
      where: { slug: service.slug },
      create: service,
      update: {},
      select: { id: true },
    });
  },
})
  .then(() => {
    console.info("Development service catalogue bootstrap complete.");
  })
  .catch(() => {
    console.error("Development service catalogue bootstrap failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
