import { NextRequest, NextResponse } from "next/server";
import { Authorization } from "../Authorization";
import prisma from "@/lib/prisma"; // Ensure prisma is properly imported

export const GET = Authorization(
  async (req: NextRequest) => {
    try {
      const vehicleTypes = await prisma.vehicleType.findMany({});

      return NextResponse.json(vehicleTypes, { status: 200 });
    } catch (error) {
      console.error("Error fetching Vehicle Types:", error);
      return NextResponse.json(
        { error: "Failed to fetch Vehicle Types" },
        { status: 500 }
      );
    }
  },
  ["Admin", "User"]
);
