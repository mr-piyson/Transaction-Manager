import { ApiResponse } from "@/lib/api";
import { SignUpSchema } from "@/lib/validators/auth";
import { signIn, signOut, signUp } from "@/server/auth";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/auth/signup">,
) {
  try {
    const user = await signOut();
    return ApiResponse.success(user);
  } catch (error) {
    console.error(error);
    return ApiResponse.serverError();
  }
}
