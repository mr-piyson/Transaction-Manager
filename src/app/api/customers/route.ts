import { withAuth } from "@/lib/auth-api";
import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const GET = withAuth("/api/customers/", async (req, ctx, user) => {
  try {
    // GET logic here
    const customers = await db.customers.findMany({});
    return NextResponse.json(customers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
