import { NextRequest, NextResponse } from "next/server";
import { Authorization } from "../Authorization";
import prisma from "@/lib/prisma"; // Ensure prisma is properly imported

export const GET = Authorization(
  async (req: NextRequest) => {
    try {
      const accounts = await prisma.ticket.findMany({});

      return NextResponse.json(accounts, { status: 200 });
    } catch (error) {
      console.error("Error fetching accounts:", error);
      return NextResponse.json(
        { error: "Failed to fetch accounts" },
        { status: 500 }
      );
    }
  },
  ["Admin", "User"]
);

export const POST = Authorization(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const ipAddress =
        req.headers.get("x-forwarded-for")?.split(":")[3] || "Unknown IP";

      console.log("IP Address:", ipAddress);
      console.log("Creating ticket with data:", body);

      // get the last ticket number
      const lastTicket = await prisma.ticket.findFirst({
        orderBy: { ticketNo: "desc" },
        select: { id: true },
      });

      const newTicket = await prisma.ticket.create({
        data: {
          ticketNo:
            "TK-" +
            (lastTicket?.id ? lastTicket.id + 1 : 1)
              .toString()
              .padStart(5, "0"),
          status: body.status || "Open",
          description: body.description || "",
          ipAddress: ipAddress,
        },
      });

      return NextResponse.json(body, { status: 201 });
    } catch (error) {
      console.error("Error creating ticket:", error);
      return NextResponse.json(
        { error: "Failed to create ticket" },
        { status: 500 }
      );
    }
  },
  ["Admin", "User"]
);
