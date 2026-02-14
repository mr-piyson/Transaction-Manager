import { Hono } from "hono";
import { authRoute } from "../../api/auth";
import { invoicesRoute } from "../../api/invoices";
import { Customers_Route } from "../../api/customers";
export const app = new Hono().basePath("/api");

app.route("/auth", authRoute);
app.route("/", invoicesRoute);
app.route("/", Customers_Route);
