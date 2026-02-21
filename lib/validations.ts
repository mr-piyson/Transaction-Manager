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
