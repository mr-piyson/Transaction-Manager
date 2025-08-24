import { mes } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  if (req.method === "GET") {
    try {
      const employees = await mes.employees.findMany({
        select: {
          id: true,
          emp_code: true,
          name: true,
          department: true,
          designation: true,
          left_date: true,
          telephone: true,
          nationality: true,
          gender: true,
          emp_location: true,
          emp_source: true,
          access: true,
          is_active: true,
        },
      });

      return new NextResponse(JSON.stringify(employees), { status: 200 });
    } catch (error) {
      console.log(error);
      return new NextResponse(null, { status: 500 });
    }
  } else {
    return new NextResponse(null, { status: 405 });
  }
}
