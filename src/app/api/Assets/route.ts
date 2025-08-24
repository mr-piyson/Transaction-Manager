import { iss } from "@/lib/prisma";
import { all } from "axios";
import { NextResponse } from "next/server";

// GET http://localhost:3000/api/Assets

export const GET = async () => {
  try {
    const assets = await iss.assets.findMany();
    return NextResponse.json(assets, { status: 200 });
  } catch (error) {
    console.log("Error fetching assets:", error);
    return new NextResponse(null, { status: 500 });
  }
};
