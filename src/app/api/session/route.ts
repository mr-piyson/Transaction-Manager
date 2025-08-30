import { NextRequest, NextResponse } from "next/server";
import { Authorization } from "../Authorization";
import prisma from "@/lib/prisma";

export const GET = Authorization(
  async (req: NextRequest) => {
    try {
      const session = await prisma.session.findFirst({
        where: {
          token: req.cookies.get("session_token")?.value,
        },
        include: {
          account: {
            select: {
              role: true,
            },
          },
        },
      });

      if (!session) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 401 }
        );
      }

      return NextResponse.json(session, { status: 200 });
    } catch (error) {
      console.error("Error fetching session:", error);
      return NextResponse.json(
        { error: "Failed to fetch session" },
        { status: 500 }
      );
    }
  },
  ["Admin", "User"]
);
