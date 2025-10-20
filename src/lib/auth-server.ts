import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { Session } from "better-auth/types";
import { headers } from "next/headers";
// If your Prisma file is located elsewhere, you can change the path
// import prisma from "./prisma";
import db from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "sqlite", // or "mysql", "postgresql", ...etc
  }),
  emailAndPassword: {
    enabled: true,
  },
});

// ============================================
// UNIVERSAL AUTH UTILITIES
// ============================================

// lib/auth-universal.ts

/**
 * Universal function to get session - works in:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 */
export async function getSession(): Promise<Session | null> {
  try {
    const res = await auth.api.getSession({
      headers: await headers(),
    });
      
    return res.session;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Universal function to require authentication
 * Throws error if user is not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized - Please log in");
  }

  return session;
}

/**
 * Check if user is authenticated (boolean)
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}
