import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  // THIS IS NOT SECURE!
  // This is the recommended approach to optimistically redirect users
  // We recommend handling auth checks in each page/route
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/Auth", request.url));
  }
  return NextResponse.next();
}

// the matcher is used to specify which routes the middleware should run on

// the middleware should run on all routes inside the /App or /api directory except for /api/auth
export const config = {
  matcher: [
    "/App/:path*",
  ]
};
