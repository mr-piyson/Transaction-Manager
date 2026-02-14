// src/lib/auth-service.ts
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { hash, compare } from "bcryptjs";
import db from "@/lib/database";
import { env } from "@/lib/env";
// controller
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
  user?: TokenPayload;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

// Constants
const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24; // 24 hr
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Register a new user
 */
export async function signUp(data: RegisterData): Promise<AuthResult> {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return { success: false, error: "Invalid email format" };
    }

    // Validate password strength
    if (data.password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    const hasUpperCase = /[A-Z]/.test(data.password);
    const hasLowerCase = /[a-z]/.test(data.password);
    const hasNumbers = /\d/.test(data.password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(data.password);
    const typeCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

    if (typeCount < 3) {
      return {
        success: false,
        error: "Password must contain at least 3 of: uppercase, lowercase, numbers, special characters",
      };
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return { success: false, error: "User already exists" };
    }

    // Hash password and create user
    const hashedPassword = await hash(data.password, SALT_ROUNDS);
    const user = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: hashedPassword,
        fullName: data.name,
        firstName: data.name.split(" ")[0],
        lastName: data.name.split(" ").pop() || "",
      },
      select: { id: true, email: true },
    });

    // Generate tokens
    const accessToken = jwt.sign({ userId: user.id, email: user.email }, env.JWT_SECRET_ACCESS, { expiresIn: ACCESS_TOKEN_EXPIRY });

    const refreshToken = jwt.sign({ userId: user.id }, env.JWT_SECRET_REFRESH, { expiresIn: REFRESH_TOKEN_EXPIRY });

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);
    await db.tokens.deleteMany({
      where: { userId: user.id, type: "refresh" },
    });

    await db.tokens.create({
      data: {
        userId: user.id,
        value: refreshToken,
        expiresAt,
        type: "refresh",
      },
    });

    // Set cookies
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    cookieStore.set("access_token", accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    cookieStore.set("refresh_token", refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return {
      success: true,
      user: { userId: user.id, email: user.email },
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "Registration failed" };
  }
}

/**
 * Login user with credentials
 */
export async function signIn(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    // Find user by email
    const user = await db.user.findUnique({
      where: { email: credentials.email.toLowerCase() },
      select: { id: true, email: true, hashedPassword: true },
    });

    if (!user) {
      return { success: false, error: "Invalid credentials" };
    }

    // Verify password
    const isValidPassword = await compare(credentials.password, user.hashedPassword);

    if (!isValidPassword) {
      return { success: false, error: "Invalid credentials" };
    }

    // Generate tokens
    const accessToken = jwt.sign({ userId: user.id, email: user.email }, env.JWT_SECRET_ACCESS, { expiresIn: ACCESS_TOKEN_EXPIRY });

    const refreshToken = jwt.sign({ userId: user.id }, env.JWT_SECRET_REFRESH, { expiresIn: REFRESH_TOKEN_EXPIRY });

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);
    await db.tokens.deleteMany({
      where: { userId: user.id, type: "refresh" },
    });

    await db.tokens.create({
      data: {
        userId: user.id,
        value: refreshToken,
        expiresAt,
        type: "refresh",
      },
    });

    // Set cookies
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    cookieStore.set("access_token", accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    cookieStore.set("refresh_token", refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return {
      success: true,
      user: { userId: user.id, email: user.email },
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Login failed" };
  }
}

/**
 * Logout user and revoke current session token
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    // Revoke refresh token from database
    if (refreshToken) {
      await db.tokens.deleteMany({
        where: { value: refreshToken, type: "refresh" },
      });
    }

    // Clear cookies
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");

    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, error: "Logout failed" };
  }
}

/**
 * Logout from all devices (revoke all user tokens)
 */
export async function logoutAllDevices(): Promise<AuthResult> {
  try {
    // Get current user
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify token to get user ID
    let userId: number;
    try {
      const payload = jwt.verify(accessToken, env.JWT_SECRET_ACCESS) as TokenPayload;
      userId = payload.userId;
    } catch {
      return { success: false, error: "Invalid token" };
    }

    // Revoke all tokens for this user
    await db.tokens.deleteMany({
      where: { userId, type: "refresh" },
    });

    // Clear cookies
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");

    return { success: true };
  } catch (error) {
    console.error("Logout all devices error:", error);
    return { success: false, error: "Logout failed" };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    // Try to verify access token
    if (accessToken) {
      try {
        const payload = jwt.verify(accessToken, env.JWT_SECRET_ACCESS) as TokenPayload;
        return payload;
      } catch (error) {
        if (!(error instanceof jwt.TokenExpiredError)) {
          console.error("Access token verification failed:", error);
          return null;
        }
        // Token expired, try to refresh
      }
    }

    // Try to refresh token
    const refreshToken = cookieStore.get("refresh_token")?.value;
    if (!refreshToken) return null;

    // Verify refresh token
    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_SECRET_REFRESH) as TokenPayload;
    } catch {
      return null;
    }

    // Validate token exists in database
    const storedToken = await db.tokens.findUnique({
      where: {
        value: refreshToken,
        type: "refresh",
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      cookieStore.delete("access_token");
      cookieStore.delete("refresh_token");
      return null;
    }

    if (!storedToken) return null;

    // Get user details
    const user = await db.user.findUnique({
      where: { id: storedToken.userId },
      select: { id: true, email: true },
    });

    if (!user) return null;

    // Generate new tokens (token rotation)
    const newAccessToken = jwt.sign({ userId: user.id, email: user.email }, env.JWT_SECRET_ACCESS, { expiresIn: ACCESS_TOKEN_EXPIRY });

    const newRefreshToken = jwt.sign({ userId: user.id }, env.JWT_SECRET_REFRESH, { expiresIn: REFRESH_TOKEN_EXPIRY });

    // Store new refresh token
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);
    await db.tokens.deleteMany({
      where: { userId: user.id, type: "refresh" },
    });

    await db.tokens.create({
      data: {
        userId: user.id,
        value: newRefreshToken,
        expiresAt,
        type: "refresh",
      },
    });

    // Set new cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    cookieStore.set("access_token", newAccessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    cookieStore.set("refresh_token", newRefreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return jwt.verify(newAccessToken, env.JWT_SECRET_ACCESS) as TokenPayload;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    const cookieStore = await cookies();
    return cookieStore.has("access_token") || cookieStore.has("refresh_token");
  }

  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Clean up expired tokens from database (run as cron job)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    const result = await db.tokens.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    console.log(`Cleaned up ${result.count} expired tokens`);
  } catch (error) {
    console.error("Token cleanup error:", error);
  }
}
