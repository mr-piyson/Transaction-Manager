import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
    DATABASE_PROVIDER: z
      .enum([
        "sqlite",
        "postgresql",
        "mysql",
        "sqlserver",
        "cockroachdb",
        "mongodb",
      ])
      .default("postgresql"),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
    // Injected by Next.js at runtime ("nodejs" | "edge"); unset under plain bun.
    NEXT_RUNTIME: z.enum(["nodejs", "edge", "bun"]).optional(),
    // Boot opt-outs are free-form strings compared with === "true" downstream;
    // strict enums here would kill the server on typos like "TRUE"/"1".
    DISABLE_PERMISSION_SYNC: z.string().optional(),
    DATA_DIR: z.string().default(".data"),
    NODE_ENV: z.enum(["development", "production"]).optional(),
  },
  runtimeEnv: process.env,
  onValidationError: (error: unknown) => {
    console.error("\x1b[31m%s\x1b[0m", "❌ Invalid Environment Variables:");

    // @t3-oss/env-core passes the Standard-Schema issues ARRAY (not an Error),
    // but stay defensive so a future version bump can never crash the reporter
    // before it tells us which variable is wrong.
    const issues: Array<{ path?: unknown; message?: string }> = Array.isArray(
      error,
    )
      ? error
      : (((error as { issues?: unknown })?.issues as never) ?? []);

    if (issues.length === 0) {
      console.error(error);
    }

    for (const issue of issues) {
      const firstPath = Array.isArray(issue.path) ? issue.path[0] : issue.path;
      const varName = firstPath != null ? String(firstPath) : "UNKNOWN";
      const errorMessage = issue.message ?? "Invalid value";

      // Output format: NAME="current_val" -> Error detail
      console.log(
        "  \x1b[1m\x1b[31m%s\x1b[0m \x1b[90m->\x1b[0m \x1b[33m%s\x1b[0m",
        varName.padEnd(20), // Aligns the arrows
        errorMessage,
      );
    }

    console.log(
      "\n\x1b[41m\x1b[37m%s\x1b[0m",
      " FATAL: Fix your .env file to continue. ",
    );
    throw new Error(
      "Invalid environment variables. Fix your .env file to continue.",
    );
  },

  onInvalidAccess(variable) {
    console.error(
      "\x1b[31m%s\x1b[0m \x1b[1m%s\x1b[0m",
      "❌ Invalid access to:",
      variable,
    );
    throw new Error(
      `Invalid access to server-side environment variable: ${variable}`,
    );
  },
});
