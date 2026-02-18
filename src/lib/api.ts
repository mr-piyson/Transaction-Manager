import { Hono } from "hono";

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
import setupRouter from "../../api/setup.route";

// Create app
const app = new Hono();

// Global middlewares
// app.use("*", honoLogger());

// API routes

const routes = app
  .route("/api/setup", setupRouter)
  .route("/api/auth", authRouter)
  .route("/api/customers", customerRouter)
  .route("/api/invoices", invoiceRouter)
  .route("/api/assets", assetRouter)
  .route("/api/stock", stockRouter)
  .route("/api/warehouses", warehouseRouter)
  .route("/api/transactions", transactionRouter)
  .route("/api/notifications", notificationRouter)
  .route("/api/tenant", tenantRouter);

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

export type AppType = typeof routes;
export default app;
