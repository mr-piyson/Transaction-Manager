import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/assets">) {
  try {
    // GET logic here
    
    return NextResponse.json({
      id : 1,
      name : "test"
      
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}