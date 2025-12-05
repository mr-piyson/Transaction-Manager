import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
    JWT_SECRET_ACCESS: z.string(),
    JWT_SECRET_REFRESH: z.string(),
    ACCESS_TOKEN_EXPIRY: z.string(),
    REFRESH_TOKEN_EXPIRY: z.string(),
  },
  runtimeEnv: process.env,
  onValidationError: issues => {
    console.error(`Invalid environment variables:`);
    issues.forEach(issue => {
      if (issue.path) console.log("\x1b[31m", issue.path[0].toString().trim(), "\x1b[31m", "\x1b[0m=\x1b[0m", "\x1b[32m", '""', "\x1b[32m");
    });
    // throw error with out log the zod runtime error log
    process.exit(1);
  },
  onInvalidAccess(variable) {
    console.error(`❌ Invalid access to environment variable: ${variable}`);
    process.exit(1);
  },
});
