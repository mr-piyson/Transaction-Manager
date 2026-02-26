import db from "@/lib/database";
import { env } from "@/lib/env";
import jwt from "jsonwebtoken";
import {
  AuthResult,
  clearSession,
  COOKIE_NAMES,
  issueSession,
  TokenPayload,
} from "@/lib/jwt";
import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { SIGNUP_SCHEMA } from "@/lib/schemas";

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
