// import { NextResponse } from "next/server";
import { NextResponse, type NextRequest } from "next/server";

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Example: Decode role from cookie or header (use your auth method)
  const res = await fetch(`${request.nextUrl.origin}/api/session`, {
    method: "GET",
    headers: {
      Cookie: request.headers.get("cookie") || "",
    },
  });

  try {
    const pathname = request.nextUrl.pathname;
    const role = (await res.json()).account.role;
    const userRoutes = ["/App", "/App/JobCards"];
    const adminRoutes = [
      "/App/Dashboard",
      "/App/Accounts",
      "/App/Vehicles",
      "/App/Settings",
    ];

    if (role === "User") {
      // Check if the user is trying to access admin-only routes or their nested paths
      if (adminRoutes.some((route) => pathname.startsWith(route))) {
        console.log("User trying to access admin route:", pathname);
        return NextResponse.redirect(new URL("/App", request.url));
      }
    }
  } catch (error) {
    return NextResponse.redirect(new URL("/App", request.url));
  }
}

// the matcher is used to specify which routes the middleware should run on
export const config = {
  matcher: [
    "/App/JobCards/:path*",
    "/App/Dashboard/:path*",
    "/App/Accounts/:path*",
    "/App/Vehicles/:path*",
    "/App/Settings/:path*",
  ],
};
