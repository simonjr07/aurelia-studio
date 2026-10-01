import { z } from "zod";

import { normalizeEmail } from "../auth/validation";
import { BOOKING_REFERENCE_PATTERN } from "./reference";

export const publicBookingLookupSchema = z
  .object({
    reference: z
      .string()
      .trim()
      .max(32, "Booking reference is too long.")
      .regex(BOOKING_REFERENCE_PATTERN, "Enter a valid booking reference."),
    email: z
      .string()
      .trim()
      .max(320, "Email must be 320 characters or fewer.")
      .email("Enter a valid email address.")
      .transform(normalizeEmail),
  })
  .strict();

export type PublicBookingLookupInput = z.infer<
  typeof publicBookingLookupSchema
>;

