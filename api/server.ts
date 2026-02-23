import Elysia from "elysia";
import { ForbiddenError } from "@casl/ability";

export const app = new Elysia({ prefix: "/api" })
  // Global error handler
  .onError(({ error, code, set }) => {
    if (error instanceof ForbiddenError) {
      set.status = 403;
      return { error: "Forbidden", message: error.message };
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not Found" };
    }
    if (code === "VALIDATION") {
      set.status = 422;
      return { error: "Validation Error", message: error.message };
    }
    set.status = 500;
    return { error: "Internal Server Error" };
  });

// Export the type for Eden Treaty RPC
export type App = typeof app;
