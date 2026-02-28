import { Elysia, ValidationError } from "elysia";
import { ApiResponse } from "@/lib/api";
import { env } from "@/lib/env";
import { z } from "zod";
import { authRoutes } from "./routes/auth.route";
import { organizationRoutes } from "./routes/orgnization.route";
import { customerRoutes } from "./routes/customer.route";
import { invoiceRoutes } from "./routes/invoice.route";
import { userRoutes } from "./routes/user.route";
import { inventoryRoutes } from "./routes/inventory.route";

const isDevelopment = process.env.NODE_ENV !== "production";
export type API = typeof app;
export const app = new Elysia({ prefix: "/api" })
  .use(authRoutes)
  .use(organizationRoutes)
  .use(userRoutes)
  .use(customerRoutes)
  .use(inventoryRoutes)
  .use(invoiceRoutes);
