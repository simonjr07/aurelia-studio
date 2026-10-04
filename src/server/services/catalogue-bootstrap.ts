export const DEVELOPMENT_SERVICE_CATALOGUE = [
  {
    name: "Signature Facial",
    slug: "signature-facial",
    description:
      "A tailored facial ritual combining a thoughtful skin consultation, gentle resurfacing, targeted hydration, and restorative massage for a luminous finish.",
    durationMinutes: 75,
    priceCents: 14_500,
    currency: "USD",
    isPublished: true,
    isActive: true,
  },
  {
    name: "Deep Hydration Facial",
    slug: "deep-hydration-facial",
    description:
      "A moisture focused treatment with gentle exfoliation, layered hydration, and a calming mask designed to replenish dry or travel weary skin.",
    durationMinutes: 60,
    priceCents: 12_000,
    currency: "USD",
    isPublished: true,
    isActive: true,
  },
  {
    name: "Restorative Massage",
    slug: "restorative-massage",
    description:
      "A flowing full body massage using considered pressure and unhurried techniques to soften tension and encourage deep relaxation.",
    durationMinutes: 60,
    priceCents: 13_500,
    currency: "USD",
    isPublished: true,
    isActive: true,
  },
  {
    name: "Sculpting Massage",
    slug: "sculpting-massage",
    description:
      "A focused body treatment blending rhythmic massage and contouring techniques for an invigorating, grounded sense of renewal.",
    durationMinutes: 90,
    priceCents: 18_500,
    currency: "USD",
    isPublished: true,
    isActive: true,
  },
  {
    name: "Brow Styling",
    slug: "brow-styling",
    description:
      "A precise brow consultation, shaping, and finishing service tailored to your natural features and preferred level of definition.",
    durationMinutes: 30,
    priceCents: 5_000,
    currency: "USD",
    isPublished: true,
    isActive: true,
  },
  {
    name: "Luxury Manicure",
    slug: "luxury-manicure",
    description:
      "Detailed nail and cuticle care followed by exfoliation, massage, and a polished finish in your selected studio shade.",
    durationMinutes: 60,
    priceCents: 8_500,
    currency: "USD",
    isPublished: true,
    isActive: true,
  },
] as const;

export type CatalogueServiceInput =
  (typeof DEVELOPMENT_SERVICE_CATALOGUE)[number];

export type ServiceCatalogueRepository = {
  createIfMissing(service: CatalogueServiceInput): Promise<unknown>;
};

export function assertDevelopmentServiceBootstrap(environment: string | undefined) {
  if (environment === "production") {
    throw new Error("The development service catalogue cannot run in production.");
  }
}

export async function bootstrapDevelopmentServices(
  repository: ServiceCatalogueRepository,
) {
  for (const service of DEVELOPMENT_SERVICE_CATALOGUE) {
    await repository.createIfMissing(service);
  }
}
