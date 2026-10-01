import { z } from "zod";

import { normalizeEmail } from "../auth/validation";

const reference = z.string().trim().toUpperCase().regex(/^AUR-[A-Za-z0-9_-]{16}$/);
const email = z.string().trim().max(320).email().transform(normalizeEmail);
const expectedStatus = z.enum(["PENDING", "CONFIRMED"]);

export const publicCancellationSchema = z.object({
  reference, email, expectedStatus, expectedStartAt: z.string().datetime({ offset: true }),
}).strict();

export const publicRescheduleSchema = z.object({
  reference, email, expectedStatus, expectedStartAt: z.string().datetime({ offset: true }),
  startAt: z.string().datetime({ offset: true }), staffId: z.string().uuid().optional(),
}).strict();

export const internalRescheduleSchema = z.object({
  expectedStatus, expectedStartAt: z.string().datetime({ offset: true }),
  startAt: z.string().datetime({ offset: true }), staffId: z.string().uuid().optional(),
  note: z.string().trim().max(1000).optional().transform((value) => value || null),
}).strict();

