import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

export function createScriptDatabaseClient() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DIRECT_URL or DATABASE_URL is required for database scripts.",
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    max: 2,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
    application_name: "aurelia-studio-script",
  });

  return new PrismaClient({ adapter });
}
