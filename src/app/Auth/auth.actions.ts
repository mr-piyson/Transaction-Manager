"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PrismaClient, Account } from "@prisma/client";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";
import { z } from "zod";
import { SignInSchema } from "./SignIn";
import { SignUpSchema } from "./SignUp";
import prisma from "@/lib/prisma";

// Session duration in milliseconds (1 days)
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Interface for user session

/**
 * Get the current user session from the cookies
 */
export async function getAccount(): Promise<Account | null> {
  const sessionToken = (await cookies()).get("session_token")?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      token: sessionToken,
    },
    include: {
      account: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      // Clean up expired session
      await prisma.session.delete({
        where: {
          id: session.id,
        },
      });
    }
    return null;
  }

  return session.account;
}

/**
 * Sign in a user with email and password
 */

export async function signIn(formData: z.infer<typeof SignInSchema>) {
  const email = formData.email as string;
  const password = formData.password as string;

  if (!email || !password) {
    return {
      error: "Email and password are required",
    };
  }

  try {
    // Find the user by email
    const account = await prisma.account.findUnique({
      where: {
        email,
      },
    });

    if (!account) {
      return {
        error: "Invalid email or password",
      };
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, account.password);

    if (!passwordMatch) {
      return {
        error: "Invalid email or password",
      };
    }

    // Generate session token
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    // Create a new session
    await prisma.session.create({
      data: {
        token,
        expiresAt,
        accountId: account.id,
      },
    });

    // Set the session token in cookies
    (await cookies()).set({
      name: "session_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return {
      success: true,
      redirectUrl: "/Archive",
    };
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      error: "Authentication failed",
    };
  }
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(formData: z.infer<typeof SignUpSchema>) {
  const email = formData.email as string;
  const password = formData.password as string;
  const confirmPassword = formData.confirmPassword as string;
  const name = formData.name as string;
  const image = formData.image as string;
  const role = formData.role as string;
  const secretKey = formData.secretKey as string;

  if (secretKey !== process.env.SECRET_KEY) {
    return {
      error: "Invalid secret key",
    };
  }

  if (!email || !password) {
    return {
      error: "Email and password are required",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Passwords do not match",
    };
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.account.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return {
        error: "User with this email already exists",
      };
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the user
    const account = await prisma.account.create({
      data: {
        email,
        password: hashedPassword,
        name,
        image,
        role,
      },
    });

    // Generate session token
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    // Create a new session
    await prisma.session.create({
      data: {
        token,
        expiresAt,
        accountId: account.id,
      },
    });

    // Set the session token in cookies
    (await cookies()).set({
      name: "session_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/App",
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Sign up error:", error);
    return {
      error: "Registration failed",
    };
  }
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
