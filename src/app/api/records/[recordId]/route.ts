import db from "@/lib/database";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { Auth } from "../../../../../models/Auth";

export const GET = async (req: NextRequest, ctx: RouteContext<"/api/records/[recordId]">) => {
  try {
    // GET logic here
    const user = await Auth.getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthed" });

    const id = (await ctx.params).recordId;
    const zid = z.number();
    const valid = zid.safeParse(Number(id));
    if (!valid.success) return NextResponse.json({ error: "invalid id" }, { status: 500 });

    const customer = await db.records.findUnique({
      where: {
        id: Number(id),
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};

export const POST = async (req: NextRequest) => {
  try {
    // POST logic here
    const user = await Auth.getCurrentUser();
    const formData = await req.formData();
    console.log(formData);
    const description = formData.get("description");
    const recordId = formData.get("recordId");
    const date = formData.get("date");

    if (description && recordId && date) {
      await db.invoices.create({
        data: {
          title: String(description),
          total: 0,
          date: new Date(String(date)),
          recordsId: Number(recordId),
          createdById: user?.userId,
        },
      });
    }

    return NextResponse.json({});
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
