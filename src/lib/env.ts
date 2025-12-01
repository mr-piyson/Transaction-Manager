import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";
import { log } from "./log";

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
    console.error(`❌ Invalid environment variables:`);
    issues.forEach(issue => {
      log([
        { message: issue.path, color: "blue" },
        { message: " → ", color: "reset" },
        { message: issue.message, color: "red" },
      ]);
    });

    // throw error with out log the zod runtime error log
    process.exit(1);
  },
  onInvalidAccess(variable) {
    console.error(`❌ Invalid access to environment variable: ${variable}`);
    process.exit(1);
  },
});
