import { withAuth } from "@/lib/auth/auth-api";
import db from "@/lib/database";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest, ctx: RouteContext<"/api/customers">) => {
  try {
    // GET logic here
    const customers = await db.customers.findMany({});
    return NextResponse.json(customers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};

export const POST = async (req: NextRequest, ctx: { params: {} }) => {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string | null;
    const email = formData.get("email") as string | null;
    const code = formData.get("code") as string | null;
    const phone = formData.get("phone") as string | null;
    const address = formData.get("address") as string | null;
    const image = formData.get("image") as string | null;

    // Optional basic validation
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const customer = await db.customers.create({
      data: {
        name,
        email,
        code,
        phone,
        address,
        image,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
