import { z } from "zod";

import { normalizeEmail } from "../auth/validation";

export const MAX_PRICE_CENTS = 100_000_000;

export function normalizeServiceSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
}

export function parseMoneyToCents(value: string) {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (cents > BigInt(MAX_PRICE_CENTS)) return null;
  return Number(cents);
}

const serviceBaseSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  slug: z.string().trim().max(160).optional().default(""),
  description: z.string().trim().min(1, "Description is required.").max(5000),
  durationMinutes: z.coerce.number().int().min(5).max(720),
  price: z.string().trim().min(1),
  currency: z.string().trim().toUpperCase().pipe(z.literal("USD")),
  isPublished: z.boolean(),
  isActive: z.boolean(),
}).strict();

export const serviceInputSchema = serviceBaseSchema.transform((input, context) => {
  const slug = normalizeServiceSlug(input.slug || input.name);
  const priceCents = parseMoneyToCents(input.price);
  if (!slug) {
    context.addIssue({ code: "custom", path: ["slug"], message: "Enter a URL-safe slug or a name that can generate one." });
  }
  if (priceCents === null) {
    context.addIssue({ code: "custom", path: ["price"], message: "Enter a valid amount with at most two decimal places." });
  }
  return { ...input, slug, priceCents: priceCents ?? 0 };
});

const passwordSchema = z
  .string()
  .min(12, "Temporary password must contain at least 12 characters.")
  .max(128)
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Temporary password is too long for bcrypt.");

export const createStaffInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().max(320).email().transform(normalizeEmail),
  password: passwordSchema,
}).strict();

export const updateStaffInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  status: z.enum(["ACTIVE", "DISABLED"]),
}).strict();

export const assignmentInputSchema = z.object({
  serviceIds: z.array(z.string().uuid()).max(500).refine(
    (ids) => new Set(ids).size === ids.length,
    "Duplicate service assignments are not allowed.",
  ),
}).strict();

