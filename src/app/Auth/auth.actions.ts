"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Account, User } from "@prisma/client";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Session duration in milliseconds (1 days)
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Interface for user session

/**
 * Get the current user session from the cookies
 */
export async function getAccount() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
}

/**
 * Sign out the current user by removing the session
 */
export async function signOut() {
  const sessionToken = (await cookies()).get("session_token")?.value;

  if (sessionToken) {
    try {
      // Delete the session from the database
      await prisma.session.delete({
        where: {
          token: sessionToken,
        },
      });
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  }

  // Delete the session cookie
  (await cookies()).delete("session_token");

  // Redirect to the home page
  redirect("/Auth");
}

/**
 * Protect a route by checking if the user is authenticated
 */
export async function requireAuth() {
  const session = await getAccount();

  if (!session) redirect("/Auth");

  return session;
}
