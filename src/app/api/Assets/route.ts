import { NextResponse } from "next/server";

// GET http://localhost:3000/api/Assets 

export const GET = async () => {
  try {
    return NextResponse.json({}, { status: 200 });
  } catch (error) {
    console.log("Error fetching assets:", error);
    return new NextResponse(null, { status: 500 });
  } finally {
  }
};
