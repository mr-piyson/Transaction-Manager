"use client";

import {auth} from "@/lib/auth-client";
import type { Session } from "better-auth/types";

export interface UseAuthReturn {
  session: Session | null;
  user: Session["user"] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Universal client-side auth hook
 */
export function useAuth(): UseAuthReturn {
  const { data: session, isPending } = auth.useSession();

  return {
    session: session ?? null,
    user: session?.user ?? null,
    isAuthenticated: !! session,
    isLoading: isPending,
  };
}