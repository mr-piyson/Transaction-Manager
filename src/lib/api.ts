import { Hono } from "hono";
import { authRoute } from "../../api/auth.route";
import { invoicesRoute } from "../../api/invoices.route";
import { Customers_Route } from "../../api/customers.route";
export const app = new Hono().basePath("/api");

app.route("/auth", authRoute);
app.route("/", invoicesRoute);
app.route("/", Customers_Route);
