import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";

import { env } from "./env";
import { errorHandler } from "../../api/middlewares/error.middleware";
import { logger } from "../../utils/logger.util";

// Import routes
import authRouter from "../../api/auth.route";
import customerRouter from "../../api/customer.route";
import invoiceRouter from "../../api/invoice.route";
import assetRouter from "../../api/asset.route";
import stockRouter from "../../api/stock.route";
import warehouseRouter from "../../api/warehouse.route";
import transactionRouter from "../../api/transaction.route";
import notificationRouter from "../../api/notification.route";
import tenantRouter from "../../api/tenant.route";
// Import workers
import { notificationWorker } from "../../workers/notification.worker";
import setupRouter from "../../api/setup.route";
import { AuthEnv } from "../../api/middlewares/auth.middleware";

// Start Workers
notificationWorker.start();

// Create app
const app = new Hono<AuthEnv>();

// Global middlewares
app.use("*", honoLogger());

// Health check
app.get("/health", c => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

// API routes
app.route("/api/setup", setupRouter);
app.route("/api/auth", authRouter);
app.route("/api/customers", customerRouter);
app.route("/api/invoices", invoiceRouter);
app.route("/api/assets", assetRouter);
app.route("/api/stock", stockRouter);
app.route("/api/warehouses", warehouseRouter);
app.route("/api/transactions", transactionRouter);
app.route("/api/notifications", notificationRouter);
app.route("/api/tenant", tenantRouter);

// 404 handler
app.notFound(c => {
  return c.json(
    {
      success: false,
      message: "Route not found",
      path: c.req.path,
    },
    404,
  );
});

// Error handler
app.onError(errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  process.exit(0);
});

export default app;
