import { Auth } from "@/controllers/Auth";
import db from "@/lib/database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/records/[recordId]/invoices/[invoiceId]">) {
  try {
    const user = await Auth.getCurrentUser();
    const { invoiceId } = await ctx.params;

    const transactions = await db.transactions.findFirst({
      where: {
        recordsId: Number(invoiceId),
      },
    });

    console.log("Fetched transactions:", transactions);

    return NextResponse.json(transactions);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
