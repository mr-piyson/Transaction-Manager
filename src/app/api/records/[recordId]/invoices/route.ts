import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";
import { Auth } from "@controllers/Auth";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/records/[recordId]/invoices">) {
  try {
    // GET logic here
    const user = await Auth.getCurrentUser();
    const recordId = (await ctx.params).recordId;
    const invoices = await db.invoices.findMany({
      where: {
        recordsId: Number(recordId),
      },
      orderBy: { id: "desc" },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
