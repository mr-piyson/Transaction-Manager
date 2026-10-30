import { type NextRequest, NextResponse } from "next/server";

// better-auth prepends "__Secure-" to cookie names when secure cookies are in
// use (i.e. over https / in production). Checking only the non-prefixed name
// would make this guard believe the user is logged out in production, which
// would re-introduce the /erp <-> /auth redirect loop. Match both variants.
const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
] as const;

const publicPaths = [
  // The marketing landing page. app/page.tsx renders it for anonymous
  // visitors and client-side redirects signed-in users to /erp, so it must
  // not be gated by the proxy.
  "/",
  "/test_palette",
  "/auth",
  "/setup",
  "/reset",
  "/api",
  // PWA assets. The browser fetches these without a session (and the service
  // worker precaches /offline.html before the user ever signs in), so
  // redirecting them to /auth would break installation entirely.
  "/sw.js",
  "/manifest.webmanifest",
  "/offline.html",
  "/icons",
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => request.cookies.has(name));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths are always allowed through. We intentionally do NOT redirect
  // away from /auth based on cookie *presence* here: a stale/expired session
  // cookie would then bounce /auth -> /erp (proxy) while the server layout
  // bounces /erp -> /auth (invalid session), causing an infinite loop.
  // The /auth server layout validates the session and redirects valid users.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(request)) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
