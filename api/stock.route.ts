import { Hono } from "hono";
import { z } from "zod";
import { StockService } from "../services/stock.service";
import { authMiddleware } from "./middlewares/auth.middleware";
import { requirePermission } from "./middlewares/rbac.middleware";
import { validate } from "./middlewares/validation.middleware";
import { Permission } from "@/types/rbac";
import { HonoResponse } from "../utils/response";

const stockRouter = new Hono();

// All routes require authentication
stockRouter.use("/*", authMiddleware);

// Validation schemas
const createStockSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
  minQuantity: z.number().int().min(0, "Minimum quantity cannot be negative"),
  unitPrice: z.number().positive("Unit price must be positive"),
  warehouseId: z.string().min(1, "Warehouse ID is required"),
});

const updateStockSchema = createStockSchema.partial();

const updateQuantitySchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  operation: z.enum(["add", "subtract", "set"]),
});

/**
 * GET /api/stock
 * List all stock items
 */
stockRouter.get("/", requirePermission(Permission.STOCK_READ), async c => {
  try {
    const user = c.get("user");
    const { warehouseId, search, lowStock, page, limit } = c.req.query();

    const result = await StockService.list(user.tenantId, {
      warehouseId,
      search,
      lowStock: lowStock === "true",
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return HonoResponse.paginated(c, result.items, result.page, result.limit, result.total);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * GET /api/stock/stats
 * Get stock statistics
 */
stockRouter.get("/stats", requirePermission(Permission.STOCK_READ), async c => {
  try {
    const user = c.get("user");
    const stats = await StockService.getStats(user.tenantId);
    return HonoResponse.success(c, stats);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * GET /api/stock/low-stock
 * Get low stock items
 */
stockRouter.get("/low-stock", requirePermission(Permission.STOCK_READ), async c => {
  try {
    const user = c.get("user");
    const items = await StockService.getLowStock(user.tenantId);
    return HonoResponse.success(c, items);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * GET /api/stock/:id
 * Get stock item by ID
 */
stockRouter.get("/:id", requirePermission(Permission.STOCK_READ), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const item = await StockService.getById(id, user.tenantId);
    return HonoResponse.success(c, item);
  } catch (error: any) {
    return HonoResponse.notFound(c, error.message);
  }
});

/**
 * POST /api/stock
 * Create new stock item
 */
stockRouter.post("/", requirePermission(Permission.STOCK_CREATE), validate(createStockSchema), async c => {
  try {
    const user = c.get("user");
    const data = await c.req.json();
    const item = await StockService.create(user.tenantId, data);
    return HonoResponse.created(c, item, "Stock item created successfully");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * PUT /api/stock/:id
 * Update stock item
 */
stockRouter.put("/:id", requirePermission(Permission.STOCK_UPDATE), validate(updateStockSchema), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const data = await c.req.json();
    const item = await StockService.update(id, user.tenantId, data);
    return HonoResponse.success(c, item, "Stock item updated successfully");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * PATCH /api/stock/:id/quantity
 * Update stock quantity
 */
stockRouter.patch("/:id/quantity", requirePermission(Permission.STOCK_UPDATE), validate(updateQuantitySchema), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const { quantity, operation } = await c.req.json();
    const item = await StockService.updateQuantity(id, user.tenantId, quantity, operation);
    return HonoResponse.success(c, item, "Stock quantity updated successfully");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * DELETE /api/stock/:id
 * Delete stock item
 */
stockRouter.delete("/:id", requirePermission(Permission.STOCK_DELETE), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    await StockService.delete(id, user.tenantId);
    return HonoResponse.success(c, null, "Stock item deleted successfully");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

export default stockRouter;
