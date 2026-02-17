import { Hono } from "hono";
import { z } from "zod";
import { TenantService } from "../services/tenant.service";
import { authMiddleware } from "./middlewares/auth.middleware";
import { requirePermission } from "./middlewares/rbac.middleware";
import { validate } from "./middlewares/validation.middleware";
import { HonoResponse } from "../utils/response";
import { Permission } from "@/types/rbac";

const tenantRouter = new Hono();

// All routes require authentication
tenantRouter.use("/*", authMiddleware);

// Validation schemas
const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  plan: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/tenant
 * Get current tenant info
 */
tenantRouter.get("/", async c => {
  try {
    const user = c.get("user");
    const tenant = await TenantService.getById(user.tenantId);
    return HonoResponse.success(c, tenant);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * GET /api/tenant/stats
 * Get tenant statistics
 */
tenantRouter.get("/stats", async c => {
  try {
    const user = c.get("user");
    const stats = await TenantService.getStats(user.tenantId);
    return HonoResponse.success(c, stats);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * GET /api/tenant/users
 * Get all users in tenant
 */
tenantRouter.get("/users", requirePermission(Permission.USER_READ), async c => {
  try {
    const user = c.get("user");
    const users = await TenantService.getUsers(user.tenantId);
    return HonoResponse.success(c, users);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * PUT /api/tenant
 * Update tenant
 */
tenantRouter.put("/", requirePermission(Permission.TENANT_MANAGE), validate(updateTenantSchema), async c => {
  try {
    const user = c.get("user");
    const data = await c.req.json();
    const tenant = await TenantService.update(user.tenantId, data);
    return HonoResponse.success(c, tenant, "Tenant updated successfully");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

export default tenantRouter;
