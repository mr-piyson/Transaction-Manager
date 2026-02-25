import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { hash, compare } from "bcryptjs";
import db from "@/lib/database";
import { env } from "@/lib/env";
import { z } from "zod";
import { SIGNUP_SCHEMA, validateEmail, validatePassword } from "@/lib/schemas";

// --- Types & Constants ---
export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: TokenPayload;
}

export const COOKIE_NAMES = {
  ACCESS: "access_token",
  REFRESH: "refresh_token",
} as const;

export const EXPIRY = {
  ACCESS_TOKEN_EXPIRY: 60 * 60 * 24, // Matches your original 24h logic
  REFRESH_TOKEN_EXPIRY: 60 * 60 * 24 * 7,
};

// --- Private Helpers (The Reusability Engine) ---

/**
 * Encapsulates token generation, DB persistence, and Cookie setting.
 * This removes ~20 lines of duplicate code from signIn, signUp, and getCurrentUser.
 */
export async function issueSession(userId: string, email: string) {
  const accessToken = jwt.sign({ userId, email }, env.JWT_SECRET_ACCESS, {
    expiresIn: EXPIRY.ACCESS_TOKEN_EXPIRY,
  });
  const refreshToken = jwt.sign({ userId }, env.JWT_SECRET_REFRESH, {
    expiresIn: EXPIRY.REFRESH_TOKEN_EXPIRY,
  });

  // 1. Persist Refresh Token
  const expiresAt = new Date(Date.now() + EXPIRY.REFRESH_TOKEN_EXPIRY * 1000);
  await db.tokens.deleteMany({ where: { userId, type: "refresh" } });
  await db.tokens.create({
    data: { userId, value: refreshToken, expiresAt, type: "refresh" },
  });

  // 2. Set Cookies
  const cookieStore = await cookies();
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  cookieStore.set(COOKIE_NAMES.ACCESS, accessToken, {
    ...baseOptions,
    maxAge: EXPIRY.ACCESS_TOKEN_EXPIRY,
  });
  cookieStore.set(COOKIE_NAMES.REFRESH, refreshToken, {
    ...baseOptions,
    maxAge: EXPIRY.REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

export async function clearSession(refreshToken?: string) {
  const cookieStore = await cookies();
  if (refreshToken) {
    await db.tokens.deleteMany({
      where: { value: refreshToken, type: "refresh" },
    });
  }
  cookieStore.delete(COOKIE_NAMES.ACCESS);
  cookieStore.delete(COOKIE_NAMES.REFRESH);
}

// --- Public API ---

export async function signUp(
  data: z.infer<typeof SIGNUP_SCHEMA>,
): Promise<AuthResult> {
  try {
    const validation = SIGNUP_SCHEMA.safeParse(data);
    if (!validation.success)
      return { success: false, error: validation.error.message };

    const existingUser = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser) return { success: false, error: "User already exists" };

    const user = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: await hash(data.password, 12),
        fullName: data.name,
        firstName: data.name.split(" ")[0],
        lastName: data.name.split(" ").pop() || "",
        role: "SUPER_ADMIN",
      },
    });

    await issueSession(user.id, user.email);
    return { success: true, user: { userId: user.id, email: user.email } };
  } catch (error) {
    return { success: false, error: "Registration failed" };
  }
}

export async function signIn(credentials: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const user = await db.user.findUnique({
      where: { email: credentials.email.toLowerCase() },
    });

    if (!user || !(await compare(credentials.password, user.passwordHash))) {
      return { success: false, error: "Invalid credentials" };
    }

    await issueSession(user.id, user.email);
    return { success: true, user: { userId: user.id, email: user.email } };
  } catch (error) {
    return { success: false, error: "Login failed" };
  }
}

export async function signOut(): Promise<AuthResult> {
  const cookieStore = await cookies();
  await clearSession(cookieStore.get(COOKIE_NAMES.REFRESH)?.value);
  return { success: true };
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

    if (accessToken) {
      try {
        return jwt.verify(accessToken, env.JWT_SECRET_ACCESS) as TokenPayload;
      } catch (error) {
        if (!(error instanceof jwt.TokenExpiredError)) return null;
      }
    }

    // Refresh Logic
    const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH)?.value;
    if (!refreshToken) return null;

    const storedToken = await db.tokens.findUnique({
      where: {
        value: refreshToken,
        type: "refresh",
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken || !storedToken.user) {
      await clearSession();
      return null;
    }

    await issueSession(storedToken.userId, storedToken.user.email);
    return { userId: storedToken.userId, email: storedToken.user.email };
  } catch (error) {
    return null;
  }
}
