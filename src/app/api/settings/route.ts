import { NextRequest, NextResponse } from "next/server";
import { Authorization } from "../Authorization";
import prisma from "@/lib/prisma";

export const GET = Authorization(
  async (req: NextRequest) => {
    try {
      const settings = await prisma.settings.findMany({});

      return NextResponse.json(settings, { status: 200 });
    } catch (error) {
      return NextResponse.json({ status: 500 });
    }
  },
  ["Admin", "User"]
);
