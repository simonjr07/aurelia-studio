import { z } from "zod";

const MAX_BCRYPT_BYTES = 72;

export function normalizeEmail(email: string) {
  return email.trim().normalize("NFKC").toLowerCase();
}

const boundedPassword = z
  .string()
  .min(12, "Password must contain at least 12 characters.")
  .max(128, "Password is too long.")
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= MAX_BCRYPT_BYTES,
    "Password is too long for secure bcrypt processing.",
  );

export const loginCredentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .max(320)
    .email()
    .transform((email) => normalizeEmail(email)),
  password: z.string().min(1).max(128),
});

export const adminProvisionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .string()
    .trim()
    .max(320)
    .email()
    .transform((email) => normalizeEmail(email)),
  password: boundedPassword,
});
