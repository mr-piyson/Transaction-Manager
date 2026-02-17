import { Hono } from "hono";
import { z } from "zod";
import { WarehouseService } from "../services/warehouse.service";
import { authMiddleware } from "./middlewares/auth.middleware";
import { requirePermission } from "./middlewares/rbac.middleware";
import { validate } from "./middlewares/validation.middleware";
import { Permission } from "@/types/rbac";
import { HonoResponse } from "../utils/response";

const warehouseRouter = new Hono();

// All routes require authentication
warehouseRouter.use("/*", authMiddleware);

// Validation schemas
const createWarehouseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().min(1, "Location is required"),
  capacity: z.number().int().positive().optional(),
});

const updateWarehouseSchema = createWarehouseSchema.partial().extend({
  isActive: z.boolean().optional(),
});

/**
 * GET /api/warehouses
 * List all warehouses
 */
warehouseRouter.get("/", requirePermission(Permission.WAREHOUSE_READ), async c => {
  try {
    const user = c.get("user");
    const { isActive, search, page, limit } = c.req.query();

    const result = await WarehouseService.list(user.tenantId, {
      isActive: isActive ? isActive === "true" : undefined,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return HonoResponse.paginated(c, result.warehouses, result.page, result.limit, result.total);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * GET /api/warehouses/stats
 * Get warehouse statistics
 */
warehouseRouter.get("/stats", requirePermission(Permission.WAREHOUSE_READ), async c => {
  try {
    const user = c.get("user");
    const stats = await WarehouseService.getStats(user.tenantId);
    return HonoResponse.success(c, stats);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * GET /api/warehouses/:id
 * Get warehouse by ID
 */
warehouseRouter.get("/:id", requirePermission(Permission.WAREHOUSE_READ), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const warehouse = await WarehouseService.getById(id, user.tenantId);
    return HonoResponse.success(c, warehouse);
  } catch (error: any) {
    return HonoResponse.notFound(c, error.message);
  }
});

/**
 * POST /api/warehouses
 * Create new warehouse
 */
warehouseRouter.post("/", requirePermission(Permission.WAREHOUSE_CREATE), validate(createWarehouseSchema), async c => {
  try {
    const user = c.get("user");
    const data = await c.req.json();
    const warehouse = await WarehouseService.create(user.tenantId, data);
    return HonoResponse.created(c, warehouse, "Warehouse created successfully");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * PUT /api/warehouses/:id
 * Update warehouse
 */
warehouseRouter.put("/:id", requirePermission(Permission.WAREHOUSE_UPDATE), validate(updateWarehouseSchema), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const data = await c.req.json();
    const warehouse = await WarehouseService.update(id, user.tenantId, data);
    return HonoResponse.success(c, warehouse, "Warehouse updated successfully");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * DELETE /api/warehouses/:id
 * Delete warehouse
 */
warehouseRouter.delete("/:id", requirePermission(Permission.WAREHOUSE_DELETE), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    await WarehouseService.delete(id, user.tenantId);
    return HonoResponse.success(c, null, "Warehouse deleted successfully");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

export default warehouseRouter;
