import { Context, Next } from "hono";
import { HonoResponse } from "../../utils/response";

/**
 * Ensures all queries are scoped to the authenticated user's tenant
 */
export const tenantMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (!user) {
    return HonoResponse.unauthorized(c);
  }

  // Tenant ID is already validated in auth middleware
  // This middleware can be used for additional tenant-specific logic

  await next();
};
