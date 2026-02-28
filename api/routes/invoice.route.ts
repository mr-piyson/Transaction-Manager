import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import { invoiceAction } from "@/actions/invoice.action";

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
        const data = await invoiceAction.getAll({
          page: query.page ? Number(query.page) : undefined,
          limit: query.limit ? Number(query.limit) : undefined,
          customerId: query.customerId ? Number(query.customerId) : undefined,
          from: query.from ? new Date(query.from) : undefined,
          to: query.to ? new Date(query.to) : undefined,
        });
        return { success: true, ...data };
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
        const data = await invoiceAction.getSummary({
          from: query.from ? new Date(query.from) : undefined,
          to: query.to ? new Date(query.to) : undefined,
        });
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
        const data = await invoiceAction.getById(Number(params.id));
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
        const data = await invoiceAction.create(body as any);
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
        const data = await invoiceAction.update(Number(params.id), body as any);
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
        const data = await invoiceAction.addItem(
          Number(params.id),
          body as any,
        );
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
        const data = await invoiceAction.removeItem(Number(params.itemId));
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
        const data = await invoiceAction.delete(Number(params.id));
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    { params: t.Object({ id: t.String() }) },
  );
