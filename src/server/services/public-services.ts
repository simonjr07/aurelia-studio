import "server-only";

import { cache } from "react";

import { getPrismaClient } from "@/server/db/prisma";

import { createPublicServiceQueries } from "./public-service-queries";

export const getPublicServices = cache(() =>
  createPublicServiceQueries(getPrismaClient()).getPublicServices(),
);

export const getPublicServiceBySlug = cache((slug: string) =>
  createPublicServiceQueries(getPrismaClient()).getPublicServiceBySlug(slug),
);
