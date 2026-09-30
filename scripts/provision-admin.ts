import "dotenv/config";

import { Prisma } from "../src/generated/prisma/client";
import {
  provisionAdmin,
  ProvisioningError,
  type AdminProvisionRepository,
} from "../src/server/auth/provision-admin";
import { createScriptDatabaseClient } from "./database-client";

const prisma = createScriptDatabaseClient();

const repository: AdminProvisionRepository = {
  findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  },
  createAdmin(input) {
    return prisma.user.create({
      data: {
        ...input,
        role: "ADMIN",
        status: "ACTIVE",
      },
      select: { id: true, name: true, email: true, role: true },
    });
  },
};

async function main() {
  await provisionAdmin(
    {
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    },
    process.env,
    repository,
  );

  console.info("Administrator provisioned successfully.");
}

main()
  .catch((error: unknown) => {
    if (
      error instanceof ProvisioningError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002")
    ) {
      console.error(
        error instanceof ProvisioningError
          ? error.message
          : "An account with that normalized email already exists.",
      );
    } else {
      console.error("Administrator provisioning failed.");
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
