/**
 * Server-side route guards (React Server Components).
 *
 * A route segment guard is a **server** layout/page: `await requirePermission()`
 * runs on the server before any client code is sent, so a crafted URL cannot
 * reach a screen the user has no permission for.
 *
 * This is defence in depth — the tRPC layer remains the real security boundary.
 * Client `AuthGuard` / `useAppAbility()` only decide what to *show*.
 */

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth-server";
import {
  type Action,
  type AppAbility,
  defineAbilitiesFor,
  firstAllowed,
  type PermissionUser,
} from "./engine";
import { loadPermissionUser } from "./load";

export interface RequestAuth {
  user: PermissionUser;
  ability: AppAbility;
}

/**
 * Resolves the current request's authenticated user + permission set. Memoized
 * for the lifetime of a single RSC render pass (React `cache`).
 *
 * Returns `null` for anonymous requests. In a Route Handler, use this directly
 * and answer 401/403 — `requirePermission` (which `redirect`s) is for pages.
 */
export const getRequestAuth = cache(async (): Promise<RequestAuth | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await loadPermissionUser(userId);
  if (!user) return null;

  return { user, ability: defineAbilitiesFor(user) };
});

/**
 * Page/route guard. Redirects to `/auth` when unauthenticated and to
 * `/access-denied` when the caller lacks every required permission.
 * Accepts a single code or an array (any-of).
 */
export async function requirePermission(
  required: Action | Action[],
): Promise<RequestAuth> {
  const authCtx = await getRequestAuth();

  if (!authCtx) {
    redirect("/auth");
  }

  if (!firstAllowed(authCtx.ability, required)) {
    redirect("/access-denied");
  }

  return authCtx;
}
