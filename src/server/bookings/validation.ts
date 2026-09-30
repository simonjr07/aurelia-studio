import { z } from "zod";

import { normalizeEmail } from "../auth/validation";

const optionalTrimmedNote = z
  .string()
  .trim()
  .max(2000, "Note must be 2,000 characters or fewer.")
  .optional()
  .transform((value) => value || undefined);

export const publicBookingRequestSchema = z
  .object({
    serviceSlug: z.string().trim().min(1).max(160),
    staffId: z.uuid().optional(),
    startAt: z.iso.datetime({ offset: true }),
    customerName: z
      .string()
      .trim()
      .min(1, "Enter your name.")
      .max(120, "Name must be 120 characters or fewer."),
    customerEmail: z
      .string()
      .trim()
      .max(320, "Email must be 320 characters or fewer.")
      .email("Enter a valid email address.")
      .transform(normalizeEmail),
    customerPhone: z
      .string()
      .trim()
      .min(7, "Enter a phone number.")
      .max(40, "Phone number must be 40 characters or fewer.")
      .regex(
        /^[+()0-9.\-\s]+$/,
        "Phone number contains unsupported characters.",
      ),
    customerNote: optionalTrimmedNote,
  })
  .strict();

export type PublicBookingInput = z.infer<typeof publicBookingRequestSchema>;

