import { withAuth } from "@/lib/auth/auth-api";
import db from "@/lib/database";
import { Customers } from "@prisma/client";
import { NextResponse } from "next/server";
import z from "zod";

export const GET = withAuth("/api/customers/[id]", async (req, ctx, user) => {
  try {
    // GET logic here
    const id = (await ctx.params).id;
    const zid = z.number();
    const valid = zid.safeParse(Number(id));
    if (!valid.success) return NextResponse.json({ error: "invalid id" }, { status: 500 });

    const customer = await db.customers.findUnique({
      where: {
        id: Number(id),
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

export const PATCH = withAuth("/api/customers/[id]", async (req, ctx, user) => {
  try {
    const id = (await ctx.params).id;
    const data = (await req.json()) as Customers;
    const zid = z.number();
    const valid = zid.safeParse(Number(id));
    if (!valid.success) return NextResponse.json({ error: "invalid id" }, { status: 500 });

    return NextResponse.json({});
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

export const DELETE = withAuth("/api/customers/[id]", async (req, ctx, user) => {
  // req: NextRequest
  // ctx: RouteContext<"/api/customers/[id]"> (fully typed!)
  // user: TokenPayload (userId, email)

  const id = ctx.params.id;

  return NextResponse.json({ success: true });
});
