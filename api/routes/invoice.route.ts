import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import db from "@/lib/database";

// ─────────────────────────────────────────────────────────────────────────────
// TypeBox Schemas for Validation
// ─────────────────────────────────────────────────────────────────────────────

// Base Item Schema (used standalone or inside groups)
const ItemSchema = t.Object({
  description: t.Optional(t.String()),
  qty: t.Numeric(), // Elysia will coerce string numbers from the frontend
  salesPrice: t.Numeric(),
  purchasePrice: t.Optional(t.Numeric()),
  inventoryItemId: t.Optional(t.String()),
  code: t.Optional(t.String()),
});

// A group containing multiple items
const GroupSchema = t.Object({
  type: t.Literal("group"),
  name: t.Optional(t.String()),
  items: t.Array(ItemSchema),
});

// A standalone line item
const RootItemSchema = t.Intersect([
  t.Object({ type: t.Literal("item") }),
  ItemSchema,
]);

// A line can be either a single item or a group
const LineSchema = t.Union([RootItemSchema, GroupSchema]);

const PaymentSchema = t.Object({
  date: t.String(),
  method: t.String(),
  amount: t.Numeric(),
  reference: t.Optional(t.String()),
  notes: t.Optional(t.String()),
});

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
        const invoices = await prisma.invoice.findMany({
          // 1. Include the related models
          include: {
            customer: {
              select: {
                name: true,
                phone: true,
                address: true,
              },
            },
          },
          // 2. Order by newest first
          orderBy: {
            date: "desc",
          },
        });
        return invoices;
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
        const invoice = db.invoice.create({
          data: {
            customerId: body.customerId,
            date: body.date,
            description: body.description,
          },
        });
        return invoice;
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
  )
  .post(
    "/editor",
    async ({ body }) => {
      const { taxRate, lines, payments, status } = body;

      // Calculate totals securely on the backend to prevent frontend manipulation
      let subtotal = 0;
      for (const line of lines) {
        if (line.type === "item") {
          subtotal += line.qty * line.salesPrice;
        } else if (line.type === "group") {
          subtotal += line.items.reduce(
            (sum, item) => sum + item.qty * item.salesPrice,
            0,
          );
        }
      }

      const taxAmt = Math.round(subtotal * ((taxRate || 0) / 100));
      const total = subtotal + taxAmt;

      // Use a Prisma transaction to ensure all nested relations are created safely
      const invoice = await db.$transaction(async (tx) => {
        return tx.invoice.create({
          data: {
            tax: taxRate || 0,
            subtotal,
            taxTotal: taxAmt,
            total,
            status: status,

            // Map flat items and group items
            lines: {
              create: lines.map((line) => {
                if (line.type === "group") {
                  return {
                    isGroup: true,
                    groupName: line.name,
                    children: {
                      create: line.items.map((item) => ({
                        description: item.description,
                        qty: item.qty,
                        salesPrice: item.salesPrice,
                        inventoryItemId: item.inventoryItemId,
                      })),
                    },
                  };
                }

                // Standalone item
                return {
                  isGroup: false,
                  description: line.description,
                  qty: line.qty,
                  salesPrice: line.salesPrice,
                  inventoryItemId: line.inventoryItemId,
                };
              }),
            },

            // Map payments
            payments: {
              create: payments.map((p) => ({
                date: new Date(p.date),
                method: p.method,
                amount: p.amount,
                reference: p.reference,
                notes: p.notes,
              })),
            },
          },
        });
      });

      return { success: true, invoiceId: invoice.id };
    },
    {
      // Attach the strict validation schema to the body
      body: t.Object({
        taxRate: t.Optional(t.Numeric()),
        lines: t.Array(LineSchema),
        payments: t.Array(PaymentSchema),
        status: t.Union([t.Literal("DRAFT")]),
      }),
    },
  );
