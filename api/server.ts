import { Elysia } from "elysia";
import { authRoutes } from "./routes/auth.route";
import { organizationRoutes } from "./routes/orgnization.route";
import { customerRoutes } from "./routes/customer.route";
import { invoiceRoutes } from "./routes/invoice.route";
import { userRoutes } from "./routes/user.route";
import { inventoryRoutes } from "./routes/inventory.route";

export type API = typeof app;
export const app = new Elysia({ prefix: "/api" })
  .use(authRoutes)
  .use(organizationRoutes)
  .use(userRoutes)
  .use(customerRoutes)
  .use(inventoryRoutes)
  .use(invoiceRoutes);
