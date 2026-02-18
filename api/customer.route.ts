import { Hono } from "hono";
import { z } from "zod";
import { AuthEnv, authMiddleware } from "./middlewares/auth.middleware";
import { requirePermission } from "./middlewares/rbac.middleware";
import { validate } from "./middlewares/validation.middleware";
import { Permission } from "@/types/rbac";
import { CustomerService } from "../services/customers.service";
import { HonoResponse } from "../utils/response";

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.boolean().optional(),
});
const customerRouter = new Hono()
  .use("/*", authMiddleware)
  .get("/", requirePermission(Permission.CUSTOMER_READ), async c => {
    /**
     * GET /api/customers
     * List all customers
     */
    try {
      const user = c.get("user");
      const { search, isActive, page, limit } = c.req.query();

      const result = await CustomerService.list(user.tenantId, {
        search,
        isActive: isActive ? isActive === "true" : undefined,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      return HonoResponse.paginated(c, result.customers, result.page, result.limit, result.total);
    } catch (error: any) {
      return HonoResponse.error(c, error.message);
    }
  })
  .get("/stats", requirePermission(Permission.CUSTOMER_READ), async c => {
    /**
     * GET /api/customers/stats
     * Get customer statistics
     */
    try {
      const user = c.get("user");
      const stats = await CustomerService.getStats(user.tenantId);
      return HonoResponse.success(c, stats);
    } catch (error: any) {
      return HonoResponse.error(c, error.message);
    }
  })
  .get("/:id", requirePermission(Permission.CUSTOMER_READ), async c => {
    /**
     * GET /api/customers/:id
     * Get customer by ID
     */
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      const customer = await CustomerService.getById(id, user.tenantId);
      return HonoResponse.success(c, customer);
    } catch (error: any) {
      return HonoResponse.notFound(c, error.message);
    }
  })
  .post("/", requirePermission(Permission.CUSTOMER_CREATE), validate(createCustomerSchema), async c => {
    /**
     * POST /api/customers
     * Create new customer
     */
    try {
      const user = c.get("user");
      const data = await c.req.json();
      const customer = await CustomerService.create(user.tenantId, data);
      return HonoResponse.created(c, customer, "Customer created successfully");
    } catch (error: any) {
      return HonoResponse.error(c, error.message);
    }
  })
  .put("/:id", requirePermission(Permission.CUSTOMER_UPDATE), validate(updateCustomerSchema), async c => {
    /**
     * PUT /api/customers/:id
     * Update customer
     */
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      const data = await c.req.json();
      const customer = await CustomerService.update(id, user.tenantId, data);
      return HonoResponse.success(c, customer, "Customer updated successfully");
    } catch (error: any) {
      return HonoResponse.error(c, error.message);
    }
  })
  .delete("/:id", requirePermission(Permission.CUSTOMER_DELETE), async c => {
    /**
     * DELETE /api/customers/:id
     * Delete customer (soft delete)
     */
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      await CustomerService.delete(id, user.tenantId);
      return HonoResponse.success(c, null, "Customer deleted successfully");
    } catch (error: any) {
      return HonoResponse.error(c, error.message);
    }
  });

export default customerRouter;
