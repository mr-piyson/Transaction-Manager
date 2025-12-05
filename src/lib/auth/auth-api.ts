// src/lib/auth-api.ts
// Auth utilities for API Routes (NOT Server Actions)
import { NextRequest, NextResponse } from "next/server";

type RouteContext<T extends string> = {
  params: T extends `${string}/[${infer Param}]${infer Rest}` ? { [K in Param]: string } & RouteContext<Rest>["params"] : {};
};

// Import shared utilities and types from auth-core
import { getCurrentUserBase } from "./auth-core";
import type { TokenPayload } from "./auth-core";

// Get current user for API routes (no caching needed)
export async function getCurrentUserAPI(): Promise<TokenPayload | null> {
  return getCurrentUserBase();
}

// ============================================
// AUTH WRAPPERS FOR API ROUTES
// ============================================

type AuthenticatedHandler<T extends string> = (req: NextRequest, ctx: RouteContext<T>, user: TokenPayload) => Promise<NextResponse>;

/**
 * Type-safe authentication wrapper for API routes
 * Preserves RouteContext types while adding user authentication
 *
 * @example
 * export const DELETE = withAuth("/api/customers/[id]", async (req, ctx, user) => {
 *   const id = (await ctx.params).id; // Fully typed!
 *   // Use user.userId, user.email, etc.
 * });
 */
export function withAuth<T extends string>(route: T, handler: AuthenticatedHandler<T>) {
  return async (req: NextRequest, ctx: RouteContext<T>): Promise<NextResponse> => {
    try {
      // Check if user is authenticated
      const user = await getCurrentUserAPI();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
      }

      // Execute the handler with authenticated user
      return await handler(req, ctx, user);
    } catch (error) {
      console.error("Auth wrapper error:", error);
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }
  };
}

/**
 * Generic authentication wrapper without route type constraint
 * Use this for more flexibility or when route string is not available
 *
 * @example
 * export const POST = withAuthGeneric(async (req, ctx, user) => {
 *   // Your logic here
 * });
 */
export function withAuthGeneric<TContext extends RouteContext<any>>(handler: (req: NextRequest, ctx: TContext, user: TokenPayload) => Promise<NextResponse>) {
  return async (req: NextRequest, ctx: TContext): Promise<NextResponse> => {
    try {
      const user = await getCurrentUserAPI();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
      }

      return await handler(req, ctx, user);
    } catch (error) {
      console.error("Auth wrapper error:", error);
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }
  };
}

/**
 * Optional: Role-based authorization wrapper
 * Extend TokenPayload with a 'role' field to use this
 *
 * @example
 * // In auth-core.ts, add role to TokenPayload:
 * // export interface TokenPayload { userId: number; email: string; role: string; }
 *
 * export const DELETE = withRole(
 *   "/api/admin/users/[id]",
 *   ["admin", "superadmin"],
 *   async (req, ctx, user) => { ... }
 * );
 */
export function withRole<T extends string>(route: T, allowedRoles: string[], handler: AuthenticatedHandler<T>) {
  return async (req: NextRequest, ctx: RouteContext<T>): Promise<NextResponse> => {
    try {
      const user = await getCurrentUserAPI();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
      }

      // To use this, add 'role' to your TokenPayload interface in auth-core.ts
      const userRole = (user as any).role;
      if (userRole && !allowedRoles.includes(userRole)) {
        return NextResponse.json({ error: "Forbidden - Insufficient permissions" }, { status: 403 });
      }

      return await handler(req, ctx, user);
    } catch (error) {
      console.error("Auth wrapper error:", error);
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }
  };
}
