import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PrismaClient } from "../../generated/prisma/client";
import { BookingVerificationError, reschedulePublicBooking } from "./change-booking";

describe("public reschedule transaction queries", () => {
  it("awaits every query on the transaction connection sequentially", async () => {
    let activeQueries = 0;
    let maximumActiveQueries = 0;

    async function query<T>(result: T): Promise<T> {
      activeQueries += 1;
      maximumActiveQueries = Math.max(maximumActiveQueries, activeQueries);
      await new Promise((resolve) => setTimeout(resolve, 0));
      activeQueries -= 1;
      return result;
    }

    const staffId = "11111111-1111-4111-8111-111111111111";
    const booking = {
      id: "22222222-2222-4222-8222-222222222222",
      publicReference: "AUR-0000000000000001",
      status: "PENDING" as const,
      serviceId: "33333333-3333-4333-8333-333333333333",
      staffId,
      customerName: "Hosted Guest",
      customerEmail: "hosted@example.test",
      customerPhone: "+1 555 010 1200",
      customerNote: null,
      startAt: new Date("2026-10-20T13:00:00.000Z"),
      endAt: new Date("2026-10-20T14:00:00.000Z"),
      updatedAt: new Date("2026-10-01T12:00:00.000Z"),
      timezoneSnapshot: "America/New_York",
      serviceNameSnapshot: "Hosted Service",
      serviceDurationSnapshot: 60,
      priceCentsSnapshot: 12_000,
      currencySnapshot: "USD",
      staff: { name: "Hosted Professional" },
      service: { slug: "hosted-service" },
    };
    const transaction = {
      booking: {
        findFirst: vi.fn(() => query(booking)),
        findMany: vi.fn(() => query([])),
        updateMany: vi.fn(() => query({ count: 1 })),
      },
      businessSettings: {
        findUnique: vi.fn(() => query({
          timezone: "America/New_York",
          rescheduleCutoffMinutes: 240,
          bookingLeadMinutes: 0,
          bookingHorizonDays: 365,
          slotIntervalMinutes: 60,
        })),
      },
      service: {
        findFirst: vi.fn(() => query({
          id: booking.serviceId,
          slug: booking.service.slug,
          name: booking.serviceNameSnapshot,
          durationMinutes: booking.serviceDurationSnapshot,
          staffServices: [{ staff: { id: staffId, name: booking.staff.name } }],
        })),
      },
      availabilityRule: {
        findMany: vi.fn(() => query([{ staffId, startLocalMinutes: 540, endLocalMinutes: 1020 }])),
      },
      blockedTime: { findMany: vi.fn(() => query([])) },
      bookingRescheduleEvent: { create: vi.fn(() => query({ id: "event" })) },
    };
    const database = {
      $transaction: vi.fn(async (operation: (client: typeof transaction) => Promise<unknown>) => operation(transaction)),
    } as unknown as PrismaClient;

    const result = await reschedulePublicBooking({
      reference: booking.publicReference,
      email: booking.customerEmail,
      expectedStatus: booking.status,
      expectedStartAt: booking.startAt.toISOString(),
      startAt: "2026-10-20T16:00:00.000Z",
    }, new Date("2026-10-01T12:00:00.000Z"), database);

    expect(result.startAt).toBe("2026-10-20T16:00:00.000Z");
    expect(maximumActiveQueries).toBe(1);
    expect(transaction.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        publicReference: booking.publicReference,
        customerEmail: booking.customerEmail,
      },
    }));
  });

  it("logs only sanitized existence facts when combined verification fails", async () => {
    const reference = "AUR-0000000000000002";
    const email = "private@example.test";
    const findFirst = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "reference-match" })
      .mockResolvedValueOnce({ id: "email-match" })
      .mockResolvedValueOnce({ id: "combined-match" });
    const transaction = {
      booking: { findFirst },
      businessSettings: {
        findUnique: vi.fn().mockResolvedValue({
          rescheduleCutoffMinutes: 240,
          timezone: "America/New_York",
        }),
      },
    };
    const database = {
      $transaction: vi.fn(async (operation: (client: typeof transaction) => Promise<unknown>) => operation(transaction)),
    } as unknown as PrismaClient;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(reschedulePublicBooking({
      reference,
      email,
      expectedStatus: "PENDING",
      expectedStartAt: "2026-10-20T13:00:00.000Z",
      startAt: "2026-10-20T16:00:00.000Z",
    }, new Date("2026-10-01T12:00:00.000Z"), database)).rejects.toBeInstanceOf(BookingVerificationError);

    expect(log).toHaveBeenCalledWith("booking_reschedule_verification_diagnostic", {
      bookingExistsByReference: true,
      bookingExistsByEmail: true,
      bookingExistsByCombinedReferenceAndEmail: true,
      transactionStarted: true,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain(reference);
    expect(JSON.stringify(log.mock.calls)).not.toContain(email);
    log.mockRestore();
  });

  it("logs only sanitized Prisma and driver error metadata from diagnostic probes", async () => {
    const diagnosticError = Object.assign(new Error("sensitive driver message"), {
      name: "PrismaClientKnownRequestError",
      code: "P2039",
      meta: { driverAdapterError: { cause: { originalCode: "XX000" } } },
    });
    const transaction = {
      booking: {
        findFirst: vi.fn()
          .mockResolvedValueOnce(null)
          .mockRejectedValueOnce(diagnosticError)
          .mockResolvedValueOnce({ id: "email-match" })
          .mockResolvedValueOnce(null),
      },
      businessSettings: {
        findUnique: vi.fn().mockResolvedValue({
          rescheduleCutoffMinutes: 240,
          timezone: "America/New_York",
        }),
      },
    };
    const database = {
      $transaction: vi.fn(async (operation: (client: typeof transaction) => Promise<unknown>) => operation(transaction)),
    } as unknown as PrismaClient;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(reschedulePublicBooking({
      reference: "AUR-0000000000000003",
      email: "private@example.test",
      expectedStatus: "PENDING",
      expectedStartAt: "2026-10-20T13:00:00.000Z",
      startAt: "2026-10-20T16:00:00.000Z",
    }, new Date("2026-10-01T12:00:00.000Z"), database)).rejects.toBeInstanceOf(BookingVerificationError);

    expect(log).toHaveBeenCalledWith("booking_reschedule_verification_diagnostic", {
      bookingExistsByReference: false,
      bookingExistsByEmail: true,
      bookingExistsByCombinedReferenceAndEmail: false,
      transactionStarted: true,
      prismaErrorClass: "Error",
      prismaErrorName: "PrismaClientKnownRequestError",
      prismaErrorCode: "P2039",
      driverErrorCode: "XX000",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive driver message");
    log.mockRestore();
  });
});
