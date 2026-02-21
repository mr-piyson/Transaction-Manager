import { z } from "zod";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePasswords(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validates a password based on configurable security requirements.
 */
export function validatePassword(
  password: string,
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

  // 1. Initialize base schema with length constraints
  let schema = z
    .string()
    .min(minLength, `Password must be at least ${minLength} characters long`)
    .max(maxLength, `Password must be at most ${maxLength} characters long`);

  // 2. Define validation rules in a data-driven way for scalability
  const validationRules = [
    {
      enabled: requireUppercase,
      regex: /[A-Z]/,
      message: "Password must contain at least one uppercase letter",
    },
    {
      enabled: requireLowercase,
      regex: /[a-z]/,
      message: "Password must contain at least one lowercase letter",
    },
    {
      enabled: requireNumber,
      regex: /[0-9]/,
      message: "Password must contain at least one number",
    },
    {
      enabled: requireSpecialChar,
      regex: /[!@#$%^&*]/,
      message:
        "Password must contain at least one special character (!@#$%^&*)",
    },
  ];

  // 3. Compose the schema dynamically
  validationRules.forEach(({ enabled, regex, message }) => {
    if (enabled) {
      schema = schema.regex(regex, message);
    }
  });

  // 4. Execute validation
  const result = schema.safeParse(password);

  return {
    valid: result.success,
    errors: result.success ? [] : result.error.issues.map((i) => i.message),
  };
}

/**
 * Validates and normalizes email addresses with configurable business logic.
 */
export function validateEmail(
  email: string,
  options: {
    allowedDomains?: string[];
    blockedDomains?: string[];
    maxLength?: number;
    allowPlusSign?: boolean; // e.g., user+extra@gmail.com
  } = {},
) {
  const {
    allowedDomains = [],
    blockedDomains = [],
    maxLength = 254, // Standard RFC maximum
    allowPlusSign = false,
  } = options;

  // 1. Base Schema - Use Zod's built-in email logic
  let schema = z
    .email("Invalid email format")
    .max(maxLength, `Email must be at most ${maxLength} characters`);

  // 2. Custom Business Logic Rules
  const result = schema.safeParse(email);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((i) => i.message),
      normalized: email,
    };
  }

  const validatedEmail = result.data.toLowerCase();
  const domain = validatedEmail.split("@")[1];
  const errors: string[] = [];

  // 3. Scalable Rule Checks
  if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
    errors.push(
      `Registration is only allowed for: ${allowedDomains.join(", ")}`,
    );
  }

  if (blockedDomains.includes(domain)) {
    errors.push("This email provider is not allowed (disposable or blocked)");
  }

  if (!allowPlusSign && validatedEmail.includes("+")) {
    errors.push("Email sub-addressing (using '+') is not permitted");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: validatedEmail,
  };
}
