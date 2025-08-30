import { NextRequest, NextResponse } from "next/server";
import { Authorization } from "../Authorization";
import prisma from "@/lib/prisma";

export const GET = Authorization(
  async (req: NextRequest) => {
    try {
      const id = req.nextUrl.searchParams.get("id");
      const jobCard = await prisma.jobCard.findUnique({
        where: {
          id: Number(id),
        },

        include: {
          Part: true,
        },
      });
      return NextResponse.json(jobCard, { status: 200 });
    } catch (error) {
      console.error("Error fetching Job Cards:", error);
      return NextResponse.json(
        { error: "Failed to fetch Job Cards" },
        { status: 500 }
      );
    }
  },
  ["Admin", "User"]
);
