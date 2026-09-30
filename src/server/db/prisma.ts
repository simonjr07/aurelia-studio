import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

function readPositiveInteger(name: string, fallback: number) {
  const rawValue = process.env[name];

  if (rawValue === undefined) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  const adapter = new PrismaPg({
    connectionString,
    max: readPositiveInteger("DATABASE_POOL_MAX", 10),
    idleTimeoutMillis: readPositiveInteger(
      "DATABASE_POOL_IDLE_TIMEOUT_MS",
      10_000,
    ),
    connectionTimeoutMillis: readPositiveInteger(
      "DATABASE_POOL_CONNECTION_TIMEOUT_MS",
      5_000,
    ),
    application_name: "aurelia-studio",
  });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
