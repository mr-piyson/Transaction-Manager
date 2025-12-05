// src/lib/auth-core.ts
// Core auth utilities shared between Server Actions and API Routes
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { env } from "../env";
import db from "../db";

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
export function createAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET_ACCESS, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function createRefreshToken(userId: number): string {
  return jwt.sign({ userId }, env.JWT_SECRET_REFRESH, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

// Verify tokens with proper error handling
export function verifyToken(token: string, type: "access" | "refresh"): TokenPayload | null {
  const secret = type === "access" ? env.JWT_SECRET_ACCESS : env.JWT_SECRET_REFRESH;

  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    console.error(`${type} token verification failed:`, error);
    return null;
  }
}

// Cookie configuration
export function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

// Set auth cookies with proper awaiting
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  cookieStore.set("access_token", accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
  cookieStore.set("refresh_token", refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));
}

// Clear auth cookies
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}

// Store refresh token in database (for token rotation & revocation)
export async function storeRefreshToken(userId: number, token: string) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);

  await db.tokens.deleteMany({
    where: { userId },
  });

  await db.tokens.create({
    data: {
      userId,
      value: token,
      expiresAt,
      type: "refresh",
    },
  });
}

// Validate refresh token against database
export async function validateRefreshToken(token: string): Promise<number | null> {
  const storedToken = await db.tokens.findFirst({
    where: {
      value: token,
      expiresAt: { gt: new Date() },
    },
  });

  return storedToken?.userId ?? null;
}

// Refresh access token (shared logic)
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) return null;

    const payload = verifyToken(refreshToken, "refresh");
    if (!payload) return null;

    const userId = await validateRefreshToken(refreshToken);
    if (!userId) {
      await clearAuthCookies();
      return null;
    }

    const user = await db.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) return null;

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

// Get current user (base implementation without caching)
export async function getCurrentUserBase(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (accessToken) {
    const payload = verifyToken(accessToken, "access");
    if (payload) return payload;
  }

  const newAccessToken = await refreshAccessToken();

  if (newAccessToken) {
    return verifyToken(newAccessToken, "access");
  }

  return null;
}

// CLEANUP - Remove expired tokens (run as cron job)
export async function cleanupExpiredTokens() {
  try {
    await db.tokens.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  } catch (error) {
    console.error("Token cleanup error:", error);
  }
}
