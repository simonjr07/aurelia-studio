import { describe, expect, it } from "vitest";

import {
  assertDevelopmentServiceBootstrap,
  bootstrapDevelopmentServices,
  DEVELOPMENT_SERVICE_CATALOGUE,
  type ServiceCatalogueRepository,
} from "./catalogue-bootstrap";

function createMemoryRepository(initial: Map<string, { name: string }> = new Map()) {
  const records = new Map(initial);
  const repository: ServiceCatalogueRepository = {
    async createIfMissing(service) {
      if (!records.has(service.slug)) {
        records.set(service.slug, { name: service.name });
      }
    },
  };

  return { records, repository };
}

describe("development service catalogue bootstrap", () => {
  it("creates every missing catalogue service", async () => {
    const { records, repository } = createMemoryRepository();

    await bootstrapDevelopmentServices(repository);

    expect(records.size).toBe(DEVELOPMENT_SERVICE_CATALOGUE.length);
  });

  it("does not duplicate services when rerun", async () => {
    const { records, repository } = createMemoryRepository();

    await bootstrapDevelopmentServices(repository);
    await bootstrapDevelopmentServices(repository);

    expect(records.size).toBe(DEVELOPMENT_SERVICE_CATALOGUE.length);
  });

  it("does not overwrite an existing customized service", async () => {
    const customizedName = "My Custom Facial";
    const { records, repository } = createMemoryRepository(
      new Map([["signature-facial", { name: customizedName }]]),
    );

    await bootstrapDevelopmentServices(repository);

    expect(records.get("signature-facial")?.name).toBe(customizedName);
  });

  it("refuses to run in production", () => {
    expect(() => assertDevelopmentServiceBootstrap("production")).toThrow(
      /cannot run in production/i,
    );
  });
});
