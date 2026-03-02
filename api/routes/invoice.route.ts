import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import db from "@/lib/database";

const InvoiceItemSchema = t.Object({
  code: t.Optional(t.String()),
  description: t.String({ minLength: 1 }),
  purchasePrice: t.Number({ minimum: 0 }),
  salesPrice: t.Number({ minimum: 0 }),
  inventoryItemId: t.Optional(t.Number()),
  total: t.Number({ minimum: 0 }),
  subItems: t.Optional(
    t.Array(
      t.Object({
        code: t.Optional(t.String()),
        description: t.String({ minLength: 1 }),
        purchasePrice: t.Number({ minimum: 0 }),
        salesPrice: t.Number({ minimum: 0 }),
        inventoryItemId: t.Optional(t.Number()),
        total: t.Number({ minimum: 0 }),
      }),
    ),
  ),
});

export const invoiceRoutes = new Elysia({ prefix: "/invoices" })
  .use(authMiddleware)
  .get(
    "/",
    async ({ query, set }) => {
      try {
        const data = await db.invoice.findMany({});
        return data;
      } catch (e: any) {
        set.status = 500;
        return { success: false, message: e.message };
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        customerId: t.Optional(t.String()),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/summary",
    async ({ query, set }) => {
      try {
        const data = {};
        return { success: true, data };
      } catch (e: any) {
        set.status = 500;
        return { success: false, message: e.message };
      }
    },
    {
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/:id",
    async ({ params, set }) => {
      try {
        const data = {};
        return { success: true, data };
      } catch (e: any) {
        set.status = 404;
        return { success: false, message: e.message };
      }
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const data = {};
        set.status = 201;
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    {
      body: t.Object({
        customerId: t.Optional(t.Number()),
        description: t.Optional(t.String()),
        date: t.Optional(t.String()),
        items: t.Array(InvoiceItemSchema),
      }),
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      try {
        const data = {};
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        customerId: t.Optional(t.Number()),
        description: t.Optional(t.String()),
        date: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/:id/items",
    async ({ params, body, set }) => {
      try {
        const data = {};
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: InvoiceItemSchema,
    },
  )
  .delete(
    "/:id/items/:itemId",
    async ({ params, set }) => {
      try {
        const data = {};
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    { params: t.Object({ id: t.String(), itemId: t.String() }) },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        const data = {};
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    { params: t.Object({ id: t.String() }) },
  );
