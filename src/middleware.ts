// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose"; // Use jose instead of jsonwebtoken

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_ACCESS!);

// Routes to protect
const criticalProtectedRoutes = ["/admin", "/api/admin"];
const publicAuthRoutes = ["/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // 1. Verify Access Token
  let isAccessTokenValid = false;
  if (accessToken) {
    try {
      await jwtVerify(accessToken, JWT_SECRET);
      isAccessTokenValid = true;
    } catch (error) {
      // Token expired or invalid
      isAccessTokenValid = false;
    }
  }

  // 2. Auth Route Handling (Redirect logged-in users away from /auth)
  if (isAccessTokenValid && publicAuthRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  // 3. Protected Route Handling
  if (criticalProtectedRoutes.some(route => pathname.startsWith(route))) {
    // CASE A: Valid Access Token -> Allow
    if (isAccessTokenValid) {
      return NextResponse.next();
    }

    // CASE B: Invalid/Expired Access Token BUT has Refresh Token -> Allow
    // We allow this request to pass so the Server Component (auth.ts)
    // can perform the database check and refresh the tokens.
    if (!isAccessTokenValid && refreshToken) {
      console.log("Middleware: Access expired, passing to Server for refresh.");
      return NextResponse.next();
    }

    // CASE C: No tokens -> Redirect to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
