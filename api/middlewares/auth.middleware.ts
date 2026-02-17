import { getCurrentUser, TokenPayload } from "../../services/auth.service";
import { createMiddleware } from "hono/factory";

declare module "hono" {
  interface ContextVariableMap {
    user: TokenPayload;
  }
}

// Define the Hono context environment to strongly type the user object
export type AuthEnv = {
  Variables: {
    user: TokenPayload;
  };
};

const SKIP = new Set(["/api/auth"]);

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  try {
    // skip routes
    if (SKIP.has(c.req.path)) return next();
    // getCurrentUser handles cookie reading, token verification, and refresh rotation natively
    const user = await getCurrentUser();

    if (!user) {
      return c.json(
        {
          success: false,
          error: "Unauthorized: Invalid or expired session.",
        },
        401,
      );
    }

    // Attach the user payload to the Hono context for downstream routes
    c.set("user", user);

    // Continue to the next middleware or route handler
    await next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return c.json(
      {
        success: false,
        error: "Internal server error during authentication.",
      },
      500,
    );
  }
});
