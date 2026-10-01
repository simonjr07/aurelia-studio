import { beforeEach, describe, expect, it, vi } from "vitest";

const currentUser = vi.hoisted(() => vi.fn());
const createService = vi.hoisted(() => vi.fn());
vi.mock("../auth/current-user", () => ({ getCurrentUser: currentUser }));
vi.mock("./management-service", async (importOriginal) => {
  const original = await importOriginal<typeof import("./management-service")>();
  return { ...original, createService };
});
vi.mock("server-only", () => ({}));

import { POST } from "../../app/api/admin/services/route";

const request = () => new Request("http://localhost/api/admin/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });

describe("management route authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 to an unauthenticated caller", async () => {
    currentUser.mockResolvedValue(null);
    expect((await POST(request()))!.status).toBe(401);
    expect(createService).not.toHaveBeenCalled();
  });

  it("returns 403 to STAFF before reaching a mutation", async () => {
    currentUser.mockResolvedValue({ id: "staff", role: "STAFF" });
    expect((await POST(request()))!.status).toBe(403);
    expect(createService).not.toHaveBeenCalled();
  });

  it("allows ADMIN through to the server mutation", async () => {
    const actor = { id: "admin", name: "Admin", email: "admin@example.test", role: "ADMIN" };
    currentUser.mockResolvedValue(actor);
    createService.mockResolvedValue({ id: "service" });
    const response = await POST(request());
    expect(response!.status).toBe(201);
    expect(createService).toHaveBeenCalledWith(actor, {});
  });
});

