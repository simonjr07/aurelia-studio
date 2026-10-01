import "server-only";

import { hash } from "bcrypt";
import { z } from "zod";

import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import { assertAdminRole } from "../auth/authorization-policy";
import type { CurrentUser } from "../auth/current-user-service";
import { BCRYPT_WORK_FACTOR } from "../auth/provision-admin";
import { getPrismaClient } from "../db/prisma";

import {
  assignmentInputSchema,
  createStaffInputSchema,
  serviceInputSchema,
  updateStaffInputSchema,
} from "./validation";

export class ManagementConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManagementConflictError";
  }
}

export class ManagementNotFoundError extends Error {
  constructor(message = "The requested record was not found.") {
    super(message);
    this.name = "ManagementNotFoundError";
  }
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function database(database?: PrismaClient) {
  return database ?? getPrismaClient();
}

function isUuid(value: string) {
  return z.string().uuid().safeParse(value).success;
}

export async function listManagedServices(actor: CurrentUser, prisma?: PrismaClient) {
  assertAdminRole(actor);
  return database(prisma).service.findMany({
    orderBy: [{ name: "asc" }, { slug: "asc" }],
    select: {
      id: true, name: true, slug: true, durationMinutes: true, priceCents: true,
      currency: true, isPublished: true, isActive: true,
      _count: { select: { staffServices: true } },
    },
  });
}

export async function getManagedService(actor: CurrentUser, id: string, prisma?: PrismaClient) {
  assertAdminRole(actor);
  if (!isUuid(id)) return null;
  return database(prisma).service.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, description: true, durationMinutes: true, priceCents: true, currency: true, isPublished: true, isActive: true },
  });
}

export async function createService(actor: CurrentUser, input: unknown, prisma?: PrismaClient) {
  assertAdminRole(actor);
  const parsed = serviceInputSchema.parse(input);
  try {
    return await database(prisma).service.create({
      data: {
        name: parsed.name, slug: parsed.slug, description: parsed.description,
        durationMinutes: parsed.durationMinutes, priceCents: parsed.priceCents,
        currency: parsed.currency, isPublished: parsed.isPublished, isActive: parsed.isActive,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConflict(error)) throw new ManagementConflictError("That service slug is already in use.");
    throw error;
  }
}

export async function updateService(actor: CurrentUser, id: string, input: unknown, prisma?: PrismaClient) {
  assertAdminRole(actor);
  if (!isUuid(id)) throw new ManagementNotFoundError("Service not found.");
  const parsed = serviceInputSchema.parse(input);
  try {
    const result = await database(prisma).service.updateMany({
      where: { id },
      data: {
        name: parsed.name, slug: parsed.slug, description: parsed.description,
        durationMinutes: parsed.durationMinutes, priceCents: parsed.priceCents,
        currency: parsed.currency, isPublished: parsed.isPublished, isActive: parsed.isActive,
      },
    });
    if (result.count !== 1) throw new ManagementNotFoundError("Service not found.");
    return { id };
  } catch (error) {
    if (isUniqueConflict(error)) throw new ManagementConflictError("That service slug is already in use.");
    throw error;
  }
}

export async function listManagedStaff(actor: CurrentUser, prisma?: PrismaClient) {
  assertAdminRole(actor);
  return database(prisma).user.findMany({
    where: { role: "STAFF" },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true, role: true, status: true, _count: { select: { staffServices: true } } },
  });
}

export async function getManagedStaff(actor: CurrentUser, id: string, prisma?: PrismaClient) {
  assertAdminRole(actor);
  if (!isUuid(id)) return null;
  const db = database(prisma);
  const [staff, services] = await Promise.all([
    db.user.findFirst({
      where: { id, role: "STAFF" },
      select: { id: true, name: true, email: true, role: true, status: true, staffServices: { orderBy: { serviceId: "asc" }, select: { serviceId: true } } },
    }),
    db.service.findMany({ orderBy: [{ name: "asc" }, { slug: "asc" }], select: { id: true, name: true, isActive: true } }),
  ]);
  return staff ? { ...staff, services } : null;
}

export async function createStaff(actor: CurrentUser, input: unknown, prisma?: PrismaClient) {
  assertAdminRole(actor);
  const parsed = createStaffInputSchema.parse(input);
  const passwordHash = await hash(parsed.password, BCRYPT_WORK_FACTOR);
  try {
    return await database(prisma).user.create({
      data: { name: parsed.name, email: parsed.email, passwordHash, role: "STAFF", status: "ACTIVE" },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
  } catch (error) {
    if (isUniqueConflict(error)) throw new ManagementConflictError("An account with that email already exists.");
    throw error;
  }
}

export async function updateStaff(actor: CurrentUser, id: string, input: unknown, prisma?: PrismaClient) {
  assertAdminRole(actor);
  if (!isUuid(id)) throw new ManagementNotFoundError("Staff account not found.");
  const parsed = updateStaffInputSchema.parse(input);
  const result = await database(prisma).user.updateMany({
    where: { id, role: "STAFF" },
    data: parsed,
  });
  if (result.count !== 1) throw new ManagementNotFoundError("Staff account not found.");
  return { id };
}

export async function updateStaffServiceAssignments(actor: CurrentUser, id: string, input: unknown, prisma?: PrismaClient) {
  assertAdminRole(actor);
  if (!isUuid(id)) throw new ManagementNotFoundError("Staff account not found.");
  const { serviceIds } = assignmentInputSchema.parse(input);
  const db = database(prisma);
  return db.$transaction(async (transaction) => {
    const [staff, serviceCount] = await Promise.all([
      transaction.user.findFirst({ where: { id, role: "STAFF" }, select: { id: true } }),
      transaction.service.count({ where: { id: { in: serviceIds } } }),
    ]);
    if (!staff) throw new ManagementNotFoundError("Staff account not found.");
    if (serviceCount !== serviceIds.length) throw new ManagementNotFoundError("One or more services do not exist.");
    await transaction.staffService.deleteMany({ where: { staffId: id } });
    if (serviceIds.length > 0) {
      await transaction.staffService.createMany({ data: serviceIds.map((serviceId) => ({ staffId: id, serviceId })), skipDuplicates: true });
    }
    return { serviceIds: [...serviceIds].sort() };
  });
}

