import { Hono } from "hono";
import { z } from "zod";
import { AuthEnv, authMiddleware } from "./middlewares/auth.middleware";
import { requirePermission } from "./middlewares/rbac.middleware";
import { validate } from "./middlewares/validation.middleware";
import { AssetStatus } from "@prisma/client";
import { Permission } from "@/types/rbac";
import { AssetService } from "../services/assets.service";
import { HonoResponse } from "../utils/response";

// All routes require authentication

// Validation schemas
const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().transform(str => new Date(str)),
  purchasePrice: z.number().positive("Purchase price must be positive"),
  currentValue: z.number().min(0, "Current value cannot be negative"),
  category: z.string().min(1, "Category is required"),
  location: z.string().optional(),
});

const updateAssetSchema = createAssetSchema.partial().extend({
  status: z.enum(["ACTIVE", "MAINTENANCE", "RETIRED", "SOLD"]).optional(),
});

const assetRouter = new Hono()
  .use("/*", authMiddleware)
  .get("/", requirePermission(Permission.ASSET_READ), async c => {
    /**
     * GET /api/assets
     * List all assets
     */
    try {
      const user = c.get("user");
      const { category, status, search, page, limit } = c.req.query();

      const result = await AssetService.list(user.tenantId, {
        category,
        status: status as AssetStatus,
        search,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      return HonoResponse.paginated(c, result.assets, result.page, result.limit, result.total);
    } catch (error: any) {
      return HonoResponse.error(c, error.message);
    }
  })
  .get("/stats", requirePermission(Permission.ASSET_READ), async c => {
    /**
     * GET /api/assets/stats
     * Get asset statistics
     */
    try {
      const user = c.get("user");
      const stats = await AssetService.getStats(user.tenantId);
      return HonoResponse.success(c, stats);
    } catch (error: any) {
      return HonoResponse.error(c, error.message);
    }
  })
  .get("/by-category", requirePermission(Permission.ASSET_READ), async c => {
    /**
     * GET /api/assets/by-category
     * Get assets grouped by category
     */
    try {
      const user = c.get("user");
      const data = await AssetService.getByCategory(user.tenantId);
      return HonoResponse.success(c, data);
    } catch (error: any) {
      return HonoResponse.error(c, error.message);
    }
  })
  .get("/:id", requirePermission(Permission.ASSET_READ), async c => {
    /**
     * GET /api/assets/:id
     * Get asset by ID
     */
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      const asset = await AssetService.getById(id, user.tenantId);
      return HonoResponse.success(c, asset);
    } catch (error: any) {
      return HonoResponse.notFound(c, error.message);
    }
  })
  .post("/", requirePermission(Permission.ASSET_CREATE), validate(createAssetSchema), async c => {
    /**
     * POST /api/assets
     * Create new asset
     */
    try {
      const user = c.get("user");
      const data = await c.req.json();
      const asset = await AssetService.create(user.tenantId, data);
      return HonoResponse.created(c, asset, "Asset created successfully");
    } catch (error: any) {
      return HonoResponse.error(c, error.message);
    }
  })
  .put("/:id", requirePermission(Permission.ASSET_UPDATE), validate(updateAssetSchema), async c => {
    /**
     * PUT /api/assets/:id
     * Update asset
     */
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      const data = await c.req.json();
      const asset = await AssetService.update(id, user.tenantId, data);
      return HonoResponse.success(c, asset, "Asset updated successfully");
    } catch (error: any) {
      return HonoResponse.error(c, error.message);
    }
  })
  .delete("/:id", requirePermission(Permission.ASSET_DELETE), async c => {
    /**
     * DELETE /api/assets/:id
     * Delete asset
     */
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      await AssetService.delete(id, user.tenantId);
      return HonoResponse.success(c, null, "Asset deleted successfully");
    } catch (error: any) {
      return HonoResponse.error(c, error.message);
    }
  });

export default assetRouter;
