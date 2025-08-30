import { NextRequest, NextResponse } from "next/server";
import { Authorization } from "../Authorization";
import prisma from "@/lib/prisma"; // Ensure prisma is properly imported

export const GET = Authorization(
  async (req: NextRequest) => {
    try {
      const accounts = await prisma.account.findMany({});

      return NextResponse.json(accounts, { status: 200 });
    } catch (error) {
      console.error("Error fetching accounts:", error);
      return NextResponse.json(
        { error: "Failed to fetch accounts" },
        { status: 500 }
      );
    }
  },
  ["Admin"]
);
