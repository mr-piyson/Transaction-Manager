import { Hono } from "hono";
import { z } from "zod";
import { InvoiceService } from "../services/invoice.service";
import { authMiddleware } from "./middlewares/auth.middleware";
import { requirePermission } from "./middlewares/rbac.middleware";
import { validate } from "./middlewares/validation.middleware";
import { InvoiceStatus } from "@prisma/client";
import { Permission } from "@/types/rbac";
import { HonoResponse } from "../utils/response";

const invoiceRouter = new Hono();

// All routes require authentication
invoiceRouter.use("/*", authMiddleware);

// Validation schemas
const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  issueDate: z.string().transform(str => new Date(str)),
  dueDate: z.string().transform(str => new Date(str)),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.number().positive("Quantity must be positive"),
        unitPrice: z.number().positive("Unit price must be positive"),
      }),
    )
    .min(1, "At least one item is required"),
  taxRate: z.number().min(0).max(100).optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]),
});

/**
 * GET /api/invoices
 * List all invoices
 */
invoiceRouter.get("/", requirePermission(Permission.INVOICE_READ), async c => {
  try {
    const user = c.get("user");
    const { customerId, status, search, dateFrom, dateTo, page, limit } = c.req.query();

    const result = await InvoiceService.list(user.tenantId, {
      customerId,
      status: status as InvoiceStatus,
      search,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return HonoResponse.paginated(c, result.invoices, result.page, result.limit, result.total);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * GET /api/invoices/stats
 * Get invoice statistics
 */
invoiceRouter.get("/stats", requirePermission(Permission.INVOICE_READ), async c => {
  try {
    const user = c.get("user");
    const stats = await InvoiceService.getStats(user.tenantId);
    return HonoResponse.success(c, stats);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * GET /api/invoices/:id
 * Get invoice by ID
 */
invoiceRouter.get("/:id", requirePermission(Permission.INVOICE_READ), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const invoice = await InvoiceService.getById(id, user.tenantId);
    return HonoResponse.success(c, invoice);
  } catch (error: any) {
    return HonoResponse.notFound(c, error.message);
  }
});

/**
 * POST /api/invoices
 * Create new invoice
 */
invoiceRouter.post("/", requirePermission(Permission.INVOICE_CREATE), validate(createInvoiceSchema), async c => {
  try {
    const user = c.get("user");
    const data = await c.req.json();
    const invoice = await InvoiceService.create(user.tenantId, user.userId, data);
    return HonoResponse.created(c, invoice, "Invoice created successfully");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * PATCH /api/invoices/:id/status
 * Update invoice status
 */
invoiceRouter.patch("/:id/status", requirePermission(Permission.INVOICE_UPDATE), validate(updateStatusSchema), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const { status } = await c.req.json();
    const invoice = await InvoiceService.updateStatus(id, user.tenantId, status);
    return HonoResponse.success(c, invoice, "Invoice status updated");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * POST /api/invoices/:id/pay
 * Mark invoice as paid
 */
invoiceRouter.post("/:id/pay", requirePermission(Permission.INVOICE_APPROVE), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const invoice = await InvoiceService.markAsPaid(id, user.tenantId, user.userId);
    return HonoResponse.success(c, invoice, "Invoice marked as paid");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * DELETE /api/invoices/:id
 * Delete invoice
 */
invoiceRouter.delete("/:id", requirePermission(Permission.INVOICE_DELETE), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    await InvoiceService.delete(id, user.tenantId);
    return HonoResponse.success(c, null, "Invoice deleted successfully");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

export default invoiceRouter;
