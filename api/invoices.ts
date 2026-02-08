import db from "@/lib/database";
import { Hono } from "hono";
import z from "zod";

export const invoicesRoute = new Hono();

//---------------------------------------------------
//  GET All invoices in a record
//---------------------------------------------------

invoicesRoute.get("/records/:recordId/invoices", async c => {
  try {
    const paramsSchema = z.object({
      recordId: z.coerce.number().int().positive(),
    });

    const parsed = paramsSchema.safeParse(c.req.param());
    if (!parsed.success) {
      return c.json({ error: "invalid id" }, 400);
    }

    const { recordId } = parsed.data;

    const record = await db.invoices.findMany({
      where: { recordsId: recordId },
    });

    // Explicit null handling
    if (!record) {
      return c.json([], 200);
    }

    return c.json(record, 200);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

//---------------------------------------------------
//  Create new Invoice in a record
//---------------------------------------------------

invoicesRoute.post("/records/:recordId", async c => {
  try {
    const paramsSchema = z.object({
      recordId: z.coerce.number().int().positive(),
    });

    const parsed = paramsSchema.safeParse(c.req.param());
    if (!parsed.success) {
      return c.json({ error: "invalid id" }, 400);
    }

    const { recordId } = parsed.data;

    const data = (await c.req.formData()).get("description");

    await db.invoices.create({
      data: {
        recordsId: recordId,
      },
    });

    return c.json(data, 200);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

//---------------------------------------------------
//  GET All invoices Items in an invoice
//---------------------------------------------------

invoicesRoute.get("/records/:recordId/invoices/:invoiceId", async c => {
  try {
    const paramsSchema = z.object({
      recordId: z.coerce.number().int().positive(),
      invoiceId: z.coerce.number().int().positive(),
    });

    const parsed = paramsSchema.safeParse(c.req.param());
    if (!parsed.success) {
      return c.json({ error: "invalid id" }, 400);
    }

    const { recordId, invoiceId } = parsed.data;

    const record = await db.invoiceItems.findMany({
      where: { invoicesId: invoiceId },
    });

    // Explicit null handling
    if (!record) {
      return c.json([], 200);
    }

    return c.json(record, 200);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

//---------------------------------------------------
//  GET All Transaction in a invoice
//---------------------------------------------------

invoicesRoute.get("/records/:recordId/invoices/:invoiceId", async c => {
  try {
    const paramsSchema = z.object({
      recordId: z.coerce.number().int().positive(),
      invoiceId: z.coerce.number().int().positive(),
    });

    const parsed = paramsSchema.safeParse(c.req.param());
    if (!parsed.success) {
      return c.json({ error: "invalid id" }, 400);
    }

    const { recordId, invoiceId } = parsed.data;

    const record = await db.invoiceItems.findMany({
      where: { invoicesId: invoiceId },
    });

    // Explicit null handling
    if (!record) {
      return c.json([], 200);
    }

    return c.json(record, 200);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

//---------------------------------------------------
//  CREATE Invoice Items in an invoice
//---------------------------------------------------

invoicesRoute.post("/records/:recordId/invoices/:invoiceId", async c => {
  try {
    const params_schema = z.object({
      recordId: z.coerce.number().int().positive(),
      invoiceId: z.coerce.number().int().positive(),
    });

    const form_data_schema = z.object({
      title: z.string().min(1), // title should be string
      description: z.string().optional(),
      quantity: z.coerce.number().int().optional().default(0),
      amount: z.coerce.number().optional().default(0),
      tax: z.coerce.number().optional().default(0),
    });

    // Parse URL params
    const parsed = params_schema.safeParse(c.req.param());
    if (!parsed.success) {
      return c.json({ error: "Invalid recordId or invoiceId" }, 400);
    }
    const { recordId, invoiceId } = parsed.data;

    // Parse form data
    const formData = await c.req.formData();
    const rawData = {
      title: formData.get("title")?.toString(),
      description: formData.get("description")?.toString() || undefined,
      quantity: formData.get("quantity") || formData.get("qty"),
      amount: formData.get("amount"),
      tax: formData.get("tax"),
    };

    const parsed_invoice_item = form_data_schema.safeParse(rawData);
    if (!parsed_invoice_item.success) {
      return c.json({ error: "Invalid form data" }, 400);
    }

    const data = parsed_invoice_item.data;

    // Create invoice item
    const res = await db.invoiceItems.create({
      data: {
        invoicesId: invoiceId,
        title: data.title,
        description: data.description || "",
        qty: data.quantity,
        amount: data.amount,
        tax: data.tax,
      },
    });

    if (!res) {
      return c.json({ error: "Failed to create invoice item" }, 400);
    }

    return c.json({ error: null, item: res }, 200);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

//---------------------------------------------------
//  DELETE Invoice Items in an invoice
//---------------------------------------------------

invoicesRoute.delete("/records/:recordId/invoices/:invoiceId", async c => {
  try {
    const itemId = Number(c.req.query("itemId"));

    const item = await db.invoiceItems.findUnique({
      where: {
        id: itemId,
      },
    });

    if (!item) return c.json({ error: `No Item with ID :${item}` }, 404);

    await db.invoiceItems.delete({
      where: {
        id: itemId,
      },
    });

    return c.json([], 200);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});
