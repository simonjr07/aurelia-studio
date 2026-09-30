import type { PrismaClient } from "@/generated/prisma/client";

const publicServiceListSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  durationMinutes: true,
  priceCents: true,
  currency: true,
} as const;

export function createPublicServiceQueries(prisma: PrismaClient) {
  return {
    getPublicServices() {
      return prisma.service.findMany({
        where: { isPublished: true, isActive: true },
        orderBy: [{ name: "asc" }, { slug: "asc" }],
        select: publicServiceListSelect,
      });
    },

    async getPublicServiceBySlug(slug: string) {
      const service = await prisma.service.findFirst({
        where: {
          slug,
          isPublished: true,
          isActive: true,
        },
        select: {
          ...publicServiceListSelect,
          staffServices: {
            where: { staff: { status: "ACTIVE" } },
            orderBy: [{ staff: { name: "asc" } }, { staffId: "asc" }],
            select: {
              staff: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!service) {
        return null;
      }

      const { staffServices, ...publicService } = service;

      return {
        ...publicService,
        eligibleStaff: staffServices.map(({ staff }) => staff),
      };
    },
  };
}

export type PublicServiceSummary = Awaited<
  ReturnType<ReturnType<typeof createPublicServiceQueries>["getPublicServices"]>
>[number];

export type PublicServiceDetail = NonNullable<
  Awaited<
    ReturnType<
      ReturnType<typeof createPublicServiceQueries>["getPublicServiceBySlug"]
    >
  >
>;
