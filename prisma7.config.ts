import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/bootstrap.ts",
  },
  datasource: {
    // Prisma CLI operations use a direct connection. Generate remains usable in
    // environments that intentionally do not expose a database URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
