import { Hono } from "hono";
import { z } from "zod";
import { TransactionService } from "../services/transaction.service";
import { authMiddleware } from "./middlewares/auth.middleware";
import { requirePermission } from "./middlewares/rbac.middleware";
import { validate } from "./middlewares/validation.middleware";
import { TransactionType, TransactionStatus } from "@prisma/client";
import { Permission } from "@/types/rbac";
import { HonoResponse } from "../utils/response";

const transactionRouter = new Hono();

// All routes require authentication
transactionRouter.use("/*", authMiddleware);

// Validation schemas
const createTransactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  invoiceId: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "CANCELLED"]),
});

/**
 * GET /api/transactions
 * List all transactions
 */
transactionRouter.get("/", requirePermission(Permission.TRANSACTION_READ), async c => {
  try {
    const user = c.get("user");
    const { type, status, dateFrom, dateTo, search, page, limit } = c.req.query();

    const result = await TransactionService.list(user.tenantId, {
      type: type as TransactionType,
      status: status as TransactionStatus,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return HonoResponse.paginated(c, result.transactions, result.page, result.limit, result.total);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * GET /api/transactions/stats
 * Get transaction statistics
 */
transactionRouter.get("/stats", requirePermission(Permission.TRANSACTION_READ), async c => {
  try {
    const user = c.get("user");
    const { dateFrom, dateTo } = c.req.query();

    const period = dateFrom && dateTo ? { from: new Date(dateFrom), to: new Date(dateTo) } : undefined;

    const stats = await TransactionService.getStats(user.tenantId, period);
    return HonoResponse.success(c, stats);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * GET /api/transactions/monthly/:year
 * Get monthly transaction summary
 */
transactionRouter.get("/monthly/:year", requirePermission(Permission.TRANSACTION_READ), async c => {
  try {
    const user = c.get("user");
    const year = parseInt(c.req.param("year"));
    const summary = await TransactionService.getMonthlySummary(user.tenantId, year);
    return HonoResponse.success(c, summary);
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * GET /api/transactions/:id
 * Get transaction by ID
 */
transactionRouter.get("/:id", requirePermission(Permission.TRANSACTION_READ), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const transaction = await TransactionService.getById(id, user.tenantId);
    return HonoResponse.success(c, transaction);
  } catch (error: any) {
    return HonoResponse.notFound(c, error.message);
  }
});

/**
 * POST /api/transactions
 * Create new transaction
 */
transactionRouter.post("/", requirePermission(Permission.TRANSACTION_CREATE), validate(createTransactionSchema), async c => {
  try {
    const user = c.get("user");
    const data = await c.req.json();
    const transaction = await TransactionService.create(user.tenantId, user.userId, data);
    return HonoResponse.created(c, transaction, "Transaction created successfully");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * PATCH /api/transactions/:id/status
 * Update transaction status
 */
transactionRouter.patch("/:id/status", requirePermission(Permission.TRANSACTION_UPDATE), validate(updateStatusSchema), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const { status } = await c.req.json();
    const transaction = await TransactionService.updateStatus(id, user.tenantId, status);
    return HonoResponse.success(c, transaction, "Transaction status updated");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete transaction
 */
transactionRouter.delete("/:id", requirePermission(Permission.TRANSACTION_DELETE), async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    await TransactionService.delete(id, user.tenantId);
    return HonoResponse.success(c, null, "Transaction deleted successfully");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

export default transactionRouter;
