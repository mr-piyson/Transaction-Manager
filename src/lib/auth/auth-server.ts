"use server";
// src/lib/auth-jwt.ts
// Server Actions for authentication (forms, client components)
import bcryptjs from "bcryptjs";
import { redirect } from "next/navigation";
import { cache } from "react";
import { cookies } from "next/headers";
import db from "../database";
import z from "zod";
import type { SignUpSchema } from "@/components/Auth/SignUp";
import type { SignInSchema } from "@/components/Auth/SignIn";

// Import shared utilities from auth-core
import { createAccessToken, createRefreshToken, setAuthCookies, clearAuthCookies, storeRefreshToken, getCurrentUserBase } from "./auth-core";

// Import types separately
import type { TokenPayload, AuthResult } from "./auth-core";

// LOGIN - With proper password verification
export async function signIn(formData: z.infer<typeof SignInSchema>): Promise<AuthResult> {
  try {
    const email = formData.email;
    const password = formData.password;

    // Validate input
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    // Find user
    const user = await db.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        hashedPassword: true,
      },
    });

    if (!user) {
      return { success: false, error: "Invalid credentials" };
    }

    // Verify password
    const isValidPassword = await bcryptjs.compare(password, user.hashedPassword);

    if (!isValidPassword) {
      return { success: false, error: "Invalid credentials" };
    }

    // Generate tokens
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };

    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(user.id);

    // Store refresh token BEFORE setting cookies
    await storeRefreshToken(user.id, refreshToken);

    // Set cookies last to avoid middleware conflicts
    await setAuthCookies(accessToken, refreshToken);

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "An error occurred during login" };
  }
}

// REGISTER - Hash password before storing
export async function signUp(formData: z.infer<typeof SignUpSchema>): Promise<AuthResult> {
  try {
    const email = formData.email;
    const password = formData.password;
    const name = formData.name;

    // Validate input
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    if (password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters",
      };
    }

    // Check if user exists
    const existingUser = await db.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "User already exists" };
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 12);

    // Create user
    const user = await db.users.create({
      data: {
        email,
        hashedPassword,
        name,
      },
    });

    // Generate tokens
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };

    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(user.id);

    // Store refresh token BEFORE setting cookies
    await storeRefreshToken(user.id, refreshToken);

    // Set cookies last
    await setAuthCookies(accessToken, refreshToken);

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "An error occurred during registration" };
  }
}

// LOGOUT - Clear cookies and revoke refresh token
export async function signOut() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    // Revoke refresh token from database
    if (refreshToken) {
      await db.tokens.deleteMany({
        where: { value: refreshToken },
      });
    }

    // Clear cookies
    await clearAuthCookies();
  } catch (error) {
    console.error("Logout error:", error);
  }

  redirect("/auth");
}

// Get current user with React cache (for Server Components)
export const getCurrentUser = cache(async (): Promise<TokenPayload | null> => {
  return getCurrentUserBase();
});

// REQUIRE AUTH - Redirect if not authenticated (for Server Components)
export async function requireAuth(): Promise<TokenPayload> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  return user;
}
