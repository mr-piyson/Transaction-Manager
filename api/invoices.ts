import db from "@/lib/database";
import { Hono } from "hono";

export const invoicesRoute = new Hono();

//---------------------------------------------------
//  GET All invoices
//---------------------------------------------------

invoicesRoute.get("/invoices", async c => {
  try {
    const invoices = await db.invoice.findMany({});
    return c.json(invoices);
  } catch (error) {}
});

//---------------------------------------------------
//  Create new Invoice in a record
//---------------------------------------------------

invoicesRoute.post("/invoices", async c => {});

//---------------------------------------------------
//  GET All invoices Items in an invoice
//---------------------------------------------------

invoicesRoute.get("/invoices/:invoiceId", async c => {});

//---------------------------------------------------
//  GET All Transaction in a invoice
//---------------------------------------------------

invoicesRoute.get("/invoices/:invoiceId", async c => {});

//---------------------------------------------------
//  CREATE Invoice Items in an invoice
//---------------------------------------------------

invoicesRoute.post("/invoices/:invoiceId", async c => {});

//---------------------------------------------------
//  DELETE Invoice Items in an invoice
//---------------------------------------------------

invoicesRoute.delete("/:recordId/invoices/:invoiceId", async c => {});

//---------------------------------------------------
//  Get Invoice Data for generating invoice
//---------------------------------------------------

invoicesRoute.get("/:recordId/invoices/:invoiceId/invoice", async c => {});
