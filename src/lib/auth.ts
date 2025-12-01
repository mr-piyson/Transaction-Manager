"use server";
// src/lib/auth-jwt.ts
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import db from "./db";
import { env } from "./env";
import z from "zod";
import type { SignUpSchema } from "@/components/Auth/SignUp";
import type { SignInSchema } from "@/components/Auth/SignIn";

// Types
export interface TokenPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

// Constants
const ACCESS_TOKEN_EXPIRY = parseExpiry(env.ACCESS_TOKEN_EXPIRY, "15m") as jwt.SignOptions["expiresIn"];
const REFRESH_TOKEN_EXPIRY = parseExpiry(env.REFRESH_TOKEN_EXPIRY, "7d") as jwt.SignOptions["expiresIn"];
const ACCESS_TOKEN_MAX_AGE = 60 * 15; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Validate expiry format
function parseExpiry(value: string | undefined, fallback: string): string {
  if (!value || typeof value !== "string") return fallback;
  const isValid = /^\d+$/.test(value) || /^\d+[smhd]$/.test(value);
  return isValid ? value : fallback;
}

// Generate secure tokens
function createAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET_ACCESS, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function createRefreshToken(userId: number): string {
  return jwt.sign({ userId }, env.JWT_SECRET_REFRESH, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

// Verify tokens with proper error handling
function verifyToken(token: string, type: "access" | "refresh"): TokenPayload | null {
  const secret = type === "access" ? env.JWT_SECRET_ACCESS : env.JWT_SECRET_REFRESH;

  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    console.error(`${type} token verification failed:`, error);
    return null;
  }
}

// Cookie configuration
function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, // Changed from "strict" to "lax" for better compatibility
    path: "/",
    maxAge,
  };
}

// Set auth cookies with proper awaiting
async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();

  // Set both cookies in sequence
  cookieStore.set("access_token", accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
  cookieStore.set("refresh_token", refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));
}

// Clear auth cookies
async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}

// Store refresh token in database (for token rotation & revocation)
async function storeRefreshToken(userId: number, token: string) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);

  // Delete old refresh tokens for this user
  await db.token.deleteMany({
    where: { userId },
  });

  // Store new refresh token
  await db.token.create({
    data: {
      userId,
      value: token,
      expiresAt,
      type: "refresh",
    },
  });
}

// Validate refresh token against database
async function validateRefreshToken(token: string): Promise<number | null> {
  const storedToken = await db.token.findFirst({
    where: {
      value: token,
      expiresAt: { gt: new Date() },
    },
  });

  return storedToken?.userId ?? null;
}

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
    const user = await db.user.findUnique({
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
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "User already exists" };
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 12);

    // Create user
    const user = await db.user.create({
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
      await db.token.deleteMany({
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

// --- REVISED REFRESH TOKEN LOGIC ---
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) return null;

    // Verify format only first (cheap check)
    const payload = verifyToken(refreshToken, "refresh");
    if (!payload) return null;

    // Database check (expensive check)
    const userId = await validateRefreshToken(refreshToken);
    if (!userId) {
      // If DB validation fails, clear cookies immediately to prevent loops
      await clearAuthCookies();
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) return null;

    // Rotation Logic
    const newAccessToken = createAccessToken({ userId: user.id, email: user.email });
    const newRefreshToken = createRefreshToken(user.id);

    await storeRefreshToken(user.id, newRefreshToken);
    await setAuthCookies(newAccessToken, newRefreshToken);

    return newAccessToken;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

// --- REVISED GET CURRENT USER ---
export const getCurrentUser = cache(async (): Promise<TokenPayload | null> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  // 1. If we have a token, try to verify it
  if (accessToken) {
    const payload = verifyToken(accessToken, "access");
    if (payload) return payload;
    // If payload is null here, it means verification failed (expired)
  }

  // 2. If missing or expired, try to refresh
  // This is the step the Middleware now ALLOWS to happen
  const newAccessToken = await refreshAccessToken();

  if (newAccessToken) {
    return verifyToken(newAccessToken, "access");
  }

  return null;
});

// REQUIRE AUTH - Middleware helper
export async function requireAuth(): Promise<TokenPayload> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  return user;
}

// CLEANUP - Remove expired tokens (run as cron job)
export async function cleanupExpiredTokens() {
  try {
    await db.token.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  } catch (error) {
    console.error("Token cleanup error:", error);
  }
}
