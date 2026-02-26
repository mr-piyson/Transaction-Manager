// src/server.ts
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { failure, success } from "@/lib/api";

/* --------------------------- APP SETUP ----------------------------- */

const app = new Hono()

  /**
   * Global error handler
   * - Maps known errors to HTTP status codes
   * - Always returns unified ApiResponse format
   */
  .onError((err, c) => {
    // Zod validation error
    if (err instanceof z.ZodError) {
      c.status(400);
      return c.json(
        failure("VALIDATION", err.issues[0]?.message ?? "Invalid request"),
      );
    }

    // Not found (if thrown manually)
    if ((err as any)?.status === 404) {
      c.status(404);
      return c.json(failure("NOT_FOUND", err.message));
    }

    // Fallback
    c.status(500);
    return c.json(failure("INTERNAL_ERROR", err.message ?? "Unexpected error"));
  })

  /**
   * Global response wrapper middleware
   * - Ensures every successful handler returns ApiResponse
   * - Skips wrapping if already formatted
   */
  .use("*", async (c, next) => {
    await next();

    const res = c.res;
    const contentType = res.headers.get("content-type") ?? "";

    // Only process JSON responses
    if (!contentType.includes("application/json")) return;

    const cloned = res.clone();
    const body = await cloned.json().catch(() => undefined);

    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      "message" in body &&
      "data" in body
    ) {
      return; // already formatted
    }

    c.res = c.json(success(body ?? null));
  });

/* --------------------------- SCHEMAS ------------------------------- */

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

/* --------------------------- ROUTES -------------------------------- */

/**
 * GET /users/:id
 * - Validates params with Zod
 * - Returns raw data → auto-wrapped by middleware
 */
app.get("/user", zValidator("param", z.object({ id: z.string() })), (c) => {
  const { id } = c.req.valid("param");
  return c.json({ id, name: "John Doe" });
});

/**
 * GET /fail
 * - Demonstrates error handling
 */
app.get("/fail", () => {
  throw new Error("Something went terribly wrong!");
});

/* --------------------------- START --------------------------------- */

export default app;
