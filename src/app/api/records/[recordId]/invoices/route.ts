import { NextRequest, NextResponse } from "next/server";
import { Auth } from "../../../../../../models/Auth";
import db from "@/lib/database";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/records/[recordId]/invoices">) {
  try {
    // GET logic here
    const user = await Auth.getCurrentUser();
    const recordId = (await ctx.params).recordId;
    const invoices = await db.invoices.findMany({
      where: {
        recordsId: Number(recordId),
      },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
