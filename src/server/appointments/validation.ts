import { z } from "zod";

export const bookingStatusUpdateSchema = z
  .object({
    expectedStatus: z.enum([
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ]),
    status: z.enum([
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ]),
    note: z
      .string()
      .trim()
      .max(1000, "Note must be 1,000 characters or fewer.")
      .optional()
      .transform((value) => value || undefined),
  })
  .strict();

