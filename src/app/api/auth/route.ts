import { Auth } from "@controllers/Auth";
import { NextRequest, NextResponse } from "next/server";

// Sign Out Route Handler
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/auth">) {
  try {
    const res = await Auth.signOut();
    if (res.success) {
      return NextResponse.json({ success: true }, { status: 200 });
    }
    return NextResponse.json({ error: "Sign out failed" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Sign In Route Handler
export async function POST(req: NextRequest, ctx: RouteContext<"/api/auth">) {
  try {
    const { email, password } = await req.json();
    const result = await Auth.signIn({
      email,
      password,
    });

    if (result.success) {
      return NextResponse.json({ message: "Sign in successful" }, { status: 200 });
    } else {
      return NextResponse.json({ error: result.error || "Sign in failed" }, { status: 401 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Sign Up Route Handler
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/auth">) {
  try {
    const { email, password, name } = await req.json();
    const result = await Auth.signUp({
      email,
      password,
      name,
    });

    if (result.success) {
      return NextResponse.json({ message: "Registration successful" }, { status: 201 });
    } else {
      return NextResponse.json({ error: result.error || "Registration failed" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
