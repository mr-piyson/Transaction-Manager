import { Auth } from "@controllers/Auth";
import db from "@/lib/database";
import { NextRequest, NextResponse } from "next/server";

// GET all invoice items for a specific invoice
export async function GET(req: NextRequest, ctx: RouteContext<"/api/records/[recordId]/invoices/[invoiceId]">) {
  try {
    const user = await Auth.getCurrentUser();
    const invoiceId = (await ctx.params).invoiceId;

    const invoiceItems = await db.invoiceItems.findMany({
      where: {
        invoicesId: Number(invoiceId),
      },
    });

    console.log("Fetched transactions:", invoiceItems);

    return NextResponse.json(invoiceItems);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// CREATE a new invoice item for a specific invoice
export async function POST(req: NextRequest, ctx: RouteContext<"/api/records/[recordId]/invoices/[invoiceId]">) {
  try {
    const user = await Auth.getCurrentUser();
    const { invoiceId } = await ctx.params;
    const body = await req.json();
    const newItem = await db.invoiceItems.create({
      data: {
        invoicesId: Number(invoiceId),
        description: body.description,
        amount: body.amount,
        qty: body.qty,
        tax: body.tax,
        discount: body.discount,
        currency: body.currency,
      },
    });
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
// DELETE an invoice item by ID
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/records/[recordId]/invoices/[invoiceId]">) {
  try {
    const user = await Auth.getCurrentUser();
    const { invoiceId } = await ctx.params;
    await db.invoiceItems.delete({
      where: {
        id: Number(invoiceId),
      },
    });
    return NextResponse.json({ message: "Invoice item deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT (update) an invoice item by ID
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/records/[recordId]/invoices/[invoiceId]">) {
  try {
    const user = await Auth.getCurrentUser();
    const { invoiceId } = await ctx.params;
    const body = await req.json();
    const updatedItem = await db.invoiceItems.update({
      where: {
        id: Number(invoiceId),
      },
      data: {
        description: body.description,
        amount: body.amount,
        qty: body.qty,
        tax: body.tax,
        discount: body.discount,
        currency: body.currency,
      },
    });
    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
