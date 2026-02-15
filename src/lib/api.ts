import { Hono } from "hono";
import { authRoute } from "../../api/auth.route";
import { invoicesRoute } from "../../api/invoices.route";
import { Customers_Route } from "../../api/customers.route";
import { authMiddleware } from "../../api/middlewares/auth.middleware";
export const app = new Hono().basePath("/api");

app.use("*", authMiddleware);

app.route("/auth", authRoute);
app.route("/", invoicesRoute);
app.route("/customers", Customers_Route);
