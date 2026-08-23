import { z } from "zod";

/**
 * Validates a password based on configurable security requirements.
 */
export function validatePassword(
  options: {
    minLength?: number;
    maxLength?: number;
    requireNumber?: boolean;
    requireLowercase?: boolean;
    requireUppercase?: boolean;
    requireSpecialChar?: boolean;
  } = {},
) {
  const {
    minLength = 6,
    maxLength = 20,
    requireNumber = true,
    requireLowercase = true,
    requireUppercase = true,
    requireSpecialChar = true,
  } = options;

  let schema = z
    .string()
    .min(minLength, `Password must be at least ${minLength} characters long`)
    .max(maxLength, `Password must be at most ${maxLength} characters long`);

  const validationRules = [
    {
      enabled: requireUppercase,
      regex: /[A-Z]/,
      message: "Uppercase letter required",
    },
    {
      enabled: requireLowercase,
      regex: /[a-z]/,
      message: "Lowercase letter required",
    },
    { enabled: requireNumber, regex: /[0-9]/, message: "Number required" },
    {
      enabled: requireSpecialChar,
      regex: /[!@#$%^&*]/,
      message: "Special character required",
    },
  ];

  validationRules.forEach(({ enabled, regex, message }) => {
    if (enabled) {
      schema = schema.regex(regex, message);
    }
  });

  return schema; // Return the schema instead of the result
}
/**
 * Validates and normalizes email addresses with configurable business logic.
 */

export function validateEmail(
  options: {
    allowedDomains?: string[];
    blockedDomains?: string[];
    maxLength?: number;
    allowPlusSign?: boolean;
  } = {},
) {
  const {
    allowedDomains = [],
    blockedDomains = [],
    maxLength = 254,
    allowPlusSign = false,
  } = options;

  return (
    z
      .email("Invalid email format")
      .max(maxLength, `Email must be at most ${maxLength} characters`)
      // 1. Transform to lowercase (Normalization)
      .transform((val) => val.toLowerCase())
      // 2. Custom Business Logic (Refinement)
      .superRefine((email, ctx) => {
        const domain = email.split("@")[1];

        if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
          ctx.addIssue({
            code: "custom", // Use the string literal directly
            message: `Registration is only allowed for: ${allowedDomains.join(", ")}`,
          });
        }

        if (blockedDomains.includes(domain)) {
          ctx.addIssue({
            code: "custom",
            message: "This email provider is not allowed",
          });
        }

        if (!allowPlusSign && email.includes("+")) {
          ctx.addIssue({
            code: "custom",
            message: "Email sub-addressing (using '+') is not permitted",
          });
        }
      })
  );
}
/**
 * validations
 * @param passwordField
 * @param confirmPasswordField
 * @returns
 */
export function validateConfirmPassword(
  passwordField: string,
  confirmPasswordField: string,
) {
  return z
    .object({
      [passwordField]: z.string(),
      [confirmPasswordField]: z.string(),
    })
    .refine((data) => data[passwordField] === data[confirmPasswordField], {
      message: "Passwords do not match",
      path: [confirmPasswordField], // Specify the field path for better error reporting
    });
}
/**
 * Combined schema for user signup with all validations and transformations applied.
 * This can be used directly in API routes or form handlers to validate incoming data.
 */
export const SIGNUP_SCHEMA = z.object({
  name: z.string().min(3).max(30),
  email: validateEmail(),
  password: validatePassword(),
});

/**
 *
 * Reusable Zod schemas shared across routers.
 *
 * WHY CENTRALISE SCHEMAS?
 * Sorting and filter shapes repeat across every list endpoint. Centralising
 * prevents drift between routers and lets the client share a single type.
 *
 * LIST RESPONSES ARE UNPAGINATED BY DESIGN:
 * List endpoints always return every matching row as a plain array — no
 * { data, meta } envelope, no count query. Filters/sorting narrow results;
 * they never truncate them.
 */

import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");
export type SortOrder = z.infer<typeof sortOrderSchema>;

// ---------------------------------------------------------------------------
// Common field schemas
// ---------------------------------------------------------------------------

export const cuidSchema = z.string();
export const decimalSchema = z
  .number()
  .or(z.string().regex(/^\d+(\.\d+)?$/))
  .transform((v) => String(v)); // Store as string for Prisma Decimal

export const currencyCodeSchema = z
  .string()
  .min(3, "Currency code must be at least 3 characters")
  .max(3, "Currency code must be exactly 3 characters")
  .regex(/^[A-Z]{3}$/, "Currency code must be 3 uppercase letters");

export const paymentMethodSchema = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "CARD",
  "CHEQUE",
  "ONLINE",
  "CREDIT",
  "OTHER",
]);

// ---------------------------------------------------------------------------
// Exchange rate schemas
// ---------------------------------------------------------------------------

export const exchangeRateInputSchema = z.object({
  fromCurrency: currencyCodeSchema,
  toCurrency: currencyCodeSchema,
  rate: z.number().positive(),
  effectiveDate: z.date(),
});

export const syncSettingsSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
});

// ---------------------------------------------------------------------------
// Date range filter (used by invoices, payments, expenses)
// ---------------------------------------------------------------------------

export const dateRangeSchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .optional();

/** Convert a date range to Prisma `gte`/`lte` filter. */
export function toDateRangeFilter(range?: { from?: Date; to?: Date }) {
  if (!range?.from && !range?.to) return undefined;
  return {
    ...(range.from ? { gte: range.from } : {}),
    ...(range.to ? { lte: range.to } : {}),
  } satisfies Prisma.DateTimeFilter;
}
